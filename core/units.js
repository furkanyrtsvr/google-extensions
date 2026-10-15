/**
 * PCB Guard - Unit Conversion Utilities
 * 
 * Bidirectional conversions with exact factors.
 * All conversions are reversible: convert(convert(x, A, B), B, A) === x
 */

const Units = {
    // =============================================================================
    // LENGTH CONVERSIONS
    // =============================================================================

    /**
     * Convert millimeters to mils
     * 1 mil = 0.001 inch = 0.0254 mm (exact)
     */
    mmToMil(mm) {
        return mm / 0.0254;
    },

    /**
     * Convert mils to millimeters
     */
    milToMm(mil) {
        return mil * 0.0254;
    },

    /**
     * Convert millimeters to inches
     */
    mmToInch(mm) {
        return mm / 25.4;
    },

    /**
     * Convert inches to millimeters
     */
    inchToMm(inch) {
        return inch * 25.4;
    },

    /**
     * Convert micrometers to millimeters
     */
    umToMm(um) {
        return um / 1000;
    },

    /**
     * Convert millimeters to micrometers
     */
    mmToUm(mm) {
        return mm * 1000;
    },

    // =============================================================================
    // COPPER THICKNESS CONVERSIONS
    // =============================================================================

    /**
     * Convert oz/ft² to micrometers
     * Source: IPC-4562 standard
     * 1 oz/ft² = 34.79 µm (theoretical)
     * Industry often uses 35 µm nominal
     */
    ozToUm(oz) {
        return oz * 34.79;
    },

    /**
     * Convert micrometers to oz/ft²
     */
    umToOz(um) {
        return um / 34.79;
    },

    /**
     * Convert oz/ft² to millimeters
     */
    ozToMm(oz) {
        return (oz * 34.79) / 1000;
    },

    /**
     * Convert millimeters to oz/ft²
     */
    mmToOz(mm) {
        return (mm * 1000) / 34.79;
    },

    // =============================================================================
    // TEMPERATURE CONVERSIONS
    // =============================================================================

    /**
     * Convert Celsius to Fahrenheit
     */
    cToF(c) {
        return c * 1.8 + 32;
    },

    /**
     * Convert Fahrenheit to Celsius
     */
    fToC(f) {
        return (f - 32) / 1.8;
    },

    // =============================================================================
    // AREA CONVERSIONS
    // =============================================================================

    /**
     * Convert mm² to mil²
     */
    mmSqToMilSq(mmSq) {
        return mmSq / (0.0254 * 0.0254);
    },

    /**
     * Convert mil² to mm²
     */
    milSqToMmSq(milSq) {
        return milSq * 0.0254 * 0.0254;
    },

    // =============================================================================
    // HELPER: GENERIC CONVERTER
    // =============================================================================

    /**
     * Generic unit converter
     * @param {number} value - Value to convert
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {number} Converted value
     */
    convert(value, fromUnit, toUnit) {
        const from = fromUnit.toLowerCase().replace(/\s/g, '');
        const to = toUnit.toLowerCase().replace(/\s/g, '');

        if (from === to) return value;

        // Length conversions
        const lengthMap = {
            'mm': 1,
            'mil': 0.0254,
            'mils': 0.0254,
            'inch': 25.4,
            'inches': 25.4,
            'in': 25.4,
            'um': 0.001,
            'µm': 0.001,
            'micrometer': 0.001,
            'micrometers': 0.001
        };

        if (lengthMap[from] !== undefined && lengthMap[to] !== undefined) {
            return value * lengthMap[from] / lengthMap[to];
        }

        // Copper thickness
        if ((from === 'oz' || from === 'oz/ft²') && (to === 'um' || to === 'µm')) {
            return this.ozToUm(value);
        }
        if ((from === 'um' || from === 'µm') && (to === 'oz' || to === 'oz/ft²')) {
            return this.umToOz(value);
        }

        // Temperature
        if ((from === 'c' || from === '°c' || from === 'celsius') &&
            (to === 'f' || to === '°f' || to === 'fahrenheit')) {
            return this.cToF(value);
        }
        if ((from === 'f' || from === '°f' || from === 'fahrenheit') &&
            (to === 'c' || to === '°c' || to === 'celsius')) {
            return this.fToC(value);
        }

        throw new Error(`Unknown conversion: ${fromUnit} to ${toUnit}`);
    },

    // =============================================================================
    // FORMATTING
    // =============================================================================

    /**
     * Format number with appropriate precision
     * @param {number} value 
     * @param {number} decimals 
     * @returns {string}
     */
    format(value, decimals) {
        const automaticPrecision = decimals === undefined;
        decimals ??= 3;
        if (value === 0) return '0';

        const absValue = Math.abs(value);

        // Use scientific notation for very small or large numbers
        if (absValue < 0.001 || absValue >= 1000000) {
            return value.toExponential(decimals);
        }

        // Adjust decimals based on magnitude
        if (automaticPrecision && absValue >= 100) {
            return value.toFixed(Math.max(0, decimals - 2));
        }
        if (automaticPrecision && absValue >= 10) {
            return value.toFixed(Math.max(0, decimals - 1));
        }

        return value.toFixed(decimals);
    },

    /**
     * Format with unit
     * @param {number} value 
     * @param {string} unit 
     * @param {number} decimals 
     * @returns {string}
     */
    formatWithUnit(value, unit, decimals = 3) {
        return `${this.format(value, decimals)} ${unit}`;
    }
};

// Freeze to prevent modification
Object.freeze(Units);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Units;
}
