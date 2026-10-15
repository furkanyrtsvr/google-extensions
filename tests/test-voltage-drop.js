/**
 * Test Suite: Voltage Drop Calculator
 */

TestRunner.suite('Voltage Drop Calculator', [
    {
        name: 'Basic resistance calculation',
        fn: () => {
            const result = VoltageDropCalculator.calculate({
                length: 100, lengthUnit: 'mm',
                width: 1, widthUnit: 'mm',
                thickness: 1, thicknessUnit: 'oz',
                current: 1,
                temperature: 25
            });
            TestRunner.assert.exists(result.resistance.ohms, 'Resistance exists');
            TestRunner.assert.exists(result.voltageDrop.volts, 'Voltage drop exists');
            TestRunner.assert.exists(result.powerLoss.watts, 'Power loss exists');
            return true;
        }
    },
    {
        name: 'Longer trace = higher resistance',
        fn: () => {
            const r1 = VoltageDropCalculator.calculate({ length: 50, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 1 });
            const r2 = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 1 });
            TestRunner.assert.approxEqual(r2.resistance.ohms / r1.resistance.ohms, 2, 0.01, 'Resistance doubles');
            return true;
        }
    },
    {
        name: 'Wider trace = lower resistance',
        fn: () => {
            const r1 = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 1 });
            const r2 = VoltageDropCalculator.calculate({ length: 100, width: 1, thickness: 1, thicknessUnit: 'oz', current: 1 });
            TestRunner.assert.approxEqual(r1.resistance.ohms / r2.resistance.ohms, 2, 0.01, 'Resistance halves');
            return true;
        }
    },
    {
        name: 'Higher temperature = higher resistance',
        fn: () => {
            const r1 = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 1, temperature: 25 });
            const r2 = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 1, temperature: 75 });
            TestRunner.assert.isTrue(r2.resistance.ohms > r1.resistance.ohms, 'Higher temp = higher R');
            return true;
        }
    },
    {
        name: 'P = I²R relationship',
        fn: () => {
            const result = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 2, temperature: 25 });
            const expected = result.resistance.ohms * 2 * 2;
            TestRunner.assert.approxEqual(result.powerLoss.watts, expected, 0.001, 'P = I²R');
            return true;
        }
    },
    {
        name: 'V = IR relationship',
        fn: () => {
            const result = VoltageDropCalculator.calculate({ length: 100, width: 0.5, thickness: 1, thicknessUnit: 'oz', current: 2, temperature: 25 });
            const expected = result.resistance.ohms * 2;
            TestRunner.assert.approxEqual(result.voltageDrop.volts, expected, 0.0001, 'V = IR');
            return true;
        }
    },
    {
        name: 'Max length calculation works',
        fn: () => {
            const result = VoltageDropCalculator.calculateMaxLength({
                maxVoltageDrop: 0.1,
                width: 0.5,
                thickness: 1,
                current: 1,
                temperature: 25
            });
            TestRunner.assert.exists(result.maxLength.mm, 'Max length exists');
            TestRunner.assert.isTrue(result.maxLength.mm > 0, 'Max length positive');
            return true;
        }
    },
    {
        name: 'Current density calculated correctly',
        fn: () => {
            const result = VoltageDropCalculator.calculate({ length: 100, width: 1, thickness: 1, thicknessUnit: 'oz', current: 2 });
            // 1mm width × 35µm (1oz) = 0.035 mm²
            // 2A / 0.035 mm² ≈ 57 A/mm²
            TestRunner.assert.approxEqual(result.currentDensity.perSqMm, 57, 0.1, 'Current density');
            return true;
        }
    }
]);
