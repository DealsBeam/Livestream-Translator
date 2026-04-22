// ============================================================
// LiveStream Translator - Background Script
// Handles: tab audio capture, MediaRecorder, Gemini API calls
// ============================================================

const state = {
  isCapturing: false,
  mediaRecorder: null,
  captureStream: null,
  audioChunks: [],
  activeTabId: null,
  apiKey: '',
  retryTimeout: null
};

// ── Load saved API key on startup ──────────────────────────
browser.storage.local.get(['geminiApiKey']).then(result => {
  if (result.geminiApiKey) {
    state.apiKey = result.geminiApiKey;
  }
});

// ── Message handler ────────────────────────────────────────
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {

    case 'startCapture':
      startCapture(message.tabId)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // keep channel open for async response

    case 'stopCapture':
      stopCapture();
      sendResponse({ success: true });
      break;

    case 'updateApiKey':
      state.apiKey = message.apiKey;
      browser.storage.local.set({ geminiApiKey: message.apiKey });
      sendResponse({ success: true });
      break;

    case 'getStatus':
      sendResponse({ isCapturing: state.isCapturing });
      break;
  }
});

// ── Start capturing tab audio ──────────────────────────────
async function startCapture(tabId) {
  if (state.isCapturing) return;

  return new Promise((resolve, reject) => {
    browser.tabCapture.capture({ audio: true, video: false }, stream => {
      if (browser.runtime.lastError) {
        reject(new Error(browser.runtime.lastError.message));
        return;
      }
      if (!stream) {
        reject(new Error('Could not capture tab audio. Make sure audio is playing on the tab.'));
        return;
      }

      state.captureStream = stream;
      state.isCapturing = true;
      state.activeTabId = tabId;

      // Tell the content script we've started
      browser.tabs.sendMessage(tabId, { action: 'captureStarted' }).catch(() => {});

      // Begin the recording loop
      scheduleNextChunk(stream);
      resolve();
    });
  });
}

// ── Chunked recording loop ─────────────────────────────────
// Records 5-second audio chunks and sends each to Gemini for translation.
function scheduleNextChunk(stream) {
  if (!state.isCapturing || !stream.active) return;

  state.audioChunks = [];

  // Pick the best supported audio format
  const mimeType = getSupportedMimeType();
  const options = mimeType ? { mimeType } : {};

  try {
    state.mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.error('[LST] MediaRecorder init failed:', e);
    stopCapture();
    return;
  }

  state.mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) {
      state.audioChunks.push(e.data);
    }
  };

  state.mediaRecorder.onstop = async () => {
    if (state.audioChunks.length > 0 && state.isCapturing) {
      const blob = new Blob(state.audioChunks, {
        type: state.mediaRecorder.mimeType || 'audio/webm'
      });
      await processAudioChunk(blob);
    }
    // Loop: schedule the next 5-second chunk
    if (state.isCapturing) {
      scheduleNextChunk(stream);
    }
  };

  state.mediaRecorder.start();

  // Stop after 5 seconds to trigger onstop and process the chunk
  setTimeout(() => {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
      state.mediaRecorder.stop();
    }
  }, 5000);
}

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// ── Send audio chunk to Gemini API ─────────────────────────
async function processAudioChunk(blob) {
  if (!state.apiKey) {
    sendStatusToTab('⚠️ No API key — open the extension and add your Gemini API key.');
    return;
  }

  try {
    const base64Audio = await blobToBase64(blob);
    const mimeType = blob.type || 'audio/webm';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio
                }
              },
              {
                text: [
                  'This audio is from a Japanese livestream.',
                  'Listen carefully and translate what is being said into natural, conversational English.',
                  'Preserve slang, tone, and emotion as accurately as possible.',
                  'Output ONLY the English translation — no labels, no explanations.',
                  'If there is silence, background music only, or no clear speech, output nothing at all.'
                ].join(' ')
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300
          }
        })
      }
    );

    // Handle rate limiting gracefully
    if (response.status === 429) {
      console.warn('[LST] Gemini rate limit hit — skipping this chunk.');
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[LST] Gemini API error:', response.status, err);
      return;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (text && text.length > 1) {
      sendCaptionToTab(text);
    }

  } catch (error) {
    console.error('[LST] processAudioChunk error:', error);
  }
}

// ── Helpers ────────────────────────────────────────────────
function sendCaptionToTab(text) {
  if (state.activeTabId !== null) {
    browser.tabs.sendMessage(state.activeTabId, { action: 'showCaption', text })
      .catch(() => {});
  }
}

function sendStatusToTab(text) {
  if (state.activeTabId !== null) {
    browser.tabs.sendMessage(state.activeTabId, { action: 'showStatus', text })
      .catch(() => {});
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // Strip the "data:audio/webm;base64," prefix
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Stop capture and clean up ──────────────────────────────
function stopCapture() {
  state.isCapturing = false;

  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    try { state.mediaRecorder.stop(); } catch (e) {}
  }

  if (state.captureStream) {
    state.captureStream.getTracks().forEach(t => t.stop());
    state.captureStream = null;
  }

  if (state.activeTabId !== null) {
    browser.tabs.sendMessage(state.activeTabId, { action: 'captureStopped' })
      .catch(() => {});
  }

  state.activeTabId = null;
  state.mediaRecorder = null;
  state.audioChunks = [];
}
