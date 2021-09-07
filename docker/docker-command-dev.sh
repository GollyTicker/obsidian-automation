#!/bin/bash
set -e
cp src/styles.css src/manifest.json test-vault/.obsidian/plugins/automation/
npm run dev
