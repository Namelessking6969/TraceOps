#!/bin/bash
set -e

BUMP_TYPE="${1:-patch}"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f package.json ]; then
  echo "Error: package.json not found in $ROOT_DIR"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")

NEW_VERSION=$(node -e "
const [maj, min, pat] = '$CURRENT_VERSION'.split('.').map(Number);
switch ('$BUMP_TYPE') {
  case 'major': console.log([maj+1, 0, 0].join('.')); break;
  case 'minor': console.log([maj, min+1, 0].join('.')); break;
  case 'patch': console.log([maj, min, pat+1].join('.')); break;
  default: console.error('Usage: \$0 [major|minor|patch]'); process.exit(1);
}
")

echo "Bumping $CURRENT_VERSION -> $NEW_VERSION"
echo ""
echo "Enter 'What's New' bullet points (one per line, blank line when done):"
BULLETS=()
while true; do
  printf "  • "
  read -r BULLET
  [ -z "$BULLET" ] && break
  BULLETS+=("$BULLET")
done

if [ ${#BULLETS[@]} -eq 0 ]; then
  COMMIT_MSG="v$NEW_VERSION"
  RELEASE_NOTES=""
else
  COMMIT_MSG="v$NEW_VERSION — ${BULLETS[0]}"
  RELEASE_NOTES=""
  for b in "${BULLETS[@]}"; do
    RELEASE_NOTES+="- $b"$'\n'
  done
fi

cat > .release-notes <<EOF
## What's New

${RELEASE_NOTES}
EOF

node -e "
const fs = require('fs');
const newVersion = '$NEW_VERSION';

// Update package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('  updated package.json');

// Update src-tauri/tauri.conf.json
const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
tauriConf.version = newVersion;
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2) + '\n');
console.log('  updated src-tauri/tauri.conf.json');

// Update src-tauri/Cargo.toml
let cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
cargo = cargo.replace(/^version = \"[^\"]+\"/m, 'version = \"' + newVersion + '\"');
fs.writeFileSync('src-tauri/Cargo.toml', cargo);
console.log('  updated src-tauri/Cargo.toml');
"

git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml .release-notes
git commit -m "$COMMIT_MSG"
git tag "v$NEW_VERSION"

echo ""
echo "Pushing to origin..."
git push origin master
git push origin "v$NEW_VERSION"
echo ""
echo "Released v$NEW_VERSION"
