#!/usr/bin/env bash
# Compile bt-led-controller.ino for Adafruit ItsyBitsy nRF52840 Express via arduino-cli.
# Installs the CLI, Adafruit nRF52 core, and adafruit-nrfutil when missing.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKETCH_DIR="${ROOT_DIR}/bt-led-controller"
# Board FQBN matches Adafruit ItsyBitsy nRF52840 Express (see README / device docs).
FQBN="${ARDUINO_FQBN:-adafruit:nrf52:itsybitsy52840}"
CORE_ID="${ARDUINO_CORE:-adafruit:nrf52}"
CORE_VERSION="${ARDUINO_CORE_VERSION:-1.7.0}"
BOARD_INDEX_URL="${ARDUINO_BOARD_INDEX_URL:-https://adafruit.github.io/arduino-board-index/package_adafruit_index.json}"
BUILD_DIR="${ARDUINO_BUILD_DIR:-${ROOT_DIR}/build/firmware}"
CLI_VERSION="${ARDUINO_CLI_VERSION:-1.5.1}"
CLI_INSTALL_DIR="${ARDUINO_CLI_DIR:-${HOME}/.local/bin}"

log() {
  printf '[build-firmware] %s\n' "$*"
}

die() {
  printf '[build-firmware] ERROR: %s\n' "$*" >&2
  exit 1
}

ensure_arduino_cli() {
  if command -v arduino-cli >/dev/null 2>&1; then
    log "Using $(command -v arduino-cli) ($(arduino-cli version))"
    return
  fi

  log "arduino-cli not found; installing ${CLI_VERSION} into ${CLI_INSTALL_DIR}"
  mkdir -p "${CLI_INSTALL_DIR}"
  local archive="arduino-cli_${CLI_VERSION}_Linux_64bit.tar.gz"
  local url="https://downloads.arduino.cc/arduino-cli/${archive}"
  local tmp
  tmp="$(mktemp -d)"
  curl -fsSL "${url}" -o "${tmp}/${archive}"
  tar -xzf "${tmp}/${archive}" -C "${tmp}"
  install -m 0755 "${tmp}/arduino-cli" "${CLI_INSTALL_DIR}/arduino-cli"
  rm -rf "${tmp}"
  export PATH="${CLI_INSTALL_DIR}:${PATH}"
  command -v arduino-cli >/dev/null 2>&1 || die "arduino-cli install failed"
  log "Installed $(arduino-cli version)"
}

ensure_nrfutil() {
  if command -v adafruit-nrfutil >/dev/null 2>&1; then
    log "Using $(command -v adafruit-nrfutil)"
    return
  fi

  log "adafruit-nrfutil not found; installing with pip"
  python3 -m pip install --user --quiet adafruit-nrfutil
  export PATH="${HOME}/.local/bin:${PATH}"
  command -v adafruit-nrfutil >/dev/null 2>&1 || die "adafruit-nrfutil install failed"
}

ensure_core() {
  if [ ! -f "${HOME}/.arduino15/arduino-cli.yaml" ]; then
    arduino-cli config init >/dev/null
  fi

  # Adafruit nRF52 boards are published on Adafruit's package index, not the default one.
  if ! arduino-cli config dump | grep -Fq "${BOARD_INDEX_URL}"; then
    arduino-cli config add board_manager.additional_urls "${BOARD_INDEX_URL}"
  fi

  arduino-cli core update-index >/dev/null

  local pinned="${CORE_ID}@${CORE_VERSION}"
  if arduino-cli core list | awk '{print $1"@"$2}' | grep -Fxq "${pinned}"; then
    log "Core ${pinned} already installed"
    return
  fi

  log "Installing core ${pinned}"
  arduino-cli core install "${pinned}"
}

compile_sketch() {
  [ -d "${SKETCH_DIR}" ] || die "Sketch directory missing: ${SKETCH_DIR}"
  [ -f "${SKETCH_DIR}/bt-led-controller.ino" ] || die "Sketch missing: ${SKETCH_DIR}/bt-led-controller.ino"

  mkdir -p "${BUILD_DIR}"
  log "Compiling ${SKETCH_DIR} for ${FQBN}"
  log "Build output: ${BUILD_DIR}"

  arduino-cli compile \
    --fqbn "${FQBN}" \
    --output-dir "${BUILD_DIR}" \
    --warnings default \
    "${SKETCH_DIR}"

  log "Compile succeeded"
  ls -la "${BUILD_DIR}"
}

main() {
  export PATH="${CLI_INSTALL_DIR}:${HOME}/.local/bin:${PATH}"
  ensure_arduino_cli
  ensure_nrfutil
  ensure_core
  compile_sketch
}

main "$@"
