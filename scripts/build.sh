#!/bin/bash
set -e

echo "🔄 Initializing git submodules..."
git submodule update --init --recursive

echo "📦 Building site..."
npm run generate

echo "✅ Build complete!"
