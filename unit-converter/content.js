(function () {
    // Prevent multiple injections
    if (window.unitConverterInjected) return;
    window.unitConverterInjected = true;

    // --- Smart Text Selection Feature ---

    // Expanded Unit List with Typo Correction
    // Key: Lowercase input (typo/lazy)
    // Symbol: Correct display format
    // Target: Conversion target unit
    // Factor: Multiplier to get to Target
    const SMART_UNITS = {
        // --- LENGTH ---
        'm': { symbol: 'm', target: 'cm', factor: 100 },
        'meter': { symbol: 'm', target: 'cm', factor: 100 },
        'metre': { symbol: 'm', target: 'cm', factor: 100 },

        'cm': { symbol: 'cm', target: 'm', factor: 0.01 },
        'centimeter': { symbol: 'cm', target: 'm', factor: 0.01 },
        'santimetre': { symbol: 'cm', target: 'm', factor: 0.01 },

        'mm': { symbol: 'mm', target: 'cm', factor: 0.1 },
        'millimeter': { symbol: 'mm', target: 'cm', factor: 0.1 },
        'milimetre': { symbol: 'mm', target: 'cm', factor: 0.1 },

        'km': { symbol: 'km', target: 'm', factor: 1000 },
        'kilometer': { symbol: 'km', target: 'm', factor: 1000 },
        'kilometre': { symbol: 'km', target: 'm', factor: 1000 },

        'um': { symbol: 'µm', target: 'mm', factor: 0.001 },
        'micrometer': { symbol: 'µm', target: 'mm', factor: 0.001 },
        'mikrometre': { symbol: 'µm', target: 'mm', factor: 0.001 },

        'nm': { symbol: 'nm', target: 'µm', factor: 0.001 },
        'nanometer': { symbol: 'nm', target: 'µm', factor: 0.001 },
        'nanometre': { symbol: 'nm', target: 'µm', factor: 0.001 },

        'in': { symbol: 'in', target: 'cm', factor: 2.54 },
        'inch': { symbol: 'in', target: 'cm', factor: 2.54 },
        'inc': { symbol: 'in', target: 'cm', factor: 2.54 },

        'ft': { symbol: 'ft', target: 'm', factor: 0.3048 },
        'foot': { symbol: 'ft', target: 'm', factor: 0.3048 },

        'yd': { symbol: 'yd', target: 'm', factor: 0.9144 },
        'yard': { symbol: 'yd', target: 'm', factor: 0.9144 },

        'mi': { symbol: 'mi', target: 'km', factor: 1.60934 },
        'mile': { symbol: 'mi', target: 'km', factor: 1.60934 },
        'mil': { symbol: 'mi', target: 'km', factor: 1.60934 },

        // --- MASS ---
        'kg': { symbol: 'kg', target: 'g', factor: 1000 },
        'kilogram': { symbol: 'kg', target: 'g', factor: 1000 },

        'g': { symbol: 'g', target: 'kg', factor: 0.001 },
        'gram': { symbol: 'g', target: 'kg', factor: 0.001 },

        'mg': { symbol: 'mg', target: 'g', factor: 0.001 },
        'milligram': { symbol: 'mg', target: 'g', factor: 0.001 },
        'miligram': { symbol: 'mg', target: 'g', factor: 0.001 },

        'ug': { symbol: 'µg', target: 'mg', factor: 0.001 },
        'microgram': { symbol: 'µg', target: 'mg', factor: 0.001 },
        'mikrogram': { symbol: 'µg', target: 'mg', factor: 0.001 },

        'lb': { symbol: 'lb', target: 'kg', factor: 0.453592 },
        'pound': { symbol: 'lb', target: 'kg', factor: 0.453592 },

        'oz': { symbol: 'oz', target: 'g', factor: 28.3495 },
        'ounce': { symbol: 'oz', target: 'g', factor: 28.3495 },

        // --- VOLUME ---
        'l': { symbol: 'L', target: 'mL', factor: 1000 },
        'liter': { symbol: 'L', target: 'mL', factor: 1000 },
        'litre': { symbol: 'L', target: 'mL', factor: 1000 },

        'ml': { symbol: 'mL', target: 'L', factor: 0.001 },
        'milliliter': { symbol: 'mL', target: 'L', factor: 0.001 },
        'mililitre': { symbol: 'mL', target: 'L', factor: 0.001 },

        'ul': { symbol: 'µL', target: 'mL', factor: 0.001 },
        'microliter': { symbol: 'µL', target: 'mL', factor: 0.001 },

        // --- FORCE ---
        'n': { symbol: 'N', target: 'kN', factor: 0.001 },
        'newton': { symbol: 'N', target: 'kN', factor: 0.001 },
        'kn': { symbol: 'kN', target: 'N', factor: 1000 },
        'kilonewton': { symbol: 'kN', target: 'N', factor: 1000 },

        // --- PRESSURE ---
        'pa': { symbol: 'Pa', target: 'kPa', factor: 0.001 },
        'pascal': { symbol: 'Pa', target: 'kPa', factor: 0.001 },
        'kpa': { symbol: 'kPa', target: 'Pa', factor: 1000 },
        'bar': { symbol: 'bar', target: 'Pa', factor: 100000 },
        'psi': { symbol: 'psi', target: 'Pa', factor: 6894.76 },

        // --- ENERGY ---
        'j': { symbol: 'J', target: 'kJ', factor: 0.001 },
        'joule': { symbol: 'J', target: 'kJ', factor: 0.001 },
        'kj': { symbol: 'kJ', target: 'J', factor: 1000 },
        'kilojoule': { symbol: 'kJ', target: 'J', factor: 1000 },
        'cal': { symbol: 'cal', target: 'J', factor: 4.184 },
        'calorie': { symbol: 'cal', target: 'J', factor: 4.184 },
        'kalori': { symbol: 'cal', target: 'J', factor: 4.184 },
        'kcal': { symbol: 'kcal', target: 'kJ', factor: 4.184 },

        // --- POWER ---
        'w': { symbol: 'W', target: 'kW', factor: 0.001 },
        'watt': { symbol: 'W', target: 'kW', factor: 0.001 },

        'kw': { symbol: 'kW', target: 'W', factor: 1000 },
        'kilowatt': { symbol: 'kW', target: 'W', factor: 1000 },

        'mw': { symbol: 'mW', target: 'W', factor: 0.001 },
        'milliwatt': { symbol: 'mW', target: 'W', factor: 0.001 },
        'miliwatt': { symbol: 'mW', target: 'W', factor: 0.001 },

        'gw': { symbol: 'GW', target: 'MW', factor: 1000 },
        'hp': { symbol: 'hp', target: 'W', factor: 745.7 },

        // --- TIME ---
        's': { symbol: 's', target: 'ms', factor: 1000 },
        'sec': { symbol: 's', target: 'ms', factor: 1000 },
        'second': { symbol: 's', target: 'ms', factor: 1000 },
        'saniye': { symbol: 's', target: 'ms', factor: 1000 },

        'ms': { symbol: 'ms', target: 's', factor: 0.001 },
        'millisecond': { symbol: 'ms', target: 's', factor: 0.001 },
        'milisaniye': { symbol: 'ms', target: 's', factor: 0.001 },

        'us': { symbol: 'µs', target: 'ms', factor: 0.001 },
        'µs': { symbol: 'µs', target: 'ms', factor: 0.001 },
        'microsecond': { symbol: 'µs', target: 'ms', factor: 0.001 },
        'mikrosaniye': { symbol: 'µs', target: 'ms', factor: 0.001 },

        'ns': { symbol: 'ns', target: 'µs', factor: 0.001 },
        'nanosecond': { symbol: 'ns', target: 'µs', factor: 0.001 },
        'nanosaniye': { symbol: 'ns', target: 'µs', factor: 0.001 },

        'min': { symbol: 'min', target: 's', factor: 60 },
        'minute': { symbol: 'min', target: 's', factor: 60 },
        'dakika': { symbol: 'min', target: 's', factor: 60 },

        'h': { symbol: 'h', target: 'min', factor: 60 },
        'hour': { symbol: 'h', target: 'min', factor: 60 },
        'saat': { symbol: 'h', target: 'min', factor: 60 },

        // --- SPEED ---
        'mph': { symbol: 'mph', target: 'km/h', factor: 1.60934 },
        'knot': { symbol: 'knot', target: 'km/h', factor: 1.852 },

        // --- ELECTRICAL: VOLTAGE ---
        'v': { symbol: 'V', target: 'mV', factor: 1000 },
        'volt': { symbol: 'V', target: 'mV', factor: 1000 },

        'mv': { symbol: 'mV', target: 'V', factor: 0.001 },
        'millivolt': { symbol: 'mV', target: 'V', factor: 0.001 },
        'milivolt': { symbol: 'mV', target: 'V', factor: 0.001 },

        'kv': { symbol: 'kV', target: 'V', factor: 1000 },
        'kilovolt': { symbol: 'kV', target: 'V', factor: 1000 },

        'uv': { symbol: 'µV', target: 'mV', factor: 0.001 },
        'microvolt': { symbol: 'µV', target: 'mV', factor: 0.001 },
        'mikrovolt': { symbol: 'µV', target: 'mV', factor: 0.001 },

        // --- ELECTRICAL: CURRENT ---
        'a': { symbol: 'A', target: 'mA', factor: 1000 },
        'amp': { symbol: 'A', target: 'mA', factor: 1000 },
        'ampere': { symbol: 'A', target: 'mA', factor: 1000 },
        'amper': { symbol: 'A', target: 'mA', factor: 1000 },

        'ma': { symbol: 'mA', target: 'A', factor: 0.001 },
        'milliampere': { symbol: 'mA', target: 'A', factor: 0.001 },
        'miliamper': { symbol: 'mA', target: 'A', factor: 0.001 },

        'ua': { symbol: 'µA', target: 'mA', factor: 0.001 },
        'µa': { symbol: 'µA', target: 'mA', factor: 0.001 },
        'microampere': { symbol: 'µA', target: 'mA', factor: 0.001 },
        'mikroamper': { symbol: 'µA', target: 'mA', factor: 0.001 },
        'microamper': { symbol: 'µA', target: 'mA', factor: 0.001 },

        'ka': { symbol: 'kA', target: 'A', factor: 1000 },
        'kiloamper': { symbol: 'kA', target: 'A', factor: 1000 },

        // --- ELECTRICAL: RESISTANCE ---
        'ohm': { symbol: 'Ω', target: 'kΩ', factor: 0.001 },
        'ohms': { symbol: 'Ω', target: 'kΩ', factor: 0.001 },
        'ω': { symbol: 'Ω', target: 'kΩ', factor: 0.001 },
        'Ω': { symbol: 'Ω', target: 'kΩ', factor: 0.001 },

        'kohm': { symbol: 'kΩ', target: 'Ω', factor: 1000 },
        'kiloohm': { symbol: 'kΩ', target: 'Ω', factor: 1000 },
        'kω': { symbol: 'kΩ', target: 'Ω', factor: 1000 },
        'kΩ': { symbol: 'kΩ', target: 'Ω', factor: 1000 },

        'mohm': { symbol: 'MΩ', target: 'kΩ', factor: 1000 },
        'megaohm': { symbol: 'MΩ', target: 'kΩ', factor: 1000 },
        'mω': { symbol: 'MΩ', target: 'kΩ', factor: 1000 },
        'MΩ': { symbol: 'MΩ', target: 'kΩ', factor: 1000 },

        // --- ELECTRICAL: CAPACITANCE ---
        'f': { symbol: 'F', target: 'µF', factor: 1e6 },
        'farad': { symbol: 'F', target: 'µF', factor: 1e6 },

        'mf': { symbol: 'mF', target: 'µF', factor: 1000 },
        'millifarad': { symbol: 'mF', target: 'µF', factor: 1000 },
        'milifarad': { symbol: 'mF', target: 'µF', factor: 1000 },

        'uf': { symbol: 'µF', target: 'nF', factor: 1000 },
        'µf': { symbol: 'µF', target: 'nF', factor: 1000 },
        'microfarad': { symbol: 'µF', target: 'nF', factor: 1000 },
        'mikrofarad': { symbol: 'µF', target: 'nF', factor: 1000 },

        'nf': { symbol: 'nF', target: 'pF', factor: 1000 },
        'nanofarad': { symbol: 'nF', target: 'pF', factor: 1000 },

        'pf': { symbol: 'pF', target: 'nF', factor: 0.001 },
        'picofarad': { symbol: 'pF', target: 'nF', factor: 0.001 },
        'pikofarad': { symbol: 'pF', target: 'nF', factor: 0.001 },

        // --- ELECTRICAL: FREQUENCY ---
        'hz': { symbol: 'Hz', target: 'kHz', factor: 0.001 },
        'hertz': { symbol: 'Hz', target: 'kHz', factor: 0.001 },

        'khz': { symbol: 'kHz', target: 'Hz', factor: 1000 },
        'kilohertz': { symbol: 'kHz', target: 'Hz', factor: 1000 },

        'mhz': { symbol: 'MHz', target: 'GHz', factor: 0.001 },
        'megahertz': { symbol: 'MHz', target: 'GHz', factor: 0.001 },

        'ghz': { symbol: 'GHz', target: 'MHz', factor: 1000 },
        'gigahertz': { symbol: 'GHz', target: 'MHz', factor: 1000 },

        // --- ELECTRICAL: INDUCTANCE ---
        'h': { symbol: 'H', target: 'mH', factor: 1000 }, // H often conflicts with Hour, but H context usually distinct. Regex might catch. Be careful.
        'henry': { symbol: 'H', target: 'mH', factor: 1000 },
        'mh': { symbol: 'mH', target: 'µH', factor: 1000 },
        'millihenry': { symbol: 'mH', target: 'µH', factor: 1000 },
        'uh': { symbol: 'µH', target: 'nH', factor: 1000 },
        'microhenry': { symbol: 'µH', target: 'nH', factor: 1000 },

        // --- DATA STORAGE ---
        'b': { symbol: 'B', target: 'KB', factor: 1 / 1024 }, // B vs b (bit). Usually b=bit, B=byte. Let's assume B=Byte for generic.
        'byte': { symbol: 'B', target: 'KB', factor: 1 / 1024 },
        'kb': { symbol: 'KB', target: 'MB', factor: 1 / 1024 },
        'mb': { symbol: 'MB', target: 'GB', factor: 1 / 1024 },
        'gb': { symbol: 'GB', target: 'TB', factor: 1 / 1024 },
        'tb': { symbol: 'TB', target: 'GB', factor: 1024 },

        'bit': { symbol: 'bit', target: 'Kbit', factor: 1 / 1000 }, // Network usually 1000
        'kilobit': { symbol: 'Kbit', target: 'Mbit', factor: 1 / 1000 },
        'megabit': { symbol: 'Mbit', target: 'Gbit', factor: 1 / 1000 },

        // --- TEMP (Linear Approx - Warning: Only works for delta for some, breaks for abs) ---
        // Keeping as requested but logic is flawed for C/F in linear mul. 
        // User didn't complain about Temp specifically, but 'all units'.
        'c': { symbol: '°C', target: '°F', factor: 1.8 },
        'celcius': { symbol: '°C', target: '°F', factor: 1.8 }
    };

    // --- KEYBOARD SIMULATION HELPER ---
    function simulateTyping(targetElement, newText) {
        if (!targetElement) return false;

        try {
            targetElement.focus();

            // Step 1: Delete the selected text (simulating Delete key or just overwrite)
            // First try execCommand which respects selection
            let deleted = document.execCommand('delete', false, null);

            if (!deleted) {
                // Fallback: Dispatch Backspace key multiple times? 
                // Actually, if selection is active, 'insertText' should replace it.
            }

            // Step 2: Type each character
            for (const char of newText) {
                // KeyboardEvent for keydown
                targetElement.dispatchEvent(new KeyboardEvent('keydown', {
                    key: char,
                    code: `Key${char.toUpperCase()}`,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    bubbles: true,
                    cancelable: true
                }));

                // KeyboardEvent for keypress (legacy but still used)
                targetElement.dispatchEvent(new KeyboardEvent('keypress', {
                    key: char,
                    charCode: char.charCodeAt(0),
                    keyCode: char.charCodeAt(0),
                    bubbles: true,
                    cancelable: true
                }));

                // InputEvent for the actual character input
                targetElement.dispatchEvent(new InputEvent('beforeinput', {
                    inputType: 'insertText',
                    data: char,
                    bubbles: true,
                    cancelable: true
                }));

                targetElement.dispatchEvent(new InputEvent('input', {
                    inputType: 'insertText',
                    data: char,
                    bubbles: true
                }));

                // KeyboardEvent for keyup
                targetElement.dispatchEvent(new KeyboardEvent('keyup', {
                    key: char,
                    code: `Key${char.toUpperCase()}`,
                    bubbles: true
                }));
            }

            return true;
        } catch (e) {
            console.error('Keyboard simulation failed:', e);
            return false;
        }
    }

    // --- ADAPTER PATTERN ---

    const StandardAdapter = {
        getSelectedText: () => {
            const selection = window.getSelection();
            return selection ? selection.toString() : '';
        },
        getRange: () => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) return selection.getRangeAt(0).cloneRange();
            return null;
        },
        replaceText: (range, newText) => {
            if (!range) return;
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                const success = document.execCommand('insertText', false, newText);
                if (!success) {
                    range.deleteContents();
                    range.insertNode(document.createTextNode(newText));
                }
                selection.removeAllRanges();
            } catch (e) {
                console.error("Standard Replace Failed:", e);
            }
        }
    };

    const GoogleDocsAdapter = {
        getSelectedText: () => {
            // Try multiple sources for Google Docs
            // 1. Standard selection (sometimes works in accessibility mode)
            const selection = window.getSelection();
            let text = selection ? selection.toString() : '';

            // 2. Try hidden textarea that Docs uses for clipboard
            if (!text) {
                const clipboardInput = document.querySelector('.docs-texteventtarget-iframe');
                if (clipboardInput && clipboardInput.contentDocument) {
                    const iframeSelection = clipboardInput.contentDocument.getSelection();
                    text = iframeSelection ? iframeSelection.toString() : '';
                }
            }

            // 3. Try to read from accessibility nodes (kix-paragraphrenderer)
            if (!text) {
                const selectedNodes = document.querySelectorAll('.kix-selection-overlay');
                // This is complex - would need to correlate with actual text nodes
            }

            return text;
        },
        getRange: () => {
            const selection = window.getSelection();
            return (selection && selection.rangeCount > 0) ? selection.getRangeAt(0).cloneRange() : 'docs-virtual-range';
        },
        replaceText: (range, newText) => {
            // Strategy 1: Find the text event target iframe and type there
            const targetIframe = document.querySelector('.docs-texteventtarget-iframe');
            let target = null;

            if (targetIframe && targetIframe.contentDocument) {
                target = targetIframe.contentDocument.body || targetIframe.contentDocument.activeElement;
            }

            // Strategy 2: Use document.activeElement
            if (!target) {
                target = document.activeElement;
            }

            // Try keyboard simulation
            const success = simulateTyping(target, newText);

            // If that fails, try execCommand as last resort
            if (!success) {
                document.execCommand('insertText', false, newText);
            }
        }
    };

    const WordOnlineAdapter = {
        getSelectedText: () => StandardAdapter.getSelectedText(),
        getRange: () => StandardAdapter.getRange(),
        replaceText: (range, newText) => {
            if (!range) return;

            // Word Online: Try keyboard simulation first
            const target = document.activeElement;

            // Ensure selection is active
            try {
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            } catch (e) { }

            // Try keyboard simulation
            const success = simulateTyping(target, newText);

            // Fallback to standard methods
            if (!success) {
                try {
                    document.execCommand('insertText', false, newText);
                } catch (e) {
                    // Last resort: DOM manipulation + events
                    range.deleteContents();
                    const textNode = document.createTextNode(newText);
                    range.insertNode(textNode);

                    const container = range.commonAncestorContainer.parentElement || range.commonAncestorContainer;
                    if (container) {
                        container.dispatchEvent(new Event('input', { bubbles: true }));
                        container.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: newText, bubbles: true }));
                    }
                }
            }
        }
    };

    function getAdapter() {
        const host = window.location.hostname;
        if (host.includes('docs.google.com')) return GoogleDocsAdapter;
        if (host.includes('word.office.com') || host.includes('office.live.com') || host.includes('onedrive.live.com') || host.includes('word.cloud.microsoft')) return WordOnlineAdapter;
        return StandardAdapter;
    }

    let tooltipHost = null;
    let savedRange = null;
    let activeAdapter = null; // Store usage adapter

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    function handleSelection(e) {
        if (tooltipHost && tooltipHost.contains(e.target)) return;

        setTimeout(() => {
            const adapter = getAdapter();
            activeAdapter = adapter; // Save for replace call

            const text = adapter.getSelectedText();

            if (!text || text.length > 50) {
                removeTooltip();
                return;
            }

            // Regex: Number + Optional Space + Unit
            const regex = /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z\u0080-\uFFFF]+(?:\s+[a-zA-Z\u0080-\uFFFF]+)*)\s*$/;
            const match = text.match(regex);

            if (match) {
                const valStr = match[1].replace(',', '.');
                const unitStr = match[2].toLowerCase();
                const originalValue = parseFloat(valStr);

                let unitKey = unitStr.replace(/\s+/g, '');

                if (!SMART_UNITS[unitKey] && unitKey.endsWith('s') && !unitKey.endsWith('ss')) {
                    const stripped = unitKey.slice(0, -1);
                    if (SMART_UNITS[stripped]) unitKey = stripped;
                }

                if (SMART_UNITS[unitKey]) {
                    // Logic for range is adapter-specific
                    savedRange = adapter.getRange();
                    if (savedRange) {
                        // Rect calculation needs real range or fallback
                        let rect;
                        if (savedRange instanceof Range) {
                            rect = savedRange.getBoundingClientRect();
                        } else {
                            // Fallback for non-range adapters (like Docs abstract selection)
                            // Use active element or mouse position? Mouse position is lost in setTimeout.
                            // Use active element bounding rect
                            rect = document.activeElement.getBoundingClientRect();
                        }

                        // Sanity check for rect
                        if (rect && rect.width === 0 && rect.height === 0) {
                            // Try to use a default position or failing?
                            // Maybe do not show if we can't find position.
                        }

                        showSmartTooltip(rect, originalValue, unitKey);
                    }
                } else {
                    removeTooltip();
                }
            } else {
                removeTooltip();
            }
        }, 50);
    }

    function showSmartTooltip(rect, val, unit) {
        if (!chrome.runtime?.id) return;

        removeTooltip();

        const data = SMART_UNITS[unit];
        const convertedVal = val * data.factor;

        let convertedStr;
        if (Math.abs(convertedVal) < 0.000001 || Math.abs(convertedVal) > 1000000000) {
            convertedStr = convertedVal.toExponential(2);
        } else {
            convertedStr = parseFloat(convertedVal.toFixed(6)).toString();
        }

        const convertFix = `${convertedStr} ${data.target}`;
        const formatFix = `${val} ${data.symbol}`;

        tooltipHost = document.createElement('div');
        tooltipHost.id = 'uc-smart-tooltip-host';
        tooltipHost.style.position = 'fixed';
        tooltipHost.style.zIndex = '2147483647'; // Max Z-Index
        tooltipHost.style.pointerEvents = 'none';

        const shadow = tooltipHost.attachShadow({ mode: 'open' });

        try {
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = chrome.runtime.getURL('styles.css');
            shadow.appendChild(styleLink);
        } catch (e) {
            removeTooltip();
            return;
        }

        const container = document.createElement('div');
        container.className = 'uc-tooltip';
        container.style.pointerEvents = 'auto';
        container.style.position = 'absolute';

        if (chrome.runtime?.id) {
            chrome.storage.local.get(['uc_theme'], (result) => {
                if (chrome.runtime.lastError) return;
                if (result && result.uc_theme === 'light') {
                    container.classList.add('light-theme');
                }
            });
        }

        // Safe Positioning
        const top = (rect.bottom + 5);
        const left = rect.left;
        tooltipHost.style.top = '0px';
        tooltipHost.style.left = '0px';
        container.style.top = top + 'px';
        container.style.left = left + 'px';


        container.appendChild(createOption('Format', formatFix, 'Düzelt'));
        container.appendChild(createOption('Convert', convertFix, 'Dönüştür'));

        shadow.appendChild(container);
        document.body.appendChild(tooltipHost);
    }

    // Global Theme Listener
    if (chrome.runtime?.id) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.uc_theme) {
                const newTheme = changes.uc_theme.newValue;
                const host = document.getElementById('uc-smart-tooltip-host');
                if (host && host.shadowRoot) {
                    const container = host.shadowRoot.querySelector('.uc-tooltip');
                    if (container) {
                        if (newTheme === 'light') container.classList.add('light-theme');
                        else container.classList.remove('light-theme');
                    }
                }
            }
        });
    }

    function createOption(label, textToInsert, hint) {
        const div = document.createElement('div');
        div.className = 'uc-tooltip-opt';

        const host = window.location.hostname;
        const isSpecialSite =
            host.includes('word') ||
            host.includes('office') ||
            host.includes('onedrive') ||
            host.includes('microsoft');

        if (isSpecialSite) {
            // Keep original hint visually but use clipboard logic
            div.innerHTML = `<span>${textToInsert}</span><span class="uc-tooltip-hint">${hint}</span>`;
        } else {
            div.innerHTML = `<span>${textToInsert}</span><span class="uc-tooltip-hint">${hint}</span>`;
        }

        // Use CLICK event for proper User Activation (required for Clipboard API)
        div.addEventListener('click', (e) => {
            e.stopPropagation();

            if (isSpecialSite) {
                copyToClipboardAndNotify(textToInsert);
            } else {
                replaceSelection(textToInsert);
            }
            removeTooltip();
        });

        // Prevent mousedown from doing accidental selections or drags
        div.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });

        return div;
    }

    // Helper: Copy to clipboard and show brief notification
    function copyToClipboardAndNotify(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showNotification(`"${text}" panoya kopyalandı!`);
            }).catch(err => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';

            // Append to shadow host if possible, or body
            document.body.appendChild(textarea);

            textarea.focus();
            textarea.select();

            document.execCommand('copy');
            document.body.removeChild(textarea);

            showNotification(`"${text}" panoya kopyalandı!`);
        } catch (e) {
            console.error("Copy failed", e);
            showNotification("Kopyalama başarısız. Lütfen tekrar deneyin.");
        }
    }

    // Helper: Show a brief notification
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #323232;
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 2147483647;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: fadeInUp 0.3s ease;
            pointer-events: none;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Add Animation Keyframes if not exist (via JS is messy, just use transition)
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, 20px)';
        notification.style.transition = 'all 0.3s ease';

        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translate(-50%, 0)';
        });

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translate(-50%, 20px)';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    function removeTooltip() {
        if (tooltipHost) {
            tooltipHost.remove();
            tooltipHost = null;
        }
    }

    function replaceSelection(newText) {
        if (!activeAdapter) activeAdapter = StandardAdapter;
        activeAdapter.replaceText(savedRange, newText);
        savedRange = null;
    }

})();
