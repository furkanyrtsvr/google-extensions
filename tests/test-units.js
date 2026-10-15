/**
 * Test Suite: Unit Conversions
 */

TestRunner.suite('Unit Conversions', [
    {
        name: 'mm to mil conversion',
        fn: () => {
            TestRunner.assert.approxEqual(Units.mmToMil(1), 39.37, 0.01, '1mm = 39.37 mil');
            TestRunner.assert.approxEqual(Units.mmToMil(0.254), 10, 0.001, '0.254mm = 10 mil');
            return true;
        }
    },
    {
        name: 'mil to mm conversion',
        fn: () => {
            TestRunner.assert.approxEqual(Units.milToMm(100), 2.54, 0.001, '100 mil = 2.54 mm');
            TestRunner.assert.approxEqual(Units.milToMm(10), 0.254, 0.0001, '10 mil = 0.254 mm');
            return true;
        }
    },
    {
        name: 'Bidirectional consistency: mm <-> mil',
        fn: () => {
            const original = 1.234;
            const converted = Units.milToMm(Units.mmToMil(original));
            TestRunner.assert.approxEqual(converted, original, 0.0001, 'Roundtrip consistent');
            return true;
        }
    },
    {
        name: 'oz to µm conversion',
        fn: () => {
            TestRunner.assert.approxEqual(Units.ozToUm(1), 34.79, 0.01, '1 oz = 34.79 µm');
            TestRunner.assert.approxEqual(Units.ozToUm(2), 69.58, 0.01, '2 oz = 69.58 µm');
            return true;
        }
    },
    {
        name: 'µm to oz conversion',
        fn: () => {
            TestRunner.assert.approxEqual(Units.umToOz(34.79), 1, 0.001, '34.79 µm = 1 oz');
            TestRunner.assert.approxEqual(Units.umToOz(70), 2.01, 0.01, '70 µm ≈ 2 oz');
            return true;
        }
    },
    {
        name: 'Celsius to Fahrenheit',
        fn: () => {
            TestRunner.assert.equal(Units.cToF(0), 32, '0°C = 32°F');
            TestRunner.assert.equal(Units.cToF(100), 212, '100°C = 212°F');
            TestRunner.assert.approxEqual(Units.cToF(25), 77, 0.001, '25°C = 77°F');
            return true;
        }
    },
    {
        name: 'Fahrenheit to Celsius',
        fn: () => {
            TestRunner.assert.equal(Units.fToC(32), 0, '32°F = 0°C');
            TestRunner.assert.equal(Units.fToC(212), 100, '212°F = 100°C');
            return true;
        }
    },
    {
        name: 'Generic convert function',
        fn: () => {
            TestRunner.assert.approxEqual(Units.convert(1, 'mm', 'mil'), 39.37, 0.01, 'Generic mm->mil');
            TestRunner.assert.approxEqual(Units.convert(1, 'oz', 'um'), 34.79, 0.01, 'Generic oz->um');
            TestRunner.assert.equal(Units.convert(100, 'mm', 'mm'), 100, 'Same unit no change');
            return true;
        }
    },
    {
        name: 'Format function works',
        fn: () => {
            TestRunner.assert.equal(Units.format(0), '0', 'Zero');
            TestRunner.assert.equal(Units.format(123.456789, 2), '123.46', 'Rounding');
            TestRunner.assert.isTrue(Units.format(0.0001).includes('e'), 'Scientific for small');
            return true;
        }
    }
]);
