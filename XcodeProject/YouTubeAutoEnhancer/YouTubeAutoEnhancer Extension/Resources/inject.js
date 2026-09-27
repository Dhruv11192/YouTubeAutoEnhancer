(function () {
  'use strict';

  const QUALITY_PRIORITY = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
  const TARGET_SPEED = 1.5;

  function selectBestQuality(availableLevels) {
    if (!Array.isArray(availableLevels) || availableLevels.length === 0) return 'hd2160';
    for (const quality of QUALITY_PRIORITY) {
      if (availableLevels.includes(quality)) return quality;
    }
    return availableLevels[0];
  }

  function applyEnhancements() {
    const player = document.getElementById('movie_player');
    const video = document.querySelector('video');

    if (!player) return;

    // 1. Force 1.5x Speed
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(TARGET_SPEED);
      }
      if (video && video.playbackRate !== TARGET_SPEED) {
        video.playbackRate = TARGET_SPEED;
      }
    } catch (e) {}

    // 2. Force 4K / Highest Available Quality
    try {
      if (typeof player.getAvailableQualityLevels === 'function') {
        const levels = player.getAvailableQualityLevels();
        const best = selectBestQuality(levels);
        if (typeof player.setPlaybackQualityRange === 'function') {
          player.setPlaybackQualityRange(best, best);
        }
        if (typeof player.setPlaybackQuality === 'function') {
          player.setPlaybackQuality(best);
        }
      }
    } catch (e) {}

    // 3. Force Subtitles On
    try {
      if (typeof player.loadModule === 'function') {
        player.loadModule('captions');
      }
      if (typeof player.toggleSubtitlesOn === 'function') {
        player.toggleSubtitlesOn();
      }
    } catch (e) {}
  }

  // Hook navigation & player state events
  function init() {
    window.addEventListener('yt-navigate-finish', () => {
      // Retry in staggered intervals to catch player readiness on SPA transitions
      setTimeout(applyEnhancements, 100);
      setTimeout(applyEnhancements, 400);
      setTimeout(applyEnhancements, 1000);
      setTimeout(applyEnhancements, 2000);
    });

    // Observer for video element speed and quality enforcement
    const observer = new MutationObserver(() => {
      applyEnhancements();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Initial trigger
    applyEnhancements();
    setTimeout(applyEnhancements, 300);
    setTimeout(applyEnhancements, 1000);
    setTimeout(applyEnhancements, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
