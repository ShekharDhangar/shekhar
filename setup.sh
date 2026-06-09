#!/bin/bash
# Shekhar's second brain + site setup
# Run on a fresh machine: bash setup.sh
# Or curl it: curl -fsSL https://raw.githubusercontent.com/ShekharDhangar/shekhar/main/setup.sh | bash
#
# Before running:
#   1. Download Obsidian from https://obsidian.md
#   2. Open Obsidian → Settings → Community plugins → disable Safe mode
#   3. Browse → search "Templater" → Install → Enable
#   4. Quit Obsidian (Cmd+Q)
#   5. Run this script

set -euo pipefail

# Obsidian must be closed — it overwrites plugin config on exit
if pgrep -x "Obsidian" > /dev/null; then
  echo "Error: Please quit Obsidian (Cmd+Q) before running this script."
  exit 1
fi

SHEKHAR_REPO="https://github.com/ShekharDhangar/shekhar.git"
SITE_DIR=~/code/shekhar
BRAIN_DIR=~/brain

echo "==> Installing Homebrew (if needed)..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo "==> Installing Node.js (if needed)..."
if ! command -v node &>/dev/null; then
  brew install node
fi

echo "==> Cloning site repo..."
if [ ! -d "$SITE_DIR" ]; then
  mkdir -p ~/code
  git clone "$SHEKHAR_REPO" "$SITE_DIR"
fi

echo "==> Installing site dependencies..."
cd "$SITE_DIR" && npm install

echo "==> Setting up brain vault..."
mkdir -p "$BRAIN_DIR/blogs" "$BRAIN_DIR/learnings" "$BRAIN_DIR/templates"

echo "==> Copying publish script..."
cp "$SITE_DIR/publish.sh" "$BRAIN_DIR/publish.sh"
chmod +x "$BRAIN_DIR/publish.sh"

echo "==> Copying templates..."
cp "$SITE_DIR/templates/blog.md" "$BRAIN_DIR/templates/blog.md"
cp "$SITE_DIR/templates/learning.md" "$BRAIN_DIR/templates/learning.md"

echo "==> Configuring Obsidian + Templater..."
mkdir -p "$BRAIN_DIR/.obsidian/plugins/templater-obsidian"
cp "$SITE_DIR/obsidian-config/app.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/community-plugins.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/plugins/templater-obsidian/data.json" \
   "$BRAIN_DIR/.obsidian/plugins/templater-obsidian/"

echo ""
echo "Done!"
echo ""
echo "Next steps:"
echo "  1. Open Obsidian → open folder as vault → select $BRAIN_DIR"
echo "  2. Create a file in blogs/ or learnings/ — frontmatter auto-fills"
echo "  3. To publish: bash $BRAIN_DIR/publish.sh"
