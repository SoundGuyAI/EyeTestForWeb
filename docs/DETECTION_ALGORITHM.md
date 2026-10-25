# Eye detection algorithm

## 1. Goal

Convert noisy frame-level face-landmarker output into a stable statement about each eye and the combined eye state. The algorithm must avoid treating missing or poor-quality data as closed eyes.

## 2. Inputs

For every accepted video sample:

- Left eye-blink blendshape score
- Right eye-blink blendshape score
- Face detection/presence confidence
- Selected landmarks for pose, eye visibility, and scale checks
- Timestamp from a monotonic clock
- Inference duration and recent effective sample rate

## 3. Signal-quality gate

An observation is usable only when:

- Exactly one face is tracked
- Both eyes are sufficiently visible
- Face scale is within the calibrated operating range
- Head yaw, pitch, and roll remain within tested limits
- The frame is not stale
- The effective sample rate is sufficient for timing decisions

Lighting quality should be estimated conservatively from the face region. Quality failures transition to `low-quality` or `no-face`, never `closed`.

## 4. Calibration

Calibration records a short baseline for the current user, camera, position, and lighting.

Suggested sequence:

1. Hold eyes naturally open for two to three seconds.
2. Blink normally three to five times.
3. Optionally hold both eyes closed for one second.
4. Reject and repeat calibration if pose or signal quality is unstable.

Store calibration only in memory for the MVP. Derived thresholds may later be saved locally with explicit controls, but no image or identifying face representation should be stored.

## 5. Filtering

Maintain a short timestamped buffer per eye. Candidate filters include an exponential moving average or a small median-plus-exponential pipeline.

Filtering must be time-based rather than assuming a fixed frame rate. Long gaps clear or invalidate temporal state.

## 6. Hysteresis

Use separate thresholds:

- `closeThreshold`: score above this value is a candidate closure.
- `openThreshold`: score below this lower value is a candidate reopening.

The gap prevents oscillation when a score sits near a boundary. Thresholds begin with tested defaults but are adjusted from calibration within safe bounds.

## 7. State machine

```text
UNAVAILABLE
    -> OPEN after stable usable observations

OPEN
    -> CLOSING when one or both scores cross close thresholds

CLOSING
    -> OPEN if scores recover quickly
    -> BLINKING after a minimum closure duration
    -> CLOSED after the sustained-closure delay

BLINKING
    -> OPEN after stable reopening
    -> CLOSED if closure continues

CLOSED
    -> OPENING when both scores cross open thresholds

OPENING
    -> OPEN after a stable reopening period
    -> CLOSED if closure resumes

Any state
    -> UNAVAILABLE when face or signal quality is lost
```

Internally, each eye also has an independent open/closed candidate state. This supports winks and partial occlusion without confusing them with both-eyes closure.

## 8. Timing rules

All durations are measured from timestamps, not frame counts.

Initial values will be tuned through device testing:

- Debounce duration for candidate closure
- Typical-blink minimum and maximum windows
- Sustained-closure alert delay
- Stable-reopen duration
- Maximum allowed observation gap

The alert delay should be user-configurable within a sensible, documented range. Safety-sensitive uses are explicitly out of scope.

## 9. Alert policy

- Trigger only from the stable `closed` state.
- Continue the visual alert until stable reopening or session stop.
- Rate-limit audio repetition.
- Do not alert when the face is lost.
- Clearly distinguish `Face unavailable` from `Eyes closed`.
- Preserve a silent mode.

## 10. Testing strategy

The state machine should accept recorded observation sequences without requiring a live camera. Unit cases include:

- Single normal blink
- Rapid repeated blinks
- Long blink transitioning to sustained closure
- Left and right wink
- Face loss while eyes are open
- Face loss during a closure
- Threshold noise
- Low or irregular sample rate
- Calibration with glasses
- Reopening immediately before the alert threshold

Live tests should record derived numeric observations only when the tester opts in. Raw video is not required for routine automated tests.
