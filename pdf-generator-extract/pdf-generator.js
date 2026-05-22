(() => {
    const DEFAULT_BRAND_ASSETS = Object.freeze({
        realEstateGroup: 'assets/906-Real-Estate-Group_Logo-2024_Black.png',
        coldwellBanker: 'assets/CBlobo.png'
    });

    const DEFAULT_THEME = Object.freeze({
        navy: '#002068',
        lake: '#6888a0',
        ink: '#050505',
        paper: '#ffffff',
        mist: '#eef4f7',
        line: '#d8e2e8',
        muted: '#526371'
    });

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    async function resolveAsset(path) {
        const url = new URL(path, window.location.href).href;
        try {
            const response = await fetch(url, { cache: 'force-cache' });
            if (!response.ok) throw new Error(`Asset request failed with ${response.status}`);
            return await blobToDataUrl(await response.blob());
        } catch (error) {
            console.warn(`PDF asset could not be embedded from ${path}. Falling back to URL.`, error);
            return url;
        }
    }

    async function loadBrandAssets(assetPaths = DEFAULT_BRAND_ASSETS) {
        const [realEstateGroup, coldwellBanker] = await Promise.all([
            resolveAsset(assetPaths.realEstateGroup),
            resolveAsset(assetPaths.coldwellBanker)
        ]);
        return { realEstateGroup, coldwellBanker };
    }

    function markdownToHtml(markdown) {
        if (!markdown) return '';
        if (!window.marked) return escapeHtml(markdown).replace(/\n/g, '<br>');
        const rawHtml = window.marked.parse(markdown, {
            gfm: true,
            breaks: true,
            smartLists: true
        });
        const wrapper = document.createElement('div');
        wrapper.innerHTML = rawHtml;
        wrapper.querySelectorAll('table').forEach((table) => {
            const scrollWrapper = document.createElement('div');
            scrollWrapper.className = 'table-scroll';
            table.parentNode.insertBefore(scrollWrapper, table);
            scrollWrapper.appendChild(table);
        });
        return wrapper.innerHTML;
    }

    function normalizeReportHtml(html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html || '';

        wrapper.querySelectorAll('.table-scroll').forEach((scrollWrapper) => {
            const children = Array.from(scrollWrapper.children);
            const onlyTable = children.length === 1 && children[0]?.tagName === 'TABLE';
            if (onlyTable) {
                scrollWrapper.replaceWith(children[0]);
            } else {
                scrollWrapper.classList.remove('table-scroll');
            }
        });

        wrapper.querySelectorAll('a').forEach((link) => {
            const href = link.getAttribute('href');
            link.removeAttribute('target');
            link.removeAttribute('rel');
            if (href && !link.textContent.includes(href)) {
                const urlLabel = document.createElement('span');
                urlLabel.className = 'pdf-link-url';
                urlLabel.textContent = ` (${href})`;
                link.insertAdjacentElement('afterend', urlLabel);
            }
        });

        wrapper.querySelectorAll('img').forEach((image) => {
            image.removeAttribute('width');
            image.removeAttribute('height');
            image.loading = 'eager';
        });

        return wrapper.innerHTML;
    }

    function extractValuations(content) {
        const parseNumber = (value) => {
            if (!value) return null;
            const numeric = parseFloat(String(value).replace(/,/g, ''));
            return Number.isFinite(numeric) ? numeric : null;
        };
        const valuations = { pointEstimate: null, rangeLow: null, rangeHigh: null };
        const pointPatterns = [
            /Single\s*Point\s*Estimate[:\s]*\$?([\d,]+)/i,
            /Most\s*Likely\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)/i,
            /Point\s*Estimate[:\s]*\$?([\d,]+)/i,
            /Estimated\s*(?:Market\s*)?Value[:\s]*\$?([\d,]+)(?!\s*[-\u2013])/i
        ];
        const rangePatterns = [
            /(?:Estimated\s*)?(?:Market\s*)?Value\s*Range[:\s]*\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i,
            /Range[:\s]*\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i,
            /\$?([\d,]+)\s*[-\u2013]\s*\$?([\d,]+)/i
        ];

        for (const pattern of pointPatterns) {
            const match = content.match(pattern);
            if (match?.[1]) {
                valuations.pointEstimate = parseNumber(match[1]);
                break;
            }
        }
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

    function mergeValueRange(valuations, valueRangeOverride) {
        if (!valueRangeOverride?.rangeLow || !valueRangeOverride?.rangeHigh) {
            return valuations;
        }
        return {
            ...valuations,
            rangeLow: valueRangeOverride.rangeLow,
            rangeHigh: valueRangeOverride.rangeHigh
        };
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    }

    function formatDate(value) {
        if (!value) return 'Date unknown';
        return new Date(value).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatAudience(audience) {
        if (!audience) return 'Audience unknown';
        return audience.charAt(0).toUpperCase() + audience.slice(1);
    }

    function formatValueSummary(value) {
        if (value?.rangeLow && value?.rangeHigh) {
            return `${formatCurrency(value.rangeLow)} - ${formatCurrency(value.rangeHigh)}`;
        }
        if (value?.pointEstimate) return formatCurrency(value.pointEstimate);
        return '';
    }

    function getReportAddress({ report, address } = {}) {
        return address
            || report?.inputs?.propertyAddress
            || report?.finalReport?.inferredAddress
            || report?.output?.inferredAddress
            || 'Address not provided';
    }

    function buildSummaryItems({ report, address, contentText, audience } = {}) {
        const finalReport = report?.finalReport || {};
        const output = report?.output || {};
        const inputs = report?.inputs || {};
        const valuations = finalReport.valuations
            || output.valuations
            || extractValuations(contentText || '');
        const mergedValue = mergeValueRange(
            valuations,
            finalReport.valueRange || output.valueRange
        );

        return [
            { label: 'Subject property', value: address },
            { label: 'Prepared for', value: formatAudience(audience || inputs.reportAudience || finalReport.reportAudience || 'seller') },
            { label: 'Valuation', value: formatValueSummary(mergedValue) || 'See final report' },
            { label: 'Generated', value: formatDate(report?.createdAt || report?.created_at || new Date().toISOString()) }
        ];
    }

    function applyTheme(element, theme = DEFAULT_THEME) {
        Object.entries(theme).forEach(([key, value]) => {
            element.style.setProperty(`--pdf-${key}`, value);
        });
    }

    function buildExportDocument({ address, logos, reportHtml, summaryItems, theme = DEFAULT_THEME }) {
        const summaryMarkup = summaryItems.map((item) => `
            <div class="pdf-summary-item">
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${escapeHtml(item.value)}</dd>
            </div>
        `).join('');

        const realEstateLogo = escapeAttribute(logos.realEstateGroup);
        const coldwellLogo = escapeAttribute(logos.coldwellBanker);
        const exportDocument = document.createElement('article');
        exportDocument.className = 'pdf-export';
        exportDocument.setAttribute('aria-label', 'PDF valuation report export');
        exportDocument.innerHTML = `
            <section class="pdf-cover">
                <div class="pdf-cover-content">
                    <div class="pdf-logo-lockup" aria-label="Brokerage logos">
                        <img class="pdf-logo pdf-logo-906" src="${realEstateLogo}" alt="906 Real Estate Group">
                        <span class="pdf-logo-divider" aria-hidden="true"></span>
                        <img class="pdf-logo pdf-logo-cb" src="${coldwellLogo}" alt="Coldwell Banker Schmidt Realtors">
                    </div>
                    <div class="pdf-title-block">
                        <h1>Comparative Market Analysis</h1>
                        <p class="pdf-address">${escapeHtml(address)}</p>
                    </div>
                    <dl class="pdf-summary-grid">${summaryMarkup}</dl>
                </div>
            </section>
            <section class="pdf-report-page">
                <header class="pdf-report-header">
                    <div>
                        <p class="pdf-report-kicker">Final report</p>
                        <h2>${escapeHtml(address)}</h2>
                    </div>
                    <div class="pdf-header-logo-pair" aria-label="Brokerage logos">
                        <img class="pdf-logo pdf-logo-906" src="${realEstateLogo}" alt="906 Real Estate Group">
                        <img class="pdf-logo pdf-logo-cb" src="${coldwellLogo}" alt="Coldwell Banker Schmidt Realtors">
                    </div>
                </header>
                <div class="pdf-report-content">${reportHtml}</div>
            </section>
            <section class="pdf-disclaimer">
                <strong>Disclaimer:</strong> This AI-generated estimate is based on available data and model analysis. It is not an official appraisal, inspection, lending decision, or guarantee of market value. Consult a licensed professional before making financial decisions.
            </section>
        `;
        applyTheme(exportDocument, theme);
        return exportDocument;
    }

    function waitForImages(container) {
        const images = Array.from(container.querySelectorAll('img'));
        return Promise.all(images.map((image) => {
            if (image.complete && image.naturalWidth > 0) return Promise.resolve();
            return new Promise((resolve) => {
                image.onload = resolve;
                image.onerror = resolve;
            });
        }));
    }

    function buildFileName(address) {
        return `${address.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'valuation-report'}.pdf`;
    }

    async function download(options = {}) {
        const html2pdf = options.html2pdf || window.html2pdf;
        if (!html2pdf) throw new Error('html2pdf.js is required before using ValuatePdfGenerator.download().');

        const contentElement = options.contentElement || null;
        const reportHtml = normalizeReportHtml(
            options.reportHtml
                || contentElement?.innerHTML
                || markdownToHtml(options.reportMarkdown || '')
        );
        const contentText = options.contentText
            || contentElement?.textContent
            || reportHtml.replace(/<[^>]+>/g, ' ');
        if (!contentText.trim()) throw new Error('Report content is required.');

        const address = getReportAddress({ report: options.report, address: options.address });
        const logos = options.logos || await loadBrandAssets(options.assetPaths);
        const exportDocument = buildExportDocument({
            address,
            logos,
            reportHtml,
            summaryItems: options.summaryItems || buildSummaryItems({
                report: options.report,
                address,
                contentText,
                audience: options.audience
            }),
            theme: options.theme
        });

        if (document.fonts?.ready) await document.fonts.ready.catch(() => null);
        await waitForImages(exportDocument);

        const fileName = options.fileName || buildFileName(address);
        await html2pdf()
            .set({
                margin: 0,
                filename: fileName,
                image: { type: 'jpeg', quality: 0.98 },
                pagebreak: {
                    mode: ['css', 'legacy'],
                    avoid: [
                        '.pdf-logo-lockup',
                        '.pdf-summary-item',
                        '.pdf-report-header',
                        '.pdf-report-content h1',
                        '.pdf-report-content h2',
                        '.pdf-report-content h3',
                        '.pdf-report-content h4',
                        '.pdf-report-content p',
                        '.pdf-report-content li',
                        '.pdf-report-content blockquote',
                        '.pdf-report-content tr',
                        '.pdf-report-content thead'
                    ]
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    imageTimeout: 15000,
                    logging: false,
                    scrollY: 0
                },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true }
            })
            .from(exportDocument)
            .save();

        return { fileName, element: exportDocument };
    }

    window.ValuatePdfGenerator = {
        DEFAULT_BRAND_ASSETS,
        DEFAULT_THEME,
        buildExportDocument,
        buildFileName,
        buildSummaryItems,
        download,
        extractValuations,
        loadBrandAssets,
        markdownToHtml,
        normalizeReportHtml
    };
})();
