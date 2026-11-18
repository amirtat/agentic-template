# PWA (install to the home screen)

Read only when the owner answered yes to the PWA question in the interview.

## Product rule
Add this line to "Product rules" in `CLAUDE.md`:

- **Installable (PWA).** The app has a web app manifest and a service worker. The service worker caches only the app shell and static build files, never API responses, personal data or signed-in pages. No offline mode unless a spec asks for one; when offline, the app shows a short message from the strings file. When a new version is deployed, the user sees a "new version available, refresh" prompt; the app never reloads itself in the middle of a task.

## Baseline
- **React + Vite profiles:** `npm i -D vite-plugin-pwa`. In `vite.config.js` add `VitePWA` with:
  - `registerType: 'prompt'`.
  - `workbox.globPatterns` for the built shell only (`**/*.{js,css,html,svg,png,woff2}`) and no `runtimeCaching` for the API.
  - `workbox.navigateFallbackDenylist: [/^\/api\//, /^\/__\//]`. The `/__/` paths are Firebase's own (including the sign-in handler `/__/auth/handler`); serving them from the cache breaks sign-in.
  - The manifest below.
- **Manifest:** `name` and `short_name` in Hebrew (from the strings file values), `lang: 'he'`, `dir: 'rtl'`, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `theme_color` and `background_color` matching the tokens file, and icons in `public/icons/`: 192px, 512px and a 512px `maskable`. Also a 180px `apple-touch-icon` linked from the root HTML, and a `theme-color` meta tag.
- **Icons:** until the owner supplies a logo, create simple placeholder icons (the app's initials on the primary color) and list them as a to-do.
- **Update prompt:** one small component using `useRegisterSW` from `virtual:pwa-register/react`, with its text in the strings file. It is keyboard reachable and announced to screen readers (a polite live region).
- **Static profile:** a hand-written `site/manifest.webmanifest` with the same fields, and a small `site/sw.js` that precaches the shell under a versioned cache name and deletes old caches on activate. Register it from the main script.
- **Caching headers:** serve the service worker file and the manifest with `Cache-Control: no-cache` (Firebase: `headers` in `firebase.json`; Netlify: `_headers`), so updates reach users.

## Tests
- E2E, both projects: the root HTML links the manifest, and the manifest loads with `lang` `he`, `dir` `rtl`, `display` `standalone` and its icons.
- The service worker does not run on the dev server. Add a Playwright project `pwa` (desktop only) with its own `webServer` running a production build and preview (`npm run build && npm run preview`). It checks that a service worker registers and that a request under `/api/` is not answered from the cache.

## Owner notes
Add to the final report:
- Replace the placeholder icons with real ones (512px square logo on a solid background works best).
- How users install: Android and desktop Chrome offer an install button or menu item. iPhone: open in Safari, then Share and "Add to Home Screen". It is worth a short line of instructions inside the app.
- Push notifications are not included. On iPhone they work only for installed apps, and they need their own spec.
