import type {
  CalibrationProfile,
  EyeMonitorOutput,
  EyeState,
  FaceObservation,
} from './types'

interface EyeMonitorOptions {
  alertDelayMs: number
  smoothingTimeConstantMs?: number
  minimumBlinkMs?: number
  maximumGapMs?: number
}

export class EyeMonitor {
  private alertDelayMs: number
  private readonly smoothingTimeConstantMs: number
  private readonly minimumBlinkMs: number
  private readonly maximumGapMs: number
  private lastTimestampMs: number | null = null
  private smoothedLeft = 0
  private smoothedRight = 0
  private leftClosed = false
  private rightClosed = false
  private bothClosedSinceMs: number | null = null
  private previousState: EyeState = 'unavailable'
  private blinkCount = 0
  private sustainedClosureCount = 0

  constructor(
    private readonly profile: CalibrationProfile,
    options: EyeMonitorOptions,
  ) {
    this.alertDelayMs = options.alertDelayMs
    this.smoothingTimeConstantMs = options.smoothingTimeConstantMs ?? 75
    this.minimumBlinkMs = options.minimumBlinkMs ?? 55
    this.maximumGapMs = options.maximumGapMs ?? 500
  }

  setAlertDelay(alertDelayMs: number) {
    this.alertDelayMs = alertDelayMs
  }

  update(observation: FaceObservation): EyeMonitorOutput {
    if (observation.quality !== 'good') {
      this.resetTransientState()
      return this.output('unavailable', 0)
    }

    const elapsed =
      this.lastTimestampMs === null ? 0 : observation.timestampMs - this.lastTimestampMs
    const resetSmoothing = this.lastTimestampMs === null || elapsed <= 0 || elapsed > this.maximumGapMs
    this.lastTimestampMs = observation.timestampMs

    if (resetSmoothing) {
      this.smoothedLeft = observation.leftBlink
      this.smoothedRight = observation.rightBlink
    } else {
      const alpha = 1 - Math.exp(-elapsed / this.smoothingTimeConstantMs)
      this.smoothedLeft += alpha * (observation.leftBlink - this.smoothedLeft)
      this.smoothedRight += alpha * (observation.rightBlink - this.smoothedRight)
    }

    this.leftClosed = this.applyHysteresis(
      this.leftClosed,
      this.smoothedLeft,
      this.profile.closeThresholdLeft,
      this.profile.openThresholdLeft,
    )
    this.rightClosed = this.applyHysteresis(
      this.rightClosed,
      this.smoothedRight,
      this.profile.closeThresholdRight,
      this.profile.openThresholdRight,
    )

    const bothClosed = this.leftClosed && this.rightClosed
    let closureDurationMs = 0
    let nextState: EyeState

    if (bothClosed) {
      this.bothClosedSinceMs ??= observation.timestampMs
      closureDurationMs = observation.timestampMs - this.bothClosedSinceMs
      nextState =
        closureDurationMs >= this.alertDelayMs
          ? 'closed'
          : closureDurationMs >= this.minimumBlinkMs
            ? 'blinking'
            : 'open'
    } else {
      if (this.bothClosedSinceMs !== null) {
        const completedDuration = observation.timestampMs - this.bothClosedSinceMs
        if (completedDuration >= this.minimumBlinkMs && completedDuration < this.alertDelayMs) {
          this.blinkCount += 1
        }
      }
      this.bothClosedSinceMs = null
      nextState = this.leftClosed ? 'left-closed' : this.rightClosed ? 'right-closed' : 'open'
    }

    if (nextState === 'closed' && this.previousState !== 'closed') {
      this.sustainedClosureCount += 1
    }

    return this.output(nextState, closureDurationMs)
  }

  private applyHysteresis(
    currentlyClosed: boolean,
    score: number,
    closeThreshold: number,
    openThreshold: number,
  ) {
    return currentlyClosed ? score > openThreshold : score >= closeThreshold
  }

  private resetTransientState() {
    this.lastTimestampMs = null
    this.leftClosed = false
    this.rightClosed = false
    this.bothClosedSinceMs = null
  }

  private output(state: EyeState, closureDurationMs: number): EyeMonitorOutput {
    const stateChanged = state !== this.previousState
    const alertStarted = state === 'closed' && this.previousState !== 'closed'
    this.previousState = state

    return {
      state,
      smoothedLeft: this.smoothedLeft,
      smoothedRight: this.smoothedRight,
      closureDurationMs,
      blinkCount: this.blinkCount,
      sustainedClosureCount: this.sustainedClosureCount,
      alerting: state === 'closed',
      stateChanged,
      alertStarted,
    }
  }
}
