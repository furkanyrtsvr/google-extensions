(function() {
  console.log("[Git-PCB] KiCanvas Bridge Initialized");
  const params = new URLSearchParams(window.location.search);
  const urlFromParams = params.get("git_pcb_url");
  if (urlFromParams) {
    console.log("[Git-PCB] Found URL in custom params:", urlFromParams);
    setTimeout(() => automateKiCanvas(urlFromParams), 500);
  } else {
    console.log("[Git-PCB] No custom URL param found.");
  }
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "GIT_PCB_LOAD_KICAD_URL") {
      automateKiCanvas(event.data.url);
    }
  });
  if (window.parent !== window) {
    window.parent.postMessage({ type: "GIT_PCB_KICANVAS_READY" }, "*");
  }
  function querySelectorDeep(selector, root = document) {
    let element = root.querySelector(selector);
    if (element) return element;
    const walkers = [root];
    while (walkers.length > 0) {
      const current = walkers.shift();
      const children = Array.from(current.querySelectorAll("*"));
      for (const child of children) {
        if (child.shadowRoot) {
          const found = child.shadowRoot.querySelector(selector);
          if (found) return found;
          walkers.push(child.shadowRoot);
        }
      }
    }
    return null;
  }
  function getKiCanvasShadowRoot() {
    const shell = document.querySelector("kc-kicanvas-shell");
    return shell ? shell.shadowRoot : document;
  }
  function automateKiCanvas(url) {
    const attempt = setInterval(() => {
      const root = getKiCanvasShadowRoot();
      const input = root.querySelector('input[type="text"], input[type="url"], input:not([type])') || querySelectorDeep("input");
      const buttons = Array.from(root.querySelectorAll('button, div[role="button"], span'));
      const pasteBtn = buttons.find((b) => {
        const text = (b.textContent || "").toLowerCase();
        return text.includes("paste") || text.includes("github") || text.includes("link");
      });
      if (input) {
        console.log("[Git-PCB] Input found inside Shadow DOM:", input);
        clearInterval(attempt);
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeInputValueSetter.call(input, url);
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
        setTimeout(() => {
          console.log("[Git-PCB] Pressing Enter...");
          input.focus();
          const kEvent = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, composed: true };
          input.dispatchEvent(new KeyboardEvent("keydown", kEvent));
          input.dispatchEvent(new KeyboardEvent("keypress", kEvent));
          input.dispatchEvent(new KeyboardEvent("keyup", kEvent));
          const goBtns = Array.from(root.querySelectorAll("button"));
          const goBtn = goBtns.find((b) => {
            const t = (b.textContent || "").toLowerCase();
            return t.includes("open") || t.includes("load") || t.includes("go") || b.className.includes("primary");
          });
          if (goBtn) goBtn.click();
        }, 200);
      } else if (pasteBtn) {
        console.log("[Git-PCB] Clicking Paste Button inside Shadow DOM");
        pasteBtn.click();
      }
    }, 100);
    setTimeout(() => clearInterval(attempt), 15e3);
  }
})();
