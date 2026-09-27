# YouTube Auto-Enhancer Safari Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-input macOS Safari Web Extension that automatically sets YouTube video quality to 4K (or highest available fallback), forces 1.5x playback speed, and styles subtitles with 0% background opacity and a high-contrast drop shadow.

**Architecture:** A lightweight Manifest V3 Safari Web Extension with a native macOS container app wrapper. A main-world injected script interacts directly with YouTube's HTML5 Player API (`#movie_player`) upon video load and SPA navigation, while a custom CSS stylesheet applies transparent background and drop-shadow styling to all YouTube caption segments.

**Tech Stack:** JavaScript (ES2022, Manifest V3, WebExtension API), CSS3, Swift, macOS AppKit / SafariServices, Xcode 27.

**Spec:** `/Users/dhruv/YouTubeAutoEnhancer/docs/specs/2026-09-27-youtube-safari-extension-design.md`

---

## Global Constraints

- Must require zero user clicks or configuration once installed.
- Must execute on every YouTube video page (`youtube.com/watch*`) and handle SPA navigation (`yt-navigate-finish`) without requiring page reloads.
- Subtitle background opacity must be 0% (fully transparent) across all YouTube caption modes (standard, rollup, bottom-anchored).
- Video resolution must target 4K (`hd2160`), gracefully falling back to the highest available resolution if 4K is absent.
- Playback speed must be locked to 1.5x on initialization and video changes.

---

## Review Focus

1. **SPA (Single-Page App) navigation without reload:** YouTube does not reload pages between videos; tests must ensure re-triggering logic attaches to `yt-navigate-finish` and player state changes.
2. **Delayed player initialization:** The YouTube `#movie_player` element or its API methods might not be immediately available on DOMContentLoaded; retry logic with exponential/interval backoff must handle delayed ready state.
3. **Videos without 4K:** Videos capped at 1080p or 720p must select their highest available tier without error or fallback to low-res auto.
4. **Videos without English captions:** Subtitle activation must safely attempt to enable available default tracks without throwing errors on videos with zero caption tracks.
5. **Pre-roll ads & shorts:** Player interactions must not crash when ads or YouTube Shorts are playing.

---

## Task Breakdown

### Task 1: Core Automation Logic & YouTube Player Hook (`inject.js`)

**Files:**
- Create: `YouTubeAutoEnhancer/Extension/Resources/inject.js`
- Test: `tests/player-controller.test.js`
- Create: `package.json` (for running Node test runner)

**Interfaces:**
- Produces: `window.YouTubeAutoEnhancer` controller with methods `applyEnhancements(player)`, `selectBestQuality(availableLevels)`, `enableSubtitles(player)`, and `setPlaybackSpeed(player, speed)`.

- [ ] **Step 1: Write the failing unit tests for player controller logic**

```javascript
// tests/player-controller.test.js
import { describe, it, beforeEach } from 'node:test';
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

  it('sets playback speed to 1.5x on player and video element', () => {
    let playerRate = 1.0;
    const mockPlayer = {
      setPlaybackRate: (rate) => { playerRate = rate; },
      getAvailableQualityLevels: () => ['hd1080', 'hd2160'],
      setPlaybackQualityRange: () => {},
      setPlaybackQuality: () => {},
      loadModule: () => {},
      toggleSubtitlesOn: () => {}
    };
    const mockVideo = { playbackRate: 1.0 };

    applyEnhancementsToMockPlayer(mockPlayer, mockVideo, 1.5);
    assert.equal(playerRate, 1.5);
    assert.equal(mockVideo.playbackRate, 1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/player-controller.test.js`  
Expected: FAIL with module not found or functions undefined.

- [ ] **Step 3: Implement `inject-core.js` and `inject.js`**

```javascript
// YouTubeAutoEnhancer/Extension/Resources/inject-core.js
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
```

```javascript
// YouTubeAutoEnhancer/Extension/Resources/inject.js
(function () {
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

    // 2. Force 4K / Highest Quality
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
      // Retry in intervals to catch player readiness on SPA transitions
      setTimeout(applyEnhancements, 100);
      setTimeout(applyEnhancements, 500);
      setTimeout(applyEnhancements, 1200);
    });

    // Observer for video element speed enforcement
    const observer = new MutationObserver(() => {
      applyEnhancements();
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    // Initial trigger
    applyEnhancements();
    setTimeout(applyEnhancements, 500);
    setTimeout(applyEnhancements, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/player-controller.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/player-controller.test.js YouTubeAutoEnhancer/Extension/Resources/inject*
```

---

### Task 2: Subtitle Styling & Content Script Bridge (`subtitles.css` + `content.js`)

**Files:**
- Create: `YouTubeAutoEnhancer/Extension/Resources/subtitles.css`
- Create: `YouTubeAutoEnhancer/Extension/Resources/content.js`
- Test: `tests/subtitles-style.test.js`

**Interfaces:**
- Injects: `inject.js` into YouTube's DOM (Main World execution).
- Enforces: CSS rules targeting `.ytp-caption-segment`, `.caption-window`, `.ytp-caption-window-rollup` for transparent background and drop shadow.

- [ ] **Step 1: Write test verifying CSS contains required properties and selectors**

```javascript
// tests/subtitles-style.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Subtitle CSS Stylesheet', () => {
  it('contains background transparency and text-shadow rules for caption segments', () => {
    const cssPath = path.resolve('YouTubeAutoEnhancer/Extension/Resources/subtitles.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.match(css, /\.ytp-caption-segment/);
    assert.match(css, /background:\s*transparent\s*!important/);
    assert.match(css, /text-shadow:/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/subtitles-style.test.js`  
Expected: FAIL (file missing).

- [ ] **Step 3: Implement `subtitles.css` and `content.js`**

```css
/* YouTubeAutoEnhancer/Extension/Resources/subtitles.css */
/* 1. Force 0% Background Opacity (Transparent) on Subtitles */
.ytp-caption-segment,
.caption-window,
.ytp-caption-window-rollup,
.ytp-caption-window-bottom,
.ytp-caption-window-rollup .ytp-caption-segment {
  background: transparent !important;
  background-color: transparent !important;
  border-radius: 0 !important;
}

/* 2. High-Contrast Crisp Drop Shadow for Transparent Subtitles */
.ytp-caption-segment {
  text-shadow: 
    0px 0px 4px rgba(0, 0, 0, 0.95),
    2px 2px 4px rgba(0, 0, 0, 0.95),
    -1px -1px 2px rgba(0, 0, 0, 0.95) !important;
  font-weight: 600 !important;
}
```

```javascript
// YouTubeAutoEnhancer/Extension/Resources/content.js
(function () {
  // Inject the main-world player script
  function injectScript(filePath) {
    const script = document.createElement('script');
    script.src = browser.runtime.getURL(filePath);
    script.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  injectScript('inject.js');
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/subtitles-style.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/subtitles-style.test.js YouTubeAutoEnhancer/Extension/Resources/subtitles.css YouTubeAutoEnhancer/Extension/Resources/content.js
```

---

### Task 3: Extension Manifest, Icons & Assets (`manifest.json`)

**Files:**
- Create: `YouTubeAutoEnhancer/Extension/Resources/manifest.json`
- Create: `YouTubeAutoEnhancer/Extension/Resources/images/icon-16.png`
- Create: `YouTubeAutoEnhancer/Extension/Resources/images/icon-32.png`
- Create: `YouTubeAutoEnhancer/Extension/Resources/images/icon-48.png`
- Create: `YouTubeAutoEnhancer/Extension/Resources/images/icon-128.png`
- Create: `YouTubeAutoEnhancer/Extension/Resources/images/icon-512.png`
- Test: `tests/manifest-validation.test.js`

- [ ] **Step 1: Write test to validate Manifest V3 structure and permissions**

```javascript
// tests/manifest-validation.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Manifest V3 Configuration', () => {
  it('has valid manifest_version 3, youtube host permissions, and web accessible resources', () => {
    const manifestPath = path.resolve('YouTubeAutoEnhancer/Extension/Resources/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert.equal(manifest.manifest_version, 3);
    assert.ok(manifest.host_permissions.some(p => p.includes('youtube.com')));
    assert.ok(manifest.content_scripts.length > 0);
    assert.ok(manifest.content_scripts[0].css.includes('subtitles.css'));
    assert.ok(manifest.web_accessible_resources[0].resources.includes('inject.js'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/manifest-validation.test.js`  
Expected: FAIL

- [ ] **Step 3: Implement `manifest.json` and generate extension icons**

```json
{
  "manifest_version": 3,
  "name": "YouTube Auto Enhancer (4K, Subtitles, 1.5x)",
  "version": "1.0.0",
  "description": "Automatically sets 4K quality, 1.5x speed, and transparent drop-shadow subtitles on YouTube.",
  "host_permissions": [
    "*://*.youtube.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["content.js"],
      "css": ["subtitles.css"],
      "run_at": "document_start"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["inject.js"],
      "matches": ["*://*.youtube.com/*"]
    }
  ],
  "icons": {
    "16": "images/icon-16.png",
    "32": "images/icon-32.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png",
    "512": "images/icon-512.png"
  }
}
```

Generate PNG icons using a Canvas/Node script or ImageMagick/sips.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/manifest-validation.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/manifest-validation.test.js YouTubeAutoEnhancer/Extension/Resources/manifest.json YouTubeAutoEnhancer/Extension/Resources/images/
```

---

### Task 4: macOS Native Xcode Wrapper & Safari Extension Project Setup

**Files:**
- Create: `YouTubeAutoEnhancer/YouTubeAutoEnhancer.xcodeproj` (via `safari-web-extension-converter` or programmatic Xcode project structure)
- Create: `YouTubeAutoEnhancer/Shared (App)/AppDelegate.swift`
- Create: `YouTubeAutoEnhancer/Shared (App)/ViewController.swift`
- Create: `YouTubeAutoEnhancer/macOS (App)/Info.plist`
- Create: `YouTubeAutoEnhancer/macOS (Extension)/Info.plist`

- [ ] **Step 1: Scaffold Xcode Project using `xcrun safari-web-extension-converter` or Xcode templates**

Run:
```bash
xcrun safari-web-extension-converter YouTubeAutoEnhancer/Extension/Resources \
  --project-location YouTubeAutoEnhancer/ \
  --app-name "YouTubeAutoEnhancer" \
  --bundle-identifier "com.dhruv.YouTubeAutoEnhancer" \
  --macos-only \
  --no-open \
  --force
```

- [ ] **Step 2: Verify Xcode project structure and plist configurations**

Check that the generated `.xcodeproj` contains:
- App container target (`YouTubeAutoEnhancer`)
- Safari extension target (`YouTubeAutoEnhancer Extension`)
- Linked Resources folder containing `manifest.json`, `inject.js`, `content.js`, `subtitles.css`.

- [ ] **Step 3: Commit**

```bash
git add YouTubeAutoEnhancer/
```

---

### Task 5: Compilation, Build Verification & Integration Test

**Files:**
- Build artifacts in `build/Build/Products/Debug/YouTubeAutoEnhancer.app`

- [ ] **Step 1: Compile with `xcodebuild`**

Run:
```bash
xcodebuild -project YouTubeAutoEnhancer/YouTubeAutoEnhancer.xcodeproj \
  -scheme "YouTubeAutoEnhancer (macOS)" \
  -configuration Debug \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  clean build
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 2: Verify extension bundle in compiled app**

Run:
```bash
ls -la YouTubeAutoEnhancer/build/Build/Products/Debug/YouTubeAutoEnhancer.app/Contents/PlugIns/
```
Expected: `YouTubeAutoEnhancer Extension.appex` present and contains `manifest.json`, `inject.js`, `subtitles.css`, `content.js`.

- [ ] **Step 3: Run all automated unit tests**

Run:
```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 4: Commit and tag complete project**

```bash
git add .
```
