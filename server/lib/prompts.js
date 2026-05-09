export const DEFAULT_REPORT_MODEL = 'gemini-3-flash-preview';

const STANDARD_TEMPLATE = `Overall Goal: Generate a comprehensive, data-driven real estate market report and reasoned valuation estimate for a specific property, acting as an expert analyst. Prioritize reliable web search for comparable data and perform meticulous self-checking before finalizing the output.

Persona: Act as a highly experienced Senior Real Estate Market Analyst and Appraiser. You specialize in public real estate data, county records where available, market reports, news, and established analytical methods. State assumptions and data source limitations clearly.

Core Directives:
- Tailor the report to the intended audience: buyer, seller, or investor.
- Search for recent comparable sales and active/pending listings near the subject property.
- Prioritize recency, proximity, similarity, public record reliability, and source cross-checking.
- Evaluate each comparable critically and explain qualitative adjustments.
- Ensure market findings support the valuation conclusion.

<subject_property>
{{PROPERTY_ADDRESS}}
{{PDF_NOTE}}
{{ADDITIONAL_DETAILS}}
</subject_property>

<report_audience>
Intended Audience: {{REPORT_AUDIENCE}}
</report_audience>

{{SPECIAL_INSTRUCTIONS}}

Required Report Components:
1. Executive Summary
2. Property Description & Initial Assessment
3. Macro Market Analysis
4. Micro Market Analysis
5. Comparable Sales Analysis with at least 3 and ideally 5 recent sold comps
6. Competitive Listing Analysis with 2-3 active or pending competitors
7. Valuation Estimate using the Sales Comparison Approach
8. SWOT Analysis
9. Market Outlook & Conclusion

Formatting:
- Use Markdown.
- Use ## headings for main sections and ### headings for subsections.
- Use tables where helpful.
- State "Estimated Market Value Range: $XXX,XXX - $YYY,YYY".
- State "Single Point Estimate: $XXX,XXX".
- Keep a professional, analytical, objective tone.`;

const EXPERIMENTAL_TEMPLATE = `### SYSTEM ROLE & OBJECTIVE
You are an elite Senior Real Estate Appraiser and Market Data Scientist. Generate a bank-grade Comparative Market Analysis and Valuation Report.

You do not guess. You act as a skeptical auditor of data. Use verifiable public data and the Sales Comparison Approach.

### INTENDED AUDIENCE
{{REPORT_AUDIENCE}}

### INPUT DATA
<SUBJECT_PROPERTY>
Address: {{PROPERTY_ADDRESS}}
PDF Context: {{PDF_NOTE}}
Details: {{ADDITIONAL_DETAILS}}
</SUBJECT_PROPERTY>

<USER_INSTRUCTIONS>
{{SPECIAL_INSTRUCTIONS}}
</USER_INSTRUCTIONS>

### EXECUTION PROTOCOL
1. Search the subject address for tax records, prior listings, and public record signals.
2. Search for sold homes in the ZIP/city/neighborhood from the last 6 months when possible.
3. Search market reports for the current city/neighborhood.
4. Select the best 3-5 closed sales and 2 active/pending competitors.
5. Explain why each comp is relevant and how adjustments affect value.

### REQUIRED OUTPUT FORMAT
# Real Estate Valuation Report: [Insert Property Address]
**Date:** [Current Date]
**Analyst Confidence Score:** [Low/Medium/High]

## 1. Executive Summary & Verdict
- **Estimated Value Range:** $XXX,XXX - $XXX,XXX
- **Most Probable List Price:** $XXX,XXX
- **Liquidity Rating:** [Fast/Average/Slow]
- **Top-Level Insight:** 2-3 sentences.

## 2. Subject Property Anatomy
- **Facts:** Beds | Baths | SqFt | Lot Size | Year Built
- **The Hook:** Best feature.
- **The Drag:** Biggest buyer objection.

## 3. Macro & Micro Market Conditions
Cite sources for data points.

## 4. Comparable Sales Analysis
Use a Markdown table with Address, Sold Date, Sold Price, SqFt, Price/SqFt, Distance, Adjustments/Notes.

## 5. Active Competition
Identify 2 active or pending competitors.

## 6. SWOT Analysis

## 7. Final Valuation Logic
- **Conservative Liquidation Price:** $XXX,XXX
- **Fair Market Value:** $XXX,XXX
- **Aggressive List Price:** $XXX,XXX

**DISCLAIMER:** This is an AI-generated analytical report based on publicly available web data. It is not an official appraisal. Physical inspection was not performed.`;

export function buildReportPrompt(input) {
  const isExperimental = input.promptKey === 'experimental';
  const attachments = Array.isArray(input.attachments) ? input.attachments : [];
  const attachmentNote = attachments.length
    ? 'Attached files include property PDFs and/or images. Use them as primary sources for subject property details.'
    : '';
  const detailsBlock = input.additionalDetails
    ? (isExperimental ? input.additionalDetails : `Additional Details: ${input.additionalDetails}`)
    : '';
  const instructionsBlock = input.specialInstructions
    ? (isExperimental ? input.specialInstructions : `Special Instructions: ${input.specialInstructions}`)
    : '';

  const template = isExperimental ? EXPERIMENTAL_TEMPLATE : STANDARD_TEMPLATE;
  return template
    .replace('{{PROPERTY_ADDRESS}}', input.propertyAddress || 'Address not provided (see attached files).')
    .replace('{{ADDITIONAL_DETAILS}}', detailsBlock)
    .replace('{{SPECIAL_INSTRUCTIONS}}', instructionsBlock)
    .replace('{{PDF_NOTE}}', attachmentNote)
    .replace('{{REPORT_AUDIENCE}}', input.reportAudience || 'seller');
}

export function buildValidationPrompt(reportsText) {
  return `You are a data verification specialist focused on real estate comps. Extract all comparable sales and active/pending listings from the reports below and verify them.

Verification steps:
- Confirm each address exists and appears to be a real property.
- Verify price, date, beds, baths, SqFt, year built, lot size where possible using reputable public sources.
- If data conflicts, choose the most credible source and note the discrepancy.
- If you cannot verify an address or at least price plus date, exclude it.

Output format:
## Validated Comparable Sales
| Address | Sale Date | Sale Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Validated Active/Pending Listings
| Address | List/Pending Date | List Price | Beds | Baths | SqFt | Year Built | Lot Size | Sources | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Excluded/Unverified
- Address (reason)

Rules:
- Do not invent new comps outside the reports.
- Only correct obvious address errors if a verified match is found.
- Be conservative when in doubt.

Reports:
${reportsText}`;
}

export function buildFinalReportPrompt({ reportsText, validatedCompsContent, reportAudience }) {
  return `You are a senior real estate valuation analyst preparing a polished, client-ready valuation report.
Intended audience: ${reportAudience || 'seller'}.

Client-facing requirements:
- Write as a final deliverable prepared directly for the client. Do not mention drafts, source reports, merged reports, consensus generation, reconciliation workflow, validation workflow, model output, or internal process.
- Use a confident, polished, advisory tone suitable for a real estate client while remaining objective and evidence-based.
- Tailor emphasis to the intended audience: seller reports should emphasize pricing strategy and marketability; buyer reports should emphasize offer discipline and risk; investor reports should emphasize value support, liquidity, and downside protection.
- Do not introduce new comparable sales, listings, property facts, prices, dates, or market statistics unless they appear in the evidence below.
- Preserve citations, source names, MLS numbers, and public-record references when they are available in the evidence.
- If verified comparable evidence is unavailable or contains internal error/process text, do not repeat that wording. Instead, state the limitation professionally in the Risks, Assumptions & Limitations section.

Evidence handling:
- Use verified comparable sales and listings as the strongest evidence when actual verified data is provided.
- When facts conflict, favor verified public records, MLS/listing data, county records, and consistently cited facts over unsupported statements.
- Give greatest valuation weight to closed sales that are recent, nearby, similar in property type, similar in size/condition, and well-supported.
- Use active and pending listings as market-positioning evidence, not as the primary basis for market value.
- Exclude or down-weight weak comparables and explain the reason in polished client language.
- Do not simply average prior value conclusions. Build the final value opinion from the strongest available comparable evidence and market context.

Required output format:
# Final Real Estate Valuation Report

## Executive Summary
Include these exact labels so downstream systems can read the valuation:
- Estimated Market Value Range: $XXX,XXX - $YYY,YYY
- Single Point Estimate: $XXX,XXX
- Confidence Level: Low/Medium/High
Then provide a concise 3-5 sentence client-facing valuation verdict.

## Subject Property Overview
Summarize the property facts, market position, strengths, and buyer objections. Clearly identify unknowns as assumptions rather than presenting them as facts.

## Market Context
Summarize relevant macro and local market conditions. Keep this section practical and connected to pricing, demand, liquidity, and negotiation leverage.

## Comparable Sales Analysis
Provide a deduplicated table with Address, Sale Date, Sale Price, SqFt, Price/SqFt, Distance, Verification/Source, and Adjustment Notes.

## Active & Pending Competition
Provide a deduplicated table with Address, Status, List/Pending Price, Key Facts, Verification/Source, and Relevance.

## Valuation Rationale
Explain how the best evidence supports the value range and single point estimate. Discuss adjustments, comp weighting, and how active competition affects pricing strategy.

## Pricing Strategy & Client Guidance
Give practical guidance tailored to the intended audience. For sellers, include conservative, market, and aspirational pricing posture when supportable. For buyers or investors, include offer-positioning and risk guidance.

## Risks, Assumptions & Limitations
State data gaps, unverified facts, physical-inspection limitations, source conflicts, and confidence constraints in polished client language.

Verified Comparable Sales & Listings:
${validatedCompsContent}

Internal Research Materials:
${reportsText}`;
}

export function buildValueExtractionPrompt(reportText) {
  return `You are a valuation range extraction assistant.
Read the report and return ONLY a JSON object with numeric rangeLow and rangeHigh values.
Use whole numbers without commas or currency symbols.
If no clear value range is present, return "UNKNOWN".

Report:
${reportText}`;
}

export function buildAddressExtractionPrompt(reportText) {
  return `You are an address extraction assistant.
Return ONLY the full subject property address from the report text.
Choose the subject property, not comparable listings.
If no clear subject address is present, return "UNKNOWN".

Report Text:
${reportText}`;
}
