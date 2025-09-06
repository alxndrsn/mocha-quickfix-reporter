const { readFileSync } = require('node:fs');

const acorn = require('acorn');
const { walk } = require('estree-walker');

const encoding = 'utf8';

module.exports = function parseFile(filePath) {
  try {
    const sourceText = readFileSync(filePath, { encoding });
    return parseMochaStructure(sourceText);
  } catch(cause) {
    throw new Error(`Error parsing file: ${filePath}`, { cause });
  }
};

function parseMochaStructure(sourceCode) {
  const ast = acorn.parse(sourceCode, {
    locations: true,
    ecmaVersion: 2025
  });

  const result = {};
  const describeStack = [result];

  walk(ast, {
    enter(node) {
      const callType = getCallType(node);
      if(!callType) return;

      if(callType === 'describe') {
        const suiteName = node.arguments[0].value;
        // Handle duplicate describes by mixing them together.  Shouldn't be a
        // problem while line numbers of describes are not tracked.
        if(describeStack[describeStack.length - 1][suiteName]) {
          const existingSuite = describeStack[describeStack.length - 1][suiteName];
          describeStack.push(existingSuite);
        } else {
          const newSuite = {};
          describeStack[describeStack.length - 1][suiteName] = newSuite;
          describeStack.push(newSuite);
        }
      } else if(callType === 'it') {
        const testName = node.arguments[0].value;
        const testLocation = {
          start: node.loc.start.line,
          end:   node.loc.end  .line,
        };
        describeStack[describeStack.length - 1][testName] = testLocation;
      }
    },
    leave(node) {
      if(getCallType(node) === 'describe') {
        describeStack.pop();
      }
    }
  });

  return result;
}

function getCallType(node) {
  if(node.type !== 'CallExpression') return;

  const { callee } = node;

  if(callee.type === 'Identifier') return unalias(callee.name);

  if(callee.type === 'MemberExpression' && callee.property.name === 'only') {
    return unalias(callee.object.name);
  }
}

function unalias(fnName) {
  switch(fnName) {
    case 'context':
    case 'describe':
      return 'describe';
    case 'it':
    case 'specify':
      return 'it';
  }
}
