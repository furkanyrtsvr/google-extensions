/**
 * PCB Guard - Trace Width Calculator
 * 
 * SOURCE: IPC-2152 (2009) "Standard for Determining Current-Carrying Capacity
 *         in Printed Board Design"
 * 
 * ALSO SUPPORTS: IPC-2221B (legacy, less accurate)
 * 
 * VALID RANGES (IPC-2152 test data):
 * - Current: 0.3A to 35A
 * - Temperature rise: 10°C to 100°C
 * - Copper thickness: 0.5 oz to 3 oz
 * - Trace width: 0.005" to 0.400" (0.127mm to 10.16mm)
 * 
 * ACCURACY: ±10% per IPC-2152 within tested ranges
 *           Extrapolation outside ranges is flagged with warnings
 */

const TraceWidthCalculator = {

    // Reference to constants (will use CONSTANTS global)
    get constants() {
        return typeof CONSTANTS !== 'undefined' ? CONSTANTS : {
            COPPER_OZ_TO_UM: 34.79,
            IPC2152: {
                EXTERNAL: { k1: 0.048, k2: 0.44, k3: 0.725 },
                INTERNAL: { k1: 0.024, k2: 0.44, k3: 0.725 }
            },
            IPC2221: {
                EXTERNAL: { k: 0.0647, b: 0.4281, c: 0.6732 },
                INTERNAL: { k: 0.0150, b: 0.5453, c: 0.7349 }
            }
        };
    },

    // Valid ranges for IPC-2152
    validRanges: {
        current: { min: 0.3, max: 35, unit: 'A' },
        tempRise: { min: 10, max: 100, unit: '°C' },
        copperOz: { min: 0.5, max: 3, unit: 'oz' },
        width: { min: 0.127, max: 10.16, unit: 'mm' }
    },

    /**
     * Calculate minimum trace width for given current
     * 
     * @param {Object} params
     * @param {number} params.current - Current in Amperes
     * @param {number} params.copperThickness - Copper thickness (oz or µm based on unit)
     * @param {string} params.copperUnit - 'oz' or 'um'
     * @param {number} params.tempRise - Allowable temperature rise in °C
     * @param {string} params.layer - 'external' or 'internal'
     * @param {string} params.standard - 'IPC2152' or 'IPC2221'
     * @param {number} params.safetyFactor - Safety multiplier (default 1.0)
     * @param {number} params.ambientTemp - Ambient temperature °C (optional, for info)
     * @param {number} params.traceLength - Trace length mm (optional, for resistance calc)
     * 
     * @returns {Object} { width, area, warnings, calculations, manufacturability }
     */
    calculate(params) {
        const {
            current,
            copperThickness,
            copperUnit = 'oz',
            tempRise,
            layer = 'external',
            standard = 'IPC2152',
            safetyFactor = 1.0,
            ambientTemp = 25,
            traceLength = null
        } = params;

        const warnings = [];
        const assumptions = [];

        // Convert copper thickness to mils (IPC uses mils internally)
        let copperMils;
        let copperUm;
        let copperOz;

        if (copperUnit === 'oz') {
            copperOz = copperThickness;
            copperUm = copperThickness * this.constants.COPPER_OZ_TO_UM;
            copperMils = copperUm / 25.4; // µm to mils (1 mil = 25.4 µm)
        } else {
            copperUm = copperThickness;
            copperOz = copperThickness / this.constants.COPPER_OZ_TO_UM;
            copperMils = copperThickness / 25.4;
        }

        // Validate inputs and generate warnings
        this.validateInputs(current, tempRise, copperOz, warnings);

        let widthMils, areaSqMils;

        if (standard === 'IPC2152') {
            const result = this.calculateIPC2152(current, tempRise, copperMils, layer);
            areaSqMils = result.area;
            widthMils = result.width;

            assumptions.push({
                source: 'IPC-2152 (2009)',
                note: `${layer === 'external' ? 'External layer' : 'Internal layer'} coefficients applied`
            });
        } else {
            const result = this.calculateIPC2221(current, tempRise, copperMils, layer);
            areaSqMils = result.area;
            widthMils = result.width;

            assumptions.push({
                source: 'IPC-2221B (Legacy)',
                note: 'Less accurate than IPC-2152. Consider using IPC-2152 for new designs.'
            });
            warnings.push({
                type: 'info',
                message: 'IPC-2221 is a legacy standard. IPC-2152 provides more accurate results.'
            });
        }

        // Apply safety factor
        const recommendedWidthMils = widthMils * safetyFactor;

        // Convert to mm
        const widthMm = widthMils * 0.0254;
        const recommendedWidthMm = recommendedWidthMils * 0.0254;
        const areaSqMm = areaSqMils * 0.0254 * 0.0254;

        // Check manufacturability if preset manager available
        let manufacturability = null;
        if (typeof PresetsManager !== 'undefined') {
            manufacturability = PresetsManager.checkTraceManufacturability({
                width: recommendedWidthMm
            });
        }

        // Calculate resistance and voltage drop if length provided
        let resistance = null;
        let voltageDrop = null;
        let powerLoss = null;

        if (traceLength && typeof VoltageDropCalculator !== 'undefined') {
            const dropResult = VoltageDropCalculator.calculate({
                length: traceLength,
                width: recommendedWidthMm,
                thickness: copperUm,
                thicknessUnit: 'um',
                current: current,
                temperature: ambientTemp + tempRise / 2 // Approximate operating temp
            });

            resistance = dropResult.resistance;
            voltageDrop = dropResult.voltageDrop;
            powerLoss = dropResult.powerLoss;
        }

        return {
            // Primary results
            minWidth: {
                mm: widthMm,
                mil: widthMils
            },
            recommendedWidth: {
                mm: recommendedWidthMm,
                mil: recommendedWidthMils
            },
            crossSectionArea: {
                sqMm: areaSqMm,
                sqMil: areaSqMils
            },

            // Input echo (for verification)
            inputs: {
                current,
                copperThickness: copperOz,
                copperThicknessUm: copperUm,
                tempRise,
                layer,
                standard,
                safetyFactor,
                ambientTemp
            },

            // Optional calculations
            resistance,
            voltageDrop,
            powerLoss,

            // Warnings and info
            warnings,
            assumptions,
            manufacturability,

            // Metadata
            validRanges: this.validRanges,
            accuracy: '±10% within valid ranges (IPC-2152)'
        };
    },

    /**
     * IPC-2152 calculation
     * Formula: A = I / (k1 × ΔT^k2)^(1/k3)
     *          W = A / (t × 1.378)
     * 
     * Where 1.378 converts from square mils to (mils × oz/ft²)
     */
    calculateIPC2152(current, tempRise, copperMils, layer) {
        const coeffs = layer === 'external'
            ? this.constants.IPC2152.EXTERNAL
            : this.constants.IPC2152.INTERNAL;

        const { k1, k2, k3 } = coeffs;

        // Calculate cross-sectional area in square mils
        // I = k1 × (ΔT^k2) × (A^k3)
        // A = (I / (k1 × ΔT^k2))^(1/k3)
        const tempFactor = Math.pow(tempRise, k2);
        const areaSqMils = Math.pow(current / (k1 * tempFactor), 1 / k3);

        // Calculate width from area
        // Area = width × thickness (in consistent units)
        // IPC uses 1 oz = 1.378 mils thickness
        const effectiveThicknessMils = copperMils;
        const widthMils = areaSqMils / effectiveThicknessMils;

        return { area: areaSqMils, width: widthMils };
    },

    /**
     * IPC-2221 calculation (legacy)
     * Formula: I = k × (ΔT^b) × (A^c)
     *          A = (I / (k × ΔT^b))^(1/c)
     */
    calculateIPC2221(current, tempRise, copperMils, layer) {
        const coeffs = layer === 'external'
            ? this.constants.IPC2221.EXTERNAL
            : this.constants.IPC2221.INTERNAL;

        const { k, b, c } = coeffs;

        const tempFactor = Math.pow(tempRise, b);
        const areaSqMils = Math.pow(current / (k * tempFactor), 1 / c);

        const widthMils = areaSqMils / copperMils;

        return { area: areaSqMils, width: widthMils };
    },

    /**
     * Reverse calculation: Current capacity for given width
     * 
     * @param {Object} params
     * @param {number} params.width - Trace width (mm or mil)
     * @param {string} params.widthUnit - 'mm' or 'mil'
     * @param {number} params.copperThickness
     * @param {string} params.copperUnit
     * @param {number} params.tempRise
     * @param {string} params.layer
     * @param {string} params.standard
     * 
     * @returns {Object} { current, warnings }
     */
    calculateCurrent(params) {
        const {
            width,
            widthUnit = 'mm',
            copperThickness,
            copperUnit = 'oz',
            tempRise,
            layer = 'external',
            standard = 'IPC2152'
        } = params;

        const warnings = [];

        // Convert to mils
        const widthMils = widthUnit === 'mm' ? width / 0.0254 : width;

        // Convert copper
        let copperMils;
        if (copperUnit === 'oz') {
            copperMils = (copperThickness * this.constants.COPPER_OZ_TO_UM) / 25.4;
        } else {
            copperMils = copperThickness / 25.4;
        }

        const areaSqMils = widthMils * copperMils;

        let current;

        if (standard === 'IPC2152') {
            const coeffs = layer === 'external'
                ? this.constants.IPC2152.EXTERNAL
                : this.constants.IPC2152.INTERNAL;

            const { k1, k2, k3 } = coeffs;

            // I = k1 × (ΔT^k2) × (A^k3)
            current = k1 * Math.pow(tempRise, k2) * Math.pow(areaSqMils, k3);
        } else {
            const coeffs = layer === 'external'
                ? this.constants.IPC2221.EXTERNAL
                : this.constants.IPC2221.INTERNAL;

            const { k, b, c } = coeffs;

            // I = k × (ΔT^b) × (A^c)
            current = k * Math.pow(tempRise, b) * Math.pow(areaSqMils, c);
        }

        // Validate width
        const widthMm = widthMils * 0.0254;
        if (widthMm < this.validRanges.width.min) {
            warnings.push({
                type: 'warning',
                message: `Width ${widthMm.toFixed(3)}mm is below tested range (${this.validRanges.width.min}mm). Result may be less accurate.`
            });
        }

        return {
            current,
            warnings,
            inputs: { width, widthUnit, copperThickness, copperUnit, tempRise, layer, standard }
        };
    },

    /**
     * Validate inputs against IPC-2152 tested ranges
     */
    validateInputs(current, tempRise, copperOz, warnings) {
        if (current < this.validRanges.current.min) {
            warnings.push({
                type: 'warning',
                message: `Current ${current}A is below IPC-2152 tested minimum (${this.validRanges.current.min}A). Results extrapolated.`
            });
        }

        if (current > this.validRanges.current.max) {
            warnings.push({
                type: 'warning',
                message: `Current ${current}A exceeds IPC-2152 tested maximum (${this.validRanges.current.max}A). Results extrapolated.`
            });
        }

        if (tempRise < this.validRanges.tempRise.min) {
            warnings.push({
                type: 'warning',
                message: `Temperature rise ${tempRise}°C is below tested range (${this.validRanges.tempRise.min}°C).`
            });
        }

        if (tempRise > this.validRanges.tempRise.max) {
            warnings.push({
                type: 'warning',
                message: `Temperature rise ${tempRise}°C exceeds tested range (${this.validRanges.tempRise.max}°C).`
            });
        }

        if (copperOz < this.validRanges.copperOz.min) {
            warnings.push({
                type: 'warning',
                message: `Copper thickness ${copperOz}oz is below tested range (${this.validRanges.copperOz.min}oz).`
            });
        }

        if (copperOz > this.validRanges.copperOz.max) {
            warnings.push({
                type: 'warning',
                message: `Copper thickness ${copperOz}oz exceeds tested range (${this.validRanges.copperOz.max}oz).`
            });
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TraceWidthCalculator;
}
