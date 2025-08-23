mocha-quickfix-reporter
=======================

Use mocha test results in vim's quickfix.


# Usage

To run tests and spawn vim with the quickfix list populated:

```sh
mocha --reporter mocha-quickfix-reporter ...standard args...
```

If there are no test failures, vim will not open.


## Additional Options

### `APPLY_ONLIES`

Setting the `APPLY_ONLIES` env var will change `it(` calls to `it.only(` for tests which failed.

Example:

```sh
APPLY_ONLIES=1 mocha --reporter mocha-quickfix-reporter ...standard args...
```

### `NO_VIM`

Setting the `NO_VIM` env var will prevent VIM being launched when the tests finish.

Example:

```sh
NO_VIM=1 mocha --reporter mocha-quickfix-reporter ...standard args...
```

# Development

To set up:

```sh
yarn
```

To dogfood this custom mocha reporter:

```sh
yarn test:quickfix
```
