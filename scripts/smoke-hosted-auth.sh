#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3100}"
LOG_FILE="/tmp/ivanacain-next-start.log"
LOGIN_HTML="/tmp/ivanacain-login.html"
REGISTER_BODY="/tmp/ivanacain-register.json"

NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start --hostname 127.0.0.1 --port "$PORT" >"$LOG_FILE" 2>&1 &
server_pid=$!
cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT

ready=false
for _ in $(seq 1 45); do
  if curl -fsS "http://127.0.0.1:$PORT/login" -o "$LOGIN_HTML"; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  cat "$LOG_FILE"
  echo "Next.js server did not become ready." >&2
  exit 1
fi

if grep -q "Crear una cuenta" "$LOGIN_HTML"; then
  echo "Hosted login page must not expose public signup." >&2
  exit 1
fi

status=$(curl -sS -o "$REGISTER_BODY" -w '%{http_code}' \
  -X POST -H 'Content-Type: application/json' --data '{}' \
  "http://127.0.0.1:$PORT/api/register")

if [[ "$status" != "503" ]]; then
  cat "$REGISTER_BODY"
  echo "Expected hosted registration to return HTTP 503; got $status." >&2
  exit 1
fi

grep -q "registro público está temporalmente deshabilitado" "$REGISTER_BODY"
echo "Hosted signup gate passed: UI hides signup and API returns HTTP 503."
