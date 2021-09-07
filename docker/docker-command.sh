#!/bin/bash
set -e

# Runs inside the docker container. We copy the static files into the directory for our plugin
# and start either building for prod or building and watching for dev.
# We also set the output directory to the test-vault for dev and the distribution folder for prod.

cp rollup.config.js target/generated.rollup.config.js
perl -i -pe "s|__OUTPUT_DIRECTORY__|${OUTPUT_DIRECTORY}|" target/generated.rollup.config.js

cp src/styles.css manifest.json "$OUTPUT_DIRECTORY"

if [[ "$1" == "prod" ]]; then ARG="build"; else ARG="dev"; fi
npm run $ARG
