## Start locally in DEV / PROD mode

Start `scripts/restart-dev.sh` (or `scripts/restart-prod.sh`) and
[open test-vault in Obsidian](obsidian://open?vault=test-vault&file=README)

Stop with `scripts/stop.sh`.

## Development loop

1. Do something in obsidian
2. Investigate the result and make code changes.
3. Refresh Obsidian with `Ctrl + Alt + R`
4. Continue at 1.

## Tasks

* [x] create setup for watch mode reloading of the plugin
  * [x] and run it inside the test-vault
* [x] create setup to copy production-mode plugin into test-vault
  * [x] produce build output into a directory
* [x] decide on the language of the bots
* [ ] decide for a small set of use cases to cover
* [ ] share mock-view with others and gather feedback
* [ ] create test scenarios for these use cases
* [ ] create bots for these use cases
* [ ] share first iteration with others and gather feedback

* [ ] figure out how to support older versions of the obsidian client
  * until how much in the past?
* [ ] mobile support? mobile first?

* [ ] I updated the lib to `es2020` in tsconfig.js. Is that ok so? My IDE, was not properly detecting the right libs. 