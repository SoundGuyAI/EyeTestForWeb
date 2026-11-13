import { describe, expect, it } from 'vitest'
import { lesson, responses } from './meditation-lesson'
import { defaultNarrationVoice, narrationVoices } from './narration-assets'

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
