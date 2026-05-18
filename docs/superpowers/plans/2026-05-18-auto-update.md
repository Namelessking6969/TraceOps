# Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add silent auto-update to TraceOps so the app checks for a new release on startup, downloads it in the background, and installs it — no user prompt, no UI changes.

**Architecture:** `tauri-plugin-updater` (Rust) registers on app start and spawns an async update check against a `latest.json` manifest hosted on a dedicated `updates` git branch. CI generates and force-pushes a fresh `latest.json` after each tagged release build completes. Signatures are verified against a public key baked into the binary.

**Tech Stack:** Tauri 2, `tauri-plugin-updater` (Rust crate), GitHub Actions, Node.js (manifest script), vitest (tests)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src-tauri/Cargo.toml` | Modify | Add `tauri-plugin-updater` dependency |
| `src-tauri/tauri.conf.json` | Modify | Add updater plugin config (pubkey + endpoint URL) |
| `src-tauri/capabilities/default.json` | Modify | Grant `updater:default` permission |
| `src-tauri/src/lib.rs` | Modify | Register updater plugin; spawn silent startup check |
| `scripts/generate-update-manifest.js` | Create | Build `latest.json` from built artifacts; exports `generateManifest` for testing |
| `src/__tests__/generate-update-manifest.test.ts` | Create | Unit tests for `generateManifest` |
| `.github/workflows/build.yml` | Modify | Inject signing key into build jobs; add `publish-manifest` job |

---

### Task 1: Generate signing keypair (one-time manual step)

Run these commands in the repo root. The keypair is generated once and never regenerated.

- [ ] **Step 1: Generate the keypair**

```bash
npm run tauri -- signer generate -w ~/.tauri/traceops.key
```

Output will print something like:
```
Public key: RWS...long-string...
Private key saved to /home/you/.tauri/traceops.key
```

- [ ] **Step 2: Copy the public key — you'll need it in Task 4**

```bash
cat ~/.tauri/traceops.key.pub
```

Save this value (one line, starts with `RWS`). It goes into `tauri.conf.json`.

- [ ] **Step 3: Copy the private key — you'll need it in Task 9**

```bash
cat ~/.tauri/traceops.key
```

Save this value temporarily and securely. It goes into GitHub Secrets. **Never commit it.**

---

### Task 2: Create the `updates` orphan branch (one-time manual step)

This branch holds only `latest.json`. It has no relationship to `master` history.

- [ ] **Step 1: Create the orphan branch with a placeholder manifest**

```bash
git checkout --orphan updates
git rm -rf .
echo '{"version":"0.0.0","notes":"","pub_date":"2026-01-01T00:00:00Z","platforms":{}}' > latest.json
git add latest.json
git commit -m "chore: init updates branch"
git push origin updates
git checkout master
```

After this, `https://raw.githubusercontent.com/Namelessking6969/TraceOps/updates/latest.json` is live. It may take ~30 seconds to propagate through GitHub's CDN.

---

### Task 3: Add `tauri-plugin-updater` Rust dependency

- [ ] **Step 1: Add to `src-tauri/Cargo.toml`**

The `[dependencies]` block should look like this after the change:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-updater = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 2: Fetch the crate to verify it resolves**

```bash
cd src-tauri && cargo fetch
```

Expected: downloads `tauri-plugin-updater` with no errors. `Finished` or similar output.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat: add tauri-plugin-updater dependency"
```

---

### Task 4: Configure updater in `tauri.conf.json`

- [ ] **Step 1: Add `"plugins"` section to `src-tauri/tauri.conf.json`**

Replace the entire file with:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "TraceOps",
  "version": "0.1.1",
  "identifier": "com.jake.traceops",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "TraceOps",
        "width": 1200,
        "height": 750
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  },
  "plugins": {
    "updater": {
      "pubkey": "PASTE_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://raw.githubusercontent.com/Namelessking6969/TraceOps/updates/latest.json"
      ]
    }
  }
}
```

Replace `PASTE_PUBLIC_KEY_HERE` with the `RWS...` string from Task 1 Step 2.

- [ ] **Step 2: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat: configure updater endpoint and public key"
```

---

### Task 5: Add updater capability permission

- [ ] **Step 1: Edit `src-tauri/capabilities/default.json`**

Add `"updater:default"` to the `permissions` array:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "default capability",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-copy-file",
    "fs:allow-read-file",
    "fs:allow-write-text-file",
    "fs:allow-stat",
    "fs:allow-mkdir",
    "updater:default"
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add src-tauri/capabilities/default.json
git commit -m "feat: add updater capability permission"
```

---

### Task 6: Register plugin and add startup update check in `lib.rs`

- [ ] **Step 1: Replace the entire contents of `src-tauri/src/lib.rs`**

```rust
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Ok(updater) = handle.updater() {
                    if let Ok(Some(update)) = updater.check().await {
                        let _ = update.download_and_install(|_, _| {}, || {}).await;
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

The updater plugin must be registered **before** other plugins. The `setup` closure spawns a background task — it returns immediately and does not block the app from opening.

- [ ] **Step 2: Verify compilation**

```bash
cd src-tauri && cargo check
```

Expected: `Finished` with no errors or warnings about unused imports.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: register updater plugin with silent startup check"
```

---

### Task 7: Write failing tests for the manifest generation script

- [ ] **Step 1: Create `src/__tests__/generate-update-manifest.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { generateManifest } from '../../scripts/generate-update-manifest.js';

describe('generateManifest', () => {
  it('includes the version', () => {
    const manifest = generateManifest('1.2.3', 'Fix bugs', {});
    expect(manifest.version).toBe('1.2.3');
  });

  it('includes release notes', () => {
    const manifest = generateManifest('1.2.3', 'Fix bugs', {});
    expect(manifest.notes).toBe('Fix bugs');
  });

  it('includes a pub_date ISO string', () => {
    const manifest = generateManifest('1.2.3', 'Fix bugs', {});
    expect(manifest.pub_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('maps platform entries from provided artifacts', () => {
    const artifacts = {
      'darwin-aarch64': {
        url: 'https://example.com/TraceOps_1.2.3_aarch64.app.tar.gz',
        signature: 'sig-content-here',
      },
      'windows-x86_64': {
        url: 'https://example.com/TraceOps_1.2.3_x64-setup.exe',
        signature: 'win-sig-here',
      },
    };
    const manifest = generateManifest('1.2.3', 'Fix bugs', artifacts);
    expect(manifest.platforms['darwin-aarch64'].url).toBe(
      'https://example.com/TraceOps_1.2.3_aarch64.app.tar.gz'
    );
    expect(manifest.platforms['darwin-aarch64'].signature).toBe('sig-content-here');
    expect(manifest.platforms['windows-x86_64'].signature).toBe('win-sig-here');
  });

  it('produces an empty platforms object when no artifacts provided', () => {
    const manifest = generateManifest('1.2.3', '', {});
    expect(manifest.platforms).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../../scripts/generate-update-manifest.js'`

---

### Task 8: Write the manifest generation script

- [ ] **Step 1: Create `scripts/generate-update-manifest.js`**

```javascript
import fs from 'fs';
import path from 'path';

/**
 * @param {string} version
 * @param {string} notes
 * @param {Record<string, {url: string, signature: string}>} artifacts
 */
export function generateManifest(version, notes, artifacts) {
  return {
    version,
    notes,
    pub_date: new Date().toISOString(),
    platforms: artifacts,
  };
}

function findFile(dir, suffix) {
  if (!fs.existsSync(dir)) return null;
  const results = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(suffix)) results.push(full);
    }
  }
  walk(dir);
  return results[0] ?? null;
}

// Only runs when called directly as CLI (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const version = (process.env.RELEASE_VERSION ?? '').replace(/^v/, '');
  const artifactsDir = process.env.ARTIFACTS_DIR ?? 'artifacts';
  const repoUrl = 'https://github.com/Namelessking6969/TraceOps';

  if (!version) {
    console.error('RELEASE_VERSION env var is required (e.g. v0.1.2)');
    process.exit(1);
  }

  const platformDefs = [
    { dir: 'macos-build',   ext: '.app.tar.gz', key: 'darwin-aarch64' },
    { dir: 'windows-build', ext: '-setup.exe',  key: 'windows-x86_64' },
    { dir: 'linux-build',   ext: '.AppImage',   key: 'linux-x86_64'   },
  ];

  const artifacts = {};
  for (const { dir, ext, key } of platformDefs) {
    const installerPath = findFile(path.join(artifactsDir, dir), ext);
    if (!installerPath) {
      console.warn(`No ${ext} found in ${dir} — skipping ${key}`);
      continue;
    }
    const sigPath = installerPath + '.sig';
    if (!fs.existsSync(sigPath)) {
      console.warn(`No .sig for ${path.basename(installerPath)} — skipping ${key}`);
      continue;
    }
    artifacts[key] = {
      url: `${repoUrl}/releases/download/v${version}/${path.basename(installerPath)}`,
      signature: fs.readFileSync(sigPath, 'utf-8').trim(),
    };
  }

  const notes = fs.existsSync('.release-notes')
    ? fs.readFileSync('.release-notes', 'utf-8').trim()
    : `TraceOps v${version}`;

  const manifest = generateManifest(version, notes, artifacts);
  fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2) + '\n');
  console.log('Generated latest.json\n' + JSON.stringify(manifest, null, 2));
}
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
npm test
```

Expected: all 5 tests in `generate-update-manifest.test.ts` PASS. Other existing tests should also still pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-update-manifest.js src/__tests__/generate-update-manifest.test.ts
git commit -m "feat: manifest generation script with tests"
```

---

### Task 9: Update CI — inject signing key and upload `.sig` files

Open `.github/workflows/build.yml` and make these three changes to the existing platform jobs.

- [ ] **Step 1: Update `build-macos` job**

Add `env` block and extend the artifact upload path:

```yaml
  build-macos:
    runs-on: macos-latest
    env:
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'
      - run: npm ci
      - run: npm run tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: macos-build
          path: |
            src-tauri/target/release/bundle/dmg/*.dmg
            src-tauri/target/release/bundle/macos/*.app.tar.gz
            src-tauri/target/release/bundle/macos/*.app.tar.gz.sig
          retention-days: 5
```

- [ ] **Step 2: Update `build-windows` job**

```yaml
  build-windows:
    runs-on: windows-latest
    env:
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'
      - run: npm ci
      - run: npm run tauri build
      - uses: actions/upload-artifact@v4
        with:
          name: windows-build
          path: |
            src-tauri/target/release/bundle/nsis/*.exe
            src-tauri/target/release/bundle/nsis/*.exe.sig
            src-tauri/target/release/bundle/msi/*.msi
          retention-days: 5
```

- [ ] **Step 3: Update `build-linux` job**

```yaml
  build-linux:
    runs-on: ubuntu-22.04
    env:
      TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - uses: dtolnay/rust-toolchain@stable
      - uses: swatinem/rust-cache@v2
        with:
          workspaces: './src-tauri -> target'
      - name: Install system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            libsqlite3-dev \
            patchelf \
            file
      - name: Install linuxdeploy
        run: |
          wget -nv -O /usr/local/bin/linuxdeploy \
            https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
          chmod +x /usr/local/bin/linuxdeploy
      - run: npm ci
      - run: npm run tauri build
        env:
          APPIMAGE_EXTRACT_AND_RUN: 1
      - uses: actions/upload-artifact@v4
        with:
          name: linux-build
          path: |
            src-tauri/target/release/bundle/deb/*.deb
            src-tauri/target/release/bundle/appimage/*.AppImage
            src-tauri/target/release/bundle/appimage/*.AppImage.sig
            src-tauri/target/release/bundle/rpm/*.rpm
          retention-days: 5
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: inject signing key and upload .sig files with artifacts"
```

---

### Task 10: Update CI — add `publish-manifest` job

- [ ] **Step 1: Append the `publish-manifest` job to `.github/workflows/build.yml`**

Add this after the closing of the `release` job:

```yaml
  publish-manifest:
    needs: [release]
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - uses: actions/download-artifact@v4
        with:
          path: artifacts

      - name: Generate latest.json
        run: node scripts/generate-update-manifest.js
        env:
          RELEASE_VERSION: ${{ github.ref_name }}

      - name: Push manifest to updates branch
        run: |
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git config user.name "github-actions[bot]"
          git checkout --orphan updates-temp
          git rm -rf . --quiet
          git add latest.json
          git commit -m "chore: update manifest to ${{ github.ref_name }}"
          git push origin HEAD:updates --force
```

How the push works:
- `git checkout --orphan updates-temp` creates a new branch with the current tree staged but no parent commit
- `git rm -rf .` removes all source files from the index (leaving `latest.json` untracked on disk)
- `git add latest.json` stages only the manifest
- Force push replaces the `updates` branch with this single-commit tree

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/build.yml
git commit -m "ci: add publish-manifest job to update latest.json on release"
```

---

### Task 11: Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Secrets (manual step)

- [ ] **Step 1: Open your repo's secret settings**

Go to: `https://github.com/Namelessking6969/TraceOps/settings/secrets/actions`

- [ ] **Step 2: Add the secret**

Click **New repository secret**:
- Name: `TAURI_SIGNING_PRIVATE_KEY`
- Value: paste the full contents of `~/.tauri/traceops.key` from Task 1 Step 3

Click **Add secret**.

---

### Task 12: Push changes and verify with a release

- [ ] **Step 1: Push master to trigger a branch build (smoke test)**

```bash
git push origin master
```

The branch build (not a tag, so no release or manifest push) should succeed. Verify in GitHub Actions that all three platform builds complete without errors about the signing key.

- [ ] **Step 2: Cut a new release to test the full pipeline**

```bash
./scripts/bump-version.sh patch
```

Enter a bullet point like `Add auto-update support` when prompted. This commits, tags, and pushes.

- [ ] **Step 3: Monitor GitHub Actions**

In the repo's Actions tab, watch for:
1. `build-macos`, `build-windows`, `build-linux` — all should produce `.sig` files alongside installers
2. `release` — creates the GitHub Release with all artifacts uploaded
3. `publish-manifest` — runs after `release` and pushes `latest.json` to the `updates` branch

- [ ] **Step 4: Verify the manifest**

```bash
curl -s https://raw.githubusercontent.com/Namelessking6969/TraceOps/updates/latest.json | python3 -m json.tool
```

Expected: valid JSON with `version`, `notes`, `pub_date`, and at least one entry under `platforms`.

- [ ] **Step 5: Verify the app checks for updates**

Install the previous version of the app (before the bump). Launch it. The updater will fire on startup. Check `stdout` (macOS/Linux) or the Windows Event Log for any errors. If no errors and the app relaunches or shows the new version next open — the updater is working.
