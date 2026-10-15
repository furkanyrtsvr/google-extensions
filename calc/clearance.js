/**
 * PCB Guard - Clearance & Creepage Calculator
 * 
 * ⚠️ IMPORTANT: This module does NOT contain copyrighted standard tables.
 * Users must import rulesets from their licensed standards.
 * 
 * Supported frameworks (user provides data):
 * - IEC 60664-1 (Insulation coordination)
 * - IEC 62368-1 (Audio/Video/IT equipment)
 * - UL profiles
 */

const ClearanceCalculator = {

    /**
     * Look up clearance and creepage values
     * 
     * @param {Object} params
     * @param {number} params.voltage - Working voltage (V)
     * @param {string} params.voltageType - 'dc', 'ac_rms', 'ac_peak'
     * @param {number} params.pollutionDegree - 1, 2, 3, or 4
     * @param {string} params.materialGroup - 'I', 'II', 'IIIa', 'IIIb'
     * @param {number} params.cti - CTI value (optional)
     * @param {number} params.altitude - Altitude in meters (for correction)
     * @param {string} params.insulationType - 'basic', 'supplementary', 'reinforced'
     * 
     * @returns {Object} Clearance/creepage values with warnings
     */
    calculate(params) {
        const {
            voltage,
            voltageType = 'dc',
            pollutionDegree = 2,
            materialGroup = 'II',
            cti = null,
            altitude = 0,
            insulationType = 'basic'
        } = params;

        const warnings = [];

        // MANDATORY DISCLAIMER
        warnings.push({
            type: 'caution',
            message: '⚠️ GUIDANCE TOOL ONLY - Compliance requires full standard review and may require certification body approval.'
        });

        // Check if ruleset manager exists and has data
        if (typeof RulesetsManager === 'undefined') {
            return {
                error: 'RulesetsManager not available',
                warnings
            };
        }

        const ruleset = RulesetsManager.getCurrent();

        if (!ruleset) {
            warnings.push({
                type: 'error',
                message: 'No ruleset loaded. Please import a clearance/creepage ruleset from your licensed standard.'
            });

            return {
                clearance: null,
                creepage: null,
                source: null,
                warnings,
                requiresRuleset: true
            };
        }

        // Convert voltage if needed
        let workingVoltage = voltage;
        if (voltageType === 'ac_rms') {
            workingVoltage = voltage * Math.sqrt(2); // Peak
        }

        // Altitude correction for clearance (IEC 60664-1)
        let altitudeCorrection = 1.0;
        if (altitude > 2000) {
            // Above 2000m, increase clearance
            altitudeCorrection = 1 + 0.0001 * (altitude - 2000);
            warnings.push({
                type: 'info',
                message: `Altitude correction applied: ×${altitudeCorrection.toFixed(3)} for ${altitude}m`
            });
        }

        // Look up clearance
        const clearanceResult = RulesetsManager.lookupClearance({
            voltage: workingVoltage,
            pollutionDegree,
            insulationType
        });

        // Look up creepage
        const creepageResult = RulesetsManager.lookupCreepage({
            voltage: workingVoltage,
            pollutionDegree,
            materialGroup
        });

        // Apply corrections
        let minClearance = clearanceResult.value;
        let minCreepage = creepageResult.value;

        if (minClearance) {
            minClearance = minClearance * altitudeCorrection;

            // Insulation type multiplier (simplified)
            if (insulationType === 'reinforced') {
                minClearance *= 2;
                warnings.push({
                    type: 'info',
                    message: 'Reinforced insulation: clearance doubled'
                });
            }
        }

        if (minCreepage) {
            if (insulationType === 'reinforced') {
                minCreepage *= 2;
            }
        }

        // CTI-based material group override
        if (cti) {
            let derivedGroup = 'IIIb';
            if (cti >= 600) derivedGroup = 'I';
            else if (cti >= 400) derivedGroup = 'II';
            else if (cti >= 175) derivedGroup = 'IIIa';

            if (derivedGroup !== materialGroup) {
                warnings.push({
                    type: 'info',
                    message: `CTI ${cti} suggests material group ${derivedGroup} (using ${materialGroup})`
                });
            }
        }

        // Slot recommendation
        let slotNote = null;
        if (minCreepage && minClearance && minCreepage > minClearance * 1.5) {
            slotNote = 'Consider slots or barriers to increase effective creepage distance.';
        }

        // Combine warnings from lookups
        const allWarnings = [
            ...warnings,
            ...(clearanceResult.warnings || []).map(w => ({ type: 'warning', message: w })),
            ...(creepageResult.warnings || []).map(w => ({ type: 'warning', message: w }))
        ];

        if (clearanceResult.error) {
            allWarnings.push({ type: 'error', message: clearanceResult.error });
        }
        if (creepageResult.error) {
            allWarnings.push({ type: 'error', message: creepageResult.error });
        }

        return {
            clearance: minClearance ? { mm: minClearance, mil: minClearance / 0.0254 } : null,
            creepage: minCreepage ? { mm: minCreepage, mil: minCreepage / 0.0254 } : null,

            source: ruleset ? `${ruleset.standard} (${ruleset.version})` : null,

            inputs: {
                voltage, voltageType, workingVoltage,
                pollutionDegree, materialGroup, cti,
                altitude, insulationType
            },

            corrections: {
                altitudeCorrection,
                insulationMultiplier: insulationType === 'reinforced' ? 2 : 1
            },

            recommendations: {
                slotNote
            },

            warnings: allWarnings,

            disclaimer: 'This tool provides guidance only. Final compliance determination requires review of the complete applicable standard(s) and may require third-party certification.'
        };
    },

    /**
     * Generate clearance/creepage visualization SVG
     */
    generateSVG(clearance, creepage, options = {}) {
        const { width = 240, height = 120, darkMode = true } = options;

        const c = darkMode
            ? { bg: '#1e1e2e', board: '#2d5a7b', copper: '#d4a574', air: '#4a6fa5', surface: '#556b8f', text: '#ccc' }
            : { bg: '#f0f0f0', board: '#228b22', copper: '#d4a574', air: '#87ceeb', surface: '#90ee90', text: '#333' };

        const centerX = width / 2;
        const padW = 30;
        const gap = 50;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
        svg += `<rect width="${width}" height="${height}" fill="${c.bg}"/>`;

        // Board
        svg += `<rect x="20" y="50" width="${width - 40}" height="30" fill="${c.board}"/>`;

        // Copper pads
        svg += `<rect x="${centerX - gap / 2 - padW}" y="40" width="${padW}" height="15" fill="${c.copper}"/>`;
        svg += `<rect x="${centerX + gap / 2}" y="40" width="${padW}" height="15" fill="${c.copper}"/>`;

        // Clearance line (through air)
        svg += `<line x1="${centerX - gap / 2}" y1="47" x2="${centerX + gap / 2}" y2="47" stroke="${c.air}" stroke-width="2" stroke-dasharray="4,2"/>`;
        svg += `<text x="${centerX}" y="35" font-size="9" fill="${c.air}" text-anchor="middle">Clearance${clearance ? `: ${clearance.toFixed(2)}mm` : ''}</text>`;

        // Creepage line (along surface)
        svg += `<path d="M ${centerX - gap / 2} 55 L ${centerX - gap / 2} 65 L ${centerX + gap / 2} 65 L ${centerX + gap / 2} 55" stroke="${c.surface}" stroke-width="2" fill="none"/>`;
        svg += `<text x="${centerX}" y="${height - 15}" font-size="9" fill="${c.surface}" text-anchor="middle">Creepage${creepage ? `: ${creepage.toFixed(2)}mm` : ''}</text>`;

        // Labels
        svg += `<text x="${centerX}" y="15" font-size="10" fill="${c.text}" text-anchor="middle">Clearance & Creepage</text>`;

        svg += '</svg>';
        return svg;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClearanceCalculator;
}
