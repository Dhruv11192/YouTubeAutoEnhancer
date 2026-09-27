import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { selectBestQuality, applyEnhancementsToMockPlayer } from '../YouTubeAutoEnhancer/Extension/Resources/inject-core.js';

describe('YouTube Player Automation Core', () => {
  it('selects 4K when available', () => {
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
