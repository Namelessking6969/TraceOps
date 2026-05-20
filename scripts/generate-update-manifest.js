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
