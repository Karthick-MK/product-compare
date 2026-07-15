const AFFILIATE_TAG = "YOUR-TAG-HERE";

function buildAffiliateUrl(asin) {
  return `https://www.amazon.in/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

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

function renderProduct(product) {
  const affiliateUrl = buildAffiliateUrl(product.asin);

  const col = el("div", "product-col");
  col.dataset.asin = product.asin;

  // Image section
  const imageWrap = el("div", "col-image-wrap");
  const imgLink = el("a");
  imgLink.href = affiliateUrl;
  imgLink.target = "_blank";
  imgLink.rel = "noopener";
  const img = el("img");
  img.src = product.image || "";
  img.alt = product.title || "Product image";
  img.addEventListener("error", () => { img.style.display = "none"; });
  imgLink.appendChild(img);
  imageWrap.appendChild(imgLink);

  // Body section
  const body = el("div", "col-body");

  const title = el("div", "col-title");
  title.textContent = product.title || "Unknown product";

  const price = el("div", "col-price");
  price.textContent = product.price ? "₹" + product.price : "—";

  body.appendChild(title);
  body.appendChild(price);

  if (product.rating) {
    const rating = el("div", "col-rating");
    const stars = el("span", "stars");
    stars.textContent = starString(product.rating);
    const ratingVal = el("span");
    ratingVal.textContent = product.rating;
    rating.appendChild(stars);
    rating.appendChild(ratingVal);
    if (product.reviewCount) {
      const rc = el("span");
      rc.textContent = "· " + product.reviewCount;
      rating.appendChild(rc);
    }
    body.appendChild(rating);
  }

  if (product.bullets && product.bullets.length) {
    const label = el("div", "col-bullets-label");
    label.textContent = "Features";
    const ul = el("ul", "col-bullets");
    product.bullets.forEach(b => {
      const li = el("li");
      li.textContent = b;
      ul.appendChild(li);
    });
    body.appendChild(label);
    body.appendChild(ul);
  }

  // Footer section
  const footer = el("div", "col-footer");

  const buyBtn = el("a", "buy-btn");
  buyBtn.href = affiliateUrl;
  buyBtn.target = "_blank";
  buyBtn.rel = "noopener";
  buyBtn.textContent = "Buy on Amazon →";

  const removeBtn = el("button", "remove-btn");
  removeBtn.dataset.asin = product.asin;
  removeBtn.textContent = "Remove";

  footer.appendChild(buyBtn);
  footer.appendChild(removeBtn);

  col.appendChild(imageWrap);
  col.appendChild(body);
  col.appendChild(footer);

  return col;
}

async function render() {
  const products = await window.DB.getAll();
  const table = document.getElementById("compare-table");
  const wrapper = document.getElementById("compare-wrapper");
  const empty = document.getElementById("empty-state");
  const count = document.getElementById("product-count");

  table.innerHTML = "";

  if (products.length === 0) {
    wrapper.style.display = "none";
    empty.style.display = "flex";
    count.textContent = "";
    return;
  }

  wrapper.style.display = "block";
  empty.style.display = "none";
  count.textContent = `${products.length} product${products.length !== 1 ? "s" : ""}`;

  products.forEach(p => {
    const col = renderProduct(p);
    col.querySelector(".remove-btn").addEventListener("click", async () => {
      await window.DB.removeProduct(p.asin);
      await render();
    });
    table.appendChild(col);
  });
}

document.getElementById("clear-all-btn").addEventListener("click", async () => {
  await window.DB.clear();
  await render();
});

render();
