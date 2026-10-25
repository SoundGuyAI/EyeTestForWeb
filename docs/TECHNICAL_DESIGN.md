# Technical design

## 1. Architecture summary

EyeTestForWeb will be a static single-page application.

```text
Camera -> frame scheduler -> face landmarker -> feature extractor
       -> signal-quality gate -> eye state machine -> UI and alerts
       -> optional respiration signal buffers in later phases
```

No backend is needed for the MVP. Model inference, calibration, state estimation, and session statistics remain in the browser.

## 2. Technology choices

### React, TypeScript, and Vite

React provides component organization for permission, calibration, tracking, settings, and error states. TypeScript makes detector results and state-machine transitions explicit. Vite creates static production output suitable for GitHub Pages.

The future Vite configuration must use a repository-aware base URL:

```ts
export default defineConfig({
  base: '/EyeTestForWeb/',
})
```

Asset references should use imports or `import.meta.env.BASE_URL`; code must not assume the app is hosted at `/`.

### MediaPipe Tasks Vision

Face Landmarker provides face landmarks and facial blendshape scores, including left and right eye-blink coefficients. Only one face will be requested for the MVP to reduce ambiguity and processing cost.

The model and WebAssembly files will be pinned to reviewed versions and preferably copied into the built site rather than fetched from an uncontrolled CDN at runtime.

## 3. Browser camera lifecycle

1. Wait for an explicit **Start camera** gesture.
2. Request `video` only, preferring `facingMode: 'user'`.
3. Attach the stream to a muted video element with `playsInline` and autoplay enabled after permission is granted.
4. Select a moderate input resolution before maximizing detail.
5. Start inference only when video dimensions and metadata are ready.
6. Suspend inference when the page becomes hidden.
7. Resume carefully and verify that camera tracks remain live.
8. Stop all media tracks when the session ends or the component is disposed.

The application requires HTTPS in production. GitHub Pages supplies HTTPS for its standard domain.

## 4. Processing loop

- Use `requestVideoFrameCallback` when available and a throttled animation-frame fallback otherwise.
- Do not run a second inference while the previous frame is still being processed.
- Target 15–30 inference samples per second rather than processing every camera frame.
- Track inference latency and reduce sampling frequency when the device cannot keep up.
- Keep UI rendering separate from raw detector frequency.
- Move filtering and respiration spectral analysis to a Web Worker when profiling shows a benefit.

## 5. Application modules

Proposed source layout:

```text
src/
  app/
  camera/
  detection/
    faceLandmarker.ts
    eyeFeatures.ts
    eyeStateMachine.ts
    calibration.ts
    quality.ts
  respiration/
    motionSignal.ts
    colorSignal.ts
    spectralAnalysis.ts
    respirationQuality.ts
  audio/
  components/
  hooks/
  workers/
  test/
public/
  models/
  wasm/
```

The respiration directory may initially contain interfaces and recorded-data experiments only. It should not increase MVP startup cost.

## 6. Core data contracts

```ts
type EyeState =
  | 'initializing'
  | 'no-face'
  | 'low-quality'
  | 'open'
  | 'blinking'
  | 'left-closed'
  | 'right-closed'
  | 'closed';

interface EyeObservation {
  timestampMs: number;
  leftBlink: number;
  rightBlink: number;
  faceConfidence: number;
  quality: SignalQuality;
}

interface RespirationEstimate {
  timestampMs: number;
  breathsPerMinute: number | null;
  confidence: number;
  rhythmRegularity: number | null;
  signalSource: 'face-motion' | 'upper-body-motion' | 'rppg' | 'fused';
  usableWindowSeconds: number;
}
```

## 7. GitHub Pages deployment

The project can run on GitHub Pages because it is entirely client-side and builds to static files.

Planned workflow:

1. Trigger on pushes to `main` and manual dispatch.
2. Check out the repository.
3. Install dependencies with a lockfile-aware command.
4. Run type checking, unit tests, and the production build.
5. Upload `dist` with `actions/upload-pages-artifact`.
6. Deploy using `actions/deploy-pages`.

Repository Settings -> Pages must use **GitHub Actions** as the source. The workflow needs `pages: write` and `id-token: write` permissions.

The first implementation should avoid path-based client-side routes. If routes are later added, use hash routing or include an appropriate GitHub Pages fallback strategy.

## 8. Offline and PWA strategy

PWA support is deferred until the normal browser experience is reliable. When added:

- Cache the application shell, model, and WebAssembly assets.
- Version caches and clean old model files.
- Do not cache camera frames or session signals without explicit design approval.
- Test permissions, audio, updates, and camera recovery in iPhone Home Screen mode separately.

## 9. Security and dependency policy

- Pin dependencies with a committed lockfile.
- Use Dependabot or equivalent update review.
- Avoid dynamic remote scripts.
- Apply a restrictive Content Security Policy where GitHub Pages behavior permits.
- Do not include secrets; all repository and Pages assets are public.
- Treat detector output as sensitive transient data even when it never leaves the device.

## 10. References

- GitHub Pages custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Vite static deployment: https://vite.dev/guide/static-deploy.html
- MediaPipe Face Landmarker for Web: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
- Media capture security: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
