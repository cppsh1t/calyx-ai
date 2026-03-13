#!/bin/bash
set -e

echo "Building calyx-cli..."
bun run build

BINARY="./dist/calyx"
GLOBAL_BIN="$HOME/.bun/bin/calyx"

echo "Installing to $GLOBAL_BIN..."
cp "$BINARY" "$GLOBAL_BIN"
chmod +x "$GLOBAL_BIN"

echo "✅ calyx installed successfully!"
echo "Run 'calyx --help' to get started."