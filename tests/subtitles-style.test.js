import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Subtitle CSS & Content Bridge', () => {
  it('contains background transparency and text-shadow rules for caption segments', () => {
    const cssPath = path.resolve('YouTubeAutoEnhancer/Extension/Resources/subtitles.css');
    assert.ok(fs.existsSync(cssPath), 'subtitles.css must exist');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /\.ytp-caption-segment/);
    assert.match(css, /background(-color)?:\s*transparent\s*!important/);
    assert.match(css, /text-shadow:/);
  });

  it('content.js injects inject.js into DOM', () => {
    const contentJsPath = path.resolve('YouTubeAutoEnhancer/Extension/Resources/content.js');
    assert.ok(fs.existsSync(contentJsPath), 'content.js must exist');
    const contentJs = fs.readFileSync(contentJsPath, 'utf8');

    assert.match(contentJs, /inject\.js/);
    assert.match(contentJs, /appendChild/);
  });
});
