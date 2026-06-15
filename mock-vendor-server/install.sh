#!/usr/bin/env bash
#
# install.sh — install mock-vendor-server as a systemd service.
#
# Run from the project directory on the target Linux host:
#   sudo ./install.sh
#
# Re-running is safe: it re-syncs the app, refreshes the unit, and restarts.
# The env file at /etc/mock-vendor-server.env is NOT overwritten if it exists.

set -euo pipefail

APP_NAME="mock-vendor-server"
APP_USER="mockvendor"
APP_DIR="/opt/${APP_NAME}"
ENV_FILE="/etc/${APP_NAME}.env"
UNIT_FILE="/etc/systemd/system/${APP_NAME}.service"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: must be run as root (use sudo)." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: 'node' not found on PATH. Install Node.js >= 16 first." >&2
  exit 1
fi
NODE_BIN="$(command -v node)"
echo "==> Using node: ${NODE_BIN} ($(node --version))"

# 1. Dedicated system user (no login, no home)
if ! id "${APP_USER}" >/dev/null 2>&1; then
  echo "==> Creating system user '${APP_USER}'"
  useradd --system --no-create-home --shell /usr/sbin/nologin "${APP_USER}"
else
  echo "==> User '${APP_USER}' already exists"
fi

# 2. Sync application into /opt (excludes dev cruft)
echo "==> Installing app to ${APP_DIR}"
mkdir -p "${APP_DIR}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '*.service' \
    --exclude '*.env' \
    --exclude 'install.sh' \
    "${SRC_DIR}/" "${APP_DIR}/"
else
  cp -R "${SRC_DIR}/." "${APP_DIR}/"
  rm -rf "${APP_DIR}/.git" "${APP_DIR}/node_modules"
fi

# 3. Production dependencies
echo "==> Installing production dependencies"
( cd "${APP_DIR}" && npm install --omit=dev --no-audit --no-fund )

chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

# 4. Environment file (preserve existing edits)
if [[ -f "${ENV_FILE}" ]]; then
  echo "==> Keeping existing ${ENV_FILE}"
else
  echo "==> Installing ${ENV_FILE}"
  install -m 0640 "${SRC_DIR}/${APP_NAME}.env" "${ENV_FILE}"
  chown root:"${APP_USER}" "${ENV_FILE}"
fi

# 5. systemd unit
echo "==> Installing unit ${UNIT_FILE}"
install -m 0644 "${SRC_DIR}/${APP_NAME}.service" "${UNIT_FILE}"

# 6. Enable + (re)start
echo "==> Reloading systemd and starting service"
systemctl daemon-reload
systemctl enable "${APP_NAME}"
systemctl restart "${APP_NAME}"

echo
echo "==> Done. Status:"
systemctl --no-pager --full status "${APP_NAME}" || true
echo
echo "Useful commands:"
echo "  sudo systemctl status ${APP_NAME}"
echo "  sudo systemctl restart ${APP_NAME}"
echo "  journalctl -u ${APP_NAME} -f"
echo "  sudo nano ${ENV_FILE}   # then: sudo systemctl restart ${APP_NAME}"
