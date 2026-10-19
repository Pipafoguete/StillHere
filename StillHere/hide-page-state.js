(() => {
  const key = "__leaveGuard";
  const blockedEvents = ["visibilitychange", "pagehide", "blur", "freeze"]; // Totalmente livre de beforeunload
  
  if (!window[key + "_originals"]) {
    window[key + "_originals"] = {
      hidden: Object.getOwnPropertyDescriptor(Document.prototype, "hidden"),
      visibilityState: Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState"),
      hasFocusOwn: Object.getOwnPropertyDescriptor(document, "hasFocus"),
      addEventListener: EventTarget.prototype.addEventListener,
      removeEventListener: EventTarget.prototype.removeEventListener
    };
  }

  const originals = window[key + "_originals"];

  // Inicialização padrão segura de escopo controlado
  if (typeof window.__stillHereBasicActive === "undefined") window.__stillHereBasicActive = false;
  if (typeof window.__stillHerePasteActive === "undefined") window.__stillHerePasteActive = false;

  function stopSignal(event) {
    // 🚨 Só bloqueia o evento se a flag de proteção básica estiver estritamente TRUE
    if (window[key] && window[key].isActive && window.__stillHereBasicActive) {
      event.stopImmediatePropagation();
    }
  }

  function safeDefine(obj, prop, descriptor) {
    try {
      Object.defineProperty(obj, prop, descriptor);
    } catch (e) {}
  }

  // Registra o ouvinte uma única vez, mesmo que o arquivo seja injetado de novo.
  function handleInternalSync() {
    if (window.__stillHereBasicActive) {
      enableVisibilityMask();
    } else {
      disableVisibilityMask();
    }
  }

  if (!window.__stillHereSyncListenerRegistered) {
    window.addEventListener("__stillHereInternalSync", handleInternalSync);
    window.__stillHereSyncListenerRegistered = true;
  }

  function handleBridgeConfig(event) {
    if (event.source !== window || event.data?.type !== "__stillHereConfig") return;
    const config = event.data;
    window.__stillHereBasicActive = Boolean(config.basic);
    window.__stillHereFramesActive = Boolean(config.frames);
    window.__stillHerePasteActive = Boolean(config.paste);
    window.__stillHereBaseMs = Math.min(500, Math.max(1, Number(config.delayBase) || 25));
    window.__stillHereVarMs = Math.min(200, Math.max(0, Number(config.delayVar) || 0));
    window.dispatchEvent(new CustomEvent("__stillHereInternalSync"));
  }

  if (!window.__stillHereBridgeListenerRegistered) {
    window.addEventListener("message", handleBridgeConfig);
    window.__stillHereBridgeListenerRegistered = true;
  }

  // ⌨️ INTERCEPTADOR REATIVO DE ESCRITA COMPATÍVEL COM FRAMEWORKS (REACT/VUE/DOM)
  if (!window.__stillHerePasteInterceptRegistered) {
    document.addEventListener('paste', function (e) {
      if (window.__stillHerePasteActive === false || window.__stillHerePasteActive === undefined) return;
      
      if (window.__stillHereIsTyping === true) {
        e.stopImmediatePropagation();
        e.preventDefault();
        return;
      }

      const textoColado = e.clipboardData?.getData('text/plain') || window.clipboardData?.getData('Text') || "";
      const campoAtivo = document.activeElement;

      if (!campoAtivo || !textoColado) return;

      e.stopImmediatePropagation();
      e.preventDefault();

      const caracteres = Array.from(textoColado);
      let index = 0;
      let textoAlterado = false;
      window.__stillHereIsTyping = true;

      const delayBase = Math.min(500, Math.max(1, Number(window.__stillHereBaseMs) || 25));
      const delayVar = Math.min(200, Math.max(0, Number(window.__stillHereVarMs) || 0));

      function finalizarDigitacao() {
        if (textoAlterado && campoAtivo.isConnected) {
          campoAtivo.dispatchEvent(new Event("change", { bubbles: true }));
        }
        window.__stillHereIsTyping = false;
      }

      function digitarProximaLetra() {
        if (index >= caracteres.length || window.__stillHerePasteActive === false || !campoAtivo.isConnected) {
          finalizarDigitacao();
          return;
        }

        // Respeito estrito ao limite maxlength nativo do DOM
        if (campoAtivo.tagName === "INPUT" || campoAtivo.tagName === "TEXTAREA") {
          const limiteMax = campoAtivo.getAttribute("maxlength");
          if (limiteMax !== null) {
            const limiteNum = parseInt(limiteMax, 10);
            const inicio = campoAtivo.selectionStart ?? campoAtivo.value.length;
            const fim = campoAtivo.selectionEnd ?? inicio;
            const tamanhoAposSelecao = campoAtivo.value.length - (fim - inicio);
            if (!isNaN(limiteNum) && tamanhoAposSelecao >= limiteNum) {
              finalizarDigitacao();
              return;
            }
          }
        }

        const caractere = caracteres[index];
        index++;
        let precisaDispararInput = false;

        // Simulação de clique estruturada
        campoAtivo.dispatchEvent(new KeyboardEvent('keydown', { key: caractere, bubbles: true, cancelable: true }));
        campoAtivo.dispatchEvent(new KeyboardEvent('keypress', { key: caractere, bubbles: true, cancelable: true }));
        
        if (campoAtivo.isContentEditable) {
          const selecao = window.getSelection();
          let range = selecao?.rangeCount ? selecao.getRangeAt(0) : null;
          if (!range || !campoAtivo.contains(range.commonAncestorContainer)) {
            range = document.createRange();
            range.selectNodeContents(campoAtivo);
            range.collapse(false);
          }
          range.deleteContents();
          const nodeTexto = document.createTextNode(caractere);
          range.insertNode(nodeTexto);
          range.setStartAfter(nodeTexto);
          range.setEndAfter(nodeTexto);
          selecao?.removeAllRanges();
          selecao?.addRange(range);
          precisaDispararInput = true;
        } else {
          // 🚀 ALTERAÇÃO COMPATÍVEL COM REACT: Usa a API de edição do documento para atualizar os hooks internos
          campoAtivo.focus();
          let inseridoSucesso = false;
          try {
            // execCommand insere o caractere simulando a entrada física e acionando o Virtual DOM do React nativamente
            inseridoSucesso = document.execCommand('insertText', false, caractere);
          } catch (_) {}

          if (!inseridoSucesso) {
            // Fallback limpo via setRangeText se o campo permitir, respeitando a posição estável do cursor
            try {
              const inicio = campoAtivo.selectionStart;
              const fim = campoAtivo.selectionEnd;
              campoAtivo.setRangeText(caractere, inicio, fim, 'end');
            } catch (_) {
              // Fallback extremo para tipos de campo que proíbem seleção de texto (ex: input type="email")
              const inicioFallback = campoAtivo.value.length;
              campoAtivo.value = campoAtivo.value + caractere;
              campoAtivo.selectionStart = campoAtivo.selectionEnd = inicioFallback + 1;
            }
            precisaDispararInput = true;
          }
        }
        
        textoAlterado = true;
        // execCommand já emite input nos navegadores compatíveis; o fallback manual evita duplicar o evento.
        if (precisaDispararInput) {
          campoAtivo.dispatchEvent(new InputEvent("input", {
            inputType: "insertText",
            data: caractere,
            bubbles: true,
            cancelable: false
          }));
        }
        campoAtivo.dispatchEvent(new KeyboardEvent('keyup', { key: caractere, bubbles: true, cancelable: true }));

        const atraso = delayBase + (delayVar > 0 ? Math.floor(Math.random() * delayVar) : 0);
        setTimeout(digitarProximaLetra, atraso);
      }

      digitarProximaLetra();
    }, true);
    window.__stillHerePasteInterceptRegistered = true;
  }

  function enableVisibilityMask() {
    if (window[key] && window[key].isActive) return;
    if (!window[key]) window[key] = { isActive: false };
    window[key].isActive = true;

    safeDefine(Document.prototype, "hidden", { configurable: true, enumerable: true, get: () => false });
    safeDefine(Document.prototype, "visibilityState", { configurable: true, enumerable: true, get: () => "visible" });
    safeDefine(document, "hasFocus", { configurable: true, enumerable: true, get: () => () => true });

    for (const name of blockedEvents) {
      try {
        originals.addEventListener.call(window, name, stopSignal, true);
        originals.addEventListener.call(document, name, stopSignal, true);
      } catch (_) {}
    }

    // Os listeners de captura bloqueiam os eventos sem alterar o protótipo global.
  }

  function disableVisibilityMask() {
    if (!window[key] || !window[key].isActive) return;
    window[key].isActive = false;

    for (const name of blockedEvents) {
      try {
        originals.removeEventListener.call(window, name, stopSignal, true);
        originals.removeEventListener.call(document, name, stopSignal, true);
      } catch (_) {}
    }

    if (originals.hidden) safeDefine(Document.prototype, "hidden", originals.hidden);
    if (originals.visibilityState) safeDefine(Document.prototype, "visibilityState", originals.visibilityState);
    if (originals.hasFocusOwn) {
      safeDefine(document, "hasFocus", originals.hasFocusOwn);
    } else {
      try { delete document.hasFocus; } catch (_) {}
    }
  }

  // Verifica o estado inicial na injeção imediata
  if (window.__stillHereBasicActive) enableVisibilityMask();
})();
