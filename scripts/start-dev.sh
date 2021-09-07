#!/bin/bash
set -e
mkdir -p test-vault/.obsidian/plugins/automation

./scripts/stop-dev.sh

docker-compose -f docker/compose.yml build
docker-compose -f docker/compose.yml run --rm plugin-dev
