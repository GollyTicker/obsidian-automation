#!/bin/bash
set -e
mkdir -p test-vault/.obsidian/plugins/automation

./stop-dev.sh

sudo mount --bind ./watch test-vault/.obsidian/plugins/automation
docker-compose build
docker-compose run --rm plugin
#  --user "$(id -u):$(id -g)"
