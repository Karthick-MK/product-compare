# CompareXT Setup

## Before publishing

Replace `YOUR-TAG-HERE` with your Amazon Associates tag in two files:

- `compare.js` line 1: `const AFFILIATE_TAG = "YOUR-TAG-HERE";`
- `sites.js`: `const AFFILIATE_TAG = "YOUR-TAG-HERE";`

Your tag format: `yourname-21` (India) or `yourname-20` (US).

## Loading the extension

1. Open Chrome → `chrome://extensions/`
2. Enable Developer mode (top-right toggle)
3. Click "Load unpacked" → select the `chrome-extension/` folder
4. Visit any Amazon.in product page to test
