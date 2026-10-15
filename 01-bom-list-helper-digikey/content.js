console.log("DigiKey BOM Helper: Content script loaded (v1.2).");

let currentProductData = {};
let priceBreaks = [];

// Immediate check on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initHeartbeat();
        initThemeObserver();
    });
} else {
    initHeartbeat();
    initThemeObserver();
}

function initHeartbeat() {
    // Run once immediately
    checkAndInject();

    // Then every 1 second
    setInterval(checkAndInject, 1000);
}

// Listener for Popup Theme Sync
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_THEME') {
        const theme = document.documentElement.getAttribute('data-theme');
        const isDark = (theme === 'dkdk' || document.body.classList.contains('dkdk'));
        sendResponse({ theme: isDark ? 'dark' : 'light' });
    }
});

function checkAndInject() {
    if (isProductPage()) {
        const uiExists = document.querySelector('.digikey-bom-container');
        if (!uiExists) {
            // UI missing -> Try to scrape and inject
            // We only inject if we find valid data to avoid flashing on wrong pages
            attemptInject();
        }
    } else {
        // Not on product page -> Remove UI
        removeUI();
    }
}

function isProductPage() {
    // DigiKey URLs are usually /products/detail/...
    return location.href.includes('/products/detail/');
}

function removeUI() {
    const existing = document.querySelector('.digikey-bom-container');
    if (existing) existing.remove();
}

function attemptInject() {
    scrapePageData();
    // Only inject if we successfully scraped a product name to ensure we are on a valid page
    if (currentProductData.productName && currentProductData.productName !== "Unknown Product") {
        injectUI();
    }
}

function scrapePageData() {
    try {
        currentProductData = {};

        // 1. Part Number
        const metaSku = document.querySelector('meta[itemprop="sku"]');
        const thPartNo = Array.from(document.querySelectorAll('th')).find(th =>
            th.innerText.includes('DigiKey Part Number') || th.innerText.includes('Manufacturer Part Number')
        );
        let partNoFromTable = thPartNo ? thPartNo.nextElementSibling?.innerText.trim() : null;

        currentProductData.productName =
            (metaSku ? metaSku.content : null) ||
            partNoFromTable ||
            document.querySelector('h1')?.innerText.trim() ||
            "Unknown Product";

        currentProductData.productUrl = window.location.href;

        // 2. Image
        const img = document.querySelector('img[itemprop="image"]') ||
            document.querySelector('meta[property="og:image"]')?.content ||
            document.querySelector('#product-details-image-container img') ||
            document.querySelector('img[data-testid="main-image"]') ||
            document.querySelector('.product-image img');

        if (typeof img === 'string') {
            currentProductData.imageUrl = img;
        } else if (img) {
            currentProductData.imageUrl = img.src;
        }

        // 3. Manufacturer
        currentProductData.manufacturer =
            document.querySelector('span[data-testid="manufacturer-name"]')?.innerText ||
            document.querySelector('a[data-testid="manufacturer-name"]')?.innerText ||
            findValueByLabel('Manufacturer') ||
            "Unknown Manufacturer";

        // 4. Description
        currentProductData.description =
            findValueByLabel('Description') ||
            findValueByLabel('Detailed Description') ||
            document.querySelector('meta[name="description"]')?.content ||
            "-";

        // 5. Attributes
        currentProductData.attributes = extractAllAttributes();
        if (currentProductData.manufacturer) currentProductData.attributes['Manufacturer'] = currentProductData.manufacturer;
        if (currentProductData.productName) currentProductData.attributes['DigiKey Part Number'] = currentProductData.productName;

        // 6. Prices
        scrapePriceBreaks();

        // 7. Stock / Quantity Available
        currentProductData.qtyAvailable = scrapeStock();

        // 8. Datasheet
        // Strategy 0: Parse __NEXT_DATA__ script (Most Reliable for Next.js sites like DigiKey)
        let dsLink = null;
        let datasheetUrlFromData = null;

        try {
            const nextDataScript = document.getElementById('__NEXT_DATA__');
            if (nextDataScript) {
                const nextData = JSON.parse(nextDataScript.textContent);
                // Navigate the JSON structure to find datasheetUrl
                // Common paths: props.pageProps.product.datasheetUrl or similar
                const findDatasheetUrl = (obj) => {
                    if (!obj || typeof obj !== 'object') return null;
                    if (obj.datasheetUrl) return obj.datasheetUrl;
                    if (obj.datasheet) return obj.datasheet;
                    for (const key in obj) {
                        const result = findDatasheetUrl(obj[key]);
                        if (result) return result;
                    }
                    return null;
                };
                datasheetUrlFromData = findDatasheetUrl(nextData);
                if (datasheetUrlFromData) {
                    currentProductData.datasheetUrl = datasheetUrlFromData;
                }
            }
        } catch (e) {
            console.log("__NEXT_DATA__ parsing failed, falling back to DOM scraping", e);
        }

        // Only proceed with DOM scraping if __NEXT_DATA__ didn't yield a result
        if (!currentProductData.datasheetUrl) {
            // Strategy 1: Look for link with text "Datasheet" (case insensitive) inside specific containers
            const attrTable = document.getElementById('product-details-product-attributes');
            if (attrTable) {
                const links = attrTable.querySelectorAll('a[href$=".pdf"]');
                for (let link of links) {
                    if (link.innerText.toLowerCase().includes('datasheet')) {
                        dsLink = link;
                        break;
                    }
                }
            }

            // Strategy 2: Look for ANY link ending in .pdf that contains "Datasheet" anywhere on page
            if (!dsLink) {
                const allPdfLinks = document.querySelectorAll('a[href$=".pdf"]');
                for (let link of allPdfLinks) {
                    if (link.innerText.toLowerCase().includes('datasheet')) {
                        dsLink = link;
                        break;
                    }
                }
            }

            // Strategy 3: Relaxed search - look for the first PDF link in "Documents" section if available
            if (!dsLink) {
                const documentsHeader = Array.from(document.querySelectorAll('h2, h3, h4, th')).find(el => el.innerText.includes('Documents'));
                if (documentsHeader) {
                    // Try to find the container
                    let container = documentsHeader.closest('div') || documentsHeader.closest('table');
                    if (container) {
                        dsLink = container.querySelector('a[href$=".pdf"]');
                    }
                }
            }

            // Strategy 4: Label-Based Search (Robust for non-PDF links)
            // Find the table header that says "Datasheet" and get the link from the next cell.
            if (!dsLink) {
                const allHeaders = Array.from(document.querySelectorAll('th'));
                const dsHeader = allHeaders.find(th => th.innerText.toLowerCase().includes('datasheet'));
                if (dsHeader) {
                    // Try next sibling element (td)
                    const valCell = dsHeader.nextElementSibling;
                    if (valCell) {
                        dsLink = valCell.querySelector('a');
                    }
                }
            }

            // Strategy 5: Look for "Datasheet" text in any anchor, regardless of extension
            // (Use carefully, ensure it's in a relevant section)
            if (!dsLink) {
                const attrSection = document.getElementById('product-details-product-attributes');
                if (attrSection) {
                    const link = Array.from(attrSection.querySelectorAll('a')).find(a => a.innerText.toLowerCase().includes('datasheet'));
                    if (link) dsLink = link;
                }
            }

            if (dsLink) {
                currentProductData.datasheetUrl = dsLink.href;
            }
        }
    } catch (e) { }
}

function scrapeStock() {
    try {
        const stockElements = document.querySelectorAll('div, span, p, h1, h2, h3, h4');

        for (let el of stockElements) {
            const text = el.innerText || "";
            const match1 = text.match(/In-Stock:\s*([0-9,]+)/i);
            if (match1) return parseInt(match1[1].replace(/,/g, ''));

            const match2 = text.match(/([0-9,]+)\s+In Stock/i);
            if (match2) return parseInt(match2[1].replace(/,/g, ''));
        }

        const availableToOrder = Array.from(document.querySelectorAll('*')).some(el =>
            el.innerText && el.innerText.includes('Available to Order')
        );
        if (availableToOrder) return 0;

        const qtyEl = document.querySelector('[data-testid="price-and-quantity"]');
        if (qtyEl) {
            const text = qtyEl.innerText;
            const match = text.match(/([0-9,]+)\s+In Stock/i);
            if (match) return parseInt(match[1].replace(/,/g, ''));
        }

    } catch (e) { }
    return 0; // Default
}

function findValueByLabel(labelText) {
    const elements = Array.from(document.querySelectorAll('th, td, dt, div, span'));
    for (let el of elements) {
        if (el.innerText.trim().replace(/:$/, '') === labelText) {
            if (el.nextElementSibling) {
                return el.nextElementSibling.innerText.trim();
            }
        }
    }
    return null;
}

function extractAllAttributes() {
    const attributes = {};
    const rows = document.querySelectorAll('tr');
    rows.forEach(row => {
        const cells = row.querySelectorAll('th, td');
        if (cells.length === 2) {
            let key = cells[0].innerText.trim().replace(/:$/, '');
            let value = cells[1].innerText.trim();
            if (key && value && key.length < 60 && value.length < 300 && !key.toLowerCase().includes('price')) {
                attributes[key] = value;
            }
        }
    });
    return attributes;
}

function scrapePriceBreaks() {
    priceBreaks = [];
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
        const text = table.innerText.toLowerCase();
        if (text.includes('price')) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    let qtyText = cells[0].innerText.replace(/[^0-9]/g, '');
                    let priceText = cells[1].innerText.replace(/[^0-9.]/g, '');

                    let qty = parseInt(qtyText);
                    let price = parseFloat(priceText);

                    if (!isNaN(qty) && !isNaN(price) && qty > 0) {
                        priceBreaks.push({ qty, price });
                    }
                }
            });
        }
    });
    priceBreaks.sort((a, b) => a.qty - b.qty);
}

function getPriceForQuantity(qty) {
    if (priceBreaks.length === 0) return 0;

    let selectedPrice = priceBreaks[0].price;
    for (let tier of priceBreaks) {
        if (qty >= tier.qty) {
            selectedPrice = tier.price;
        }
    }
    return selectedPrice;
}


/****************************************
 * UI
 ****************************************/
async function injectUI() {
    if (document.querySelector('.digikey-bom-container')) return;

    const container = document.createElement('div');
    container.className = 'digikey-bom-container';

    const projects = await getProjects();
    const currentProjectName = (await chrome.storage.local.get(['lastProject'])).lastProject || 'Default Project';

    const projectKeys = Object.keys(projects).sort((a, b) => a === currentProjectName ? -1 : b === currentProjectName ? 1 : 0);

    const projectOptions = projectKeys.map(p =>
        `<option value="${p}" ${p === currentProjectName ? 'selected' : ''}>${p}</option>`
    ).join('');

    container.innerHTML = `
        <div class="digikey-bom-header">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${chrome.runtime.getURL('icon_v2.png')}" style="width:24px; height:24px;">
                <span style="font-weight:bold;">BOM List Helper</span>
            </div>
            <span id="dk-minimize-ui" style="cursor:pointer; font-size:16px; opacity:0.7; font-weight:bold;">▽</span>
        </div>
        
        <div id="dk-ui-body">
            <div class="digikey-bom-section">
                <label class="digikey-bom-label">Project</label>
                <div class="project-row">
                    <select id="dk-project-select" class="digikey-bom-select">
                        ${projectOptions || '<option value="Default Project">Default Project</option>'}
                    </select>
                    <button id="dk-new-project-btn" class="btn-small">+</button>
                </div>
            </div>

            <div class="digikey-bom-section" id="dk-qty-section">
                <label class="digikey-bom-label">Quantity</label>
                <input type="number" id="dk-bom-qty" class="digikey-bom-input" value="1" min="1">
                <div style="font-size:10px; color:#666; margin-top:2px;">
                    Stock: <span id="dk-stock-display">-</span>
                    <span id="dk-existing-info" style="display:none; color:#856404; margin-left:8px;">
                        ⚠️ In project: <strong id="dk-existing-qty">0</strong>
                    </span>
                </div>
            </div>

            <div class="digikey-bom-price-display" id="dk-price-display">
                Unit: - <br>
                Total: -
            </div>

            <div class="digikey-bom-section">
                <label class="digikey-bom-label">Note</label>
                <input type="text" id="dk-bom-note" class="digikey-bom-input" placeholder="...">
            </div>

            <button id="dk-bom-add-btn" class="digikey-bom-btn">Add to Project</button>
            <div id="dk-bom-status" class="digikey-bom-status">Added!</div>
        </div>
    `;

    document.body.appendChild(container);

    const qtyInput = container.querySelector('#dk-bom-qty');
    const priceDisplay = container.querySelector('#dk-price-display');
    const stockDisplay = container.querySelector('#dk-stock-display');
    const addBtn = container.querySelector('#dk-bom-add-btn');
    const projectSelect = container.querySelector('#dk-project-select');
    const newProjectBtn = container.querySelector('#dk-new-project-btn');
    const noteInput = container.querySelector('#dk-bom-note');
    const statusMsg = container.querySelector('#dk-bom-status');
    const minBtn = container.querySelector('#dk-minimize-ui');
    const uiBody = container.querySelector('#dk-ui-body');
    const header = container.querySelector('.digikey-bom-header');

    // Minimize / Expand Logic
    const toggleMinimize = (e) => {
        // Stop propagation if clicking the button itself to avoid double toggle
        if (e && e.target === minBtn && container.classList.contains('minimized')) return;

        const isMinimized = container.classList.toggle('minimized');
        if (isMinimized) {
            minBtn.style.display = 'none'; // Hide button in minimized state
        } else {
            minBtn.style.display = 'block'; // Show button in expanded state
            minBtn.innerHTML = '▽'; // Empty down arrow
            minBtn.title = "Minimize";
        }
    };

    minBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Handle button click specifically
        toggleMinimize();
    });

    // Allow clicking anywhere on header to expand ONLY when minimized
    header.addEventListener('click', () => {
        if (container.classList.contains('minimized')) {
            toggleMinimize();
        }
    });

    // Initial Display
    if (currentProductData.qtyAvailable !== undefined) {
        stockDisplay.innerText = currentProductData.qtyAvailable.toLocaleString();
        if (currentProductData.qtyAvailable === 0) {
            stockDisplay.style.color = 'red';
            stockDisplay.style.fontWeight = 'bold';
        }
    }

    const updatePriceDisplay = () => {
        const qty = parseInt(qtyInput.value) || 0;
        const available = currentProductData.qtyAvailable || 0;
        const unitPrice = getPriceForQuantity(qty);
        const total = (unitPrice * qty);

        if (qty > available && available > 0) {
            stockDisplay.style.color = 'orange';
            stockDisplay.innerText = `${available.toLocaleString()} (Insufficient)`;
        } else if (available === 0) {
            stockDisplay.style.color = 'red';
            stockDisplay.innerText = '0 (Out of Stock)';
        } else {
            stockDisplay.style.color = 'green';
            stockDisplay.innerText = available.toLocaleString();
        }

        const unitHtml = unitPrice > 0 ? `$${unitPrice.toFixed(5)}` : '<span style="color:red; font-weight:bold;">NP</span>';
        const totalHtml = unitPrice > 0 ? `$${total.toFixed(2)}` : '<span style="color:red;">NP</span>';

        priceDisplay.innerHTML = `
            <span class="price-unit">Unit: ${unitHtml}</span><br>
            Total: ${totalHtml}
        `;
    };

    qtyInput.addEventListener('input', updatePriceDisplay);

    setTimeout(() => {
        if (priceBreaks.length === 0) scrapePriceBreaks();
        qtyInput.dispatchEvent(new Event('input'));
        checkExistingItem(); // Check on load
    }, 500);

    // Existing item indicator elements
    const qtySection = container.querySelector('#dk-qty-section');
    const existingInfo = container.querySelector('#dk-existing-info');
    const existingQtySpan = container.querySelector('#dk-existing-qty');
    let isUpdateMode = false;

    // Check if current product already exists in selected project
    async function checkExistingItem() {
        const project = projectSelect.value;
        const partNumber = currentProductData.attributes?.['DigiKey Part Number'] || currentProductData.productName;

        try {
            const projects = await getProjects();
            const items = projects[project] || [];
            const existingItem = items.find(item =>
                (item.attributes?.['DigiKey Part Number'] || item.productName) === partNumber
            );

            if (existingItem) {
                // Highlight quantity section yellow
                qtySection.style.background = '#fff3cd';
                qtySection.style.border = '1px solid #ffc107';
                qtySection.style.borderRadius = '6px';
                qtySection.style.padding = '8px';

                // Show existing quantity info
                existingInfo.style.display = 'inline';
                existingQtySpan.innerText = existingItem.quantity || 1;

                // Set quantity input to existing value
                qtyInput.value = existingItem.quantity || 1;
                qtyInput.dispatchEvent(new Event('input'));

                // Change button to Update mode
                addBtn.innerText = 'Update Quantity';
                addBtn.style.background = '#ffc107';
                addBtn.style.color = '#000';
                isUpdateMode = true;
            } else {
                // Reset to normal state
                qtySection.style.background = '';
                qtySection.style.border = '';
                qtySection.style.borderRadius = '';
                qtySection.style.padding = '';

                existingInfo.style.display = 'none';

                addBtn.innerText = 'Add to Project';
                addBtn.style.background = '';
                addBtn.style.color = '';
                isUpdateMode = false;
            }
        } catch (e) {
            existingInfo.style.display = 'none';
            isUpdateMode = false;
        }
    }

    // projectSelect change listener below handles update mode check

    projectSelect.addEventListener('change', () => {
        try {
            chrome.storage.local.set({ lastProject: projectSelect.value });
            checkExistingItem(); // Check when project changes
        } catch (e) { /* Silent */ }
    });

    // Inline Project Creation Logic
    newProjectBtn.addEventListener('click', () => {
        // Switch to Input Mode
        projectSelect.style.display = 'none';
        newProjectBtn.style.display = 'none';

        // Check if input container exists, if not create it
        let inputContainer = container.querySelector('#dk-new-project-container');
        if (!inputContainer) {
            inputContainer = document.createElement('div');
            inputContainer.id = 'dk-new-project-container';
            inputContainer.style.display = 'flex';
            inputContainer.style.gap = '4px';
            inputContainer.style.width = '100%';

            inputContainer.innerHTML = `
                <input type="text" id="dk-new-project-input" class="digikey-bom-input" placeholder="Project Name" style="flex:1;">
                <button id="dk-save-project" class="btn-small" style="color:green;">✓</button>
                <button id="dk-cancel-project" class="btn-small" style="color:red;">✕</button>
            `;

            // Insert after select
            container.querySelector('.project-row').prepend(inputContainer);

            // Logic for Save
            inputContainer.querySelector('#dk-save-project').addEventListener('click', async () => {
                const name = inputContainer.querySelector('#dk-new-project-input').value.trim();
                if (name) {
                    await createProject(name);
                    const opt = document.createElement('option');
                    opt.value = name;
                    opt.text = name;
                    opt.selected = true;
                    // Add to dropdown
                    projectSelect.insertBefore(opt, projectSelect.firstChild);
                    projectSelect.value = name;
                    chrome.storage.local.set({ lastProject: name }, () => {
                        // Trigger Auto-Update in Background
                        chrome.runtime.sendMessage({
                            action: 'PROJECT_CREATED',
                            project: name
                        });
                    });

                    // Reset UI
                    inputContainer.remove();
                    projectSelect.style.display = 'block';
                    newProjectBtn.style.display = 'block';
                }
            });

            // Logic for Cancel
            inputContainer.querySelector('#dk-cancel-project').addEventListener('click', () => {
                inputContainer.remove();
                projectSelect.style.display = 'block';
                newProjectBtn.style.display = 'block';
            });
        }
    });

    addBtn.addEventListener('click', async () => {
        if (!currentProductData.productName || currentProductData.productName === "Unknown Product") {
            scrapePageData();
        }

        const qty = parseInt(qtyInput.value) || 0;
        const project = projectSelect.value;
        const note = noteInput.value;
        const unitPrice = getPriceForQuantity(qty);

        if (isUpdateMode) {
            // Update existing item
            const partNumber = currentProductData.attributes?.['DigiKey Part Number'] || currentProductData.productName;
            try {
                const projects = await getProjects();
                const items = projects[project] || [];
                const itemIndex = items.findIndex(item =>
                    (item.attributes?.['DigiKey Part Number'] || item.productName) === partNumber
                );

                if (itemIndex !== -1) {
                    items[itemIndex].quantity = qty;
                    items[itemIndex].unitPrice = unitPrice;
                    items[itemIndex].totalPrice = unitPrice * qty;
                    items[itemIndex].note = note;
                    // Update stock info on re-save
                    items[itemIndex].qtyAvailable = currentProductData.qtyAvailable;
                    projects[project] = items;

                    await new Promise(resolve => {
                        chrome.storage.local.set({ projects }, resolve);
                    });

                    existingQtySpan.innerText = qty;
                    showNotification('Updated!', 'success');

                    // Trigger backup and Excel regeneration
                    chrome.runtime.sendMessage({
                        action: 'ITEM_ADDED',
                        project: project,
                        datasheetUrl: currentProductData.datasheetUrl,  // Include for PDF check
                        imageUrl: currentProductData.imageUrl
                    });
                }
            } catch (e) { /* Silent */ }
        } else {
            // Add new item
            const item = {
                productName: currentProductData.productName,
                description: currentProductData.description,
                manufacturer: currentProductData.manufacturer,
                partNumber: currentProductData.partNumber,
                quantity: qty,
                unitPrice: unitPrice,
                totalPrice: unitPrice * qty,
                note: note,
                attributes: currentProductData.attributes,
                datasheetUrl: currentProductData.datasheetUrl,
                imageUrl: currentProductData.imageUrl,
                productUrl: window.location.href,
                qtyAvailable: currentProductData.qtyAvailable, // Persist Stock Data
                addedAt: new Date().toISOString()
            };

            await addItemToProject(project, item);

            showNotification('Added!', 'success');

            // Re-check to switch to update mode for next click
            checkExistingItem();
        }
    });
}

function getProjects() {
    return new Promise(resolve => {
        chrome.storage.local.get(['projects'], (res) => {
            resolve(res.projects || { 'Default Project': [] });
        });
    });
}

function createProject(name) {
    return new Promise(resolve => {
        chrome.storage.local.get(['projects'], (res) => {
            const projects = res.projects || { 'Default Project': [] };
            if (!projects[name]) {
                projects[name] = [];
                chrome.storage.local.set({ projects }, resolve);
            } else {
                resolve();
            }
        });
    });
}

function addItemToProject(projectName, item) {
    return new Promise(resolve => {
        chrome.storage.local.get(['projects'], (result) => {
            const projects = result.projects || { 'Default Project': [] };
            if (!projects[projectName]) projects[projectName] = [];

            projects[projectName].push(item);

            // Assuming showNotification is defined elsewhere or needs to be added
            // showNotification('Added to BOM!'); 

            chrome.storage.local.set({ projects: projects }, () => {
                // Trigger Auto-Update in Background
                chrome.runtime.sendMessage({
                    action: 'ITEM_ADDED',
                    project: projectName,
                    datasheetUrl: item.datasheetUrl,
                    imageUrl: item.imageUrl, // Pass imageUrl explicitly
                    itemAttributes: item.attributes // Pass attributes for Part Number filename
                });
                resolve();
            });
        });
    });
}

// --- NOTIFICATION HANDLER ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showToast' || request.action === 'showError') {
        const type = request.action === 'showError' ? 'error' : (request.type || 'info');
        showNotification(request.message, type);
    }
});

function showNotification(message, type = 'info') {
    const container = document.querySelector('.digikey-bom-container');
    if (!container) return;

    // Use specific status box
    let statusBox = document.getElementById('dk-bom-status');
    if (!statusBox) {
        statusBox = document.createElement('div');
        statusBox.id = 'dk-bom-status';
        statusBox.className = 'digikey-bom-status';
        container.appendChild(statusBox);
    }

    // Clear existing timeout to prevent conflict
    if (statusBox.hideTimeout) clearTimeout(statusBox.hideTimeout);
    if (statusBox.removeTimeout) clearTimeout(statusBox.removeTimeout);

    statusBox.innerText = message;
    statusBox.style.display = 'block';
    statusBox.style.opacity = '1';

    // Reset styles first to ensure clean state (fixes "Stuck Red" issue)
    statusBox.style.backgroundColor = '';
    statusBox.style.color = '';
    statusBox.style.padding = '';
    statusBox.style.borderRadius = '';
    statusBox.style.marginTop = '';
    statusBox.style.fontWeight = '';
    statusBox.style.width = '';

    // Style based on type
    if (type === 'error' || message.includes('Found') || message.includes('Error') || message.includes('Hata')) {
        // ERROR: Red Box Style (Prominent)
        Object.assign(statusBox.style, {
            backgroundColor: '#D32F2F', // Red
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '5px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '12px',
            width: '100%',
            boxSizing: 'border-box'
        });
    } else {
        // SUCCESS: Default CSS Style (Minimalist Green Text)
        // No extra inline styles needed, CSS class .digikey-bom-status handles it.
        // We just cleared the inline styles above.
    }

    // Auto-hide
    statusBox.hideTimeout = setTimeout(() => {
        statusBox.style.opacity = '0';
        statusBox.removeTimeout = setTimeout(() => {
            statusBox.style.display = 'none';
        }, 300);
    }, 4000);
}

// CRITICAL: Listen for error notifications from background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showError') {
        console.log('📢 Received showError:', request.message);
        showNotification(request.message, 'error');
        sendResponse({ received: true }); // Acknowledge receipt
    }
    return true; // Keep message channel open for async response
});

// --- THEME OBSERVER (Dark Mode) ---
function initThemeObserver() {
    const target = document.documentElement;
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                updateThemeClass();
            }
        });
    });

    observer.observe(target, { attributes: true });
    updateThemeClass(); // Initial check
}

function updateThemeClass() {
    const container = document.querySelector('.digikey-bom-container');
    const theme = document.documentElement.getAttribute('data-theme');
    const isDark = (theme === 'dkdk' || document.body.classList.contains('dkdk'));

    // Save theme for popup
    try {
        chrome.storage.local.set({ currentTheme: isDark ? 'dark' : 'light' });
    } catch (e) { }

    if (!container) return;

    if (isDark) {
        container.classList.add('dark-mode');
    } else {
        container.classList.remove('dark-mode');
    }
}
