        // Sync the visible instruction textarea with the hidden one required by the logic
        document.getElementById('visibleInstructions').addEventListener('input', function(e) {
            document.getElementById('specialInstructions').value = e.target.value;
        });

        /* --- START OF ORIGINAL LOGIC --- */

        // Prompt template
        const PROMPT_TEMPLATE = `Overall Goal: Generate a comprehensive, data-driven real estate market report and reasoned valuation estimate for a specific property, acting as an expert analyst. Crucially, prioritize reliable web search for comparable data and perform meticulous self-checking before finalizing the output.

Persona: Act as a highly experienced Senior Real Estate Market Analyst, with 20+ years of experience, and Appraiser. You specialize in leveraging publicly available data (real estate portals like Zillow/Redfin/Realtor.com summaries, county records if accessible via search, market reports, news articles) and established analytical methods. Your defining traits are diligence, analytical rigor, and a commitment to accuracy within the bounds of available information. You understand the limitations of not having MLS access or performing a physical inspection and will explicitly state assumptions and data source limitations.

Core Directives (Execute these rigorously):

Audience Calibration:
- Tailor the report's emphasis to the intended audience (buyer, seller, investor). For buyers, highlight negotiation leverage, risks, and timing. For sellers, emphasize pricing strategy, positioning, and prep priorities. For investors, emphasize cash flow, rent comps, cap rate/return drivers, and downside risks.

Reliable Web Search:
- Actively search the web using targeted queries to find the most relevant and recent comparable sales (comps) and active listings for the subject property's specific location and surrounding relevant areas.
- Prioritize data from reputable real estate portals, news sources, and publicly accessible records.
- Focus search parameters on recency (ideally sold < 6 months, max 1 year), proximity, and similarity (property type, beds, baths, SqFt, lot size, general condition/features).
- Search for macro and micro market data (trends, indicators) for the specified region/zip code.

Meticulous Self-Checking & Validation (Mandatory Steps Before Output):
- Cross-Reference Data: If possible, try to verify key data points (like sale price, date, SqFt) from more than one source, acknowledging discrepancies if found.
- Critically Evaluate Comps: Before finalizing the comp list, review each one: Is it truly comparable? Are the differences understood? Are there better comps potentially missed? Briefly document this internal check.
- Review Adjustment Logic: Re-read your qualitative adjustments for comps. Are they logical and consistent? Do they directly relate stated differences between the comp and the subject property?
- Check Internal Consistency: Ensure the findings in the market analysis sections logically support the conclusions drawn in the valuation section.
- Acknowledge Limitations: Explicitly note where data was scarce, potentially unreliable, or where significant assumptions had to be made.


<subject_property>
{{PROPERTY_ADDRESS}}
{{PDF_NOTE}}
{{ADDITIONAL_DETAILS}}
</subject_property>

<report_audience>
Intended Audience: {{REPORT_AUDIENCE}}
</report_audience>

{{SPECIAL_INSTRUCTIONS}}

REQUIRED REPORT COMPONENTS:
Follow this structure precisely, integrating findings from your web search and self-checking process

1. **Executive Summary**: Brief overview of the property, key market findings (especially relating to the subject property), and the final estimated market value range. Highlight any significant challenges or unique selling points identified from the provided details.

2. **Property Description & Initial Assessment**:
   - Recap the provided property details accurately.
   - Initial assessment based on the description (e.g., Strengths identified from details provided, Weaknesses identified, Typical/Unique aspects for the Target Area?).

3. **Macro Market Analysis**:
   - Based on Web Search: Current real estate market trends (e.g., Buyer's/Seller's market determination with justification).
   - Based on Web Search: Key market indicators (Median Sales Price trends, Price per SqFt trends, Sales Volume, Average Days on Market, Inventory Levels – cite sources or state if data is estimated/unavailable).
   - Based on Web Search: Relevant economic factors (e.g., Local employment, population trends, major developments impacting the area).

4. **Micro Market Analysis**:
   - Based on Web Search: Specific trends noted within the target neighborhood or zip code. How does it compare to the broader city/county overall?
   - Based on Web Search: Neighborhood characteristics (e.g., Predominant property types, general age/condition of homes, local amenities, school district reputation - based on available public data).
   - Comparison of the subject property's characteristics (especially size, age, condition, lot size) to local norms.

5. **Comparable Sales Analysis (Comps)**:
   - Crucial Step: Identify at least 3, ideally 5, recently sold (target < 6 months, max 1 year) comparable properties found via web search. Prioritize similarity and proximity.
   - For each comp: Address, Sale Date, Sale Price, Beds, Baths, SqFt, Year Built (if found), Lot Size, Source of Data (e.g., Zillow sold data, public record summary), and brief notes on condition/features relative to the subject property.
   - Critical Analysis: Discuss how each comp compares to the subject property. Justify suggested qualitative adjustments.

6. **Competitive Listing Analysis (Active/Pending)**:
   - Crucial Step: Identify at least 2-3 similar properties currently listed for sale or pending in the area via web search.
   - For each: Address, List Price, Days on Market (DOM), Beds, Baths, SqFt, Lot Size, Source of Data, brief notes on condition/features vs. subject.
   - Analysis: How does the subject property likely stack up against current competition?

7. **Valuation Estimate**:
   - Primary Method: State clearly that the valuation is primarily based on the Sales Comparison Approach using the analyzed comps found via web search.
   - Justification: Explicitly reference the comps and adjustments discussed.
   - **Estimated Market Value Range**: Provide a realistic price range (e.g., $XXX,XXX - $YYY,YYY). Format as "$XXX,XXX - $YYY,YYY".
   - **Single Point Estimate**: Provide a single "most likely" market value within that range. Format as "$XXX,XXX".

8. **SWOT Analysis**:
   - Strengths
   - Weaknesses
   - Opportunities
   - Threats

9. **Market Outlook & Conclusion**:
   - Brief projection for the property's local market in the near term.
   - Concluding remarks on the property's overall position and potential within the current market context.

FORMATTING:
- Use clear Markdown headings (## for main sections, ### for subsections) for each section.
- Use bullet points for lists.
- Use tables where appropriate for presenting comparable data.
- Present data clearly.
- Maintain a professional, analytical, and objective tone throughout.
- IMPORTANT: Clearly state the Estimated Market Value Range and Single Point Estimate in the Valuation section using the exact format: "Estimated Market Value Range: $XXX,XXX - $YYY,YYY" and "Single Point Estimate: $XXX,XXX"

Execute the analysis based on the property details provided and the data you can reliably find through web search.`;

        const PROMPT_TEMPLATE_EXPERIMENTAL = `
### SYSTEM ROLE & OBJECTIVE
You are an elite Senior Real Estate Appraiser and Market Data Scientist with 25+ years of experience in high-stakes valuation. Your objective is to generate a **"Bank-Grade" Comparative Market Analysis (CMA)** and Valuation Report.

You do not guess. You do not hallucinate. You act as a skeptical auditor of data. You rely strictly on verifiable data retrieved through rigorous web browsing and established valuation methodologies (Sales Comparison Approach).

### INTENDED AUDIENCE
{{REPORT_AUDIENCE}}
Tailor framing and recommendations accordingly (buyer: negotiation leverage/risks; seller: pricing/positioning; investor: returns, rent comps, cash flow, cap rate).

### INPUT DATA
<SUBJECT_PROPERTY>
Address: {{PROPERTY_ADDRESS}}
PDF Context: {{PDF_NOTE}}
Details: {{ADDITIONAL_DETAILS}}
</SUBJECT_PROPERTY>

<USER_INSTRUCTIONS>
{{SPECIAL_INSTRUCTIONS}}
</USER_INSTRUCTIONS>

### EXECUTION PROTOCOL (Step-by-Step)

**PHASE 1: SURGICAL WEB SEARCH**
Do not perform generic searches. Execute specific queries:
1.  **Subject History**: Search the specific address for tax records, previous listing history, and price cuts.
2.  **Comparable Retrieval**: Search for "Sold homes [Zip Code] last 6 months" on sites like Redfin, Zillow, Realtor, and local MLS aggregators.
    *   *Filter Logic*: Radius < 1 mile (subdivision priority), +/- 20% SqFt, similar age/style.
3.  **Market Pulse**: Search for "[City/Neighborhood] real estate market report [Current Month/Year]" to find absorption rates and inventory levels.

**PHASE 2: DATA VALIDATION & SELECTION**
*   Select the best 3-5 Closed Sales (Comps).
*   *Constraint*: If a comp is > 6 months old or > 1 mile away, you MUST explicitly justify why it was used (e.g., lack of inventory).
*   *Sanity Check*: Verify listing data across two sources if possible to avoid "zombie listing" errors.

**PHASE 3: QUANTITATIVE VALUATION (The Adjustment Grid)**
You must perform a mental "Adjustment Grid" calculation.
*   If a Comp has an extra bath and the Subject doesn't, apply a negative dollar adjustment to the Comp's price.
*   If the Subject has a larger lot, apply a positive adjustment to the Comp's price.
*   *Goal*: Derive an "Adjusted Value" for each comp to narrow the valuation range.

### REQUIRED OUTPUT FORMAT
(Adhere strictly to this Markdown structure)

# Real Estate Valuation Report: [Insert Property Address]
**Date:** [Current Date]
**Analyst Confidence Score:** [Low/Medium/High] (Based on data availability)

## 1. Executive Summary & Verdict
*   **Estimated Value Range:** $XXX,XXX - $XXX,XXX
*   **Most Probable List Price:** $XXX,XXX
*   **Liquidity Rating:** [Fast/Average/Slow] (How fast will it sell?)
*   **Top-Level Insight:** A 2-3 sentence summary of why the property is worth this amount, referencing the strongest driver (e.g., "Premium lot size offsets the dated kitchen...").

## 2. Subject Property Anatomy
*   **Facts:** Beds | Baths | SqFt | Lot Size | Year Built
*   **The "Hook":** What is the single best feature?
*   **The "Drag":** What is the biggest objection buyers will have?

## 3. Macro & Micro Market Conditions
*(Cite Sources for all data points)*
*   **Neighborhood Trend:** [Appreciating/Stabilizing/Declining]
*   **Inventory Levels:** [Months of Supply] - Is this a Buyer's or Seller's market?
*   **Key Economic Drivers:** Mention specific local factors (e.g., "New school opening nearby," "Transit changes," "Interest rate impact on this price tier").

## 4. Comparable Sales Analysis (The Core Data)
*Create a Markdown Table with the following columns:*
| Address | Sold Date | Sold Price | SqFt | Price/SqFt | Distance | Adjustments/Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [Comp 1] | ... | ... | ... | ... | ... | [e.g. +$10k for Reno] |
| [Comp 2] | ... | ... | ... | ... | ... | [e.g. -$5k for Busy Road] |
| [Comp 3] | ... | ... | ... | ... | ... | [e.g. Model Match] |

**Comp Analysis:**
*   **Comp 1 (The Ceiling):** Why did this sell for the highest price? Does the subject match this standard?
*   **Comp 2 (The Floor):** Why was this cheap? Is the subject superior?
*   **Comp 3 (The Model Match):** The most similar property found.

## 5. Active Competition (Shadow Inventory)
Identify 2 active listings that the subject property will be fighting against for buyers.
*   **Competitor A:** Price | DOM | Comparison (Subject is Better/Worse because...)
*   **Competitor B:** Price | DOM | Comparison

## 6. SWOT Analysis
*   **Strengths:** (Tangible assets, e.g., "New Roof")
*   **Weaknesses:** (Tangible liabilities, e.g., "High HOA")
*   **Opportunities:** (Potential value adds, e.g., "Unfinished basement")
*   **Threats:** (External factors, e.g., "New construction dilution")

## 7. Final Valuation Logic
*   **Methodology:** Primarily Sales Comparison Approach.
*   **Reconciliation:** Explain how you weighed the comps. Did you give more weight to the most recent sale or the closest one? Why?
*   **Final Numbers:**
    *   **Conservative Liquidation Price (Sell in <30 days):** $XXX,XXX
    *   **Fair Market Value:** $XXX,XXX
    *   **Aggressive List Price:** $XXX,XXX

***
**DISCLAIMER:** *This is an AI-generated analytical report based on publicly available web data. It is not an official appraisal regulated by USPAP. Physical inspection was not performed. Data reliability depends on public record accuracy.*
`;

        // State management
        let reports = [];
        let completedCount = 0;
        let totalReports = 0;

        // DOM elements
        const form = document.getElementById('reportForm');
        const generateBtn = document.getElementById('generateBtn');
        const progressSection = document.getElementById('progressSection');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressTitle = document.getElementById('progressTitle');
        const reportStatusList = document.getElementById('reportStatusList');
        const finalReportSection = document.getElementById('finalReportSection');
        const finalReportStatus = document.getElementById('finalReportStatus');
        const finalReportContent = document.getElementById('finalReportContent');
        const downloadPdfBtn = document.getElementById('downloadPdfBtn');
        const reportsContainer = document.getElementById('reportsContainer');
        const apiKeyInput = document.getElementById('apiKey');
        const rememberApiKey = document.getElementById('rememberApiKey');
        const pdfUploadStatus = document.getElementById('pdfUploadStatus');
        const pdfUploadPill = document.getElementById('pdfUploadPill');
        const pdfUploadName = document.getElementById('pdfUploadName');
        const pdfUploadPreviews = document.getElementById('pdfUploadPreviews');
        const propertyPdfInput = document.getElementById('propertyPdf');
        const attachmentState = {
            files: []
        };

        const API_KEY_STORAGE = 'valuate:geminiApiKey';
        const storedApiKey = localStorage.getItem(API_KEY_STORAGE);
        if (storedApiKey) {
            apiKeyInput.value = storedApiKey;
            rememberApiKey.checked = true;
        }

        function isSupportedAttachment(file) {
            if (!file) return false;
            return file.type === 'application/pdf' || file.type.startsWith('image/');
        }

        function updatePdfUploadIndicator(files) {
            if (!pdfUploadPill || !pdfUploadName) return;
            if (!files || files.length === 0) {
                pdfUploadPill.classList.remove('is-ready');
                pdfUploadPill.textContent = 'No file';
                pdfUploadName.textContent = 'Upload optional supporting docs.';
                return;
            }

            const fileList = Array.from(files);
            const invalidFiles = fileList.filter((file) => !isSupportedAttachment(file));
            const validFiles = fileList.filter((file) => isSupportedAttachment(file));
            const displayNames = validFiles.slice(0, 2).map((file) => file.name).filter(Boolean);
            const remainingCount = validFiles.length - displayNames.length;

            if (invalidFiles.length > 0) {
                pdfUploadPill.classList.remove('is-ready');
                pdfUploadPill.textContent = 'Invalid';
                pdfUploadName.textContent = `Unsupported file type${invalidFiles.length > 1 ? 's' : ''} selected.`;
                return;
            }

            pdfUploadPill.classList.add('is-ready');
            pdfUploadPill.textContent = validFiles.length === 1 ? 'File ready' : 'Files ready';
            if (displayNames.length === 0) {
                pdfUploadName.textContent = `${validFiles.length} file${validFiles.length === 1 ? '' : 's'} selected.`;
                return;
            }
            pdfUploadName.textContent = `${displayNames.join(', ')}${remainingCount > 0 ? ` +${remainingCount} more` : ''}`;
        }

        function revokeAttachmentPreviews(files) {
            files.forEach((file) => {
                if (file.previewUrl) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        }

        function setAttachmentFiles(files) {
            revokeAttachmentPreviews(attachmentState.files);
            attachmentState.files = files.map((file) => ({
                file,
                previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
            }));
            syncAttachmentInput();
            updatePdfUploadIndicator(files);
            renderAttachmentPreviews();
        }

        function removeAttachmentAt(index) {
            const removed = attachmentState.files.splice(index, 1);
            revokeAttachmentPreviews(removed);
            syncAttachmentInput();
            updatePdfUploadIndicator(attachmentState.files.map((entry) => entry.file));
            renderAttachmentPreviews();
        }

        function syncAttachmentInput() {
            if (!propertyPdfInput || typeof DataTransfer === 'undefined') return;
            const dataTransfer = new DataTransfer();
            attachmentState.files.forEach((entry) => {
                dataTransfer.items.add(entry.file);
            });
            propertyPdfInput.files = dataTransfer.files;
        }

        function renderAttachmentPreviews() {
            if (!pdfUploadPreviews) return;
            pdfUploadPreviews.innerHTML = '';
            const files = attachmentState.files;
            if (!files || files.length === 0) {
                pdfUploadPreviews.classList.add('hidden');
                return;
            }
            pdfUploadPreviews.classList.remove('hidden');
            files.forEach((entry, index) => {
                const card = document.createElement('div');
                card.className = 'upload-preview-card';

                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.className = 'upload-remove';
                removeButton.innerHTML = '<i class="fas fa-times"></i>';
                removeButton.setAttribute('aria-label', `Remove ${entry.file.name}`);
                removeButton.addEventListener('click', () => removeAttachmentAt(index));

                if (entry.previewUrl) {
                    const img = document.createElement('img');
                    img.src = entry.previewUrl;
                    img.alt = entry.file.name || 'Image attachment';
                    img.className = 'upload-preview-thumb';
                    card.appendChild(img);
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'upload-preview-thumb flex items-center justify-center text-slate-400 text-2xl';
                    placeholder.innerHTML = '<i class="fas fa-file-pdf"></i>';
                    card.appendChild(placeholder);
                }

                const meta = document.createElement('div');
                meta.className = 'upload-preview-meta';
                meta.innerHTML = `<i class="fas fa-paperclip"></i><span class="truncate">${entry.file.name || 'Attachment'}</span>`;

                card.appendChild(removeButton);
                card.appendChild(meta);
                pdfUploadPreviews.appendChild(card);
            });
        }

        if (propertyPdfInput) {
            propertyPdfInput.addEventListener('change', (event) => {
                const files = Array.from(event.target.files || []);
                const invalidFiles = files.filter((file) => !isSupportedAttachment(file));
                if (invalidFiles.length > 0) {
                    alert('Please upload only PDFs or image files.');
                    setAttachmentFiles([]);
                    return;
                }
                setAttachmentFiles(files);
            });
        }

        const requestState = {
            apiKey: '',
            model: '',
            promptKey: 'standard',
            propertyAddress: '',
            additionalDetails: '',
            specialInstructions: '',
            reportAudience: 'buyer',
            enableSearch: false,
            inferredAddress: ''
        };
        
        updateDownloadButtonState(false);
        downloadPdfBtn.addEventListener('click', saveFinalReportAsPDF);

        // Form submission handler
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const apiKey = document.getElementById('apiKey').value.trim();
            const model = document.getElementById('modelSelect').value;
            const promptKey = document.getElementById('promptSelect')?.value || 'standard';
            const propertyAddress = document.getElementById('propertyAddress').value.trim();
            const propertyFiles = attachmentState.files.length > 0
                ? attachmentState.files.map((entry) => entry.file)
                : Array.from(document.getElementById('propertyPdf').files || []);
            const additionalDetails = document.getElementById('additionalDetails').value.trim();
            const specialInstructions = document.getElementById('specialInstructions').value.trim();
            const reportAudience = document.getElementById('reportAudience').value;
            const reportCount = parseInt(document.getElementById('reportCount').value);
            const concurrency = parseInt(document.getElementById('concurrency').value);
            const enableSearch = document.getElementById('enableSearch').checked;

            if (!apiKey || (!propertyAddress && propertyFiles.length === 0)) {
                alert('Please provide an API key and either a property address or attachments.');
                return;
            }

            if (rememberApiKey.checked) {
                localStorage.setItem(API_KEY_STORAGE, apiKey);
            } else {
                localStorage.removeItem(API_KEY_STORAGE);
            }

            const invalidFiles = propertyFiles.filter((file) => !isSupportedAttachment(file));
            if (invalidFiles.length > 0) {
                alert('Please upload only PDFs or image files.');
                return;
            }

            let attachmentPayloads = [];
            if (propertyFiles.length > 0) {
                try {
                    attachmentPayloads = await readFilesAsBase64(propertyFiles);
                } catch (error) {
                    alert(`Failed to read attachment: ${error.message}`);
                    return;
                }
            }

            requestState.apiKey = apiKey;
            requestState.model = model;
            requestState.promptKey = promptKey;
            requestState.propertyAddress = propertyAddress;
            requestState.additionalDetails = additionalDetails;
            requestState.specialInstructions = specialInstructions;
            requestState.reportAudience = reportAudience;
            requestState.enableSearch = enableSearch;

            // Reset state
            reports = [];
            completedCount = 0;
            totalReports = reportCount;

            // Update UI
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Generating Reports...';
            progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin text-brand-500"></i>Generating Reports...';
            progressSection.classList.remove('hidden');
            finalReportSection.classList.add('hidden');
            updateDownloadButtonState(false);
            finalReportStatus.textContent = 'Waiting for reports...';
            finalReportContent.innerHTML = '';
            reportsContainer.innerHTML = '';
            reportStatusList.innerHTML = '';
            // Scroll to progress
            progressSection.scrollIntoView({ behavior: 'smooth' });

            // Initialize status items
            for (let i = 0; i < reportCount; i++) {
                const statusItem = document.createElement('div');
                statusItem.id = `status-${i}`;
                statusItem.className = 'flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-100 text-sm';
                statusItem.innerHTML = `
                    <div class="w-2 h-2 rounded-full bg-slate-300"></div>
                    <span class="text-slate-500">Report ${i + 1}: Waiting...</span>
                `;
                reportStatusList.appendChild(statusItem);
            }

            updateProgress();

            // Build prompt
            const isExperimental = promptKey === 'experimental';
            const attachmentNote = attachmentPayloads.length > 0
                ? (isExperimental
                    ? 'Attached files include property PDFs and/or images. Use them as primary sources for subject property details.'
                    : '\nAttached files include property PDFs and/or images. Use them as primary sources for subject property details.')
                : '';
            const detailsBlock = additionalDetails
                ? (isExperimental ? additionalDetails : `\nAdditional Details: ${additionalDetails}`)
                : '';
            const instructionsBlock = specialInstructions
                ? (isExperimental ? specialInstructions : `\nSpecial Instructions: ${specialInstructions}`)
                : '';
            const selectedTemplate = isExperimental
                ? PROMPT_TEMPLATE_EXPERIMENTAL
                : PROMPT_TEMPLATE;
            let prompt = selectedTemplate
                .replace('{{PROPERTY_ADDRESS}}', propertyAddress || 'Address not provided (see attached PDF).')
                .replace('{{ADDITIONAL_DETAILS}}', detailsBlock)
                .replace('{{SPECIAL_INSTRUCTIONS}}', instructionsBlock)
                .replace('{{PDF_NOTE}}', attachmentNote)
                .replace('{{REPORT_AUDIENCE}}', reportAudience);

            // Generate reports with concurrency control
            const generateReport = async (index) => {
                updateStatus(index, 'running', 'Generating...');
                
                try {
                    const result = await callGeminiAPI(apiKey, model, prompt, enableSearch, index, attachmentPayloads);
                    reports[index] = {
                        index: index,
                        success: true,
                        content: result.content,
                        searchSuggestions: result.searchSuggestions || [],
                        valuations: extractValuations(result.content)
                    };
                    updateStatus(index, 'success', 'Completed');
                    displayReport(index, result.content, result.searchSuggestions);
                } catch (error) {
                    reports[index] = {
                        index: index,
                        success: false,
                        error: error.message
                    };
                    updateStatus(index, 'error', `Error: ${error.message}`);
                }

                completedCount++;
                updateProgress();

                if (completedCount === totalReports) {
                    finalize();
                }
            };

            // Execute with concurrency control
            const queue = [...Array(reportCount).keys()];
            const executing = [];

            const enqueue = async () => {
                while (queue.length > 0 && executing.length < concurrency) {
                    const index = queue.shift();
                    const promise = generateReport(index).then(() => {
                        executing.splice(executing.indexOf(promise), 1);
                        enqueue();
                    });
                    executing.push(promise);
                }
            };

            enqueue();
        });

        // Call Gemini API
        function normalizeModelName(model) {
            if (!model) return '';
            return model.replace(/^models\//i, '');
        }

        function getThinkingConfigForModel(model) {
            const normalized = normalizeModelName(model).toLowerCase();
            if (normalized.startsWith('gemini-3-')) {
                return { thinkingLevel: 'high' };
            }
            if (normalized.includes('2.5') || normalized.includes('flash-latest')) {
                return { thinkingBudget: -1 };
            }
            return null;
        }

        async function callGeminiAPI(apiKey, model, prompt, enableSearch, index, attachments = [], extraTools = []) {
            const normalizedModel = normalizeModelName(model);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${normalizedModel}:generateContent?key=${apiKey}`;
            
            const parts = [{ text: prompt }];
            if (attachments && attachments.length > 0) {
                attachments.forEach((attachment) => {
                    parts.push({
                        inline_data: {
                            mime_type: attachment.mimeType,
                            data: attachment.data
                        }
                    });
                });
            }

            const thinkingConfig = getThinkingConfigForModel(model);
            const requestBody = {
                contents: [{
                    parts
                }],
                generationConfig: {
                    temperature: 1 + (index * 0.05), // Slight variation for diversity
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 65536
                },
            };
            if (thinkingConfig) {
                requestBody.generationConfig.thinkingConfig = thinkingConfig;
            }

            const tools = [];
            if (enableSearch) {
                tools.push({ google_search: {} });
            }
            if (extraTools.length > 0) {
                tools.push(...extraTools);
            }
            if (tools.length > 0) {
                requestBody.tools = tools;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No response generated');
            }

            const candidate = data.candidates[0];
            const contentParts = candidate.content?.parts || [];
            const content = contentParts
                .map(part => part.text || '')
                .filter(Boolean)
                .join('\n\n');
            
            // Extract search suggestions if available
            let searchSuggestions = [];
            if (data.candidates[0]?.groundingMetadata?.searchEntryPoint?.renderedContent) {
                searchSuggestions = [data.candidates[0].groundingMetadata.searchEntryPoint.renderedContent];
            }
            if (data.candidates[0]?.groundingMetadata?.webSearchQueries) {
                searchSuggestions = data.candidates[0].groundingMetadata.webSearchQueries;
            }

            return { content, searchSuggestions };
        }

        function readFileAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(new Error('Unable to read file.'));
                reader.onload = () => {
                    const base64Data = arrayBufferToBase64(reader.result);
                    resolve({
                        mimeType: file.type || 'application/pdf',
                        data: base64Data
                    });
                };
                reader.readAsArrayBuffer(file);
            });
        }

        function readFilesAsBase64(files) {
            return Promise.all(files.map((file) => readFileAsBase64(file)));
        }

        function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const chunkSize = 0x8000;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            return btoa(binary);
        }

        // Extract valuations from report content
        function extractValuations(content) {
            const parseNumber = (value) => {
                if (!value) return null;
                return parseFloat(String(value).replace(/,/g, ''));
            };

            const valuations = {
                pointEstimate: null,
                rangeLow: null,
                rangeHigh: null
            };

            // Match various formats for point estimate
            const pointPatterns = [
                /Single\s*Point\s*Estimate[:\s]*\$?([\d,]+)/i,
                /Most\s*Likely\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)/i,
                /Point\s*Estimate[:\s]*\$?([\d,]+)/i,
                /Estimated\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)(?!\s*[-–])/i
            ];

            for (const pattern of pointPatterns) {
                const match = content.match(pattern);
                if (match?.[1]) {
                    valuations.pointEstimate = parseNumber(match[1]);
                    break;
                }
            }

            // Match range patterns
            const rangePatterns = [
                /(?:Estimated\s*)?(?:Market\s*)?Value\s*Range[:\s]*\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i,
                /Range[:\s]*\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i,
                /\$?([\d,]+)\s*[-–]\s*\$?([\d,]+)/i
            ];

            for (const pattern of rangePatterns) {
                const match = content.match(pattern);
                if (match?.[1] && match?.[2]) {
                    valuations.rangeLow = parseNumber(match[1]);
                    valuations.rangeHigh = parseNumber(match[2]);
                    break;
                }
            }

            return valuations;
        }

        async function inferAddressFromFinalReport(reportText) {
            const cleanedText = (reportText || '').replace(/\s+/g, ' ').trim();
            if (!cleanedText || !requestState.apiKey || !requestState.model) {
                return null;
            }

            const prompt = `You are an address extraction assistant.
Return ONLY the full subject property address (street, city, state, ZIP) from the report text.
Choose the subject property, not comparable listings. If no clear subject address is present, return "UNKNOWN".

Report Text:
${cleanedText}`;

            const inferenceModel = requestState.model || 'gemini-flash-latest';
            const result = await callGeminiAPI(
                requestState.apiKey,
                inferenceModel,
                prompt,
                false,
                0,
                []
            );

            let candidate = (result?.content || '').trim();
            if (!candidate) return null;
            candidate = candidate.split('\n')[0].trim();
            candidate = candidate.replace(/^[-*]\s*/, '');
            candidate = candidate.replace(/^Address\s*[:\-]\s*/i, '');
            candidate = candidate.replace(/^Subject\s*Property\s*[:\-]\s*/i, '');
            if (!candidate || /^unknown$/i.test(candidate)) {
                return null;
            }
            return candidate;
        }

        // Update progress display
        function updateProgress() {
            const percent = totalReports > 0 ? (completedCount / totalReports) * 100 : 0;
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${completedCount} / ${totalReports}`;
        }

        // Update individual status
        function updateStatus(index, status, message) {
            const statusItem = document.getElementById(`status-${index}`);
            if (!statusItem) return;

            let icon, textClass;
            switch (status) {
                case 'running':
                    icon = '<div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>';
                    textClass = 'text-blue-600 font-medium';
                    break;
                case 'success':
                    icon = '<div class="w-2 h-2 rounded-full bg-green-500"></div>';
                    textClass = 'text-green-600 font-medium';
                    break;
                case 'error':
                    icon = '<div class="w-2 h-2 rounded-full bg-red-500"></div>';
                    textClass = 'text-red-600 font-medium';
                    break;
                default:
                    icon = '<div class="w-2 h-2 rounded-full bg-slate-300"></div>';
                    textClass = 'text-slate-500';
            }

            statusItem.innerHTML = `
                ${icon}
                <span class="${textClass} flex-1">Report ${index + 1}: ${message}</span>
            `;
        }

        // Display individual report
        function displayReport(index, content, searchSuggestions) {
            const reportCard = document.createElement('div');
            reportCard.className = 'bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm';
            
            const htmlContent = markdownToHtml(content);
            const valuationBadge = reports[index]?.valuations?.pointEstimate 
                ? `<span class="bg-brand-50 text-brand-700 text-xs font-semibold px-2 py-1 rounded-md ml-auto">${formatCurrency(reports[index].valuations.pointEstimate)}</span>` 
                : '';

            reportCard.innerHTML = `
                <button type="button" id="accordion-button-${index}" class="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors" onclick="toggleAccordion(${index})" aria-expanded="false" aria-controls="accordion-content-${index}">
                    <div class="flex items-center gap-3 w-full">
                        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">${index + 1}</span>
                        <span class="font-semibold text-slate-700">Individual Analysis</span>
                        ${valuationBadge}
                    </div>
                    <i id="accordion-icon-${index}" class="fas fa-chevron-down text-slate-400 transition-transform ml-3"></i>
                </button>
                <div id="accordion-content-${index}" class="hidden">
                    <div class="border-t border-slate-100 p-5 sm:p-8 bg-slate-50/50">
                        <div class="prose max-w-none text-sm">
                            ${htmlContent}
                        </div>
                    </div>
                </div>
            `;
            
            reportsContainer.appendChild(reportCard);
        }

        // Toggle accordion
        function toggleAccordion(index) {
            const content = document.getElementById(`accordion-content-${index}`);
            const icon = document.getElementById(`accordion-icon-${index}`);
            const button = document.getElementById(`accordion-button-${index}`);
            if (!content || !icon) return;

            const isHidden = content.classList.contains('hidden');
            if (isHidden) {
                content.classList.remove('hidden');
                icon.classList.add('rotate-180');
                button.setAttribute('aria-expanded', 'true');
            } else {
                content.classList.add('hidden');
                icon.classList.remove('rotate-180');
                button.setAttribute('aria-expanded', 'false');
            }
        }

        // Finalize and generate merged report
        function finalize() {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-bolt"></i><span>Generate Analysis</span>';
            progressTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>Analysis Complete';
            updateDownloadButtonState(false);

            const successfulReports = reports.filter(r => r && r.success);
            if (successfulReports.length === 0) {
                finalReportSection.classList.remove('hidden');
                finalReportStatus.textContent = 'No successful reports to merge.';
                updateDownloadButtonState(false);
                return;
            }

            generateFinalReport(successfulReports);
        }

        async function generateFinalReport(successfulReports) {
            finalReportSection.classList.remove('hidden');
            finalReportStatus.textContent = 'Validating comparable sales...';
            finalReportContent.innerHTML = '';
            updateDownloadButtonState(false);
            
            // Scroll to final report
            finalReportSection.scrollIntoView({ behavior: 'smooth' });

            const reportsText = successfulReports
                .map((report, index) => `--- Report ${index + 1} ---\n${report.content}`)
                .join('\n\n');

            const valuationsSnapshot = successfulReports.map((report, index) => ({
                report: index + 1,
                pointEstimate: report.valuations?.pointEstimate || null,
                rangeLow: report.valuations?.rangeLow || null,
                rangeHigh: report.valuations?.rangeHigh || null
            }));

            let validatedCompsContent = 'Validation step unavailable.';
            try {
                validatedCompsContent = await validateCompsAndListings(reportsText);
            } catch (error) {
                validatedCompsContent = `Validation step failed: ${error.message}. Proceed with caution and note that comps were not independently verified.`;
            }

            finalReportStatus.textContent = 'Generating final merged report...';

            const FINAL_REPORT_TEMPLATE = `You are a senior real estate analyst. Read all reports below and produce ONE report that merges and reconciles them into a single, authoritative narrative.
Intended audience: ${requestState.reportAudience}. Tailor emphasis, risks, and recommendations accordingly.

Requirements:
- Resolve inconsistencies across reports, favoring data that is cited more consistently or appears better supported.
- Combine comps and listings into unified tables (de-duplicate where possible).
- Preserve the required report structure and formatting from the original reports (Markdown headings, tables, bullet points).
- Use ## headings for main sections and ### for subsections.
- Keep a professional, analytical tone.
- Use the validated comps/listings below as authoritative. Do not include comps/listings not present there. If validation notes exclusions or uncertainty, reflect that in the final report.

Validated Comparable Sales & Listings:
${validatedCompsContent}

Reports to Merge:
${reportsText}`;

            try {
                const result = await callGeminiAPI(
                    requestState.apiKey,
                    requestState.model,
                    FINAL_REPORT_TEMPLATE,
                    false,
                    0,
                    [],
                    [{ code_execution: {} }]
                );
                finalReportStatus.textContent = ''; // Clear status on success
                finalReportContent.innerHTML = markdownToHtml(result.content);
                updateDownloadButtonState(true);
            } catch (error) {
                finalReportStatus.textContent = `Final report failed: ${error.message}`;
                updateDownloadButtonState(false);
            }
        }

        async function resolveReportAddress() {
            let reportAddress = requestState.propertyAddress?.trim();
            if (!reportAddress) {
                reportAddress = requestState.inferredAddress?.trim() || '';
                if (!reportAddress) {
                    try {
                        const inferred = await inferAddressFromFinalReport(
                            finalReportContent.textContent || ''
                        );
                        if (inferred) {
                            requestState.inferredAddress = inferred;
                            reportAddress = inferred;
                        }
                    } catch (error) {
                        console.warn('Failed to infer address from final report:', error);
                    }
                }
            }
            if (!reportAddress) {
                reportAddress = 'Address not provided';
            }
            return reportAddress;
        }

async function saveFinalReportAsPDF() {
    if (!finalReportContent.innerHTML.trim()) {
        alert('Generate the final report before saving as PDF.');
        return;
    }

    const originalDownloadLabel = downloadPdfBtn ? downloadPdfBtn.innerHTML : '';
    if (downloadPdfBtn) {
        downloadPdfBtn.disabled = true;
        downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Preparing PDF...';
    }

    const printContainer = document.createElement('div');
    printContainer.innerHTML = finalReportContent.innerHTML;
    
    // CRITICAL: Wrap tables to ensure 'break-inside: avoid' works reliably
    printContainer.querySelectorAll('table').forEach(table => {
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper'; // Changed class name for specificity
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });

    const reportAddress = await resolveReportAddress();

    const addressNode = document.createElement('div');
    addressNode.textContent = reportAddress;
    const safeAddress = addressNode.innerHTML;
    const valuations = extractValuations(printContainer.textContent || '');
    
    const valuationRange = valuations.rangeLow && valuations.rangeHigh
        ? `${formatCurrency(valuations.rangeLow)} - ${formatCurrency(valuations.rangeHigh)}`
        : null;
    const valuationPoint = valuations.pointEstimate
        ? formatCurrency(valuations.pointEstimate)
        : null;

    const printWindow = window.open('', '_blank', 'width=1000,height=1200');
    if (!printWindow) {
        alert('Please enable pop-ups to save the report.');
        if (downloadPdfBtn) {
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.innerHTML = originalDownloadLabel;
        }
        return;
    }

    const timestamp = new Date().toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const disclaimerHtml = `
        <div class="footer-disclaimer">
            <strong>Disclaimer:</strong> This report is an AI-generated estimate based on available data. It is not a professional appraisal. Consult a licensed appraiser for official valuations.
        </div>
    `;

    const summaryHtml = `
        <div class="summary-section">
            <div class="summary-item">
                <span class="summary-label">Subject Property</span>
                <span class="summary-value">${safeAddress}</span>
            </div>
            ${valuationRange ? `
                <div class="summary-item highlight">
                    <span class="summary-label">Est. Value Range</span>
                    <span class="summary-value text-accent">${valuationRange}</span>
                </div>
            ` : ''}
            ${valuationPoint ? `
                <div class="summary-item strong">
                    <span class="summary-label">Point Estimate</span>
                    <span class="summary-value text-dark">${valuationPoint}</span>
                </div>
            ` : ''}
        </div>
    `;

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Real Estate Valuation Report</title>
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary: #0f172a;       /* Slate 900 */
            --secondary: #334155;     /* Slate 700 */
            --accent: #0369a1;        /* Sky 700 */
            --accent-light: #e0f2fe;  /* Sky 100 */
            --border: #e2e8f0;        /* Slate 200 */
            --bg-body: #f8fafc;       /* Slate 50 */
            --bg-white: #ffffff;
        }

        /* --- Reset & Base --- */
        * { box-sizing: border-box; }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--bg-body);
            color: var(--primary);
            font-family: 'Inter', sans-serif; /* Clean sans-serif for UI */
            font-size: 11pt;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* --- Layout --- */
        .page-container {
            max-width: 8.5in;
            margin: 40px auto;
            background: var(--bg-white);
            padding: 50px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid var(--border);
        }

        /* --- Header --- */
        header {
            border-bottom: 2px solid var(--border);
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }

        .brand h1 {
            font-family: 'Merriweather', serif;
            font-size: 24pt;
            font-weight: 700;
            margin: 0;
            color: var(--primary);
        }

        .brand .subtitle {
            font-size: 10pt;
            color: var(--secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }

        .report-meta {
            text-align: right;
            font-size: 9pt;
            color: var(--secondary);
        }

        /* --- Summary Section --- */
        .summary-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .summary-item {
            background: var(--bg-body);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border);
            page-break-inside: avoid;
        }

        .summary-item.highlight {
            background: var(--accent-light);
            border-color: #bae6fd;
        }

        .summary-item.strong {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        
        .summary-item.strong .summary-label { color: #94a3b8; }
        .summary-item.strong .summary-value { color: white; }

        .summary-label {
            display: block;
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
        }
        
        .summary-item:not(.strong) .summary-label { color: var(--secondary); }

        .summary-value {
            display: block;
            font-size: 16pt;
            font-weight: 600;
            font-family: 'Merriweather', serif;
        }

        .text-accent { color: var(--accent); }
        .text-dark { color: var(--primary); }

        /* --- Typography & Content --- */
        .report-body {
            font-family: 'Merriweather', serif; /* Serif for reading */
            color: #1e293b;
        }

        h2 {
            font-family: 'Inter', sans-serif;
            font-size: 14pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--primary);
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
            margin-top: 30px;
            margin-bottom: 15px;
            break-after: avoid; /* Keep header with content */
        }

        h3 {
            font-family: 'Inter', sans-serif;
            font-size: 11pt;
            font-weight: 600;
            color: var(--secondary);
            margin-top: 20px;
            margin-bottom: 8px;
        }

        p { margin-bottom: 12px; }
        ul, ol { margin-bottom: 12px; padding-left: 20px; }
        li { margin-bottom: 4px; }

        /* --- Table Styling --- */
        .table-wrapper {
            margin: 24px 0;
            break-inside: avoid;  /* CRITICAL: Prevents table from splitting across pages */
            page-break-inside: avoid;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            font-family: 'Inter', sans-serif;
            border: 1px solid var(--border);
        }

        th {
            background-color: var(--bg-body);
            color: var(--primary);
            font-weight: 600;
            text-align: left;
            padding: 10px 12px;
            border-bottom: 2px solid var(--border);
            font-size: 8.5pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            line-height: 1.4;
        }

        /* Zebra Striping */
        tbody tr:nth-child(even) { background-color: #f8fafc; }
        tbody tr:hover { background-color: #f1f5f9; }

        /* --- Footer --- */
        .footer-disclaimer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            font-size: 8pt;
            color: var(--secondary);
            text-align: justify;
            break-inside: avoid;
        }

        /* --- Print Specifics --- */
        @media print {
            body { background: white; }
            .page-container {
                width: 100%;
                max-width: none;
                margin: 0;
                padding: 0;
                border: none;
                box-shadow: none;
            }
            
            /* Ensure background colors print */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            /* Pagination Safety */
            h2, h3, .summary-item, .table-wrapper, blockquote {
                break-inside: avoid;
                page-break-inside: avoid;
            }

            h2 { break-after: avoid; }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <header>
            <div class="brand">
                <h1>Valuation Report</h1>
                <div class="subtitle">Automated Real Estate Analysis</div>
            </div>
            <div class="report-meta">
                <div>Date: ${timestamp}</div>
            </div>
        </header>

        ${summaryHtml}

        <div class="report-body">
            ${printContainer.innerHTML}
        </div>

        ${disclaimerHtml}
    </div>

    <script>
        // Short delay to ensure fonts and styles load before print dialog
        window.onload = function() {
            setTimeout(function() {
                window.print();
                // Optional: close window after printing (commented out for debugging)
                window.onafterprint = function() { window.close(); };
            }, 500);
        };
    <\/script>
</body>
</html>
    `);

    printWindow.document.close();

    if (downloadPdfBtn) {
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.innerHTML = originalDownloadLabel;
    }
}

        function updateDownloadButtonState(enabled) {
            if (!downloadPdfBtn) return;
            downloadPdfBtn.disabled = !enabled;
        }

        // Format currency
        function formatCurrency(value) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            }).format(value);
        }

        // Simple markdown to HTML converter
        function markdownToHtml(markdown) {
            if (!markdown) return '';

            const rawHtml = marked.parse(markdown, {
                gfm: true,
                breaks: true,
                smartLists: true
            });

            const wrapper = document.createElement('div');
            wrapper.innerHTML = rawHtml;

            return wrapper.innerHTML;
        }

        // Make toggleAccordion available globally
        window.toggleAccordion = toggleAccordion;

        async function validateCompsAndListings(reportsText) {
            const VALIDATE_COMPS_TEMPLATE = `You are a data verification specialist focused on real estate comps. Extract all comparable sales and active/pending listings from the reports below and verify them.

Verification steps (strict):
- Confirm each address exists and appears to be a real property.
- Verify key data (sale/list date, price, beds, baths, SqFt, year built, lot size) using reputable public sources (Zillow, Redfin, Realtor.com, county records, assessor/recorder data).
- If data conflicts, choose the most credible source and note the discrepancy.
- If you cannot verify an address or at least the price + date, exclude it.

Output format (Markdown):
## Validated Comparable Sales
| Address | Sale Date | Sale Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Validated Active/Pending Listings
| Address | List/Pending Date | List Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Excluded/Unverified
- Address (reason)

Rules:
- Do not invent new comps outside the reports. Only correct obvious address errors if a verified match is found.
- If web search is unavailable, state "Web search unavailable" and exclude any comp/listing you cannot verify from the report text itself.
- Be conservative: when in doubt, exclude.

Reports:
${reportsText}`;

            const result = await callGeminiAPI(
                requestState.apiKey,
                requestState.model,
                VALIDATE_COMPS_TEMPLATE,
                requestState.enableSearch,
                0,
                []
            );

            return result.content;
        }
