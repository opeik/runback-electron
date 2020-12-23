#!/usr/bin/env bash
VERSION=$(json version -f lib/nodecg/bundles/runback/package.json)
json -I -f package.json -e "this.version=\"$VERSION\""
