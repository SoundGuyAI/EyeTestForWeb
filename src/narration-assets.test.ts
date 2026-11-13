import { describe, expect, it } from 'vitest'
import { lesson, responses } from './meditation-lesson'
import { calibrationNarration, defaultNarrationVoice, narrationVoices } from './narration-assets'
import type { CalibrationCueId } from './narration-assets'

const narrationIds = [
  ...lesson.map((cue) => cue.id),
  ...responses.open.map((response) => response.id),
  ...responses.closed.map((response) => response.id),
]

describe('Narration voices', () => {
  it('defaults to the female voice', () => {
    expect(defaultNarrationVoice).toBe('female')
  })
  it('provides every cue and response clip in both voices', () => {
    for (const voice of ['female', 'male'] as const) {
      for (const id of narrationIds) {
        expect(narrationVoices[voice][id], `${voice}:${id}`).toMatch(/^data:audio\/mpeg;base64,/)
      }
    }
  })
  it('uses a distinct recording per voice for every line', () => {
    for (const id of narrationIds) {
      expect(narrationVoices.female[id], `female:${id} duplicates male`).not.toBe(narrationVoices.male[id])
    }
  })
})

const calibrationIds: CalibrationCueId[] = [
  'cal-positioning-phone',
  'cal-positioning-desktop',
  'cal-open',
  'cal-blink',
  'cal-blink-each',
  'cal-done',
]

describe('Calibration narration', () => {
  it('provides every calibration clip in both voices', () => {
    for (const voice of ['female', 'male'] as const) {
      for (const id of calibrationIds) {
        expect(calibrationNarration[voice][id], `${voice}:${id}`).toMatch(/^data:audio\/mpeg;base64,/)
      }
    }
  })
  it('uses a distinct recording per voice for every calibration clip', () => {
    for (const id of calibrationIds) {
      expect(calibrationNarration.female[id], `female:${id} duplicates male`).not.toBe(calibrationNarration.male[id])
    }
  })
  it('uses different platform wording for the positioning clip', () => {
    expect(calibrationNarration.female['cal-positioning-phone']).not.toBe(calibrationNarration.female['cal-positioning-desktop'])
  })
})
