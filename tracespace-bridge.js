(function() {
  console.log("[Git-PCB] Tracespace Binary Bridge Active");
  if (window.parent !== window) {
    window.parent.postMessage({ type: "GIT_PCB_BRIDGE_READY" }, "https://github.com");
  }
  window.addEventListener("message", async (event) => {
    if (event.origin !== "https://github.com") return;
    if (event.data && event.data.type === "GIT_PCB_LOAD_FILE") {
      const { fileName, fileData } = event.data;
      console.log("[Git-PCB] Received binary data for:", fileName);
      try {
        const response = await fetch(fileData);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type || "application/zip" });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        const dropEvent = new DragEvent("drop", {
          dataTransfer,
          bubbles: true,
          cancelable: true
        });
        Object.defineProperty(dropEvent, "dataTransfer", { value: dataTransfer });
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        if (fileInputs.length > 0) {
          console.log("[Git-PCB] Found file input, injecting file directly");
          fileInputs.forEach((input) => {
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        } else {
          console.log("[Git-PCB] No file input found, trying drop simulation");
          const target = document.querySelector("main") || document.body;
          target.dispatchEvent(dropEvent);
        }
        console.log("[Git-PCB] Injection sequence completed.");
      } catch (err) {
        console.error("[Git-PCB] Bridge Error:", err);
      }
    }
  });
})();
