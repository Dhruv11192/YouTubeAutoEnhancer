export const QUALITY_PRIORITY = [
  'hd2160', // 4K
  'hd1440', // 1440p
  'hd1080', // 1080p
  'hd720',  // 720p
  'large',  // 480p
  'medium', // 360p
  'small',  // 240p
  'tiny'    // 144p
];

export function selectBestQuality(availableLevels) {
  if (!Array.isArray(availableLevels) || availableLevels.length === 0) {
    return 'hd2160';
  }
  for (const quality of QUALITY_PRIORITY) {
    if (availableLevels.includes(quality)) {
      return quality;
    }
  }
  return availableLevels[0];
}

export function applyEnhancementsToMockPlayer(player, video, targetSpeed = 1.5) {
  if (!player) return;

  // 1. Playback Speed
  try {
    if (typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(targetSpeed);
    }
    if (video) {
      video.playbackRate = targetSpeed;
    }
  } catch (e) {}

  // 2. Quality Selection
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

  // 3. Subtitles
  try {
    if (typeof player.loadModule === 'function') {
      player.loadModule('captions');
    }
    if (typeof player.toggleSubtitlesOn === 'function') {
      player.toggleSubtitlesOn();
    }
  } catch (e) {}
}
