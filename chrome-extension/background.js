chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_COMPARE") {
    const compareUrl = chrome.runtime.getURL("compare.html");
    chrome.tabs.query({ url: compareUrl }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: compareUrl });
      }
    });
  }
  // ponytail: analytics stub — POST to /api/ext/event when msg.type === "PRODUCT_ADDED"
});
