const SUPPORTED_EXTENSIONS = [".gbr", ".gtl", ".gbl", ".gbs", ".gbo", ".gto", ".gts", ".gko", ".gm1", ".drl", ".xln", ".txt", ".zip"];
const KICAD_EXTENSIONS = [".kicad_pcb", ".kicad_sch"];
const THREE_D_EXTENSIONS = [".3dm", ".3ds", ".3mf", ".amf", ".bim", ".brep", ".dae", ".fbx", ".fcstd", ".gltf", ".ifc", ".iges", ".step", ".stp", ".stl", ".obj", ".off", ".ply", ".wrl"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".mkv"];
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"];
const EXCEL_EXTENSIONS = [".xlsx", ".xls", ".csv"];
const ALTIUM_EXTENSIONS = [".pcbdoc", ".schdoc", ".prjpcb", ".intlib", ".outjob"];
function injectPreviewButton() {
  const rawBtn = document.querySelector('[data-testid="raw-button"]') || Array.from(document.querySelectorAll("a")).find((b) => b.textContent.trim() === "Raw");
  if (!rawBtn || document.getElementById("git-pcb-preview-btn")) return;
  const rawUrl = rawBtn.href;
  const fileName = rawUrl.split("/").pop().split("?")[0].toLowerCase();
  let buttonText = "Preview PCB";
  let mode = "pcb";
  if (KICAD_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Preview KiCad";
    mode = "kicad";
  } else if (THREE_D_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Preview 3D";
    mode = "3d";
  } else if (VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Play Video";
    mode = "video";
  } else if (AUDIO_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Play Audio";
    mode = "audio";
  } else if (EXCEL_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Preview Excel";
    mode = "excel";
  } else if (ALTIUM_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    buttonText = "Open Altium Viewer >";
    mode = "altium";
  } else if (!SUPPORTED_EXTENSIONS.some((ext) => fileName.endsWith(ext))) {
    return;
  }
  const btn = document.createElement("a");
  btn.id = "git-pcb-preview-btn";
  btn.className = "btn btn-sm btn-primary ml-2";
  btn.textContent = buttonText;
  btn.style = "margin-right:10px; background-color:#238636; color:#fff; cursor:pointer; font-weight:bold; height:28px; display:inline-flex; align-items:center; padding: 0 10px; border-radius: 6px; text-decoration: none; font-size: 12px;";
  btn.onclick = (e) => {
    e.preventDefault();
    if (mode === "altium") {
      alert("Note: You will need to download this file from GitHub and drag it into the Altium Viewer page.");
      window.open("https://www.altium.com/viewer/", "_blank");
      return;
    }
    if (mode === "video") {
      openVideoPreview(rawModelUrl(rawUrl));
      return;
    }
    if (mode === "audio") {
      openAudioPreview(rawUrl);
      return;
    }
    if (mode === "excel") {
      openExcelPreview(rawUrl);
      return;
    }
    if (mode === "kicad") {
      openKiCadPreview();
    } else if (mode === "3d") {
      open3DPreview(rawModelUrl(rawUrl), fileName);
    } else {
      openPCBPreview(rawUrl, fileName);
    }
  };
  rawBtn.parentNode.insertBefore(btn, rawBtn);
}
function rawModelUrl(url) {
  return url;
}
const observer = new MutationObserver(() => {
  injectPreviewButton();
  injectVideoEmbeds();
});
observer.observe(document.body, { childList: true, subtree: true });
injectPreviewButton();
injectVideoEmbeds();
async function openKiCadPreview(rawUrl, fileName) {
  const kicanvasLogo = `<svg width="24" height="24" viewBox="0 0 100 100" style="fill: #ffffff;"><circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff" stroke-width="5"/><path d="M35 30 V70 M35 50 L65 30 M35 50 L65 70" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
  const { statusText, modal } = createBaseModal("KiCanvas", kicanvasLogo);
  addFooterLink(modal, "Powered by KiCanvas - Visit Site", "https://kicanvas.org/");
  statusText.textContent = "Starting KiCanvas...";
  const iframe = modal.querySelector("#git-pcb-iframe");
  const githubPageUrl = window.location.href;
  iframe.src = `https://kicanvas.org/?git_pcb_url=${encodeURIComponent(githubPageUrl)}`;
  iframe.onload = () => {
    statusText.textContent = "Viewing";
    statusText.style.color = "#3fb950";
  };
}
function open3DPreview(rawUrl, fileName) {
  const logo3D = `<svg width="24" height="24" viewBox="0 0 24 24" style="fill: #ffffff;"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5 9.5 9.75 12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>`;
  const { statusText, modal } = createBaseModal("Convert3D", logo3D);
  addFooterLink(modal, "Powered by Convert3D - Visit Site", "https://convert3d.org/");
  statusText.textContent = "Downloading model...";
  fetch(rawUrl).then((r) => r.blob()).then((blob) => {
    statusText.textContent = "Connecting...";
    start3DInjection(blob, fileName, modal, statusText);
  }).catch((err) => {
    statusText.textContent = "Error: " + err.message;
    statusText.style.color = "#f85149";
  });
}
function start3DInjection(blob, fileName, modal, statusText) {
  const iframe = modal.querySelector("#git-pcb-iframe");
  iframe.src = `https://convert3d.org/view`;
  const handleMessage = (event) => {
    if (event.origin !== "https://convert3d.org") return;
    if (event.data && event.data.type === "GIT_PCB_BRIDGE_READY") {
      const reader = new FileReader();
      reader.onload = () => {
        iframe.contentWindow.postMessage({
          type: "GIT_PCB_LOAD_FILE",
          fileName,
          fileData: reader.result
        }, "https://convert3d.org");
        statusText.textContent = "Model Loaded";
        statusText.style.color = "#3fb950";
      };
      reader.readAsDataURL(blob);
      window.removeEventListener("message", handleMessage);
    }
  };
  window.addEventListener("message", handleMessage);
}
function openPCBPreview(rawUrl, fileName) {
  const tracespaceLogo = `<svg width="24" height="24" viewBox="0 0 32 32" style="fill: #ffffff;"><circle cx="16" cy="16" r="14" fill="none" stroke="#ffffff" stroke-width="2"/><circle cx="16" cy="16" r="8" fill="#ffffff"/></svg>`;
  const { overlay, statusText, modal } = createBaseModal("tracespace <strong>view</strong>", tracespaceLogo);
  addFooterLink(modal, "Powered by tracespace - Visit Site", "https://tracespace.io/view/");
  statusText.textContent = "Downloading file...";
  fetch(rawUrl).then((r) => r.blob()).then((blob) => {
    statusText.textContent = "Connecting...";
    startInjection(blob, fileName, overlay, statusText);
  }).catch((err) => {
    statusText.textContent = "Error: " + err.message;
    statusText.style.color = "#f85149";
  });
}
function createBaseModal(title, logoSvg) {
  const modalId = "git-pcb-iframe-overlay";
  let overlay = document.getElementById(modalId);
  if (overlay) document.body.removeChild(overlay);
  overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.7); z-index: 2147483647;
        display: flex; justify-content: center; align-items: center;
        backdrop-filter: blur(4px); font-family: -apple-system, system-ui, sans-serif;
    `;
  const modal = document.createElement("div");
  modal.style = `
        width: 85vw; height: 85vh; background: #fff; border-radius: 12px;
        overflow: hidden; display: flex; flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid #30363d;
    `;
  const header = document.createElement("div");
  header.style = `
        background: #24292e; height: 48px; padding: 0 20px;
        display: flex; justify-content: space-between; align-items: center; color: #fff; flex-shrink: 0;
    `;
  header.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            <div style="display:flex; align-items:center;">${logoSvg}</div>
            <span style="font-weight:600; font-size:14px; letter-spacing: 0.5px; margin-left: 2px;">${title}</span>
            <span id="git-pcb-status" style="font-size:12px; color:#8b949e; margin-left:10px; font-weight: 400;">Preparing...</span>
        </div>
        <button id="git-pcb-close" style="background:none; border:none; color:#8b949e; font-size:32px; cursor:pointer; line-height:1; transition: color 0.2s;">&times;</button>
    `;
  const iframe = document.createElement("iframe");
  iframe.id = "git-pcb-iframe";
  iframe.style = `flex: 1; width: 100%; height: 100%; border: none; background: #fff; display: block;`;
  iframe.allow = "fullscreen";
  iframe.sandbox = "allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation";
  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const statusText = header.querySelector("#git-pcb-status");
  const closeBtn = header.querySelector("#git-pcb-close");
  closeBtn.onclick = () => document.body.removeChild(overlay);
  overlay.onclick = (e) => {
    if (e.target === overlay) document.body.removeChild(overlay);
  };
  const escHandler = (e) => {
    if (e.key === "Escape") {
      if (document.getElementById(modalId)) document.body.removeChild(overlay);
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
  return { overlay, statusText, modal };
}
function addFooterLink(modal, text, url) {
  const footer = document.createElement("div");
  footer.style = `
        height: 28px; background: #f6f8fa; border-top: 1px solid #e1e4e8;
        display: flex; justify-content: center; align-items: center;
        font-size: 11px; color: #57606a; flex-shrink: 0;
    `;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.textContent = text;
  link.style = "text-decoration: none; color: #0969da; font-weight: 500;";
  link.onmouseover = () => link.style.textDecoration = "underline";
  link.onmouseout = () => link.style.textDecoration = "none";
  footer.appendChild(link);
  modal.appendChild(footer);
}
function startInjection(blob, fileName, overlay, statusText) {
  const iframe = overlay.querySelector("#git-pcb-iframe");
  iframe.src = `https://tracespace.io/view/`;
  const handleMessage = (event) => {
    if (event.origin !== "https://tracespace.io") return;
    if (event.data.type === "GIT_PCB_BRIDGE_READY") {
      const reader = new FileReader();
      reader.onload = () => {
        iframe.contentWindow.postMessage({
          type: "GIT_PCB_LOAD_FILE",
          fileName,
          fileData: reader.result
        }, "https://tracespace.io");
        statusText.textContent = "Viewing";
        statusText.style.color = "#3fb950";
      };
      reader.readAsDataURL(blob);
      window.removeEventListener("message", handleMessage);
    }
  };
  window.addEventListener("message", handleMessage);
}
function openVideoPreview(rawUrl, fileName) {
  const videoLogo = `<svg width="24" height="24" viewBox="0 0 24 24" style="fill: #ffffff;"><path d="M8 5v14l11-7z"/></svg>`;
  const { statusText, modal } = createBaseModal("Video Player", videoLogo);
  statusText.textContent = "Opening player...";
  const iframe = modal.querySelector("#git-pcb-iframe");
  iframe.style.display = "block";
  let targetUrl = rawUrl;
  if (targetUrl.includes("github.com") && targetUrl.includes("/blob/")) {
    targetUrl = targetUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  const extensionViewerURL = chrome.runtime.getURL("viewer.html") + "?type=video&url=" + encodeURIComponent(targetUrl);
  iframe.src = extensionViewerURL;
  iframe.onload = () => {
    statusText.textContent = "";
  };
}
function openAudioPreview(rawUrl, fileName) {
  const audioLogo = `<svg width="24" height="24" viewBox="0 0 24 24" style="fill: #ffffff;"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>`;
  const { statusText, modal } = createBaseModal("Audio Player", audioLogo);
  modal.style.width = "600px";
  modal.style.height = "320px";
  modal.style.maxHeight = "80vh";
  statusText.textContent = "Downloading audio...";
  const iframe = modal.querySelector("#git-pcb-iframe");
  iframe.style.display = "block";
  let targetUrl = rawUrl;
  if (targetUrl.includes("github.com") && targetUrl.includes("/blob/")) {
    targetUrl = targetUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  const extensionViewerURL = chrome.runtime.getURL("viewer.html") + "?type=audio&url=" + encodeURIComponent(targetUrl);
  iframe.src = extensionViewerURL;
  iframe.onload = () => {
    statusText.textContent = "";
  };
}
function openExcelPreview(rawUrl, fileName) {
  const excelLogo = `<svg width="24" height="24" viewBox="0 0 24 24" style="fill: #ffffff;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>`;
  const { statusText, modal } = createBaseModal("Excel Preview", excelLogo);
  modal.style.width = "90vw";
  modal.style.height = "90vh";
  statusText.textContent = "Downloading spreadsheet...";
  const iframe = modal.querySelector("#git-pcb-iframe");
  iframe.style.display = "block";
  let targetUrl = rawUrl;
  if (targetUrl.includes("github.com") && targetUrl.includes("/blob/")) {
    targetUrl = targetUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  }
  const extensionViewerURL = chrome.runtime.getURL("viewer.html") + "?type=excel&url=" + encodeURIComponent(targetUrl);
  iframe.src = extensionViewerURL;
  iframe.onload = () => {
    statusText.textContent = "";
  };
}
function injectVideoEmbeds() {
  const links = document.querySelectorAll('.markdown-body a[href$=".mp4"], .markdown-body a[href$=".webm"], .markdown-body a[href$=".mp3"], .markdown-body a[href$=".wav"], .markdown-body a[href$=".ogg"], .markdown-body a[href$=".m4a"], .markdown-body a[href$=".aac"], .markdown-body a[href$=".flac"]');
  links.forEach((link) => {
    const nextEl = link.nextElementSibling;
    const isPlayer = nextEl && nextEl.tagName === "IFRAME" && nextEl.dataset.gitPcb === "inline-player-" + link.href;
    const isButton = nextEl && nextEl.classList.contains("git-pcb-video-play");
    if (isButton || isPlayer) return;
    const isAudio = AUDIO_EXTENSIONS.some((ext) => link.href.endsWith(ext));
    const playSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M8 5v14l11-7z"/></svg>`;
    const musicSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/></svg>`;
    const closeSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="white"><path d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59 7.11 5.7a.996.996 0 1 0-1.41 1.41L10.59 12 5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>`;
    const iconHtml = isAudio ? musicSvg : playSvg;
    const playBtn = document.createElement("button");
    playBtn.className = "git-pcb-video-play";
    playBtn.innerHTML = iconHtml;
    playBtn.style = `
      margin-left: 8px; background: #238636;  color: white; border: none; border-radius: 50%; 
      width: 24px; height: 24px; cursor: pointer; display: inline-flex; justify-content: center; align-items: center; 
      vertical-align: middle; transform: translateY(-1px); transition: background 0.2s, transform 0.1s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    `;
    playBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const uniqueId = "inline-player-" + link.href;
      const existingPlayer = document.querySelector(`iframe[data-git-pcb="${uniqueId}"]`);
      if (existingPlayer) {
        existingPlayer.remove();
        playBtn.innerHTML = iconHtml;
        playBtn.style.backgroundColor = "#238636";
        playBtn.title = "Play";
        return;
      }
      let rawUrl = link.href.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
      const typeParam = isAudio ? "audio" : "video";
      const viewerUrl = chrome.runtime.getURL("viewer.html") + `?type=${typeParam}&url=` + encodeURIComponent(rawUrl);
      const iframe = document.createElement("iframe");
      iframe.dataset.gitPcb = uniqueId;
      iframe.src = viewerUrl;
      const height = isAudio ? "130px" : "450px";
      iframe.style = `width: 100%; max-width: 800px; height: ${height}; border: none; margin-top: 10px; display: block; background: #0d1117; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
      link.parentNode.insertBefore(iframe, playBtn.nextSibling);
      playBtn.innerHTML = closeSvg;
      playBtn.style.backgroundColor = "#57606a";
      playBtn.title = "Close";
    };
    link.parentNode.insertBefore(playBtn, link.nextSibling);
  });
}
