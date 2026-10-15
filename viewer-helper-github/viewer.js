// viewer.js
const params = new URLSearchParams(window.location.search);
const url = params.get('url');
const type = params.get('type');
const statusDiv = document.getElementById('status');
let currentWorkbook = null;

// Helper: Common Fetch Function
function fetchAndPlayMedia(mediaType) {
    let msg = "Downloading...";
    if (mediaType === 'video') msg = "Downloading video...";
    else if (mediaType === 'audio') msg = "Downloading audio...";
    else if (mediaType === 'excel') msg = "Downloading spreadsheet...";

    statusDiv.textContent = msg + " (Depends on internet speed)";
    statusDiv.style.display = 'block';

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.blob();
        })
        .then(async blob => {
            statusDiv.style.display = 'none';

            if (mediaType === 'excel') {
                try {
                    const data = await blob.arrayBuffer();
                    currentWorkbook = XLSX.read(data, { type: 'array' });
                    const excelWrapper = document.getElementById('excel-wrapper');
                    excelWrapper.style.display = 'flex';
                    document.body.style.backgroundColor = '#fff';
                    renderTabs(currentWorkbook.SheetNames);
                    if (currentWorkbook.SheetNames.length > 0) {
                        renderSheet(currentWorkbook.SheetNames[0]);
                    }
                } catch (e) {
                    throw new Error("Failed to parse Excel file: " + e.message);
                }
                return;
            }

            const media = document.createElement(mediaType);
            media.controls = true;
            media.autoplay = true;

            if (mediaType === 'video') {
                media.style.width = "100vw";
                media.style.height = "100vh";
                media.style.objectFit = "contain";
                media.style.backgroundColor = "#000";
                document.body.style.backgroundColor = "#000";
                document.body.style.display = "block";
            } else {
                // Audio Styling - MORE COMPACT
                media.style.width = "100%";
                media.style.maxWidth = "500px";
                media.style.height = "40px";
                media.style.borderRadius = "20px";
                document.body.style.display = "flex";
                document.body.style.backgroundColor = "#0d1117";
                document.body.style.flexDirection = "column";
                document.body.style.justifyContent = "center";
                document.body.style.alignItems = "center";
                document.body.style.padding = "10px";
            }

            if (mediaType === 'audio') {
                const icon = document.createElement('div');
                icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="#8b949e"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
                icon.style.marginBottom = "5px";
                document.body.appendChild(icon);
            }

            media.src = URL.createObjectURL(blob);
            document.body.appendChild(media);
        })
        .catch(err => {
            statusDiv.className = 'error';
            statusDiv.textContent = "Error: " + err.message;
            statusDiv.style.display = 'block';
            console.error("Media Fetch Error:", err);
        });
}

function renderSheet(sheetName) {
    if (!currentWorkbook) return;
    const ws = currentWorkbook.Sheets[sheetName];
    const container = document.getElementById('excel-container');
    container.innerHTML = '';
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    if (!ws['!ref']) {
        container.textContent = "Empty Sheet";
        return;
    }
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
        const tr = document.createElement('tr');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const td = document.createElement('td');
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellRef];
            if (cell) {
                td.textContent = (cell.w !== undefined) ? cell.w : (cell.v !== undefined ? cell.v : '');
            }
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
    document.querySelectorAll('.sheet-tab').forEach(tab => {
        if (tab.textContent === sheetName) tab.classList.add('active');
        else tab.classList.remove('active');
    });
}

function renderTabs(names) {
    const bar = document.getElementById('sheet-bar');
    bar.innerHTML = '';
    names.forEach(name => {
        const btn = document.createElement('div');
        btn.className = 'sheet-tab';
        btn.textContent = name;
        btn.onclick = () => renderSheet(name);
        bar.appendChild(btn);
    });
}

if (!url) {
    statusDiv.textContent = "URL not found.";
}
else if (type === 'video') {
    fetchAndPlayMedia('video');
}
else if (type === 'audio') {
    fetchAndPlayMedia('audio');
}
else if (type === 'excel') {
    fetchAndPlayMedia('excel');
}
else {
    statusDiv.style.display = 'none';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    document.body.appendChild(iframe);
}
