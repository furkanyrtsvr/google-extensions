importScripts('exceljs.min.js');

const CORE_COLUMNS = [
    { id: 'img', name: 'Image', width: 100 },
    { id: 'partNumber', name: 'Part Number', width: 140 },
    { id: 'manufacturer', name: 'Manufacturer', width: 220 },
    { id: 'description', name: 'Description', width: 300 },
    { id: 'quantity', name: 'Quantity', width: 70 },
    { id: 'unitPrice', name: 'Unit Price', width: 90 },
    { id: 'totalPrice', name: 'Total', width: 100 },
    { id: 'productUrl', name: 'DigiKey Link', width: 150 },
    { id: 'datasheet', name: 'Datasheet', width: 80 },
    { id: 'datasheetLink', name: 'Datasheet Link', width: 100 },
    { id: 'note', name: 'Note', width: 200 }
];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ITEM_ADDED') {
        const project = request.project;

        // Download Datasheet FIRST (if enabled & available)
        // Excel will be generated AFTER download completes (success or fail)
        if (request.datasheetUrl) {
            downloadDatasheet(project, request.datasheetUrl, sender.tab?.id, request.partNumber);
        } else {
            // No datasheet URL - generate Excel immediately
            generateAndSaveExcel(project);
        }

        // 3. Download Image (if enabled & available)
        // Use passed imageUrl if available, otherwise fetch from storage (legacy/fallback)
        if (request.imageUrl) {
            downloadImageInternal(request.project, request.imageUrl, request.itemAttributes || {});
        } else {
            downloadImageForProject(request.project);
        }

        // 4. Backup projects (DISABLED - Manual only now)
        // backupProjectsToFile();
    }

    if (request.action === 'PROJECT_DELETED' || request.action === 'ITEM_REMOVED') {
        // backupProjectsToFile();
    }

    // Manual Backup Handling
    if (request.action === 'BACKUP_ALL') {
        backupProjectsToFile();
    }
    if (request.action === 'EXPORT_PROJECT') {
        saveProjectBackup(request.project);
    }
});

// Auto-backup projects to JSON file
async function backupProjectsToFile() {
    try {
        const data = await chrome.storage.local.get(['projects', 'settings']);
        const projects = data.projects || {};
        const settings = data.settings || {};
        const subfolder = settings.subfolder || 'DigiKey_Backups';

        const backupData = JSON.stringify({ projects, settings, backupTime: new Date().toISOString() }, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });

        const reader = new FileReader();
        reader.onload = function () {
            const dataUrl = this.result;
            chrome.downloads.download({
                url: dataUrl,
                filename: `${subfolder}/projects_backup.json`,
                saveAs: false,
                conflictAction: 'overwrite'
            });
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error('Backup failed:', e);
    }
}

// Save SINGLE project backup
async function saveProjectBackup(projectName) {
    try {
        const data = await chrome.storage.local.get(['projects', 'settings']);
        const projects = data.projects || {};
        const settings = data.settings || {};
        const subfolder = settings.subfolder || 'DigiKey_Backups';

        const projectItems = projects[projectName];
        if (!projectItems) return;

        // Create single project backup structure
        const projectData = {
            projectName: projectName,
            created: new Date().toISOString(),
            items: projectItems
        };

        const backupData = JSON.stringify(projectData, null, 2);
        const blob = new Blob([backupData], { type: 'application/json' });

        const reader = new FileReader();
        reader.onload = function () {
            const dataUrl = this.result;
            // Sanitize filename
            const safeName = projectName.replace(/[^a-z0-9._-]/gi, '_');
            chrome.downloads.download({
                url: dataUrl,
                filename: `${subfolder}/${projectName}/${safeName}_data.json`,
                saveAs: false,
                conflictAction: 'overwrite'
            });
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error('Project backup failed:', e);
    }
}

async function downloadImageInternal(projectName, imageUrl, attributes) {
    if (!imageUrl) return;

    const data = await chrome.storage.local.get(['settings']);
    const settings = data.settings || {};
    if (!settings.downloadImages) return;

    const subfolder = settings.subfolder || 'DigiKey_Backups';

    // Ensure absolute URL
    let finalUrl = imageUrl;
    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

    // Filename
    let partNumber = attributes?.['DigiKey Part Number'] || `image_${Date.now()}`;
    // If attributes unavailable, try to extract unique ID from URL or just timestamp
    if (!partNumber || partNumber.includes('undefined')) {
        partNumber = `img_${Date.now()}`;
    }
    partNumber = partNumber.replace(/[^a-z0-9]/gi, '_');

    try {
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error("Image fetch failed");

        const blob = await response.blob();
        const type = blob.type;

        let ext = '.png';
        if (type === 'image/jpeg') ext = '.jpg';
        else if (type === 'image/webp') ext = '.webp';
        else if (type === 'image/gif') ext = '.gif';

        const savePath = `${subfolder}/${projectName}/Images/${partNumber}${ext}`;
        const objectUrl = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: objectUrl,
            filename: savePath,
            saveAs: false,
            conflictAction: 'overwrite'
        }, (id) => {
            // setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
        });

    } catch (e) {
        // Silent fallback - no console error to avoid user confusion
        let ext = '.jpg'; // Safer default than png for photos? Or just guess from url
        if (finalUrl.toLowerCase().includes('png')) ext = '.png';
        if (finalUrl.toLowerCase().includes('webp')) ext = '.webp';

        const savePath = `${subfolder}/${projectName}/Images/${partNumber}${ext}`;
        chrome.downloads.download({
            url: finalUrl,
            filename: savePath,
            saveAs: false,
            conflictAction: 'overwrite'
        });
    }
}

async function downloadImageForProject(projectName) {
    // Deprecated / Backwards compatibility logic
    // ... (This can leverage downloadImageInternal by fetching from storage first)
    const data = await chrome.storage.local.get(['projects']);
    const items = (data.projects || {})[projectName] || [];
    if (items.length > 0) {
        const item = items[items.length - 1];
        if (item.imageUrl) {
            downloadImageInternal(projectName, item.imageUrl, item.attributes);
        }
    }
}

// STRICT PDF-ONLY DOWNLOAD (No HTML files ever created)
async function downloadDatasheet(projectName, datasheetUrl, tabId, partNumber) {
    const data = await chrome.storage.local.get(['settings']);
    if (!data.settings?.downloadDatasheets) {
        // Settings disabled - generate Excel anyway
        generateAndSaveExcel(projectName);
        return;
    }

    // Safety Timeout - If nothing happens in 5 seconds, Force Notify
    let isFinished = false;
    const safetyTimer = setTimeout(() => {
        if (!isFinished) {
            console.error('❌ Operation Timed Out');
            notifyTab(tabId, 'PDF NOT FOUND');
            markDatasheetAsFailed(projectName, partNumber);
            generateAndSaveExcel(projectName);
        }
    }, 5000); // 5 Seconds Timeout

    const finish = (success = true) => {
        isFinished = true;
        clearTimeout(safetyTimer);
        if (!success) {
            markDatasheetAsFailed(projectName, partNumber);
        }
        generateAndSaveExcel(projectName);
    };

    const subfolder = data.settings.subfolder || 'DigiKey_Backups';


    // Initial filename guess from URL (Fallback)
    let filename;
    const docNmMatch = datasheetUrl.match(/DocNm=([^&]+)/i);
    if (docNmMatch) {
        filename = decodeURIComponent(docNmMatch[1]).replace(/[^a-z0-9._-]/gi, '_');
    } else {
        filename = decodeURIComponent(datasheetUrl.split('?')[0].split('/').pop());
        filename = filename.replace(/[^a-z0-9._-]/gi, '_');
    }
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    // Define savePath in outer scope for catch block access
    let savePath = `${subfolder}/${projectName}/Datasheets/${filename}`;

    console.log('━━━ DATASHEET START ━━━');
    console.log('URL:', datasheetUrl);
    console.log('Initial Filename Guess:', filename);

    // Try to download via Fetch (most reliable for PDF validation)
    try {
        const response = await fetch(datasheetUrl);

        if (!response.ok) {
            console.error('❌ HTTP Error:', response.status);
            notifyTab(tabId, 'PDF NOT FOUND');
            finish(false);
            return;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();

        // Check Content-Disposition for better filename
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/i); // Basic match
            if (match && match[1]) {
                const serverFilename = match[1].replace(/[^a-z0-9._-]/gi, '_');
                if (serverFilename.length > 3) {
                    filename = serverFilename;
                    console.log('✅ Found Filename in Headers:', filename);
                }
            }
        }

        // Generic Filename Check (e.g. pdf.pdf, download.pdf)
        const lowerName = filename.toLowerCase();
        if (lowerName === 'pdf.pdf' || lowerName === 'download.pdf' || lowerName === 'datasheet.pdf' || lowerName.length < 6) {
            if (partNumber) {
                const safePartNum = partNumber.replace(/[^a-z0-9._-]/gi, '_');
                filename = `${safePartNum}.pdf`;
                console.log('⚠️ Generic filename detected. Renamed to Part Number:', filename);
            }
        }

        // Final Sanity Check for extension
        if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

        // Update savePath with new filename
        savePath = `${subfolder}/${projectName}/Datasheets/${filename}`;

        // STRICT CHECK: Only download if it's actually a PDF
        if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
            console.log('✅ Verified PDF. Downloading to:', savePath);
            const blob = await response.blob();

            // Use FileReader to create Data URL (Service Worker safe)
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                chrome.downloads.download({
                    url: dataUrl,
                    filename: savePath,
                    saveAs: false,
                    conflictAction: 'overwrite'
                }, (id) => {
                    if (id) {
                        console.log('✅ PDF Download Started (Data URL):', filename);
                        saveDatasheetFilename(projectName, filename);
                        monitorDownload(id, tabId, finish); // Pass finish callback
                    } else {
                        console.error('❌ Download Start Failed');
                        notifyTab(tabId, 'PDF NOT FOUND');
                        finish(false); // Start failed
                    }
                });
            };
            reader.readAsDataURL(blob);
        }
        else if (contentType.includes('html')) {
            // It's HTML - try to find PDF link inside
            console.log('⚠️ Got HTML, searching for PDF link...');
            const html = await response.text();
            const match = html.match(/href=["']([^"']*\.pdf[^"']*)[\"']/i);

            if (match && match[1]) {
                let pdfUrl = match[1];
                if (!pdfUrl.startsWith('http')) {
                    const base = new URL(datasheetUrl);
                    pdfUrl = pdfUrl.startsWith('/') ? base.origin + pdfUrl : new URL(pdfUrl, datasheetUrl).href;
                }
                console.log('✅ Found PDF link:', pdfUrl);
                // Recursive call - do NOT call finish here, let recursive call handle it
                downloadDatasheet(projectName, pdfUrl, tabId, partNumber);
            } else {
                console.warn('❌ No PDF link found in HTML');
                notifyTab(tabId, 'PDF NOT FOUND');
                finish(false);
            }
        }
        else {
            console.warn('❌ Unknown content type:', contentType);
            notifyTab(tabId, 'PDF NOT FOUND');
            finish(false);
        }

    } catch (err) {
        console.error('❌ Fetch Error check:', err.message);

        // Last resort: Try standard Chrome download
        console.log('⚠️ Trying Standard Download as fallback...');
        chrome.downloads.download({
            url: datasheetUrl,
            filename: savePath,
            saveAs: false,
            conflictAction: 'overwrite'
        }, (id) => {
            if (!id) {
                console.error('❌ Standard Download also failed');
                notifyTab(tabId, 'PDF NOT FOUND');
                finish(false);
            } else {
                console.log('✅ Standard Download started:', id);
                saveDatasheetFilename(projectName, filename);
                monitorDownload(id, tabId, finish); // Pass finish callback
                // Do NOT call finish() here.
            }
        });
    }
}

// Monitor Download Progress to catch Network/Interruption Errors
function monitorDownload(downloadId, tabId, finishCallback) {
    let lastBytes = 0;
    let stallCount = 0;
    const interval = setInterval(() => {
        chrome.downloads.search({ id: downloadId }, (items) => {
            if (!items || items.length === 0) {
                clearInterval(interval);
                // "New Algorithm": If item disappears before complete, it's failed.
                if (finishCallback) finishCallback(false);
                return;
            }

            const item = items[0];

            // "New Algorithm": MIME Type Inspection
            // Even if filename ends in .pdf, if Chrome says it's HTML, kill it.
            // This catches the "200 OK Error Page" scenario.
            if (item.mime && item.mime.includes('html')) {
                console.warn('⚠️ Detected HTML MIME type in download!');
                chrome.downloads.cancel(downloadId);
                clearInterval(interval);
                notifyTab(tabId, 'PDF NOT FOUND');
                if (finishCallback) finishCallback(false);
                return;
            }

            if (item.state === 'complete') {
                clearInterval(interval);
                console.log('✅ Download Complete:', item.filename);
                // Extra check: If file is suspiciously small (< 2KB), might be corrupt or text
                if (item.fileSize < 2000) {
                    console.warn('⚠️ Downloaded file is too small (<2KB). Suspected invalid.');
                    // Can't easily delete from here without filesystem API, but we notify user.
                    notifyTab(tabId, 'PDF NOT FOUND');
                    if (finishCallback) finishCallback(false);
                } else {
                    if (finishCallback) finishCallback(true); // SUCCESS!
                }
            }
            else if (item.state === 'interrupted') {
                clearInterval(interval);
                console.error('❌ Download Interrupted:', item.error);
                notifyTab(tabId, 'PDF NOT FOUND');
                if (finishCallback) finishCallback(false); // Fail handled.
            }
            else if (item.state === 'in_progress') {
                // Stall Detection
                if (item.bytesReceived === lastBytes && item.bytesReceived > 0) {
                    stallCount++;
                } else {
                    lastBytes = item.bytesReceived;
                    stallCount = 0;
                }

                if (stallCount >= 5) {
                    console.warn('⚠️ Download Stalled');
                    chrome.downloads.cancel(downloadId);
                    clearInterval(interval);
                    notifyTab(tabId, 'PDF NOT FOUND');
                    if (finishCallback) finishCallback(false);
                }
            }
        });
    }, 1000);

    // Stop monitoring after 60 seconds (absolute timeout)
    setTimeout(() => {
        clearInterval(interval);
        // If still running after 60s, just let it be?
        // Global timer (5s) would have fired long ago if we didn't call finish.
        // So this 60s timeout is actually irrelevant for the User's "Notify" requirement,
        // But we should clean up the interval.
    }, 60000);
}

// Bulletproof Notification: Verifies message receipt, falls back to injection if not acknowledged
async function notifyTab(tabId, message) {
    if (!tabId) {
        console.warn('⚠️ notifyTab: No tabId provided');
        return;
    }

    let acknowledged = false;

    try {
        // 1. Try sending message to content script
        const response = await chrome.tabs.sendMessage(tabId, { action: 'showError', message: message });
        acknowledged = response?.received === true;
        console.log('📬 Message response:', response, 'Acknowledged:', acknowledged);
    } catch (err) {
        console.warn('⚠️ sendMessage failed:', err.message);
    }

    // 2. If NOT acknowledged, force inject the notification
    if (!acknowledged) {
        console.log('🚨 No acknowledgment - forcing executeScript fallback');
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (msg) => {
                    let toast = document.getElementById('dk-pdf-error');
                    if (toast) toast.remove();

                    toast = document.createElement('div');
                    toast.id = 'dk-pdf-error';
                    toast.innerText = msg;

                    Object.assign(toast.style, {
                        position: 'fixed',
                        bottom: '20px',
                        right: '25px',
                        backgroundColor: '#D32F2F',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                        zIndex: '2147483647',
                        pointerEvents: 'none'
                    });

                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 5000);
                },
                args: [message]
            });
        } catch (injectErr) {
            console.error('❌ executeScript also failed:', injectErr.message);
        }
    }
}

async function saveDatasheetFilename(projectName, filename) {
    try {
        const data = await chrome.storage.local.get(['projects']);
        const projects = data.projects || {};
        const items = projects[projectName] || [];
        if (items.length > 0) {
            items[items.length - 1].datasheetFilename = filename;
            projects[projectName] = items;
            await chrome.storage.local.set({ projects });
        }
    } catch (e) { /* silent */ }
}

// Mark datasheet as failed - removes datasheetUrl from storage
async function markDatasheetAsFailed(projectName, partNumber) {
    try {
        const data = await chrome.storage.local.get(['projects']);
        const projects = data.projects || {};
        const items = projects[projectName] || [];

        // Find item by partNumber or just use last item
        let targetIndex = items.length - 1;
        if (partNumber) {
            const found = items.findIndex(item =>
                item.productName === partNumber ||
                item.attributes?.['DigiKey Part Number'] === partNumber
            );
            if (found !== -1) targetIndex = found;
        }

        if (targetIndex >= 0 && items[targetIndex]) {
            console.log('🚫 Marking datasheet as failed for:', items[targetIndex].productName);
            // Do NOT delete URL, just mark as failed so we can show 'X' but keep the link
            items[targetIndex].datasheetDownloadFailed = true;
            delete items[targetIndex].datasheetFilename;
            projects[projectName] = items;
            await chrome.storage.local.set({ projects });
        }
    } catch (e) {
        console.error('Failed to mark datasheet as failed:', e);
    }
}

async function generateAndSaveExcel(projectName) {
    if (!projectName) return;

    const data = await chrome.storage.local.get(['projects', 'settings']);
    const allProjects = data.projects || {};
    const items = allProjects[projectName] || [];
    const settings = data.settings || {};

    // Check if auto-update is enabled
    if (!settings.autoUpdate) {
        console.log("Auto-update disabled, skipping background save");
        return;
    }

    // Get subfolder path
    const subfolder = settings.subfolder || 'DigiKey_Backups';

    // Default visible columns or load from settings
    let visibleCols = CORE_COLUMNS.map(c => c.id);
    if (settings.visibleCols) {
        visibleCols = settings.visibleCols;
    }

    if (items.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(projectName);

    // 1. Setup Columns
    const columns = [{ header: 'No.', key: 'no', width: 5 }];
    visibleCols.forEach(colId => {
        const c = CORE_COLUMNS.find(x => x.id === colId);
        const headerName = c ? c.name : colId;
        let width = 15;
        if (colId === 'description') width = 45;
        if (colId === 'manufacturer') width = 25;
        if (colId === 'partNumber') width = 20;
        if (colId === 'img') width = 18;
        columns.push({ header: headerName, key: colId, width: width });
    });
    worksheet.columns = columns;

    // 2. Add Data & Images
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowIndex = i + 2;
        const rowData = { no: i + 1 };

        visibleCols.forEach(colId => {
            let val = getValue(item, colId);
            if (colId === 'img') val = '';
            // Strip HTML
            if (typeof val === 'string') val = val.replace(/<[^>]*>?/gm, '');
            rowData[colId] = val;
        });

        const row = worksheet.addRow(rowData);
        row.height = 90; // ~120px
        row.alignment = { vertical: 'middle', horizontal: 'left' };

        // Formatting
        const cellNo = row.getCell(1);
        cellNo.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
        cellNo.alignment = { horizontal: 'center', vertical: 'middle' };

        let colIndex = 1;
        visibleCols.forEach(colId => {
            colIndex++;
            const cell = row.getCell(colIndex);

            // Stock/Price highlighting
            const availableStock = item.qtyAvailable;
            // Only mark as insufficient if stock data EXISTS and quantity exceeds it
            const isInsufficientStock = (availableStock !== undefined && item.quantity > availableStock);
            const isNP = (!item.unitPrice || item.unitPrice === 0);

            // Add Border to ALL cells - RE-ADDED per user request
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Alignment: Center All (User Request)
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

            if (isNP && (colId === 'unitPrice' || colId === 'totalPrice')) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
            }
            // Stronger check for Excel
            const qtyVal = Number(item.quantity) || 0;
            const stockVal = Number(item.qtyAvailable);
            const isInsufficient = (qtyVal > (isNaN(stockVal) ? 0 : stockVal));

            if (colId === 'quantity' && isInsufficient) {
                // User Request: Red Text ONLY (No Yellow Fill)
                cell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }

            // Image Handler
            if (colId === 'img' && item.imageUrl) {
                try {
                    // We'll process images below, but we need to await inside loop or manage async
                } catch (e) { console.error('Image logic error', e); }
            }

            // Datasheet Logic: X for missing, Link for present
            if (colId === 'datasheet') {
                if (item.datasheetFilename) {
                    // PDF Exists (Downloaded) -> Blue Checkmark
                    const localPath = `Datasheets/${item.datasheetFilename}`;
                    cell.value = { text: '✓', hyperlink: localPath, tooltip: 'Open Local Datasheet' };
                    cell.font = { color: { argb: 'FF0000FF' }, bold: true, size: 14 };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else {
                    // PDF Missing or Failed -> Blue Bold X (White BG)
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
        });
    }

    // Process Images Sequentially
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const rowIndex = i + 2;
        const imgColIndex = visibleCols.indexOf('img');

        if (imgColIndex !== -1 && item.imageUrl) {
            try {
                // Ensure URL is absolute (sometimes scraping gives relative)
                let imgUrl = item.imageUrl;
                if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

                const response = await fetch(imgUrl);
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

                const blob = await response.blob();
                let buffer;
                let ext = 'png';

                // Handle WebP or autodetect
                if (blob.type === 'image/webp' || imgUrl.endsWith('.webp')) {
                    buffer = await convertWebPToPngOffscreen(blob);
                } else {
                    buffer = await blob.arrayBuffer();
                    if (blob.type === 'image/jpeg') ext = 'jpeg';
                    else if (blob.type === 'image/png') ext = 'png';
                    else if (blob.type === 'image/gif') ext = 'gif';
                }

                const imageId = workbook.addImage({ buffer: buffer, extension: ext });
                // +1 offset because column 0 is "No."
                worksheet.addImage(imageId, {
                    tl: { col: imgColIndex + 1 + 0.1, row: rowIndex - 1 + 0.1 },
                    ext: { width: 90, height: 75 },
                    editAs: 'oneCell'
                });
            } catch (err) {
                console.error("BG Image Fail", err);
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Try to use stored directory handle first
    try {
        const dirHandle = await getDirectoryHandle();
        if (dirHandle) {
            // Verify we still have permission
            const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
            if (permission === 'granted' || (await dirHandle.requestPermission({ mode: 'readwrite' })) === 'granted') {
                // Create project subfolder
                const projectDir = await dirHandle.getDirectoryHandle(projectName, { create: true });
                const fileHandle = await projectDir.getFileHandle(`${projectName}_BOM.xlsx`, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log(`Saved to ${dirHandle.name}/${projectName}/${projectName}_BOM.xlsx`);
                return;
            }
        }
    } catch (e) {
        console.log("Custom folder save failed, using downloads fallback", e);
    }

    // Fallback to chrome.downloads
    const reader = new FileReader();
    reader.onload = function () {
        const base64 = this.result.split(',')[1];
        const dataUrl = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + base64;

        const filename = `${subfolder}/${projectName}/${projectName}_BOM.xlsx`;

        chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            conflictAction: 'overwrite',
            saveAs: false
        });
    };
    reader.readAsDataURL(blob);
}

// --- IndexedDB for Directory Handle ---
const DB_NAME = 'DigiKeyBOM_DB';
const STORE_NAME = 'handles';

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getDirectoryHandle() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get('backupDir');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function getValue(item, colId) {
    if (colId === 'img') return '';
    if (colId === 'unitPrice') return item.unitPrice || 0;
    if (colId === 'totalPrice') return item.totalPrice || 0;
    if (colId === 'partNumber') return item.attributes?.['DigiKey Part Number'] || item.productName;
    if (colId === 'productUrl') return item.productUrl || '';
    if (colId === 'datasheet') return item.datasheetUrl ? '✓' : '-';
    if (colId === 'datasheetLink') return item.datasheetUrl ? '🔗' : '-';
    if (item[colId] !== undefined) return item[colId];
    if (item.attributes && item.attributes[colId] !== undefined) return item.attributes[colId];
    return '-';
}

async function convertWebPToPngOffscreen(webpBlob) {
    try {
        // In Service Worker, we use ImageBitmap and OffscreenCanvas
        const bitmap = await createImageBitmap(webpBlob);
        const canvas = new OffscreenCanvas(128, 128);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, 128, 128);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        return await blob.arrayBuffer();
    } catch (e) {
        console.error("WebP conversion failed", e);
        // Fallback: return original buffer and hope ExcelJS handles it or just fail gracefully
        return await webpBlob.arrayBuffer();
    }
}

// Global Zoom Listener (Smart Native Zoom)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only set zoom when loading is complete
    if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('digikey.com') || tab.url.includes('digikey.tr'))) {
        chrome.storage.local.get(['settings'], (res) => {
            const settings = res.settings || {};

            // Check if Auto-Zoom is enabled (default false if undefined)
            if (!settings.autoZoom) return;

            // Get desired level (default 90 if undefined)
            const desiredLevel = (settings.customZoomLevel || 90) / 100;

            chrome.tabs.getZoom(tabId, (currentZoom) => {
                // Only set if not already at desired level (avoid loop)
                // Allow small float error
                if (Math.abs(currentZoom - desiredLevel) > 0.05) {
                    chrome.tabs.setZoom(tabId, desiredLevel);
                }
            });
        });
    }
});


