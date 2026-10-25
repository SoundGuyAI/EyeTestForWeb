import { describe, expect, it } from 'vitest'
import { CalibrationController } from './calibration'
import type { FaceObservation, SignalQuality } from './types'

const observation = (
  timestampMs: number,
  leftBlink = 0.06,
  rightBlink = 0.07,
  quality: SignalQuality = 'good',
): FaceObservation => ({
  timestampMs,
  leftBlink,
  rightBlink,
  quality,
  faceWidthRatio: 0.45,
  faceCenterX: 0.5,
  inferenceMs: 10,
  processedFps: 15,
  landmarks: [],
})

describe('CalibrationController', () => {
  it('builds personalized thresholds after open-eye sampling and three blinks', () => {
    const controller = new CalibrationController()
    controller.update(observation(0))
    controller.update(observation(900))

    for (let time = 1000; time <= 3200; time += 100) {
      controller.update(observation(time))
    }

    let status = controller.update(observation(3300))
    expect(status.phase).toBe('blink-practice')

    for (let blink = 0; blink < 3; blink += 1) {
      controller.update(observation(3400 + blink * 300, 0.82, 0.78))
      status = controller.update(observation(3500 + blink * 300))
    }

    expect(status.phase).toBe('complete')
    expect(status.profile).not.toBeNull()
    expect(status.profile!.closeThresholdLeft).toBeGreaterThan(status.profile!.openThresholdLeft)
    expect(status.profile!.closeThresholdRight).toBeGreaterThan(status.profile!.openThresholdRight)
  })

  it('does not advance positioning while signal quality is poor', () => {
    const controller = new CalibrationController()
    controller.update(observation(0, 0, 0, 'off-center'))
    const status = controller.update(observation(2000, 0, 0, 'good'))
    expect(status.phase).toBe('positioning')
    expect(status.progress).toBe(0)
  })

  it('restarts open-eye sampling after signal quality is lost', () => {
    const controller = new CalibrationController()
    controller.update(observation(0))
    controller.update(observation(900))
    controller.update(observation(1000))
    controller.update(observation(2500, 0, 0, 'no-face'))

    const restarted = controller.update(observation(2600))
    const stillSampling = controller.update(observation(3500))
    expect(restarted.phase).toBe('eyes-open')
    expect(restarted.progress).toBe(0)
    expect(stillSampling.phase).toBe('eyes-open')
  })
})
