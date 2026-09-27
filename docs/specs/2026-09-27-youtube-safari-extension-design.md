# Specification: YouTube Auto-Enhancer Safari Extension

**Date:** 2026-09-27  
**Status:** Approved  
**Platform:** macOS Safari Web Extension (Xcode Project / Swift + Manifest V3)

---

## 1. Overview & Objectives

The goal is to create a zero-configuration Safari Web Extension for YouTube (`youtube.com`) that runs completely automatically in the background on every video load and SPA navigation.

### Key Automated Behaviors:
1. **Auto 4K Quality:** Automatically sets playback resolution to 4K (`2160p` / `hd2160`). If 4K is not available for a given video, gracefully selects the highest available resolution (e.g. 1440p -> 1080p -> 720p).
2. **Auto Subtitles & Styling:**
   - Automatically enables captions/subtitles if available.
   - Overrides subtitle styles so the background opacity is `0%` (fully transparent) and adds a clean, high-contrast drop shadow for maximum legibility.
3. **Auto 1.5x Playback Speed:** Automatically sets playback speed to `1.5x` as soon as the player begins loading or playing.

---

## 2. Architecture & File Structure

```text
YouTubeAutoEnhancer/
├── YouTubeAutoEnhancer.xcodeproj/             # macOS Container App & Extension target
├── YouTubeAutoEnhancer/                       # Native macOS App wrapper
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Main.storyboard
│   └── Info.plist
└── YouTubeAutoEnhancer Extension/             # Safari Web Extension Bundle
    ├── Info.plist
    └── Resources/
        ├── manifest.json                      # WebExtension Manifest V3
        ├── content.js                         # Content Script (DOM & Event Hook)
        ├── inject.js                          # Main-World Player API Controller
        ├── subtitles.css                      # Custom Subtitle Styling
        └── images/                            # Extension Icons (16, 32, 48, 128, 512px)
```

---

## 3. Detailed Component Specifications

### 3.1. WebExtension Manifest (`manifest.json`)
- **Manifest Version:** 3
- **Host Permissions:** `*://*.youtube.com/*`
- **Content Scripts:**
  - `content.js` and `subtitles.css` injected on `*://*.youtube.com/*` at `document_start` or `document_idle`.
- **Web Accessible Resources:** `inject.js` exposed so it can be dynamically injected into the Main World context.

### 3.2. Player Controller Script (`inject.js`)
Runs in YouTube's main JavaScript execution context to interact with the YouTube Player API (`#movie_player`).

- **Events Observed:**
  - `yt-navigate-finish` (YouTube SPA navigation)
  - `spfdone` (legacy/fallback navigation)
  - Player state changes (`onStateChange`, buffering/playing)
  - Mutation observer fallback if player is dynamically created.
- **Automation Logic:**
  1. **Speed:**
     ```javascript
     player.setPlaybackRate(1.5);
     const video = document.querySelector('video');
     if (video) video.playbackRate = 1.5;
     ```
  2. **Quality Selection:**
     - Reads `player.getAvailableQualityLevels()`.
     - Target priority: `['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny']`.
     - Selects highest available level matching the target priority list.
     - Sets quality via:
       ```javascript
       player.setPlaybackQualityRange(targetQuality, targetQuality);
       player.setPlaybackQuality(targetQuality);
       ```
  3. **Auto Subtitles:**
     - Invokes `player.loadModule("captions")` if caption module is uninitialized.
     - Checks `player.getOption("captions", "track")` or caption visibility status.
     - Enables subtitles with default/preferred track if not already active:
       ```javascript
       player.setOption("captions", "track", { languageCode: "en" }); // or player.toggleSubtitlesOn()
       ```

### 3.3. Subtitle Stylesheet (`subtitles.css`)
Injected with highest specificity (`!important`) to ensure YouTube's dynamic inline styles do not override custom caption appearance:
```css
/* Ensure background opacity is 0% (transparent) */
.ytp-caption-segment,
.caption-window,
.ytp-caption-window-rollup,
.ytp-caption-window-bottom {
  background: transparent !important;
  background-color: transparent !important;
}

/* Drop shadow text effect */
.ytp-caption-segment {
  text-shadow: 
    0px 0px 4px rgba(0, 0, 0, 0.95),
    2px 2px 4px rgba(0, 0, 0, 0.95),
    -1px -1px 2px rgba(0, 0, 0, 0.95) !important;
}
```

---

## 4. Verification & Testing Plan

1. **Native Build & Installation:**
   - Verify Xcode project builds cleanly with `xcodebuild`.
   - Verify Safari detects the extension under Safari Preferences -> Extensions.
2. **Quality Verification:**
   - Test on 4K YouTube video (e.g. 4K Nature/Demo video) -> confirms 2160p is selected.
   - Test on 1080p-max video -> confirms 1080p is selected automatically as fallback.
3. **Subtitles Verification:**
   - Confirm captions turn on automatically upon video start.
   - Inspect caption element in Safari Web Inspector to ensure background is `transparent` and drop shadow is rendered.
4. **Playback Speed Verification:**
   - Inspect `video.playbackRate` and YouTube settings gear -> confirms speed is 1.5x.
5. **SPA Navigation Verification:**
   - Navigate from one video to another by clicking related videos without a full page reload -> verify all three settings re-apply automatically.
