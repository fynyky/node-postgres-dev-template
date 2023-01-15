#!/bin/bash
rollup --config rollup.config.js
sass src/sass:src/public
rm -rf dist/
cp -rf src/ dist/
