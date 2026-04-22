[README.md](https://github.com/user-attachments/files/26950422/README.md)
# 🌐 LiveStream Translator

A **free, open source** Firefox extension that provides real-time Japanese → English captions for livestream sites like TwitCasting.

No subscription. No paywall. Just paste your free Gemini API key and go.

---

## ✨ Features

- 🎧 Captures live audio from any browser tab
- 🤖 Translates Japanese speech to English using Google Gemini 2.0 Flash
- 💬 Displays captions as an overlay on the livestream page
- ⚙️ Customizable font size, background opacity, and caption position
- 🆓 Uses Gemini's **free tier** (1,500 requests/day — more than enough for livestreams)
- 🔑 Your API key stays in your browser — never sent anywhere except Google's API

---

## 🚀 Quick Start

### 1. Get a Free Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with a free Google account
3. Click **Create API Key**
4. Copy the key

### 2. Install the Extension in Firefox

> **Temporary install (for testing):**
1. Open Firefox and go to `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on...**
4. Navigate to the `livestream-translator` folder and select `manifest.json`
5. The extension icon will appear in your toolbar

> **Permanent install:** Submit to [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/developers/) for a signed, permanent install.

### 3. Use It

1. Click the 🌐 extension icon in your toolbar
2. Paste your Gemini API key into the field (it saves automatically)
3. Open your Japanese livestream (e.g., TwitCasting)
4. Click **▶ Start Translation**
5. English captions will appear on the page as the streamer speaks

---

## ⚙️ Settings

| Setting | Description |
|---|---|
| Font Size | Size of the caption text (12–36px) |
| Background | Opacity of the caption background |
| Position | Bottom or top of the screen |

Settings are saved automatically and applied live.

---

## 🔧 How It Works

```
Tab Audio → MediaRecorder → 5-second chunks → Gemini API → English text → Caption overlay
```

1. **Tab Audio Capture** — Firefox's `tabCapture` API grabs the audio from the active tab
2. **Chunked Recording** — Audio is recorded in 5-second segments using `MediaRecorder`
3. **Gemini Translation** — Each chunk is sent to Gemini 2.0 Flash with a prompt to transcribe and translate the Japanese speech
4. **Caption Display** — The English translation appears as an overlay on the page

---

## 💡 Tips

- Works best when the streamer's audio is clear (not drowned out by loud background music)
- Captions appear about 5–6 seconds after the streamer speaks (processing time)
- If no speech is detected in a chunk, no caption is shown
- The Gemini free tier allows 15 requests/minute — one every 5 seconds, which is exactly our chunk size

---

## 🆓 Cost

| Component | Cost |
|---|---|
| Extension | Free forever |
| Gemini API (free tier) | Free — 1,500 requests/day |
| Gemini API (if you exceed free tier) | ~$0.075 per 1M tokens — extremely cheap |

A typical 1-hour livestream session uses approximately 720 requests (one per 5 seconds). Well within the free daily limit.

---

## 🤝 Contributing

Contributions welcome! Some ideas for future improvements:

- [ ] Support for more source languages (Korean, Chinese, Spanish, etc.)
- [ ] Alternative translation backends (OpenAI, Claude API)
- [ ] Caption history panel (scroll back through translations)
- [ ] Adjustable chunk size (for faster/slower captions)
- [ ] Caption styling options (color, font family)
- [ ] Auto-detect language instead of assuming Japanese
- [ ] Support for streaming the translation word-by-word

To contribute:
1. Fork this repo
2. Create a feature branch
3. Submit a pull request

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

## 🙏 Credits

Built with:
- [Google Gemini 2.0 Flash API](https://ai.google.dev/) — free multimodal translation
- Firefox WebExtensions API
- MediaRecorder API
- tabCapture API
