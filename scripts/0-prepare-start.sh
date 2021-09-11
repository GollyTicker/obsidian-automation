#!/bin/bash
set -e

if [[ "$1" == "prod" ]]; then
  rm -rf target/*
else
  rm -rf test-vault/.obsidian/plugins/automation/*
fi

mkdir -p target/dist
mkdir -p test-vault/.obsidian/plugins/automation

./scripts/stop.sh

docker-compose -f docker/compose.yml build
