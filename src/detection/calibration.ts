import type {
  CalibrationProfile,
  CalibrationStatus,
  FaceObservation,
} from './types'

const positioningDurationMs = 900
const openSampleDurationMs = 2200
const requiredBlinks = 3

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const median = (values: number[]): number => {
  if (!values.length) return 0
  const ordered = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(ordered.length / 2)
  return ordered.length % 2 === 0
    ? (ordered[midpoint - 1] + ordered[midpoint]) / 2
    : ordered[midpoint]
}

const thresholdsForEye = (open: number, peak: number) => {
  const usefulPeak = Math.max(peak, open + 0.28)
  const range = usefulPeak - open
  const closeThreshold = clamp(open + Math.max(0.16, range * 0.52), open + 0.1, 0.88)
  const openThreshold = clamp(open + Math.max(0.055, range * 0.24), open + 0.035, closeThreshold - 0.05)

  return { closeThreshold, openThreshold }
}

export const defaultCalibrationProfile = (): CalibrationProfile => ({
  openLeft: 0.08,
  openRight: 0.08,
  closeThresholdLeft: 0.5,
  closeThresholdRight: 0.5,
  openThresholdLeft: 0.24,
  openThresholdRight: 0.24,
})

const guidanceForPhase = (phase: CalibrationStatus['phase']): string => {
  switch (phase) {
    case 'positioning':
      return 'Center your face and hold still in good light.'
    case 'eyes-open':
      return 'Keep both eyes naturally open and look toward the screen.'
    case 'blink-practice':
      return 'Blink naturally three times, fully reopening your eyes each time.'
    case 'complete':
      return 'Calibration complete.'
  }
}

export class CalibrationController {
  private phase: CalibrationStatus['phase'] = 'positioning'
  private goodSinceMs: number | null = null
  private phaseStartedMs: number | null = null
  private openLeftSamples: number[] = []
  private openRightSamples: number[] = []
  private openLeft = 0.08
  private openRight = 0.08
  private blinkLatched = false
  private completedBlinks = 0
  private currentPeakLeft = 0
  private currentPeakRight = 0
  private blinkPeaksLeft: number[] = []
  private blinkPeaksRight: number[] = []
  private profile: CalibrationProfile | null = null

  update(observation: FaceObservation): CalibrationStatus {
    if (this.phase === 'complete') return this.status(1)

    if (observation.quality !== 'good') {
      if (this.phase === 'positioning') this.goodSinceMs = null
      if (this.phase === 'eyes-open') {
        this.phaseStartedMs = null
        this.openLeftSamples = []
        this.openRightSamples = []
      }
      if (this.phase === 'blink-practice') {
        this.blinkLatched = false
        this.currentPeakLeft = 0
        this.currentPeakRight = 0
      }
      return this.status(
        this.phase === 'blink-practice' ? this.completedBlinks / requiredBlinks : 0,
      )
    }

    if (this.phase === 'positioning') {
      this.goodSinceMs ??= observation.timestampMs
      const elapsed = observation.timestampMs - this.goodSinceMs
      if (elapsed >= positioningDurationMs) {
        this.phase = 'eyes-open'
        this.phaseStartedMs = observation.timestampMs
        return this.status(0)
      }
      return this.status(clamp(elapsed / positioningDurationMs, 0, 1))
    }

    if (this.phase === 'eyes-open') {
      this.phaseStartedMs ??= observation.timestampMs
      this.openLeftSamples.push(observation.leftBlink)
      this.openRightSamples.push(observation.rightBlink)
      const elapsed = observation.timestampMs - this.phaseStartedMs

      if (elapsed >= openSampleDurationMs && this.openLeftSamples.length >= 12) {
        this.openLeft = median(this.openLeftSamples)
        this.openRight = median(this.openRightSamples)
        this.phase = 'blink-practice'
        this.phaseStartedMs = observation.timestampMs
        return this.status(0)
      }

      return this.status(clamp(elapsed / openSampleDurationMs, 0, 1))
    }

    const candidateCloseLeft = clamp(this.openLeft + 0.24, 0.32, 0.68)
    const candidateCloseRight = clamp(this.openRight + 0.24, 0.32, 0.68)
    const candidateOpenLeft = this.openLeft + 0.11
    const candidateOpenRight = this.openRight + 0.11
    const bothClosed =
      observation.leftBlink >= candidateCloseLeft && observation.rightBlink >= candidateCloseRight

    if (bothClosed) {
      this.blinkLatched = true
      this.currentPeakLeft = Math.max(this.currentPeakLeft, observation.leftBlink)
      this.currentPeakRight = Math.max(this.currentPeakRight, observation.rightBlink)
    } else if (
      this.blinkLatched &&
      observation.leftBlink <= candidateOpenLeft &&
      observation.rightBlink <= candidateOpenRight
    ) {
      this.blinkLatched = false
      this.completedBlinks += 1
      this.blinkPeaksLeft.push(this.currentPeakLeft)
      this.blinkPeaksRight.push(this.currentPeakRight)
      this.currentPeakLeft = 0
      this.currentPeakRight = 0

      if (this.completedBlinks >= requiredBlinks) {
        const leftThresholds = thresholdsForEye(this.openLeft, median(this.blinkPeaksLeft))
        const rightThresholds = thresholdsForEye(this.openRight, median(this.blinkPeaksRight))
        this.profile = {
          openLeft: this.openLeft,
          openRight: this.openRight,
          closeThresholdLeft: leftThresholds.closeThreshold,
          closeThresholdRight: rightThresholds.closeThreshold,
          openThresholdLeft: leftThresholds.openThreshold,
          openThresholdRight: rightThresholds.openThreshold,
        }
        this.phase = 'complete'
      }
    }

    return this.status(this.completedBlinks / requiredBlinks)
  }

  private status(progress: number): CalibrationStatus {
    return {
      phase: this.phase,
      progress: clamp(progress, 0, 1),
      completedBlinks: this.completedBlinks,
      requiredBlinks,
      guidance: guidanceForPhase(this.phase),
      profile: this.profile,
    }
  }
}
