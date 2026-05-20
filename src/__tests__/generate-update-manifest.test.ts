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
