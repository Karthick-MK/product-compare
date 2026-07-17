// Registry populated by sites/*.js files loaded before this one.
window.SITE_REGISTRY = window.SITE_REGISTRY || {};

function getSiteConfig(hostname) {
  for (const key of Object.keys(window.SITE_REGISTRY)) {
    if (hostname === key || hostname.endsWith("." + key)) return window.SITE_REGISTRY[key];
  }
  return null;
}

function scrapeProduct(siteConfig) {
  const s = siteConfig.scrape;
  const asin = siteConfig.extractAsin(location.href);

  const titleEl = document.querySelector(s.title);
  const title = titleEl ? titleEl.textContent.trim() : "";

  const wholeEl = document.querySelector(s.priceWhole);
  const fracEl  = document.querySelector(s.priceFraction);
  // ponytail: assumes Amazon price format "₹X,XXX" whole+fraction split
  const price = wholeEl
    ? (wholeEl.textContent.trim().replace(/\D/g, "") + "." + (fracEl ? fracEl.textContent.trim() : "00"))
    : "";

  const imageEl = document.querySelector(s.image);
  const image   = imageEl ? (imageEl.src || imageEl.getAttribute("data-old-hires") || "") : "";

  const ratingEl = document.querySelector(s.rating);
  const rating   = ratingEl ? ratingEl.textContent.trim() : "";

  const reviewEl    = document.querySelector(s.reviewCount);
  const reviewCount = reviewEl ? reviewEl.textContent.trim() : "";

  const bulletEls = document.querySelectorAll(s.bullets);
  const bullets = Array.from(bulletEls)
    .map(el => el.textContent.trim())
    .filter(t => t.length > 0)
    .slice(0, 8);

  return { asin, title, price, image, rating, reviewCount, bullets };
}

function buildAffiliateUrl(id, siteConfig) {
  if (siteConfig.buildAffiliateUrl) return siteConfig.buildAffiliateUrl(id);
  // Amazon default: add-to-cart URL with affiliate tag
  const AFFILIATE_TAG = "karthickcart-21";
  return `${siteConfig.baseUrl}/gp/aws/cart/add.html?ASIN.1=${id}&Quantity.1=1&tag=${AFFILIATE_TAG}`;
}

window.getSiteConfig     = getSiteConfig;
window.scrapeProduct     = scrapeProduct;
window.buildAffiliateUrl = buildAffiliateUrl;
