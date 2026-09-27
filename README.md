# YouTube Auto-Enhancer (Safari Web Extension)

A zero-configuration Safari Extension that automatically applies your preferred settings to all YouTube videos in the background:

1. **4K Video Quality:** Automatically sets resolution to 4K (`2160p`). If a video doesn't have 4K available, it automatically selects the highest available resolution (e.g., 1440p / 1080p).
2. **1.5x Playback Speed:** Automatically sets playback speed to `1.5x` as soon as the video loads and persists across navigation.
3. **Transparent Drop-Shadow Subtitles:** Automatically turns on subtitles and styles them with **0% background opacity (completely transparent background)** and a **high-contrast crisp drop-shadow**.

---

## Quick Setup in Safari

### Step 1: Allow Unsigned Extensions in Safari (First-time macOS developer setup)
1. Open **Safari**.
2. Open Safari Settings (**⌘,** or `Safari > Settings...`).
3. Go to the **Advanced** tab and check **"Show features for web developers"** (or "Show Develop menu in menu bar").
4. In the menu bar at the top, click **Develop > Allow Unsigned Extensions** (enter your Mac password if prompted).

---

### Step 2: Build and Run the Extension
You can open and run the project directly with Xcode:

```bash
open /Users/dhruv/YouTubeAutoEnhancer/XcodeProject/YouTubeAutoEnhancer/YouTubeAutoEnhancer.xcodeproj
```

1. In Xcode, select the **YouTubeAutoEnhancer** scheme and click the **Run ▶** button (or press **⌘R**).
2. The native companion app window will open confirming the extension is installed.

---

### Step 3: Enable in Safari
1. Open **Safari > Settings... > Extensions**.
2. Look for **YouTube Auto Enhancer** in the sidebar and check the box to **enable** it.
3. If prompted for website permissions, choose **"Always Allow on Every Website"** (or "Always Allow on youtube.com").

---

## Project Structure

```text
YouTubeAutoEnhancer/
├── XcodeProject/
│   └── YouTubeAutoEnhancer/
│       ├── YouTubeAutoEnhancer.xcodeproj     # Native Xcode project
│       ├── YouTubeAutoEnhancer/              # Native App container
│       └── YouTubeAutoEnhancer Extension/    # Safari Extension Target
│           └── Resources/                    # WebExtension Bundle (Manifest V3)
│               ├── manifest.json
│               ├── inject.js                 # Player quality & speed hook
│               ├── subtitles.css             # Transparent drop-shadow styles
│               ├── content.js                # Main-world script injector
│               └── images/                   # Extension icons
├── tests/                                    # Automated unit test suite
├── docs/                                     # Spec and architecture plans
└── package.json                              # Test runner configuration
```

---

## Running Tests

To run the automated test suite:
```bash
npm test
```
