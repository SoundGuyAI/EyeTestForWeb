import type { FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { describe, expect, it } from 'vitest'
import { classifySignalQuality, createFaceObservation, measureFaceGeometry } from './faceObservation'

const landmark = (x: number, y = 0.5): NormalizedLandmark => ({ x, y, z: 0, visibility: 1 })

describe('face observation helpers', () => {
  it('measures face width and center', () => {
    expect(measureFaceGeometry([landmark(0.2), landmark(0.8)])).toEqual({
      faceWidthRatio: 0.6000000000000001,
      faceCenterX: 0.5,
    })
  })

  it('rejects absent, distant, close, and off-center faces', () => {
    expect(classifySignalQuality(false, { faceWidthRatio: 0, faceCenterX: 0.5 })).toBe('no-face')
    expect(classifySignalQuality(true, { faceWidthRatio: 0.15, faceCenterX: 0.5 })).toBe('too-far')
    expect(classifySignalQuality(true, { faceWidthRatio: 0.85, faceCenterX: 0.5 })).toBe('too-close')
    expect(classifySignalQuality(true, { faceWidthRatio: 0.4, faceCenterX: 0.8 })).toBe('off-center')
    expect(classifySignalQuality(true, { faceWidthRatio: 0.4, faceCenterX: 0.5 })).toBe('good')
  })

  it('extracts blink blendshapes', () => {
    const result = {
      faceLandmarks: [[landmark(0.3), landmark(0.7)]],
      faceBlendshapes: [
        {
          categories: [
            { categoryName: 'eyeBlinkLeft', score: 0.72, index: 0, displayName: '' },
            { categoryName: 'eyeBlinkRight', score: 0.64, index: 1, displayName: '' },
          ],
          headIndex: 0,
          headName: '',
        },
      ],
      facialTransformationMatrixes: [],
    } as FaceLandmarkerResult

    const observation = createFaceObservation({
      result,
      timestampMs: 100,
      inferenceMs: 12,
      processedFps: 15,
    })

    expect(observation.leftBlink).toBeCloseTo(0.72)
    expect(observation.rightBlink).toBeCloseTo(0.64)
    expect(observation.quality).toBe('good')
  })
})
