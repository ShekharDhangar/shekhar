#!/bin/bash
# Shekhar's second brain + site setup
# Run on a fresh machine: bash setup.sh
# Or curl it: curl -fsSL https://raw.githubusercontent.com/ShekharDhangar/shekhar/main/setup.sh | bash
#
# Before running:
#   1. Download and install Obsidian from https://obsidian.md
#   2. Quit Obsidian (Cmd+Q) if it's running
#   3. Run this script  (sets up folders + Templater's folder-template config;
#      you install + enable Templater itself in Obsidian afterward)

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

echo "==> Configuring Obsidian + Templater folder templates..."
PLUGIN_DIR="$BRAIN_DIR/.obsidian/plugins/templater-obsidian"
mkdir -p "$PLUGIN_DIR"
cp "$SITE_DIR/obsidian-config/app.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/community-plugins.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/plugins/templater-obsidian/data.json" "$PLUGIN_DIR/"
# Templater itself is installed by hand from Obsidian's community-plugins
# browser (Obsidian gates that behind a manual enable anyway). This pre-seeds
# its folder-template config so it works the moment you enable it.

echo ""
echo "Done!"
echo ""
echo "Next steps:"
echo "  1. Open Obsidian → open folder as vault → select $BRAIN_DIR"
echo "  2. First time only: Settings → Community plugins → turn off Restricted Mode → Browse → install Templater → enable it"
echo "  3. Create a file in blogs/ or learnings/ — frontmatter auto-fills"
echo "  4. To publish: bash $BRAIN_DIR/publish.sh"
