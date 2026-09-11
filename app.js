// Sync the visible instruction textarea with the hidden one required by the logic
const visibleInstructions = document.getElementById('visibleInstructions');
if (visibleInstructions) {
    visibleInstructions.addEventListener('input', function (e) {
        document.getElementById('specialInstructions').value = e.target.value;
    });
}

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

const PROMPT_TEMPLATE_LITE = `Overall Goal: Produce a concise, data-aware real estate valuation report for a single property. If web search is enabled, use it. If web search is disabled, do not claim you searched and clearly label assumptions.

Role: Senior real estate analyst and appraiser.

<subject_property>
{{PROPERTY_ADDRESS}}
{{PDF_NOTE}}
{{ADDITIONAL_DETAILS}}
</subject_property>

<report_audience>
Intended Audience: {{REPORT_AUDIENCE}}
</report_audience>

{{SPECIAL_INSTRUCTIONS}}

REQUIRED OUTPUT (concise):
1. Executive Summary (value range + point estimate)
2. Property Snapshot
3. Market Snapshot (brief)
4. Comparable Sales (3 comps; table)
5. Active/Pending Listings (2 listings; table)
6. Valuation Rationale
7. SWOT (brief)
8. Conclusion

Formatting: Markdown headings, bullets, and tables. Keep it concise (~700-900 words).`;

const PROMPT_TEMPLATE_EXPERIMENTAL = `
<system_role_and_objective>
You are an elite Chief Valuation Officer, Quantitative Market Data Scientist, and Master Real Estate Appraiser (MAI equivalent) with 25+ years of high-stakes valuation experience. Your objective is to generate an Institutional-Grade Comparative Market Analysis (CMA) and Valuation Report.

CORE DIRECTIVES (NON-NEGOTIABLE):
1. ZERO HALLUCINATION: You act as a ruthless, skeptical auditor. Do not invent addresses, dates, or prices. If data is unavailable, explicitly state "Insufficient data" rather than guessing.
2. SHOW YOUR MATH: You do not do "mental math." You must use explicit Chain-of-Thought reasoning to calculate every adjustment step-by-step.
3. OVERCOME SCRAPER BLOCKS: Real estate portals block AI. You must use advanced search operators (e.g., site:redfin.com, site:realtor.com, county tax records) and AVM triangulation to extract data from search snippets.
4. FACT VS. INFERENCE: Clearly separate verified public record data from your analytical assumptions.
</system_role_and_objective>

<intended_audience>
{{REPORT_AUDIENCE}}
*System Directive:* Tailor all framing, risk assessments, and final recommendations to serve the financial interests of this specific audience (e.g., Buyer = negotiation leverage/walk-away price; Seller = pricing strategy/DOM optimization; Investor = Cap rate, ARV, MAO, cash flow).
</intended_audience>

<input_data>
Address: {{PROPERTY_ADDRESS}}
Property Type: {{PROPERTY_TYPE}}
Condition/Updates: {{PROPERTY_CONDITION_AND_UPDATES}}
PDF Context/Tax Record: {{PDF_NOTE}}
Additional Details: {{ADDITIONAL_DETAILS}}

<user_provided_comps>
(If the user provides comps here, prioritize these over web-searched comps. If blank, proceed to Phase 1).
{{USER_COMPS}}
</user_provided_comps>
</input_data>

<execution_protocol>
Execute the following phases sequentially. Do not skip steps.

PHASE 1: SURGICAL WEB SEARCH & TRIANGULATION
1. Subject Verification: Search site:redfin.com OR site:realtor.com "[Address]" or county tax assessor records to establish baseline facts (Beds, Baths, SqFt, Lot, Year Built). Check AVMs (Zestimate, Redfin Estimate) as a baseline to critique, not rely upon.
2. Comparable Retrieval: Search site:redfin.com OR site:zillow.com "sold" "[Zip Code]" "last 6 months". Look at search engine snippets for sold prices and dates.
3. Market Pulse & Sentiment: Search "[City/Neighborhood] real estate market report [Current Month/Year]" for absorption rates. Search site:reddit.com/r/[City] "[Neighborhood]" for hidden value drags (e.g., bad HOAs, new developments).

PHASE 2: DATA VALIDATION & EDGE CASES
Select 3-5 Closed Sales (Comps). Constraints: < 6 months old, < 1 mile radius, +/- 20% Gross Living Area (GLA). 
*Edge Case Rules:*
- Rural: Expand radius to 5+ miles. Weight lot utility heavily.
- Condos: Restrict strictly to the same complex. Adjust for floor/view/HOA.
- Distressed/Fixer: Calculate ARV minus rehab costs ($50-$150/sqft) and investor profit.

PHASE 3: THE VALUATION WORKSPACE
You MUST open a <valuation_workspace> block before writing the report to show your math.
1. List raw comp data and source URLs.
2. Grade Subject and Comps using Fannie Mae UAD Standards: Condition (C1-New to C6-Severe Defect) and Quality (Q1-Custom to Q6-Basic).
3. Calculate the average Price Per Square Foot (PPSF) of the comps.
4. Calculate adjustments explicitly. *Rule: Adjust the COMP to the SUBJECT. (If Comp is superior, subtract value from Comp. If Comp is inferior, add value to Comp).*

PHASE 4: EXPLICIT ADJUSTMENT HEURISTICS
Apply these standard appraisal rules unless local data proves otherwise:
- GLA (SqFt): Do NOT adjust at 100% PPSF. Adjust at 30% to 50% of the average PPSF for the variance.
- Bathrooms: +/- $10,000 to $25,000 per full bath; +/- $5,000 to $10,000 per half bath (scale to market tier).
- Condition/Quality: +/- 2% to 10% of total value for major variances (e.g., C3 vs C4).
- Time/Market: Apply a monthly % adjustment if the market is rapidly shifting.
</execution_protocol>

<required_output_format>
Adhere strictly to this Markdown structure.

<valuation_workspace>
[THINKING PROCESS START]
1. SEARCH LOG: [Exact queries run and AVMs found]
2. RAW COMPS: [List 3-5 verified addresses, sold dates, prices, and URLs]
3. BASELINE MATH: [Calculate average neighborhood PPSF]
4. ADJUSTMENT CALCULUS: [Show step-by-step math for each comp based on Phase 4 heuristics]
[THINKING PROCESS END]
</valuation_workspace>

##Institutional-Grade Valuation Report: [Insert Property Address]
**Effective Date:** [Current Date] | **Audience Focus:** {{REPORT_AUDIENCE}}
**Data Confidence Score:** [1-100%] - *(Brief justification based on comp availability and scraper success)*

## 1. Executive Summary & Verdict
* **Most Probable Fair Market Value (FMV):** $XXX,XXX
* **Estimated Value Range:** $XXX,XXX - $XXX,XXX *(Tighten to max 5% spread)*
* **Liquidity & Absorption Rating:** [Fast (<15 Days) / Average (15-45 Days) / Slow (>45 Days)]
* **The "Elevator Pitch" Valuation:** A 2-sentence summary of the primary value driver (e.g., "Valuation anchored at $500k due to premium cul-de-sac lot, offsetting the $30k deferred maintenance in the kitchen").

## 2. Subject Property Anatomy & "Invisible Drivers"
* **Verified Facts:** [Beds] | [Baths] | [GLA SqFt] | [Lot Size] | [Year Built]
* **Assumed UAD Rating:** Condition [C1-C6] | Quality [Q1-Q6]
* **Data Discrepancies:** [Note any conflicts between User Input and Public Records/AVMs]
* **The "Alpha" Feature (Hook):** The single most marketable asset.
* **The "Friction" Point (Drag):** The biggest buyer objection or functional obsolescence.
* **Lateral Risk Factors:** (e.g., Flood zone status, flight paths, busy roads).

## 3. Macro & Micro Market Physics
*(Cite Sources/URLs for all data points)*
* **Micro-Neighborhood Trend:** [Appreciating/Stabilizing/Declining] at [X]% per month/year.
* **Months of Inventory (MOI):** [X Months] - [Buyer's/Seller's/Neutral Market]
* **Economic/Hyper-Local Catalysts:** [Specific local factors impacting this exact zip code right now].

## 4. Quantitative Sales Comparison (The Adjustment Grid)
*All adjustments derived from baseline heuristics in the Valuation Workspace.*

| Address | Sold Date | Unadjusted Price | GLA (SqFt) | Distance | Net Adjustments | **Adjusted Value** | Source URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [Comp 1] | [Date] | $[Price] | [SqFt] | [Miles] | [e.g., -$15k (Bath), +$5k (Lot)] | **$[Value]** | [Link] |
| [Comp 2] | [Date] | $[Price] | [SqFt] | [Miles] | [e.g., -$30k (Condition C3 vs C4)] | **$[Value]** | [Link] |
| [Comp 3] | [Date] | $[Price] | [SqFt] | [Miles] | [e.g., $0 (Model Match)] | **$[Value]** | [Link] |

**Comparable Reconciliation:**
* **Comp 1 (The Ceiling):** Why it sold for the highest, and how the Subject compares.
* **Comp 2 (The Floor):** Why it sold for the lowest, and how the Subject compares.
* **Comp 3 (The Anchor):** Why this is the most reliable baseline indicator.

## 5. Active Competition (Shadow Inventory)
Identify 1-2 active listings the subject will compete against.
* **Competitor A ([Address]):** List Price: $[Price] | DOM: [X] | *Why a buyer would choose the Subject over this.*
* **Competitor B ([Address]):** List Price: $[Price] | DOM: [X] | *Why a buyer would choose this over the Subject.*

## 6. Red Team Critique & SWOT Analysis
*Act as a hostile underwriter critiquing your own valuation.*
* **Strengths:** (Leverage points)
* **Weaknesses:** (Vulnerabilities)
* **Opportunities:** (Highest & Best Use optimization, e.g., ADU potential)
* **The Devil's Advocate:** "If this property appraises for $30,000 less than my estimate, it will be because..."

## 7. Final Action Plan for {{REPORT_AUDIENCE}}
* **Methodology Weighting:** Explain exactly how the FMV was derived from the Adjusted Values (e.g., "Gave 60% weight to Comp 3 due to lowest gross adjustment percentage and proximity").
* **Actionable Pricing Tiers:**
    * **Fire Sale / Liquidation (<15 Days):** $XXX,XXX
    * **Fair Market Value (Appraisal Target):** $XXX,XXX
    * **Aspirational / "Make Me Move" Price:** $XXX,XXX
* **Strategic Directives:** Provide 3 bullet points of strict, actionable advice tailored to the {{REPORT_AUDIENCE}}. *(If Investor: Include Max Allowable Offer (MAO), Cap Rate, and ARV. If Buyer: Offer strategy. If Seller: Concession/repair strategy).*

***
**CERTIFICATION & DISCLAIMER:** *This is an AI-generated econometric analysis utilizing automated web-scraping and algorithmic adjustment modeling. It is not an official appraisal report regulated by USPAP, nor does it replace a physical inspection by a licensed appraiser. Data reliability is strictly contingent upon the accuracy of public records and third-party MLS aggregators.*
</required_output_format>`;

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
const apiServiceSelect = document.getElementById('apiService');
const apiKeyLabel = document.getElementById('apiKeyLabel');
const apiKeyLink = document.getElementById('apiKeyLink');
const rememberApiKey = document.getElementById('rememberApiKey');
const reportModelSelect = document.getElementById('reportModelSelect');
const reportModelChevron = document.getElementById('reportModelChevron');
const reportModelHelpText = document.getElementById('reportModelHelpText');
const promptSelect = document.getElementById('promptSelect');
const reportCountSelect = document.getElementById('reportCount');
const showIndividualReports = false;
const pdfUploadStatus = document.getElementById('pdfUploadStatus');
const pdfUploadPill = document.getElementById('pdfUploadPill');
const pdfUploadName = document.getElementById('pdfUploadName');
const pdfUploadPreviews = document.getElementById('pdfUploadPreviews');
const propertyPdfInput = document.getElementById('propertyPdf');
const specialInstructions = document.getElementById('specialInstructions');
const attachmentState = {
    files: []
};
const historyToggle = document.getElementById('historyToggle');
const historyDrawer = document.getElementById('historyDrawer');
const historyOverlay = document.getElementById('historyOverlay');
const historyClose = document.getElementById('historyClose');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const historyRefresh = document.getElementById('historyRefresh');
const historyClear = document.getElementById('historyClear');
const historyCountBadge = document.getElementById('historyCountBadge');
const newValuationBtn = document.getElementById('newValuationBtn');
const settingsToggle = document.getElementById('settingsToggle');
const settingsModal = document.getElementById('settingsModal');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');
const enableSearchToggle = document.getElementById('enableSearch');
const budgetModeToggle = document.getElementById('budgetMode');

const DEFAULT_API_SERVICE = MetaAI.service;
const API_SERVICE_STORAGE = 'valuate:apiService';
const API_KEY_STORAGE = 'valuate:metaApiKey';
const MODEL_STORAGE = 'valuate:metaReportModel';
const COST_MODE_STORAGE = 'valuate:costMode';
const SEARCH_ENABLED_STORAGE = 'valuate:enableSearch';
const HISTORY_DB_NAME = 'valuate-history';
const HISTORY_STORE_NAME = 'reports';
const HISTORY_STORAGE_KEY = 'valuate:history';
const HISTORY_MAX_ITEMS = 50;
const JOBS_DB_NAME = 'valuate-jobs';
const JOBS_STORE_NAME = 'jobs';
let historyDbPromise = null;
let historyStorageMode = null;
let historyCache = [];
let jobsDbPromise = null;
let activeJobId = null;
let backgroundModeActive = false;
const renderedReportIndices = new Set();
const safeStorage = {
    get(key) {
        try {
            return window.localStorage?.getItem(key) ?? null;
        } catch (error) {
            return null;
        }
    },
    set(key, value) {
        try {
            window.localStorage?.setItem(key, value);
        } catch (error) {
            // Ignore storage failures (private mode, file://, etc.)
        }
    },
    remove(key) {
        try {
            window.localStorage?.removeItem(key);
        } catch (error) {
            // Ignore storage failures (private mode, file://, etc.)
        }
    }
};

// A saved provider/model cannot override the configured Meta model.
function normalizeApiService() {
    return DEFAULT_API_SERVICE;
}

function formatApiServiceLabel(service) {
    return ({ meta: 'Meta AI', gemini: 'Gemini', openai: 'OpenAI', openrouter: 'OpenRouter' })[service] || 'Meta AI';
}

function getApiKeyStorageKey() {
    return API_KEY_STORAGE;
}

function uniqueModelList(values, limit = 1) {
    const models = [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
    return limit > 0 ? models.slice(0, limit) : models;
}

function updateReportModelHelpText() {
    if (reportModelHelpText) reportModelHelpText.textContent = 'Muse Spark 1.3 Contributor is used for every report, validation, and final merge.';
}

function updateApiKeyUi(service, options = {}) {
    if (apiKeyLabel) apiKeyLabel.textContent = 'Meta AI API Key';
    if (apiKeyInput) apiKeyInput.placeholder = 'Enter your Meta AI API key';
    if (apiKeyLink) {
        apiKeyLink.href = 'https://dev.meta.ai/';
        apiKeyLink.innerHTML = 'Get Meta AI Key <i class="fas fa-external-link-alt ml-1"></i>';
    }
    if (options.hydrateValue === false) return;
    const storedKey = safeStorage.get(API_KEY_STORAGE) || '';
    if (apiKeyInput) apiKeyInput.value = storedKey;
    if (rememberApiKey) rememberApiKey.checked = Boolean(storedKey);
}

function persistApiKeyPreference(service, apiKey = '') {
    const key = String(apiKey || '').trim();
    if (rememberApiKey?.checked && key) safeStorage.set(API_KEY_STORAGE, key);
    else safeStorage.remove(API_KEY_STORAGE);
}

async function syncApiServiceUi(service, preferredModels = null, options = {}) {
    if (apiServiceSelect) apiServiceSelect.value = MetaAI.service;
    updateApiKeyUi(MetaAI.service, { hydrateValue: options.hydrateApiKey !== false });
    if (reportModelSelect) {
        reportModelSelect.multiple = false;
        reportModelSelect.size = 1;
        reportModelSelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = MetaAI.model;
        option.textContent = 'Muse Spark 1.3 Contributor';
        reportModelSelect.appendChild(option);
        reportModelSelect.value = MetaAI.model;
    }
    safeStorage.set(API_SERVICE_STORAGE, MetaAI.service);
    safeStorage.set(MODEL_STORAGE, MetaAI.model);
    updateReportModelHelpText();
    updateMaxModeAvailability();
}

syncApiServiceUi(MetaAI.service);

function isMaxModeAllowed() {
    return true;
}

function getMaxModeUnavailableMessage() {
    return 'MAX mode is unavailable.';
}

function updateMaxModeAvailability() {
    const maxOption = reportCountSelect?.querySelector('option[value="100"]');
    if (maxOption) {
        maxOption.disabled = false;
        maxOption.hidden = false;
    }
}

function getSelectedReportModels() {
    return [MetaAI.model];
}

function getReportModelForIndex() {
    return MetaAI.model;
}

function resolveFinalMergeApiKey(currentApiService, currentApiKey) {
    return String(currentApiKey || '').trim();
}

function resolveFinalMergeApiService() {
    return MetaAI.service;
}

function resolveFinalMergeModel() {
    return MetaAI.model;
}

let lastReportCountSelection = reportCountSelect?.value || '1';
let lastPromptSelection = promptSelect?.value || 'standard';

function applyBudgetModeUi(isEnabled) {
    if (reportCountSelect) {
        if (isEnabled) {
            if (reportCountSelect.value !== '1') {
                lastReportCountSelection = reportCountSelect.value;
            }
            reportCountSelect.value = '1';
            reportCountSelect.disabled = true;
        } else {
            reportCountSelect.disabled = false;
            if (lastReportCountSelection) {
                reportCountSelect.value = lastReportCountSelection;
            }
            updateMaxModeAvailability();
        }
    }
    if (promptSelect) {
        if (isEnabled) {
            if (promptSelect.value && promptSelect.value !== 'lite') {
                lastPromptSelection = promptSelect.value;
            }
            promptSelect.value = 'lite';
            promptSelect.disabled = true;
        } else {
            promptSelect.disabled = false;
            if (lastPromptSelection) {
                promptSelect.value = lastPromptSelection;
            }
        }
    }
}

if (!showIndividualReports) {
    if (reportStatusList) reportStatusList.classList.add('hidden');
    if (reportsContainer) reportsContainer.classList.add('hidden');
}

if (apiKeyInput) {
    apiKeyInput.addEventListener('input', () => {
        persistApiKeyPreference(MetaAI.service, apiKeyInput.value);
    });
}
if (rememberApiKey) {
    rememberApiKey.addEventListener('change', () => {
        persistApiKeyPreference(MetaAI.service, apiKeyInput?.value);
    });
}
updateMaxModeAvailability();

function setNewValuationVisibility(shouldShow) {
    if (!newValuationBtn) return;
    newValuationBtn.classList.toggle('hidden', !shouldShow);
}

function supportsBackgroundProcessing() {
    return 'serviceWorker' in navigator && 'SyncManager' in window;
}

async function sendJobToServiceWorker(job) {
    if (!('serviceWorker' in navigator)) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        let dispatched = false;
        if (registration.active) {
            registration.active.postMessage({ type: 'QUEUE_JOB', jobId: job.id });
            dispatched = true;
        }
        if ('sync' in registration) {
            try {
                await registration.sync.register('valuation-sync');
                dispatched = true;
            } catch (error) {
                // The worker may already be running. Never start a duplicate
                // foreground request when optional background sync is denied.
                console.warn('Background sync unavailable; using the active worker.', error);
            }
        }
        return dispatched;
    } catch (error) {
        console.warn('Background processing unavailable.', error);
        return false;
    }
}

async function handleJobUpdate(jobId) {
    const job = await getJob(jobId);
    if (!job) return;
    applyJobToUi(job);
}

function applyJobToUi(job) {
    if (!job) return;
    const reportCount = job.progress?.total || job.payload?.reportCount || 0;
    if (reportCount > 0 && (job.status === 'running' || job.status === 'queued')) {
        if (progressSection.classList.contains('hidden') || (showIndividualReports && reportStatusList.children.length === 0)) {
            prepareUiForRun(reportCount);
        }
    }
    totalReports = reportCount;
    completedCount = job.progress?.completed || 0;
    updateProgress();

    if (job.payload) {
        requestState.apiService = job.payload.apiService || requestState.apiService || DEFAULT_API_SERVICE;
        requestState.apiKey = job.payload.apiService === MetaAI.service ? (job.payload.apiKey || requestState.apiKey) : '';
        requestState.finalMergeApiKey = requestState.apiKey;
        const fallbackModel = job.payload.model || requestState.reportModel || requestState.finalModel;
        const payloadReportModels = uniqueModelList(job.payload.reportModels, 0);
        requestState.reportModel = job.payload.reportModel || payloadReportModels[0] || fallbackModel || '';
        requestState.reportModels = payloadReportModels.length > 0
            ? payloadReportModels
            : (requestState.reportModel ? [requestState.reportModel] : []);
        requestState.finalModel = job.payload.finalModel || resolveFinalMergeModel(requestState.apiService, requestState.reportModel);
        requestState.promptKey = job.payload.promptKey || requestState.promptKey;
        requestState.propertyAddress = job.payload.propertyAddress || '';
        requestState.additionalDetails = job.payload.additionalDetails || '';
        requestState.specialInstructions = job.payload.specialInstructions || '';
        requestState.reportAudience = job.payload.reportAudience || requestState.reportAudience;
        requestState.enableSearch = Boolean(job.payload.enableSearch);
        requestState.costMode = Boolean(job.payload.costMode);
        requestState.reportModelContextLength = job.payload.reportModelContextLength || job.payload.modelContextLength || null;
        requestState.reportModelContextLengths = job.payload.reportModelContextLengths || requestState.reportModelContextLengths || {};
        requestState.finalModelContextLength = null;
        syncApiServiceUi(requestState.apiService, {
            report: requestState.reportModel,
            reportModels: requestState.reportModels,
            final: requestState.finalModel
        });
        if (enableSearchToggle) {
            enableSearchToggle.checked = requestState.enableSearch;
        }
        if (budgetModeToggle) {
            budgetModeToggle.checked = requestState.costMode;
            applyBudgetModeUi(requestState.costMode);
        }
        if (promptSelect && !requestState.costMode) {
            promptSelect.value = requestState.promptKey || promptSelect.value;
        }
    }

    const reportsByIndex = Array.isArray(job.reports) ? job.reports : [];
    const runningIndices = Array.isArray(job.runningIndices) ? job.runningIndices : [];
    for (let i = 0; i < reportCount; i++) {
        const report = reportsByIndex[i];
        if (report?.success) {
            reports[i] = report;
            updateStatus(i, 'success', 'Completed');
            if (!renderedReportIndices.has(i)) {
                displayReport(i, report.content, report.searchSuggestions || []);
                renderedReportIndices.add(i);
            }
            continue;
        }
        if (report?.error) {
            reports[i] = report;
            updateStatus(i, 'error', `Error: ${report.error}`);
            continue;
        }
        if (job.status === 'running' && (job.runningIndex === i || runningIndices.includes(i))) {
            updateStatus(i, 'running', 'Generating...');
            continue;
        }
        updateStatus(i, 'pending', 'Queued');
    }

    if (job.status === 'running') {
        progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin text-brand-500"></i>Running in Background';
        if (job.phase === 'validating') {
            finalReportStatus.textContent = 'Validating comparable sales...';
        } else if (job.phase === 'merging') {
            finalReportStatus.textContent = 'Generating final merged report...';
        } else {
            finalReportStatus.textContent = 'Generating reports in the background. You can close this app.';
        }
        return;
    }

    if (job.status === 'completed' && job.finalReport?.content) {
        backgroundModeActive = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i><span>Generate Analysis</span>';
        if (newValuationBtn) {
            newValuationBtn.disabled = false;
        }
        progressTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>Analysis Complete';
        finalReportSection.classList.remove('hidden');
        finalReportContent.innerHTML = markdownToHtml(job.finalReport.content);
        finalReportStatus.textContent = '';
        requestState.finalValueRange = job.finalReport.valueRange || null;
        requestState.inferredAddress = job.finalReport.inferredAddress || '';
        updateDownloadButtonState(true);
        setNewValuationVisibility(true);
        refreshHistoryList();
        return;
    }

    if (job.status === 'error') {
        backgroundModeActive = false;
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-bolt"></i><span>Generate Analysis</span>';
        if (newValuationBtn) {
            newValuationBtn.disabled = false;
        }
        progressTitle.innerHTML = '<i class="fas fa-exclamation-circle text-red-500"></i>Analysis Failed';
        finalReportSection.classList.remove('hidden');
        finalReportStatus.textContent = job.error || 'Background processing failed.';
        updateDownloadButtonState(false);
        setNewValuationVisibility(true);
    }
}

async function resumeActiveJob() {
    const job = await findLatestActiveJob();
    if (!job) return;
    activeJobId = job.id;
    backgroundModeActive = true;
    renderedReportIndices.clear();
    prepareUiForRun(job.progress?.total || job.payload?.reportCount || 0);
    applyJobToUi(job);
}

function prepareUiForRun(reportCount) {
    reports = [];
    completedCount = 0;
    totalReports = reportCount;

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>Generating Reports...';
    if (newValuationBtn) {
        newValuationBtn.disabled = true;
    }
    setNewValuationVisibility(false);
    progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin text-brand-500"></i>Generating Reports...';
    progressSection.classList.remove('hidden');
    finalReportSection.classList.add('hidden');
    updateDownloadButtonState(false);
    finalReportStatus.textContent = 'Waiting for reports...';
    finalReportContent.innerHTML = '';
    reportsContainer.innerHTML = '';
    reportStatusList.innerHTML = '';

    if (showIndividualReports) {
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
    }

    updateProgress();
}

async function startBackgroundValuation(job) {
    backgroundModeActive = true;
    activeJobId = job.id;
    renderedReportIndices.clear();
    try {
        await saveJob(job);
        const sent = await sendJobToServiceWorker(job);
        if (!sent) {
            throw new Error('Background processing unavailable.');
        }
    } catch (error) {
        backgroundModeActive = false;
        activeJobId = null;
        throw error;
    }
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
    apiService: DEFAULT_API_SERVICE,
    apiKey: '',
    reportModel: '',
    reportModels: [],
    finalModel: MetaAI.model,
    finalMergeApiKey: '',
    promptKey: 'experimental',
    propertyAddress: '',
    additionalDetails: '',
    specialInstructions: '',
    reportAudience: 'seller',
    enableSearch: true,
    costMode: false,
    reportModelContextLength: null,
    reportModelContextLengths: {},
    finalModelContextLength: null,
    inferredAddress: '',
    finalValueRange: null
};

function getActiveFinalMergeApiService() {
    return resolveFinalMergeApiService(requestState.apiService);
}

function getActiveFinalMergeModel() {
    return MetaAI.model;
}

function getActiveFinalMergeApiKey() {
    return String(requestState.apiKey || apiKeyInput?.value || '').trim();
}

const storedSearchEnabled = safeStorage.get(SEARCH_ENABLED_STORAGE);
const storedCostMode = safeStorage.get(COST_MODE_STORAGE);
const initialSearchEnabled = storedSearchEnabled !== 'false';
const initialCostMode = storedCostMode === 'true';
if (enableSearchToggle) {
    enableSearchToggle.checked = initialSearchEnabled;
}
if (budgetModeToggle) {
    budgetModeToggle.checked = initialCostMode;
}
requestState.enableSearch = initialSearchEnabled;
requestState.costMode = initialCostMode;
applyBudgetModeUi(initialCostMode);

if (enableSearchToggle) {
    enableSearchToggle.addEventListener('change', () => {
        const enabled = enableSearchToggle.checked;
        safeStorage.set(SEARCH_ENABLED_STORAGE, enabled ? 'true' : 'false');
        requestState.enableSearch = enabled;
    });
}
if (budgetModeToggle) {
    budgetModeToggle.addEventListener('change', () => {
        const enabled = budgetModeToggle.checked;
        safeStorage.set(COST_MODE_STORAGE, enabled ? 'true' : 'false');
        requestState.costMode = enabled;
        applyBudgetModeUi(enabled);
    });
}

updateDownloadButtonState(false);
setNewValuationVisibility(false);
downloadPdfBtn.addEventListener('click', saveFinalReportAsPDF);
refreshHistoryList();
resumeActiveJob();

function resetValuationForm() {
    form?.reset();
    if (visibleInstructions) {
        visibleInstructions.value = '';
    }
    if (specialInstructions) {
        specialInstructions.value = '';
    }
    if (propertyPdfInput) {
        propertyPdfInput.value = '';
    }
    setAttachmentFiles([]);

    reports = [];
    completedCount = 0;
    totalReports = 0;
    updateProgress();

    if (progressSection) {
        progressSection.classList.add('hidden');
    }
    if (reportStatusList) {
        reportStatusList.innerHTML = '';
    }
    if (reportsContainer) {
        reportsContainer.innerHTML = '';
    }
    if (finalReportContent) {
        finalReportContent.innerHTML = '';
    }
    if (finalReportStatus) {
        finalReportStatus.textContent = '';
    }
    if (finalReportSection) {
        finalReportSection.classList.add('hidden');
    }

    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-bolt"></i><span>Generate Analysis</span>';
    if (newValuationBtn) {
        newValuationBtn.disabled = false;
    }
    setNewValuationVisibility(false);
    updateDownloadButtonState(false);

    requestState.propertyAddress = '';
    requestState.additionalDetails = '';
    requestState.specialInstructions = '';
    requestState.inferredAddress = '';
    requestState.finalValueRange = null;
    requestState.reportModels = [];
    requestState.reportModelContextLengths = {};
    activeJobId = null;
    backgroundModeActive = false;
    renderedReportIndices.clear();
}

if (settingsToggle) {
    settingsToggle.addEventListener('click', () => {
        openSettingsModal();
    });
}
if (settingsOverlay) {
    settingsOverlay.addEventListener('click', closeSettingsModal);
}
if (settingsClose) {
    settingsClose.addEventListener('click', closeSettingsModal);
}
if (historyToggle) {
    historyToggle.addEventListener('click', () => {
        refreshHistoryList();
        openHistoryDrawer();
    });
}
if (historyOverlay) {
    historyOverlay.addEventListener('click', closeHistoryDrawer);
}
if (historyClose) {
    historyClose.addEventListener('click', closeHistoryDrawer);
}
if (historyRefresh) {
    historyRefresh.addEventListener('click', refreshHistoryList);
}
if (historyClear) {
    historyClear.addEventListener('click', async () => {
        const confirmed = confirm('Clear all saved valuations? This cannot be undone.');
        if (!confirmed) return;
        await clearHistoryReports();
        await refreshHistoryList();
    });
}
if (newValuationBtn) {
    newValuationBtn.addEventListener('click', () => {
        const confirmed = confirm('Start a new valuation? This clears the current form and results but keeps saved reports.');
        if (!confirmed) return;
        resetValuationForm();
        form?.scrollIntoView({ behavior: 'smooth' });
    });
}
if (historyList) {
    historyList.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.getAttribute('data-action');
        const id = button.getAttribute('data-id');
        if (!id) return;
        if (action === 'view') {
            loadHistoryReport(id);
            return;
        }
        if (action === 'delete') {
            const confirmed = confirm('Delete this saved valuation?');
            if (!confirmed) return;
            await deleteHistoryReport(id);
            await refreshHistoryList();
        }
    });
}
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettingsModal();
        return;
    }
    if (event.key === 'Escape' && historyDrawer && !historyDrawer.classList.contains('hidden')) {
        closeHistoryDrawer();
    }
});

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const apiKey = document.getElementById('apiKey').value.trim();
    const apiService = normalizeApiService(apiServiceSelect?.value);
    const reportModels = getSelectedReportModels(apiService);
    const reportModel = reportModels[0] || '';
    const finalModel = resolveFinalMergeModel(apiService, reportModel);
    const finalMergeApiKey = resolveFinalMergeApiKey(apiService, apiKey);
    const costMode = Boolean(budgetModeToggle?.checked);
    const promptKey = costMode
        ? 'lite'
        : (promptSelect?.value || 'standard');
    const propertyAddress = document.getElementById('propertyAddress').value.trim();
    const propertyFiles = attachmentState.files.length > 0
        ? attachmentState.files.map((entry) => entry.file)
        : Array.from(document.getElementById('propertyPdf').files || []);
    const additionalDetails = document.getElementById('additionalDetails').value.trim();
    const specialInstructions = document.getElementById('specialInstructions').value.trim();
    const reportAudience = document.getElementById('reportAudience').value;
    const reportCount = parseInt(document.getElementById('reportCount').value);
    const effectiveReportCount = costMode ? 1 : reportCount;
    const enableSearch = enableSearchToggle ? enableSearchToggle.checked : true;

    if (!apiKey || (!propertyAddress && propertyFiles.length === 0)) {
        alert('Please provide an API key and either a property address or attachments.');
        return;
    }

    if (!reportModel) {
        alert('Please select a reports model.');
        return;
    }

    if (effectiveReportCount === 100 && !isMaxModeAllowed(reportModel, apiService)) {
        alert(getMaxModeUnavailableMessage(apiService));
        return;
    }

    if (rememberApiKey.checked) {
        safeStorage.set(getApiKeyStorageKey(apiService), apiKey);
    } else {
        safeStorage.remove(getApiKeyStorageKey(apiService));
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

    const reportModelContextLengths = {};
    const reportModelContextLength = null;
    const finalModelContextLength = null;
    requestState.reportModelContextLength = reportModelContextLength;
    requestState.reportModelContextLengths = reportModelContextLengths;
    requestState.finalModelContextLength = finalModelContextLength;

    requestState.apiKey = apiKey;
    requestState.finalMergeApiKey = finalMergeApiKey;
    requestState.apiService = apiService;
    requestState.reportModel = reportModel;
    requestState.reportModels = reportModels;
    requestState.finalModel = finalModel;
    requestState.promptKey = promptKey;
    requestState.propertyAddress = propertyAddress;
    requestState.additionalDetails = additionalDetails;
    requestState.specialInstructions = specialInstructions;
    requestState.reportAudience = reportAudience;
    requestState.enableSearch = enableSearch;
    requestState.costMode = costMode;
    requestState.finalValueRange = null;


    prepareUiForRun(effectiveReportCount);
    progressSection.scrollIntoView({ behavior: 'smooth' });
    await ensureNotificationPermission();

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
        : (promptKey === 'lite' ? PROMPT_TEMPLATE_LITE : PROMPT_TEMPLATE);
    let prompt = selectedTemplate
        .replace('{{PROPERTY_ADDRESS}}', propertyAddress || 'Address not provided (see attached PDF).')
        .replace('{{ADDITIONAL_DETAILS}}', detailsBlock)
        .replace('{{SPECIAL_INSTRUCTIONS}}', instructionsBlock)
        .replace('{{PDF_NOTE}}', attachmentNote)
        .replace('{{REPORT_AUDIENCE}}', reportAudience);
    const searchNote = enableSearch
        ? ''
        : '\n\nIMPORTANT: Web search tools are disabled. Do not claim to have searched; base the analysis on provided details and clearly label assumptions.';
    const costNote = costMode
        ? '\n\nIMPORTANT: Budget mode is enabled. Keep the report concise and avoid unnecessary verbosity.'
        : '';
    prompt += `${searchNote}${costNote}`;

    const shouldBackground = supportsBackgroundProcessing();
    if (shouldBackground) {
        const job = {
            id: generateJobId(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'queued',
            phase: 'reports',
            runningIndex: null,
            progress: {
                total: effectiveReportCount,
                completed: 0
            },
            error: null,
            payload: {
                apiService,
                apiKey,
                finalMergeApiKey,
                model: reportModel,
                reportModels,
                reportModelContextLengths,
                modelContextLength: reportModelContextLength,
                reportModel,
                finalModel,
                reportModelContextLength,
                finalModelContextLength,
                promptKey,
                prompt,
                enableSearch,
                costMode,
                reportCount: effectiveReportCount,
                reportAudience,
                propertyAddress,
                additionalDetails,
                specialInstructions,
                attachments: attachmentPayloads
            },
            reports: [],
            finalReport: null
        };

        try {
            finalReportStatus.textContent = 'Generating reports in the background. You can close this app.';
            progressTitle.innerHTML = '<i class="fas fa-spinner fa-spin text-brand-500"></i>Running in Background';
            await startBackgroundValuation(job);
            return;
        } catch (error) {
            console.warn('Background processing failed; continuing in foreground.', error);
            finalReportStatus.textContent = 'Background processing unavailable. Keep this tab open while we generate your report.';
        }
    }

    const MAX_REPORT_RETRIES = 2;
    const RETRY_DELAY_MS = 1500;

    // Generate reports with retry support and service-specific concurrency limits
    const generateReportWithRetry = async (index) => {
        let attempt = 0;
        let lastError = null;

        while (attempt <= MAX_REPORT_RETRIES) {
            const attemptLabel = attempt === 0
                ? 'Generating...'
                : `Retrying (${attempt} of ${MAX_REPORT_RETRIES})...`;
            updateStatus(index, 'running', attemptLabel);
            const activeReportModel = getReportModelForIndex(reportModels, index) || reportModel;
            const activeReportModelContextLength = reportModelContextLengths[activeReportModel] ?? reportModelContextLength ?? null;

            try {
                const result = await callModelAPI(
                    apiService,
                    apiKey,
                    activeReportModel,
                    prompt,
                    enableSearch,
                    index,
                    attachmentPayloads,
                    [],
                    { modelContextLength: activeReportModelContextLength, costMode, promptKey }
                );
                reports[index] = {
                    index: index,
                    model: activeReportModel,
                    success: true,
                    content: result.content,
                    searchSuggestions: result.searchSuggestions || [],
                    valuations: extractValuations(result.content)
                };
                updateStatus(index, 'success', 'Completed');
                displayReport(index, result.content, result.searchSuggestions);
                completedCount++;
                updateProgress();
                return reports[index];
            } catch (error) {
                lastError = error;
                if (error.retryable !== false && attempt < MAX_REPORT_RETRIES) {
                    await sleepMs(RETRY_DELAY_MS);
                    attempt++;
                    continue;
                }
                break;
            }
        }

        reports[index] = {
            index: index,
            success: false,
            error: lastError?.message || 'Unknown error'
        };
        updateStatus(index, 'error', `Error: ${reports[index].error}`);
        completedCount++;
        updateProgress();
        return reports[index];
    };

    const reportIndices = [...Array(effectiveReportCount).keys()];
    const reportConcurrency = getReportGenerationConcurrency(apiService, effectiveReportCount);
    runWithConcurrencyLimit(reportIndices, reportConcurrency, generateReportWithRetry).then(() => finalize());
});

function sleepMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getReportGenerationConcurrency(apiService, reportCount) {
    return Math.min(3, Math.max(1, Number(reportCount) || 1));
}

async function runWithConcurrencyLimit(items, concurrency, worker) {
    const normalizedItems = Array.isArray(items) ? items : [];
    const limit = Math.max(1, Number(concurrency) || 1);
    if (limit === 1) {
        const results = [];
        for (const item of normalizedItems) {
            results.push(await worker(item));
        }
        return results;
    }

    const results = new Array(normalizedItems.length);
    let nextIndex = 0;

    const runWorker = async () => {
        while (nextIndex < normalizedItems.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await worker(normalizedItems[currentIndex], currentIndex);
        }
    };

    const workers = Array.from(
        { length: Math.min(limit, normalizedItems.length) },
        () => runWorker()
    );
    await Promise.all(workers);
    return results;
}

async function callModelAPI(apiService, apiKey, model, prompt, enableSearch, index, attachments = [], extraTools = [], options = {}) {
    if (apiService !== MetaAI.service) throw new Error('Start a new valuation with your Meta AI API key.');
    return MetaAI.generate(apiKey, prompt, enableSearch, attachments, {
        costMode: requestState.costMode,
        promptKey: requestState.promptKey,
        ...options
    });
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.onload = () => {
            const base64Data = arrayBufferToBase64(reader.result);
            resolve({
                mimeType: file.type || 'application/pdf',
                data: base64Data,
                name: file.name || 'attachment'
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

async function inferValueRangeFromReport(reportText) {
    if (requestState.costMode) {
        return null;
    }
    const cleanedText = (reportText || '').replace(/\s+/g, ' ').trim();
    const finalMergeApiService = getActiveFinalMergeApiService();
    const finalMergeModel = getActiveFinalMergeModel();
    const finalMergeApiKey = getActiveFinalMergeApiKey();
    if (!cleanedText || !finalMergeApiKey) {
        return null;
    }

    const prompt = `You are a valuation range extraction assistant.
Read the report and return ONLY a JSON object with numeric rangeLow and rangeHigh values.
Use whole numbers without commas or currency symbols.
If no clear value range is present, return "UNKNOWN".

Report:
${cleanedText}`;

    const result = await callModelAPI(
        finalMergeApiService,
        finalMergeApiKey,
        finalMergeModel,
        prompt,
        false,
        0,
        [],
        [],
        {
            promptKey: requestState.promptKey
        }
    );

    const responseText = (result?.content || '').trim();
    if (!responseText || /unknown/i.test(responseText)) {
        return null;
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let parsed = null;
    if (jsonMatch) {
        try {
            parsed = JSON.parse(jsonMatch[0]);
        } catch (error) {
            parsed = null;
        }
    }

    const parseNumber = (value) => {
        if (value === null || value === undefined) return null;
        const numeric = parseFloat(String(value).replace(/,/g, ''));
        return Number.isFinite(numeric) ? numeric : null;
    };

    const rangeLow = parseNumber(parsed?.rangeLow ?? parsed?.low ?? parsed?.min);
    const rangeHigh = parseNumber(parsed?.rangeHigh ?? parsed?.high ?? parsed?.max);

    if (!rangeLow || !rangeHigh) {
        return null;
    }

    return rangeLow <= rangeHigh
        ? { rangeLow, rangeHigh }
        : { rangeLow: rangeHigh, rangeHigh: rangeLow };
}

async function inferAddressFromFinalReport(reportText) {
    if (requestState.costMode) {
        return null;
    }
    const cleanedText = (reportText || '').replace(/\s+/g, ' ').trim();
    const finalMergeApiService = getActiveFinalMergeApiService();
    const finalMergeModel = getActiveFinalMergeModel();
    const finalMergeApiKey = getActiveFinalMergeApiKey();
    if (!cleanedText || !finalMergeApiKey) {
        return null;
    }

    const prompt = `You are an address extraction assistant.
Return ONLY the full subject property address (street, city, state, ZIP) from the report text.
Choose the subject property, not comparable listings. If no clear subject address is present, return "UNKNOWN".

Report Text:
${cleanedText}`;

    const result = await callModelAPI(
        finalMergeApiService,
        finalMergeApiKey,
        finalMergeModel,
        prompt,
        false,
        0,
        [],
        [],
        {
            promptKey: requestState.promptKey
        }
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
    if (!showIndividualReports) return;
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
    if (!showIndividualReports) return;
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
    if (newValuationBtn) {
        newValuationBtn.disabled = false;
    }
    progressTitle.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>Analysis Complete';
    updateDownloadButtonState(false);

    const successfulReports = reports.filter(r => r && r.success);
    if (successfulReports.length === 0) {
        const firstError = reports.find((report) => report?.error)?.error;
        finalReportSection.classList.remove('hidden');
        finalReportStatus.textContent = firstError || 'No successful reports to merge.';
        updateDownloadButtonState(false);
        setNewValuationVisibility(true);
        return;
    }

    if (requestState.costMode && successfulReports.length === 1) {
        const report = successfulReports[0];
        finalReportSection.classList.remove('hidden');
        finalReportStatus.textContent = 'Budget mode: using the single report directly (validation and synthesis skipped).';
        finalReportContent.innerHTML = markdownToHtml(report.content);
        updateDownloadButtonState(true);
        requestState.finalValueRange = null;
        persistFinalReport(report.content, null, { allowModelInference: false });
        setNewValuationVisibility(true);
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
    const finalMergeApiService = getActiveFinalMergeApiService();
    const finalMergeModel = getActiveFinalMergeModel();
    const finalMergeApiKey = getActiveFinalMergeApiKey();

    let validatedCompsContent = requestState.costMode
        ? 'Validation skipped (budget mode).'
        : 'Validation step unavailable.';
    if (!requestState.costMode) {
        try {
            validatedCompsContent = await validateCompsAndListings(
                finalMergeApiService,
                finalMergeApiKey,
                finalMergeModel,
                reportsText
            );
        } catch (error) {
            validatedCompsContent = `Validation step failed: ${error.message}. Proceed with caution and note that comps were not independently verified.`;
        }
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
        const extraTools = [];
        const result = await callModelAPI(
            finalMergeApiService,
            finalMergeApiKey,
            finalMergeModel,
            FINAL_REPORT_TEMPLATE,
            false,
            0,
            [],
            extraTools,
            {
                costMode: requestState.costMode,
                promptKey: requestState.promptKey
            }
        );
        finalReportStatus.textContent = requestState.costMode ? 'Finalizing report...' : 'Extracting value range...';
        finalReportContent.innerHTML = markdownToHtml(result.content);
        updateDownloadButtonState(true);
        if (!requestState.costMode) {
            try {
                requestState.finalValueRange = await inferValueRangeFromReport(result.content);
            } catch (error) {
                requestState.finalValueRange = null;
                console.warn('Failed to infer value range from final report:', error);
            }
        } else {
            requestState.finalValueRange = null;
        }
        finalReportStatus.textContent = ''; // Clear status on success
        await persistFinalReport(result.content, requestState.finalValueRange);
        if (!backgroundModeActive) {
            const addressLabel = requestState.propertyAddress?.trim() || requestState.inferredAddress?.trim() || 'Your valuation';
            notifyReportReady('Valuation ready', `Your report for ${addressLabel} is ready.`);
        }
        setNewValuationVisibility(true);
    } catch (error) {
        finalReportStatus.textContent = `Final report failed: ${error.message}`;
        updateDownloadButtonState(false);
        setNewValuationVisibility(true);
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
    printContainer.querySelectorAll('a').forEach((link) => {
        const textNode = document.createTextNode(link.textContent || '');
        link.replaceWith(textNode);
    });

    const reportAddress = await resolveReportAddress();

    const addressNode = document.createElement('div');
    addressNode.textContent = reportAddress;
    const safeAddress = addressNode.innerHTML;
    const extractedValuations = extractValuations(printContainer.textContent || '');
    const valuations = mergeValueRange(extractedValuations, requestState.finalValueRange);

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
    wrapper.querySelectorAll('table').forEach((table) => {
        const scrollWrapper = document.createElement('div');
        scrollWrapper.className = 'table-scroll';
        table.parentNode.insertBefore(scrollWrapper, table);
        scrollWrapper.appendChild(table);
    });

    return wrapper.innerHTML;
}

function generateHistoryId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateJobId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `job-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHistoryModel(model) {
    if (!model) return 'Unknown model';
    return model.replace(/^models\//i, '');
}

function formatHistoryAudience(audience) {
    if (!audience) return 'Audience unknown';
    return audience.charAt(0).toUpperCase() + audience.slice(1);
}

function formatHistoryDate(timestamp) {
    if (!timestamp) return 'Date unknown';
    return new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function buildHistoryMeta(report) {
    const parts = [];
    parts.push(formatHistoryDate(report.createdAt));
    if (report.audience) {
        parts.push(formatHistoryAudience(report.audience));
    }
    if (report.apiService) {
        parts.push(formatApiServiceLabel(report.apiService));
    }
    const reportModel = report.reportModel || report.model || '';
    const finalModel = report.finalModel || report.model || '';
    if (reportModel) {
        if (finalModel && finalModel !== reportModel) {
            parts.push(`${normalizeHistoryModel(reportModel)} → ${normalizeHistoryModel(finalModel)}`);
        } else {
            parts.push(normalizeHistoryModel(reportModel));
        }
    }
    if (report.valuations?.rangeLow && report.valuations?.rangeHigh) {
        parts.push(`${formatCurrency(report.valuations.rangeLow)} - ${formatCurrency(report.valuations.rangeHigh)}`);
    } else if (report.valuations?.pointEstimate) {
        parts.push(formatCurrency(report.valuations.pointEstimate));
    }
    return parts.join(' • ');
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function supportsIndexedDb() {
    return typeof indexedDB !== 'undefined';
}

function openHistoryDb() {
    if (historyDbPromise) return historyDbPromise;
    historyDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(HISTORY_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                const store = db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return historyDbPromise;
}

function openJobsDb() {
    if (jobsDbPromise) return jobsDbPromise;
    jobsDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(JOBS_DB_NAME, 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(JOBS_STORE_NAME)) {
                const store = db.createObjectStore(JOBS_STORE_NAME, { keyPath: 'id' });
                store.createIndex('status', 'status');
                store.createIndex('updatedAt', 'updatedAt');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return jobsDbPromise;
}

async function saveJob(job) {
    if (!supportsIndexedDb()) return;
    const db = await openJobsDb();
    await new Promise((resolve, reject) => {
        const tx = db.transaction(JOBS_STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(JOBS_STORE_NAME).put(job);
    });
}

async function getJob(jobId) {
    if (!supportsIndexedDb()) return null;
    const db = await openJobsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
        const request = tx.objectStore(JOBS_STORE_NAME).get(jobId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function listJobs() {
    if (!supportsIndexedDb()) return [];
    const db = await openJobsDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(JOBS_STORE_NAME, 'readonly');
        const request = tx.objectStore(JOBS_STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function findLatestActiveJob() {
    const jobs = await listJobs();
    const active = jobs
        .filter((job) => job && (job.status === 'queued' || job.status === 'running'))
        .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
    return active[0] || null;
}

async function ensureNotificationPermission() {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
        const result = Notification.requestPermission();
        if (result && typeof result.then === 'function') {
            return (await result) === 'granted';
        }
        return result === 'granted';
    } catch (error) {
        return false;
    }
}

async function notifyReportReady(title, body) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification(title, {
                body,
                icon: './icons/icon-192.png',
                badge: './icons/icon-192-maskable.png',
                tag: 'valuation-ready',
                renotify: true
            });
            return;
        }
        new Notification(title, { body });
    } catch (error) {
        // Ignore notification errors
    }
}

async function ensureHistoryStorageMode() {
    if (historyStorageMode) return historyStorageMode;
    if (!supportsIndexedDb()) {
        historyStorageMode = 'local';
        return historyStorageMode;
    }
    try {
        await openHistoryDb();
        historyStorageMode = 'indexeddb';
    } catch (error) {
        console.warn('IndexedDB unavailable, falling back to localStorage.', error);
        historyStorageMode = 'local';
    }
    return historyStorageMode;
}

function loadHistoryFromLocal() {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Failed to parse saved history.', error);
        return [];
    }
}

function saveHistoryToLocal(reports) {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(reports));
}

async function listHistoryReports() {
    const mode = await ensureHistoryStorageMode();
    let reports = [];
    if (mode === 'indexeddb') {
        const db = await openHistoryDb();
        reports = await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readonly');
            const store = tx.objectStore(HISTORY_STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } else {
        reports = loadHistoryFromLocal();
    }
    return reports.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function saveHistoryReport(report) {
    const mode = await ensureHistoryStorageMode();
    if (mode === 'indexeddb') {
        const db = await openHistoryDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(HISTORY_STORE_NAME).put(report);
        });
    } else {
        const reports = loadHistoryFromLocal();
        reports.push(report);
        saveHistoryToLocal(reports);
    }
}

async function deleteHistoryReport(id) {
    const mode = await ensureHistoryStorageMode();
    if (mode === 'indexeddb') {
        const db = await openHistoryDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(HISTORY_STORE_NAME).delete(id);
        });
    } else {
        const reports = loadHistoryFromLocal().filter((item) => item.id !== id);
        saveHistoryToLocal(reports);
    }
}

async function clearHistoryReports() {
    const mode = await ensureHistoryStorageMode();
    if (mode === 'indexeddb') {
        const db = await openHistoryDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(HISTORY_STORE_NAME, 'readwrite');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.objectStore(HISTORY_STORE_NAME).clear();
        });
    } else {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
}

async function pruneHistoryIfNeeded() {
    const reports = await listHistoryReports();
    if (reports.length <= HISTORY_MAX_ITEMS) return;
    const toDelete = reports.slice(HISTORY_MAX_ITEMS);
    await Promise.all(toDelete.map((report) => deleteHistoryReport(report.id)));
}

function updateHistoryBadge(count) {
    if (!historyCountBadge) return;
    if (count > 0) {
        historyCountBadge.textContent = count > 99 ? '99+' : String(count);
        historyCountBadge.classList.remove('hidden');
    } else {
        historyCountBadge.classList.add('hidden');
    }
}

function renderHistoryList(reports) {
    if (!historyList || !historyEmpty) return;
    historyList.innerHTML = '';
    if (!reports || reports.length === 0) {
        historyEmpty.classList.remove('hidden');
        return;
    }
    historyEmpty.classList.add('hidden');
    reports.forEach((report) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const title = escapeHtml(report.address || 'Address not provided');
        const promptLabel = report.promptKey === 'experimental' ? 'Bank-Grade CMA' : 'Standard';
        const metaText = buildHistoryMeta(report);
        item.innerHTML = `
                    <div class="history-item-header">
                        <div class="history-item-title">${title}</div>
                    </div>
                    <div class="history-item-meta">${metaText}</div>
                    <div class="history-item-tags">
                        <span class="history-tag">${promptLabel}</span>
                        ${report.enableSearch ? '<span class="history-tag">Grounded</span>' : ''}
                    </div>
                    <div class="history-item-actions">
                        <button class="history-view" type="button" data-action="view" data-id="${report.id}">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="history-delete" type="button" data-action="delete" data-id="${report.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                `;
        historyList.appendChild(item);
    });
}

async function refreshHistoryList() {
    try {
        const reports = await listHistoryReports();
        historyCache = reports;
        renderHistoryList(reports);
        updateHistoryBadge(reports.length);
    } catch (error) {
        console.warn('Failed to load saved valuations.', error);
    }
}

let scrollLockY = 0;
let settingsLastFocus = null;
let historyLastFocus = null;

function lockScroll() {
    if (document.body.classList.contains('menu-open')) return;
    scrollLockY = window.scrollY || window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollLockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.classList.add('menu-open');
    document.documentElement.classList.add('menu-open');
}

function unlockScroll() {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    document.documentElement.classList.remove('menu-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, scrollLockY);
}

function updateScrollLock() {
    const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
    const historyOpen = historyDrawer && !historyDrawer.classList.contains('hidden');
    if (settingsOpen || historyOpen) {
        lockScroll();
    } else {
        unlockScroll();
    }
}

function openSettingsModal() {
    if (!settingsModal) return;
    settingsLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    settingsModal.classList.remove('hidden');
    settingsModal.setAttribute('aria-hidden', 'false');
    if (settingsToggle) {
        settingsToggle.setAttribute('aria-expanded', 'true');
    }
    requestAnimationFrame(() => {
        settingsModal.classList.add('is-open');
    });
    updateScrollLock();
    if (settingsClose) {
        settingsClose.focus();
    }

}

function closeSettingsModal() {
    if (!settingsModal) return;
    settingsModal.classList.remove('is-open');
    settingsModal.setAttribute('aria-hidden', 'true');
    if (settingsToggle) {
        settingsToggle.setAttribute('aria-expanded', 'false');
    }
    setTimeout(() => {
        if (!settingsModal.classList.contains('is-open')) {
            settingsModal.classList.add('hidden');
            updateScrollLock();
            const historyOpen = historyDrawer && !historyDrawer.classList.contains('hidden');
            if (settingsLastFocus && !historyOpen) {
                settingsLastFocus.focus();
            }
        }
    }, 250);
}

function openHistoryDrawer() {
    if (!historyDrawer) return;
    historyLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    historyDrawer.classList.remove('hidden');
    historyDrawer.setAttribute('aria-hidden', 'false');
    if (historyToggle) {
        historyToggle.setAttribute('aria-expanded', 'true');
    }
    requestAnimationFrame(() => {
        historyDrawer.classList.add('is-open');
    });
    updateScrollLock();
    if (historyClose) {
        historyClose.focus();
    }
}

function closeHistoryDrawer() {
    if (!historyDrawer) return;
    historyDrawer.classList.remove('is-open');
    historyDrawer.setAttribute('aria-hidden', 'true');
    if (historyToggle) {
        historyToggle.setAttribute('aria-expanded', 'false');
    }
    setTimeout(() => {
        if (!historyDrawer.classList.contains('is-open')) {
            historyDrawer.classList.add('hidden');
            updateScrollLock();
            const settingsOpen = settingsModal && !settingsModal.classList.contains('hidden');
            if (historyLastFocus && !settingsOpen) {
                historyLastFocus.focus();
            }
        }
    }, 300);
}

function loadHistoryReport(id) {
    const report = historyCache.find((item) => item.id === id);
    if (!report) return;
    finalReportSection.classList.remove('hidden');
    finalReportStatus.textContent = 'Loaded saved valuation.';
    finalReportContent.innerHTML = markdownToHtml(report.content || '');
    updateDownloadButtonState(true);
    if (newValuationBtn) {
        newValuationBtn.disabled = false;
    }
    setNewValuationVisibility(true);
    requestState.propertyAddress = report.address || '';
    requestState.inferredAddress = report.address || '';
    requestState.apiService = report.apiService || requestState.apiService || DEFAULT_API_SERVICE;
    const historyReportModel = report.reportModel || report.model || '';
    const historyReportModels = uniqueModelList(report.reportModels || [], 0);
    if (historyReportModel) {
        requestState.reportModel = historyReportModel;
    }
    requestState.reportModels = historyReportModels.length > 0
        ? historyReportModels
        : (historyReportModel ? [historyReportModel] : []);
    if (!historyReportModel && requestState.reportModels.length > 0) {
        requestState.reportModel = requestState.reportModels[0];
    }
    requestState.finalModel = report.finalModel || resolveFinalMergeModel(requestState.apiService, requestState.reportModel);
    syncApiServiceUi(requestState.apiService, {
        report: historyReportModel,
        reportModels: requestState.reportModels,
        final: requestState.finalModel
    }, { hydrateApiKey: false });
    if (report.valuations?.rangeLow && report.valuations?.rangeHigh) {
        requestState.finalValueRange = {
            rangeLow: report.valuations.rangeLow,
            rangeHigh: report.valuations.rangeHigh
        };
    } else {
        requestState.finalValueRange = null;
    }
    closeHistoryDrawer();
    finalReportSection.scrollIntoView({ behavior: 'smooth' });
}

async function persistFinalReport(markdownContent, valueRangeOverride = null, options = {}) {
    const extractedValuations = extractValuations(markdownContent || '');
    const mergedValuations = mergeValueRange(extractedValuations, valueRangeOverride);
    const allowModelInference = options.allowModelInference ?? !requestState.costMode;
    let resolvedAddress = requestState.propertyAddress?.trim() || requestState.inferredAddress?.trim() || '';
    if (!resolvedAddress) {
        if (allowModelInference) {
            try {
                const inferred = await inferAddressFromFinalReport(markdownContent || '');
                if (inferred) {
                    requestState.inferredAddress = inferred;
                    resolvedAddress = inferred;
                }
            } catch (error) {
                console.warn('Failed to infer address for history record:', error);
            }
        }
    }
    const record = {
        id: generateHistoryId(),
        createdAt: Date.now(),
        address: resolvedAddress || 'Address not provided',
        audience: requestState.reportAudience || '',
        apiService: requestState.apiService || DEFAULT_API_SERVICE,
        model: requestState.reportModel || requestState.finalModel || '',
        reportModel: requestState.reportModel || '',
        reportModels: Array.isArray(requestState.reportModels) ? requestState.reportModels : [],
        finalModel: requestState.finalModel || requestState.reportModel || '',
        promptKey: requestState.promptKey || 'standard',
        reportCount: totalReports || null,
        enableSearch: Boolean(requestState.enableSearch),
        valuations: mergedValuations,
        content: markdownContent || ''
    };

    try {
        await saveHistoryReport(record);
        await pruneHistoryIfNeeded();
        await refreshHistoryList();
    } catch (error) {
        console.warn('Failed to save valuation history.', error);
    }
}

// Make toggleAccordion available globally
window.toggleAccordion = toggleAccordion;

// PWA service worker registration (GitHub Pages friendly)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js', { scope: './' })
            .catch((error) => {
                console.warn('Service worker registration failed:', error);
            });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data || {};
        if (!data.jobId) return;
        if (!activeJobId) {
            activeJobId = data.jobId;
            backgroundModeActive = true;
            renderedReportIndices.clear();
        }
        if (data.jobId !== activeJobId) return;
        handleJobUpdate(data.jobId);
    });
}

async function validateCompsAndListings(apiService, apiKey, model, reportsText) {
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

    const result = await callModelAPI(
        apiService,
        apiKey,
        model,
        VALIDATE_COMPS_TEMPLATE,
        requestState.enableSearch,
        0,
        [],
        [],
        {
            promptKey: requestState.promptKey
        }
    );

    return result.content;
}
