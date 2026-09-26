#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$project_dir"
open_panel() {
  if command -v xdg-open >/dev/null; then
    xdg-open http://localhost:3901
  else
    printf '%s\n' 'Painel pronto: http://localhost:3901'
  fi
}
if systemctl --user is-enabled parkour-vicosa.service >/dev/null 2>&1; then
  systemctl --user reset-failed parkour-vicosa.service
  systemctl --user start parkour-vicosa.service
  node scripts/wait-for-panel.mjs
  open_panel
else
  if node scripts/wait-for-panel.mjs 1500 >/dev/null 2>&1; then
    open_panel
    exit 0
  fi
  if [[ ! -f dist/index.html ]]; then npm run build; fi
  node server/whatsapp-server.mjs &
  server_pid=$!
  trap 'kill -TERM "$server_pid" 2>/dev/null || true' EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM
  node scripts/wait-for-panel.mjs
  open_panel
  wait "$server_pid"
fi
