#!/bin/bash
# Copies notes tagged with "publish: true" from ~/brain to the shekhar site repo
# Run: bash ~/brain/publish.sh
set -euo pipefail

VAULT=~/brain
SITE=~/code/shekhar/src/content

for dir in blogs learnings; do
  mkdir -p "$SITE/$dir"
  # -print0 / read -d '' keeps filenames with spaces or newlines intact.
  find "$VAULT/$dir" -name "*.md" -print0 | while IFS= read -r -d '' file; do
    if grep -q "^publish: true" "$file"; then
      cp "$file" "$SITE/$dir/$(basename "$file")"
      echo "published: $file"
    fi
  done
done

cd ~/code/shekhar
git add src/content/

# Nothing staged means nothing changed — don't create an empty commit or push.
if git diff --cached --quiet; then
  echo "no content changes to publish"
  exit 0
fi

git commit -m "publish: update content"
git push
