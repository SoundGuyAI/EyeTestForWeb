# Product specification

## 1. Product vision

Create an accessible, privacy-first web app that uses the device's front camera to recognize eye closure in real time. It should require no installation, work well on iPhone Safari, and also support modern Android and desktop browsers.

The initial product solves one problem well: reliably separating normal blinks from sustained closure while clearly communicating whether the camera signal is usable.

## 2. Target users

- People who want a hands-free awareness or focus aid
- Developers and researchers evaluating browser-based face and eye tracking
- Users who need configurable visual or audio feedback when their eyes remain closed

The initial release is not intended for diagnosis, treatment, driver monitoring, or safety-critical supervision.

## 3. MVP user journey

1. The user opens the GitHub Pages site.
2. A welcome screen explains local camera processing and limitations.
3. The user taps **Start camera** and responds to the browser permission request.
4. The app guides the user into a usable position and lighting condition.
5. A short calibration records eyes-open behavior and several natural blinks.
6. The tracking screen shows `Eyes open`, `Blink`, `Eyes closed`, or `Face unavailable`.
7. Sustained closure beyond the configured delay triggers a visual alert and, if enabled, an audio alert.
8. The user can pause, recalibrate, change alert settings, or end the session.

## 4. MVP features

### Required

- Front-camera capture on supported mobile and desktop browsers
- Single-face tracking
- Separate left- and right-eye measurements
- Open, blink, wink/one-eye-closed, sustained-closed, and unavailable states
- Per-user calibration
- Adjustable sustained-closure delay
- Visual alert
- Optional audio alert initialized by the user's start gesture
- Face position and signal-quality guidance
- Local-only processing
- Responsive portrait and landscape layout
- Debug panel for raw scores, thresholds, timing, and frame rate
- Graceful recovery from camera interruption and backgrounding

### Optional for the first public beta

- Blink count and session duration
- High-contrast mode
- Screen-reader status announcements with a controlled cadence
- Installable PWA manifest after standalone iPhone behavior is tested
- Anonymous, opt-in performance metrics containing no camera images or biometric templates

## 5. Later respiration features

Respiration work is a separate research track, not an automatic extension of the eye detector.

Potential outputs include:

- Estimated breaths per minute
- Per-breath inhale/exhale cycle timing when confidence permits
- Rhythm regularity and short-term variation
- Pause or unusually long-cycle flags stated as observations, not diagnoses
- Signal-quality score and reasons for low confidence
- Guided measurement mode lasting approximately 30–60 seconds
- Trend view for a completed session

Potential camera signals include subtle head/face motion, upper-chest or shoulder motion when visible, and remote photoplethysmography-derived respiratory components. A multimodal estimate can compare or fuse these signals instead of trusting one channel.

Respiration results must remain labeled **experimental** until validated against a respiratory belt or another accepted reference across devices, lighting, motion, skin tones, ages, glasses, facial hair, and relevant health conditions.

## 6. Non-goals

- Identifying a person
- Saving face embeddings
- Uploading or recording camera video by default
- Diagnosing sleep apnea, respiratory distress, neurological disease, or fatigue
- Claiming clinical accuracy without a formal validation and regulatory plan
- Monitoring a driver or machinery operator in the MVP
- Supporting multiple simultaneous faces

## 7. Success criteria

### Eye monitoring

- The camera starts after a user gesture on current iPhone Safari.
- Normal blinks do not trigger sustained-closure alerts in ordinary indoor conditions.
- Loss of the face is never classified as closed eyes.
- Eye-state output is stable and does not rapidly oscillate near a threshold.
- The user receives clear instructions when pose, distance, lighting, or frame rate is inadequate.
- The application remains usable at a target processing rate of 15–30 frames per second on target devices.

### GitHub Pages

- A push to `main` builds the application and deploys the `dist` directory through GitHub Actions.
- All JavaScript, CSS, model, and WebAssembly URLs work below `/EyeTestForWeb/`.
- Reloading any supported application URL does not produce a 404.
- No runtime server, secret, or server-side API is required.

## 8. Safety language

Every release that exposes physiological estimates must state:

- Results may be wrong because of lighting, motion, camera quality, positioning, or individual differences.
- The application is not emergency monitoring.
- Users should seek professional help based on symptoms, not wait for or rely on an app result.
