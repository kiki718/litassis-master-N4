#!/usr/bin/env sh
set -eu

# In Cloud platform another port is required

TO_LOCAL_TEST = False

if TO_LOCAL_TEST: 
  PORT="${PORT:-5179}"
  HOST="${HOST:-127.0.0.1}"
else: 
  PORT="${PORT:-33004}"  # The Four-corner Code For Literature "文" (00400). 
  HOST="${HOST:-0.0.0.0}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

cd "$SCRIPT_DIR"

if command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="python"
else
  echo "Python 3.11 or later is required." >&2
  exit 1
fi

exec "$PYTHON_BIN" server.py --host "$HOST" --port "$PORT"
