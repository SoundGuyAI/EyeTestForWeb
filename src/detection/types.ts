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
