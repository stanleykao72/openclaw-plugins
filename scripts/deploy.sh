#!/usr/bin/env bash
set -euo pipefail

SRC="/home/ubuntu/openclaw-plugins"
DEST="/home/ubuntu/.openclaw"

# ── Colors ──
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }

# ── Parse args ──
DRY_RUN=false
RESTART=false
COMPONENTS=()

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --restart) RESTART=true ;;
    skills|plugins|hooks) COMPONENTS+=("$arg") ;;
    *) echo "Usage: $0 [--dry-run] [--restart] [skills] [plugins] [hooks]"; exit 1 ;;
  esac
done

# Default: deploy all
if [ ${#COMPONENTS[@]} -eq 0 ]; then
  COMPONENTS=(skills plugins hooks)
fi

sync_dir() {
  local src="$1" dest="$2" label="$3"
  if [ ! -d "$src" ]; then
    warn "Source not found: $src (skipping $label)"
    return
  fi
  mkdir -p "$dest"
  if $DRY_RUN; then
    info "[dry-run] rsync $src/ -> $dest/"
    rsync -av --delete --exclude='.git' --dry-run "$src/" "$dest/"
  else
    info "Deploying $label: $src/ -> $dest/"
    rsync -av --delete --exclude='.git' "$src/" "$dest/"
  fi
}

sync_item() {
  local src="$1" dest="$2" label="$3"
  if [ ! -d "$src" ]; then
    warn "Source not found: $src (skipping $label)"
    return
  fi
  mkdir -p "$dest"
  if $DRY_RUN; then
    info "[dry-run] rsync $src/ -> $dest/"
    rsync -av --delete --exclude='.git' --dry-run "$src/" "$dest/"
  else
    info "Deploying $label: $src/ -> $dest/"
    rsync -av --delete --exclude='.git' "$src/" "$dest/"
  fi
}

for component in "${COMPONENTS[@]}"; do
  case "$component" in
    skills)
      info "── Skills ──"
      # Direct skills: skills/*/
      for skill_dir in "$SRC/skills"/*/; do
        [ -d "$skill_dir" ] || continue
        name=$(basename "$skill_dir")
        sync_item "$skill_dir" "$DEST/skills/$name" "skill:$name"
      done
      # Skill packs: <pack>/skills/*/  (e.g. finance/skills/*)
      for pack_dir in "$SRC"/*/skills; do
        [ -d "$pack_dir" ] || continue
        pack=$(basename "$(dirname "$pack_dir")")
        # Skip the top-level skills/ dir (already handled above)
        [ "$pack" = "skills" ] && continue
        info "── Skill pack: $pack ──"
        for skill_dir in "$pack_dir"/*/; do
          [ -d "$skill_dir" ] || continue
          name=$(basename "$skill_dir")
          sync_item "$skill_dir" "$DEST/skills/$name" "skill-pack:$pack/$name"
        done
      done
      ;;
    plugins)
      info "── Plugins ──"
      for plugin in openclaw-odoo odoo-discuss openclaw-user-keys mcp-client; do
        [ -d "$SRC/$plugin" ] || continue
        sync_item "$SRC/$plugin" "$DEST/plugins/$plugin" "plugin:$plugin"
      done
      ;;
    hooks)
      info "── Hooks ──"
      sync_dir "$SRC/hooks" "$DEST/hooks" "hooks"
      ;;
  esac
done

if $RESTART && ! $DRY_RUN; then
  info "Restarting gateway..."
  openclaw gateway restart
fi

info "Done."
