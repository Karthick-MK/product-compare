(() => {
  const KEY = "compareXT_products";
  const MAX = 10;

  async function load() {
    return new Promise(resolve => {
      chrome.storage.local.get(KEY, result => {
        resolve(result[KEY] || []);
      });
    });
  }

  async function save(products) {
    return new Promise(resolve => {
      chrome.storage.local.set({ [KEY]: products }, resolve);
    });
  }

  async function getAll() {
    const products = await load();
    return products.slice().sort((a, b) => a.addedAt - b.addedAt);
  }

  async function addProduct(product) {
    const products = await load();
    const idx = products.findIndex(p => p.asin === product.asin);
    if (idx >= 0) {
      products[idx] = product; // update existing
    } else {
      if (products.length >= MAX) throw new Error(`Compare list is full (${MAX}/${MAX})`);
      products.push(product);
    }
    await save(products);
  }

  async function removeProduct(asin) {
    const products = await load();
    await save(products.filter(p => p.asin !== asin));
  }

  async function clear() {
    await save([]);
  }

  async function getCount() {
    const products = await load();
    return products.length;
  }

  async function hasProduct(asin) {
    const products = await load();
    return products.some(p => p.asin === asin);
  }

  window.DB = { addProduct, getAll, removeProduct, clear, getCount, hasProduct };
})();
