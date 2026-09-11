// Server-side Meta Responses client. Credentials are supplied by the environment.
// Protocol: https://dev.meta.ai/docs/protocols/responses
export const MetaAI = (() => {
    const service = 'meta';
    const model = 'muse-spark-1.3-contributor';
    const endpoint = 'https://api.meta.ai/v1/responses';

    function buildInput(prompt, attachments = []) {
        const content = [{ type: 'input_text', text: String(prompt || '') }];
        for (const [index, attachment] of attachments.entries()) {
            const mimeType = String(attachment.mimeType || '').toLowerCase();
            if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/x-icon'].includes(mimeType)) {
                throw new Error('Meta AI supports PDF, PNG, JPEG, GIF, WebP, and ICO attachments.');
            }
            const dataUrl = `data:${mimeType};base64,${attachment.data}`;
            if (mimeType.startsWith('image/')) {
                content.push({ type: 'input_image', image_url: dataUrl });
            } else {
                content.push({ type: 'input_file', filename: attachment.name || `attachment-${index + 1}.pdf`, file_data: dataUrl });
            }
        }
        return [{ role: 'user', content }];
    }

    function renderTextPart(part) {
        let text = part.text || '';
        const citations = (part.annotations || []).filter((item) => (
            item.type === 'url_citation' && /^https?:\/\//i.test(item.url || '')
            && Number.isInteger(item.end_index) && item.end_index >= 0 && item.end_index <= text.length
        )).sort((a, b) => b.end_index - a.end_index);
        for (const citation of citations) {
            const title = String(citation.title || 'Source').replace(/[\[\]<>\r\n]/g, ' ');
            const url = citation.url.replace(/[\s<>]/g, (character) => encodeURIComponent(character));
            const link = ` [${title}](<${url}>)`;
            text = text.slice(0, citation.end_index) + link + text.slice(citation.end_index);
        }
        return text;
    }

    function extractText(data) {
        const parts = (data.output || [])
            .filter((item) => item.type === 'message' && item.role === 'assistant')
            .flatMap((item) => item.content || []);
        const refusal = parts.find((part) => part.type === 'refusal');
        if (refusal) throw new Error(refusal.refusal || 'Meta AI declined this request.');
        const text = parts.filter((part) => part.type === 'output_text').map(renderTextPart).join('\n\n').trim();
        return text || (typeof data.output_text === 'string' ? data.output_text.trim() : '');
    }

    function retryDelay(response, attempt) {
        const retryAfter = response.headers?.get('retry-after');
        if (retryAfter) {
            const seconds = Number(retryAfter);
            const milliseconds = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
            if (Number.isFinite(milliseconds) && milliseconds >= 0) return milliseconds;
        }
        return 1500 * (2 ** attempt);
    }

    async function generate(apiKey, prompt, enableSearch, attachments = [], options = {}) {
        const key = String(apiKey || '').trim();
        if (!key) throw new Error('Enter your Meta AI API key in Settings.');
        const costMode = Boolean(options.costMode);
        const experimental = options.promptKey === 'experimental';
        const body = {
            model,
            input: buildInput(prompt, attachments),
            store: false,
            max_output_tokens: Math.min(131072, Math.max(8192, Number(options.maxOutputTokens) || (costMode ? 8192 : (experimental ? 65536 : 32768)))),
            reasoning: { effort: options.reasoningEffort || (costMode ? 'low' : (experimental ? 'high' : 'medium')) }
        };
        if (enableSearch) body.tools = [{ type: 'web_search' }];
        for (let attempt = 0; attempt < 4; attempt++) {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
                body: JSON.stringify(body),
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'error',
                signal: options.signal
            });
            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error(`Meta AI returned an unreadable response (HTTP ${response.status}).`);
            }
            if (!response.ok) {
                // Redact even if an upstream error happens to echo the credential.
                const detail = String(data?.error?.message || data?.message || `HTTP ${response.status}`).split(key).join('[redacted]');
                const quota = /quota|billing|credit|spend|payment/i.test(`${data?.error?.code || ''} ${detail}`);
                if (response.status === 429 && !quota && attempt < 3) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
                    continue;
                }
                const error = new Error(response.status === 401
                    ? 'Meta AI rejected the API key. Copy a valid key from dev.meta.ai into Settings.'
                    : `Meta AI: ${detail}`);
                error.retryable = response.status >= 500;
                throw error;
            }
            if (data.error || (data.status && data.status !== 'completed')) {
                throw new Error(`Meta AI did not complete the report (${data.incomplete_details?.reason || data.status || 'failed'}).`);
            }
            const content = extractText(data);
            if (!content) throw new Error('Meta AI returned no report text.');
            const usage = data.usage || {};
            return {
                content,
                searchSuggestions: [],
                provider: service,
                model,
                usage: {
                    inputTokens: usage.input_tokens ?? null,
                    outputTokens: usage.output_tokens ?? null,
                    totalTokens: usage.total_tokens ?? null,
                    thoughtsTokens: usage.output_tokens_details?.reasoning_tokens ?? null,
                    raw: usage
                }
            };
        }
    }

    return Object.freeze({ service, model, endpoint, generate });
})();
