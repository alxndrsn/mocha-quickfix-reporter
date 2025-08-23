const { execFileSync, spawn } = require('node:child_process');
const { appendFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const Path = require('node:path');

const Mocha = require('mocha');
const {
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END
} = Mocha.Runner.constants;

const loadMochaMap = require('./load-mocha-map');

const encoding = 'utf8';
const EFM_PREFIX = 'TESTSTART::';

// this reporter outputs test results, indenting two spaces per suite
class MyReporter {
  constructor(runner) {
    this._indents = 0;
    this.testMaps = {};
    this.onlies = [];

    const tempDir = tmpdir();
    const filestamp = `${Date.now()}-${Math.floor(Math.random()*Number.MAX_SAFE_INTEGER)}`;
    const tmpFile = `${tempDir}/quickfix-${filestamp}.log`;

    const append = text => appendFileSync(tmpFile, text + '\n', encoding);
    function appendQf({ filePath, lineNumber, columnNumber, errorDescription }) {
      const parts = [filePath, lineNumber];
      if(columnNumber != null) parts.push(columnNumber);
      parts.push(errorDescription);
      append(EFM_PREFIX + parts.join(':'));
    }
    const appendStack = stack => append('  ' + stack.split('\n').join('  \n'));

    runner.on(EVENT_SUITE_BEGIN, suite => {
      this.increaseIndent();
      console.log(`${this.indent()}${suite.title}`);
    });
    runner.on(EVENT_SUITE_END, () => {
      this.decreaseIndent();
    });
    runner.on(EVENT_TEST_PASS, safely(test => {
      console.log(`${this.indent()}  ✅`, test.fullTitle());
    }));
    runner.on(EVENT_TEST_FAIL, safely((test, err) => {
      console.log(`${this.indent()}  ⛔`, test.fullTitle());

      const errLineNumber = this.getLineNumber(test, err);
      appendQf({ filePath:test.file, lineNumber:errLineNumber, errorDescription:test.title });
      appendStack(err.stack);

      if(process.env.APPLY_ONLIES) {
        const testLineNumber = this.getLineNumber(test);
        this.onlies.push({ path:test.file, lineNumber:testLineNumber });
      }
    }));
    runner.once(EVENT_RUN_END, safely(() => {
      const { passes, failures, pending, duration } = runner.stats;

      console.log();
      console.log(`  Tests completed.`);
      console.log();
      console.log('      Passed:', passes);
      console.log('      Failed:', failures);
      console.log('       Total:', passes + failures);
      console.log('     Skipped:', pending);
      console.log('    Duration:', `${duration}ms`);
      console.log();
      console.log('  quickfix list generated at:', tmpFile);
      console.log();

      try {
        if(process.env.APPLY_ONLIES) {
          Object.entries(
            this.onlies
                .reduce((acc, { path, lineNumber }) => {
                  if(!acc[path]) acc[path] = [];
                  acc[path].push(lineNumber);
                  return acc;
                }, {}),
          ).forEach(([ path, lineNumbers ]) => {
            const expressions = lineNumbers.flatMap(n => [ '-e', `${n}s/it(/it.only(/` ]);
            execFileSync('sed', [ '-i', ...expressions, path ]);
          });
        }

        if(failures && !process.env.NO_VIM) {
          spawn('vim', [`-c set errorformat=${EFM_PREFIX}%f:%l:%m | cfile ${tmpFile} | copen`], { stdio:'inherit' });
        }
      } catch(err) {
        console.log('Error processing run end:', err);
        process.exit(1);
      }
    }));
  }

  indent() {
    return Array(this._indents).join('  ');
  }

  increaseIndent() {
    this._indents++;
  }

  decreaseIndent() {
    this._indents--;
  }

  getFileMap(test) {
    if(!this.testMaps[test.file]) this.testMaps[test.file] = loadMochaMap(test.file);
    return this.testMaps[test.file];
  }

  getLineNumber(test, { stack }={}) {
    const fileMap = this.getFileMap(test);
    return getLineNumber(test, stack, fileMap);
  }
}
module.exports = MyReporter;

function getLineNumber(test, stack, fileMap) {
  let path, start, end;
  try {
    path = [];
    for(let curr = test; !curr.root; curr = curr.parent) path.unshift(curr.title);

    const boundaries = path.reduce((map, p) => map[p], fileMap);
    start = boundaries.start;
    end = boundaries.end;

    if(!stack) return start;

    // If the error stacktrace points to the current test function, use that line number:
    const { file } = test;
    const rel = Path.relative(process.cwd(), file);
    const abs = Path.resolve(file);
    const firstMention = Number(
      stack.split('\n')
          .map(line => line.match(new RegExp(`\\b(?:${rel}|${abs}):(\\d+):\\d+`)))
          .find(it => it)?.[1],
    );

    if(firstMention >= start && firstMention <= end) return firstMention;
    else return start;
  } catch(err) {
    console.log(JSON.stringify(fileMap, (k, v) => v.end ? undefined : v, 2));
    console.log({ path, start, end, file:test.file, stack });
    console.log('Error trying to match test line number:', err);
    console.log('If this has failed because your test has a dynamic name, then there\'s scope for improving this function!');
    process.exit(1);
    return -1;
  }
}

function safely(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch(err) {
      console.log(err);
      process.exit(1);
    }
  };
}
