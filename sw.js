// Caches the app shell so the page opens offline. Prayer data itself is cached
// separately in localStorage by app.js.
const CACHE = "namaz-shell-v2";
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
    // Never cache the Aladhan API here (localStorage handles offline data).
    if (url.hostname.includes("aladhan.com")) return;
    e.respondWith(
        caches.match(e.request).then((hit) => hit || fetch(e.request).catch(() => caches.match("./index.html")))
    );
});
