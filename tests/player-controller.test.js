import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectBestQuality,
  parseQualityFromLabel,
  findBestQualityMenuItem,
  applyEnhancementsToMockPlayer
} from '../YouTubeAutoEnhancer/Extension/Resources/inject-core.js';

describe('YouTube Player Automation Core', () => {
  it('selects 4K when available in quality levels list', () => {
    const levels = ['tiny', 'small', 'medium', 'hd720', 'hd1080', 'hd1440', 'hd2160'];
    const selected = selectBestQuality(levels);
    assert.equal(selected, 'hd2160');
  });

  it('selects highest available when 4K is not available (e.g. 1080p max)', () => {
    const levels = ['tiny', 'small', 'medium', 'hd720', 'hd1080'];
    const selected = selectBestQuality(levels);
    assert.equal(selected, 'hd1080');
  });

  it('selects 720p when only 720p and lower are available', () => {
    const levels = ['tiny', 'small', 'medium', 'hd720'];
    const selected = selectBestQuality(levels);
    assert.equal(selected, 'hd720');
  });

  it('parses numeric quality height from menu labels correctly', () => {
    assert.equal(parseQualityFromLabel('2160p 4K'), 2160);
    assert.equal(parseQualityFromLabel('2160p60 HDR'), 2160);
    assert.equal(parseQualityFromLabel('1440p60 HD'), 1440);
    assert.equal(parseQualityFromLabel('1080p Premium'), 1080);
    assert.equal(parseQualityFromLabel('1080p'), 1080);
    assert.equal(parseQualityFromLabel('720p60'), 720);
    assert.equal(parseQualityFromLabel('480p'), 480);
    assert.equal(parseQualityFromLabel('Auto (1080p)'), 0); // Ignore Auto
  });

  it('picks highest resolution item from simulated settings menu list', () => {
    const menuItems = [
      { text: '2160p60 4K', element: { id: 'item-2160' } },
      { text: '1440p60', element: { id: 'item-1440' } },
      { text: '1080p60 HD', element: { id: 'item-1080' } },
      { text: '720p', element: { id: 'item-720' } },
      { text: '480p', element: { id: 'item-480' } },
      { text: 'Auto (1080p)', element: { id: 'item-auto' } }
    ];

    const best = findBestQualityMenuItem(menuItems);
    assert.equal(best.element.id, 'item-2160');
  });

  it('sets playback speed to 1.5x on player and video element', () => {
    let playerRate = 1.0;
    let qualityRange = null;
    let quality = null;
    let moduleLoaded = null;
    let subtitlesToggled = false;

    const mockPlayer = {
      setPlaybackRate: (rate) => { playerRate = rate; },
      getAvailableQualityLevels: () => ['hd1080', 'hd2160'],
      setPlaybackQualityRange: (min, max) => { qualityRange = [min, max]; },
      setPlaybackQuality: (q) => { quality = q; },
      loadModule: (mod) => { moduleLoaded = mod; },
      toggleSubtitlesOn: () => { subtitlesToggled = true; }
    };
    const mockVideo = { playbackRate: 1.0 };

    applyEnhancementsToMockPlayer(mockPlayer, mockVideo, 1.5);
    assert.equal(playerRate, 1.5);
    assert.equal(mockVideo.playbackRate, 1.5);
    assert.deepEqual(qualityRange, ['hd2160', 'hd2160']);
    assert.equal(quality, 'hd2160');
    assert.equal(moduleLoaded, 'captions');
    assert.equal(subtitlesToggled, true);
  });
});
