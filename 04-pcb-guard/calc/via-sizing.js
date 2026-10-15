/**
 * PCB Guard - Via Sizing & Manufacturability Calculator
 * Calculates via geometry and checks against manufacturing capabilities.
 */

const ViaSizingCalculator = {

    calculate(params) {
        const {
            drillDiameter, drillUnit = 'mm',
            padDiameter, padUnit = 'mm',
            boardThickness, boardUnit = 'mm',
            platingThickness = null,
            antipadDiameter = null, antipadUnit = 'mm'
        } = params;

        const warnings = [];
        const assumptions = [];

        const drillMm = this.toMm(drillDiameter, drillUnit);
        const padMm = this.toMm(padDiameter, padUnit);
        const boardMm = this.toMm(boardThickness, boardUnit);
        const antipadMm = antipadDiameter ? this.toMm(antipadDiameter, antipadUnit) : null;

        let platingUm = platingThickness || 25;
        assumptions.push({ source: 'IPC-6012', note: `Plating: ${platingUm} µm` });

        const annularRingMm = (padMm - drillMm) / 2;
        const aspectRatio = boardMm / drillMm;
        const antipadClearanceMm = antipadMm ? (antipadMm - padMm) / 2 : null;

        const outerRadiusMm = drillMm / 2;
        const innerRadiusMm = outerRadiusMm - (platingUm / 1000);
        const barrelAreaMm2 = Math.PI * (outerRadiusMm ** 2 - innerRadiusMm ** 2);

        let manufacturability = { status: 'green', warnings: [] };

        if (typeof PresetsManager !== 'undefined') {
            manufacturability = PresetsManager.checkViaManufacturability({
                drill: drillMm, pad: padMm, boardThickness: boardMm
            });
        } else {
            if (aspectRatio > 10) {
                manufacturability.status = 'yellow';
                manufacturability.warnings.push({ type: 'warning', message: `Aspect ratio ${aspectRatio.toFixed(1)}:1 high` });
            }
            if (annularRingMm < 0.1) {
                manufacturability.status = 'red';
                manufacturability.warnings.push({ type: 'error', message: `Annular ring too small` });
            }
        }

        if (drillMm < 0.15) warnings.push({ type: 'info', message: 'Requires laser drilling' });
        if (innerRadiusMm <= 0) warnings.push({ type: 'error', message: 'Via would be filled' });

        return {
            geometry: {
                drillDiameter: { mm: drillMm, mil: drillMm / 0.0254 },
                padDiameter: { mm: padMm, mil: padMm / 0.0254 },
                annularRing: { mm: annularRingMm, mil: annularRingMm / 0.0254 },
                aspectRatio,
                boardThickness: { mm: boardMm, mil: boardMm / 0.0254 },
                antipadClearance: antipadClearanceMm ? { mm: antipadClearanceMm } : null
            },
            barrel: {
                platingThickness: { um: platingUm },
                crossSectionArea: { mm2: barrelAreaMm2 },
                innerRadius: { mm: innerRadiusMm },
                outerRadius: { mm: outerRadiusMm }
            },
            manufacturability,
            warnings,
            assumptions,
            visualization: { drillMm, padMm, antipadMm, boardMm, platingUm, annularRingMm, innerRadiusMm, outerRadiusMm }
        };
    },

    toMm(value, unit) {
        if (unit === 'mil' || unit === 'mils') return value * 0.0254;
        if (unit === 'inch') return value * 25.4;
        if (unit === 'um') return value / 1000;
        return value;
    },

    generateSVG(viz, options = {}) {
        const { width = 200, height = 280, darkMode = true } = options;
        const { drillMm, padMm, boardMm, platingUm, annularRingMm } = viz;

        const maxWidth = padMm * 1.3;
        const scale = (width - 40) / maxWidth;
        const centerX = width / 2;
        const topY = 40;
        const boardH = height - 80;

        const drillW = drillMm * scale;
        const padW = padMm * scale;
        const platingW = Math.max(2, (platingUm / 1000) * scale * 3);

        const c = darkMode
            ? { bg: '#1e1e2e', board: '#2d5a7b', copper: '#d4a574', plating: '#b87333', drill: '#1e1e2e', text: '#ccc' }
            : { bg: '#f0f0f0', board: '#228b22', copper: '#d4a574', plating: '#b87333', drill: '#fff', text: '#333' };

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${c.bg}"/>
      <rect x="10" y="${topY}" width="${width - 20}" height="${boardH}" fill="${c.board}"/>
      <rect x="${centerX - padW / 2}" y="${topY - 6}" width="${padW}" height="8" fill="${c.copper}"/>
      <rect x="${centerX - padW / 2}" y="${topY + boardH - 2}" width="${padW}" height="8" fill="${c.copper}"/>
      <rect x="${centerX - drillW / 2}" y="${topY}" width="${drillW}" height="${boardH}" fill="${c.drill}"/>
      <rect x="${centerX - drillW / 2}" y="${topY}" width="${platingW}" height="${boardH}" fill="${c.plating}"/>
      <rect x="${centerX + drillW / 2 - platingW}" y="${topY}" width="${platingW}" height="${boardH}" fill="${c.plating}"/>
      <text x="${centerX}" y="20" font-size="11" fill="${c.text}" text-anchor="middle">Drill: ⌀${drillMm.toFixed(2)}mm</text>
      <text x="${centerX}" y="${height - 10}" font-size="10" fill="${c.text}" text-anchor="middle">AR: ${annularRingMm.toFixed(3)}mm | Pad: ${padMm.toFixed(2)}mm</text>
    </svg>`;
    },

    generateTopViewSVG(viz, options = {}) {
        const { size = 120, darkMode = true } = options;
        const { drillMm, padMm, platingUm } = viz;

        const scale = (size - 20) / (padMm * 1.3);
        const center = size / 2;
        const drillR = (drillMm / 2) * scale;
        const padR = (padMm / 2) * scale;
        const innerR = Math.max(1, ((drillMm / 2) - (platingUm / 1000)) * scale);

        const c = darkMode
            ? { bg: '#1e1e2e', copper: '#d4a574', plating: '#b87333', hole: '#1e1e2e' }
            : { bg: '#f0f0f0', copper: '#d4a574', plating: '#b87333', hole: '#333' };

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${c.bg}"/>
      <circle cx="${center}" cy="${center}" r="${padR}" fill="${c.copper}"/>
      <circle cx="${center}" cy="${center}" r="${drillR}" fill="${c.plating}"/>
      <circle cx="${center}" cy="${center}" r="${innerR}" fill="${c.hole}"/>
    </svg>`;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViaSizingCalculator;
}
