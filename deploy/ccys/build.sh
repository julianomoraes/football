#!/bin/sh
# Regenerates this folder's shared files (app.js, config.js, styles.css) from
# the repo root, so they never silently drift from the main GitHub Pages
# site. Run this from anywhere; it locates the repo root relative to itself.
#
# index.html, 404.html, and .htaccess are NOT touched — they're intentionally
# specific to this deployment (different APP_BASE_PATH / redirect target).
set -eu
cd "$(dirname "$0")"
cp ../../app.js .
cp ../../config.js .
cp ../../styles.css .
echo "Copied app.js, config.js, styles.css from repo root."
