# StillHere Guard ☕

Extensão experimental em **Manifest V3** projetada para aumentar a privacidade de navegação, mascarar rastreadores estruturados e estabilizar o comportamento de abas em segundo plano.

O painel foi desenvolvido sob a identidade visual premium **Lost Koffie**, trazendo uma interface acolhedora e minimalista baseada em tons de café, creme e cobre.

---

## 🛠️ Funcionalidades

A extensão conta com três módulos independentes controlados diretamente por abas no popup:

*   **Visualização Básica (Abas & Analytics):** Intercepta e congela as propriedades nativas de visibilidade (`document.hidden` e `document.visibilityState`) como sempre ativas e bloqueia requisições de scripts de analytics conhecidos (como *Google Analytics*, *Hotjar* e *Clarity*).
*   **Trava de Frames (Iframes):** Força a injeção profunda do script protetor dentro de sub-frames (`<iframe>`), impedindo que janelas filhas ou caixas de monitoramento isoladas detectem a perda de foco ou reduzam a taxa de quadros (FPS) quando minimizadas.
*   **Bypass de Colagem (Digitação Humana):** Intercepta e desativa o evento nativo de colagem (`paste`) das páginas. Quando ativo, as inserções feitas via `Ctrl+V` emulam a digitação real letra por letra em ordem sequencial com intervalos controlados para contornar logs de detecção automática.

---

## 🚀 Instalação ou Atualização

Você pode assistir ao vídeo demonstrativo incluso no repositório ou seguir o passo a passo abaixo:

1. Abra o seu navegador e acesse o endereço `chrome://extensions/`.
2. No canto superior direito, ative a opção **Modo do desenvolvedor**.
3. No canto superior esquerdo, clique em **Carregar sem compactação** e selecione a pasta raiz desta extensão.
4. Para atualizar uma instalação existente após editar os arquivos, basta clicar no ícone circular de **Recarregar** no card da extensão.

> ℹ️ **Nota sobre permissões:** O Chrome solicitará acesso aos sites HTTP/HTTPS para que o script possa ser injetado em tempo de execução (`document_start`). A extensão opera de forma 100% local: ela **não coleta, não armazena e não envia** nenhum dado do usuário.

---

## 🧪 Como Testar

### Método 1: Validação de Sinais de Visibilidade
Para testar a eficiência dos bloqueios de saída e perda de foco da aba em tempo real:
1. Abra qualquer site, aperte **F12** e vá até a aba **Console**.
2. Veja o codigo no "teste-rastreamento" e cole no console e pressione **Enter**:
3. Com a extensão desativada, mude de aba e volte para ver os alertas vermelhos.
4. Ative as proteções no popup, atualize a página (**F5**), cole o script novamente e comprove que o console permanecerá completamente limpo.

### Método 2: Validação do Bypass de Colagem (Escrita Simulada)
Para validar se o mascaramento do teclado está ativo e ocultando o sinal de transferência de texto:
1. Abra qualquer página com campos de entrada, pressione **F12** e vá até o **Console**.
2. Cole o script "teste-colagem" e pressione **Enter**:
3. Com a proteção desligada, use o atalho `Ctrl+V` para ver o alerta amarelo de colagem ser capturado.
4. Acesse a aba "Colar Texto", ligue o interruptor, atualize a página e cole o script detector de novo. Ao usar o `Ctrl+V`, a mensagem amarela desaparecerá e o conteúdo surgirá sequencialmente disparando apenas logs verdes de teclado.

### Método 3: Laboratórios de API Públicos
Você também pode validar o comportamento de persistência de mídia utilizando a página de demonstração oficial da Mozilla:
* [MDN Blog - Using the Page Visibility API](https://developer.mozilla.org/en-US/blog/using-the-page-visibility-api/)

---

## ⚠️ Limitações Conhecidas

O StillHere Guard intercepta com sucesso os sinais baseados em eventos periféricos tradicionais de interface, mas possui os seguintes limites técnicos:
* **Verificação do Servidor:** O servidor do site monitorado pode notar se a sua conexão de rede foi interrompida ou se requisições assíncronas obrigatórias deixaram de ser enviadas.
* **Loops de FPS Fixos:** Scripts que analisam a taxa de atualização do navegador através de loops contínuos de `requestAnimationFrame` ainda podem notar oscilações de desempenho impostas pelo próprio motor gráfico do sistema operacional.
* **Efeitos Colaterais:** Manter os estados sempre ativos pode afetar o comportamento de players de mídia integrados (impedindo que pausem sozinhos) e suspender temporariamente rotinas de salvamento automático de rascunhos que dependem do evento `blur`.
* **Páginas Protegidas:** Extensões do Chrome são proibidas por segurança de atuar em páginas internas do navegador (como `chrome://*`) ou na loja oficial de extensões.
