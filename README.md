# Market Intelligence Studio

**MarketIntel** is an AI-powered web application that generates comprehensive real estate property valuation reports through a secure Vercel backend workflow. Whether you're a buyer, seller, or investor, this tool helps you understand property values through data-driven analysis, comparable sales research, and market intelligence.

## Features

### 🏠 Comprehensive Property Analysis
- **Property Valuation Reports**: Generate detailed Comparative Market Analysis (CMA) reports with estimated market value ranges
- **Web-Grounded Research**: Automatically searches for comparable sales, active listings, and market trends using Google's web search integration
- **Multiple Report Generation**: Automatically generate 16 individual reports and merge them into a consensus analysis
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
- Users create email/password accounts that are stored in Postgres

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

5. **Open in your browser**
   Navigate to the local URL printed by Vercel, usually `http://localhost:3000`.

### First-Time Setup

1. Click **Sign in** or the settings icon in the top navigation
2. Enter your email and password, then choose **Create account**
3. Select your preferred AI model and report settings
4. Return later with **Sign in** using the same email and password

## How to Use

### Basic Workflow

1. **Enter Property Information**
   - Type the property address in the "Subject Property" field
   - Optionally add property details (beds, baths, square footage, condition, etc.)
   - Upload supporting documents (PDFs, photos) if available

2. **Configure Settings** (optional)
   - Choose your target audience (Buyer/Seller/Investor)
   - Select report style (Standard or Bank-Grade CMA)
   - Sample size is fixed at 16 reports for consistency

3. **Generate Analysis**
   - Click "Generate Analysis"
   - The frontend submits the request to `/api/reports` and receives a report ID
   - Watch the queued/processing/completed/failed status while the backend works
   - Reports merge automatically into a final consensus report

4. **Review Results**
   - View the final merged report with consensus valuation
   - Expand individual reports to see detailed analyses
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
- **Storage**: Postgres tables `app_users` and `report_jobs`, with reports scoped by authenticated `user_id`
- **Service Worker**: Static/offline asset caching only
- **PWA**: Installable Progressive Web App with manifest

### API Routes
- `POST /api/auth/signup` - create an email/password account and signed HttpOnly session cookie
- `POST /api/auth/login` - verify an email/password account and create a signed HttpOnly session cookie
- `POST /api/auth/logout` - clear the session
- `GET /api/auth/me` - inspect current auth state
- `POST /api/reports` - create a report job
- `GET /api/reports` - list the signed-in user's reports
- `GET /api/reports/:id` - read one owned report
- `DELETE /api/reports/:id` - delete one owned report
- `POST /api/reports/:id/retry` - retry a failed or queued report when appropriate
- `GET|POST /api/worker` - process queued jobs, protected by `CRON_SECRET` for cron usage

### Required Environment Variables
- `GEMINI_API_KEY`: server-side Gemini key
- `AUTH_SESSION_SECRET`: long random string used to sign sessions
- `CRON_SECRET`: bearer token for the scheduled worker endpoint
- `REPORT_MODEL`: optional default Gemini model
- Vercel Postgres / Neon variables such as `POSTGRES_URL` or the integration-provided equivalents

Note: attachments are submitted directly to the report creation API and are limited to small PDFs/images. For large documents, add Vercel Blob or another object store and persist file URLs in the report inputs.

### Supported Models
- Gemini 3.1 Pro (Preview)
- Gemini 3.1 Flash-Lite (Preview)
- Gemini 3 Flash (Preview) - Recommended
- Gemini 2.5 Flash
- Gemini 2.5 Pro

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
├── package.json        # Backend dependencies and checks
├── vercel.json         # Vercel function, cron, and API cache config
├── styles.css          # Custom styles
├── tailwind-config.js  # Tailwind CSS configuration
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
