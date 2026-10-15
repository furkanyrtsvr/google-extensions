import fs from 'node:fs';
import vm from 'node:vm';
const files=['core/constants.js','core/units.js','core/presets.js','calc/trace-width.js','calc/voltage-drop.js','calc/via-sizing.js','calc/via-current.js','calc/differential-pairs.js','tests/test-runner.js','tests/test-trace-width.js','tests/test-voltage-drop.js','tests/test-units.js','tests/test-differential.js'];
const context=vm.createContext({console});
for(const file of files)vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
const results=vm.runInContext('TestRunner.runAll(); TestRunner.results',context);
let passed=0,failed=0;
for(const suite of results){
 passed+=suite.passed;failed+=suite.failed;
 for(const test of suite.tests)if(!test.passed)console.error(`${suite.name}: ${test.name}: ${test.error}`);
}
console.log(`PCB Guard existing tests: ${passed} passed, ${failed} failed.`);
if(failed)process.exitCode=1;
