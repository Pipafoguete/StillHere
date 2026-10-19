(() => {
  const publish = (config) => {
    window.postMessage({
      type: "__stillHereConfig",
      basic: typeof config.protectionEnabled === "boolean" ? config.protectionEnabled : false,
      frames: Boolean(config.framesProtectionEnabled),
      paste: Boolean(config.pasteProtectionEnabled),
      delayBase: Math.min(500, Math.max(1, Number(config.customDelayBase) || 25)),
      delayVar: Math.min(200, Math.max(0, Number(config.customDelayVar) || 0))
    }, "*");
  };

  chrome.storage.local.get([
    "protectionEnabled",
    "framesProtectionEnabled",
    "pasteProtectionEnabled",
    "customDelayBase",
    "customDelayVar"
  ]).then(publish);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!["protectionEnabled", "framesProtectionEnabled", "pasteProtectionEnabled", "customDelayBase", "customDelayVar"]
      .some((key) => key in changes)) return;
    chrome.storage.local.get([
      "protectionEnabled",
      "framesProtectionEnabled",
      "pasteProtectionEnabled",
      "customDelayBase",
      "customDelayVar"
    ]).then(publish);
  });
})();
