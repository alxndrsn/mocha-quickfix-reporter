const { assert } = require('chai');

const loadMochaMap = require('../src/load-mocha-map');

describe('loadMochaMap()', () => {
  it('should load expected map', () => {
    // expect
    assert.deepEqual(loadMochaMap('./test/e2e-example-tests.js'), {
      'example mocha suite with failures': {
        'duplicate describe blocks': {
          'duplicate one': {
            '...and fail in the second one':     { start:14, end:16 },
            'should pass in the first block...': { start:10, end:11 },
          },
          'duplicate two': {
            '...and pass in the second one':     { start:25, end:26 },
            'should fail in the first block...': { start:20, end:22 },
          }
        },
        'implicit describes': {
          'should fail': { start:42, end:44 },
          'undefined': {},
          'with an immediate failing test': {
            'should fail': { start:49, end:51 },
          },
        },
        'implicit tests': {},
        'simple failures': { 'should fail this one':{ start:3, end:5 } },
      }
    });
  });
});
