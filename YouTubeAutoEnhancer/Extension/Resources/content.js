(function () {
  'use strict';

  // Fetch and inject script text inline into the main world DOM
  function injectMainWorldScript() {
    try {
      const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
      if (!runtime || !runtime.getURL) return;

      const scriptUrl = runtime.getURL('inject.js');

      // Method 1: Fetch script source and insert inline textContent (immune to external CSP blocking)
      fetch(scriptUrl)
        .then(response => response.text())
        .then(code => {
          const script = document.createElement('script');
          script.textContent = code;
          (document.head || document.documentElement).appendChild(script);
          script.remove();
        })
        .catch(() => {
          // Method 2 fallback: script src
          const script = document.createElement('script');
          script.src = scriptUrl;
          (document.head || document.documentElement).appendChild(script);
        });
    } catch (e) {
      console.error('[YouTubeAutoEnhancer] Content injection error:', e);
    }
  }

  injectMainWorldScript();
})();
