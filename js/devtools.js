chrome.tabs.query({
  currentWindow: true,
  active: true
}, function (tabs) {
  currentTabUrl = tabs[0].url
  if (currentTabUrl.includes("/saved/all-posts/")) {
    chrome.devtools.panels.create("Insagram Saver",
    "images/icons/16w.jpg",
    "panel.html",
    function (panel) { });
  } else {
    chrome.devtools.panels.create("Insagram Saver",
    "images/icons/16w.jpg",
    "error.html",
    function (panel) { });
  }
})
