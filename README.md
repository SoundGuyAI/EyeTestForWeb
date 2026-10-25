# EyeTestForWeb

EyeTestForWeb is a privacy-first, camera-based web application for real-time eye-state monitoring. The first release will detect a face, distinguish open eyes, normal blinks, and sustained eye closure, and provide a configurable visual or audio alert.

The application is designed for iPhone Safari first and modern mobile and desktop browsers second. Camera frames and derived signals are processed locally in the browser. The MVP does not require a backend.

Later research phases may add contactless breathing analysis, including estimated breathing rate, cycle timing, rhythm regularity, and signal-quality feedback. Those features are experimental and must not be presented as medical measurements until validated against reference equipment across representative users and conditions.

## Planned technology

- React and TypeScript
- Vite for development and static production builds
- MediaPipe Tasks Vision Face Landmarker
- Web APIs such as `getUserMedia`, `requestAnimationFrame`, Web Workers, and the Web Audio API
- Vitest and Playwright for automated testing
- GitHub Actions and GitHub Pages for deployment

All production output will be static HTML, JavaScript, CSS, WebAssembly, and model assets. The repository will configure Vite's base path for `/EyeTestForWeb/`, so the built application can run at:

`https://soundguyai.github.io/EyeTestForWeb/`

## Project documents

- [Product specification](docs/PRODUCT_SPEC.md)
- [Technical design](docs/TECHNICAL_DESIGN.md)
- [Eye detection algorithm](docs/DETECTION_ALGORITHM.md)
- [Respiration research plan](docs/RESPIRATION_DESIGN.md)
- [Privacy principles](docs/PRIVACY.md)
- [Test plan](docs/TEST_PLAN.md)
- [Roadmap](docs/ROADMAP.md)

## Current status

Eye-monitoring MVP implementation. The app opens the front camera, loads MediaPipe Face Landmarker,
calibrates personalized eye thresholds, smooths noisy signals, distinguishes blinks, one-eye closures,
and sustained bilateral closure, and provides configurable visual and sound alerts. Camera frames and
derived signals remain in the browser.

Current features include:

- Guided three-step calibration with a default-threshold fallback
- Time-based filtering, hysteresis, blink counting, and sustained-closure detection
- Configurable 0.5–3 second alert delay
- Optional Web Audio alert initialized from a user gesture
- Preview hiding without stopping local detection
- Recalibration, signal-quality guidance, and developer diagnostics
- Responsive mobile-first monitoring UI

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Useful verification commands:

```bash
npm run lint
npm test
npm run build
```

Camera access requires `localhost` during development or HTTPS in production.

## Prototype asset loading

The first prototype imports application code from the pinned `@mediapipe/tasks-vision` npm package.
At runtime it downloads the matching MediaPipe WebAssembly files from jsDelivr and the official
Face Landmarker model from Google-hosted storage. Future hardening will copy these assets into the
GitHub Pages build so the application can operate without runtime CDN dependencies.

## Important limitation

EyeTestForWeb is initially a wellness and assistive utility, not a medical device. It must not diagnose disease, determine fitness to drive, or replace professional monitoring or emergency care.
