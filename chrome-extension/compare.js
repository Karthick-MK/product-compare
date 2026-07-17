function starString(ratingText) {
  const match = ratingText && ratingText.match(/(\d+(\.\d+)?)/);
  if (!match) return "";
  const n = parseFloat(match[1]);
  const full = Math.floor(n);
  const half = n - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - half);
}

function el(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

// --- Enrichment ---

async function enrich(product) {
  if (product.specTable && Object.keys(product.specTable).length > 0) return product;
  const cfg = Object.values(window.SITE_REGISTRY || {}).find(c => c.site === product.site);
  if (!cfg || !cfg.enrichProduct) return product;
  try {
    return await cfg.enrichProduct(product);
  } catch (e) {
    console.warn('CompareXT: enrichment failed for', product.asin, e);
    return product;
  }
}

// --- Spec helpers ---

function collectSpecKeys(products) {
  const keys = [];
  const seen = new Set();
  products.forEach(p => {
    if (!p.specTable) return;
    Object.keys(p.specTable).forEach(k => {
      if (!seen.has(k)) { seen.add(k); keys.push(k); }
    });
  });
  return keys;
}

function allSame(values) {
  const nonEmpty = values.filter(v => v !== '—');
  return nonEmpty.length >= 2 && nonEmpty.every(v => v === nonEmpty[0]);
}

// --- Product header card ---

function renderProductHeader(product, colIndex) {
  const col = el('div', 'product-col');
  col.dataset.asin = product.asin;
  col.dataset.col = colIndex;

  const imageWrap = el('div', 'col-image-wrap');
  const imgLink = el('a');
  imgLink.href = product.affiliateUrl || product.url || '#';
  imgLink.target = '_blank';
  imgLink.rel = 'noopener';
  const img = el('img');
  img.src = product.image || '';
  img.alt = product.title || '';
  img.addEventListener('error', () => { img.style.display = 'none'; });
  imgLink.appendChild(img);
  imageWrap.appendChild(imgLink);

  const body = el('div', 'col-body');

  if (product.site) {
    const badge = el('div', 'col-site-badge');
    badge.textContent = product.site;
    body.appendChild(badge);
  }

  const price = el('div', 'col-price');
  price.textContent = product.price ? '₹' + product.price : '—';
  body.appendChild(price);

  if (product.rating) {
    const rating = el('div', 'col-rating');
    const stars = el('span', 'stars');
    stars.textContent = starString(product.rating);
    const rVal = el('span');
    rVal.textContent = ' ' + product.rating;
    rating.appendChild(stars);
    rating.appendChild(rVal);
    if (product.reviewCount) {
      const rc = el('span');
      rc.textContent = ' · ' + product.reviewCount;
      rating.appendChild(rc);
    }
    body.appendChild(rating);
  }

  const removeBtn = el('button', 'remove-btn');
  removeBtn.textContent = '×';
  removeBtn.title = 'Remove';
  removeBtn.addEventListener('click', async () => {
    await window.DB.removeProduct(product.asin);
    render();
  });

  const footer = el('div', 'col-footer');
  const buyBtn = el('a', 'buy-btn');
  buyBtn.href = product.affiliateUrl || product.url || '#';
  buyBtn.target = '_blank';
  buyBtn.rel = 'noopener';
  buyBtn.textContent = '🛒 View on Cart →';
  footer.appendChild(buyBtn);

  col.appendChild(removeBtn);
  col.appendChild(imageWrap);
  col.appendChild(body);
  col.appendChild(footer);
  return col;
}

// --- Layout renderer ---

function renderLayout(container, products) {
  container.innerHTML = '';

  // Sticky single-line title bar (product headings only — stays readable while scrolling)
  const titleRow = el('div', 'compare-title-row');
  titleRow.appendChild(el('div', 'label-spacer'));
  products.forEach((p, i) => {
    const cell = el('div', 'title-cell');
    cell.dataset.col = i;
    cell.textContent = p.title || 'Unknown product';
    cell.title = p.title || '';
    titleRow.appendChild(cell);
  });
  container.appendChild(titleRow);

  // Product header cards (scroll normally)
  const headersRow = el('div', 'compare-headers-row');
  headersRow.appendChild(el('div', 'label-spacer'));
  products.forEach((p, i) => headersRow.appendChild(renderProductHeader(p, i)));
  container.appendChild(headersRow);

  // Spec table
  const specKeys = collectSpecKeys(products);
  if (!specKeys.length) return;

  const showDiffOnly = document.getElementById('diff-toggle')?.checked || false;
  const specSection = el('div', 'spec-section');

  specKeys.forEach(key => {
    const values = products.map(p => (p.specTable && p.specTable[key]) || '—');
    const same = allSame(values);
    if (showDiffOnly && same) return;

    const row = el('div', `spec-row ${same ? 'same' : 'diff'}`);
    const keyEl = el('div', 'spec-key');
    keyEl.textContent = key;
    row.appendChild(keyEl);
    values.forEach((v, i) => {
      const val = el('div', 'spec-val');
      val.dataset.col = i;
      val.textContent = v;
      row.appendChild(val);
    });
    specSection.appendChild(row);
  });

  container.appendChild(specSection);
}

// Placeholder spec rows shown while enrichment fetches spec tables.
function renderSkeleton(container, colCount) {
  const section = el('div', 'spec-section');
  for (let r = 0; r < 8; r++) {
    const row = el('div', 'spec-row');
    const key = el('div', 'spec-key');
    key.appendChild(el('div', 'skeleton-bar'));
    row.appendChild(key);
    for (let c = 0; c < colCount; c++) {
      const val = el('div', 'spec-val');
      val.dataset.col = c;
      val.appendChild(el('div', 'skeleton-bar'));
      row.appendChild(val);
    }
    section.appendChild(row);
  }
  container.appendChild(section);
}

// --- Main render ---

async function render() {
  const compareTable = document.getElementById('compare-table');
  const wrapper = document.getElementById('compare-wrapper');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('product-count');
  const enrichBadge = document.getElementById('enrich-badge');

  const products = await window.DB.getAll();

  if (!products.length) {
    wrapper.style.display = 'none';
    empty.style.display = 'flex';
    count.textContent = '';
    return;
  }

  wrapper.style.display = 'block';
  empty.style.display = 'none';
  count.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;

  // Render immediately with current data
  renderLayout(compareTable, products);

  // Enrich products missing specTable, then re-render
  const needsEnrich = products.some(p => !p.specTable || !Object.keys(p.specTable).length);
  if (needsEnrich) {
    if (enrichBadge) enrichBadge.style.display = 'inline-block';
    if (!compareTable.querySelector('.spec-section')) renderSkeleton(compareTable, products.length);
    const enriched = await Promise.all(products.map(async p => {
      const result = await enrich(p);
      await window.DB.addProduct(result);
      return result;
    }));
    if (enrichBadge) enrichBadge.style.display = 'none';
    renderLayout(compareTable, enriched);
  }
}

// --- Event wiring ---

document.getElementById('diff-toggle')?.addEventListener('change', render);

// Column hover: highlight every cell sharing the hovered column index.
// Delegated on the persistent table element (survives re-renders).
const _table = document.getElementById('compare-table');
function _clearColHover() {
  _table.querySelectorAll('.col-hover').forEach(e => e.classList.remove('col-hover'));
}
_table.addEventListener('mouseover', e => {
  const cell = e.target.closest('[data-col]');
  _clearColHover();
  if (cell) _table.querySelectorAll(`[data-col="${cell.dataset.col}"]`).forEach(e => e.classList.add('col-hover'));
});
_table.addEventListener('mouseleave', _clearColHover);

document.getElementById('clear-all-btn').addEventListener('click', async () => {
  await window.DB.clear();
  render();
});

render();
