const buttonBasic = document.getElementById("toggle");
const stateBasic = document.getElementById("state");
const detailBasic = document.getElementById("detail");
const buttonFrames = document.getElementById("toggle-frames");
const stateFrames = document.getElementById("state-frames");
const detailFrames = document.getElementById("detail-frames");
const buttonPaste = document.getElementById("toggle-paste");
const statePaste = document.getElementById("state-paste");
const detailPaste = document.getElementById("detail-paste");
const customDetails = document.getElementById("custom-details");
const arrowIcon = document.getElementById("arrow-icon");
const errorDisplay = document.getElementById("error");
const panelTitle = document.getElementById("panel-title");
const gearBtn = document.getElementById("gear-tab-trigger");
const inputDelayBase = document.getElementById("input-delay-base");
const inputDelayVar = document.getElementById("input-delay-var");

let basicEnabled = false;
let framesEnabled = false;
let pasteEnabled = false;

function exibirErro(mensagem, detalhe = "") {
  errorDisplay.textContent = `❌ ${mensagem} ${detalhe ? `(${detalhe})` : ""}`;
}

function normalizarAtraso(valor, padrao, minimo, maximo) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero)) return padrao;
  return Math.min(maximo, Math.max(minimo, numero));
}

function mensagemErroInjecao(error) {
  const detalhe = error?.message || String(error);
  if (/Cannot access|permission|host permission/i.test(detalhe)) {
    return "O Chrome não permite acesso a esta página. Confira a permissão da extensão para o site.";
  }
  return `Não foi possível aplicar à aba atual: ${detalhe}`;
}

function render() {
  buttonBasic.setAttribute("aria-checked", String(basicEnabled));
  stateBasic.textContent = basicEnabled ? "Visualização Básica ON" : "Visualização Básica OFF";
  buttonBasic.disabled = false;

  buttonFrames.setAttribute("aria-checked", String(framesEnabled));
  stateFrames.textContent = framesEnabled ? "Trava de Frames ON" : "Trava de Frames OFF";
  buttonFrames.disabled = false;

  buttonPaste.setAttribute("aria-checked", String(pasteEnabled));
  statePaste.textContent = pasteEnabled ? "Bypass de Colagem ON" : "Bypass de Colagem OFF";
  detailPaste.textContent = pasteEnabled ? "Injeção de digitação humana ativa" : "Colagem padrão do navegador";
  buttonPaste.disabled = false;

  tabButtons.forEach((button) => {
    button.setAttribute("aria-selected", String(button.classList.contains("active")));
  });
  gearBtn.setAttribute("aria-expanded", String(gearBtn.classList.contains("active")));
}

function sincronizarConfiguracoesGlobais() {
  chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0].id) return;
    
    const targetTab = tabs[0];
    if (!targetTab.url || /^(chrome|edge|about|devtools|chrome-extension):/i.test(targetTab.url)) {
      errorDisplay.textContent = "Esta página especial do navegador não permite a execução da extensão.";
      return;
    }

    const delayBase = normalizarAtraso(inputDelayBase.value, 25, 1, 500);
    const delayVar = normalizarAtraso(inputDelayVar.value, 15, 0, 200);

    // Dispara a sincronização de parâmetros injetando de forma limpa na aba ativa
    chrome.scripting.executeScript({
      target: { tabId: targetTab.id, allFrames: framesEnabled },
      func: (basic, frames, paste, base, vMax) => {
        window.__stillHereBasicActive = basic;
        window.__stillHerePasteActive = paste;
        window.__stillHereBaseMs = Number(base);
        window.__stillHereVarMs = Number(vMax);

        const evt = new CustomEvent("__stillHereInternalSync");
        window.dispatchEvent(evt);
      },
      args: [basicEnabled, framesEnabled, pasteEnabled, delayBase, delayVar],
      world: "MAIN",
      injectImmediately: true
    }).catch((err) => {
      exibirErro(mensagemErroInjecao(err));
    });
  }).catch((err) => exibirErro("Erro ao consultar aba de execução ativa.", err.message));
}

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    const targetTabId = button.getAttribute("data-target");
    gearBtn.classList.remove("active");
    panelTitle.textContent = "PRIVACIDADE";
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(targetTabId).classList.add("active");
    render();
    sincronizarConfiguracoesGlobais();
  });
});

gearBtn.addEventListener("click", () => {
  const jaEstaAtivo = gearBtn.classList.contains("active");

  if (jaEstaAtivo) {
    gearBtn.classList.remove("active");
    panelTitle.textContent = "PRIVACIDADE";
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));
    document.querySelector('[data-target="tab-visualizacao"]').classList.add("active");
    document.getElementById("tab-visualizacao").classList.add("active");
  } else {
    tabButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(content => content.classList.remove("active"));
    gearBtn.classList.add("active");
    panelTitle.textContent = "OPÇÕES";
    document.getElementById("tab-config-avancada").classList.add("active");
  }
  render();
  sincronizarConfiguracoesGlobais();
});

if (customDetails) {
  customDetails.addEventListener("toggle", () => {
    arrowIcon.style.transform = customDetails.open ? "rotate(180deg)" : "rotate(0deg)";
  });
}

chrome.storage.local.get([
  "protectionEnabled", 
  "framesProtectionEnabled", 
  "pasteProtectionEnabled",
  "customDelayBase",
  "customDelayVar"
]).then(result => {
  basicEnabled = typeof result.protectionEnabled === "boolean" ? result.protectionEnabled : false;
  framesEnabled = typeof result.framesProtectionEnabled === "boolean" ? result.framesProtectionEnabled : false;
  pasteEnabled = typeof result.pasteProtectionEnabled === "boolean" ? result.pasteProtectionEnabled : false;
  
  inputDelayBase.value = normalizarAtraso(result.customDelayBase, 25, 1, 500);
  inputDelayVar.value = normalizarAtraso(result.customDelayVar, 15, 0, 200);

  render();
  setTimeout(sincronizarConfiguracoesGlobais, 150);
}).catch((err) => exibirErro("Falha ao ler dados de inicialização do disco.", err.message));

const gravarParametroEAtualizar = (chave, valor) => {
  errorDisplay.textContent = "";
  const payload = {};
  payload[chave] = valor;
  chrome.storage.local.set(payload).then(() => {
    sincronizarConfiguracoesGlobais();
  }).catch((err) => exibirErro("Falha ao salvar preferências no armazenamento.", err.message));
};

inputDelayBase.addEventListener("change", () => {
  const val = normalizarAtraso(inputDelayBase.value, 25, 1, 500);
  inputDelayBase.value = val;
  gravarParametroEAtualizar("customDelayBase", val);
});

inputDelayVar.addEventListener("change", () => {
  const val = normalizarAtraso(inputDelayVar.value, 15, 0, 200);
  inputDelayVar.value = val;
  gravarParametroEAtualizar("customDelayVar", val);
});

const enviarComandoMódulo = async (alvo, proximoEstado) => {
  errorDisplay.textContent = "";
  try {
    const resposta = await chrome.runtime.sendMessage({ type: "setProtection", target: alvo, enabled: proximoEstado });
    if (!resposta?.ok) throw new Error(resposta?.error || "Rejeição assíncrona do background worker.");
    return resposta.enabled;
  } catch (err) {
    exibirErro(`Erro na comunicação do módulo: ${alvo}.`, err.message);
    throw err;
  }
};

buttonBasic.addEventListener("click", async () => {
  buttonBasic.disabled = true;
  try {
    basicEnabled = await enviarComandoMódulo("basic", !basicEnabled);
    render();
    sincronizarConfiguracoesGlobais();
  } catch (_) { buttonBasic.disabled = false; }
});

buttonFrames.addEventListener("click", async () => {
  buttonFrames.disabled = true;
  try {
    framesEnabled = await enviarComandoMódulo("frames", !framesEnabled);
    render();
    sincronizarConfiguracoesGlobais();
  } catch (_) { buttonFrames.disabled = false; }
});

buttonPaste.addEventListener("click", async () => {
  buttonPaste.disabled = true;
  try {
    pasteEnabled = await enviarComandoMódulo("paste", !pasteEnabled);
    render();
    sincronizarConfiguracoesGlobais();
  } catch (_) { buttonPaste.disabled = false; }
});
