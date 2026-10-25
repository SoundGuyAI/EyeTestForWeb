import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

export type SignalQuality =
  | 'waiting'
  | 'good'
  | 'no-face'
  | 'too-far'
  | 'too-close'
  | 'off-center'

export interface FaceObservation {
  timestampMs: number
  leftBlink: number
  rightBlink: number
  quality: SignalQuality
  faceWidthRatio: number
  faceCenterX: number
  inferenceMs: number
  processedFps: number
  landmarks: NormalizedLandmark[]
}

export interface FaceGeometry {
  faceWidthRatio: number
  faceCenterX: number
}

export type CalibrationPhase = 'positioning' | 'eyes-open' | 'blink-practice' | 'complete'

export interface CalibrationProfile {
  openLeft: number
  openRight: number
  closeThresholdLeft: number
  closeThresholdRight: number
  openThresholdLeft: number
  openThresholdRight: number
}

export interface CalibrationStatus {
  phase: CalibrationPhase
  progress: number
  completedBlinks: number
  requiredBlinks: number
  guidance: string
  profile: CalibrationProfile | null
}

export type EyeState =
  | 'unavailable'
  | 'open'
  | 'blinking'
  | 'left-closed'
  | 'right-closed'
  | 'closed'

export interface EyeMonitorOutput {
  state: EyeState
  smoothedLeft: number
  smoothedRight: number
  closureDurationMs: number
  blinkCount: number
  sustainedClosureCount: number
  alerting: boolean
  stateChanged: boolean
  alertStarted: boolean
}
