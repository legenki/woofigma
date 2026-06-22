// On toolbar-icon click, inject the bundled content script into the active tab.
// activeTab grants single-tab access for this click only; no broad host perms.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) {
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});
