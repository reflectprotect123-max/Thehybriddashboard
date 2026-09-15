#!/usr/bin/env bash
# Point git at scripts/git-credential-github-env.sh for github.com HTTPS.
# Does not store a token. GH_SIBLING_PUSH_TOKEN must already be in the environment.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/scripts/git-credential-github-env.sh"
chmod +x "$HELPER"

git config --global --replace-all credential.https://github.com.helper "$HELPER"

if [[ -n "${GH_SIBLING_PUSH_TOKEN:-}" ]]; then
  echo "GitHub HTTPS helper installed. GH_SIBLING_PUSH_TOKEN is set in this environment."
else
  echo "GitHub HTTPS helper installed. Add GH_SIBLING_PUSH_TOKEN in Cursor Secrets, then start a new agent."
fi
