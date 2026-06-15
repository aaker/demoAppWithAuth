#!/usr/bin/env bash
set -euo pipefail

# Deploy mock-vendor-server: rsync the app code to sdk.ucaas.lab and restart the systemd service.
#
# Usage:
#   ./deploy.sh           # ship code + restart the service
#   ./deploy.sh --deps    # also run `npm install` on the host (use when dependencies changed)
#
# First-time setup (run once on the host, before this script works):
#   scp -r . ubuntu@sdk.nseng.dev:/tmp/mock-vendor-server
#   ssh ubuntu@sdk.nseng.dev "cd /tmp/mock-vendor-server && sudo ./install.sh"
#
# Host-local state is intentionally NOT shipped: node_modules and the live config
# at /etc/mock-vendor-server.env (edited per host, never overwritten by deploys).

REMOTE="${DEPLOY_HOST:-ubuntu@sdk.nseng.dev}"
REMOTE_PATH="${DEPLOY_DIR:-/opt/mock-vendor-server/}"
SERVICE="mock-vendor-server"
APP_USER="mockvendor"

# Application code shipped on every deploy (allowlist — everything else stays untouched).
FILES=(
    index.js
    package.json
    package-lock.json
    README.md
    install.sh
    mock-vendor-server.env
    mock-vendor-server.service
)

INSTALL_DEPS=false
for arg in "$@"; do
    case "$arg" in
        --deps) INSTALL_DEPS=true ;;
        *)      echo "Unknown option: $arg" >&2; exit 1 ;;
    esac
done

echo "==> Shipping code to ${REMOTE}:${REMOTE_PATH}"
# --rsync-path="sudo rsync": the remote tree is owned by ${APP_USER} (set up by install.sh),
# but we connect as a non-owner, so run the remote side under sudo to write into /opt.
# -rlzv (no -a): don't try to preserve owner/group/perms across the privilege boundary.
rsync -rlzv --omit-dir-times --no-perms --relative \
    --rsync-path="sudo rsync" \
    "${FILES[@]}" "${REMOTE}:${REMOTE_PATH}"

if [ "$INSTALL_DEPS" = true ]; then
    echo "==> Installing dependencies on ${REMOTE}"
    ssh "${REMOTE}" "cd ${REMOTE_PATH} && sudo npm install --omit=dev --no-audit --no-fund"
fi

echo "==> Fixing ownership and restarting ${SERVICE}"
# Node does not hot-reload, so the service must be restarted to load new code.
ssh "${REMOTE}" "sudo chown -R ${APP_USER}:${APP_USER} ${REMOTE_PATH} && \
  sudo systemctl restart ${SERVICE} && \
  sudo systemctl --no-pager --full status ${SERVICE} | head -n 8"

echo "==> Deploy complete."
