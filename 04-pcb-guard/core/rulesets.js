/**
 * PCB Guard - Clearance/Creepage Ruleset Manager
 * 
 * IMPORTANT: This module does NOT contain copyrighted standard data.
 * Users must import their own rulesets based on licensed standards.
 * 
 * Supported standard frameworks (user provides data):
 * - IEC 60664-1 (Insulation coordination)
 * - IEC 62368-1 (Audio/Video/IT equipment)
 * - UL 60950-1 (Legacy IT equipment)
 * 
 */

const RulesetsManager = {
    // Currently loaded rulesets
    rulesets: {},

    // Current active ruleset
    currentRulesetId: null,

    // Schema for validation
    schema: {
        required: ['id', 'name', 'standard', 'version'],
        tables: {
            clearance: 'object',   // voltage -> distance mapping
            creepage: 'object'     // voltage -> distance mapping
        }
    },

    /**
     * Initialize rulesets from storage
     */
    async init() {
        try {
            const stored = await chrome.storage.local.get(['pcbGuardRulesets', 'currentRulesetId']);

            if (stored.pcbGuardRulesets) {
                this.rulesets = stored.pcbGuardRulesets;
            }

            if (stored.currentRulesetId) {
                this.currentRulesetId = stored.currentRulesetId;
            }
        } catch (e) {
            // Non-extension context
            this.rulesets = {};
        }
    },

    /**
     * Get all loaded rulesets
     * @returns {Object}
     */
    getAll() {
        return this.rulesets;
    },

    /**
     * Get current active ruleset
     * @returns {Object|null}
     */
    getCurrent() {
        if (!this.currentRulesetId) return null;
        return this.rulesets[this.currentRulesetId] || null;
    },

    /**
     * Get ruleset by ID
     * @param {string} id 
     * @returns {Object|null}
     */
    get(id) {
        return this.rulesets[id] || null;
    },

    /**
     * Set current active ruleset
     * @param {string} id 
     */
    async setCurrent(id) {
        if (this.rulesets[id]) {
            this.currentRulesetId = id;
            try {
                await chrome.storage.local.set({ currentRulesetId: id });
            } catch (e) {
                // Ignore
            }
        }
    },

    /**
     * Import ruleset from JSON string
     * @param {string} jsonString 
     * @returns {string} Imported ruleset ID
     */
    async importFromJSON(jsonString) {
        const ruleset = JSON.parse(jsonString);

        // Validate required fields
        for (const field of this.schema.required) {
            if (!ruleset[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate tables exist
        if (!ruleset.tables) {
            throw new Error('Missing tables object');
        }

        // Generate ID if not present
        if (!ruleset.id) {
            ruleset.id = `ruleset_${Date.now()}`;
        }

        // Add metadata
        ruleset.importedAt = new Date().toISOString();

        // Store
        this.rulesets[ruleset.id] = ruleset;
        await this.save();

        return ruleset.id;
    },

    /**
     * Import ruleset from file
     * @param {File} file 
     * @returns {Promise<string>} Imported ruleset ID
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const id = await this.importFromJSON(e.target.result);
                    resolve(id);
                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    },

    /**
     * Export ruleset to JSON string
     * @param {string} id 
     * @returns {string}
     */
    exportToJSON(id) {
        const ruleset = this.rulesets[id];
        if (!ruleset) {
            throw new Error('Ruleset not found');
        }
        return JSON.stringify(ruleset, null, 2);
    },

    /**
     * Delete a ruleset
     * @param {string} id 
     */
    async delete(id) {
        if (this.rulesets[id]) {
            delete this.rulesets[id];

            if (this.currentRulesetId === id) {
                this.currentRulesetId = null;
            }

            await this.save();
        }
    },

    /**
     * Save to storage
     */
    async save() {
        try {
            await chrome.storage.local.set({
                pcbGuardRulesets: this.rulesets,
                currentRulesetId: this.currentRulesetId
            });
        } catch (e) {
            // Ignore
        }
    },

    /**
     * Look up clearance value from current ruleset
     * @param {Object} params - { voltage, pollutionDegree, materialGroup, overvoltageCategory }
     * @returns {Object} { value, source, warnings }
     */
    lookupClearance(params) {
        const ruleset = this.getCurrent();

        if (!ruleset) {
            return {
                value: null,
                source: null,
                error: 'No ruleset loaded. Please import a clearance/creepage ruleset.'
            };
        }

        const { voltage, pollutionDegree = 2 } = params;

        // Try to find matching table
        const pdKey = `pollution_degree_${pollutionDegree}`;
        const table = ruleset.tables?.clearance?.[pdKey] || ruleset.tables?.clearance;

        if (!table) {
            return {
                value: null,
                source: ruleset.standard,
                error: `No clearance table found for pollution degree ${pollutionDegree}`
            };
        }

        // Find appropriate voltage bracket
        const voltages = Object.keys(table).map(Number).sort((a, b) => a - b);
        let matchedVoltage = voltages.find(v => v >= voltage);

        if (!matchedVoltage) {
            // Use highest available
            matchedVoltage = voltages[voltages.length - 1];
            return {
                value: table[matchedVoltage],
                source: `${ruleset.standard} (${ruleset.version})`,
                warnings: [`Voltage ${voltage}V exceeds table maximum ${matchedVoltage}V. Consider consulting the full standard.`]
            };
        }

        return {
            value: table[matchedVoltage],
            source: `${ruleset.standard} (${ruleset.version})`,
            warnings: []
        };
    },

    /**
     * Look up creepage value from current ruleset
     * @param {Object} params - { voltage, pollutionDegree, materialGroup }
     * @returns {Object} { value, source, warnings }
     */
    lookupCreepage(params) {
        const ruleset = this.getCurrent();

        if (!ruleset) {
            return {
                value: null,
                source: null,
                error: 'No ruleset loaded. Please import a clearance/creepage ruleset.'
            };
        }

        const { voltage, pollutionDegree = 2, materialGroup = 'II' } = params;

        // Try to find matching table
        const mgKey = `material_group_${materialGroup}`;
        const pdKey = `pollution_degree_${pollutionDegree}`;

        let table = ruleset.tables?.creepage?.[pdKey]?.[mgKey]
            || ruleset.tables?.creepage?.[mgKey]
            || ruleset.tables?.creepage?.[pdKey]
            || ruleset.tables?.creepage;

        if (!table) {
            return {
                value: null,
                source: ruleset.standard,
                error: `No creepage table found for PD${pollutionDegree}, MG${materialGroup}`
            };
        }

        // If table is still nested, try to get default
        if (typeof table !== 'object' || Array.isArray(table)) {
            return {
                value: null,
                source: ruleset.standard,
                error: 'Invalid table structure in ruleset'
            };
        }

        // Find appropriate voltage bracket
        const voltages = Object.keys(table).map(Number).sort((a, b) => a - b);
        let matchedVoltage = voltages.find(v => v >= voltage);

        if (!matchedVoltage) {
            matchedVoltage = voltages[voltages.length - 1];
            return {
                value: table[matchedVoltage],
                source: `${ruleset.standard} (${ruleset.version})`,
                warnings: [`Voltage ${voltage}V exceeds table maximum ${matchedVoltage}V`]
            };
        }

        return {
            value: table[matchedVoltage],
            source: `${ruleset.standard} (${ruleset.version})`,
            warnings: []
        };
    },

    /**
     * Get sample ruleset template for user reference
     * @returns {Object}
     */
    getSampleTemplate() {
        return {
            id: 'sample_template',
            name: 'Sample Template (NOT FOR PRODUCTION USE)',
            standard: 'User-Defined',
            version: '1.0',
            description: 'This is a template. Replace with values from your licensed standard.',
            tables: {
                clearance: {
                    pollution_degree_1: {
                        '50': 0.04,
                        '100': 0.1,
                        '150': 0.5,
                        '300': 0.8,
                        '600': 1.5
                    },
                    pollution_degree_2: {
                        '50': 0.2,
                        '100': 0.2,
                        '150': 0.5,
                        '300': 1.5,
                        '600': 3.0
                    }
                },
                creepage: {
                    material_group_I: {
                        '50': 0.6,
                        '100': 1.0,
                        '150': 1.5,
                        '300': 3.2
                    },
                    material_group_II: {
                        '50': 0.9,
                        '100': 1.4,
                        '150': 2.0,
                        '300': 4.0
                    }
                }
            },
            notes: [
                'Values in millimeters (mm)',
                'This template does not represent actual standard values',
                'Import your own data from licensed IEC/UL standards'
            ]
        };
    }
};

// Initialize on load
if (typeof chrome !== 'undefined' && chrome.storage) {
    RulesetsManager.init();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RulesetsManager;
}
