#!/usr/bin/env bash
# Run after `tauri build` to generate updater-ready packages.
# Usage: ./scripts/package-updater.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAURI_DIR="$ROOT/src-tauri"
CONF="$TAURI_DIR/tauri.conf.json"
BUNDLE_DIR="$TAURI_DIR/target/release/bundle"
DIST_DIR="$ROOT/dist-updater"
MINISIGN_KEY="$ROOT/minisign.key"
MINISIGN_PUB="$ROOT/minisign.pub"

# ── Read version & app name ──────────────────────────────────────────

APP_NAME=$(node -e "process.stdout.write(require('$CONF').productName)")
VERSION=$(node -e "process.stdout.write(require('$CONF').version)")

echo "App:     $APP_NAME"
echo "Version: $VERSION"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# ── macOS ────────────────────────────────────────────────────────────

package_macos() {
  local arch="$1"   # aarch64 | x86_64
  local app_dir="$BUNDLE_DIR/macos/$APP_NAME.app"

  if [ -d "$app_dir" ]; then
    local out="$DIST_DIR/${APP_NAME}_${VERSION}_${arch}.app.tar.gz"
    echo "→ Packaging macOS ($arch): $out"
    COPYFILE_DISABLE=1 tar czf "$out" --exclude '._*' -C "$BUNDLE_DIR/macos" "$APP_NAME.app"

    sign "$out"
  else
    echo "→ Skipping macOS ($arch): no .app found at $app_dir"
  fi
}

# ── Linux ────────────────────────────────────────────────────────────

package_linux() {
  local arch="$1"   # x86_64 | aarch64
  local appimage=$(ls "$BUNDLE_DIR"/appimage/*.AppImage 2>/dev/null | head -1)

  if [ -n "$appimage" ]; then
    local out="$DIST_DIR/${APP_NAME}_${VERSION}_${arch}.AppImage.tar.gz"
    echo "→ Packaging Linux ($arch): $out"
    tar czf "$out" -C "$(dirname "$appimage")" "$(basename "$appimage")"

    sign "$out"
  else
    echo "→ Skipping Linux ($arch): no AppImage found"
  fi
}

# ── Windows ──────────────────────────────────────────────────────────

package_windows() {
  local arch="$1"   # x86_64 | i686 | aarch64
  local nsis_zip=$(ls "$BUNDLE_DIR"/nsis/*_${arch}-setup.nsis.zip 2>/dev/null | head -1)
  local msi_zip=$(ls "$BUNDLE_DIR"/msi/*_${arch}.msi.zip 2>/dev/null | head -1)
  local src="${nsis_zip:-${msi_zip:-}}"

  if [ -n "$src" ]; then
    local filename=$(basename "$src")
    local out="$DIST_DIR/$filename"
    echo "→ Packaging Windows ($arch): $out"
    cp "$src" "$out"

    sign "$out"
  else
    echo "→ Skipping Windows ($arch): no installer found"
  fi
}

# ── Sign with minisign ───────────────────────────────────────────────

sign() {
  local file="$1"
  if [ -f "$MINISIGN_KEY" ] && command -v minisign &>/dev/null; then
    echo "  → Signing: $file"
    local sig_file="${file}.minisig"
    expect -c "
      spawn minisign -S -s $MINISIGN_KEY -m $file -x $sig_file
      expect \"Password:\"
      send \"tauri123\r\"
      expect eof
    " 2>/dev/null
    echo "  → Signature: $sig_file"
  else
    echo "  → Skipping sign (minisign key not found)"
  fi
}

# ── Detect target from build output ──────────────────────────────────

detect_and_package() {
  # macOS
  if [ -d "$BUNDLE_DIR/macos" ]; then
    local arch
    arch=$(ls "$BUNDLE_DIR"/macos/*.app 2>/dev/null | head -1)
    if [ -n "$arch" ]; then
      # Detect arch from the build directory structure
      # tauri build --target aarch64-apple-darwin puts output in <target>/release/bundle
      # But after a single build, the target dir name is baked in the path
      if [[ "$BUNDLE_DIR" == *"aarch64"* ]]; then
        package_macos "aarch64"
      elif [[ "$BUNDLE_DIR" == *"x86_64"* ]]; then
        package_macos "x86_64"
      else
        # Try uname as fallback
        local machine_arch
        machine_arch=$(uname -m)
        case "$machine_arch" in
          arm64)  package_macos "aarch64" ;;
          x86_64) package_macos "x86_64" ;;
          *)      echo "Unknown arch: $machine_arch" ;;
        esac
      fi
    fi
  fi

  # Linux
  if [ -d "$BUNDLE_DIR/appimage" ]; then
    package_linux "x86_64"
  fi

  # Windows
  if [ -d "$BUNDLE_DIR/nsis" ] || [ -d "$BUNDLE_DIR/msi" ]; then
    local win_arch
    if [[ "$BUNDLE_DIR" == *"x86_64"* ]]; then
      package_windows "x86_64"
    elif [[ "$BUNDLE_DIR" == *"i686"* ]]; then
      package_windows "i686"
    else
      package_windows "x86_64"
    fi
  fi
}

detect_and_package

# ── Summary ───────────────────────────────────────────────────────────

echo ""
echo "Done. Updater packages in $DIST_DIR/:"
ls -lh "$DIST_DIR"/
echo ""
echo "Upload these files to your CDN, e.g.:"
for f in "$DIST_DIR"/*.tar.gz "$DIST_DIR"/*.zip; do
  [ -f "$f" ] || continue
  echo "  https://tauri-db.deepsky.top/v$VERSION/$(basename "$f")"
done
echo ""
echo "--- Base64-encoded values for Tauri updater ---"
echo ""
echo "PUBKEY (put in tauri.conf.json -> plugins.updater.pubkey):"
base64 < "$MINISIGN_PUB" | tr -d '\n'; echo
echo ""
for sig in "$DIST_DIR"/*.minisig; do
  [ -f "$sig" ] || continue
  echo "SIGNATURE for $(basename "$sig" .minisig):"
  base64 < "$sig" | tr -d '\n'; echo
  echo ""
done
echo ""
echo "Paste the base64-encoded signature into Cloudflare Worker SIGNATURES env var."
