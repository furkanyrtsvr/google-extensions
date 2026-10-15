document.addEventListener('DOMContentLoaded', () => {

    // --- Resistor Data ---
    const RESISTOR_COLORS = [
        { name: 'Black', val: 0, mult: 1, tol: null, ppm: null, hex: '#000000', text: '#fff' },
        { name: 'Brown', val: 1, mult: 10, tol: 1, ppm: 100, hex: '#592c16', text: '#fff' },
        { name: 'Red', val: 2, mult: 100, tol: 2, ppm: 50, hex: '#D32F2F', text: '#fff' },
        { name: 'Orange', val: 3, mult: 1000, tol: null, ppm: 15, hex: '#F57C00', text: '#000' },
        { name: 'Yellow', val: 4, mult: 10000, tol: null, ppm: 25, hex: '#FBC02D', text: '#000' },
        { name: 'Green', val: 5, mult: 100000, tol: 0.5, ppm: null, hex: '#388E3C', text: '#fff' },
        { name: 'Blue', val: 6, mult: 1000000, tol: 0.25, ppm: 10, hex: '#1976D2', text: '#fff' },
        { name: 'Violet', val: 7, mult: 10000000, tol: 0.1, ppm: 5, hex: '#7B1FA2', text: '#fff' },
        { name: 'Gray', val: 8, mult: 100000000, tol: 0.05, ppm: null, hex: '#9E9E9E', text: '#000' },
        { name: 'White', val: 9, mult: 1000000000, tol: null, ppm: null, hex: '#FFFFFF', text: '#000' },
        { name: 'Gold', val: null, mult: 0.1, tol: 5, ppm: null, hex: '#FFD700', text: '#000' },
        { name: 'Silver', val: null, mult: 0.01, tol: 10, ppm: null, hex: '#BDBDBD', text: '#000' }
    ];

    // Same Master List as options.js (cleaned)
    const UNITS = {
        Length: {
            base: 'm',
            units: {
                'pm (Picometer)': 1e-12, 'nm (Nanometer)': 1e-9, 'µm (Micrometer)': 1e-6,
                'mm (Millimeter)': 0.001, 'cm (Centimeter)': 0.01, 'dm': 0.1,
                'm (Meter)': 1, 'km (Kilometer)': 1000,
                'inch': 0.0254, 'ft (Foot)': 0.3048, 'yard': 0.9144, 'mile': 1609.344,
                'nautical mile': 1852, 'AU': 149597870700, 'Light Year': 9.461e15
            }
        },
        Mass: {
            base: 'kg',
            units: {
                'µg (Microgram)': 1e-9, 'mg (Milligram)': 1e-6, 'g (Gram)': 0.001,
                'kg (Kilogram)': 1, 'tonne': 1000, 'kt': 1e6, 'Mt': 1e9,
                'oz (Ounce)': 0.0283495, 'lb (Pound)': 0.45359237, 'US ton': 907.185
            }
        },
        Force: {
            base: 'N',
            units: {
                'pN': 1e-12, 'nN': 1e-9, 'µN': 1e-6, 'mN': 0.001,
                'N (Newton)': 1, 'kN': 1000, 'MN': 1e6, 'GN': 1e9,
                'kgf': 9.80665, 'lbf': 4.44822
            }
        },
        Pressure: {
            base: 'Pa',
            units: {
                'Pa (Pascal)': 1, 'hPa': 100, 'kPa': 1000, 'MPa': 1e6, 'GPa': 1e9,
                'bar': 100000, 'mbar': 100,
                'psi': 6894.76, 'atm': 101325, 'Torr (mmHg)': 133.322
            }
        },
        Torque: {
            base: 'N·m',
            units: {
                'N·m': 1, 'N·cm': 0.01, 'kgf·m': 9.80665,
                'lbf·ft': 1.355818, 'lbf·in': 0.112985
            }
        },
        Energy: {
            base: 'J',
            units: {
                'J (Joule)': 1, 'kJ': 1000, 'MJ': 1e6, 'GJ': 1e9,
                'Wh': 3600, 'kWh': 3.6e6,
                'cal': 4.184, 'kcal': 4184,
                'eV': 1.6022e-19, 'keV': 1.6022e-16, 'MeV': 1.6022e-13
            }
        },
        Power: {
            base: 'W',
            units: {
                'mW': 0.001, 'W (Watt)': 1, 'kW': 1000, 'MW': 1e6, 'GW': 1e9,
                'hp (Horsepower)': 745.7
            }
        },
        Temperature: {
            units: {
                'Celsius (°C)': 'C', 'Fahrenheit (°F)': 'F', 'Kelvin (K)': 'K'
            }
        },
        Time: {
            base: 's',
            units: {
                'ns': 1e-9, 'µs': 1e-6, 'ms': 0.001, 's (Second)': 1,
                'min': 60, 'h (Hour)': 3600, 'day': 86400, 'week': 604800
            }
        },
        Frequency: {
            base: 'Hz',
            units: {
                'mHz': 0.001, 'Hz': 1, 'kHz': 1000, 'MHz': 1e6, 'GHz': 1e9, 'THz': 1e12
            }
        },
        Speed: {
            base: 'm/s',
            units: {
                'm/s': 1, 'km/h': 0.277778, 'mph': 0.44704,
                'knot': 0.514444, 'ft/s': 0.3048
            }
        },
        Area: {
            base: 'm²',
            units: {
                'mm²': 1e-6, 'cm²': 0.0001, 'm²': 1, 'km²': 1e6,
                'in²': 0.00064516, 'ft²': 0.092903, 'ac (Acre)': 4046.86, 'ha (Hectare)': 10000
            }
        },
        Volume: {
            base: 'L',
            units: {
                'mL': 0.001, 'L (Liter)': 1, 'm³': 1000,
                'gal (US)': 3.78541, 'gal (UK)': 4.54609,
                'fl oz (US)': 0.0295735, 'cup': 0.236588, 'pint': 0.473176
            }
        },
        'Data Storage': {
            base: 'bit',
            units: {
                'bit': 1,
                'Byte': 8,
                'KB': 8 * 1024,
                'MB': 8 * Math.pow(1024, 2),
                'GB': 8 * Math.pow(1024, 3),
                'TB': 8 * Math.pow(1024, 4),
                'PB': 8 * Math.pow(1024, 5)
            }
        },
        Current: {
            base: 'A',
            units: {
                'pA (Pico)': 1e-12, 'nA (Nano)': 1e-9, 'µA (Micro)': 1e-6, 'mA (Milli)': 0.001,
                'A (Ampere)': 1, 'kA (Kilo)': 1000
            }
        },
        Voltage: {
            base: 'V',
            units: {
                'µV': 1e-6, 'mV': 0.001, 'V (Volt)': 1, 'kV': 1000, 'MV': 1e6
            }
        },
        Resistance: {
            base: 'Ω',
            units: {
                'mΩ': 0.001, 'Ω (Ohm)': 1, 'kΩ': 1000, 'MΩ': 1e6, 'GΩ': 1e9
            }
        },
        Capacitance: {
            base: 'F',
            units: {
                'pF': 1e-12, 'nF': 1e-9, 'µF': 1e-6, 'mF': 0.001, 'F (Farad)': 1
            }
        },
        Inductance: {
            base: 'H',
            units: {
                'pH': 1e-12, 'nH': 1e-9, 'µH': 1e-6, 'mH': 0.001, 'H (Henry)': 1
            }
        },
        Conductance: {
            base: 'S',
            units: {
                'µS': 1e-6, 'mS': 0.001, 'S (Siemens)': 1
            }
        }
    };

    // UI Elements - Standard
    const categorySelect = document.getElementById('uc-category');
    const inputField = document.getElementById('uc-input');
    const fromSelect = document.getElementById('uc-from');
    const toSelect = document.getElementById('uc-to');
    const resultDisplay = document.getElementById('uc-result');
    const resultUnitLabel = document.getElementById('uc-result-unit');
    const settingsBtn = document.getElementById('uc-settings-btn');
    const themeBtn = document.getElementById('uc-theme-btn');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const converterContainer = document.getElementById('uc-converter-container');
    const resistorContainer = document.getElementById('uc-resistor-container');
    const downloadContainer = document.getElementById('uc-download-container');

    // UI Elements - Resistor
    const viewColorToVal = document.getElementById('view-color-to-val');
    const viewValToColor = document.getElementById('view-val-to-color');
    const bandBtns = document.querySelectorAll('.uc-band-btn');
    const rcBands = {
        b1: document.getElementById('rc-band1'),
        b2: document.getElementById('rc-band2'),
        b3: document.getElementById('rc-band3'),
        mul: document.getElementById('rc-mul'),
        tol: document.getElementById('rc-tol'),
        ppm: document.getElementById('rc-ppm')
    };
    const rcResultVal = document.getElementById('rc-result-val');
    const rcResultTol = document.getElementById('rc-result-tol');
    const rcInputVal = document.getElementById('rc-input-val');
    const rcInputTol = document.getElementById('rc-input-tol');
    const rcCalcPreview = document.getElementById('rc-calc-preview');
    const rcTextResult = document.getElementById('rc-text-result');

    // UI Elements - Download Calc
    const dlSpeedInput = document.getElementById('dl-speed-input');
    const dlSpeedUnit = document.getElementById('dl-speed-unit');
    const dlSizeInput = document.getElementById('dl-size-input');
    const dlSizeUnit = document.getElementById('dl-size-unit');
    const dlRateDisplay = document.getElementById('dl-rate-display');
    const dlRateDetail = document.getElementById('dl-rate-detail');
    const dlResultTime = document.getElementById('dl-result-time');
    const dlBackBtn = document.getElementById('dl-back-btn');

    // UI Elements - SMD Decoder
    const smdContainer = document.getElementById('uc-smd-container');
    const smdBackBtn = document.getElementById('smd-back-btn');

    // --- Theme Toggle ---
    function loadTheme() {
        const theme = localStorage.getItem('uc_theme') || 'dark';
        chrome.storage.local.set({ uc_theme: theme });

        if (theme === 'light') {
            document.body.classList.add('light-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            document.body.classList.remove('light-theme');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }

    function toggleTheme() {
        const isLight = document.body.classList.toggle('light-theme');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem('uc_theme', theme);
        chrome.storage.local.set({ uc_theme: theme });

        if (isLight) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    }

    if (themeBtn) {
        themeBtn.addEventListener('click', toggleTheme);
    }
    loadTheme();

    // --- State Persistence ---
    function saveState() {
        const state = {
            category: categorySelect.value,
            inputVal: inputField.value,
            from: fromSelect.value,
            to: toSelect.value
        };
        localStorage.setItem('uc_state', JSON.stringify(state));
    }

    function loadState() {
        const saved = localStorage.getItem('uc_state');
        return saved ? JSON.parse(saved) : null;
    }

    // --- Initialization ---
    function populateCategories() {
        const groups = {
            'Mechanical': ['Length', 'Mass', 'Force', 'Pressure', 'Torque', 'Power', 'Speed', 'Area', 'Volume'],
            'Electrical': ['Current', 'Voltage', 'Resistance', 'Capacitance', 'Inductance', 'Conductance', 'Energy', 'Power', 'Frequency', 'Resistor Color Code', 'SMD Code Decoder'],
            'Physics/Other': ['Temperature', 'Time', 'Data Storage', 'Download Calculator']
        };

        categorySelect.innerHTML = '';

        for (const [groupName, cats] of Object.entries(groups)) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                optgroup.appendChild(opt);
            });
            categorySelect.appendChild(optgroup);
        }
    }

    function handleCategoryChange() {
        const cat = categorySelect.value;

        // Hide all custom containers first
        resistorContainer.style.display = 'none';
        downloadContainer.style.display = 'none';
        converterContainer.style.display = 'none';

        if (cat === 'Resistor Color Code') {
            resistorContainer.style.display = 'block';
            saveState();
        } else if (cat === 'Download Calculator') {
            downloadContainer.style.display = 'block';
            saveState();
        } else if (cat === 'SMD Code Decoder') {
            smdContainer.style.display = 'block';
            // Start Default
            smdType = 'res';
            updateSMDUI();
            saveState();
        } else {
            converterContainer.style.display = 'block';
            populateUnits(cat);
            convert();
        }
    }

    function populateUnits(category, preferredFrom, preferredTo) {
        if (!UNITS[category]) return;

        let unitData = UNITS[category].units;
        const unitKeysRaw = Object.keys(unitData);

        const hiddenUnits = JSON.parse(localStorage.getItem('uc_hidden_units') || '[]');
        const unitKeys = unitKeysRaw.filter(u => !hiddenUnits.includes(u));

        fromSelect.innerHTML = '';
        toSelect.innerHTML = '';

        unitKeys.forEach(u => {
            fromSelect.appendChild(createOption(u, u));
            toSelect.appendChild(createOption(u, u));
        });

        // Set selections
        if (preferredFrom && unitKeys.includes(preferredFrom)) fromSelect.value = preferredFrom;
        else if (unitKeys.length > 0) fromSelect.selectedIndex = 0;

        if (preferredTo && unitKeys.includes(preferredTo)) toSelect.value = preferredTo;
        else if (unitKeys.length >= 2) toSelect.selectedIndex = 1;
        else if (unitKeys.length > 0) toSelect.selectedIndex = 0;
    }

    function createOption(val, text) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = text;
        return opt;
    }

    // --- Settings Link ---
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    // --- Standard Converter Logic ---
    function convert() {
        const category = categorySelect.value;
        if (category === 'Resistor Color Code' || category === 'Download Calculator') return;

        const val = parseFloat(inputField.value);
        const from = fromSelect.value;
        const to = toSelect.value;
        saveState();

        if (isNaN(val) || !from || !to) {
            resultDisplay.textContent = '...';
            resultUnitLabel.textContent = '';
            return;
        }

        let result;
        const fromUnit = UNITS[category].units[from];
        const toUnit = UNITS[category].units[to];

        if (category === 'Temperature') {
            result = convertTemperature(val, from, to);
        } else {
            result = (val * fromUnit) / toUnit;
        }

        let resultText;
        if (Math.abs(result) < 1e-6 || Math.abs(result) > 1e7) {
            resultText = result.toExponential(4).replace('e+', ' x 10^').replace('e-', ' x 10^-');
        } else {
            resultText = parseFloat(result.toPrecision(8)).toString();
        }

        resultDisplay.textContent = resultText;
        resultUnitLabel.textContent = to;
    }

    function convertTemperature(val, from, to) {
        if (from === to) return val;
        const valK = toKelvin(val, from);
        return fromKelvin(valK, to);
    }

    function toKelvin(val, unit) {
        if (unit.startsWith('Celsius')) return val + 273.15;
        if (unit.startsWith('Fahrenheit')) return (val - 32) * (5 / 9) + 273.15;
        if (unit.startsWith('Kelvin')) return val;
        return val;
    }

    function fromKelvin(k, unit) {
        if (unit.startsWith('Celsius')) return k - 273.15;
        if (unit.startsWith('Fahrenheit')) return (k - 273.15) * (9 / 5) + 32;
        if (unit.startsWith('Kelvin')) return k;
        return k;
    }

    // --- Resistor Calculator Logic ---
    let rcMode = 'color-to-val';
    let rcBandsCount = 4;

    function initResistorUI() {
        // Populate Dropdowns with STRICT filtering based on images
        // Digits: Black(0) to White(9)
        populateResistorSelect(rcBands.b1, RESISTOR_COLORS.filter(c => c.val !== null), 'val');
        populateResistorSelect(rcBands.b2, RESISTOR_COLORS.filter(c => c.val !== null), 'val');
        populateResistorSelect(rcBands.b3, RESISTOR_COLORS.filter(c => c.val !== null), 'val');

        // Mul: All colors
        populateResistorSelect(rcBands.mul, RESISTOR_COLORS, 'mult');

        // Tol: Brown(1), Red(2), Green(0.5), Blue(0.25), Violet(0.1), Gray(0.05), Gold(5), Silver(10)
        populateResistorSelect(rcBands.tol, RESISTOR_COLORS.filter(c => c.tol !== null), 'tol');

        // PPM: Brown(100), Red(50), Orange(15), Yellow(25), Blue(10), Violet(5)
        populateResistorSelect(rcBands.ppm, RESISTOR_COLORS.filter(c => c.ppm !== null), 'ppm');

        // Defaults
        rcBands.b1.selectedIndex = 1; // Brown
        rcBands.b2.selectedIndex = 0; // Black
        rcBands.b3.selectedIndex = 0; // Black
        rcBands.mul.selectedIndex = 2; // Red
        rcBands.tol.value = 'Gold';
        // Select first valid PPM (Brown)
        if (rcBands.ppm.options.length > 0) rcBands.ppm.selectedIndex = 0;

        updateResistorCalculation();
    }

    function populateResistorSelect(selectElement, colors, type) {
        selectElement.innerHTML = '';
        colors.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.name;

            // User requested CLEAN names in the closed box (e.g. "Brown" not "Brown (1)")
            // Standard <select> elements cannot show different text in the list vs the box easily.
            // To prioritize the "Clean Box" look, we are setting textContent to just the Name.
            // We'll add the value to the title for hover context.

            opt.textContent = c.name;

            let infoText = '';
            if (type === 'val') infoText = `Value: ${c.val}`;
            else if (type === 'mult') infoText = `Multiplier: x${c.mult}`;
            else if (type === 'tol') infoText = `Tolerance: ±${c.tol}%`;
            else if (type === 'ppm') infoText = `PPM: ${c.ppm}`;

            if (infoText) opt.title = infoText;

            opt.style.backgroundColor = c.hex;
            opt.style.color = c.text;

            // Attempt to style the font for better readability
            opt.style.fontWeight = '500';

            selectElement.appendChild(opt);
        });
    }

    function updateResistorCalculation() {
        if (rcMode !== 'color-to-val') return;

        const c1 = RESISTOR_COLORS.find(c => c.name === rcBands.b1.value);
        const c2 = RESISTOR_COLORS.find(c => c.name === rcBands.b2.value);
        const cm = RESISTOR_COLORS.find(c => c.name === rcBands.mul.value);
        const ct = RESISTOR_COLORS.find(c => c.name === rcBands.tol.value);

        const c3 = RESISTOR_COLORS.find(c => c.name === rcBands.b3.value); // Might be unused in 4-band
        const cpp = RESISTOR_COLORS.find(c => c.name === rcBands.ppm.value);

        let digits = c1.val * 10 + c2.val;
        let ohm = 0;

        // Visual Layout: We update the DOM elements directly
        const visuals = document.querySelectorAll('#rc-visual-preview .rc-band');
        // HTML structure: band-1, band-2, band-3, band-4, band-5, band-6

        // Reset all to hidden first
        visuals.forEach(v => v.style.display = 'none');

        // Common: Band 1 & 2
        visuals[0].style.display = 'block'; visuals[0].style.backgroundColor = c1.hex;
        visuals[1].style.display = 'block'; visuals[1].style.backgroundColor = c2.hex;

        if (rcBandsCount === 4) {
            // 4 Band: b1, b2, [GAP], mul, tol
            // We use visuals[0], visuals[1], visuals[3](mul), visuals[4](tol)
            // But to make it look nice, let's use standard slots:
            // Let's use internal logic:
            // 4-Band often looks like: [1][2]...[M][T]

            visuals[2].style.display = 'none'; // 3rd digit hidden

            // Multiplier in 3rd visible slot? Or 4th slot?
            // Let's stick to the visual structure relative to positions
            visuals[3].style.display = 'block'; visuals[3].style.backgroundColor = cm.hex;
            visuals[4].style.display = 'block'; visuals[4].style.backgroundColor = ct.hex;

        } else if (rcBandsCount >= 5) {
            // 5 Band & 6 Band share digit logic
            digits = digits * 10 + c3.val;

            visuals[2].style.display = 'block'; visuals[2].style.backgroundColor = c3.hex;
            visuals[3].style.display = 'block'; visuals[3].style.backgroundColor = cm.hex;
            visuals[4].style.display = 'block'; visuals[4].style.backgroundColor = ct.hex;

            if (rcBandsCount === 6) {
                // Add PPM
                visuals[5].style.display = 'block'; visuals[5].style.backgroundColor = cpp.hex;
            }
        }

        ohm = digits * cm.mult;

        rcResultVal.textContent = formatOhm(ohm);
        let tolText = `±${ct.tol}%`;
        if (rcBandsCount === 6 && cpp && cpp.ppm) {
            tolText += ` (${cpp.ppm} ppm)`;
        }
        rcResultTol.textContent = tolText;
    }

    function formatOhm(val) {
        if (val >= 1e6) return (val / 1e6).toFixed(val % 1e6 === 0 ? 0 : 2) + ' MΩ';
        if (val >= 1e3) return (val / 1e3).toFixed(val % 1e3 === 0 ? 0 : 2) + ' kΩ';
        return val + ' Ω';
    }

    // State for Reverse Calculator
    let revCalcState = {
        results: {}, // { 4: data, 5: data }
        currentBand: 4,
        availableBands: []
    };

    function updateValToColor() {
        const valStr = rcInputVal.value.trim();
        let valText = valStr.toLowerCase();
        let multiplier = 1;

        if (valText.endsWith('k')) multiplier = 1000;
        else if (valText.endsWith('m')) multiplier = 1000000;

        let cleanVal = valText.replace(/[^0-9.]/g, '');
        let val = parseFloat(cleanVal);

        const container = rcCalcPreview;
        container.innerHTML = '';
        container.style.display = 'block'; // Reset to block

        if (isNaN(val)) {
            renderBlankVisual(container);
            return;
        }
        val = val * multiplier;

        let tolVal = rcInputTol.value;
        let tolObj = RESISTOR_COLORS.find(c => c.name === tolVal) || RESISTOR_COLORS.find(c => c.name === 'Gold');

        // Reset State
        revCalcState.results = {};
        revCalcState.availableBands = [];

        // --- Analysis ---
        // Handle 0
        if (val === 0) {
            revCalcState.results[4] = { c1: getCol(0), c2: getCol(0), cm: getCol(0), ct: tolObj };
            revCalcState.results[5] = { c1: getCol(0), c2: getCol(0), c3: getCol(0), cm: getCol(0), ct: tolObj };
            revCalcState.availableBands = [4, 5];
        } else {
            // Check 2 Significant Digits
            let temp2 = val;
            let exp2 = 0;
            while (temp2 >= 100) { temp2 /= 10; exp2++; }
            while (temp2 < 10 && temp2 > 0) { temp2 *= 10; exp2--; }

            let isTwoSig = (Math.abs(Math.round(temp2) - temp2) < 0.001);

            if (isTwoSig) {
                // 4 Band Calculation
                let digits = Math.round(temp2);
                let d1 = Math.floor(digits / 10);
                let d2 = digits % 10;
                let mExp4 = Math.round(Math.log10(val / digits));

                revCalcState.results[4] = {
                    c1: getCol(d1), c2: getCol(d2), cm: getMul(mExp4), ct: tolObj
                };

                // 5 Band Calculation (Same number, extra 0)
                // Digits: d1 d2 0
                let mExp5 = mExp4 - 1;
                revCalcState.results[5] = {
                    c1: getCol(d1), c2: getCol(d2), c3: getCol(0), cm: getMul(mExp5), ct: tolObj
                };

                revCalcState.availableBands = [4, 5];

            } else {
                // Check 3 Significant Digits (or fallback)
                // 5 Band Mandatory
                let temp3 = val;
                while (temp3 >= 1000) temp3 /= 10;
                while (temp3 < 100 && temp3 > 0) temp3 *= 10;

                let digits = Math.round(temp3);
                // Clamp max (999)

                let d1 = Math.floor(digits / 100);
                let d2 = Math.floor((digits % 100) / 10);
                let d3 = digits % 10;
                let mExp = Math.round(Math.log10(val / digits));

                revCalcState.results[5] = {
                    c1: getCol(d1), c2: getCol(d2), c3: getCol(d3), cm: getMul(mExp), ct: tolObj
                };

                revCalcState.availableBands = [5];
            }
        }

        // Determine Default View
        // If both avail, default 4 (unless user already toggled? let's reset to 4 for new number)
        // User asked: "ikisi iççin çizim varsa default ilk 4 band için gösterecek"
        if (revCalcState.availableBands.includes(4)) {
            revCalcState.currentBand = 4;
        } else if (revCalcState.availableBands.includes(5)) {
            revCalcState.currentBand = 5;
        } else {
            // No valid calculation, clear state
            revCalcState.results = {};
            revCalcState.availableBands = [];
            container.innerHTML = 'No valid resistor color code found for this value.';
            return;
        }

        renderRevVisual();
    }

    function renderBlankVisual(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'rc-result-wrapper';

        const visual = document.createElement('div');
        visual.className = 'uc-resistor-visual';
        visual.style.width = '100%';

        const bodyBg = document.createElement('div');
        bodyBg.className = 'rc-body';
        visual.appendChild(bodyBg);

        wrapper.appendChild(visual);

        // Empty text placeholder to keep layout stable or just nothing
        const text = document.createElement('div');
        text.className = 'rc-result-text';
        text.innerHTML = '&nbsp;'; // maintain height
        wrapper.appendChild(text);

        container.appendChild(wrapper);

        rcTextResult.style.display = 'none';
    }

    function renderRevVisual() {
        const container = rcCalcPreview;
        container.innerHTML = '';

        const bands = revCalcState.currentBand;
        const data = revCalcState.results[bands];

        if (!data) {
            container.innerHTML = 'No valid resistor color code found for this value.';
            return;
        }

        // --- Render Single Result ---
        const wrapper = document.createElement('div');
        wrapper.className = 'rc-result-wrapper';

        // Visual Body
        const visual = document.createElement('div');
        visual.className = 'uc-resistor-visual';
        visual.style.width = '100%';

        // Background Capsule
        const bodyBg = document.createElement('div');
        bodyBg.className = 'rc-body';
        visual.appendChild(bodyBg);

        // Bands Container
        const bandContainer = document.createElement('div');
        bandContainer.style.display = 'flex';
        bandContainer.style.justifyContent = 'space-evenly';
        bandContainer.style.alignItems = 'center';
        bandContainer.style.width = '60%';
        bandContainer.style.height = '100%';
        bandContainer.style.zIndex = '2'; // Bands above body
        bandContainer.style.position = 'relative'; // context

        let colors = [];
        if (bands === 4) colors = [data.c1, data.c2, data.cm, data.ct];
        else colors = [data.c1, data.c2, data.c3, data.cm, data.ct];

        colors.forEach(c => {
            const b = document.createElement('div');
            b.className = 'rc-band';
            if (c) b.style.backgroundColor = c.hex;
            b.style.display = 'block';
            bandContainer.appendChild(b);
        });

        visual.appendChild(bandContainer);

        // Badge
        const badge = document.createElement('div');
        badge.className = 'rc-band-badge';
        badge.textContent = bands;

        // Toggle Logic
        if (revCalcState.availableBands.length > 1) {
            badge.title = "Click to toggle 4/5 bands";
            badge.style.cursor = 'pointer';
            badge.onclick = (e) => {
                e.stopPropagation();
                // Toggle
                revCalcState.currentBand = (revCalcState.currentBand === 4) ? 5 : 4;
                renderRevVisual();
            };
        } else {
            badge.style.cursor = 'default';
        }

        visual.appendChild(badge);
        wrapper.appendChild(visual);

        // Text
        const text = document.createElement('div');
        text.className = 'rc-result-text';

        let names = [];
        colors.forEach(c => { if (c) names.push(c.name); });

        text.textContent = names.join(' - ');
        wrapper.appendChild(text);

        container.appendChild(wrapper);

        rcTextResult.style.display = 'none';
    }

    function getCol(val) {
        return RESISTOR_COLORS.find(c => c.val === val);
    }

    function getMul(exp) {
        let target = Math.pow(10, exp);
        // Find color with mult closest to 10^exp
        // mult property is number (1, 10, 100...)
        // Handle floating point epsilon
        return RESISTOR_COLORS.find(c => Math.abs(Math.log10(c.mult) - exp) < 0.1) || RESISTOR_COLORS[0];
    }

    // --- SMD Calculator Logic ---

    const smdTypeResBtn = document.getElementById('smd-type-res');
    const smdTypeCapBtn = document.getElementById('smd-type-cap');
    const smdBody = document.getElementById('smd-body');
    const smdTextDisplay = document.getElementById('smd-text-display');
    const smdInput = document.getElementById('smd-input-code');
    const smdResultVal = document.getElementById('smd-result-val');
    const smdResultDesc = document.getElementById('smd-result-desc');
    const smdCopyBtn = document.getElementById('smd-copy-btn');

    let smdType = 'res'; // 'res' or 'cap'

    const EIA96_Multipliers = {
        'Z': 0.001, 'Y': 0.01, 'R': 0.01, 'X': 0.1, 'S': 0.1,
        'A': 1, 'B': 10, 'C': 100, 'D': 1000, 'E': 10000, 'F': 100000
    };

    // Standard EIA-96 Table (01 to 96)
    const EIA96_Table = [
        0, // padding for 1-based index
        100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158,
        162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255,
        261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412,
        422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665,
        681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976
    ];

    function updateSMDUI() {
        // Toggle Active State
        if (smdType === 'res') {
            smdTypeResBtn.classList.add('active');
            smdTypeCapBtn.classList.remove('active');
            smdBody.className = 'smd-component smd-resistor';
            smdInput.placeholder = "e.g. 102, 4R7, 01C";
        } else {
            smdTypeResBtn.classList.remove('active');
            smdTypeCapBtn.classList.add('active');
            smdBody.className = 'smd-component smd-capacitor';
            smdInput.placeholder = "e.g. 104, 1u0, 4n7";
        }
        calculateSMD();
    }

    function calculateSMD() {
        const rawCode = smdInput.value.trim();
        smdTextDisplay.textContent = rawCode || 'CODE';

        if (!rawCode) {
            smdResultVal.textContent = '-';
            smdResultDesc.textContent = 'Enter code...';
            return;
        }

        const code = rawCode.toUpperCase();
        let value = 0;
        let unit = '';
        let desc = '';
        let valid = false;

        if (smdType === 'res') {
            unit = 'Ω';
            // Logic 1: R in code (Decimal) -> 4R7, R22, 0R
            if (code.includes('R') || code.includes('L') || code.includes('M')) { // Sometimes notation varies, usually R
                // Handle 4R7 = 4.7
                if (/^[\dR]+$/.test(code)) {
                    const valStr = code.replace('R', '.');
                    value = parseFloat(valStr);
                    if (!isNaN(value)) {
                        valid = true;
                        desc = 'Decimal notation (R acts as dot)';
                    }
                }
            }

            // Logic 2: EIA-96 (2 digits + 1 letter) e.g. 01C
            if (!valid && code.length === 3) {
                const digits = parseInt(code.substring(0, 2));
                const letter = code.substring(2);
                if (digits >= 1 && digits <= 96 && EIA96_Multipliers[letter]) {
                    value = EIA96_Table[digits] * EIA96_Multipliers[letter];
                    valid = true;
                    desc = `EIA-96: Code ${digits} (${EIA96_Table[digits]}) × ${letter} (${EIA96_Multipliers[letter]})`;
                }
            }

            // Logic 3: Standard 3 or 4 Digit (Last digit is exponent)
            if (!valid && /^\d+$/.test(code)) {
                if (code.length === 3 || code.length === 4) {
                    const baseStr = code.substring(0, code.length - 1);
                    const expStr = code.substring(code.length - 1);
                    const base = parseInt(baseStr);
                    const exp = parseInt(expStr);

                    value = base * Math.pow(10, exp);
                    valid = true;
                    desc = `${code.length}-Digit Standard: ${base} × 10^${exp}`;
                }
            }

            if (valid) {
                smdResultVal.textContent = formatOhm(value); // Reuse existing helper
                smdResultDesc.textContent = desc;
            }

        } else {
            // Capacitor
            unit = 'F'; // base

            // Logic 1: Units in code (4n7, 2p2, 1u0)
            const unitMatch = code.match(/^(\d+)([pnµu])(\d+)$/i); // e.g. 4n7
            if (unitMatch) {
                const b1 = unitMatch[1];
                const uChar = unitMatch[2].toLowerCase();
                const b2 = unitMatch[3];
                const fullStr = b1 + '.' + b2;
                let valNum = parseFloat(fullStr);

                let uLabel = '';
                if (uChar === 'p') { uLabel = 'pF'; }
                else if (uChar === 'n') { uLabel = 'nF'; }
                else if (uChar === 'u' || uChar === 'µ') { uLabel = 'µF'; }

                smdResultVal.textContent = `${valNum} ${uLabel}`;
                smdResultDesc.textContent = 'Decimal with Unit Position';
                valid = true;
            }

            // Logic 2: Simple Direct Unit (e.g. 100n, 10u) works too? usually no digits after
            if (!valid) {
                const simpleUnit = code.match(/^([\d.]+)([pnµu])$/i);
                if (simpleUnit) {
                    let valNum = parseFloat(simpleUnit[1]);
                    let uChar = simpleUnit[2].toLowerCase();
                    let uLabel = (uChar === 'p') ? 'pF' : (uChar === 'n') ? 'nF' : 'µF';
                    smdResultVal.textContent = `${valNum} ${uLabel}`;
                    smdResultDesc.textContent = 'Direct Value';
                    valid = true;
                }
            }

            // Logic 3: 3 Digit Code (Standard pF) -> 104 = 100nF
            if (!valid && /^\d{3}$/.test(code)) {
                const base = parseInt(code.substring(0, 2));
                const exp = parseInt(code.substring(2));
                const pF = base * Math.pow(10, exp);

                // Format pF to nF/uF
                let finalVal = pF + ' pF';
                if (pF >= 1000000) finalVal = (pF / 1000000) + ' µF';
                else if (pF >= 1000) finalVal = (pF / 1000) + ' nF';

                smdResultVal.textContent = finalVal;
                smdResultDesc.textContent = `3-Digit: ${base} × 10^${exp} pF`;
                valid = true;
            }
        }

        if (!valid) {
            smdResultVal.textContent = "Unknown";
            smdResultDesc.textContent = "Could not decode format";
        }
    }

    // Reuse listeners setup to bind new elements
    function setupSMDListeners() {
        if (smdBackBtn) {
            smdBackBtn.addEventListener('click', () => {
                smdContainer.style.display = 'none';
                converterContainer.style.display = 'block';
                categorySelect.selectedIndex = 0;
                // Force change event
                categorySelect.dispatchEvent(new Event('change'));
            });
        }

        smdTypeResBtn.addEventListener('click', () => { smdType = 'res'; updateSMDUI(); });
        smdTypeCapBtn.addEventListener('click', () => { smdType = 'cap'; updateSMDUI(); });
        smdInput.addEventListener('input', calculateSMD);

        smdCopyBtn.addEventListener('click', () => {
            const text = smdResultVal.textContent;
            if (text && text !== '-') {
                navigator.clipboard.writeText(text);
                // Brief feedback
                const orig = smdCopyBtn.innerHTML;
                smdCopyBtn.innerHTML = '<span style="font-size:10px">✓</span>';
                setTimeout(() => smdCopyBtn.innerHTML = orig, 1000);
            }
        });
    }

    // Listens
    function setupResistorListeners() {
        const backBtn = document.getElementById('rc-back-btn');
        const modeToggleBtn = document.getElementById('rc-mode-toggle-btn');
        const modeLabel = document.getElementById('rc-mode-label');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Return to main converter
                resistorContainer.style.display = 'none';
                converterContainer.style.display = 'block';
                // Reset category to avoid being stuck
                categorySelect.selectedIndex = 0; // Length
                populateUnits('Length');
                convert();
            });
        }

        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', () => {
                if (rcMode === 'color-to-val') {
                    // Switch to 2: Val -> Color
                    rcMode = 'val-to-color';
                    modeLabel.textContent = 'Value → Colors';
                    viewColorToVal.style.display = 'none';
                    viewValToColor.style.display = 'block';
                    updateValToColor();
                } else {
                    // Switch back to 1: Color -> Val
                    rcMode = 'color-to-val';
                    modeLabel.textContent = 'Colors → Value';
                    viewValToColor.style.display = 'none';
                    viewColorToVal.style.display = 'block';
                    updateResistorCalculation();
                }
            });
        }

        bandBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                bandBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                rcBandsCount = parseInt(btn.dataset.bands);

                const grp3 = document.getElementById('grp-band3');
                const grpPpm = document.getElementById('grp-ppm');

                if (rcBandsCount >= 5) {
                    grp3.style.display = 'flex';
                } else {
                    grp3.style.display = 'none';
                }

                if (rcBandsCount === 6) {
                    grpPpm.style.display = 'flex';
                } else {
                    grpPpm.style.display = 'none';
                }

                updateResistorCalculation(); // Refresh
            });
        });

        // Dropdowns
        Object.values(rcBands).forEach(sel => sel.addEventListener('change', updateResistorCalculation));

        // Reverse
        rcInputVal.addEventListener('input', updateValToColor);
        rcInputTol.addEventListener('change', updateValToColor);
    }

    // --- Download Calculator Logic ---
    function setupDownloadListeners() {
        if (dlBackBtn) {
            dlBackBtn.addEventListener('click', () => {
                downloadContainer.style.display = 'none';
                converterContainer.style.display = 'block';
                categorySelect.selectedIndex = 0;
                populateUnits('Length');
                convert();
            });
        }

        dlSpeedInput.addEventListener('input', updateDownloadCalc);
        dlSpeedUnit.addEventListener('change', updateDownloadCalc);
        dlSizeInput.addEventListener('input', updateDownloadCalc);
        dlSizeUnit.addEventListener('change', updateDownloadCalc);
    }

    function updateDownloadCalc() {
        const speedVal = parseFloat(dlSpeedInput.value);
        const sizeVal = parseFloat(dlSizeInput.value);

        let sUnit = dlSpeedUnit.value;
        let dUnit = 'Mb/s';
        if (sUnit === 'Gbps') dUnit = 'Gb/s';
        else if (sUnit === 'Kbps') dUnit = 'Kb/s';

        if (isNaN(speedVal) || speedVal <= 0) {
            // Default based on selection
            let mainUnit = 'MB/s';
            if (sUnit === 'Gbps') mainUnit = 'GB/s';
            else if (sUnit === 'Kbps') mainUnit = 'KB/s';

            dlRateDisplay.textContent = `0 ${mainUnit}`;
            dlRateDetail.textContent = `(0 ${dUnit} / 8)`;
            dlResultTime.textContent = '...';
            return;
        }

        // 1. Calculate Rate in MB/s (Base for calculation)
        let speedInMbps = speedVal;
        if (sUnit === 'Gbps') speedInMbps = speedVal * 1000;
        else if (sUnit === 'Kbps') speedInMbps = speedVal / 1000;

        const rateMBps = speedInMbps / 8;

        // 2. Determine Display Unit for Rate
        let displayRate = rateMBps;
        let displayUnit = 'MB/s';

        if (sUnit === 'Gbps') {
            displayRate = rateMBps / 1000; // Use metric (1000) to match "Just divide by 8" expectation
            displayUnit = 'GB/s';
        } else if (sUnit === 'Kbps') {
            // Note: rateMBps is in MB/s. 1 MB/s = 1000 KB/s (Metric)
            displayRate = rateMBps * 1000;
            displayUnit = 'KB/s';
        }

        // Display Rate
        dlRateDisplay.textContent = `${parseFloat(displayRate.toFixed(2))} ${displayUnit}`;
        dlRateDetail.textContent = `(${parseFloat(speedVal.toFixed(2))} ${dUnit} / 8)`;

        if (isNaN(sizeVal) || sizeVal <= 0) {
            dlResultTime.textContent = '...';
            return;
        }

        // 3. Calculate Size in MB (Base for calculation)
        let sizeInMB = sizeVal;
        const fUnit = dlSizeUnit.value;
        if (fUnit === 'GB') sizeInMB = sizeVal * 1024;
        else if (fUnit === 'TB') sizeInMB = sizeVal * 1024 * 1024;

        // 4. Time
        const seconds = sizeInMB / rateMBps;
        dlResultTime.textContent = formatTime(seconds);
    }

    function formatTime(totalSeconds) {
        if (!isFinite(totalSeconds)) return '...';

        // User requested "82h 30m" format (Total hours, no days)
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);

        let parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);

        // Only show seconds if time is short (< 1 hour) or purely seconds
        // Or if user wants detailed precision. Let's keep it clean.
        // If > 1 hour, maybe skip seconds? 
        // "82 saat 30 dakika" implies no seconds.
        // Let's just always add seconds for now, unless the user strictly asked to remove them.
        // User said "h m şeklinde". This usually means explicitly H and M.
        // Let's include s generally.
        if (s > 0) parts.push(`${s}s`);

        if (parts.length === 0) return '< 1s';

        return parts.join(' ');
    }

    // --- Startup Calls ---
    populateCategories();
    setupResistorListeners();
    setupSMDListeners();
    setupDownloadListeners();
    initResistorUI();

    const savedState = loadState();
    // Allow restore if it's in UNITS OR if it's the special Resistor Color Code OR Download Calculator category
    // Allow restore if it's in UNITS OR if it's the special Resistor Color Code OR Download Calculator OR SMD Decoder category
    if (savedState && (UNITS[savedState.category] || savedState.category === 'Resistor Color Code' || savedState.category === 'Download Calculator' || savedState.category === 'SMD Code Decoder')) {
        categorySelect.value = savedState.category;
        handleCategoryChange();
        if (categorySelect.value !== 'Resistor Color Code' && categorySelect.value !== 'Download Calculator' && categorySelect.value !== 'SMD Code Decoder') {
            inputField.value = savedState.inputVal;
            populateUnits(savedState.category, savedState.from, savedState.to);
        }
    } else {
        populateUnits(categorySelect.value);
    }

    categorySelect.addEventListener('change', handleCategoryChange);
    inputField.addEventListener('input', convert);
    fromSelect.addEventListener('change', convert);
    toSelect.addEventListener('change', convert);

    convert();
});
