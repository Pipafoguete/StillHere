const SCRIPT_ID = "page_state_guard";
const BRIDGE_SCRIPT_ID = "page_state_bridge";
const RULESET_ID = "bloqueios_analytics";

async function readConfig() {
  const stored = await chrome.storage.local.get(["protectionEnabled", "framesProtectionEnabled", "pasteProtectionEnabled", "customDelayBase", "customDelayVar"]);
  const basic = typeof stored.protectionEnabled === "boolean" ? stored.protectionEnabled : false;
  const frames = typeof stored.framesProtectionEnabled === "boolean" ? stored.framesProtectionEnabled : false;
  const paste = typeof stored.pasteProtectionEnabled === "boolean" ? stored.pasteProtectionEnabled : false;
  const delayBase = clampInteger(stored.customDelayBase, 25, 1, 500);
  const delayVar = clampInteger(stored.customDelayVar, 15, 0, 200);
  return { basic, frames, paste, delayBase, delayVar };
}

function clampInteger(value, fallback, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

async function setRulesEnabled(enabled) {
  try {
    if (enabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [RULESET_ID] });
    } else {
      await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET_ID] });
    }
  } catch (err) {
    console.error("Erro ao aplicar regras de rede DNR:", err);
  }
}

async function setScriptRegistered(basicEnabled, framesEnabled, pasteEnabled) {
  const ids = [SCRIPT_ID, BRIDGE_SCRIPT_ID];
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids });
  if (existing.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids });
  }

  // O script principal roda na página; a ponte isolada lê as preferências salvas.
  if (basicEnabled || framesEnabled || pasteEnabled) {
    await chrome.scripting.registerContentScripts([{
      id: SCRIPT_ID,
      matches: ["http://*/*", "https://*/*", "file:///*"],
      js: ["hide-page-state.js"],
      runAt: "document_start",
      world: "MAIN",
      allFrames: framesEnabled, 
      persistAcrossSessions: true
    }, {
      id: BRIDGE_SCRIPT_ID,
      matches: ["http://*/*", "https://*/*", "file:///*"],
      js: ["paste-bridge.js"],
      runAt: "document_start",
      world: "ISOLATED",
      allFrames: framesEnabled,
      persistAcrossSessions: true
    }]);
  }
}

async function updateOpenTabs() {
  const config = await readConfig();
  const tabs = await chrome.tabs.query({});
  
  await Promise.allSettled(tabs.filter(tab => tab.url && (!tab.url.startsWith("chrome://"))).map(async (tab) => {
    try {
      // Garante a injeção do arquivo protetor de forma sincronizada
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: config.frames },
        files: ["hide-page-state.js"],
        world: "MAIN",
        injectImmediately: true
      });
      
      // Despacha as variáveis reais unificadas eliminando condições de corrida de estado
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: config.frames },
        func: (basic, frames, paste, base, vMax) => {
          window.__stillHereBasicActive = basic;
          window.__stillHerePasteActive = paste;
          window.__stillHereBaseMs = Number(base);
          window.__stillHereVarMs = Number(vMax);

          // Dispara o evento interno customizado de reatividade síncrona
          const evt = new CustomEvent("__stillHereInternalSync");
          window.dispatchEvent(evt);
        },
        args: [config.basic, config.frames, config.paste, config.delayBase, config.delayVar],
        world: "MAIN",
        injectImmediately: true
      });
    } catch (err) {
      console.warn(`Aba ignorada ou inacessível (${tab.id}):`, err.message);
    }
  }));
}

async function applyState(basicEnabled, framesEnabled, pasteEnabled, updateTabs = true) {
  await chrome.storage.local.set({ 
    protectionEnabled: basicEnabled, 
    framesProtectionEnabled: framesEnabled,
    pasteProtectionEnabled: pasteEnabled
  });
  await setRulesEnabled(basicEnabled);
  await setScriptRegistered(basicEnabled, framesEnabled, pasteEnabled);
  if (updateTabs) await updateOpenTabs();
}

function syncState() {
  readConfig().then((config) => {
    // Aplica também às abas já abertas após instalar ou iniciar a extensão.
    applyState(config.basic, config.frames, config.paste, true).catch(console.error);
  }).catch(console.error);
}

chrome.runtime.onInstalled.addListener(() => { syncState(); });
chrome.runtime.onStartup.addListener(() => { syncState(); });

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "setProtection") return;
  
  readConfig().then(async (current) => {
    let nextBasic = current.basic;
    let nextFrames = current.frames;
    let nextPaste = current.paste;

    if (message.target === "basic") nextBasic = Boolean(message.enabled);
    if (message.target === "frames") nextFrames = Boolean(message.enabled);
    if (message.target === "paste") nextPaste = Boolean(message.enabled);

    await applyState(nextBasic, nextFrames, nextPaste, true);
    
    let responseEnabled = nextBasic;
    if (message.target === "frames") responseEnabled = nextFrames;
    if (message.target === "paste") responseEnabled = nextPaste;

    sendResponse({ ok: true, enabled: responseEnabled });
  }).catch(error => {
    sendResponse({ ok: false, error: String(error) });
  });

  return true;
});
