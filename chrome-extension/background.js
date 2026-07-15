chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_COMPARE") {
    chrome.tabs.create({ url: chrome.runtime.getURL("compare.html") });
  }
  // ponytail: analytics stub — POST to /api/ext/event when msg.type === "PRODUCT_ADDED"
});
