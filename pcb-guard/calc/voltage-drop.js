/**
 * PCB Guard - Voltage Drop & Power Loss Calculator
 * 
 * PHYSICS-BASED: Uses Ohm's law and well-documented copper properties
 * 
 * SOURCES:
 * - Copper resistivity: NIST Standard Reference Data
 * - Temperature coefficient: CRC Handbook of Chemistry and Physics
 * 
 * ACCURACY: Exact within material property tolerances (±2%)
 */

const VoltageDropCalculator = {

    // Default copper properties (can use CONSTANTS if available)
    get copperResistivity20C() {
        return typeof CONSTANTS !== 'undefined'
            ? CONSTANTS.COPPER_RESISTIVITY_20C
            : 1.724e-8; // Ω·m at 20°C
    },

    get tempCoefficient() {
        return typeof CONSTANTS !== 'undefined'
            ? CONSTANTS.COPPER_TEMP_COEFFICIENT
            : 0.00393; // per °C
    },

    /**
     * Calculate resistance, voltage drop, and power loss for a trace
     * 
     * @param {Object} params
     * @param {number} params.length - Trace length
     * @param {string} params.lengthUnit - 'mm' or 'mil' (default: mm)
     * @param {number} params.width - Trace width
     * @param {string} params.widthUnit - 'mm' or 'mil' (default: mm)
     * @param {number} params.thickness - Copper thickness
     * @param {string} params.thicknessUnit - 'oz', 'um', or 'mm' (default: oz)
     * @param {number} params.current - Current in Amperes
     * @param {number} params.temperature - Operating temperature in °C (default: 25)
     * 
     * @returns {Object} Results with warnings
     */
    calculate(params) {
        const {
            length,
            lengthUnit = 'mm',
            width,
            widthUnit = 'mm',
            thickness,
            thicknessUnit = 'oz',
            current,
            temperature = 25
        } = params;

        const warnings = [];
        const assumptions = [];

        // Convert all dimensions to meters
        let lengthM = this.convertToMeters(length, lengthUnit);
        let widthM = this.convertToMeters(width, widthUnit);
        let thicknessM = this.convertThicknessToMeters(thickness, thicknessUnit);

        // Calculate cross-sectional area in m²
        const areaSqM = widthM * thicknessM;
        const areaSqMm = areaSqM * 1e6;

        // Calculate resistivity at operating temperature
        // ρ(T) = ρ₂₀ × [1 + α × (T - 20)]
        const resistivityAtTemp = this.copperResistivity20C * (1 + this.tempCoefficient * (temperature - 20));

        assumptions.push({
            source: 'NIST, CRC Handbook',
            note: `Copper ρ = ${this.copperResistivity20C.toExponential(3)} Ω·m @ 20°C, α = ${this.tempCoefficient}/°C`
        });

        // Calculate resistance
        // R = ρ × L / A
        const resistance = resistivityAtTemp * lengthM / areaSqM;

        // Voltage drop
        const voltageDrop = current * resistance;

        // Power loss
        const powerLoss = current * current * resistance;

        // Current density
        const currentDensitySqMm = current / areaSqMm; // A/mm²

        // Generate warnings based on current density
        // Rule of thumb: >30 A/mm² for external traces can be problematic
        if (currentDensitySqMm > 30) {
            warnings.push({
                type: 'warning',
                message: `High current density: ${currentDensitySqMm.toFixed(1)} A/mm². Consider wider trace or parallel traces.`
            });
        }

        if (currentDensitySqMm > 50) {
            warnings.push({
                type: 'error',
                message: `Very high current density: ${currentDensitySqMm.toFixed(1)} A/mm². Risk of overheating.`
            });
        }

        // Power dissipation warning
        const powerDensityPerMm = powerLoss / (lengthM * 1000); // W/mm
        if (powerDensityPerMm > 0.01) { // >10 mW/mm is concerning
            warnings.push({
                type: 'warning',
                message: `High power dissipation: ${(powerDensityPerMm * 1000).toFixed(2)} mW/mm. May cause localized heating.`
            });
        }

        // Temperature rise estimate (rough approximation)
        // This is a simplified model; actual thermal analysis requires more data
        // Based on empirical: ΔT ≈ (I/A)² × k, where k depends on cooling
        const estimatedTempRise = this.estimateTemperatureRise(current, areaSqMm, lengthM * 1000);

        if (estimatedTempRise > 40) {
            warnings.push({
                type: 'warning',
                message: `Estimated temperature rise: ~${estimatedTempRise.toFixed(0)}°C. Verify with IPC-2152 or thermal simulation.`
            });
        }

        return {
            // Primary results
            resistance: {
                ohms: resistance,
                milliohms: resistance * 1000
            },
            voltageDrop: {
                volts: voltageDrop,
                millivolts: voltageDrop * 1000
            },
            powerLoss: {
                watts: powerLoss,
                milliwatts: powerLoss * 1000
            },

            // Additional info
            currentDensity: {
                perSqMm: currentDensitySqMm,
                perSqMil: currentDensitySqMm * 0.00155 // 1mm² = 1550 mil²
            },

            crossSection: {
                sqMm: areaSqMm,
                sqMil: areaSqMm * 1550
            },

            resistivity: {
                value: resistivityAtTemp,
                unit: 'Ω·m',
                atTemperature: temperature
            },

            estimatedTempRise,

            // Input echo
            inputs: {
                length, lengthUnit,
                width, widthUnit,
                thickness, thicknessUnit,
                current,
                temperature
            },

            warnings,
            assumptions,

            // Model info
            accuracy: '±2% (based on material property tolerance)'
        };
    },

    /**
     * Convert length to meters
     */
    convertToMeters(value, unit) {
        switch (unit.toLowerCase()) {
            case 'mm': return value / 1000;
            case 'mil': return value * 0.0000254;
            case 'inch': case 'in': return value * 0.0254;
            case 'm': return value;
            case 'um': case 'µm': return value / 1e6;
            default: return value / 1000; // Assume mm
        }
    },

    /**
     * Convert copper thickness to meters
     */
    convertThicknessToMeters(value, unit) {
        switch (unit.toLowerCase()) {
            case 'oz': return (value * 34.79) / 1e6; // oz to µm to m
            case 'um': case 'µm': return value / 1e6;
            case 'mm': return value / 1000;
            case 'mil': return value * 0.0000254;
            default: return (value * 34.79) / 1e6; // Assume oz
        }
    },

    /**
     * Rough temperature rise estimate
     * This is simplified; use IPC-2152 for accurate thermal analysis
     * 
     * Based on empirical correlation from trace current capacity data
     */
    estimateTemperatureRise(current, areaSqMm, lengthMm) {
        // Simplified model: ΔT ≈ (J/10)² where J is current density in A/mm²
        // This is a very rough approximation for order-of-magnitude estimates
        const J = current / areaSqMm;

        // Factor in that longer traces dissipate better
        const lengthFactor = Math.min(1, 50 / lengthMm);

        return Math.pow(J / 10, 2) * 10 * lengthFactor;
    },

    /**
     * Calculate minimum trace length for acceptable voltage drop
     * 
     * @param {Object} params
     * @param {number} params.maxVoltageDrop - Maximum acceptable voltage drop (V)
     * @param {number} params.width - Trace width (mm)
     * @param {number} params.thickness - Copper thickness (oz)
     * @param {number} params.current - Current (A)
     * @param {number} params.temperature - Operating temperature (°C)
     * 
     * @returns {Object} { maxLength, resistance }
     */
    calculateMaxLength(params) {
        const {
            maxVoltageDrop,
            width,
            thickness,
            current,
            temperature = 25
        } = params;

        // Calculate maximum resistance
        const maxResistance = maxVoltageDrop / current;

        // Calculate conductivity at temperature
        const resistivityAtTemp = this.copperResistivity20C * (1 + this.tempCoefficient * (temperature - 20));

        // Convert dimensions to meters
        const widthM = width / 1000;
        const thicknessM = (thickness * 34.79) / 1e6;
        const areaSqM = widthM * thicknessM;

        // Calculate max length: L = R × A / ρ
        const maxLengthM = maxResistance * areaSqM / resistivityAtTemp;
        const maxLengthMm = maxLengthM * 1000;

        return {
            maxLength: {
                mm: maxLengthMm,
                inch: maxLengthMm / 25.4
            },
            maxResistance: {
                ohms: maxResistance,
                milliohms: maxResistance * 1000
            },
            powerLossAtMaxLength: {
                watts: current * current * maxResistance,
                milliwatts: current * current * maxResistance * 1000
            }
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoltageDropCalculator;
}
