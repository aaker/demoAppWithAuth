#!/usr/bin/env bash
#
# uninstall.sh — remove the mock-vendor-server systemd service.
#   sudo ./uninstall.sh           # stop, disable, remove unit + app dir
#   sudo ./uninstall.sh --purge   # also remove the env file and system user

set -euo pipefail

APP_NAME="mock-vendor-server"
APP_USER="mockvendor"
APP_DIR="/opt/${APP_NAME}"
ENV_FILE="/etc/${APP_NAME}.env"
UNIT_FILE="/etc/systemd/system/${APP_NAME}.service"
PURGE="${1:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: must be run as root (use sudo)." >&2
  exit 1
fi

echo "==> Stopping and disabling ${APP_NAME}"
systemctl stop "${APP_NAME}" 2>/dev/null || true
systemctl disable "${APP_NAME}" 2>/dev/null || true

echo "==> Removing unit and app directory"
rm -f "${UNIT_FILE}"
rm -rf "${APP_DIR}"
systemctl daemon-reload

if [[ "${PURGE}" == "--purge" ]]; then
  echo "==> Purging env file and user"
  rm -f "${ENV_FILE}"
  if id "${APP_USER}" >/dev/null 2>&1; then
    userdel "${APP_USER}" 2>/dev/null || true
  fi
else
  echo "==> Keeping ${ENV_FILE} and user '${APP_USER}' (use --purge to remove)"
fi

echo "==> Done."
