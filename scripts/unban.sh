#!/bin/bash
# ==========================================
# Grow Flow AI - Account Guardian Unban CLI
# ==========================================

if [ -z "$1" ]; then
  echo "❌ Error: Pass a User ID to unban."
  echo "Usage: ./unban.sh <user_id>"
  exit 1
fi

echo "🛡️ Connecting to Guardian DB to pardon user: $1..."
# Uses tsx to run the TypeScript script directly bypassing module errors
npx tsx backend/scripts/cli-unban.ts "$1"
