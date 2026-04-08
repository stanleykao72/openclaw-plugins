#!/bin/bash
# Wrapper: always run git in /home/ubuntu/odoo_dev/user
# Usage: odoo-git.sh <git-args...>
#   odoo-git.sh --repo openclaw <git-args...>
#   odoo-git.sh --repo plugins <git-args...>

WORKDIR="/home/ubuntu/odoo_dev/user"

# Check for --repo flag
if [ "$1" = "--repo" ]; then
    case "$2" in
        openclaw)  WORKDIR="/home/ubuntu/openclaw" ;;
        plugins)   WORKDIR="/home/ubuntu/goclaw-plugins" ;;
        *)         WORKDIR="$2" ;;
    esac
    shift 2
fi

exec git -C "$WORKDIR" "$@"
