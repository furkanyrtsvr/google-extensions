/**
 * PCB Guard - Main Controller
 */

let currentLang = 'tr';


// Global Constants
const LENGTH_INPUTS = ['via-drill', 'via-board', 'diff-h', 'loss-trace-len', 'loss-trace-width'];

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof PresetsManager !== 'undefined') {
        await PresetsManager.init();
    }

    setupTheme();
    setupLanguage();
    setupUnits();
    setupTabs();
    setupCalculateButtons();

    // Setup custom dropdown toggles
    document.getElementById('via-plating')?.addEventListener('change', toggleCustomPlating);
    document.getElementById('diff-er')?.addEventListener('change', toggleCustomEr);
    document.getElementById('trace-copper')?.addEventListener('change', toggleCustomTraceCopper);
    document.getElementById('diff-copper')?.addEventListener('change', toggleCustomDiffCopper);
    document.getElementById('loss-trace-copper')?.addEventListener('change', toggleCustomLossTraceCopper);
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Robust input parser handling commas and dots
 */
function parseInput(id) {
    const el = document.getElementById(id);
    if (!el) return 0;

    let val = el.value;
    // Handle localized inputs (comma as decimal separator)
    if (typeof val === 'string') {
        val = val.replace(',', '.');
    }

    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
}

function formatValue(value, decimals = 3) {
    if (value === null || value === undefined) return '-';
    if (typeof value !== 'number') return value;

    const abs = Math.abs(value);
    if (abs < 0.000001) return "0"; // Handle practically zero
    if (abs < 0.001 || abs >= 100000) return value.toExponential(2);
    if (abs >= 100) return value.toFixed(1);
    if (abs >= 10) return value.toFixed(2);
    return value.toFixed(decimals);
}

// --- Restored Functions ---

function toggleCustomTraceCopper() {
    const select = document.getElementById('trace-copper');
    const customInput = document.getElementById('trace-copper-custom');
    if (customInput) customInput.style.display = select.value === 'custom' ? 'block' : 'none';
}

function toggleCustomDiffCopper() {
    const select = document.getElementById('diff-copper');
    const customInput = document.getElementById('diff-copper-custom');
    if (customInput) customInput.style.display = select.value === 'custom' ? 'block' : 'none';
}

function toggleCustomLossTraceCopper() {
    const select = document.getElementById('loss-trace-copper');
    const customInput = document.getElementById('loss-trace-copper-custom');
    if (customInput) customInput.style.display = select.value === 'custom' ? 'block' : 'none';
}

function setupTheme() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    chrome.storage?.local.get('theme').then(({ theme }) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }).catch(() => { });

    toggle.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';

        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        chrome.storage?.local.set({ theme: newTheme }).catch(() => { });
    });
}

function setupLanguage() {
    const toggle = document.getElementById('lang-toggle');
    if (!toggle) return;

    chrome.storage?.local.get('lang').then(({ lang }) => {
        if (lang) {
            currentLang = lang;
            toggle.textContent = lang.toUpperCase();
            applyLanguage();
        }
    }).catch(() => { });

    toggle.addEventListener('click', () => {
        currentLang = currentLang === 'tr' ? 'en' : 'tr';
        toggle.textContent = currentLang.toUpperCase();
        applyLanguage();
        chrome.storage?.local.set({ lang: currentLang }).catch(() => { });
    });
}

function applyLanguage() {
    document.querySelectorAll('[data-tr][data-en]').forEach(el => {
        const text = el.getAttribute(`data-${currentLang}`);
        if (text) el.textContent = text;
    });
    if (typeof updateAnnularLabels === 'function') updateAnnularLabels();
}

function t(tr, en) {
    return currentLang === 'tr' ? tr : en;
}

let currentUnit = 'mm';

function setupUnits() {
    const toggle = document.getElementById('unit-toggle');
    if (!toggle) return;

    // Load saved unit
    chrome.storage?.local.get('unit').then(({ unit }) => {
        if (unit) {
            currentUnit = unit;
            toggle.textContent = unit.toUpperCase();
            updateUnitLabels();
            if (unit === 'mil') convertInputsToMil();
        }
    }).catch(() => { });

    toggle.addEventListener('click', () => {
        const newUnit = currentUnit === 'mm' ? 'mil' : 'mm';
        toggle.textContent = newUnit.toUpperCase();

        if (newUnit === 'mil') {
            convertInputsToMil();
        } else {
            convertInputsToMm();
        }

        currentUnit = newUnit;
        updateUnitLabels();
        chrome.storage?.local.set({ unit: currentUnit }).catch(() => { });
    });
}

function updateUnitLabels() {
    const text = currentUnit;
    document.querySelectorAll('.unit-text').forEach(el => {
        el.textContent = text;
    });
    if (typeof updateAnnularLabels === 'function') updateAnnularLabels();
}

function updateAnnularLabels() {
    const select = document.getElementById('via-annular');
    if (!select) return;

    if (currentUnit === 'mil') {
        select.options[0].text = t('Kompakt (6 mil)', 'Compact (6 mil)');
        select.options[1].text = t('Standart (8 mil)', 'Standard (8 mil)');
        select.options[2].text = t('Sağlam (10 mil)', 'Robust (10 mil)');
    } else {
        select.options[0].text = t('Kompakt (0.15mm)', 'Compact (0.15mm)');
        select.options[1].text = t('Standart (0.20mm)', 'Standard (0.20mm)');
        select.options[2].text = t('Sağlam (0.25mm)', 'Robust (0.25mm)');
    }
}

function convertInputsToMil() {
    LENGTH_INPUTS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const mmVal = parseFloat(el.value);
        if (!isNaN(mmVal)) {
            el.value = (mmVal * 39.3701).toFixed(2);
        }
    });
}

function convertInputsToMm() {
    LENGTH_INPUTS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const milVal = parseFloat(el.value);
        if (!isNaN(milVal)) {
            el.value = (milVal * 0.0254).toFixed(3);
        }
    });
}

function parseLengthInput(id) {
    let val = parseInput(id);
    if (currentUnit === 'mil') {
        return val * 0.0254; // Convert to mm for calculation
    }
    return val; // Already mm
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            const content = document.getElementById(`tab-${tabId}`);
            if (content) content.classList.add('active');

            chrome.storage?.local.set({ lastTab: tabId }).catch(() => { });
        });
    });

    chrome.storage?.local.get('lastTab').then(({ lastTab }) => {
        if (lastTab) {
            const tab = document.querySelector(`[data-tab="${lastTab}"]`);
            if (tab) tab.click();
        }
    }).catch(() => { });
}

function setupCalculateButtons() {
    document.getElementById('btn-trace-calc')?.addEventListener('click', calculateTrace);
    document.getElementById('btn-via-calc')?.addEventListener('click', calculateVia);
    document.getElementById('btn-clear-calc')?.addEventListener('click', calculateClearance);
    document.getElementById('btn-diff-calc')?.addEventListener('click', calculateDiff);
    document.getElementById('btn-loss-calc')?.addEventListener('click', calculateLoss);
}

function createResultItem(label, value, unit = '') {
    return `
    <div class="result-item">
      <div class="label">${label}</div>
      <div class="value">${formatValue(value)}<span class="unit">${unit}</span></div>
    </div>
  `;
}

// =============================================================================
// TRACE WIDTH
// =============================================================================

function calculateTrace() {
    const current = parseInput('trace-current');
    const layer = document.getElementById('trace-layer').value;
    const tempRise = parseInput('trace-temp-rise');

    // Read copper - handle custom oz input
    const copperSelect = document.getElementById('trace-copper').value;
    let copperOz;
    if (copperSelect === 'custom') {
        copperOz = parseFloat(document.getElementById('trace-copper-custom').value) || 1;
    } else {
        copperOz = parseFloat(copperSelect);
    }

    if (current <= 0 || tempRise <= 0) return;

    const result = TraceWidthCalculator.calculate({
        current,
        copperThickness: copperOz,
        copperUnit: 'oz',
        tempRise,
        layer,
        standard: 'IPC2152',
        safetyFactor: 1.0
    });

    // ... (rest of display logic) ...
    const grid = document.getElementById('trace-result-grid');
    const card = document.getElementById('trace-results');
    card.style.display = 'block';

    // Build result based on selected unit
    let gridHtml = '';
    const thicknessUm = copperOz * 35;

    if (currentUnit === 'mil') {
        gridHtml += createResultItem(t('Minimum Genişlik (W)', 'Minimum Width (W)'), result.minWidth.mil, 'mil');
    } else {
        gridHtml += createResultItem(t('Minimum Genişlik (W)', 'Minimum Width (W)'), result.minWidth.mm, 'mm');
    }

    grid.innerHTML = gridHtml;
}

// Toggle custom plating input visibility
function toggleCustomPlating() {
    const select = document.getElementById('via-plating');
    const customInput = document.getElementById('via-plating-custom');
    if (customInput) customInput.style.display = select.value === 'custom' ? 'block' : 'none';
}

function calculateVia() {
    // Read all inputs
    const current = parseInput('via-current');
    const drill = parseLengthInput('via-drill');
    const annularRing = parseFloat(document.getElementById('via-annular').value);
    const boardThickness = parseLengthInput('via-board');
    const tempRise = parseInput('via-temp');

    // Read plating - handle custom oz input
    const platingSelect = document.getElementById('via-plating').value;
    let plating;
    if (platingSelect === 'custom') {
        const customOz = parseFloat(document.getElementById('via-plating-custom').value) || 1;
        plating = customOz * 34.8; // Convert oz to µm (1 oz = 34.8 µm)
    } else {
        plating = parseFloat(platingSelect);
    }

    // Basic validation
    if (current <= 0 || drill <= 0 || boardThickness <= 0 || plating <= 0 || tempRise <= 0) {
        return;
    }

    // Calculate Pad OD
    const padOD = drill + (2 * annularRing);

    // Calculate Aspect Ratio
    const aspectRatio = boardThickness / drill;
    const aspectOk = aspectRatio <= 10; // Max 10:1 for standard manufacturing

    // Call the ViaCurrentCalculator with all parameters
    const results = ViaCurrentCalculator.calculate({
        targetCurrent: current,
        drillDiameter: drill,
        boardThickness: boardThickness,
        platingThickness: plating,
        tempRise: tempRise
    });

    // Extract results
    const r = results.recommendation;
    const s = results.singleVia;

    // Build result using old grid style
    let gridHtml = `
        ${createResultItem(t('Gereken Via', 'Required Vias'), r.requiredVias, t('adet', 'pcs'))}
        ${createResultItem(t('Tek Via Kapasite', 'Single Via Cap'), s.effectiveCapacity.A.toFixed(2), 'A')}
        ${createResultItem(t('Boy Oranı', 'Aspect Ratio'), aspectRatio.toFixed(1) + ':1', aspectOk ? '✓' : '⚠')}
        ${createResultItem(t('Direnç', 'Resistance'), s.resistance.milliohms.toFixed(2), 'mΩ')}
        ${createResultItem(t('Güç Kaybı', 'Power Loss'), r.totalPowerLoss.mW.toFixed(1), 'mW')}
    `;

    // Note/warning section
    let noteHtml = '';
    if (!aspectOk) {
        noteHtml = `⚠️ ${t('Boy oranı yüksek! Üretim riski var.', 'High aspect ratio! Manufacturing risk.')}`;
    } else if (s.limitReason.includes('Thermal')) {
        noteHtml = `⚠️ ${t('Kapasite termal nedenle sınırlandı.', 'Capacity thermally limited.')}`;
    } else if (r.requiredVias > 1) {
        noteHtml = `💡 ${t('Paralel via önerilir.', 'Parallel vias recommended.')}`;
    } else {
        noteHtml = `✓ ${t('Tek via yeterli.', 'Single via sufficient.')}`;
    }

    // Render
    const card = document.getElementById('via-results');
    card.innerHTML = `
        <h3>${t('Via Hesaplama Sonuçları', 'Via Calculation Results')}</h3>
        <div class="result-grid">${gridHtml}</div>
        <div class="info-note">${noteHtml}</div>
    `;
    card.style.display = 'block';
}

// =============================================================================
// CLEARANCE - Voltage to minimum spacing
// =============================================================================

function calculateClearance() {
    const voltage = parseInput('clear-voltage');
    const vtype = document.getElementById('clear-vtype').value;
    const env = document.getElementById('clear-env').value;

    if (voltage <= 0) return;

    let peakVoltage = voltage;
    if (vtype === 'ac') {
        peakVoltage = voltage * 1.414; // RMS to peak
    }

    // Base clearance values (internal conductors, sea level)
    // These are conservative approximations from IPC-2221B/IEC standards
    const clearanceTable = [
        { v: 15, base: 0.05 },
        { v: 30, base: 0.05 },
        { v: 50, base: 0.13 },
        { v: 100, base: 0.13 },
        { v: 150, base: 0.4 },
        { v: 170, base: 0.5 },
        { v: 250, base: 0.5 },
        { v: 300, base: 0.8 },
        { v: 500, base: 2.5 },
    ];

    // Find appropriate clearance
    let baseClearance = 0.05; // minimum
    for (const entry of clearanceTable) {
        if (peakVoltage <= entry.v) {
            baseClearance = entry.base;
            break;
        }
        baseClearance = entry.base;
    }

    // Environment multipliers
    let multiplier = 1.0;
    let envName = '';

    switch (env) {
        case 'indoor':
            multiplier = 1.0;
            envName = t('İç mekan (temiz)', 'Indoor (clean)');
            break;
        case 'outdoor':
            multiplier = 1.5;
            envName = t('Dış mekan (kirli)', 'Outdoor (dirty)');
            break;
        case 'conformal':
            multiplier = 0.5; // Conformal coating allows smaller clearance
            envName = t('Conformal kaplama', 'Conformal coated');
            break;
    }

    const minClearance = baseClearance * multiplier;
    const minClearanceMil = minClearance * 39.37;

    // Creepage (surface distance) is typically 2-3x clearance
    const minCreepage = minClearance * 2.5;

    const grid = document.getElementById('clear-result-grid');
    const card = document.getElementById('clear-results');
    const note = document.getElementById('clear-note');
    if (note) note.style.display = 'none'; // Hide unused note element
    card.style.display = 'block';

    let gridHtml = '';

    if (currentUnit === 'mil') {
        gridHtml += createResultItem(t('Minimum Açıklık (Clearance)', 'Min. Clearance'), minClearanceMil.toFixed(1), 'mil');
        // Creepage usually follows same unit or stays mm in standards, but let's convert for consistency if requested
        gridHtml += createResultItem(t('Minimum Yüzeysel Kaçak (Creepage)', 'Min. Creepage'), (minCreepage * 39.37).toFixed(1), 'mil');
    } else {
        gridHtml += createResultItem(t('Minimum Açıklık (Clearance)', 'Min. Clearance'), minClearance.toFixed(2), 'mm');
        gridHtml += createResultItem(t('Minimum Yüzeysel Kaçak (Creepage)', 'Min. Creepage'), minCreepage.toFixed(2), 'mm');
    }

    gridHtml += createResultItem(t('Tepe Voltajı (V_peak)', 'Peak Voltage'), peakVoltage.toFixed(0), 'V');

    grid.innerHTML = gridHtml;
}

// =============================================================================
// DIFFERENTIAL PAIRS
// =============================================================================

// Toggle custom εr input visibility
function toggleCustomEr() {
    const select = document.getElementById('diff-er');
    const customInput = document.getElementById('diff-er-custom');
    if (customInput) customInput.style.display = select.value === 'custom' ? 'block' : 'none';
}

function calculateDiff() {
    try {
        const targetZdiff = parseInt(document.getElementById('diff-target').value);
        const h = parseLengthInput('diff-h');

        // Read copper - handle custom oz input
        const copperSelect = document.getElementById('diff-copper').value;
        let copperOz;
        if (copperSelect === 'custom') {
            copperOz = parseFloat(document.getElementById('diff-copper-custom').value) || 1;
        } else {
            copperOz = parseFloat(copperSelect);
        }

        // Read εr - handle custom input
        const erSelect = document.getElementById('diff-er').value;
        let er;
        if (erSelect === 'custom') {
            er = parseFloat(document.getElementById('diff-er-custom').value) || 4.0;
        } else {
            er = parseFloat(erSelect);
        }

        // Validation
        if (h <= 0 || er <= 0) {
            alert(t('Lütfen geçerli değerler giriniz (h > 0)', 'Please enter valid values (h > 0)'));
            return;
        }

        const t_mm = copperOz * 0.035; // oz to mm

        // Use solver
        const result = DifferentialPairsCalculator.solveForWidth({
            targetZdiff,
            type: 'microstrip',
            h, t: t_mm, er,
            sRatio: 1.0
        });

        // Verify
        const verify = DifferentialPairsCalculator.calculate({
            type: 'microstrip',
            w: result.w,
            s: result.s,
            h, t: t_mm, er
        });

        const grid = document.getElementById('diff-result-grid');
        const card = document.getElementById('diff-results');

        // Ensure elements exist
        if (!grid || !card) return;

        card.style.display = 'block';

        let gridHtml = '';
        if (currentUnit === 'mil') {
            gridHtml += createResultItem(t('İz Genişliği (w)', 'Trace Width (w)'), (result.w * 39.37).toFixed(2), 'mil');
            gridHtml += createResultItem(t('Aralık (s)', 'Spacing (s)'), (result.s * 39.37).toFixed(2), 'mil');
        } else {
            gridHtml += createResultItem(t('İz Genişliği (w)', 'Trace Width (w)'), result.w, 'mm');
            gridHtml += createResultItem(t('Aralık (s)', 'Spacing (s)'), result.s, 'mm');
        }

        gridHtml += createResultItem('Zdiff', verify.differential.zDiff, 'Ω');
        gridHtml += createResultItem('Z₀', verify.singleEnded.z0, 'Ω');

        grid.innerHTML = gridHtml;
    } catch (e) {
        console.error("Calculation Error:", e);
        alert("Hesaplama hatası: " + e.message);
    }
}

// =============================================================================
// LOSS CALCULATOR (R / Vdrop / Ploss)
// =============================================================================
function calculateLoss() {
    try {
        // Common Input
        const current = parseInput('loss-current');

        // Constants
        // Resistivity of Copper @ 20C = 1.724e-8 Ohm-m
        // Temp Coeff = 0.00393 per C
        const rhoRef = 1.724e-8; // Ohm-m
        const tempRef = 20;      // C
        const alpha = 0.00393;

        // Temperature Adjustment
        let tempVal = 25;
        if (document.getElementById('loss-temp')) {
            tempVal = parseFloat(document.getElementById('loss-temp').value) || 25;
        }

        // Rho at Temp T = RhoRef * [1 + alpha * (T - Tref)]
        const rho = rhoRef * (1 + alpha * (tempVal - tempRef));

        let resistance = 0; // Ohms

        // Inputs: Length (mm), Width (mm) - parseLengthInput handles MM/MIL -> MM conversion
        const lengthMm = parseLengthInput('loss-trace-len');
        const widthMm = parseLengthInput('loss-trace-width');

        // Copper Thickness
        const copperSelect = document.getElementById('loss-trace-copper');
        let copperOz = 1;
        if (copperSelect.value === 'custom') {
            const cInput = document.getElementById('loss-trace-copper-custom');
            copperOz = parseFloat(cInput.value) || 1;
        } else {
            copperOz = parseFloat(copperSelect.value);
        }
        // 1 oz = 35 um = 0.035 mm
        // Thickness in meters
        const thicknessM = (copperOz * 35e-6); // 1oz ~ 35um

        // Area (m2)
        const widthM = widthMm * 1e-3;
        const area = widthM * thicknessM;

        // Length (m)
        const lengthM = lengthMm * 1e-3;

        // R = rho * L / A
        if (area > 0) {
            resistance = rho * lengthM / area; // Ohms
        }

        // Calculations
        const resistanceMohm = resistance * 1000; // mOhms
        const voltageDrop = current * resistance; // Volts
        const powerLoss = current * current * resistance; // Watts

        // Output
        const grid = document.getElementById('loss-result-grid');
        const card = document.getElementById('loss-results');
        card.style.display = 'block';

        let html = '';

        // Resistance
        html += createResultItem(t('Direnç (R)', 'Resistance (R)'), resistanceMohm.toFixed(2), 'mΩ');

        if (current > 0) {
            // Voltage Drop
            html += createResultItem(t('Gerilim Düşümü', 'Voltage Drop'), (voltageDrop * 1000).toFixed(2), 'mV');

            // Power Loss
            html += createResultItem(t('Güç Kaybı', 'Power Loss'), (powerLoss * 1000).toFixed(2), 'mW');
        }

        grid.innerHTML = html;

    } catch (e) {
        console.error("Loss Calc Error", e);
    }
}
