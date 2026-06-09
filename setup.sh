#!/bin/bash
# Shekhar's second brain + site setup
# Run on a fresh machine: bash setup.sh
# Or curl it: curl -fsSL https://raw.githubusercontent.com/ShekharDhangar/shekhar/main/setup.sh | bash

set -e

SHEKHAR_REPO="git@github.com:ShekharDhangar/shekhar.git"
SITE_DIR=~/code/shekhar
BRAIN_DIR=~/brain

echo "==> Installing Homebrew (if needed)..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

echo "==> Installing Obsidian (if needed)..."
if ! brew list --cask obsidian &>/dev/null 2>&1; then
  brew install --cask obsidian
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

echo "==> Configuring Obsidian..."
mkdir -p "$BRAIN_DIR/.obsidian/plugins/templater-obsidian"
cp "$SITE_DIR/obsidian-config/app.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/community-plugins.json" "$BRAIN_DIR/.obsidian/"
cp "$SITE_DIR/obsidian-config/plugins/templater-obsidian/data.json" \
   "$BRAIN_DIR/.obsidian/plugins/templater-obsidian/"

echo "==> Downloading Templater plugin (if needed)..."
PLUGIN_DIR="$BRAIN_DIR/.obsidian/plugins/templater-obsidian"
if [ ! -f "$PLUGIN_DIR/main.js" ]; then
  curl -fsSL "https://github.com/SilentVoid13/Templater/releases/latest/download/main.js" \
    -o "$PLUGIN_DIR/main.js"
  curl -fsSL "https://github.com/SilentVoid13/Templater/releases/latest/download/manifest.json" \
    -o "$PLUGIN_DIR/manifest.json"
else
  echo "    Templater already installed, skipping."
fi

echo ""
echo "Done! Next steps:"
echo "  1. Open Obsidian"
echo "  2. Open folder as vault → select $BRAIN_DIR"
echo "  3. Create a file in blogs/ or learnings/ — frontmatter auto-fills"
echo "  4. To publish: bash $BRAIN_DIR/publish.sh"
