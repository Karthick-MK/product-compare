(async () => {
  const siteConfig = getSiteConfig(location.hostname);

  const isProductPage = siteConfig
    ? siteConfig.productPattern.test(location.pathname)
    : location.pathname.includes("/dp/");

  const isSearchPage = !isProductPage && !!(
    siteConfig && siteConfig.searchPattern && siteConfig.searchPattern.test(location.pathname)
  );

  // --- Floating compare widget (collapsible, right edge) ---
  const bar = document.createElement("div");
  bar.id = "cxt-widget";
  bar.className = "cxt-collapsed";
  bar.style.display = "none";
  bar.innerHTML = `
    <button id="cxt-tab">
      <span id="cxt-tab-arrow">◀</span>
      <span id="cxt-tab-label">COMPARE</span>
      <span id="cxt-tab-count">0</span>
    </button>
    <div id="cxt-panel">
      <div id="cxt-list"></div>
      <div id="cxt-panel-footer">
        <button id="cxt-compare-btn" disabled>COMPARE</button>
        <button id="cxt-clear-btn">Remove all</button>
      </div>
    </div>
  `;
  document.body.appendChild(bar);

  function setExpanded(expanded) {
    bar.classList.toggle("cxt-collapsed", !expanded);
    document.getElementById("cxt-tab-arrow").textContent = expanded ? "▶" : "◀";
  }
  document.getElementById("cxt-tab").addEventListener("click", () => {
    setExpanded(bar.classList.contains("cxt-collapsed"));
  });

  async function renderBar() {
    const products = await DB.getAll();
    const list = document.getElementById("cxt-list");
    const compareBtn = document.getElementById("cxt-compare-btn");
    list.innerHTML = "";
    products.forEach(p => {
      const item = document.createElement("div");
      item.className = "cxt-item";

      const thumb = document.createElement("img");
      thumb.className = "cxt-item-thumb";
      thumb.setAttribute("src", p.image || "");
      thumb.addEventListener("error", () => { thumb.style.visibility = "hidden"; });

      const info = document.createElement("div");
      info.className = "cxt-item-info";
      const name = document.createElement("div");
      name.className = "cxt-item-name";
      name.textContent = p.title || "Unknown product";
      const price = document.createElement("div");
      price.className = "cxt-item-price";
      price.textContent = p.price ? "₹ " + p.price : "";
      info.appendChild(name);
      info.appendChild(price);

      const remove = document.createElement("button");
      remove.className = "cxt-item-remove";
      remove.textContent = "×";
      remove.addEventListener("click", async () => {
        await DB.removeProduct(p.asin);
        await renderBar();
        await updateUI();
      });

      item.appendChild(thumb);
      item.appendChild(info);
      item.appendChild(remove);
      list.appendChild(item);
    });
    document.getElementById("cxt-tab-count").textContent = products.length;
    compareBtn.disabled = products.length < 2;
    bar.style.display = products.length ? "flex" : "none";
    if (!products.length) setExpanded(false);
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
    btn.type = "button"; // prevent form submit (buy-box is a <form> → would navigate)
    btn.textContent = "Add to Compare";
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const cfg = siteConfig || getFallbackConfig();
      const asin = cfg.extractAsin
        ? cfg.extractAsin(location.href)
        : (location.href.match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
      try {
        if (asin && await DB.hasProduct(asin)) {
          await DB.removeProduct(asin);
        } else {
          if (await DB.getCount() >= 10) { await updateAddBtn(); return; }
          const scraped = scrapeProduct(cfg);
          if (!scraped.asin) { alert("Could not find product ID on this page."); return; }
          const affiliateUrl = buildAffiliateUrl(scraped.asin, cfg);
          await DB.addProduct({
            ...scraped,
            site: (siteConfig || {}).site || "amazon",
            url: location.href,
            affiliateUrl,
            addedAt: Date.now(),
          });
        }
        await updateAddBtn();
        await renderBar();
      } catch (err) {
        alert(err.message);
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
      addBtn.disabled = false;
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
        if (!sel) continue; // no anchor configured (e.g. Flipkart) → fall through to pill
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

  const CARD_SELECTOR = siteConfig ? siteConfig.cardSelector : '';

  async function injectCardBtn(cardEl) {
    const cfg = siteConfig || getFallbackConfig();
    const id = cfg.extractCardId ? cfg.extractCardId(cardEl) : null;
    if (!id || cardEl.querySelector(".cxt-card-btn")) return;

    const btn = document.createElement("button");
    btn.className = "cxt-card-btn";
    btn.dataset.asin = id;
    btn.textContent = "Add to Compare";

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      try {
        const alreadyAdded = await DB.hasProduct(id);
        if (alreadyAdded) {
          await DB.removeProduct(id);
        } else {
          const count = await DB.getCount();
          if (count >= 10) {
            const bar = document.getElementById("cxt-widget");
            if (bar) {
              bar.style.outline = "2px solid #ef4444";
              setTimeout(() => { bar.style.outline = ""; }, 1000);
            }
            btn.disabled = false;
            return;
          }
          const scraped = cfg.scrapeCard ? cfg.scrapeCard(cardEl) : {};
          const affiliateUrl = buildAffiliateUrl(id, cfg);
          await DB.addProduct({
            asin: id,
            site: cfg.site || "unknown",
            title: scraped.title || "",
            price: scraped.price || "",
            image: scraped.image || "",
            rating: scraped.rating || "",
            reviewCount: scraped.reviewCount || "",
            bullets: [],
            url: scraped.detailPath
              ? (scraped.detailPath.startsWith('http') ? scraped.detailPath : cfg.baseUrl + scraped.detailPath)
              : location.href,
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

    // Generic insertion: after delivery section (Amazon), before ATC button, else append
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
