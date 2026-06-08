// Network-first for the app shell so updates appear as soon as the phone is online,
// falling back to cache when offline. Prayer data itself is cached in localStorage.
const CACHE = "namaz-shell-v3";
const SHELL = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./manifest.webmanifest",
    "./icon.svg",
];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);
    if (url.hostname.includes("aladhan.com")) return; // let app.js + localStorage handle data
    if (e.request.method !== "GET") return;
    // Network-first: fetch fresh, update cache; fall back to cache offline.
    e.respondWith(
        fetch(e.request)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
    );
});
