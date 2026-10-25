import { describe, expect, it } from 'vitest'
import { EyeMonitor } from './eyeMonitor'
import type { CalibrationProfile, FaceObservation, SignalQuality } from './types'

const profile: CalibrationProfile = {
  openLeft: 0.05,
  openRight: 0.05,
  closeThresholdLeft: 0.5,
  closeThresholdRight: 0.5,
  openThresholdLeft: 0.2,
  openThresholdRight: 0.2,
}

const observation = (
  timestampMs: number,
  leftBlink: number,
  rightBlink: number,
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

const monitor = (alertDelayMs = 500) =>
  new EyeMonitor(profile, { alertDelayMs, smoothingTimeConstantMs: 1, minimumBlinkMs: 50 })

describe('EyeMonitor', () => {
  it('counts a normal bilateral blink without starting an alert', () => {
    const engine = monitor()
    engine.update(observation(0, 0.05, 0.05))
    engine.update(observation(100, 0.9, 0.9))
    const blinking = engine.update(observation(180, 0.9, 0.9))
    const reopened = engine.update(observation(240, 0.05, 0.05))

    expect(blinking.state).toBe('blinking')
    expect(reopened.state).toBe('open')
    expect(reopened.blinkCount).toBe(1)
    expect(reopened.alerting).toBe(false)
  })

  it('starts an alert after sustained bilateral closure', () => {
    const engine = monitor(400)
    engine.update(observation(0, 0.05, 0.05))
    engine.update(observation(100, 0.9, 0.9))
    const closed = engine.update(observation(520, 0.9, 0.9))

    expect(closed.state).toBe('closed')
    expect(closed.alerting).toBe(true)
    expect(closed.alertStarted).toBe(true)
    expect(closed.sustainedClosureCount).toBe(1)
  })

  it('reports a wink independently', () => {
    const engine = monitor()
    engine.update(observation(0, 0.05, 0.05))
    const output = engine.update(observation(100, 0.85, 0.05))
    expect(output.state).toBe('left-closed')
  })

  it('never reports closed when the face signal is unavailable', () => {
    const engine = monitor(100)
    engine.update(observation(0, 0.9, 0.9))
    const output = engine.update(observation(200, 0.9, 0.9, 'no-face'))
    expect(output.state).toBe('unavailable')
    expect(output.alerting).toBe(false)
  })

  it('applies an updated alert delay without rebuilding the monitor', () => {
    const engine = monitor(1000)
    engine.update(observation(0, 0.05, 0.05))
    engine.update(observation(100, 0.9, 0.9))
    expect(engine.update(observation(500, 0.9, 0.9)).state).toBe('blinking')
    engine.setAlertDelay(300)
    expect(engine.update(observation(550, 0.9, 0.9)).state).toBe('closed')
  })

  it('does not treat an unobserved time gap as continuous closure', () => {
    const engine = monitor(1000)
    engine.update(observation(0, 0.9, 0.9))
    const afterGap = engine.update(observation(5000, 0.9, 0.9))

    expect(afterGap.state).not.toBe('closed')
    expect(afterGap.alerting).toBe(false)
    expect(afterGap.sustainedClosureCount).toBe(0)
  })

  it('counts an uninterrupted closure once when the alert delay changes', () => {
    const engine = monitor(400)
    engine.update(observation(0, 0.05, 0.05))
    engine.update(observation(100, 0.9, 0.9))
    const firstAlert = engine.update(observation(520, 0.9, 0.9))
    engine.setAlertDelay(2000)
    const afterChange = engine.update(observation(700, 0.9, 0.9))

    expect(firstAlert.alertStarted).toBe(true)
    expect(afterChange.state).toBe('closed')
    expect(afterChange.alertStarted).toBe(false)
    expect(afterChange.sustainedClosureCount).toBe(1)
  })
})
