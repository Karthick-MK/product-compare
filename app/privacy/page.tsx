export const metadata = {
  title: "Privacy Policy — CompareXT",
  description: "Privacy policy for the CompareXT Chrome extension.",
};

export default function PrivacyPage() {
  return (
    <div style={{ background: "#ffffff", minHeight: "100vh" }}>
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 720, margin: "0 auto", padding: "40px 20px", lineHeight: 1.6, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>CompareXT — Privacy Policy</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 24 }}>Last updated: July 18, 2026</p>

      <p>CompareXT is a browser extension that lets you collect products from supported shopping sites and compare them side by side. This policy explains what data the extension handles.</p>

      <h2>Data we collect</h2>
      <p><strong>We do not collect any personal data.</strong> The extension has no account, no login, and no analytics.</p>

      <h2>Data the extension stores</h2>
      <p>When you click "Add to Compare", the extension saves the following on your own device using <code>chrome.storage.local</code>:</p>
      <ul>
        <li>Product title, price, image URL, rating, and specifications</li>
        <li>The product's page URL</li>
      </ul>
      <p>This data never leaves your browser. It is not sent to us or any third party. Delete it any time with "Clear All" or by removing the extension.</p>

      <h2>Permissions we request</h2>
      <ul>
        <li><strong>Storage</strong> — to save your compare list locally on your device.</li>
        <li><strong>Host access to supported shopping sites</strong> (Amazon, Flipkart, Ajio, Meesho, Myntra, Nykaa) — to read product details on pages you visit so the extension can build the comparison. The extension runs only on these sites.</li>
      </ul>

      <h2>Network requests</h2>
      <p>To fill specification tables, the extension may fetch a product's own page from the shopping site you added it from. These requests go directly to that shopping site — never to a server operated by us. We operate no server and receive no data.</p>

      <h2>Affiliate disclosure</h2>
      <p>Some "buy" links include an affiliate tag (Amazon Associates). If you purchase through such a link, we may earn a commission at no extra cost to you. This does not involve sharing any of your data.</p>

      <h2>Third-party sites</h2>
      <p>This policy covers only the extension. Third-party shopping sites have their own privacy policies.</p>

      <h2>Contact</h2>
      <p>Questions? Email: <a href="mailto:karthick@xola.com">karthick@xola.com</a></p>

      <footer style={{ marginTop: 40, color: "#666", fontSize: 13, borderTop: "1px solid #eee", paddingTop: 16 }}>
        CompareXT is not affiliated with, endorsed by, or sponsored by Amazon, Flipkart, or any shopping site it supports.
      </footer>
    </main>
    </div>
  );
}
