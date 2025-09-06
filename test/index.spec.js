const { execSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { assert } = require('chai');

const encoding = 'utf8';

describe('mocha-quickfix-reporter', () => {
  it('should generate expected quickfix list', () => {
    // given
    const env = {
      ...process.env, // make sure nodejs is available
      NO_VIM: 1,
    };

    // when
    let res;
    try {
      execSync('npx --no mocha -- --reporter ./src ./test/e2e-example-tests.js', { env, encoding });
      assert.fail('Tests should have failed.');
    } catch(err) {
      assert.equal(err.status, 3);
      res = err.stdout.toString();
    }
    debugConsoleOutput('res', res);

    // expect
    assert.match(res, regex`
  example mocha suite with failures
    simple failures
      ⛔ example mocha suite with failures simple failures should fail this one
    duplicate describe blocks
      duplicate one
        ✅ example mocha suite with failures duplicate describe blocks duplicate one should pass in the first block...
      duplicate one
        ⛔ example mocha suite with failures duplicate describe blocks duplicate one ...and fail in the second one
      duplicate two
        ⛔ example mocha suite with failures duplicate describe blocks duplicate two should fail in the first block...
      duplicate two
        ✅ example mocha suite with failures duplicate describe blocks duplicate two ...and pass in the second one

  Tests completed.

      Passed: 2
      Failed: 3
       Total: 5
     Skipped: 0
    Duration: ${/\d+/}ms

  quickfix list generated at: /tmp/quickfix-${/\d+/}-${/\d+/}.log

`);

    assert.match(quickfixContentsFromResults(res), regex`TESTSTART::${/.*/}test/e2e-example-tests.js:4:should fail this one
  Error: Direct failure.
    at Context.<anonymous> (test/e2e-example-tests.js:4:13)
    at process.processImmediate (node:internal/timers:485:21)
`);
  });
});

function regex(strings, ...values) {
  const source = strings
      .map((s, i) => escapeStringForRegex(s) + escapeStringForRegex(values[i] || ''))
      .join('');

  debugConsoleOutput('regex', source);

  // Return a new RegExp object with the multiline flag
  return new RegExp(source, 'm');
}

function escapeStringForRegex(s) {
  if(s instanceof RegExp) return s.source;
  else return s.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function debugConsoleOutput(name, content) {
  console.log(`----- ${name} -----`);
  console.log(content);
  console.log('-------------------');
}

function quickfixContentsFromResults(res) {
  const filename = res.split('\n')
      .find(line => line.trim().startsWith('quickfix list generated at: '))
      .split(': ')[1];
  const contents = readFileSync(filename, { encoding });
  debugConsoleOutput('quickfix file', contents);
  return contents;
}
