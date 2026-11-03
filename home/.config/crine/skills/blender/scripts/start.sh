#!/usr/bin/env bash
pgrep -f "blender.*daemon.py" >/dev/null && { echo READY; exit; }
cd "$(dirname "$0")/.."
log=$(mktemp)
setsid blender -b "$@" --python scripts/daemon.py >"$log" 2>&1 &
until grep -q READY "$log" 2>/dev/null; do sleep 0.2; done
cat "$log"
