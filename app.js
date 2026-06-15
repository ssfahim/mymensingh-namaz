// Mymensingh prayer times — simple, offline-first, 12-hour.
// Hanafi (school=1) + Karachi method (1) = the Islamic Foundation Bangladesh standard.
// All "now" logic uses Asia/Dhaka time, NOT the device's timezone, so the next-prayer
// countdown is correct even when the phone is set to another country.

// The Islamic Foundation Bangladesh (IFB) — the timetable the whole country follows —
// does NOT compute per-city astronomy. It publishes ONE master table for DHAKA and
// derives every district by adding a fixed whole-minute "correction". So we anchor the
// calculation to Dhaka's coordinates and then apply Mymensingh's official correction
// (+2 min on every waqt). Calculating at Mymensingh's own coordinates instead — which is
// what this app used to do — injected a spurious latitude-driven swing (Mymensingh is
// ~0.94° north of Dhaka), pushing times up to ~3-4 min off Dhaka at the solstices and
// flipping sign by season. Anchoring to Dhaka removes that drift and reproduces the
// official IFB schedule, where Mymensingh is a steady ~2 min behind Dhaka.
// Per-waqt offsets (minutes) calibrated to MATCH the Grameenphone "Ibadah" timer for
// Mymensingh — the app the user actually checks. GP serves the Islamic Foundation
// Bangladesh table and, notably, shows Mymensingh on the *Dhaka* table with NO district
// correction. So we compute raw astronomical times for Dhaka (the IFB anchor) and apply
// these fixed offsets to reproduce exactly what GP displays.
//
// Calibrated against GP Ibadah (location = Mymensingh) on 2026-06-15 — all match to the minute:
//   GP:  Fajr 3:44  Dhuhr 12:02  Asr 4:38  Maghrib 6:51  Isha 8:17
// Order = Aladhan `tune`: Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Sunset, Isha, Midnight.
//   Imsak +5   — Aladhan's Imsak field sits 10 min before Fajr; +5 lands Sehri 3 min before
//                Subah Sadiq (a 6-min Sehri→Fajr gap, the IFB convention). GP Sehri not read off,
//                so inferred — confirm against GP in Ramadan and adjust this one value if needed.
//   Fajr +1, Dhuhr +3, Asr -1, Maghrib +4, Isha +2 — match the GP values above exactly.
//   Sunrise -1 — informational (end of Fajr); GP doesn't show it, set to the IFB sunrise.
// Twilight prayers (Fajr/Sehri/Isha) may differ ~1 min from GP across the year because
// Aladhan's astronomical engine differs slightly from the one behind the IFB table.
const GP_TUNE = "5,1,-1,3,-1,4,0,2,0";

const CONFIG = {
    latitude: 23.8103,   // Dhaka — IFB calculation anchor (GP serves the Dhaka-based IFB table)
    longitude: 90.4125,  // Dhaka
    method: 1,           // University of Islamic Sciences, Karachi (18°/18°) — IFB / Bangladesh standard
    school: 1,           // Hanafi (later Asr)
    tz: "Asia/Dhaka",
    tune: GP_TUNE,
};

const ROWS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const FARD = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// Bengali names alongside the English (for a Bangladeshi reader).
const BN = {
    Suhoor: "সেহরি শেষ",
    Fajr: "ফজর",
    Sunrise: "সূর্যোদয়",
    Dhuhr: "জোহর",
    Asr: "আসর",
    Maghrib: "মাগরিব",
    Isha: "এশা",
};

const pad = (n) => String(n).padStart(2, "0");
const sanitize = (v) => (v || "").split(" ")[0].trim();      // "04:12 (+06)" -> "04:12"
const secOf = (hhmm) => { const [h, m] = sanitize(hhmm).split(":").map(Number); return h * 3600 + m * 60; };

function to12(hhmm) {
    const clean = sanitize(hhmm);
    const parts = clean.split(":");
    if (parts.length < 2) return clean || "--:--";
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const ap = h < 12 ? "AM" : "PM";
    let hh = h % 12; if (hh === 0) hh = 12;
    return `${hh}:${pad(m)} ${ap}`;
}

// Current time in Asia/Dhaka, independent of the device's timezone.
function dhakaNow() {
    const f = new Intl.DateTimeFormat("en-GB", {
        timeZone: CONFIG.tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const p = {};
    for (const part of f.formatToParts(new Date())) p[part.type] = part.value;
    let hour = parseInt(p.hour, 10); if (hour === 24) hour = 0;
    return {
        year: +p.year, month: +p.month, day: +p.day,
        sec: hour * 3600 + (+p.minute) * 60 + (+p.second),
        key: `${p.day}-${p.month}-${p.year}`,
    };
}

function tomorrowKey(now) {
    const base = new Date(Date.UTC(now.year, now.month - 1, now.day));
    base.setUTCDate(base.getUTCDate() + 1);
    return `${pad(base.getUTCDate())}-${pad(base.getUTCMonth() + 1)}-${base.getUTCFullYear()}`;
}

function monthUrl(year, month) {
    return `https://api.aladhan.com/v1/calendar/${year}/${month}` +
        `?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}` +
        `&method=${CONFIG.method}&school=${CONFIG.school}&timezonestring=${CONFIG.tz}` +
        `&tune=${CONFIG.tune}`;
}
// Bump this version whenever the calculation changes (anchor / tune / margins) so
// returning users refetch instead of reading stale cached times. v4 = calibrated to
// match the Grameenphone Ibadah timer for Mymensingh.
const cacheKey = (y, m) => `namaz_v4_${y}_${m}`;

async function getMonth(year, month) {
    const key = cacheKey(year, month);
    const cached = localStorage.getItem(key);
    if (cached) { try { return { data: JSON.parse(cached), fromCache: true }; } catch (e) {} }
    const res = await fetch(monthUrl(year, month));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = (await res.json()).data;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
    return { data, fromCache: false };
}

const findByKey = (monthData, key) => monthData.find((d) => d.date.gregorian.date === key) || null;
const hijriStr = (day) => `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year} AH`;

function fmtCountdown(totalSec) {
    let s = Math.max(0, totalSec);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `in ${h}h ${pad(m)}m` : `in ${m}m ${pad(sec)}s`;
}

let TODAY = null;
let TOMORROW_FAJR = null;

function addRow(container, name, label, bn, timeStr, current) {
    const row = document.createElement("div");
    row.className = "row" + (current ? " current" : "");
    row.innerHTML = `<span class="name">${label}<small class="bn">${bn || ""}</small></span>` +
        `<span class="time">${to12(timeStr)}</span>`;
    container.appendChild(row);
}

function render() {
    if (!TODAY) return;
    const t = TODAY.timings;
    const now = dhakaNow();

    let currentName = null, nextName = null, nextTimeStr = null, remaining = 0;
    for (const name of FARD) if (secOf(t[name]) <= now.sec) currentName = name;
    for (const name of FARD) {
        if (secOf(t[name]) > now.sec) { nextName = name; nextTimeStr = t[name]; remaining = secOf(t[name]) - now.sec; break; }
    }
    if (nextName === null) { // after Isha → tomorrow's Fajr
        nextName = "Fajr";
        nextTimeStr = TOMORROW_FAJR || t["Fajr"];
        remaining = (86400 - now.sec) + secOf(nextTimeStr);
    }

    const nextEl = document.getElementById("next");
    nextEl.hidden = false;
    document.getElementById("nextName").textContent = `${nextName} ${BN[nextName] || ""} · ${to12(nextTimeStr)}`;
    document.getElementById("nextCountdown").textContent = fmtCountdown(remaining);

    const container = document.getElementById("times");
    container.innerHTML = "";
    // Suhoor (Sehri) end first — important in Bangladesh.
    addRow(container, "Suhoor", "Suhoor ends", BN.Suhoor, t["Imsak"], false);
    for (const name of ROWS) addRow(container, name, name, BN[name], t[name], name === currentName);
}

const setStatus = (msg) => { document.getElementById("status").textContent = msg || ""; };

async function init() {
    const now = dhakaNow();
    document.getElementById("dateGregorian").textContent =
        new Date().toLocaleDateString("en-GB", { timeZone: CONFIG.tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

    try {
        const { data, fromCache } = await getMonth(now.year, now.month);
        const day = findByKey(data, now.key);
        if (!day) { setStatus("Could not find today in the calendar."); return; }
        TODAY = day;
        document.getElementById("dateHijri").textContent = `Today: ${hijriStr(day)}`;

        const tDay = findByKey(data, tomorrowKey(now));
        TOMORROW_FAJR = tDay ? tDay.timings["Fajr"] : null;
        document.getElementById("dateHijriTomorrow").textContent = tDay ? `Tomorrow: ${hijriStr(tDay)}` : "";

        setStatus(fromCache ? "Showing saved times (works offline)." : "");
        render();
        setInterval(render, 1000);
    } catch (e) {
        setStatus("Connect to the internet once to load this month's times. They'll then work offline.");
    }
}

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

init();
