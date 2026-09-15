#!/usr/bin/env bash
# Git credential helper: use GH_SIBLING_PUSH_TOKEN from the environment.
# Set that variable in Cursor Secrets or GitHub Actions — never commit it or paste it in chat.
set -euo pipefail

if [[ "${1:-}" != "get" ]]; then
  exit 0
fi

token="${GH_SIBLING_PUSH_TOKEN:-}"
if [[ -z "$token" ]]; then
  exit 0
fi

protocol=""
host=""
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" ]] && break
  case "$line" in
    protocol=*) protocol="${line#protocol=}" ;;
    host=*) host="${line#host=}" ;;
  esac
done

if [[ "$protocol" != "https" || "$host" != "github.com" ]]; then
  exit 0
fi

printf 'username=x-access-token\npassword=%s\n' "$token"
