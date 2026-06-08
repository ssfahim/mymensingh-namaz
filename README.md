# Mymensingh Namaz 🕌

A dead-simple web app showing **Mymensingh, Bangladesh** prayer times — **12-hour
format**, large text, made for an older person. No app store, no install fee.

- **Hanafi** (later Asr) · **Karachi (18°/18°) method** — the Islamic Foundation
  Bangladesh standard.
- **Offline:** loads the whole month once and caches it; works with no internet after.
- **Open on iPhone:** just open the link in Safari. Tap **Share → Add to Home Screen**
  to get an app icon that opens full-screen. Never expires.

## The link to share
After the GitHub Pages deploy finishes, the app is live at:
**https://ssfahim.github.io/mymensingh-namaz/**

Send that link to the person; they open it in Safari and Add to Home Screen.

## Tech
Plain HTML/CSS/JS (no build step) · Aladhan API · service worker + localStorage for
offline · deployed free via GitHub Pages. Only network destination is `api.aladhan.com`.
