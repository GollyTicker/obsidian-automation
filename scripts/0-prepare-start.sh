#!/bin/bash
set -e

mkdir -p test-vault/.obsidian/plugins/automation

./scripts/stop.sh

docker-compose -f docker/compose.yml build
