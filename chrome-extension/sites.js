(() => {
  const SITES = {
    "amazon.in": {
      site: "amazon",
      baseUrl: "https://www.amazon.in",
      productPattern: /\/dp\//,
      extractAsin: url => (url.match(/\/dp\/([A-Z0-9]{10})/) || [])[1] || "",
      buttonAnchor: "#add-to-cart-button",
      scrape: {
        title: "#productTitle",
        priceWhole: ".a-price-whole",
        priceFraction: ".a-price-fraction",
        image: "#landingImage",
        rating: ".a-icon-alt",
        reviewCount: "#acrCustomerReviewText",
        bullets: "#feature-bullets li .a-list-item",
      },
    },
  };

  // amazon.com shares same selectors
  SITES["amazon.com"] = { ...SITES["amazon.in"], baseUrl: "https://www.amazon.com" };

  function getSiteConfig(hostname) {
    for (const key of Object.keys(SITES)) {
      if (hostname === key || hostname.endsWith("." + key)) return SITES[key];
    }
    return null;
  }

  function scrapeProduct(siteConfig) {
    const s = siteConfig.scrape;
    const asin = siteConfig.extractAsin(location.href);

    const titleEl = document.querySelector(s.title);
    const title = titleEl ? titleEl.textContent.trim() : "";

    const wholeEl = document.querySelector(s.priceWhole);
    const fracEl = document.querySelector(s.priceFraction);
    // ponytail: assumes Amazon price format "₹X,XXX" whole+fraction split
    const price = wholeEl
      ? (wholeEl.textContent.trim().replace(/\D/g, "") + "." + (fracEl ? fracEl.textContent.trim() : "00"))
      : "";

    const imageEl = document.querySelector(s.image);
    const image = imageEl ? (imageEl.src || imageEl.getAttribute("data-old-hires") || "") : "";

    const ratingEl = document.querySelector(s.rating);
    const rating = ratingEl ? ratingEl.textContent.trim() : "";

    const reviewEl = document.querySelector(s.reviewCount);
    const reviewCount = reviewEl ? reviewEl.textContent.trim() : "";

    const bulletEls = document.querySelectorAll(s.bullets);
    const bullets = Array.from(bulletEls)
      .map(el => el.textContent.trim())
      .filter(t => t.length > 0)
      .slice(0, 8); // cap at 8 bullets

    return { asin, title, price, image, rating, reviewCount, bullets };
  }

  function buildAffiliateUrl(asin, siteConfig) {
    const AFFILIATE_TAG = "karthickcart-21";
    return `${siteConfig.baseUrl}/dp/${asin}?tag=${AFFILIATE_TAG}`;
  }

  window.getSiteConfig = getSiteConfig;
  window.scrapeProduct = scrapeProduct;
  window.buildAffiliateUrl = buildAffiliateUrl;
})();
