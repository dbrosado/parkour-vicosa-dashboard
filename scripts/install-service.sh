#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
node_bin="$(command -v node)"
if ! command -v flock >/dev/null; then
  echo 'O painel precisa do comando flock (pacote util-linux) para proteger os dados.' >&2
  exit 1
fi
service_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
if [[ ! -f "$project_dir/dist/index.html" ]]; then
  echo 'Primeiro gere a versão do painel com npm run build.' >&2
  exit 1
fi
mkdir -p "$service_dir"
cat > "$service_dir/parkour-vicosa.service" <<UNIT
[Unit]
Description=Parkour Vicosa - CRM e WhatsApp
After=network-online.target
Wants=network-online.target
# The project may live on an external disk that mounts after the user service starts.
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=$project_dir
ExecStart="$node_bin" "$project_dir/server/whatsapp-server.mjs"
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=WHATSAPP_PORT=3901
EnvironmentFile=-$project_dir/server/data/service.env
Restart=on-failure
RestartSec=10
TimeoutStopSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=default.target
UNIT
systemctl --user daemon-reload
systemctl --user enable parkour-vicosa.service
systemctl --user reset-failed parkour-vicosa.service
systemctl --user restart parkour-vicosa.service
"$node_bin" "$project_dir/scripts/wait-for-panel.mjs"
systemctl --user is-active parkour-vicosa.service
printf '%s\n' 'Painel instalado. Abra http://localhost:3901 neste computador.'
