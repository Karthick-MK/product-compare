(async () => {
  const siteConfig = getSiteConfig(location.hostname);

  // Only run on product pages
  const isProductPage = siteConfig
    ? siteConfig.productPattern.test(location.pathname)
    : location.pathname.includes("/dp/");

  if (!isProductPage) return;

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
        await updateAddBtn();
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
    await updateAddBtn();
  });

  await renderBar();

  // --- "Add to Compare" button ---
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
      addBtn.textContent = "✓ Added";
      addBtn.disabled = true;
      addBtn.classList.add("added");
    } else if (count >= 10) {
      addBtn.textContent = "Compare full (10/10)";
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

  addBtn = createAddBtn();

  if (siteConfig) {
    const anchor = document.querySelector(siteConfig.buttonAnchor);
    if (anchor) {
      anchor.parentNode.insertBefore(addBtn, anchor.nextSibling);
    } else {
      // buttonAnchor not found — fallback pill
      injectFallbackPill();
    }
  } else {
    injectFallbackPill();
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

  await updateAddBtn();
})();
