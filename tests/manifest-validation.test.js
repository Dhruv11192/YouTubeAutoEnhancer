import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Manifest V3 Configuration', () => {
  it('has valid manifest_version 3, youtube host permissions, and web accessible resources', () => {
    const manifestPath = path.resolve('YouTubeAutoEnhancer/Extension/Resources/manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.equal(manifest.manifest_version, 3);
    assert.ok(manifest.host_permissions.some(p => p.includes('youtube.com')));
    assert.ok(manifest.content_scripts.length > 0);

    // Check all content scripts for required files
    const allCss = manifest.content_scripts.flatMap(cs => cs.css || []);
    const allJs = manifest.content_scripts.flatMap(cs => cs.js || []);

    assert.ok(allCss.includes('subtitles.css'));
    assert.ok(allJs.includes('inject.js'));
    assert.ok(allJs.includes('content.js'));
    assert.ok(manifest.web_accessible_resources[0].resources.includes('inject.js'));
  });

  it('has required extension icon assets in images folder', () => {
    const iconSizes = [16, 32, 48, 128, 512];
    for (const size of iconSizes) {
      const iconPath = path.resolve(`YouTubeAutoEnhancer/Extension/Resources/images/icon-${size}.png`);
      assert.ok(fs.existsSync(iconPath), `Icon icon-${size}.png must exist`);
    }
  });
});
