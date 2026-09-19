#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$project_dir"
if systemctl --user is-enabled parkour-vicosa.service >/dev/null 2>&1; then
  systemctl --user start parkour-vicosa.service
  command -v xdg-open >/dev/null && xdg-open http://localhost:3901
else
  if [[ ! -f dist/index.html ]]; then npm run build; fi
  (sleep 2; command -v xdg-open >/dev/null && xdg-open http://localhost:3901) &
  exec node server/whatsapp-server.mjs
fi
