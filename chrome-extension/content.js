(async () => {
  const siteConfig = getSiteConfig(location.hostname);

  const isProductPage = siteConfig
    ? siteConfig.productPattern.test(location.pathname)
    : location.pathname.includes("/dp/");

  const isSearchPage = !isProductPage && !!(
    siteConfig && siteConfig.searchPattern && siteConfig.searchPattern.test(location.pathname)
  );

  // --- Floating bar ---
  const bar = document.createElement("div");
  bar.id = "cxt-bar";
  bar.innerHTML = `
    <div id="cxt-bar-thumbs"></div>
    <button id="cxt-compare-btn" disabled>COMPARE (0)</button>
    <button id="cxt-clear-btn">× Clear</button>
  `;
  document.body.appendChild(bar);

  async function renderBar() {
    const products = await DB.getAll();
    const thumbs = document.getElementById("cxt-bar-thumbs");
    const compareBtn = document.getElementById("cxt-compare-btn");
    thumbs.innerHTML = "";
    products.forEach(p => {
      const img = document.createElement("img");
      img.className = "cxt-thumb";
      img.setAttribute("src", p.image || "");
      img.setAttribute("title", p.title || "");
      img.setAttribute("data-asin", p.asin);
      img.addEventListener("error", () => { img.style.display = "none"; });
      img.addEventListener("click", async () => {
        await DB.removeProduct(img.dataset.asin);
        await renderBar();
        await updateUI();
      });
      thumbs.appendChild(img);
    });
    compareBtn.textContent = `COMPARE (${products.length})`;
    compareBtn.disabled = products.length < 2;
  }

  document.getElementById("cxt-compare-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_COMPARE" });
  });
  document.getElementById("cxt-clear-btn").addEventListener("click", async () => {
    await DB.clear();
    await renderBar();
    await updateUI();
  });

  await renderBar();

  // --- Product page "Add to Compare" button ---
  let addBtn = null;

  function createAddBtn() {
    const btn = document.createElement("button");
    btn.id = "cxt-add-btn";
    btn.textContent = "Add to Compare";
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      try {
        const scraped = scrapeProduct(siteConfig || getFallbackConfig());
        if (!scraped.asin) { alert("Could not find product ID on this page."); return; }
        const affiliateUrl = buildAffiliateUrl(scraped.asin, siteConfig || getFallbackConfig());
        await DB.addProduct({
          ...scraped,
          site: (siteConfig || {}).site || "amazon",
          url: location.href,
          affiliateUrl,
          addedAt: Date.now(),
        });
        await updateAddBtn();
        await renderBar();
      } catch (e) {
        alert(e.message);
      }
    });
    return btn;
  }

  async function updateAddBtn() {
    if (!addBtn) return;
    const asin = siteConfig
      ? siteConfig.extractAsin(location.href)
      : (location.href.match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
    const count = await DB.getCount();
    const has = asin ? await DB.hasProduct(asin) : false;
    if (has) {
      addBtn.textContent = "Added to Compare";
      addBtn.disabled = true;
      addBtn.classList.add("added");
    } else if (count >= 10) {
      addBtn.textContent = "Compare list full";
      addBtn.disabled = true;
      addBtn.classList.remove("added");
    } else {
      addBtn.textContent = "Add to Compare";
      addBtn.disabled = false;
      addBtn.classList.remove("added");
    }
  }

  function getFallbackConfig() {
    const base = getSiteConfig("amazon.in");
    return { ...base, baseUrl: location.origin };
  }

  function injectFallbackPill() {
    addBtn.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(addBtn);
    const pill = document.createElement("button");
    pill.id = "cxt-fallback-pill";
    pill.textContent = "+ Add to Compare";
    pill.addEventListener("click", () => addBtn.click());
    document.body.appendChild(pill);
  }

  if (isProductPage) {
    addBtn = createAddBtn();
    let injected = false;
    if (siteConfig) {
      for (const sel of siteConfig.buttonAnchor.split(',').map(s => s.trim())) {
        const anchor = document.querySelector(sel);
        // Skip anchors hidden inside collapsed accordion tabs or display:none containers
        if (anchor && !anchor.closest('.aok-hidden') && !anchor.closest('[aria-hidden="true"]')) {
          anchor.parentNode.insertBefore(addBtn, anchor.nextSibling);
          injected = true;
          break;
        }
      }
    }
    if (!injected) injectFallbackPill();
    await updateAddBtn();
  }

  // --- Search page card buttons ---
  async function updateAllCardBtns() {
    const products = await DB.getAll();
    const addedAsins = new Set(products.map(p => p.asin));
    document.querySelectorAll(".cxt-card-btn").forEach(btn => {
      const asin = btn.dataset.asin;
      if (addedAsins.has(asin)) {
        btn.textContent = "Added to Compare";
        btn.classList.add("added");
      } else {
        btn.textContent = "Add to Compare";
        btn.classList.remove("added");
      }
      btn.disabled = false;
    });
  }

  const CARD_SELECTOR = [
    '[data-component-type="s-search-result"][data-asin]', // standard search results
    '[data-csa-c-item-type="asin"][data-asin]',           // p13n mission/blended widgets (with data-asin)
    '[data-csa-c-item-type="asin"][data-csa-c-item-id^="amzn1.asin."]',  // buy-again / carousel widgets (ASIN in item-id)
    '.s-card-container',                                   // standard listing cards
    '[class*="_cDEzb_productContainer_"]',                 // carousel/recommendation cards
  ].join(', ');

  async function injectCardBtn(cardEl) {
    // data-asin present on p13n/search cards; extract from href on s-card-container cards;
    // buy-again/carousel cards use data-csa-c-item-id="amzn1.asin.XXXXXXXXXX"
    let asin = cardEl.dataset.asin;
    if (!asin && cardEl.dataset.csaCItemId && cardEl.dataset.csaCItemId.startsWith('amzn1.asin.')) {
      const candidate = cardEl.dataset.csaCItemId.split('.').pop();
      if (/^[A-Z0-9]{10}$/.test(candidate)) asin = candidate;
    }
    if (!asin) {
      const dpLink = cardEl.querySelector('a[href*="/dp/"]');
      const m = dpLink && dpLink.getAttribute('href').match(/\/dp\/([A-Z0-9]{10})/);
      asin = m ? m[1] : null;
    }
    if (!asin || cardEl.querySelector(".cxt-card-btn")) return;

    const btn = document.createElement("button");
    btn.className = "cxt-card-btn";
    btn.dataset.asin = asin;
    btn.textContent = "Add to Compare";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      try {
        const alreadyAdded = await DB.hasProduct(asin);
        if (alreadyAdded) {
          await DB.removeProduct(asin);
        } else {
          const cfg = siteConfig || getFallbackConfig();
          const count = await DB.getCount();
          if (count >= 10) {
            const bar = document.getElementById("cxt-bar");
            if (bar) {
              bar.style.outline = "2px solid #ef4444";
              setTimeout(() => { bar.style.outline = ""; }, 1000);
            }
            btn.disabled = false;
            return;
          }
          const affiliateUrl = buildAffiliateUrl(asin, cfg);

          // Prefer card-level data-* attributes (p13n cards expose them directly)
          const detailPath = cardEl.dataset.detailPageUrl || `/dp/${asin}`;
          const dataPrice = cardEl.dataset.price;
          const dataStars = cardEl.dataset.reviewStarCount;
          const dataReviews = cardEl.dataset.reviewCount;

          // Scrape inner DOM as fallback
          const titleEl = cardEl.querySelector("h2 a span") ||
                          cardEl.querySelector("[data-click-el='title']") ||
                          cardEl.querySelector("span.a-truncate-cut");
          const imageEl = cardEl.querySelector(".s-image") || cardEl.querySelector("img");
          const wholeEl = cardEl.querySelector(".a-price-whole");
          const fracEl = cardEl.querySelector(".a-price-fraction");
          const ratingEl = cardEl.querySelector(".a-icon-alt");

          const price = dataPrice
            ? dataPrice + ".00"
            : wholeEl ? (wholeEl.textContent.replace(/\D/g, "") + "." + (fracEl ? fracEl.textContent.trim() : "00")) : "";

          const rating = dataStars
            ? dataStars + " out of 5 stars"
            : ratingEl ? ratingEl.textContent.trim() : "";

          await DB.addProduct({
            asin,
            site: cfg.site || "amazon",
            title: titleEl ? titleEl.textContent.trim() : "",
            price,
            image: imageEl ? imageEl.src : "",
            rating,
            reviewCount: dataReviews || "",
            bullets: [],
            url: cfg.baseUrl + detailPath,
            affiliateUrl,
            addedAt: Date.now(),
          });
        }
        await renderBar();
        await updateAllCardBtns();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });

    // Standard search card: insert after delivery section
    // p13n card: insert before the Add to Cart section
    const deliveryEl = cardEl.querySelector('[data-cy="delivery-recipe"]');
    const atcEl = cardEl.querySelector('[aria-label^="Add to Cart"]');
    if (deliveryEl && deliveryEl.parentNode) {
      deliveryEl.parentNode.insertBefore(btn, deliveryEl.nextSibling);
    } else if (atcEl && atcEl.parentNode) {
      atcEl.parentNode.insertBefore(btn, atcEl);
    } else {
      cardEl.appendChild(btn);
    }
  }

  async function updateUI() {
    await updateAddBtn();
    await updateAllCardBtns();
  }

  // Inject on all Amazon pages (search, category, homepage, deals — cards appear everywhere)
  const cards = document.querySelectorAll(CARD_SELECTOR);
  for (const card of cards) await injectCardBtn(card);
  await updateAllCardBtns();

  const observer = new MutationObserver(async (mutations) => {
    let injected = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches(CARD_SELECTOR)) {
          await injectCardBtn(node);
          injected = true;
        } else if (node.querySelectorAll) {
          const nested = node.querySelectorAll(CARD_SELECTOR);
          for (const c of nested) { await injectCardBtn(c); injected = true; }
        }
      }
    }
    if (injected) await updateAllCardBtns();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
