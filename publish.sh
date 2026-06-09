#!/bin/bash
# Copies notes marked `publish: true` from ~/brain to the shekhar site repo,
# commits them with an auto-generated message, and pushes. Cloudflare Pages
# deploys `main` on push — live in ~30 seconds.
#
# Drafts live privately in ~/brain and never reach the repo until publish: true.
# Refuses to run unless the site repo is clean, so publishing only ever touches
# content and never entangles with other work in progress.
# Run: bash ~/brain/publish.sh
set -euo pipefail

VAULT=~/brain
SITE=~/code/shekhar
CONTENT="$SITE/src/content"

cd "$SITE"

# Guard: refuse to run on a dirty repo. This keeps any in-progress edits
# (setup.sh, Obsidian config, etc.) from getting swept into a publish commit.
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: ~/code/shekhar has uncommitted changes — clean it up first."
  echo "Commit or stash the changes below, then run publish again:"
  echo ""
  git status --short
  exit 1
fi

# Copy publish:true notes into the repo's content folders.
published=()
for dir in blogs learnings; do
  mkdir -p "$CONTENT/$dir"
  # Process substitution (not a pipe) so the array survives the loop.
  while IFS= read -r -d '' file; do
    if grep -q "^publish: true" "$file"; then
      cp "$file" "$CONTENT/$dir/$(basename "$file")"
      published+=("$(basename "${file%.md}")")
    fi
  done < <(find "$VAULT/$dir" -name "*.md" -print0)
done

# Stage ONLY published content — never touches setup.sh, config, or other files.
git add src/content/

# Nothing staged means nothing changed — don't create an empty commit.
if git diff --cached --quiet; then
  echo "no content changes to publish"
  exit 0
fi

if [ ${#published[@]} -gt 0 ]; then
  printf -v slugs '%s, ' "${published[@]}"
  msg="publish: ${slugs%, }"
else
  msg="publish: update content"
fi

# Preview exactly what will be committed, then ask before committing/pushing.
echo ""
echo "About to commit (message: \"$msg\"):"
git diff --cached --name-status
echo ""
read -r -p "Commit and push these? [y/N] " reply
case "$reply" in
  [yY] | [yY][eE][sS]) ;;
  *)
    git reset --quiet -- src/content/   # unstage only what we staged
    echo "aborted — nothing committed or pushed"
    exit 0
    ;;
esac

git commit -m "$msg"
git push
echo "published: ${msg#publish: }"
