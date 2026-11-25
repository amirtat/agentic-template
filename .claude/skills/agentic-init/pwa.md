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
- **Manifest:** one manifest only, defined in the `VitePWA` options; the plugin writes the file and links it. Do not also add `public/manifest.webmanifest` or a hand-written `<link rel="manifest">`. Fields: `name` and `short_name` in the primary language (from the strings file values), `lang` and `dir` of the primary language, `start_url: '/'`, `scope: '/'`, `display: 'standalone'`, `theme_color` and `background_color` matching the tokens file, and icons in `public/icons/`: 192px, 512px and a 512px `maskable`. Also a 180px `apple-touch-icon` linked from the root HTML, and a `theme-color` meta tag.
- **Icons:** until the owner supplies a logo, create simple placeholder icons (the app's initials on the primary color) and list them as a to-do. Keep the symbol of the maskable icon inside the central 80% circle, since Android crops it to a circle. Also link an SVG favicon (`<link rel="icon" type="image/svg+xml">`).
- **Update prompt:** one small component using `useRegisterSW` from `virtual:pwa-register/react`, with its text in the strings file. It is keyboard reachable and announced to screen readers (a polite live region). Colors come from the tokens file.
- **Update check:** in `onRegisteredSW(swUrl, registration)`, call `registration.update()` once, every 60 minutes, and on `visibilitychange` when the page becomes visible. Skip it when `navigator.onLine` is false, and always `.catch(() => {})` the promise. Register the interval and the listener once per page (a module-level guard), so a second call (Strict Mode, remount) adds nothing. Unit test it with fake timers.
  <!-- Why: an installed app returns from the background without a page load, so the browser's own check never runs and users stay on the old version for days. -->
- **Static profile:** a hand-written `site/manifest.webmanifest` with the same fields, and a small `site/sw.js` that precaches the shell under a versioned cache name and deletes old caches on activate. Register it from the main script, with the same update check (on visible, hourly, skipped offline).
- **Caching headers:** `Cache-Control: no-cache` for every path, then `public, max-age=31536000, immutable` for the hashed build files only (`/assets/**`), so the page, the service worker, `registerSW.js` and the manifest are always revalidated.
  - Firebase (`headers` in `firebase.json`): rules match the requested path, not the file a rewrite serves, so a rule for `/index.html` never reaches `/some/route`; use `**`. When several rules set the same header, the **last** matching rule wins, so the `/assets/**` rule goes after `**`.
  - Netlify (`_headers`): the same two rules.
  - After the first deploy, check the real values on a preview URL with `curl -sI` for a route, `/sw.js`, one `/assets/` file and an icon.
  <!-- Why: with the order reversed, hashed files lost their long cache; only a curl on the preview showed it. -->

## Tests
- E2E in the `pwa` project (the manifest link is injected only in the production build, so the dev-server projects cannot see it): the built page links the manifest, and the manifest loads with the primary language's `lang` and `dir`, `display` `standalone`, the right name and colors, and its icons. The dev-server projects check only the static tags (`theme-color`, apple-touch icon, favicon).
- The service worker does not run on the dev server. Add a Playwright project `pwa` (desktop only) with its own `webServer` running a production build and preview (`npm run build && npm run preview`). It checks that a service worker registers and that a request under `/api/` is not answered from the cache.
- The `pwa` project is frontend only: no database, no emulators, and its tests never need a real API answer. Say so in a comment at the top of its spec file.
- CI: a separate job `pwa` (build, preview, `npx playwright test --project=pwa`), and exclude that project from the main E2E run. Add a comment in `ci.yml` that the job is frontend only by design.

## Owner notes
Add to the final report:
- Replace the placeholder icons with real ones (512px square logo on a solid background works best).
- How users install: Android and desktop Chrome offer an install button or menu item. iPhone: open in Safari, then Share and "Add to Home Screen". It is worth a short line of instructions inside the app.
- Push notifications are not included. On iPhone they work only for installed apps, and they need their own spec.
