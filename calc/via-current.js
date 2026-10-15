/**
 * PCB Guard - Via Current Capacity Calculator
 * 
 * SOURCE: IPC-2221B Section 6.2 (Internal Layer formula adapted for via barrel)
 * REFERENCE: Saturn PCB Design Toolkit uses similar approach
 * 
 * ⚠️ IMPORTANT: Via current capacity has NO dedicated IPC standard.
 * This is an ESTIMATE based on treating the via barrel as an internal trace.
 * Results should be verified with manufacturer data and thermal simulation.
 * 
 * Model: Via barrel = cylindrical conductor with annular cross-section
 * Formula: I = k × ΔT^b × A^c (IPC-2221 Internal, k adjusted for mm²)
 */

const ViaCurrentCalculator = {

    get constants() {
        return typeof CONSTANTS !== 'undefined' ? CONSTANTS : {
            COPPER_RESISTIVITY_20C: 1.724e-8,
            COPPER_TEMP_COEFFICIENT: 0.00393
        };
    },

    /**
     * Calculate via current capacity and recommend parallel vias
     * 
     * @param {Object} params
     * @param {number} params.targetCurrent - Target current (A)
     * @param {number} params.drillDiameter - Drill diameter (mm)
     * @param {number} params.boardThickness - Board thickness (mm)
     * @param {number} params.platingThickness - Plating thickness (µm, default 25)
     * @param {number} params.tempRise - Allowable temp rise (°C, default 10)
     * @param {number} params.ambientTemp - Ambient temperature (°C, default 25)
     * @param {number} params.ampacityFactor - User calibration factor (default 1.0)
     * @param {number} params.safetyFactor - Safety margin (default 1.5)
     * 
     * @returns {Object} Results with mandatory warnings
     * @param {number} params.drillDiameter - Final Hole Diameter (mm)
     * @param {number} params.boardThickness - Board thickness (mm)
     * @param {number} params.platingThickness - Plating thickness (µm, default 25)
     * @param {number} params.tempRise - Allowable temp rise (°C, default 10)
     * @param {number} params.ambientTemp - Ambient temperature (°C, default 25)
     * @param {number} params.ampacityFactor - User calibration factor (default 1.0)
     * @param {number} params.safetyFactor - Safety margin (default 1.5)
     * @param {string} params.connectionType - 'solid', 'thermal', 'isolated' (default 'solid')
     * 
     * @returns {Object} Results
     */
    calculate(params) {
        const {
            targetCurrent,
            drillDiameter,
            boardThickness,
            platingThickness = 25,
            tempRise = 10,
            ambientTemp = 25,
            ampacityFactor = 1.0,
            safetyFactor = 1.5,
            connectionType = 'solid'
        } = params;

        const warnings = [];
        const assumptions = [];

        // 1. Calculate via barrel geometry (Physical Dimensions)
        // NOTE: drillDiameter is treated as FINISHED hole size as per UI label
        const finishedRadius = drillDiameter / 2;
        const outerRadiusWithPlating = finishedRadius + (platingThickness / 1000);

        const areaM2 = Math.PI * ((outerRadiusWithPlating / 1000) ** 2 - (finishedRadius / 1000) ** 2);
        const areaMm2 = areaM2 * 1e6;
        const viaLength = boardThickness;

        // 2. Calculate Resistance (POUILLET'S LAW: R = ρ * L / A)
        const opTemp = ambientTemp + tempRise;
        const resistivity = this.constants.COPPER_RESISTIVITY_20C *
            (1 + this.constants.COPPER_TEMP_COEFFICIENT * (opTemp - 20));

        const resistance = resistivity * (viaLength / 1000) / areaM2;

        assumptions.push({
            source: "Pouillet's Law (Physics)",
            note: `Resistance: ${(resistance * 1000).toFixed(2)}mΩ (L=${viaLength}mm)`
        });

        // 3. Calculate Current Capacity (IPC-2221 CALIBRATED FOR VIAS)
        // 
        // Formula: I = k × ΔT^b × A^c
        // 
        // CALIBRATION from Saturn PCB Toolkit:
        // Input: 10mil drill, 1mil plating, 62mil height, 20°C rise
        // Output: 1.9785A, Cross-section: 34.56 sq.mils
        // 
        // k = 1.98 / (20^0.44 × 0.0223^0.725) = 10.9 ≈ 11

        const k = 11.0;  // Calibrated from Saturn PCB Toolkit
        const b = 0.44;  // IPC standard
        const c = 0.725; // IPC standard

        const singleViaCapacity = k * Math.pow(tempRise, b) * Math.pow(areaMm2, c) * ampacityFactor;
        const limitReason = 'Saturn Calibrated';

        assumptions.push({
            source: 'Saturn PCB Calibrated',
            note: `I = 11 × ΔT^0.44 × A^0.725`
        });

        // 6. Power & Voltage Analysis
        const vDropSingle = targetCurrent * resistance;
        const pLossSingle = targetCurrent * targetCurrent * resistance;

        // 7. Parallel Via Solution
        const requiredVias = Math.ceil((targetCurrent / singleViaCapacity) * safetyFactor);
        const recommendedVias = Math.max(1, requiredVias);

        const currentPerVia = targetCurrent / recommendedVias;
        const vDropParallel = currentPerVia * resistance;
        const pLossTotal = (targetCurrent * targetCurrent * resistance) / recommendedVias;

        // 8. Warnings & Info
        if (limitReason.includes('Thermal')) {
            warnings.push({
                type: 'warning',
                message: `Capacity throttled by board thickness to stay under ${maxPower}W/via.`
            });
        }

        if (singleViaCapacity < targetCurrent * 0.8) {
            // Only warn if significant mismatch, otherwise N recommendations handle it
        }

        if (recommendedVias > 6) {
            warnings.push({
                type: 'caution',
                message: 'High via count. Consider larger vias.'
            });
        }

        return {
            singleVia: {
                effectiveCapacity: { A: singleViaCapacity },
                limitReason: limitReason,
                resistance: { ohms: resistance, milliohms: resistance * 1000 },
                voltageDrop: { V: vDropSingle, mV: vDropSingle * 1000 },
                powerLoss: { W: pLossSingle, mW: pLossSingle * 1000 }
            },

            recommendation: {
                requiredVias: recommendedVias,
                currentPerVia: { A: currentPerVia },
                totalVoltageDrop: { V: vDropParallel, mV: vDropParallel * 1000 },
                totalPowerLoss: { W: pLossTotal, mW: pLossTotal * 1000 },
                totalResistance: { ohms: resistance / recommendedVias, milliohms: (resistance / recommendedVias) * 1000 }
            },

            geometry: {
                drillDiameter: { mm: drillDiameter },
                boardThickness: { mm: boardThickness },
                platingThickness: { um: platingThickness },
                barrelArea: { mm2: areaMm2 }
            },

            inputs: { targetCurrent, tempRise, ambientTemp, ampacityFactor, safetyFactor, connectionType },
            warnings,
            assumptions,

            modelInfo: {
                type: 'PHYSICS + IPC HEURISTIC',
                accuracy: 'Approximate - Verify with manufacturer',
                calibration: `Ampacity factor: ${ampacityFactor}`
            }
        };
    },

    /**
     * Generate SVG showing parallel via arrangement
     */
    generateParallelViaSVG(viaCount, options = {}) {
        const { size = 150, darkMode = true } = options;

        const c = darkMode
            ? { bg: '#1e1e2e', copper: '#d4a574', hole: '#1e1e2e', text: '#ccc' }
            : { bg: '#f0f0f0', copper: '#d4a574', hole: '#333', text: '#333' };

        const center = size / 2;
        const viaR = Math.min(12, (size - 30) / (Math.sqrt(viaCount) * 3));
        const spacing = viaR * 2.5;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`;
        svg += `<rect width="${size}" height="${size}" fill="${c.bg}"/>`;

        // Arrange vias in grid
        const cols = Math.ceil(Math.sqrt(viaCount));
        const rows = Math.ceil(viaCount / cols);
        const startX = center - ((cols - 1) * spacing) / 2;
        const startY = center - ((rows - 1) * spacing) / 2;

        let drawn = 0;
        for (let row = 0; row < rows && drawn < viaCount; row++) {
            for (let col = 0; col < cols && drawn < viaCount; col++) {
                const x = startX + col * spacing;
                const y = startY + row * spacing;
                svg += `<circle cx="${x}" cy="${y}" r="${viaR}" fill="${c.copper}"/>`;
                svg += `<circle cx="${x}" cy="${y}" r="${viaR * 0.5}" fill="${c.hole}"/>`;
                drawn++;
            }
        }

        svg += `<text x="${center}" y="${size - 8}" font-size="10" fill="${c.text}" text-anchor="middle">${viaCount} via${viaCount > 1 ? 's' : ''}</text>`;
        svg += '</svg>';

        return svg;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViaCurrentCalculator;
}
