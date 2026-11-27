#!/usr/bin/env bash
# Sync content collections from the content workspace into src/content/.
# Usage: scripts/sync-content.sh [source-dir]   (default /home/claude/work/content)
set -euo pipefail
SRC="${1:-/home/claude/work/content}"
DST="$(cd "$(dirname "$0")/.." && pwd)/src/content"
mkdir -p "$DST"
for c in profile skill-groups skills projects education publications awards certificates experience pages; do
  [ -d "$SRC/$c" ] || { echo "missing $SRC/$c" >&2; exit 1; }
  if command -v rsync >/dev/null; then
    rsync -a --delete "$SRC/$c/" "$DST/$c/"
  else
    mkdir -p "$DST/$c"
    find "$DST/$c" -mindepth 1 -delete
    cp -a "$SRC/$c/." "$DST/$c/"
  fi
done
echo "synced from $SRC"
