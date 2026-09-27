(function () {
  'use strict';

  const TARGET_SPEED = 1.5;
  const QUALITY_PRIORITY = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];

  // -------------------------------------------------------------
  // 1. SPEED AUTOMATION (1.5x)
  // -------------------------------------------------------------
  try {
    localStorage.setItem('yt-player-playback-rate', JSON.stringify({
      data: String(TARGET_SPEED),
      creation: Date.now()
    }));
  } catch (e) {}

  // Override HTMLMediaElement play prototype
  try {
    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      try {
        if (this.playbackRate !== TARGET_SPEED) {
          this.playbackRate = TARGET_SPEED;
        }
      } catch (err) {}
      return origPlay.apply(this, arguments);
    };
  } catch (e) {}

  function hookVideoSpeed(video) {
    if (!video || video._ytSpeedHooked) return;
    video._ytSpeedHooked = true;

    const enforce = () => {
      try {
        if (video.playbackRate !== TARGET_SPEED) {
          video.playbackRate = TARGET_SPEED;
        }
      } catch (err) {}
    };

    ['ratechange', 'play', 'playing', 'loadedmetadata', 'canplay', 'timeupdate'].forEach(evt => {
      video.addEventListener(evt, enforce, { passive: true });
    });
    enforce();
  }

  // -------------------------------------------------------------
  // 2. QUALITY SELECTION HELPERS
  // -------------------------------------------------------------
  function selectBestQuality(availableLevels) {
    if (!Array.isArray(availableLevels) || availableLevels.length === 0) return 'hd2160';
    for (const quality of QUALITY_PRIORITY) {
      if (availableLevels.includes(quality)) return quality;
    }
    return availableLevels[0];
  }

  function parseQualityFromLabel(text) {
    if (!text || typeof text !== 'string') return 0;
    if (/auto/i.test(text)) return 0;
    const match = text.match(/(\d{3,4})p/i);
    if (match) return parseInt(match[1], 10);
    if (/4k/i.test(text)) return 2160;
    if (/8k/i.test(text)) return 4320;
    return 0;
  }

  // -------------------------------------------------------------
  // 3. SIMULATED SETTINGS MENU SELECTION (UI FALLBACK)
  // -------------------------------------------------------------
  let isMenuSelecting = false;
  function triggerQualityMenuSelection() {
    if (isMenuSelecting) return;
    const player = document.getElementById('movie_player');
    const settingsBtn = document.querySelector('.ytp-settings-button');
    if (!player || !settingsBtn) return;

    isMenuSelecting = true;

    try {
      // 1. Open settings menu
      settingsBtn.click();

      setTimeout(() => {
        // 2. Find Quality menu item in panel
        const menuItems = Array.from(document.querySelectorAll('.ytp-panel-menu .ytp-menuitem'));
        let qualityItem = null;
        for (const item of menuItems) {
          const label = item.textContent || '';
          if (/Quality|Calidad|Qualité|Qualität|Qualità|Qualidade|Качество/i.test(label) || /\d{3,4}p/i.test(label)) {
            qualityItem = item;
            break;
          }
        }

        if (qualityItem) {
          qualityItem.click();

          setTimeout(() => {
            // 3. Find highest resolution option in submenu
            const subItems = Array.from(document.querySelectorAll('.ytp-panel-menu .ytp-menuitem'));
            let bestSubItem = null;
            let maxRes = -1;

            for (const subItem of subItems) {
              const text = subItem.textContent || '';
              // Click "Advanced" or "Quality for current video" if YouTube nested it
              if (/Advanced|Avanzado|Avancé|Erweitert/i.test(text)) {
                subItem.click();
                setTimeout(() => {
                  triggerQualityMenuSelection();
                }, 100);
                return;
              }

              const res = parseQualityFromLabel(text);
              if (res > maxRes) {
                maxRes = res;
                bestSubItem = subItem;
              }
            }

            if (bestSubItem) {
              bestSubItem.click();
            }

            // 4. Close settings menu if still open
            setTimeout(() => {
              const popup = document.querySelector('.ytp-popup.ytp-settings-menu');
              if (popup && popup.style.display !== 'none') {
                settingsBtn.click();
              }
              isMenuSelecting = false;
            }, 100);
          }, 150);
        } else {
          // Close if quality menu item wasn't found
          settingsBtn.click();
          isMenuSelecting = false;
        }
      }, 150);
    } catch (e) {
      isMenuSelecting = false;
    }
  }

  // -------------------------------------------------------------
  // 4. MAIN ENHANCEMENT CONTROLLER
  // -------------------------------------------------------------
  let lastHandledVideoId = '';

  function applyEnhancements() {
    const player = document.getElementById('movie_player');
    const video = document.querySelector('video');

    if (video) {
      hookVideoSpeed(video);
      if (video.playbackRate !== TARGET_SPEED) {
        video.playbackRate = TARGET_SPEED;
      }
    }

    if (!player) return;

    // 1. Force Speed via Player API
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(TARGET_SPEED);
      }
    } catch (e) {}

    // 2. Force Subtitles
    try {
      if (typeof player.loadModule === 'function') {
        player.loadModule('captions');
      }
      if (typeof player.toggleSubtitlesOn === 'function') {
        const track = (typeof player.getOption === 'function') ? player.getOption('captions', 'track') : null;
        if (!track || Object.keys(track).length === 0) {
          player.toggleSubtitlesOn();
        }
      }
      const ccBtn = document.querySelector('.ytp-subtitles-button');
      if (ccBtn && ccBtn.getAttribute('aria-pressed') === 'false') {
        ccBtn.click();
      }
    } catch (e) {}

    // 3. Force Quality via Player API
    try {
      if (typeof player.getAvailableQualityLevels === 'function') {
        const levels = player.getAvailableQualityLevels();
        if (Array.isArray(levels) && levels.length > 0) {
          const best = selectBestQuality(levels);
          if (typeof player.setPlaybackQualityRange === 'function') {
            player.setPlaybackQualityRange(best, best);
          }
          if (typeof player.setPlaybackQuality === 'function') {
            player.setPlaybackQuality(best);
          }
          if (typeof player.setOption === 'function') {
            player.setOption('playback', 'quality', best);
          }

          // Check if player actually switched or is stuck on auto/low
          const currentQuality = (typeof player.getPlaybackQuality === 'function') ? player.getPlaybackQuality() : null;
          if (currentQuality && currentQuality !== best && currentQuality !== 'hd2160' && levels.includes('hd2160')) {
            // Trigger menu selection as backup
            triggerQualityMenuSelection();
          }
        }
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------
  // 5. INITIALIZATION & SPA HOOKS
  // -------------------------------------------------------------
  function setup() {
    applyEnhancements();

    // Hook video elements dynamically
    const video = document.querySelector('video');
    if (video) hookVideoSpeed(video);

    // Staggered checks on video load / navigation
    const retries = [200, 500, 1000, 1800, 3000, 5000];
    retries.forEach(delay => setTimeout(applyEnhancements, delay));
  }

  function init() {
    window.addEventListener('yt-navigate-finish', setup);
    window.addEventListener('spfdone', setup);

    const observer = new MutationObserver((mutations) => {
      const video = document.querySelector('video');
      if (video && !video._ytSpeedHooked) {
        hookVideoSpeed(video);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    setup();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
