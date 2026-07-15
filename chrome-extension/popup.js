async function init() {
  const count = await window.DB.getCount();
  document.getElementById("count").textContent =
    count === 0 ? "No products added yet" : `${count} product${count !== 1 ? "s" : ""} in compare list`;
  const openBtn = document.getElementById("open-btn");
  openBtn.disabled = count < 2;
  openBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_COMPARE" });
    window.close();
  });
  document.getElementById("clear-btn").addEventListener("click", async () => {
    await window.DB.clear();
    await init();
  });
}

init();
