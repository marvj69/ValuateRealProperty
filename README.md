# Market Intelligence Studio

**MarketIntel** is an AI-powered web application that generates comprehensive real estate property valuation reports through a secure Vercel backend workflow. Whether you're a buyer, seller, or investor, this tool helps you understand property values through data-driven analysis, comparable sales research, and market intelligence.

## Features

### 🏠 Comprehensive Property Analysis
- **Property Valuation Reports**: Generate detailed Comparative Market Analysis (CMA) reports with estimated market value ranges
- **Web-Grounded Research**: Automatically searches for comparable sales, active listings, and market trends using Google's web search integration
- **Final Report Generation**: Automatically process multiple analyses behind the scenes and present one final valuation report
- **Document Support**: Upload PDFs, photos, tax records, and other property documents for enhanced analysis

### 🎯 Audience-Specific Reports
Tailor your reports for different audiences:
- **Buyer Reports**: Focus on negotiation leverage, risks, and timing
- **Seller Reports**: Emphasize pricing strategy, positioning, and preparation priorities
- **Investor Reports**: Highlight cash flow potential, rent comps, cap rates, and ROI drivers

### 📊 Report Styles
Choose between two analysis approaches:
- **Standard Valuation**: Comprehensive market analysis with detailed comps and market trends
- **Bank-Grade CMA**: Strict, conservative analysis with rigorous data validation and adjustment grids

### 💾 Smart Storage & History
- **Saved Valuations**: Automatically save all reports to the authenticated user's backend account
- **Account Settings**: Persist AI model, audience, and report style preferences to the authenticated user's account
- **Report History**: Access and review past valuations with a convenient history drawer
- **PDF Export**: Download professional PDF reports with formatted tables and summaries

### ⚡ Advanced Capabilities
- **Background Processing**: Reports run asynchronously in Vercel API functions and remain available when you leave the page
- **Offline Support**: Progressive Web App with service worker for offline functionality
- **Real-time Progress**: Track report generation with live status updates
- **Cross-Device Access**: Return from any logged-in session and view completed or failed reports

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Google Gemini API key configured as a server environment variable
- Vercel Postgres / Neon connection environment variables
- An `AUTH_SESSION_SECRET` for the built-in signed-cookie auth flow
- A Resend API key and verified sender address for production password recovery emails
- Users create email/password accounts that are stored in Postgres
- Optional password reset configuration: `APP_BASE_URL`, `PASSWORD_RESET_DEV_MODE`, `PASSWORD_RESET_TOKEN_TTL_MINUTES`, and `PASSWORD_RESET_EMAIL_REPLY_TO`

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd valuate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in `GEMINI_API_KEY`, `AUTH_SESSION_SECRET`, `CRON_SECRET`, and your Vercel Postgres / Neon connection values.

4. **Run with Vercel-compatible API routes**
   ```bash
   npx vercel dev
   ```

5. **Rebuild Tailwind CSS after changing utility classes**
   ```bash
   npm run build:css
   ```

6. **Open in your browser**
   Navigate to the local URL printed by Vercel, usually `http://localhost:3000`.

### First-Time Setup

1. Open the app and use the first-use login screen
2. Enter your email and password, then choose **Create account**
3. Select your preferred AI model and report settings
4. Return later with **Sign in** using the same email and password
5. Use **Forgot password?** to request a one-time reset token during local development

## How to Use

### Basic Workflow

1. **Enter Property Information**
   - Type the property address in the "Subject Property" field
   - Optionally add property details (beds, baths, square footage, condition, etc.)
   - Upload supporting documents (PDFs, photos) if available

2. **Configure Settings** (optional)
   - Choose your target audience (Buyer/Seller/Investor)
   - Select report style (Standard or Bank-Grade CMA)

3. **Generate Analysis**
   - Click "Generate Analysis"
   - The frontend submits the request to `/api/reports` and receives a report ID
   - Watch the simple queued/processing status while the backend works
   - The processing view stays simple while the backend works
   - The final report displays automatically when it is ready

4. **Review Results**
   - View the final report and valuation guidance
   - Download as PDF for sharing or record-keeping

### Advanced Features

**Special Instructions**: Click "Add Special Instructions?" to provide specific focus areas (e.g., "Focus on school district quality" or "Emphasize recent renovations")

**Saved Valuations**: Access your report history by clicking the menu icon (☰) in the top navigation. View, retry, manage, or delete saved backend reports.

**Background Processing**: Reports are persisted in Postgres with `queued`, `processing`, `completed`, or `failed` status. You can leave the page and return later from any signed-in session.

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Backend**: Vercel API Functions under `api/`
- **Async Processing**: `POST /api/reports` creates a queued job, returns a report ID, and starts backend processing with `waitUntil`; `/api/worker` can process queued/stale jobs on a cron schedule
- **AI Integration**: Google Gemini API (v1beta) with web grounding, called only from backend functions
- **Storage**: Postgres tables `app_users`, `report_jobs`, `report_usage_counters`, and `report_usage_events`, with reports scoped by authenticated `user_id`
- **Service Worker**: Static/offline asset caching only
- **PWA**: Installable Progressive Web App with manifest

### API Routes
- `POST /api/auth/signup` - create an email/password account and signed HttpOnly session cookie
- `POST /api/auth/login` - verify an email/password account and create a signed HttpOnly session cookie
- `POST /api/auth/password-reset/request` - create a one-time password reset token and return a development reset link when enabled
- `POST /api/auth/password-reset/confirm` - reset the password with a valid token and sign in the user
- `POST /api/auth/logout` - clear the session
- `GET /api/auth/me` - inspect current auth state
- `GET|PATCH /api/user/settings` - read or update the signed-in user's report preferences
- `POST /api/reports` - create a report job, subject to weekly Fast/Smart/Experimental usage limits
- `GET /api/reports` - list the signed-in user's reports
- `GET /api/reports/usage` - read the signed-in user's Fast/Smart/Experimental weekly limits, used counts, remaining counts, and reset time
- `GET /api/reports/:id` - read one owned report
- `DELETE /api/reports/:id` - delete one owned report
- `POST /api/reports/:id/retry` - retry a failed or queued report when appropriate
- `GET|POST /api/worker` - process queued jobs, protected by `CRON_SECRET` for cron usage

### Required Environment Variables
- `GEMINI_API_KEY`: server-side Gemini key
- `AUTH_SESSION_SECRET`: long random string used to sign sessions
- `CRON_SECRET`: bearer token for the scheduled worker endpoint
- `REPORT_MODEL`: optional default report model choice
- `FAST_REPORT_WEEKLY_LIMIT`: optional weekly Fast report limit per user, default `5`
- `SMART_REPORT_WEEKLY_LIMIT`: optional weekly Smart report limit per user, default `5`
- `EXPERIMENTAL_REPORT_WEEKLY_LIMIT`: optional weekly Experimental report limit per user, default `5`
- `REPORT_USAGE_TIME_ZONE`: optional IANA time zone for weekly quota windows, default `America/Detroit`
- `MAX_JSON_BODY_CHARS`: optional maximum JSON request body size, default `5500000`
- `APP_BASE_URL`: optional absolute app URL used to build password reset links
- `PASSWORD_RESET_DEV_MODE`: optional local-development switch that returns reset tokens in the API response
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`: optional reset-token expiration window, default `30`
- `RESEND_API_KEY`: server-side Resend API key used to send password reset emails
- `PASSWORD_RESET_EMAIL_FROM`: verified sender, for example `MarketIntel <password-reset@yourdomain.com>`
- `PASSWORD_RESET_EMAIL_REPLY_TO`: optional reply-to address for reset emails
- Vercel Postgres / Neon variables such as `POSTGRES_URL` or the integration-provided equivalents

Password reset tokens are stored hashed in Postgres and are single-use. In production, set `RESEND_API_KEY`, `PASSWORD_RESET_EMAIL_FROM`, and `APP_BASE_URL`, and keep `PASSWORD_RESET_DEV_MODE` unset so raw reset tokens are not returned to the browser.

Note: attachments are submitted directly to the report creation API and are limited to small PDFs/images. For large documents, add Vercel Blob or another object store and persist file URLs in the report inputs.

### Supported Models
- Fast (`gemini-flash-lite-latest`) - 5 reports per user per week by default
- Smart (`gemini-3-flash-preview`) - 5 reports per user per week by default
- Experimental - 5 reports per user per week by default; generates 3 drafts with `gemini-flash-latest`, 3 drafts with `gemini-3.1-pro-preview`, then uses `gemini-3-flash-preview` for merge and support steps

Usage limits are enforced server-side with an atomic Postgres quota counter and durable usage ledger. Deleting report history does not reset quota, retrying a report consumes quota, and direct API calls are restricted to the supported Fast/Smart/Experimental model choices.

### Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: Background processing and notifications require modern browser support for Service Workers and Background Sync API.

## Project Structure

```
valuate/
├── api/                # Vercel API functions, auth, DB, report worker
├── index.html          # Main application HTML
├── app.js              # Frontend UI, auth state, polling, history rendering
├── service-worker.js   # Static/offline caching
├── package.json        # Dependencies, checks, and Tailwind CSS build
├── vercel.json         # Vercel function, cron, and API cache config
├── tailwind.css        # Generated Tailwind CSS bundle
├── tailwind.config.cjs # Tailwind CLI configuration
├── src/tailwind.css    # Tailwind CSS input
├── styles.css          # Custom styles
├── manifest.json       # PWA manifest
├── offline.html        # Offline fallback page
├── icons/              # App icons for PWA
└── README.md          # This file
```

## API Usage & Costs

This application uses Google's Gemini API from backend functions only. Key points:

- **Server Key Required**: Configure `GEMINI_API_KEY` in the deployment environment
- **No Browser Secrets**: The frontend never receives or stores the Gemini key
- **Web Search**: Uses Google's web grounding feature (may have additional costs)
- **Token Usage**: Reports can be lengthy; monitor your API usage
- **Rate Limits**: Subject to Google's API rate limits

For current pricing and limits, visit [Google AI Studio](https://aistudio.google.com/).

## Limitations & Disclaimers

⚠️ **Important**: This tool generates AI-powered estimates based on publicly available data. It is **not** a professional appraisal and should not be used as the sole basis for financial decisions.

- No physical property inspection is performed
- Data reliability depends on public record accuracy
- Comparable sales data may be incomplete or outdated
- Always consult licensed professionals for official valuations
- Results are estimates and may vary significantly from actual market values

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues, fork the repository, and create pull requests.

## Support

For issues, questions, or feature requests, please open an issue on the repository.

---

**Built with ❤️ using Google Gemini AI**
