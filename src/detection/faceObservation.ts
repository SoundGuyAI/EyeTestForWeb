import type { Classifications, FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { FaceGeometry, FaceObservation, SignalQuality } from './types'

const blinkScore = (blendshapes: Classifications | undefined, name: string): number =>
  blendshapes?.categories.find((category) => category.categoryName === name)?.score ?? 0

export const measureFaceGeometry = (
  landmarks: FaceLandmarkerResult['faceLandmarks'][number] | undefined,
): FaceGeometry => {
  if (!landmarks?.length) {
    return { faceWidthRatio: 0, faceCenterX: 0.5 }
  }

  let minX = 1
  let maxX = 0

  for (const landmark of landmarks) {
    minX = Math.min(minX, landmark.x)
    maxX = Math.max(maxX, landmark.x)
  }

  return {
    faceWidthRatio: Math.max(0, maxX - minX),
    faceCenterX: (minX + maxX) / 2,
  }
}

export const classifySignalQuality = (
  hasFace: boolean,
  geometry: FaceGeometry,
): SignalQuality => {
  if (!hasFace) return 'no-face'
  if (geometry.faceWidthRatio < 0.22) return 'too-far'
  if (geometry.faceWidthRatio > 0.78) return 'too-close'
  if (Math.abs(geometry.faceCenterX - 0.5) > 0.2) return 'off-center'
  return 'good'
}

interface ObservationInput {
  result: FaceLandmarkerResult
  timestampMs: number
  inferenceMs: number
  processedFps: number
}

export const createFaceObservation = ({
  result,
  timestampMs,
  inferenceMs,
  processedFps,
}: ObservationInput): FaceObservation => {
  const landmarks = result.faceLandmarks[0] ?? []
  const blendshapes = result.faceBlendshapes[0]
  const geometry = measureFaceGeometry(landmarks)

  return {
    timestampMs,
    leftBlink: blinkScore(blendshapes, 'eyeBlinkLeft'),
    rightBlink: blinkScore(blendshapes, 'eyeBlinkRight'),
    quality: classifySignalQuality(landmarks.length > 0, geometry),
    faceWidthRatio: geometry.faceWidthRatio,
    faceCenterX: geometry.faceCenterX,
    inferenceMs,
    processedFps,
    landmarks,
  }
}
