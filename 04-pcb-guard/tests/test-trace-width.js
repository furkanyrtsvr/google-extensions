/**
 * Test Suite: Trace Width Calculator
 * 
 * Test vectors include:
 * - Known IPC-2152 examples
 * - Edge cases (min/max values)
 * - Layer comparison (internal vs external)
 * - Standard comparison (IPC-2152 vs IPC-2221)
 */

TestRunner.suite('Trace Width Calculator', [
    // Basic functionality tests
    {
        name: 'Basic external trace 1A, 1oz, 10°C rise',
        fn: () => {
            const result = TraceWidthCalculator.calculate({
                current: 1,
                copperThickness: 1,
                copperUnit: 'oz',
                tempRise: 10,
                layer: 'external',
                standard: 'IPC2152'
            });
            TestRunner.assert.exists(result.minWidth, 'minWidth should exist');
            TestRunner.assert.approxEqual(result.minWidth.mm, 0.25, 0.15, 'Width ~0.25mm for 1A');
            return true;
        }
    },
    {
        name: 'Higher current requires wider trace',
        fn: () => {
            const r1 = TraceWidthCalculator.calculate({ current: 1, copperThickness: 1, tempRise: 10, layer: 'external', standard: 'IPC2152' });
            const r2 = TraceWidthCalculator.calculate({ current: 5, copperThickness: 1, tempRise: 10, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.isTrue(r2.minWidth.mm > r1.minWidth.mm, 'Higher current needs wider trace');
            return true;
        }
    },
    {
        name: 'Higher temp rise allows narrower trace',
        fn: () => {
            const r1 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 10, layer: 'external', standard: 'IPC2152' });
            const r2 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 40, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.isTrue(r1.minWidth.mm > r2.minWidth.mm, 'Higher temp rise = narrower trace');
            return true;
        }
    },
    {
        name: 'Thicker copper allows narrower trace',
        fn: () => {
            const r1 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            const r2 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 2, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.isTrue(r1.minWidth.mm > r2.minWidth.mm, 'Thicker copper = narrower trace');
            return true;
        }
    },
    {
        name: 'Internal layer requires wider trace than external',
        fn: () => {
            const ext = TraceWidthCalculator.calculate({ current: 2, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            const int = TraceWidthCalculator.calculate({ current: 2, copperThickness: 1, tempRise: 20, layer: 'internal', standard: 'IPC2152' });
            TestRunner.assert.isTrue(int.minWidth.mm > ext.minWidth.mm, 'Internal > external width');
            return true;
        }
    },
    {
        name: 'Safety factor increases width',
        fn: () => {
            const r1 = TraceWidthCalculator.calculate({ current: 2, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152', safetyFactor: 1.0 });
            const r2 = TraceWidthCalculator.calculate({ current: 2, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152', safetyFactor: 1.5 });
            TestRunner.assert.approxEqual(r2.recommendedWidth.mm / r1.recommendedWidth.mm, 1.5, 0.01, 'Safety factor applied');
            return true;
        }
    },

    // Range validation tests
    {
        name: 'Warning for current below tested range (0.2A)',
        fn: () => {
            const result = TraceWidthCalculator.calculate({ current: 0.2, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.hasWarning(result, 'Should warn about low current');
            return true;
        }
    },
    {
        name: 'Warning for current above tested range (40A)',
        fn: () => {
            const result = TraceWidthCalculator.calculate({ current: 40, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.hasWarning(result, 'Should warn about high current');
            return true;
        }
    },

    // IPC-2221 comparison
    {
        name: 'IPC-2221 produces different results than IPC-2152',
        fn: () => {
            const r2152 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            const r2221 = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2221' });
            // They should be different but both valid
            TestRunner.assert.exists(r2152.minWidth.mm, 'IPC-2152 result');
            TestRunner.assert.exists(r2221.minWidth.mm, 'IPC-2221 result');
            TestRunner.assert.isTrue(Math.abs(r2152.minWidth.mm - r2221.minWidth.mm) > 0.01, 'Standards differ');
            return true;
        }
    },

    // Reverse calculation test
    {
        name: 'Reverse calculation: width to current',
        fn: () => {
            const fwd = TraceWidthCalculator.calculate({ current: 3, copperThickness: 1, tempRise: 20, layer: 'external', standard: 'IPC2152' });
            const rev = TraceWidthCalculator.calculateCurrent({ width: fwd.minWidth.mm, widthUnit: 'mm', copperThickness: 1, copperUnit: 'oz', tempRise: 20, layer: 'external', standard: 'IPC2152' });
            TestRunner.assert.approxEqual(rev.current, 3, 0.05, 'Reverse calculation matches');
            return true;
        }
    },

    // Determinism test
    {
        name: 'Deterministic: same input = same output (10 iterations)',
        fn: () => {
            const params = { current: 2.5, copperThickness: 1.5, tempRise: 25, layer: 'external', standard: 'IPC2152' };
            const first = TraceWidthCalculator.calculate(params);
            for (let i = 0; i < 10; i++) {
                const next = TraceWidthCalculator.calculate(params);
                TestRunner.assert.equal(next.minWidth.mm, first.minWidth.mm, `Iteration ${i}`);
            }
            return true;
        }
    }
]);
