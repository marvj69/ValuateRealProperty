# ValuateRealProperty PDF Generator Extract

This folder contains only the browser-side PDF export slice from the ValuateRealProperty app.

## Contents

- `pdf-generator.js` - standalone wrapper around the app's report-to-PDF logic.
- `pdf-export.css` - `.pdf-*` styles used by the generated export document.
- `demo.html` - minimal working page that loads the generator and sample report content.
- `assets/906-Real-Estate-Group_Logo-2024_Black.png` - 906 Real Estate Group logo.
- `assets/CBlobo.png` - Coldwell Banker Schmidt Realtors logo.
- `vendor/marked.min.js` - local copy of the markdown parser used by the demo.
- `vendor/html2pdf.bundle.min.js` - local copy of the PDF library used by the generator.

## External runtime dependencies

The generator expects these browser globals when downloading a PDF:

- `window.html2pdf` from `html2pdf.js`
- Optional: `window.marked` if passing markdown through `reportMarkdown`

The demo loads both from the included `vendor/` folder:

```html
<script src="vendor/marked.min.js"></script>
<script src="vendor/html2pdf.bundle.min.js"></script>
```

## Basic usage

```html
<link rel="stylesheet" href="pdf-export.css">
<script src="vendor/html2pdf.bundle.min.js"></script>
<script src="pdf-generator.js"></script>
<script>
  await window.ValuatePdfGenerator.download({
    contentElement: document.getElementById('finalReportContent'),
    address: '123 Sample Street, Marquette, MI',
    audience: 'seller'
  });
</script>
```

You can also pass `reportHtml`, `reportMarkdown`, a `report` object, custom `summaryItems`, custom `assetPaths`, or a custom `theme`.

## Local demo

Run a small web server from this folder so browser fetches can load the logo assets:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/demo.html`.

## Source mapping

The extracted code came from these app files:

- `index.html`: `html2pdf.js` script include and `#downloadPdfBtn`/`#finalReportContent` markup.
- `app.js`: `PDF_BRAND_ASSETS`, `PDF_BRAND_THEME`, `markdownToHtml`, PDF asset loading, export document assembly, and `saveFinalReportAsPDF()`.
- `styles.css`: root PDF tokens and the `PDF export` `.pdf-*` style block.
- `photo assets/`: the two brand logo images used in the PDF.
