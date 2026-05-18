# Auto-Update Design — TraceOps

**Date:** 2026-05-18  
**Status:** Approved  

## Overview

Add silent auto-update to TraceOps using `tauri-plugin-updater`. On launch the app checks for a new version, downloads it in the background if one exists, and installs it on next restart. No user prompt, no UI changes.

Testers are on the same update channel as regular users.

---

## Architecture

Three moving parts:

1. **App** — on startup, registers the updater plugin and spawns an async task that calls `check_for_updates()`. If a newer version is available and its signature is valid, the update downloads silently and installs on next launch.

2. **Manifest** — `latest.json` hosted on the `updates` orphan branch at:
   ```
   https://raw.githubusercontent.com/Namelessking6969/TraceOps/updates/latest.json
   ```
   Contains: version, release notes, per-platform download URL, and the `.sig` file contents inlined as a string.

3. **CI pipeline** — a new `publish-manifest` job runs after the existing `release` job on tag pushes. It builds `latest.json` from the uploaded release artifacts and force-pushes it to the `updates` branch.

---

## Signing & Key Management

- **Generate once** locally: `npm run tauri signer generate`
  - Outputs a private key and a public key
- **Public key** — committed into `tauri.conf.json` under `plugins.updater.pubkey`. Safe to commit.
- **Private key** — stored as GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`. Never committed.
- Each platform build job injects the secret as an env var; Tauri signs the bundles and produces `.sig` files alongside installers.
- The app verifies the `.sig` against the baked-in public key before installing. A missing or invalid sig causes the update to be silently rejected.

---

## CI Changes (`build.yml`)

### Existing build jobs (macOS, Windows, Linux)

Add to each job's `env`:
```yaml
env:
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
```

This causes `tauri build` to automatically produce `.sig` files for each installer artifact.

### New `publish-manifest` job

Runs after `release`, only on tag pushes:

```
needs: [release]
if: startsWith(github.ref, 'refs/tags/')
```

Steps:
1. Checkout repo
2. Download all artifacts (installers + `.sig` files)
3. Run a script that:
   - Reads version from the tag name
   - Finds installer + sig file paths for each platform
   - Constructs `latest.json` with GitHub Release asset download URLs
   - Writes the file
4. Force-push `latest.json` to the `updates` orphan branch

### `latest.json` format

```json
{
  "version": "0.1.2",
  "notes": "Release notes here",
  "pub_date": "2026-05-18T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "url": "https://github.com/Namelessking6969/TraceOps/releases/download/v0.1.2/TraceOps_0.1.2_x64.app.tar.gz",
      "signature": "<contents of .sig file>"
    },
    "darwin-aarch64": {
      "url": "...",
      "signature": "..."
    },
    "linux-x86_64": {
      "url": "https://github.com/Namelessking6969/TraceOps/releases/download/v0.1.2/trace-ops_0.1.2_amd64.AppImage",
      "signature": "..."
    },
    "windows-x86_64": {
      "url": "https://github.com/Namelessking6969/TraceOps/releases/download/v0.1.2/TraceOps_0.1.2_x64-setup.exe",
      "signature": "..."
    }
  }
}
```

---

## App-Side Changes

### `src-tauri/Cargo.toml`

Add dependency:
```toml
tauri-plugin-updater = "2"
```

### `src-tauri/tauri.conf.json`

Add updater config under `plugins`:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "<generated public key>",
      "endpoints": [
        "https://raw.githubusercontent.com/Namelessking6969/TraceOps/updates/latest.json"
      ]
    }
  }
}
```

### `src-tauri/capabilities/default.json`

Add permission:
```json
"updater:default"
```

### `src-tauri/src/lib.rs`

Register plugin and add startup update check:
```rust
tauri_plugin_updater::Builder::new().build()
```

Spawn an async task on app ready that calls the updater, downloads if available, and installs on next restart. No user interaction required.

---

## Out of Scope

- Beta / pre-release update channel
- In-app update UI (progress bar, changelog display)
- Rollback mechanism
- Update check on interval (startup-only is sufficient)
