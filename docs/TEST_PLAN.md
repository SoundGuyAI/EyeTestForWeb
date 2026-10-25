# Test plan

## 1. Test layers

### Unit tests

- Eye-state transitions from timestamped score sequences
- Calibration threshold calculations
- Time-based filters with variable frame intervals
- Quality gating
- Alert rate limiting
- Respiration buffer and spectral utilities when introduced

### Component tests

- Permission and onboarding states
- Calibration instructions and retry behavior
- Tracking status presentation
- Settings and accessibility behavior
- Camera and model error recovery

### Browser integration tests

Use mocked media streams and detector outputs for repeatable automated coverage. Physical-device testing remains mandatory because automation cannot reproduce actual iPhone camera and permission behavior.

### Live-camera tests

- Open eyes and natural blinking
- Sustained closure at different alert delays
- Winks and partial eye occlusion
- Glasses, glare, makeup, facial hair, and varied eyelid shapes
- Bright, dim, uneven, warm, and cool lighting
- Different distances and camera angles
- Head turns and facial expressions
- Talking and chewing
- Camera interruption and tab backgrounding
- Slow devices and thermal throttling

## 2. Browser/device matrix

Minimum release matrix:

- Current iPhone Safari on at least two iPhone generations
- iPhone Safari portrait and landscape
- iPhone Home Screen mode when PWA support is enabled
- Current Chrome on Android
- Current Safari and Chrome on macOS
- Current Chrome and Edge on Windows

Record exact OS and browser versions in test reports.

## 3. Eye-feature acceptance tests

- Camera starts only after user interaction.
- The front camera is preferred.
- Permission denial produces a recoverable explanation.
- No face produces `Face unavailable` rather than `Eyes closed`.
- A normal blink is recognized and does not trigger the sustained alert.
- Closure longer than the configured delay triggers the alert.
- Stable reopening clears the alert.
- One-eye closure does not masquerade as both-eyes closure.
- Threshold noise does not cause visible status flicker.
- Model and WebAssembly assets load from the GitHub Pages repository path.

## 4. Performance tests

Measure on physical target devices:

- Camera startup time
- Model download and initialization time
- Inference latency distribution
- Effective processed frames per second
- Long-task frequency
- Memory growth over 15, 30, and 60 minutes
- Battery consumption and device temperature observations
- Recovery after backgrounding

The app should reduce inference frequency or visual complexity rather than accumulating work.

## 5. Respiration validation tests

Respiration testing requires synchronized reference equipment and a separately approved protocol.

Test conditions should include:

- Resting spontaneous breathing
- Controlled slow and faster breathing within a safe protocol
- Talking and deliberate movement as rejection cases
- Handheld and fixed-phone comparison
- Face-only and face-plus-upper-body framing
- Lighting and distance variation
- Device and browser variation
- Representative skin tones and demographic diversity

Report both accuracy and coverage. Rejecting a low-quality session is preferable to displaying an unsupported value.

## 6. Accessibility tests

- Keyboard operation on desktop
- Visible focus and large touch targets
- Screen-reader labels and non-spamming live regions
- Status conveyed without color alone
- High contrast
- Reduced-motion preference
- Usable text at increased browser zoom and iOS text size

## 7. GitHub Pages checks

- Clean install and build in CI
- Deployment artifact contains `index.html`, bundled assets, model, and WebAssembly files
- Site loads at `/EyeTestForWeb/`
- Direct asset requests return correct MIME types
- No absolute-root asset paths
- Refresh works for every supported URL
- Camera access succeeds over Pages HTTPS
- No secret or source map containing sensitive data is published unintentionally
