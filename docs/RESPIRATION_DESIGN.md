# Respiration research and design plan

## 1. Status

Respiration analysis is a later experimental feature. It should be developed after the eye-monitoring MVP has stable camera handling, face tracking, timing, and quality assessment.

Camera-based respiration estimates can be produced from subtle motion and color variation, but performance is sensitive to voluntary movement, lighting, camera compression, framing, and device-specific processing. Published studies are promising but do not remove the need to validate this implementation.

## 2. Proposed user experience

Respiration measurement should use a guided session rather than claim an instant continuous value.

1. Ask the user to place the phone on a stable surface.
2. Frame the face and, when possible, shoulders or upper chest.
3. Confirm adequate light, distance, pose, and low motion.
4. Collect a warm-up period followed by a 30–60 second usable window.
5. Show progress and quality feedback without displaying a fluctuating rate too early.
6. Present estimated breathing rate, confidence, usable duration, and rhythm visualization.
7. Explain that the result is experimental and not a diagnosis.

## 3. Candidate signals

### A. Facial motion

Track stabilized landmark or region movement associated with breathing. Remove global head translation and rotation before extracting small periodic components.

Advantages:

- Reuses face landmarks
- Does not depend entirely on skin-color variation

Risks:

- Talking, swallowing, posture changes, and expression create stronger motion
- Small camera movement can overwhelm the signal

### B. Upper-body motion

When shoulders or upper chest are visible, estimate vertical or expansion-related motion using optical flow or tracked regions.

Advantages:

- Directly related to breathing mechanics
- Can complement weak facial signals

Risks:

- Requires wider framing than eye monitoring
- Clothing and posture affect visibility
- Handheld-phone motion is a major confounder

### C. Remote photoplethysmography-derived respiration

Extract temporal color signals from stable skin regions such as the cheeks and forehead. Apply detrending, color projection, motion rejection, and respiratory-band analysis.

Advantages:

- Can operate from the face region
- May later support related research into pulse-derived features

Risks:

- Strongly affected by illumination variation, exposure control, motion, compression, and camera differences
- Fairness across skin tones must be measured rather than assumed

### D. Multimodal fusion

Create independent motion and color estimates, score their quality, and combine them only when they agree or when one channel is demonstrably stronger. The output must become unavailable rather than inventing a value when all channels are poor.

## 4. Signal-processing outline

```text
Timestamped frames
  -> face/upper-body regions
  -> stabilization and motion rejection
  -> motion and color time series
  -> detrending and band-limited filtering
  -> spectral and time-domain candidate cycles
  -> per-channel quality scores
  -> fusion
  -> breaths/minute, cycle timing, rhythm metrics, confidence
```

Filtering and spectral calculations must use actual timestamps because browser camera delivery is not perfectly uniform.

## 5. Possible outputs

- `breathsPerMinute`: rate over the accepted analysis window
- `cycleIntervals`: detected breath-to-breath intervals when reliable
- `rhythmRegularity`: descriptive variability metric, not a diagnosis
- `usableWindowSeconds`: amount of accepted data
- `confidence`: calibrated quality score
- `signalSource`: motion, rPPG, upper body, or fused
- `qualityReasons`: motion, lighting, framing, insufficient time, or disagreement

Words such as apnea, distress, normal, abnormal, or disorder must not be produced without a separate clinical and regulatory program.

## 6. Validation plan

### Prototype validation

- Collect synchronized camera data and respiratory-belt reference data with informed participant consent.
- Compare average respiratory rate and individual cycle timing.
- Measure error by device, browser, lighting, distance, pose, motion, skin tone, clothing, facial hair, and glasses.
- Keep training, threshold selection, and final evaluation participants separate.
- Report unavailable-result frequency as well as error on successful results.

### Metrics

- Mean absolute error in breaths per minute
- Root mean square error
- Bias and limits of agreement
- Correlation as a secondary metric, not the sole accuracy claim
- Cycle-detection precision/recall where individual breaths are exposed
- Coverage: percentage of sessions with sufficient signal quality
- Time to first stable estimate

## 7. Performance strategy for browsers

- Downsample regions of interest instead of processing full-resolution frames.
- Perform signal extraction incrementally.
- Run heavier filtering or spectral analysis in a Web Worker.
- Keep bounded circular buffers.
- Avoid bundling large respiration models into the eye-monitoring MVP.
- Profile Safari memory, thermal load, and battery use on physical iPhones.

## 8. Privacy implications

Physiological time series may be sensitive even without saved video. By default:

- Process locally.
- Do not retain raw frames.
- Delete session buffers when the session ends.
- Require explicit opt-in before exporting derived data.
- Document exactly what is exported and in what format.

## 9. Research references

- Multi-ROI mobile RGB monitoring: https://pmc.ncbi.nlm.nih.gov/articles/PMC9002464/
- Motion-based respiratory-rate estimation: https://pubmed.ncbi.nlm.nih.gov/36086435/
- Respiratory-rate estimation from face videos: https://ieeexplore.ieee.org/document/8834499/
- Multimodal facial motion and rPPG: https://sra.samsung.com/publications/multimodal-breathing-rate-estimation-using-facial-motion-and-rppg-from-rgb-camera/
- Hospital-based rPPG respiratory-rate trial: https://www.mdpi.com/2077-0383/11/13/3647
