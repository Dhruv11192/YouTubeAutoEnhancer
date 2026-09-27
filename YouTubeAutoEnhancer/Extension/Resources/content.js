(function () {
  'use strict';

  // Inject the main-world player script into YouTube's execution context
  function injectScript(filePath) {
    try {
      const script = document.createElement('script');
      const runtime = (typeof browser !== 'undefined' && browser.runtime) ? browser.runtime : (typeof chrome !== 'undefined' ? chrome.runtime : null);
      if (runtime && runtime.getURL) {
        script.src = runtime.getURL(filePath);
      } else {
        script.src = filePath;
      }
      script.onload = function () {
        this.remove();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('[YouTubeAutoEnhancer] Failed to inject player script:', e);
    }
  }

  injectScript('inject.js');
})();
