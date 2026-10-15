/**
 * Test Suite: Differential Pairs Calculator
 */

TestRunner.suite('Differential Pairs Calculator', [
    {
        name: 'Basic microstrip Z0 calculation',
        fn: () => {
            const result = DifferentialPairsCalculator.calculate({
                type: 'microstrip',
                w: 0.2, s: 0.15, h: 0.2, t: 0.035, er: 4.5
            });
            TestRunner.assert.exists(result.singleEnded.z0, 'Z0 exists');
            TestRunner.assert.exists(result.differential.zDiff, 'Zdiff exists');
            TestRunner.assert.isTrue(result.singleEnded.z0 > 20 && result.singleEnded.z0 < 150, 'Z0 in reasonable range');
            return true;
        }
    },
    {
        name: 'Zdiff ≈ 2×Z0 for loosely coupled pairs',
        fn: () => {
            // With large spacing, coupling should be minimal
            const result = DifferentialPairsCalculator.calculate({
                type: 'microstrip',
                w: 0.2, s: 1.0, h: 0.2, t: 0.035, er: 4.5
            });
            // For very loose coupling, Zdiff ≈ 2×Z0
            TestRunner.assert.approxEqual(result.differential.zDiff / result.singleEnded.z0, 2, 0.1, 'Zdiff ≈ 2×Z0');
            return true;
        }
    },
    {
        name: 'Tighter spacing reduces Zdiff',
        fn: () => {
            const loose = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.15, s: 0.3, h: 0.2, er: 4.5 });
            const tight = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.15, s: 0.1, h: 0.2, er: 4.5 });
            TestRunner.assert.isTrue(tight.differential.zDiff < loose.differential.zDiff, 'Tighter spacing = lower Zdiff');
            return true;
        }
    },
    {
        name: 'Wider trace lowers impedance',
        fn: () => {
            const narrow = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.1, s: 0.15, h: 0.2, er: 4.5 });
            const wide = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.3, s: 0.15, h: 0.2, er: 4.5 });
            TestRunner.assert.isTrue(wide.singleEnded.z0 < narrow.singleEnded.z0, 'Wider = lower Z0');
            return true;
        }
    },
    {
        name: 'Higher Er reduces impedance',
        fn: () => {
            const lowEr = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.2, s: 0.15, h: 0.2, er: 3.5 });
            const hiEr = DifferentialPairsCalculator.calculate({ type: 'microstrip', w: 0.2, s: 0.15, h: 0.2, er: 5.5 });
            TestRunner.assert.isTrue(hiEr.singleEnded.z0 < lowEr.singleEnded.z0, 'Higher Er = lower Z0');
            return true;
        }
    },
    {
        name: 'Stripline calculation works',
        fn: () => {
            const result = DifferentialPairsCalculator.calculate({
                type: 'stripline',
                w: 0.15, s: 0.15, h: 0.4, t: 0.035, er: 4.5
            });
            TestRunner.assert.exists(result.singleEnded.z0, 'Stripline Z0');
            return true;
        }
    },
    {
        name: 'Width solver works for target impedance',
        fn: () => {
            const result = DifferentialPairsCalculator.solveForWidth({
                targetZdiff: 100,
                type: 'microstrip',
                h: 0.2, t: 0.035, er: 4.5, sRatio: 1.0
            });
            TestRunner.assert.exists(result.w, 'Width solved');
            TestRunner.assert.approxEqual(result.actualZdiff, 100, 0.5, 'Target achieved');
            return true;
        }
    },
    {
        name: 'Odd mode Z < Even mode Z',
        fn: () => {
            const result = DifferentialPairsCalculator.calculate({
                type: 'microstrip',
                w: 0.15, s: 0.15, h: 0.2, er: 4.5
            });
            TestRunner.assert.isTrue(result.oddMode.zOdd < result.evenMode.zEven, 'Zodd < Zeven');
            return true;
        }
    },
    {
        name: 'Effective dielectric between 1 and Er',
        fn: () => {
            const result = DifferentialPairsCalculator.calculate({
                type: 'microstrip',
                w: 0.2, s: 0.15, h: 0.2, er: 4.5
            });
            TestRunner.assert.isTrue(result.effectiveDielectric > 1, 'εeff > 1');
            TestRunner.assert.isTrue(result.effectiveDielectric < 4.5, 'εeff < Er');
            return true;
        }
    },
    {
        name: 'Deterministic solver',
        fn: () => {
            const params = { targetZdiff: 90, type: 'microstrip', h: 0.15, er: 4.2 };
            const first = DifferentialPairsCalculator.solveForWidth(params);
            for (let i = 0; i < 5; i++) {
                const next = DifferentialPairsCalculator.solveForWidth(params);
                TestRunner.assert.equal(next.w, first.w, 'Deterministic width');
            }
            return true;
        }
    }
]);
