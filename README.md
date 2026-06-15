# Mymensingh Namaz 🕌

A dead-simple web app showing **Mymensingh, Bangladesh** prayer times — **12-hour
format**, large text, made for an older person. No app store, no install fee.

- **Hanafi** (later Asr) · **Karachi (18°/18°) method** — the Islamic Foundation
  Bangladesh (IFB) standard.
- **Synced to the Grameenphone "Ibadah" timer** — the app people in Mymensingh actually
  check. GP serves the Islamic Foundation Bangladesh table and shows Mymensingh on the
  **Dhaka** schedule (no district correction). So this app computes the astronomical times
  for Dhaka (Karachi 18°/18°, Hanafi) and applies fixed per-prayer offsets calibrated to
  match GP to the minute (verified 2026-06-15: Fajr 3:44, Dhuhr 12:02, Asr 4:38, Maghrib
  6:51, Isha 8:17). Twilight prayers can vary ~1 min from GP across the year.
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
