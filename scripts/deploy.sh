#!/usr/bin/env bash
# Build both PWAs and deploy them to one Firebase Hosting site.
# Usage: scripts/deploy.sh <firebase-project-id>
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${1:-}"
if [ -z "$PROJECT" ]; then
  echo "Usage: scripts/deploy.sh <firebase-project-id>"
  echo "Log in first with:  npx firebase login"
  exit 1
fi

echo "→ Building combined hosting bundle…"
npm run build:hosting

echo "→ Deploying to Firebase project '$PROJECT'…"
npx firebase deploy --only hosting --project "$PROJECT"
