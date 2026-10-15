/**
 * PCB Guard - Physical Constants
 * 
 * All constants documented with:
 * - Source reference
 * - Valid range/conditions
 * - Uncertainty where applicable
 */

const CONSTANTS = {
    // =============================================================================
    // COPPER PROPERTIES
    // =============================================================================

    /**
     * Copper resistivity at 20°C
     * Source: NIST Standard Reference Data, IPC-2152
     * Valid for: Annealed copper (electrodeposited PCB copper)
     * Uncertainty: ±2%
     */
    COPPER_RESISTIVITY_20C: 1.724e-8, // Ω·m

    /**
     * Temperature coefficient of resistance for copper
     * Source: CRC Handbook of Chemistry and Physics, IPC
     * Valid range: -40°C to 200°C
     * Uncertainty: ±1%
     */
    COPPER_TEMP_COEFFICIENT: 0.00393, // per °C

    /**
     * Copper thermal conductivity
     * Source: NIST
     * At 20°C
     */
    COPPER_THERMAL_CONDUCTIVITY: 401, // W/(m·K)

    // =============================================================================
    // COPPER THICKNESS CONVERSIONS
    // Source: IPC-4562, IPC-6012
    // =============================================================================

    /**
     * Standard copper weight to thickness conversion
     * 1 oz/ft² = 34.79 µm (per IPC-4562)
     * Industry commonly uses 35 µm nominal
     */
    COPPER_OZ_TO_UM: 34.79, // µm per oz/ft²

    // =============================================================================
    // IPC-2152 TRACE WIDTH COEFFICIENTS
    // Source: IPC-2152 (2009) - Standard for Determining Current-Carrying Capacity
    // =============================================================================

    IPC2152: {
        /**
         * External (outer layer) coefficients
         * Valid for: traces with air exposure, typical FR-4 substrate
         * Current range: 0 to 35A (tested)
         * ΔT range: 10°C to 100°C
         * Width range: 0.005" to 0.400"
         */
        EXTERNAL: {
            k1: 0.048,
            k2: 0.44,
            k3: 0.725,
            description: "Outer layer - air convection cooling"
        },

        /**
         * Internal (inner layer) coefficients
         * Valid for: buried traces in laminate
         * Generally more conservative (less cooling)
         */
        INTERNAL: {
            k1: 0.024,
            k2: 0.44,
            k3: 0.725,
            description: "Inner layer - conduction cooling only"
        }
    },

    // =============================================================================
    // IPC-2221 LEGACY COEFFICIENTS (for comparison)
    // Source: IPC-2221A (1998)
    // Note: IPC-2152 is more accurate; 2221 provided for legacy compatibility
    // =============================================================================

    IPC2221: {
        EXTERNAL: {
            k: 0.0647,
            b: 0.4281,
            c: 0.6732,
            description: "Legacy external formula: I = k * ΔT^b * A^c"
        },
        INTERNAL: {
            k: 0.0150,
            b: 0.5453,
            c: 0.7349,
            description: "Legacy internal formula"
        }
    },

    // =============================================================================
    // VIA PLATING
    // Source: IPC-6012 Class 2/3
    // =============================================================================

    VIA_PLATING: {
        /**
         * Minimum copper plating thickness for vias
         * IPC-6012 Class 2: 20 µm minimum
         * IPC-6012 Class 3: 25 µm minimum
         */
        CLASS_2_MIN: 20, // µm
        CLASS_3_MIN: 25, // µm
        TYPICAL: 25,     // µm - commonly used value
    },

    // =============================================================================
    // DIELECTRIC CONSTANTS (Er)
    // Source: Manufacturer datasheets, IPC-TM-650
    // Note: Actual Er varies with frequency and temperature
    // =============================================================================

    DIELECTRIC: {
        FR4_1GHZ: { er: 4.5, range: [4.2, 4.8], note: "FR-4 at 1GHz, varies with glass content" },
        FR4_DC: { er: 4.7, range: [4.5, 5.0], note: "FR-4 DC/low frequency" },
        ROGERS_4350B: { er: 3.48, range: [3.4, 3.56], note: "Rogers 4350B, 10GHz" },
        ROGERS_4003C: { er: 3.55, range: [3.48, 3.62], note: "Rogers 4003C" },
        ISOLA_370HR: { er: 4.04, range: [3.9, 4.2], note: "Isola 370HR at 1GHz" }
    },

    // =============================================================================
    // PHYSICAL CONSTANTS
    // =============================================================================

    PHYSICS: {
        /**
         * Free space impedance
         * Source: CODATA
         */
        Z0_FREE_SPACE: 376.730313668, // Ω

        /**
         * Speed of light in vacuum
         */
        SPEED_OF_LIGHT: 299792458, // m/s

        /**
         * Euler's number (for calculations)
         */
        E: Math.E
    },

    // =============================================================================
    // UNIT CONVERSION FACTORS
    // =============================================================================

    UNITS: {
        MIL_TO_MM: 0.0254,
        MM_TO_MIL: 39.3700787402,
        INCH_TO_MM: 25.4,
        MM_TO_INCH: 0.0393700787402,
        OZ_TO_UM: 34.79,
        UM_TO_OZ: 0.028743,
        C_TO_F_MULT: 1.8,
        C_TO_F_ADD: 32
    }
};

// Freeze to prevent accidental modification
Object.freeze(CONSTANTS);
Object.freeze(CONSTANTS.IPC2152);
Object.freeze(CONSTANTS.IPC2221);
Object.freeze(CONSTANTS.VIA_PLATING);
Object.freeze(CONSTANTS.DIELECTRIC);
Object.freeze(CONSTANTS.PHYSICS);
Object.freeze(CONSTANTS.UNITS);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONSTANTS;
}
