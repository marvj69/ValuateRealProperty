# Market Intelligence Studio

**MarketIntel** is an AI-powered web application that generates comprehensive real estate property valuation reports using Google's Gemini AI models. Whether you're a buyer, seller, or investor, this tool helps you understand property values through data-driven analysis, comparable sales research, and market intelligence.

## Features

### 🏠 Comprehensive Property Analysis
- **Property Valuation Reports**: Generate detailed Comparative Market Analysis (CMA) reports with estimated market value ranges
- **Web-Grounded Research**: Automatically searches for comparable sales, active listings, and market trends using Google's web search integration
- **Multiple Report Generation**: Create 1, 3, 5, or 10 individual reports and merge them into a consensus analysis
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
- **Saved Valuations**: Automatically save all reports to your browser's local storage
- **Report History**: Access and review past valuations with a convenient history drawer
- **PDF Export**: Download professional PDF reports with formatted tables and summaries

### ⚡ Advanced Capabilities
- **Background Processing**: Reports continue generating even if you close the browser tab (PWA support)
- **Offline Support**: Progressive Web App with service worker for offline functionality
- **Real-time Progress**: Track report generation with live status updates
- **Notification Alerts**: Get notified when your reports are ready

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd valuate
   ```

2. **Serve the application**
   
   Since this is a client-side application, you can serve it using any static file server:
   
   **Option 1: Using Python**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   **Option 2: Using Node.js (http-server)**
   ```bash
   npx http-server -p 8000
   ```
   
   **Option 3: Using VS Code Live Server**
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

3. **Open in your browser**
   Navigate to `http://localhost:8000` (or the port you specified)

### First-Time Setup

1. Click the settings icon (⚙️) in the top navigation
2. Enter your Gemini API key
3. Optionally check "Remember on this device" to save your API key locally
4. Select your preferred AI model (default: Gemini 3 Flash)
5. Configure other settings as needed

## How to Use

### Basic Workflow

1. **Enter Property Information**
   - Type the property address in the "Subject Property" field
   - Optionally add property details (beds, baths, square footage, condition, etc.)
   - Upload supporting documents (PDFs, photos) if available

2. **Configure Settings** (optional)
   - Choose your target audience (Buyer/Seller/Investor)
   - Select report style (Standard or Bank-Grade CMA)
   - Set the number of reports to generate (3 is recommended for best balance)

3. **Generate Analysis**
   - Click "Generate Analysis"
   - Watch the progress as reports are created
   - Reports will merge automatically into a final consensus report

4. **Review Results**
   - View the final merged report with consensus valuation
   - Expand individual reports to see detailed analyses
   - Download as PDF for sharing or record-keeping

### Advanced Features

**Special Instructions**: Click "Add Special Instructions?" to provide specific focus areas (e.g., "Focus on school district quality" or "Emphasize recent renovations")

**Saved Valuations**: Access your report history by clicking the menu icon (☰) in the top navigation. View, manage, or delete saved reports.

**Background Processing**: When supported by your browser, reports will continue generating even if you close the tab. You'll receive a notification when they're ready.

## Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **AI Integration**: Google Gemini API (v1beta) with web grounding
- **Storage**: IndexedDB for reports, localStorage for preferences
- **Service Worker**: Background processing and offline support
- **PWA**: Installable Progressive Web App with manifest

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
├── index.html          # Main application HTML
├── app.js              # Core application logic
├── service-worker.js   # Background processing & offline support
├── styles.css          # Custom styles
├── tailwind-config.js  # Tailwind CSS configuration
├── manifest.json       # PWA manifest
├── offline.html        # Offline fallback page
├── icons/              # App icons for PWA
└── README.md          # This file
```

## API Usage & Costs

This application uses Google's Gemini API, which has usage-based pricing. Key points:

- **API Key Required**: You must provide your own Gemini API key
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
