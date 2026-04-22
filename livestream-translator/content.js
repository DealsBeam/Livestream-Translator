// ============================================================
// LiveStream Translator - Content Script
// Handles: caption overlay display on the livestream page
// ============================================================

(function () {
  'use strict';

  let captionBox = null;
  let statusBox = null;
  let hideTimer = null;
  let statusHideTimer = null;

  // ── Inject styles ─────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('lst-styles')) return;

    const style = document.createElement('style');
    style.id = 'lst-styles';
    style.textContent = `
      #lst-caption-box {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 80%;
        min-width: 200px;
        z-index: 2147483647;
        text-align: center;
        pointer-events: none;
        transition: opacity 0.4s ease;
      }

      #lst-caption-box.position-top {
        bottom: auto;
        top: 80px;
      }

      #lst-caption-text {
        display: inline-block;
        background: rgba(0, 0, 0, 0.82);
        color: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 18px;
        font-weight: 500;
        line-height: 1.5;
        padding: 10px 20px;
        border-radius: 6px;
        border-left: 3px solid #4f8ef7;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.9);
        word-break: break-word;
        max-width: 100%;
        animation: lst-slide-in 0.3s ease;
      }

      #lst-status-box {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        pointer-events: none;
        animation: lst-slide-in 0.3s ease;
      }

      #lst-status-text {
        display: inline-block;
        background: rgba(20, 20, 20, 0.9);
        color: #aaaaaa;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        padding: 6px 12px;
        border-radius: 4px;
        border-left: 3px solid #4f8ef7;
      }

      #lst-active-indicator {
        position: fixed;
        top: 16px;
        left: 16px;
        z-index: 2147483647;
        pointer-events: none;
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(20, 20, 20, 0.88);
        color: #aaaaaa;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 4px;
      }

      #lst-active-indicator .dot {
        width: 8px;
        height: 8px;
        background: #4caf50;
        border-radius: 50%;
        animation: lst-pulse 1.5s infinite;
      }

      @keyframes lst-slide-in {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes lst-pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }

      #lst-caption-box.fading {
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Create caption box ────────────────────────────────────
  function ensureCaptionBox() {
    if (captionBox && document.body.contains(captionBox)) return;

    captionBox = document.createElement('div');
    captionBox.id = 'lst-caption-box';

    const inner = document.createElement('div');
    inner.id = 'lst-caption-text';
    captionBox.appendChild(inner);

    document.body.appendChild(captionBox);
    applySettings();
  }

  // ── Show translated caption ───────────────────────────────
  function showCaption(text) {
    injectStyles();
    ensureCaptionBox();

    const inner = document.getElementById('lst-caption-text');
    if (!inner) return;

    inner.textContent = text;
    captionBox.classList.remove('fading');

    // Clear existing hide timer
    if (hideTimer) clearTimeout(hideTimer);

    // Auto-fade after 7 seconds
    hideTimer = setTimeout(() => {
      if (captionBox) captionBox.classList.add('fading');
    }, 7000);
  }

  // ── Show status message ───────────────────────────────────
  function showStatus(text) {
    injectStyles();

    if (!statusBox || !document.body.contains(statusBox)) {
      statusBox = document.createElement('div');
      statusBox.id = 'lst-status-box';
      const inner = document.createElement('div');
      inner.id = 'lst-status-text';
      statusBox.appendChild(inner);
      document.body.appendChild(statusBox);
    }

    document.getElementById('lst-status-text').textContent = text;

    if (statusHideTimer) clearTimeout(statusHideTimer);
    statusHideTimer = setTimeout(() => {
      if (statusBox) statusBox.remove();
      statusBox = null;
    }, 5000);
  }

  // ── Show active indicator badge ───────────────────────────
  function showActiveIndicator() {
    if (document.getElementById('lst-active-indicator')) return;
    injectStyles();

    const indicator = document.createElement('div');
    indicator.id = 'lst-active-indicator';
    indicator.innerHTML = '<div class="dot"></div><span>Translating...</span>';
    document.body.appendChild(indicator);
  }

  function removeActiveIndicator() {
    const el = document.getElementById('lst-active-indicator');
    if (el) el.remove();
  }

  // ── Apply caption settings from storage ──────────────────
  function applySettings() {
    browser.storage.local.get(['fontSize', 'captionOpacity', 'captionPosition']).then(s => {
      const inner = document.getElementById('lst-caption-text');
      if (inner) {
        inner.style.fontSize = `${s.fontSize || 18}px`;
        const opacity = s.captionOpacity !== undefined ? s.captionOpacity : 0.82;
        inner.style.background = `rgba(0, 0, 0, ${opacity})`;
      }

      if (captionBox) {
        if ((s.captionPosition || 'bottom') === 'top') {
          captionBox.classList.add('position-top');
        } else {
          captionBox.classList.remove('position-top');
        }
      }
    });
  }

  // ── Clean up all UI elements ──────────────────────────────
  function removeAll() {
    if (captionBox) { captionBox.remove(); captionBox = null; }
    if (statusBox)  { statusBox.remove();  statusBox  = null; }
    removeActiveIndicator();
    if (hideTimer)       clearTimeout(hideTimer);
    if (statusHideTimer) clearTimeout(statusHideTimer);
  }

  // ── Listen for messages from background script ────────────
  browser.runtime.onMessage.addListener((message) => {
    switch (message.action) {
      case 'showCaption':
        showCaption(message.text);
        break;

      case 'showStatus':
        showStatus(message.text);
        break;

      case 'captureStarted':
        showActiveIndicator();
        showStatus('🎧 LiveStream Translator is active');
        break;

      case 'captureStopped':
        removeAll();
        break;

      case 'settingsUpdated':
        applySettings();
        break;
    }
  });

})();
