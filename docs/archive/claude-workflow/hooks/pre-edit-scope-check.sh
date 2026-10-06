#!/usr/bin/env bash
#
# pre-edit-scope-check.sh
# Optional hook: warns when an edit happens outside expected paths.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

case "$file_path" in
  */app/*|*/src/*|*/tests/*|*/docs/specs/*|*/CLAUDE.md|*/docs/SCOPE.md|*/docs/COMPONENTS.md|*/docs/DESIGN_SYSTEM.md|*tailwind.config.js|*babel.config.js|*metro.config.js|*package.json|*tsconfig.json|*app.json|*eas.json)
    exit 0
    ;;
  */.claude/*)
    echo "ℹ️  Editing agent configuration. Confirm intentional." >&2
    exit 0
    ;;
  *)
    echo "⚠️  Edit on $file_path is outside expected paths (app/, src/, tests/, docs/specs/, config files)." >&2
    echo "    If intentional, proceed. Else, stop and review the spec." >&2
    exit 0
    ;;
esac
