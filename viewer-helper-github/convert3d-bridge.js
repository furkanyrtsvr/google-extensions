(function() {
  console.log("[Git-PCB] Convert3D Bridge Active (v2 - Input Hunter)");
  if (window.parent !== window) {
    window.parent.postMessage({ type: "GIT_PCB_BRIDGE_READY" }, "*");
  }
  const waitForElement = (selector, timeout = 5e3) => {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) return resolve(document.querySelector(selector));
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  };
  window.addEventListener("message", async (event) => {
    if (event.data && event.data.type === "GIT_PCB_LOAD_FILE") {
      const { fileName, fileData } = event.data;
      console.log("[Git-PCB] Received data:", fileName);
      try {
        const response = await fetch(fileData);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        console.log("[Git-PCB] Searching for file inputs...");
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          console.log("[Git-PCB] Found regular input:", fileInput);
          fileInput.files = dataTransfer.files;
          fileInput.dispatchEvent(new Event("change", { bubbles: true }));
          fileInput.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          console.log("[Git-PCB] No file input found immediately. Retrying with observer...");
          const lateInput = await waitForElement('input[type="file"]', 3e3);
          if (lateInput) {
            console.log("[Git-PCB] Found late input:", lateInput);
            lateInput.files = dataTransfer.files;
            lateInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        const possibleDropZones = [
          document.querySelector(".min-h-screen"),
          // Main container from screenshot
          document.querySelector("main"),
          document.body,
          document.documentElement
        ];
        const mkEvent = (type) => new DragEvent(type, {
          dataTransfer,
          bubbles: true,
          cancelable: true,
          view: window,
          composed: true
        });
        possibleDropZones.forEach((zone) => {
          if (zone) {
            console.log("[Git-PCB] Dropping on:", zone);
            zone.dispatchEvent(mkEvent("dragenter"));
            zone.dispatchEvent(mkEvent("dragover"));
            zone.dispatchEvent(mkEvent("drop"));
          }
        });
      } catch (err) {
        console.error("[Git-PCB] Bridge Error:", err);
      }
    }
  });
})();
