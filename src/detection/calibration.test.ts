import { describe, expect, it } from 'vitest'
import { CalibrationController, openCalibrationGate } from './calibration'
import type { CalibrationNarrationGate } from './calibration'
import type { FaceObservation } from './types'

const obs = (timestampMs: number, blink = 0.05, quality: FaceObservation['quality'] = 'good'): FaceObservation => ({
  timestampMs,
  leftBlink: blink,
  rightBlink: blink,
  quality,
  faceWidthRatio: 0.4,
  faceCenterX: 0.5,
  inferenceMs: 5,
  processedFps: 15,
  landmarks: [],
})

const gated = (over: Partial<CalibrationNarrationGate> = {}): CalibrationNarrationGate => ({
  narrationActive: true,
  positioningCueDone: false,
  openCueDone: false,
  blinkIntroDone: false,
  blinkPromptsDone: 0,
  ...over,
})

const runFrames = (controller: CalibrationController, startMs: number, frames: number, blink = 0.05, gate?: CalibrationNarrationGate) => {
  let status
  for (let i = 0; i < frames; i++) status = controller.update(obs(startMs + i * 100, blink), gate)
  return status
}

const blinkOnce = (controller: CalibrationController, startMs: number, gate?: CalibrationNarrationGate) => {
  runFrames(controller, startMs, 3, 0.6, gate) // both eyes closed long enough to latch
  return runFrames(controller, startMs + 300, 3, 0.05, gate) // reopen
}

describe('CalibrationController narration gate', () => {
  it('advances freely when narration is inactive', () => {
    const controller = new CalibrationController()
    const gate = openCalibrationGate()
    expect(runFrames(controller, 0, 10, 0.05, gate)?.phase).toBe('eyes-open')
    expect(runFrames(controller, 1000, 25, 0.05, gate)?.phase).toBe('blink-practice')
    blinkOnce(controller, 4000, gate)
    blinkOnce(controller, 5000, gate)
    const status = blinkOnce(controller, 6000, gate)
    expect(status?.completedBlinks).toBe(3)
    expect(status?.phase).toBe('complete')
    expect(status?.profile).not.toBeNull()
  })

  it('holds positioning until the positioning cue has finished', () => {
    const controller = new CalibrationController()
    const gate = gated()
    const held = runFrames(controller, 0, 30, 0.05, gate)
    expect(held?.phase).toBe('positioning')
    expect(held?.progress).toBeLessThan(1)
    gate.positioningCueDone = true
    expect(runFrames(controller, 3000, 2, 0.05, gate)?.phase).toBe('eyes-open')
  })

  it('holds eyes-open until the open cue has finished', () => {
    const controller = new CalibrationController()
    const gate = gated({ positioningCueDone: true })
    runFrames(controller, 0, 10, 0.05, gate)
    const held = runFrames(controller, 1000, 40, 0.05, gate)
    expect(held?.phase).toBe('eyes-open')
    gate.openCueDone = true
    expect(runFrames(controller, 5000, 2, 0.05, gate)?.phase).toBe('blink-practice')
  })

  it('counts a blink only after its prompt has finished', () => {
    const controller = new CalibrationController()
    const gate = gated({ positioningCueDone: true, openCueDone: true })
    runFrames(controller, 0, 10, 0.05, gate)
    runFrames(controller, 1000, 40, 0.05, gate)
    const early = blinkOnce(controller, 6000, gate)
    expect(early?.completedBlinks).toBe(0)
    gate.blinkIntroDone = true
    gate.blinkPromptsDone = 1
    const counted = blinkOnce(controller, 8000, gate)
    expect(counted?.completedBlinks).toBe(1)
  })

  it('completes after three prompted blinks', () => {
    const controller = new CalibrationController()
    const gate = gated({ positioningCueDone: true, openCueDone: true, blinkIntroDone: true, blinkPromptsDone: 0 })
    runFrames(controller, 0, 10, 0.05, gate)
    runFrames(controller, 1000, 40, 0.05, gate)
    for (let blink = 1; blink <= 3; blink++) {
      gate.blinkPromptsDone = blink
      const status = blinkOnce(controller, 6000 + blink * 2000, gate)
      expect(status?.completedBlinks).toBe(blink)
    }
    const done = runFrames(controller, 13000, 1, 0.05, gate)
    expect(done?.phase).toBe('complete')
    expect(done?.profile).not.toBeNull()
  })
})
