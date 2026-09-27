// ==UserScript==
// @name         YouTube Auto Enhancer (4K, 1.5x Speed, Transparent Subtitles)
// @namespace    https://github.com/Dhruv11192/YouTubeAutoEnhancer
// @version      1.0.1
// @description  Automatically sets 4K quality, 1.5x playback speed, and transparent drop-shadow subtitles on YouTube.
// @author       Dhruv
// @match        *://*.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_SPEED = 1.5;
  const QUALITY_PRIORITY = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];

  // -------------------------------------------------------------
  // 1. INJECT CUSTOM SUBTITLE CSS STYLING
  // -------------------------------------------------------------
  function injectSubtitleStyles() {
    if (document.getElementById('yt-auto-enhancer-subtitles-style')) return;
    const style = document.createElement('style');
    style.id = 'yt-auto-enhancer-subtitles-style';
    style.textContent = `
      .ytp-caption-segment,
      .caption-window,
      .caption-window .ytp-caption-segment,
      .ytp-caption-window-rollup,
      .ytp-caption-window-rollup .ytp-caption-segment,
      .ytp-caption-window-bottom,
      .ytp-caption-window-bottom .ytp-caption-segment,
      .ytp-caption-window-side,
      .ytp-caption-window-top {
        background: transparent !important;
        background-color: transparent !important;
        border-radius: 0px !important;
      }
      .ytp-caption-segment {
        text-shadow:
          0px 0px 4px rgba(0, 0, 0, 0.95),
          2px 2px 4px rgba(0, 0, 0, 0.95),
          -1px -1px 2px rgba(0, 0, 0, 0.95) !important;
        font-weight: 600 !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // -------------------------------------------------------------
  // 2. SPEED ENFORCEMENT (1.5x)
  // -------------------------------------------------------------
  try {
    localStorage.setItem('yt-player-playback-rate', JSON.stringify({
      data: String(TARGET_SPEED),
      creation: Date.now()
    }));
  } catch (e) {}

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
  // 3. QUALITY SELECTION & UI FALLBACK
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

  let isMenuSelecting = false;
  function triggerQualityMenuSelection() {
    if (isMenuSelecting) return;
    const player = document.getElementById('movie_player');
    const settingsBtn = document.querySelector('.ytp-settings-button');
    if (!player || !settingsBtn) return;

    isMenuSelecting = true;

    try {
      settingsBtn.click();
      setTimeout(() => {
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
            const subItems = Array.from(document.querySelectorAll('.ytp-panel-menu .ytp-menuitem'));
            let bestSubItem = null;
            let maxRes = -1;

            for (const subItem of subItems) {
              const text = subItem.textContent || '';
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

            setTimeout(() => {
              const popup = document.querySelector('.ytp-popup.ytp-settings-menu');
              if (popup && popup.style.display !== 'none') {
                settingsBtn.click();
              }
              isMenuSelecting = false;
            }, 100);
          }, 150);
        } else {
          settingsBtn.click();
          isMenuSelecting = false;
        }
      }, 150);
    } catch (e) {
      isMenuSelecting = false;
    }
  }

  function applyEnhancements() {
    injectSubtitleStyles();

    const player = document.getElementById('movie_player');
    const video = document.querySelector('video');

    if (video) {
      hookVideoSpeed(video);
      if (video.playbackRate !== TARGET_SPEED) {
        video.playbackRate = TARGET_SPEED;
      }
    }

    if (!player) return;

    // 1. Set Rate
    try {
      if (typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(TARGET_SPEED);
      }
    } catch (e) {}

    // 2. Set Subtitles
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

    // 3. Set Quality
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

          const currentQuality = (typeof player.getPlaybackQuality === 'function') ? player.getPlaybackQuality() : null;
          if (currentQuality && currentQuality !== best && currentQuality !== 'hd2160' && levels.includes('hd2160')) {
            triggerQualityMenuSelection();
          }
        }
      }
    } catch (e) {}
  }

  function setup() {
    applyEnhancements();
    const video = document.querySelector('video');
    if (video) hookVideoSpeed(video);
    [200, 500, 1000, 1800, 3000, 5000].forEach(delay => setTimeout(applyEnhancements, delay));
  }

  function init() {
    window.addEventListener('yt-navigate-finish', setup);
    window.addEventListener('spfdone', setup);

    const observer = new MutationObserver(() => {
      injectSubtitleStyles();
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
