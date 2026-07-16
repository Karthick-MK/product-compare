window.SITE_REGISTRY = window.SITE_REGISTRY || {};

const _amazon = {
  site: "amazon",
  baseUrl: "https://www.amazon.in",
  productPattern: /\/dp\//,
  searchPattern: /^\/s\b/,
  extractAsin: url => (url.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || "",
  // Comma-separated: tries each in order, skips hidden/collapsed accordion anchors
  buttonAnchor: "#addToCart_feature_div, #almAddToCart_feature_div",
  scrape: {
    title: "#productTitle",
    priceWhole: ".a-price-whole",
    priceFraction: ".a-price-fraction",
    image: "#landingImage",
    rating: ".a-icon-alt",
    reviewCount: "#acrCustomerReviewText",
    bullets: "#feature-bullets li .a-list-item",
  },
};

window.SITE_REGISTRY["amazon.in"]  = _amazon;
window.SITE_REGISTRY["amazon.com"] = { ..._amazon, baseUrl: "https://www.amazon.com" };
