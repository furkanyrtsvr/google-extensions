/**
 * PCB Guard - Manufacturing Presets Manager
 * 
 * Manages manufacturing capability profiles:
 * - Standard (typical 4-layer board manufacturer)
 * - Advanced (high-quality manufacturer)
 * - HDI (High Density Interconnect)
 * 
 * Users can customize and import/export as JSON.
 */

const PresetsManager = {
    // =============================================================================
    // DEFAULT PRESETS
    // These represent typical manufacturer capabilities
    // Source: Industry-standard capabilities, not copyrighted data
    // =============================================================================

    defaults: {
        standard: {
            id: 'standard',
            name: 'Standard',
            description: 'Typical 4-layer board manufacturer capabilities',

            trace: {
                minWidth: 0.15,         // mm (6 mil)
                minSpace: 0.15,         // mm (6 mil)
                minWidth_mil: 6,
                minSpace_mil: 6
            },

            via: {
                minDrill: 0.3,          // mm (12 mil)
                minPad: 0.6,            // mm (24 mil)
                minAnnularRing: 0.125,  // mm (5 mil)
                maxAspectRatio: 10,     // 10:1
                minDrill_mil: 12,
                minPad_mil: 24,
                minAnnularRing_mil: 5,
                platingThickness: 25    // µm (IPC Class 2/3)
            },

            board: {
                minThickness: 0.4,      // mm
                maxThickness: 3.2,      // mm
                typicalThickness: 1.6   // mm
            },

            copper: {
                availableWeights: [0.5, 1, 2],  // oz
                defaultWeight: 1                 // oz
            }
        },

        advanced: {
            id: 'advanced',
            name: 'Advanced',
            description: 'High-quality manufacturer with tighter tolerances',

            trace: {
                minWidth: 0.1,           // mm (4 mil)
                minSpace: 0.1,           // mm (4 mil)
                minWidth_mil: 4,
                minSpace_mil: 4
            },

            via: {
                minDrill: 0.2,           // mm (8 mil)
                minPad: 0.45,            // mm (18 mil)
                minAnnularRing: 0.1,     // mm (4 mil)
                maxAspectRatio: 12,
                minDrill_mil: 8,
                minPad_mil: 18,
                minAnnularRing_mil: 4,
                platingThickness: 25     // µm
            },

            board: {
                minThickness: 0.3,
                maxThickness: 4.0,
                typicalThickness: 1.6
            },

            copper: {
                availableWeights: [0.5, 1, 2, 3],
                defaultWeight: 1
            }
        },

        hdi: {
            id: 'hdi',
            name: 'HDI',
            description: 'High Density Interconnect - microvias, fine pitch',

            trace: {
                minWidth: 0.075,         // mm (3 mil)
                minSpace: 0.075,         // mm (3 mil)
                minWidth_mil: 3,
                minSpace_mil: 3
            },

            via: {
                minDrill: 0.1,           // mm (4 mil) - laser drilled
                minPad: 0.25,            // mm (10 mil)
                minAnnularRing: 0.05,    // mm (2 mil)
                maxAspectRatio: 15,      // Higher for laser vias
                minDrill_mil: 4,
                minPad_mil: 10,
                minAnnularRing_mil: 2,
                platingThickness: 20     // µm - can be thinner
            },

            board: {
                minThickness: 0.2,
                maxThickness: 3.2,
                typicalThickness: 1.0
            },

            copper: {
                availableWeights: [0.33, 0.5, 1],
                defaultWeight: 0.5
            }
        }
    },

    // Current presets (may be customized by user)
    presets: null,

    // Currently selected preset
    currentPresetId: 'standard',

    /**
     * Initialize presets from storage or defaults
     */
    async init() {
        try {
            const stored = await chrome.storage.local.get(['pcbGuardPresets', 'currentPresetId']);

            if (stored.pcbGuardPresets) {
                this.presets = stored.pcbGuardPresets;
            } else {
                this.presets = JSON.parse(JSON.stringify(this.defaults));
            }

            if (stored.currentPresetId) {
                this.currentPresetId = stored.currentPresetId;
            }
        } catch (e) {
            // Fallback for non-extension context (testing)
            this.presets = JSON.parse(JSON.stringify(this.defaults));
        }
    },

    /**
     * Get current preset
     * @returns {Object} Current preset configuration
     */
    getCurrent() {
        if (!this.presets) {
            this.presets = JSON.parse(JSON.stringify(this.defaults));
        }
        return this.presets[this.currentPresetId] || this.presets.standard;
    },

    /**
     * Get all presets
     * @returns {Object} All presets
     */
    getAll() {
        if (!this.presets) {
            this.presets = JSON.parse(JSON.stringify(this.defaults));
        }
        return this.presets;
    },

    /**
     * Set current preset
     * @param {string} presetId 
     */
    async setCurrent(presetId) {
        if (this.presets && this.presets[presetId]) {
            this.currentPresetId = presetId;
            try {
                await chrome.storage.local.set({ currentPresetId: presetId });
            } catch (e) {
                // Ignore in non-extension context
            }
        }
    },

    /**
     * Update a preset
     * @param {string} presetId 
     * @param {Object} updates 
     */
    async updatePreset(presetId, updates) {
        if (!this.presets) await this.init();

        if (this.presets[presetId]) {
            this.presets[presetId] = this.deepMerge(this.presets[presetId], updates);
            await this.save();
        }
    },

    /**
     * Add a custom preset
     * @param {Object} preset 
     */
    async addPreset(preset) {
        if (!this.presets) await this.init();

        if (!preset.id) {
            preset.id = 'custom_' + Date.now();
        }

        this.presets[preset.id] = preset;
        await this.save();
        return preset.id;
    },

    /**
     * Delete a custom preset (cannot delete defaults)
     * @param {string} presetId 
     */
    async deletePreset(presetId) {
        if (this.defaults[presetId]) {
            throw new Error('Cannot delete default presets');
        }

        if (this.presets && this.presets[presetId]) {
            delete this.presets[presetId];

            if (this.currentPresetId === presetId) {
                this.currentPresetId = 'standard';
            }

            await this.save();
        }
    },

    /**
     * Reset preset to default
     * @param {string} presetId 
     */
    async resetPreset(presetId) {
        if (this.defaults[presetId]) {
            this.presets[presetId] = JSON.parse(JSON.stringify(this.defaults[presetId]));
            await this.save();
        }
    },

    /**
     * Export presets to JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        return JSON.stringify(this.presets, null, 2);
    },

    /**
     * Import presets from JSON
     * @param {string} jsonString 
     */
    async importFromJSON(jsonString) {
        try {
            const imported = JSON.parse(jsonString);

            // Validate structure
            for (const key of Object.keys(imported)) {
                if (!imported[key].id || !imported[key].name) {
                    throw new Error('Invalid preset structure');
                }
            }

            // Merge with existing
            this.presets = { ...this.presets, ...imported };
            await this.save();

            return Object.keys(imported).length;
        } catch (e) {
            throw new Error('Invalid JSON: ' + e.message);
        }
    },

    /**
     * Save presets to storage
     */
    async save() {
        try {
            await chrome.storage.local.set({
                pcbGuardPresets: this.presets,
                currentPresetId: this.currentPresetId
            });
        } catch (e) {
            // Ignore in non-extension context
        }
    },

    /**
     * Deep merge helper
     */
    deepMerge(target, source) {
        const result = { ...target };

        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    },

    // =============================================================================
    // MANUFACTURABILITY CHECKS
    // =============================================================================

    /**
     * Check via manufacturability
     * @param {Object} viaParams - { drill, pad, boardThickness }
     * @returns {Object} { status: 'green'|'yellow'|'red', warnings: [] }
     */
    checkViaManufacturability(viaParams) {
        const preset = this.getCurrent();
        const warnings = [];
        let status = 'green';

        const { drill, pad, boardThickness } = viaParams;

        // Annular ring check
        const annularRing = (pad - drill) / 2;
        if (annularRing < preset.via.minAnnularRing) {
            warnings.push({
                type: 'error',
                message: `Annular ring ${annularRing.toFixed(3)} mm is below minimum ${preset.via.minAnnularRing} mm`
            });
            status = 'red';
        } else if (annularRing < preset.via.minAnnularRing * 1.2) {
            warnings.push({
                type: 'warning',
                message: `Annular ring ${annularRing.toFixed(3)} mm is near minimum limit`
            });
            if (status !== 'red') status = 'yellow';
        }

        // Drill size check
        if (drill < preset.via.minDrill) {
            warnings.push({
                type: 'error',
                message: `Drill ${drill.toFixed(3)} mm is below minimum ${preset.via.minDrill} mm`
            });
            status = 'red';
        }

        // Aspect ratio check
        const aspectRatio = boardThickness / drill;
        if (aspectRatio > preset.via.maxAspectRatio) {
            warnings.push({
                type: 'error',
                message: `Aspect ratio ${aspectRatio.toFixed(1)}:1 exceeds maximum ${preset.via.maxAspectRatio}:1`
            });
            status = 'red';
        } else if (aspectRatio > preset.via.maxAspectRatio * 0.8) {
            warnings.push({
                type: 'warning',
                message: `Aspect ratio ${aspectRatio.toFixed(1)}:1 is near limit`
            });
            if (status !== 'red') status = 'yellow';
        }

        // Pad size check
        if (pad < preset.via.minPad) {
            warnings.push({
                type: 'error',
                message: `Pad ${pad.toFixed(3)} mm is below minimum ${preset.via.minPad} mm`
            });
            status = 'red';
        }

        if (warnings.length === 0) {
            warnings.push({
                type: 'success',
                message: 'Via geometry meets manufacturing requirements'
            });
        }

        return { status, warnings };
    },

    /**
     * Check trace manufacturability
     * @param {Object} traceParams - { width, space }
     * @returns {Object} { status: 'green'|'yellow'|'red', warnings: [] }
     */
    checkTraceManufacturability(traceParams) {
        const preset = this.getCurrent();
        const warnings = [];
        let status = 'green';

        const { width, space } = traceParams;

        if (width < preset.trace.minWidth) {
            warnings.push({
                type: 'error',
                message: `Trace width ${width.toFixed(3)} mm is below minimum ${preset.trace.minWidth} mm`
            });
            status = 'red';
        } else if (width < preset.trace.minWidth * 1.2) {
            warnings.push({
                type: 'warning',
                message: `Trace width ${width.toFixed(3)} mm is near minimum limit`
            });
            if (status !== 'red') status = 'yellow';
        }

        if (space !== undefined && space < preset.trace.minSpace) {
            warnings.push({
                type: 'error',
                message: `Trace spacing ${space.toFixed(3)} mm is below minimum ${preset.trace.minSpace} mm`
            });
            status = 'red';
        }

        if (warnings.length === 0) {
            warnings.push({
                type: 'success',
                message: 'Trace dimensions meet manufacturing requirements'
            });
        }

        return { status, warnings };
    }
};

// Initialize on load if in extension context
if (typeof chrome !== 'undefined' && chrome.storage) {
    PresetsManager.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PresetsManager;
}
