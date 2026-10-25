# Roadmap

## Phase 0 — Documentation and project setup

- Agree on product scope and safety boundaries
- Establish React, TypeScript, and Vite project
- Configure linting, formatting, tests, and CI
- Configure GitHub Pages deployment under `/EyeTestForWeb/`
- Add model and WebAssembly asset management

Exit condition: an empty application shell deploys successfully to the public Pages URL.

## Phase 1 — Camera and face-tracking prototype

- Camera permission and lifecycle
- Inline mirrored front-camera preview
- Face Landmarker initialization
- Raw left/right blink scores
- Basic pose, scale, and face-presence diagnostics
- On-device performance panel

Exit condition: scores update reliably on physical iPhones and supported desktop browsers.

## Phase 2 — Reliable eye-state engine

- Calibration flow
- Filtering and hysteresis
- Timestamp-based state machine
- Blink, wink, sustained closure, reopening, and unavailable states
- Deterministic unit tests
- Configurable alert delay

Exit condition: agreed test scenarios pass without classifying face loss as closed eyes.

## Phase 3 — User-facing MVP

- Mobile-first interface
- Visual and optional audio alerts
- Quality guidance and recovery states
- Accessibility pass
- Privacy and limitations screens
- Cross-browser testing

Exit condition: public beta can be used without developer tools.

## Phase 4 — Hardening and optional PWA

- Long-session memory and thermal testing
- Adaptive processing rate
- Offline asset caching
- Home Screen behavior testing
- Better diagnostics and compatibility reporting

Exit condition: stable extended sessions on the supported device matrix.

## Phase 5 — Respiration feasibility prototype

- Research-only data capture with reference timing
- Face-motion signal extraction
- Upper-body motion experiment
- rPPG-derived respiration experiment
- Quality scoring and signal rejection
- Offline comparison notebooks or scripts

Exit condition: a written feasibility report identifies which methods merit product implementation.

## Phase 6 — Experimental respiration feature

- Guided 30–60 second measurement
- Fused rate estimate with confidence
- Cycle timing and rhythm visualization
- Explicit unavailable state
- Validation against reference equipment
- Fairness, device, and environmental evaluation

Exit condition: predefined error and coverage targets are met on a held-out validation set. Until then, the feature remains experimental.

## Future possibilities

- Session export controlled by the user
- Additional alert sounds and accessibility modes
- Optional local-only trend history
- Research into pulse-related signals
- Localization
- Custom domain

These possibilities require separate scope, privacy, and validation decisions.
