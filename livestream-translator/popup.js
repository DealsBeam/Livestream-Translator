// ============================================================
// LiveStream Translator — Popup Script
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // ── Elements ───────────────────────────────────────────────
  const apiKeyInput     = document.getElementById('apiKey');
  const toggleKeyBtn    = document.getElementById('toggleKey');
  const keyStatus       = document.getElementById('keyStatus');
  const toggleCapBtn    = document.getElementById('toggleCapture');
  const statusBadge     = document.getElementById('statusBadge');
  const fontSizeSlider  = document.getElementById('fontSize');
  const fontSizeVal     = document.getElementById('fontSizeVal');
  const opacitySlider   = document.getElementById('captionOpacity');
  const opacityVal      = document.getElementById('opacityVal');
  const positionSelect  = document.getElementById('captionPosition');

  // ── Load saved settings ────────────────────────────────────
  browser.storage.local.get([
    'geminiApiKey',
    'fontSize',
    'captionOpacity',
    'captionPosition'
  ]).then(s => {

    if (s.geminiApiKey) {
      apiKeyInput.value = s.geminiApiKey;
      keyStatus.textContent = '✓ API key saved';
      keyStatus.classList.add('saved');
    }

    if (s.fontSize) {
      fontSizeSlider.value = s.fontSize;
      fontSizeVal.textContent = `${s.fontSize}px`;
    }

    if (s.captionOpacity !== undefined) {
      opacitySlider.value = s.captionOpacity;
      opacityVal.textContent = `${Math.round(s.captionOpacity * 100)}%`;
    }

    if (s.captionPosition) {
      positionSelect.value = s.captionPosition;
    }
  });

  // Check if capture is already running
  browser.runtime.sendMessage({ action: 'getStatus' }).then(response => {
    if (response && response.isCapturing) {
      setActiveState(true);
    }
  }).catch(() => {});

  // ── API Key: save on change ───────────────────────────────
  apiKeyInput.addEventListener('input', () => {
    const key = apiKeyInput.value.trim();
    if (key.length > 10) {
      browser.runtime.sendMessage({ action: 'updateApiKey', apiKey: key });
      keyStatus.textContent = '✓ API key saved';
      keyStatus.classList.add('saved');
    } else {
      keyStatus.textContent = '';
      keyStatus.classList.remove('saved');
    }
  });

  // ── Toggle API key visibility ──────────────────────────────
  toggleKeyBtn.addEventListener('click', () => {
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      toggleKeyBtn.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      toggleKeyBtn.textContent = '👁';
    }
  });

  // ── Start / Stop button ───────────────────────────────────
  toggleCapBtn.addEventListener('click', async () => {
    const isCapturing = toggleCapBtn.classList.contains('btn-stop');

    if (isCapturing) {
      // Stop
      browser.runtime.sendMessage({ action: 'stopCapture' });
      setActiveState(false);
    } else {
      // Validate API key first
      const key = apiKeyInput.value.trim();
      if (!key || key.length < 10) {
        apiKeyInput.style.borderColor = '#e74c3c';
        keyStatus.textContent = '⚠️ Please enter your Gemini API key first';
        keyStatus.style.color = '#e74c3c';
        setTimeout(() => {
          apiKeyInput.style.borderColor = '';
          keyStatus.style.color = '';
        }, 3000);
        return;
      }

      // Get the current active tab and start capture
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0]) {
          showError('Could not find active tab.');
          return;
        }

        const response = await browser.runtime.sendMessage({
          action: 'startCapture',
          tabId: tabs[0].id
        });

        if (response && response.success) {
          setActiveState(true);
        } else {
          showError(response?.error || 'Could not start capture. Make sure audio is playing.');
        }
      } catch (err) {
        showError('Error: ' + err.message);
      }
    }
  });

  // ── Font size slider ──────────────────────────────────────
  fontSizeSlider.addEventListener('input', () => {
    const val = parseInt(fontSizeSlider.value);
    fontSizeVal.textContent = `${val}px`;
    saveSettings();
  });

  // ── Opacity slider ────────────────────────────────────────
  opacitySlider.addEventListener('input', () => {
    const val = parseFloat(opacitySlider.value);
    opacityVal.textContent = `${Math.round(val * 100)}%`;
    saveSettings();
  });

  // ── Position select ───────────────────────────────────────
  positionSelect.addEventListener('change', saveSettings);

  // ── Save settings and notify content script ───────────────
  function saveSettings() {
    browser.storage.local.set({
      fontSize:        parseInt(fontSizeSlider.value),
      captionOpacity:  parseFloat(opacitySlider.value),
      captionPosition: positionSelect.value
    }).then(() => {
      // Tell the content script to re-apply settings live
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { action: 'settingsUpdated' }).catch(() => {});
        }
      });
    });
  }

  // ── UI state helpers ──────────────────────────────────────
  function setActiveState(active) {
    if (active) {
      toggleCapBtn.textContent = '■  Stop Translation';
      toggleCapBtn.classList.remove('btn-start');
      toggleCapBtn.classList.add('btn-stop');
      statusBadge.textContent = '● Active';
      statusBadge.classList.remove('badge-off');
      statusBadge.classList.add('badge-on');
    } else {
      toggleCapBtn.textContent = '▶  Start Translation';
      toggleCapBtn.classList.remove('btn-stop');
      toggleCapBtn.classList.add('btn-start');
      statusBadge.textContent = '● Inactive';
      statusBadge.classList.remove('badge-on');
      statusBadge.classList.add('badge-off');
    }
  }

  function showError(msg) {
    statusBadge.textContent = `⚠️ ${msg}`;
    statusBadge.classList.remove('badge-on');
    statusBadge.classList.add('badge-off');
    setTimeout(() => {
      statusBadge.textContent = '● Inactive';
    }, 4000);
  }

});
