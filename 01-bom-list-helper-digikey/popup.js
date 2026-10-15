// Core Data
let currentProject = 'Default Project';
let allProjects = {};
let visibleCols = [];
let allPossibleCols = [];

const CORE_COLUMNS = [
    { id: 'img', name: 'Image', width: '60px' },
    { id: 'partNumber', name: 'Part Number', width: '120px' },
    { id: 'manufacturer', name: 'Manufacturer', width: '120px' },
    { id: 'description', name: 'Description', width: 'auto' },
    { id: 'quantity', name: 'Qty', width: '50px' },
    { id: 'unitPrice', name: 'Unit Price', width: '80px' },
    { id: 'totalPrice', name: 'Total', width: '80px' },
    { id: 'productUrl', name: 'DigiKey Link', width: '100px' },
    { id: 'datasheet', name: 'Datasheet', width: '70px' },
    { id: 'datasheetLink', name: 'Datasheet Link', width: '90px' },
    { id: 'note', name: 'Note', width: '100px' }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Theme logic
    chrome.storage.local.get(['currentTheme'], (res) => {
        if (res.currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.currentTheme) {
            if (changes.currentTheme.newValue === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });

    await loadData();
    initTabs();
    initDnD();

    document.getElementById('project-select').addEventListener('change', (e) => {
        currentProject = e.target.value;
        chrome.storage.local.set({ lastProject: currentProject });
        renderTable(true);
    });

    document.getElementById('btn-export').addEventListener('click', exportXLS);
    document.getElementById('btn-clear').addEventListener('click', clearList);
    document.getElementById('btn-delete-project').addEventListener('click', deleteProject);
    document.getElementById('btn-save-cols').addEventListener('click', saveSettings);
    document.getElementById('btn-save-export').addEventListener('click', saveExportSettings);

    // Restore backup handlers
    document.getElementById('btn-restore-backup').addEventListener('click', () => {
        document.getElementById('restore-file-input').click();
    });
    document.getElementById('restore-file-input').addEventListener('change', restoreFromBackup);

    renderTable(true);
});

async function loadData() {
    return new Promise(resolve => {
        chrome.storage.local.get(['projects', 'settings', 'lastProject'], (res) => {
            allProjects = res.projects || { 'Default Project': [] };
            if (res.lastProject && allProjects[res.lastProject]) {
                currentProject = res.lastProject;
            }
            const select = document.getElementById('project-select');
            select.innerHTML = '';
            Object.keys(allProjects).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                select.appendChild(opt);
            });
            select.value = currentProject;

            discoverAllColumns();

            if (res.settings && res.settings.visibleCols && res.settings.visibleCols.length > 0) {
                visibleCols = res.settings.visibleCols;
            } else {
                visibleCols = CORE_COLUMNS.map(c => c.id);
            }

            // Load Export Settings (Values)
            const subfolderInput = document.getElementById('input-subfolder');
            const autoUpdateChk = document.getElementById('chk-auto-update');
            const dlDatasheetsChk = document.getElementById('chk-dl-datasheets');
            const dlImagesChk = document.getElementById('chk-dl-images');
            const autoZoomChk = document.getElementById('chk-auto-zoom');
            const zoomLevelInput = document.getElementById('input-zoom-level');
            const zoomControls = document.getElementById('zoom-controls');

            // Set Values from result or defaults
            const s = res.settings || {};
            if (subfolderInput) subfolderInput.value = s.subfolder || 'DigiKey_Backups';
            if (autoUpdateChk) autoUpdateChk.checked = s.autoUpdate || false;
            if (dlDatasheetsChk) dlDatasheetsChk.checked = s.downloadDatasheets || false;
            if (dlImagesChk) dlImagesChk.checked = s.downloadImages || false;

            if (autoZoomChk) {
                autoZoomChk.checked = s.autoZoom || false;
                if (zoomControls) {
                    zoomControls.style.display = s.autoZoom ? 'flex' : 'none';
                }
            }
            if (zoomLevelInput) {
                zoomLevelInput.value = s.customZoomLevel || 90;
            }

            // ATTACH LISTENERS (Moved outside conditional)
            if (autoZoomChk) {
                autoZoomChk.addEventListener('change', () => {
                    if (zoomControls) zoomControls.style.display = autoZoomChk.checked ? 'flex' : 'none';
                });
            }

            // Force Theme Check from Active Tab (Robustness)
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_THEME' }, (response) => {
                        if (chrome.runtime.lastError) return; // Ignore if content script not ready
                        if (response && response.theme === 'dark') {
                            document.body.classList.add('dark-mode');
                        }
                    });
                }
            });

            resolve();
        });
    });
}

function discoverAllColumns() {
    const rawSet = new Set();
    // Attribute keys to filter out (duplicates of CORE_COLUMNS or unwanted)
    const FILTER_OUT = ['Datasheets', 'Datasheet', 'Image', 'img', 'datasheetUrl', 'imageUrl', 'productUrl'];

    CORE_COLUMNS.forEach(c => rawSet.add(c.id));
    Object.values(allProjects).forEach(items => {
        items.forEach(item => {
            if (item.attributes) {
                Object.keys(item.attributes).forEach(key => {
                    if (!FILTER_OUT.includes(key)) {
                        rawSet.add(key);
                    }
                });
            }
        });
    });
    allPossibleCols = Array.from(rawSet);
}

function initTabs() {
    const tabs = document.querySelectorAll('.nav-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            if (btn.dataset.tab === 'tab-settings') renderDnD();
        });
    });
}

function renderTable(scrollToBottom = false) {
    const tableHead = document.querySelector('#bom-table thead');
    const tableBody = document.querySelector('#bom-table tbody');
    const totalSpan = document.getElementById('total-cost');

    let headHtml = '<tr><th>No.</th>';
    visibleCols.forEach(colId => {
        const core = CORE_COLUMNS.find(c => c.id === colId);
        const name = core ? core.name : colId;
        headHtml += `<th>${name}</th>`;
    });
    headHtml += '<th>Action</th></tr>';
    tableHead.innerHTML = headHtml;

    const items = allProjects[currentProject] || [];
    tableBody.innerHTML = '';

    let grandTotal = 0;

    items.forEach((item, index) => {
        grandTotal += (item.totalPrice || 0);
        const tr = document.createElement('tr');

        // Check stock status - only highlight if stock data EXISTS and is exceeded
        const availableStock = item.qtyAvailable;
        const isInsufficientStock = (availableStock !== undefined && item.quantity > availableStock);

        // No. Column
        const noTd = document.createElement('td');
        noTd.innerText = index + 1;
        tr.appendChild(noTd);

        visibleCols.forEach(colId => {
            const td = document.createElement('td');

            if (colId === 'img') {
                // DOM-based Image Creation (CSP Safe & Referrer Policy)
                if (item.imageUrl) {
                    const img = document.createElement('img');
                    img.src = item.imageUrl;
                    img.referrerPolicy = 'no-referrer'; // Fix Hotlink Protection

                    Object.assign(img.style, {
                        width: '28px',
                        height: '28px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        border: '1px solid #eee',
                        background: '#f5f5f5',
                        display: 'block'
                    });

                    img.onerror = () => {
                        img.remove();
                        const ph = document.createElement('span');
                        ph.textContent = '📷';
                        Object.assign(ph.style, {
                            display: 'flex', width: '28px', height: '28px',
                            background: '#f0f0f0', borderRadius: '4px',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', color: '#999'
                        });
                        td.appendChild(ph);
                    };

                    td.appendChild(img);
                } else {
                    const ph = document.createElement('span');
                    ph.textContent = '-';
                    Object.assign(ph.style, {
                        display: 'flex', width: '28px', height: '28px',
                        background: '#f0f0f0', borderRadius: '4px',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', color: '#999'
                    });
                    td.appendChild(ph);
                }
            } else if (colId === 'datasheetLink' && item.datasheetUrl) {
                // Datasheet Link (Popup List) - Use DigiKey's Datasheet URL directly
                const a = document.createElement('a');
                a.href = item.datasheetUrl;
                a.target = '_blank';
                a.innerHTML = '🔗';
                a.title = item.datasheetUrl;
                a.style.textDecoration = 'none';
                a.style.fontSize = '1.2em';
                a.onclick = (e) => e.stopPropagation();

                td.style.textAlign = 'center';
                td.appendChild(a);
            } else {
                let val = getValue(item, colId);
                // Highlight quantity if insufficient stock
                const qtyVal = Number(item.quantity) || 0;
                const stockVal = Number(item.qtyAvailable);

                // Check robust logic: Treat NaN/undefined stock as 0
                const isInsufficient = (qtyVal > (isNaN(stockVal) ? 0 : stockVal));

                if (colId === 'quantity' && isInsufficient) {
                    td.style.setProperty('color', 'red', 'important');
                    td.style.setProperty('font-weight', 'bold', 'important');
                    td.style.backgroundColor = 'transparent';
                }
                td.innerHTML = val;
            }
            tr.appendChild(td);
        });

        // Action Column (Fixed Missing Definition)
        const actionTd = document.createElement('td');
        actionTd.style.textAlign = 'center';
        actionTd.style.whiteSpace = 'nowrap';
        // HTML does not support gap for non-flex/grid, so we use margin on buttons

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit Quantity';
        editBtn.style.background = 'none';
        editBtn.style.border = 'none';
        editBtn.style.cursor = 'pointer';
        editBtn.style.fontSize = '1.2em';
        editBtn.style.color = '#333';
        editBtn.style.marginRight = '8px'; // Spacing
        editBtn.onclick = () => editItem(index);

        const delBtn = document.createElement('button');
        delBtn.innerHTML = '✕';
        delBtn.title = 'Remove Item';
        delBtn.style.background = 'none';
        delBtn.style.border = 'none';
        delBtn.style.cursor = 'pointer';
        delBtn.style.color = '#cc0000';
        delBtn.style.fontWeight = 'bold';
        delBtn.style.fontSize = '1.2em';
        delBtn.onclick = () => removeItem(index);

        actionTd.appendChild(editBtn);
        actionTd.appendChild(delBtn);

        tr.appendChild(actionTd);
        tableBody.appendChild(tr);
    });

    if (items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${visibleCols.length + 2}" style="text-align:center; padding: 20px;">List is empty.</td></tr>`;
    }

    totalSpan.innerText = formatMoney(grandTotal, 2);

    if (scrollToBottom) {
        const container = document.querySelector('.table-container');
        if (container) {
            // Use setTimeout to ensure DOM render cycle completes
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }
}

function getValue(item, colId) {
    if (colId === 'img') {
        if (item.imageUrl) {
            return `<img src="${item.imageUrl}" style="width:28px; height:28px; object-fit:contain; border-radius:4px; background:#f5f5f5;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><span style="display:none; width:28px; height:28px; background:#f0f0f0; border-radius:4px; align-items:center; justify-content:center; font-size:10px; color:#999;">📷</span>`;
        }
        return '<span style="display:flex; width:28px; height:28px; background:#f0f0f0; border-radius:4px; align-items:center; justify-content:center; font-size:10px; color:#999;">-</span>';
    }

    // Logic for NP
    if (colId === 'unitPrice') {
        if (!item.unitPrice || item.unitPrice === 0) return '<span style="color:red;font-weight:bold;">NP</span>';
        return formatMoney(item.unitPrice, 5);
    }
    if (colId === 'totalPrice') {
        if (!item.totalPrice || item.totalPrice === 0) return 'NP';
        return formatMoney(item.totalPrice, 2);
    }

    if (colId === 'partNumber') return item.attributes?.['DigiKey Part Number'] || item.productName;

    if (item[colId] !== undefined) return item[colId];
    if (item.attributes && item.attributes[colId] !== undefined) return item.attributes[colId];

    return '-';
}

function formatMoney(amount, decimals) {
    if (amount === undefined || amount === null) return '-';
    if (decimals) {
        return '$' + parseFloat(amount).toFixed(decimals);
    }
    return '$' + amount;
}

function renderDnD() {
    const visibleList = document.getElementById('visible-list');
    const hiddenList = document.getElementById('hidden-list');
    visibleList.innerHTML = '';
    hiddenList.innerHTML = '';
    visibleCols.forEach(colId => createDnDItem(colId, visibleList));
    allPossibleCols.forEach(colId => {
        if (!visibleCols.includes(colId)) createDnDItem(colId, hiddenList);
    });
}

function createDnDItem(colId, parent) {
    const div = document.createElement('div');
    div.className = 'dnd-item';
    div.draggable = true;
    div.dataset.id = colId;
    const core = CORE_COLUMNS.find(c => c.id === colId);
    const name = core ? core.name : colId;
    div.innerHTML = `<span>${name}</span> <span style="color:#ccc">☰</span>`;
    div.addEventListener('dragstart', () => div.classList.add('dragging'));
    div.addEventListener('dragend', () => div.classList.remove('dragging'));
    parent.appendChild(div);
}

function initDnD() {
    const containers = document.querySelectorAll('.dnd-list');
    containers.forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const draggable = document.querySelector('.dragging');
            if (afterElement) container.insertBefore(draggable, afterElement);
            else container.appendChild(draggable);
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.dnd-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveSettings() {
    const visibleList = document.getElementById('visible-list');
    const newOrder = [];
    visibleList.querySelectorAll('.dnd-item').forEach(item => {
        newOrder.push(item.dataset.id);
    });
    visibleCols = newOrder;

    // Merge with existing settings to preserve other values
    chrome.storage.local.get(['settings'], (res) => {
        const settings = res.settings || {};
        settings.visibleCols = newOrder;
        chrome.storage.local.set({ settings }, () => {
            showToast('Column Preferences Saved');
        });
    });
    renderTable();
}

// Helper for Custom Modal
function showConfirmModal(title, msg, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const h3 = modal.querySelector('h3');
    const p = modal.querySelector('p');
    const btnYes = document.getElementById('modal-btn-yes');
    const btnNo = document.getElementById('modal-btn-no');

    h3.innerText = title;
    p.innerText = msg;
    modal.style.display = 'flex';

    const handleYes = () => {
        onConfirm();
        closeModal();
    };

    const handleNo = () => {
        closeModal();
    };

    function closeModal() {
        modal.style.display = 'none';
        btnYes.removeEventListener('click', handleYes);
        btnNo.removeEventListener('click', handleNo);
    }

    btnYes.addEventListener('click', handleYes);
    btnNo.addEventListener('click', handleNo);
}

function removeItem(index) {
    showConfirmModal('Delete Item?', 'Are you sure you want to remove this item?', () => {
        allProjects[currentProject].splice(index, 1);
        chrome.storage.local.set({ projects: allProjects });
        renderTable();
    });
}

function editItem(index) {
    const item = allProjects[currentProject][index];
    const modal = document.getElementById('edit-modal');
    const input = document.getElementById('edit-qty-input');
    const btnSave = document.getElementById('modal-btn-save-edit');
    const btnCancel = document.getElementById('modal-btn-cancel-edit');

    // Init Modal
    input.value = item.quantity;
    modal.style.display = 'flex';
    input.focus();

    const handleSave = () => {
        let newQty = parseInt(input.value);
        if (newQty > 0) {
            // Update Item
            item.quantity = newQty;
            item.totalPrice = item.unitPrice * newQty;

            // Recalculate Unit Price based on breaks if available (optional but good)
            // But we don't have priceBreaks stored in 'item' properly to re-calc unit price dynamically
            // unless we stored ALL price breaks. 
            // In v1.2 scraping, we only store final calculated values.
            // If we want dynamic re-calc, we need to scrape/store priceBreaks in item.
            // For now, we keep unit price fixed or just update total.
            // Wait, let's just update total based on existing unit price.

            allProjects[currentProject][index] = item;
            chrome.storage.local.set({ projects: allProjects });
            renderTable();
            closeModal();
        } else {
            alert("Quantity must be > 0");
        }
    };

    const handleCancel = () => {
        closeModal();
    };

    function closeModal() {
        modal.style.display = 'none';
        btnSave.removeEventListener('click', handleSave);
        btnCancel.removeEventListener('click', handleCancel);
    }

    btnSave.addEventListener('click', handleSave);
    btnCancel.addEventListener('click', handleCancel);
}

function clearList() {
    showConfirmModal('Clear List?', 'This will remove all items in the current project. Continue?', () => {
        allProjects[currentProject] = [];
        chrome.storage.local.set({ projects: allProjects });
        renderTable();
    });
}

function deleteProject() {
    showConfirmModal('Delete Project?', `Are you sure you want to delete "${currentProject}"?`, () => {
        delete allProjects[currentProject];
        // If no projects left, create default
        if (Object.keys(allProjects).length === 0) {
            allProjects['Default Project'] = [];
            chrome.storage.local.set({ projects: allProjects, lastProject: 'Default Project' });
        } else {
            // Pick another project
            const keys = Object.keys(allProjects);
            chrome.storage.local.set({ projects: allProjects, lastProject: keys[0] });
        }
        location.reload();
    });
}

async function exportXLS() {
    const items = allProjects[currentProject] || [];
    if (items.length === 0) { alert('Empty list!'); return; }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(currentProject);

    // 1. Setup Columns
    const columns = [
        { header: 'No.', key: 'no', width: 5 }
    ];

    visibleCols.forEach(colId => {
        const c = CORE_COLUMNS.find(x => x.id === colId);
        const headerName = c ? c.name : colId;
        // Default width equivalent to char count approx
        let width = 15;
        if (colId === 'description') width = 45;
        if (colId === 'manufacturer') width = 25;
        if (colId === 'partNumber') width = 20;
        if (colId === 'img') width = 18; // approx 128px wide
        columns.push({ header: headerName, key: colId, width: width });
    });

    worksheet.columns = columns;

    // 2. Add Data & Process Images
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowIndex = i + 2; // 1-based, +1 for header
        const rowData = { no: i + 1 };

        const availableStock = item.qtyAvailable;
        // Only mark as insufficient if stock data EXISTS and quantity exceeds it
        const isInsufficientStock = (availableStock !== undefined && item.quantity > availableStock);
        const isNP = (!item.unitPrice || item.unitPrice === 0);

        // Fill Row Data
        visibleCols.forEach(colId => {
            let val = getValue(item, colId);

            // For Image column, we don't put text, just placeholder or empty
            if (colId === 'img') val = '';

            // Text Cleaning
            if (typeof val === 'string') {
                val = val.replace(/<[^>]*>?/gm, '');
            }
            rowData[colId] = val;
        });

        const row = worksheet.addRow(rowData);

        // height for image row (128px is approx 96 points? Excel row height is in points. 1px = 0.75pt. 128px = 96pt)
        row.height = 96;
        // Vertical align
        row.alignment = { vertical: 'middle', horizontal: 'left' };

        // Styling & Images
        const cellNo = row.getCell(1);
        cellNo.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cellNo.alignment = { horizontal: 'center', vertical: 'middle' };

        let colIndex = 1; // 'No.' is 1
        visibleCols.forEach((colId) => {
            colIndex++; // Move to next column
            const cell = row.getCell(colIndex);

            // Add Border to ALL cells - RE-ADDED per user request
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Alignment: Center All (User Request)
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            // Conditional Formatting
            if (isNP && (colId === 'unitPrice' || colId === 'totalPrice')) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow
            }
            // Stronger check for Manual Excel
            const qtyVal = Number(item.quantity) || 0;
            const stockVal = Number(item.qtyAvailable);
            const isInsufficient = (qtyVal > (isNaN(stockVal) ? 0 : stockVal));

            if (colId === 'quantity' && isInsufficient) {
                // User Request: Red Text ONLY (No Yellow Fill)
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }

            // DATASHEET LINK LOGIC (User Request: Link or X)
            if (colId === 'datasheet') {
                if (item.datasheetFilename) {
                    const localPath = `Datasheets/${item.datasheetFilename}`;
                    cell.value = { text: '✓', hyperlink: localPath, tooltip: 'Open Local PDF' };
                    cell.font = { color: { argb: 'FF0000FF' }, bold: true, size: 14 };
                } else {
                    cell.value = 'X';
                    // User Request: White Background, Blue Bold X
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White Fill
                    cell.font = { color: { argb: 'FF0000FF' }, bold: true, size: 12 }; // Blue Text
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                }
            }

            // Datasheet Link (Online URL) - Use DigiKey's Datasheet URL directly
            if (colId === 'datasheetLink' && item.datasheetUrl) {
                cell.value = { text: '🔗', hyperlink: item.datasheetUrl, tooltip: 'Open Online Datasheet' };
                cell.font = { color: { argb: 'FF0066CC' }, bold: true, size: 14 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }

            // Image Handler
            if (colId === 'img' && item.imageUrl) {
                try {
                    // Fetch Image
                    // We must wait for this loop, so we assume network is fast enough or show spinner
                    // Since we can't show spinner easily insync without blocking UI, we just await.
                    // Ideally we should use Promise.all for speed but sequential is safer for now.

                    // Note: If URL is missing, skip
                    // Note: If URL is missing, skip
                    // Removed Hyperlink setting on cell to avoid JSON text glitch
                    // Images will overlay this cell.

                    // We need to fetch the image to embed it
                    // NOTE: This fetch relies on valid CORS or host permissions
                } catch (e) { console.error('Image Error', e); }
            }
        });
    }

    // Second Loop for Async Images to not block row creation logic if desired, 
    // but simpler to do it now. 
    // Correction: I cannot await inside the forEach effectively for the whole function to wait.
    // So I will use a standard for loop for columns or just handle images in the main loop.

    // Let's re-do the image part correctly inside the main loop
    // Re-iterating to handle async image fetching properly
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowIndex = i + 2;

        // Find which column is 'img'
        const imgColIndex = visibleCols.indexOf('img');
        if (imgColIndex !== -1 && item.imageUrl) {
            try {
                // Ensure URL is absolute and has protocol
                let imgUrl = item.imageUrl;
                if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

                const response = await fetch(imgUrl);
                const blob = await response.blob();

                let buffer;
                let ext = 'png';

                // Convert WebP to PNG if necessary
                if (blob.type === 'image/webp' || item.imageUrl.endsWith('.webp')) {
                    buffer = await convertWebPToPng(blob);
                    ext = 'png';
                } else {
                    buffer = await blob.arrayBuffer();
                    if (blob.type === 'image/jpeg') ext = 'jpeg';
                    else if (blob.type === 'image/png') ext = 'png';
                    else if (blob.type === 'image/gif') ext = 'gif';
                }

                const imageId = workbook.addImage({
                    buffer: buffer,
                    extension: ext,
                });

                // colIndex in worksheet is imgColIndex + 2 (1 for 0-index, +1 for 'No.' col)
                // worksheet.addImage uses 0-based col/row index
                // 'No.' is col 0. 'img' is at imgColIndex+1.

                worksheet.addImage(imageId, {
                    tl: { col: imgColIndex + 1 + 0.1, row: rowIndex - 1 + 0.1 }, // slight offset
                    ext: { width: 120, height: 120 },
                    editAs: 'oneCell'
                });
            } catch (err) {
                console.error("Failed to load image for " + item.partNumber, err);
            }
        }
    }

    // 3. Auto-Width Adjustment (Manual logic or per column)
    // ExcelJS columns have width set, but we can refine

    // 4. Write File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    // Save using chrome.downloads to manage folder structure
    chrome.storage.local.get(['settings'], (res) => {
        const subfolder = (res.settings && res.settings.subfolder) || 'DigiKey_Backups';
        const filename = `${subfolder}/${currentProject}/${currentProject}_BOM.xlsx`;

        chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                const fallbackLink = document.createElement('a');
                fallbackLink.href = url;
                fallbackLink.download = `${currentProject}_BOM.xlsx`;
                fallbackLink.click();
            } else {
                console.log("Download started with ID:", downloadId);
            }
        });
    });
}

function convertWebPToPng(webpBlob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(webpBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // User requested 128x128 format
            canvas.width = 128;
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            // Draw image scaled to 128x128
            ctx.drawImage(img, 0, 0, 128, 128);

            canvas.toBlob((blob) => {
                if (blob) {
                    blob.arrayBuffer().then(resolve).catch(reject);
                } else {
                    reject(new Error("Canvas conversion failed"));
                }
            }, 'image/png');
            URL.revokeObjectURL(url);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Image load failed"));
        };
        img.src = url;
    });
}

// --- Folder Selection Helpers ---
function selectBackupFolder() {
    // Must open as regular tab for File System Access API to work
    chrome.tabs.create({ url: chrome.runtime.getURL('folder_picker.html') });
}

function checkSavedFolder() {
    // Check if we have a saved folder name
    chrome.storage.local.get(['backupFolderName'], (res) => {
        const btn = document.getElementById('btn-select-dir');
        if (btn && res.backupFolderName) {
            btn.querySelector('svg').style.stroke = '#28a745';
            btn.title = `Backup Folder: ${res.backupFolderName}`;
        }
    });
}

function saveExportSettings() {
    const subfolder = document.getElementById('input-subfolder').value.trim() || 'DigiKey_Backups';
    const autoUpdate = document.getElementById('chk-auto-update').checked;
    const downloadDatasheets = document.getElementById('chk-dl-datasheets').checked;
    const downloadImages = document.getElementById('chk-dl-images').checked;
    const autoZoom = document.getElementById('chk-auto-zoom').checked;
    const customZoomLevel = parseInt(document.getElementById('input-zoom-level').value) || 90;

    chrome.storage.local.get(['settings'], (res) => {
        const settings = res.settings || {};
        settings.subfolder = subfolder;
        settings.autoUpdate = autoUpdate;
        settings.downloadDatasheets = downloadDatasheets;
        settings.downloadImages = downloadImages;
        settings.autoZoom = autoZoom;
        settings.customZoomLevel = customZoomLevel;

        chrome.storage.local.set({ settings }, () => {
            showToast('Settings Saved');
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('toast-notification');
    const msgSpan = document.getElementById('toast-message');
    if (toast && msgSpan) {
        msgSpan.innerText = message;
        toast.style.display = 'flex';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 2000);
    }
}

// Open Chrome Settings Helper
document.addEventListener('click', (e) => {
    const link = e.target.closest('#link-browser-settings');
    if (link) {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://settings/downloads' });
    }
});

// Privacy Toggle
const privacyToggle = document.getElementById('privacy-toggle');
if (privacyToggle) {
    privacyToggle.addEventListener('click', () => {
        const content = document.getElementById('privacy-content');
        if (content.style.display === 'none') {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}

// Restore projects from backup JSON file
function restoreFromBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const backup = JSON.parse(e.target.result);

            chrome.storage.local.get(['projects', 'settings'], (res) => {
                const existingProjects = res.projects || {};
                let mergedProjects = { ...existingProjects };
                let message = '';

                // Case 1: Global Backup (all projects)
                if (backup.projects && typeof backup.projects === 'object') {
                    mergedProjects = { ...existingProjects, ...backup.projects };
                    // Merge settings
                    const existingSettings = res.settings || {};
                    const mergedSettings = { ...backup.settings, ...existingSettings };
                    if (backup.settings && backup.settings.visibleCols && !existingSettings.visibleCols) {
                        mergedSettings.visibleCols = backup.settings.visibleCols;
                    }
                    chrome.storage.local.set({ settings: mergedSettings }); // Save settings separately
                    message = `Restored ${Object.keys(backup.projects).length} projects`;
                }
                // Case 2: Single Project Import
                else if (backup.projectName && Array.isArray(backup.items)) {
                    mergedProjects[backup.projectName] = backup.items;
                    message = `Imported project: ${backup.projectName}`;
                }
                else {
                    showToast('Invalid backup file format');
                    return;
                }

                chrome.storage.local.set({ projects: mergedProjects }, () => {
                    showToast(message);
                    // Reload data and UI
                    loadData().then(() => {
                        renderTable(true);
                        renderDnD();
                    });
                });
            });
        } catch (err) {
            showToast('Error reading backup file');
            console.error(err);
        }
    };
    reader.readAsText(file);

    // Reset file input so same file can be selected again
    event.target.value = '';
}

// Manual Backup Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Other listeners are added in the main DOMContentLoaded block at top of file
    // Adding these dynamically if they exist (safe for old DOM) or just add to main block?
    // Let's add safely here or better yet, move to main block.
    // Actually, simple event delegation or check null is fine.
    const btnBackupAll = document.getElementById('btn-backup-all');
    if (btnBackupAll) {
        btnBackupAll.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'BACKUP_ALL' });
            showToast('Backup started...');
        });
    }

    const btnExportProject = document.getElementById('btn-export-project');
    if (btnExportProject) {
        btnExportProject.addEventListener('click', () => {
            const projectSelect = document.getElementById('project-select');
            const project = projectSelect ? projectSelect.value : null;
            if (project) {
                chrome.runtime.sendMessage({ action: 'EXPORT_PROJECT', project: project });
                showToast(`Exporting ${project}...`);
            } else {
                showToast('No project selected');
            }
        });
    }
});

