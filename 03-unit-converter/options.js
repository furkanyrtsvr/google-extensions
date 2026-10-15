// --- Shared Unit Data (Must match popup.js or be modular) ---
// For simplicity in this extension structure, we duplicate the source of truth briefly
// or we could check if we can import. Extensions usually use modules.
// Let's redefine the CLEAN list here to be the master list.

const ALL_UNITS = {
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
            'bit': 1, 'Byte': 8,
            'KB': 1024, 'MB': 1.049e6, 'GB': 1.074e9, 'TB': 1.1e12, 'PB': 1.125e15
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

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('settings-container');
    const msg = document.getElementById('save-msg');

    // Load Theme
    const theme = localStorage.getItem('uc_theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    }

    // Load Hidden Units
    let hiddenUnits = JSON.parse(localStorage.getItem('uc_hidden_units') || '[]');

    function save() {
        localStorage.setItem('uc_hidden_units', JSON.stringify(hiddenUnits));
        msg.classList.add('visible');
        setTimeout(() => msg.classList.remove('visible'), 2000);
    }

    function toggleUnit(unitName, isChecked) {
        if (isChecked) {
            // Remove from hidden
            hiddenUnits = hiddenUnits.filter(u => u !== unitName);
        } else {
            // Add to hidden if not present
            if (!hiddenUnits.includes(unitName)) {
                hiddenUnits.push(unitName);
            }
        }
        save();
    }

    // Groups for ordering/headers (Matches popup.js)
    const UNIT_GROUPS = {
        'Mechanical': ['Length', 'Mass', 'Force', 'Pressure', 'Torque', 'Power', 'Speed', 'Area', 'Volume'],
        'Electrical': ['Current', 'Voltage', 'Resistance', 'Capacitance', 'Inductance', 'Conductance', 'Energy', 'Frequency'], // Removed duplicate Power
        'Physics/Other': ['Temperature', 'Time', 'Data Storage']
    };

    // Render
    const renderedCategories = new Set(); // To avoid duplicates if any

    for (const [groupName, cats] of Object.entries(UNIT_GROUPS)) {
        // Group Header
        const groupHeader = document.createElement('h2');
        groupHeader.textContent = groupName;
        groupHeader.style.color = 'var(--text-muted)';
        groupHeader.style.fontSize = '20px'; // Slightly bigger than category
        groupHeader.style.marginTop = '40px';
        groupHeader.style.marginBottom = '20px';
        groupHeader.style.borderBottom = '1px solid var(--border-color)';
        groupHeader.style.paddingBottom = '10px';
        groupHeader.style.fontWeight = '300';
        groupHeader.style.textTransform = 'uppercase';
        groupHeader.style.letterSpacing = '2px';
        container.appendChild(groupHeader);

        cats.forEach(catName => {
            if (catName === 'Resistor Color Code') return; // Not a unit category
            if (renderedCategories.has(catName)) return; // Skip duplicates if any

            const catData = ALL_UNITS[catName];
            if (!catData) return;

            renderedCategories.add(catName);

            const catBlock = document.createElement('div');
            catBlock.className = 'category-block';

            const catTitle = document.createElement('div');
            catTitle.className = 'cat-title';
            catTitle.textContent = catName;
            catBlock.appendChild(catTitle);

            const grid = document.createElement('div');
            grid.className = 'units-grid';

            Object.keys(catData.units).forEach(unitName => {
                const label = document.createElement('label');
                label.className = 'unit-check';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !hiddenUnits.includes(unitName);
                checkbox.addEventListener('change', (e) => toggleUnit(unitName, e.target.checked));

                const span = document.createElement('span');
                span.textContent = unitName;

                label.appendChild(checkbox);
                label.appendChild(span);
                grid.appendChild(label);
            });

            catBlock.appendChild(grid);
            container.appendChild(catBlock);
        });
    }

    // --- Info Modal Logic ---
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeModal = document.querySelector('.close-modal');

    if (infoBtn && infoModal && closeModal) {
        // Toggle Modal
        infoBtn.addEventListener('click', () => {
            // Check current state to toggle
            if (infoModal.style.display === 'flex') {
                infoModal.style.display = 'none';
            } else {
                infoModal.style.display = 'flex';
            }
        });

        // Close on X
        closeModal.addEventListener('click', () => {
            infoModal.style.display = 'none';
        });

        // Close on Outside Click
        window.addEventListener('click', (e) => {
            if (e.target === infoModal) {
                infoModal.style.display = 'none';
            }
        });
    }

});
