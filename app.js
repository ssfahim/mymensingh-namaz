// Mymensingh prayer times — simple, offline-first, 12-hour.
// Hanafi (school=1) + Karachi method (1) = the Islamic Foundation Bangladesh standard.

const CONFIG = {
    latitude: 24.7471,
    longitude: 90.4203,
    method: 1,      // University of Islamic Sciences, Karachi (18°/18°) — Bangladesh standard
    school: 1,      // Hanafi (later Asr)
    tz: "Asia/Dhaka",
};

// Prayers shown, in order. Sunrise is informational; the 5 fard drive "next prayer".
const ROWS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const FARD = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

const pad = (n) => String(n).padStart(2, "0");
const sanitize = (v) => (v || "").split(" ")[0].trim(); // "04:12 (+06)" -> "04:12"

function to12(hhmm) {
    const clean = sanitize(hhmm);
    const parts = clean.split(":");
    if (parts.length < 2) return clean || "--:--";
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const ap = h < 12 ? "AM" : "PM";
    let hh = h % 12;
    if (hh === 0) hh = 12;
    return `${hh}:${pad(m)} ${ap}`;
}

function monthUrl(year, month) {
    return `https://api.aladhan.com/v1/calendar/${year}/${month}` +
        `?latitude=${CONFIG.latitude}&longitude=${CONFIG.longitude}` +
        `&method=${CONFIG.method}&school=${CONFIG.school}&timezonestring=${CONFIG.tz}`;
}

function cacheKey(year, month) { return `namaz_${year}_${month}`; }

async function getMonth(year, month) {
    const key = cacheKey(year, month);
    const cached = localStorage.getItem(key);
    if (cached) {
        try { return { data: JSON.parse(cached), fromCache: true }; } catch (e) { /* refetch */ }
    }
    const res = await fetch(monthUrl(year, month));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    const data = json.data;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage full, ignore */ }
    return { data, fromCache: false };
}

function findDay(monthData, date) {
    const key = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
    return monthData.find((d) => d.date.gregorian.date === key) || null;
}

function dateAt(base, hhmm) {
    const clean = sanitize(hhmm);
    const [h, m] = clean.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
}

function fmtCountdown(ms) {
    let s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `in ${h}h ${pad(m)}m`;
    return `in ${m}m ${pad(sec)}s`;
}

let TODAY = null;       // today's timings object
let TOMORROW_FAJR = null;

function render() {
    if (!TODAY) return;
    const t = TODAY.timings;
    const now = new Date();

    // Determine current + next fard prayer
    let nextName = null, nextTime = null, currentName = null;
    for (const name of FARD) {
        const at = dateAt(now, t[name]);
        if (at <= now) currentName = name;
        if (at > now && !nextName) { nextName = name; nextTime = at; }
    }
    if (!nextName) {
        // After Isha → tomorrow's Fajr
        const fajr = TOMORROW_FAJR || t["Fajr"];
        const at = dateAt(now, fajr);
        at.setDate(at.getDate() + 1);
        nextName = "Fajr";
        nextTime = at;
    }

    // Next-prayer card
    const nextEl = document.getElementById("next");
    nextEl.hidden = false;
    document.getElementById("nextName").textContent = `${nextName} · ${to12(t[nextName] || (TOMORROW_FAJR || ""))}`;
    document.getElementById("nextCountdown").textContent = fmtCountdown(nextTime - now);

    // Times list
    const container = document.getElementById("times");
    container.innerHTML = "";
    for (const name of ROWS) {
        const row = document.createElement("div");
        row.className = "row" + (name === currentName ? " current" : "");
        const label = name === "Sunrise" ? "Sunrise" : name;
        row.innerHTML = `<span class="name">${label}</span><span class="time">${to12(t[name])}</span>`;
        container.appendChild(row);
    }
}

function setStatus(msg) { document.getElementById("status").textContent = msg || ""; }

async function init() {
    const now = new Date();
    document.getElementById("dateGregorian").textContent = now.toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
    });

    try {
        const { data, fromCache } = await getMonth(now.getFullYear(), now.getMonth() + 1);
        const day = findDay(data, now);
        if (!day) { setStatus("Could not find today in the calendar."); return; }
        TODAY = day;
        document.getElementById("dateHijri").textContent =
            `${day.date.hijri.day} ${day.date.hijri.month.en} ${day.date.hijri.year} AH`;

        // Tomorrow's Fajr (for after-Isha countdown)
        const tmr = new Date(now); tmr.setDate(tmr.getDate() + 1);
        const tDay = findDay(data, tmr);
        TOMORROW_FAJR = tDay ? tDay.timings["Fajr"] : null;

        setStatus(fromCache ? "Showing saved times (offline-ready)." : "");
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
