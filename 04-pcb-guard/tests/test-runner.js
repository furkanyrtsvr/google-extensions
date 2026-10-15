/**
 * PCB Guard - Test Runner Framework
 */

const TestRunner = {
    suites: [],
    results: [],

    /**
     * Register a test suite
     */
    suite(name, tests) {
        this.suites.push({ name, tests });
    },

    /**
     * Run all registered test suites
     */
    runAll() {
        this.results = [];

        for (const suite of this.suites) {
            const suiteResult = {
                name: suite.name,
                tests: [],
                passed: 0,
                failed: 0
            };

            for (const test of suite.tests) {
                try {
                    const result = test.fn();
                    const passed = result === true || result === undefined;

                    suiteResult.tests.push({
                        name: test.name,
                        passed,
                        error: passed ? null : (result || 'Test returned false')
                    });

                    if (passed) suiteResult.passed++;
                    else suiteResult.failed++;

                } catch (e) {
                    suiteResult.tests.push({
                        name: test.name,
                        passed: false,
                        error: e.message
                    });
                    suiteResult.failed++;
                }
            }

            this.results.push(suiteResult);
        }
    },

    /**
     * Display results in the page
     */
    displayResults() {
        const container = document.getElementById('results');
        const summary = document.getElementById('summary');

        let totalPassed = 0;
        let totalFailed = 0;

        container.innerHTML = this.results.map(suite => {
            totalPassed += suite.passed;
            totalFailed += suite.failed;

            return `
        <div class="test-suite">
          <h2>${suite.name} (${suite.passed}/${suite.tests.length})</h2>
          ${suite.tests.map(t => `
            <div class="test ${t.passed ? 'pass' : 'fail'}">
              ${t.passed ? '✓' : '✗'} ${t.name}
              ${t.error ? `<pre>${t.error}</pre>` : ''}
            </div>
          `).join('')}
        </div>
      `;
        }).join('');

        const allPass = totalFailed === 0;
        summary.className = `summary ${allPass ? 'all-pass' : 'has-fail'}`;
        summary.innerHTML = `
      <strong>${allPass ? '✓ All tests passed!' : '✗ Some tests failed'}</strong><br>
      Passed: ${totalPassed} | Failed: ${totalFailed} | Total: ${totalPassed + totalFailed}
    `;
    },

    // Assertion helpers
    assert: {
        equal(a, b, msg = '') {
            if (a !== b) throw new Error(`${msg}: Expected ${b}, got ${a}`);
            return true;
        },

        approxEqual(a, b, tolerance = 0.01, msg = '') {
            const diff = Math.abs(a - b);
            const relativeDiff = diff / Math.max(Math.abs(a), Math.abs(b), 1);
            if (relativeDiff > tolerance) {
                throw new Error(`${msg}: Expected ~${b}, got ${a} (diff: ${(relativeDiff * 100).toFixed(2)}%)`);
            }
            return true;
        },

        isTrue(val, msg = '') {
            if (val !== true) throw new Error(`${msg}: Expected true, got ${val}`);
            return true;
        },

        exists(val, msg = '') {
            if (val === null || val === undefined) throw new Error(`${msg}: Value is null/undefined`);
            return true;
        },

        hasWarning(result, msg = '') {
            if (!result.warnings || result.warnings.length === 0) {
                throw new Error(`${msg}: Expected warnings but none found`);
            }
            return true;
        }
    }
};
