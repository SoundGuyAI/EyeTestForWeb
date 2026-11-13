import { describe, expect, it } from 'vitest'
import { LessonController, lesson } from './meditation-lesson'
import type { EyeState } from './detection/types'

const tick = (controller: LessonController, ms: number, eye: EyeState = 'open', good = true) => {
  for (let n = 0; n < ms; n += 100) controller.update(100, eye, good)
  return controller.get()
}
const atFirstOpen = () => { const c = new LessonController(); c.start(); tick(c, 3500); return c }

describe('Meditation lesson', () => {
  it('starts only through an explicit start', () => { const c = new LessonController(); expect(tick(c, 10000).running).toBe(false) })
  it('does not count closure as the open cue', () => { const c = atFirstOpen(); expect(tick(c, 4000, 'closed').step).toBe(1) })
  it('requires continuous matching input rather than accumulating partial holds', () => { const c = atFirstOpen(); tick(c, 1000); c.update(100, 'blinking', true); expect(tick(c, 1000).step).toBe(1) })
  it('does not confuse a blink or wink with sustained bilateral closure', () => { const c = atFirstOpen(); tick(c, 1600); for (const state of ['blinking', 'left-closed', 'right-closed'] as const) expect(tick(c, 4000, state).step).toBe(2) })
  it('resets the current hold when face quality is lost', () => { const c = atFirstOpen(); tick(c, 1200); c.update(100, 'open', false); expect(c.get().waitingForSignal).toBe(true); expect(tick(c, 800).step).toBe(1) })
  it('does not advance across delayed or background frames', () => { const c = atFirstOpen(); tick(c, 1000); c.update(20000, 'open', true); expect(c.get().heldMs).toBe(0); expect(c.get().step).toBe(1) })
  it('pause clears the hold and requires an explicit resume', () => { const c = atFirstOpen(); tick(c, 1000); c.pause(true); expect(tick(c, 5000).step).toBe(1); c.pause(false); expect(tick(c, 1600).step).toBe(2) })
  it('completes all cues in order and supports a clean replay/reset', () => { const c = new LessonController(); c.start(); for (const cue of lesson) tick(c, cue.holdMs, cue.target === 'closed' ? 'closed' : 'open'); expect(c.get().complete).toBe(true); expect(c.get().running).toBe(false); expect(c.start().step).toBe(0); expect(c.reset().running).toBe(false) })
})


describe('Reactive dialogue', () => {
  it('responds after five continuous seconds of opposite bilateral input', () => { const c = atFirstOpen(); expect(tick(c, 4900, 'closed').feedback).toBeNull(); expect(tick(c, 100, 'closed').feedback?.id).toBe('open-nudge-1'); expect(c.get().step).toBe(1) })
  it('spaces the second response and limits repetition', () => { const c = atFirstOpen(); tick(c, 5000, 'closed'); expect(tick(c, 11900, 'closed').feedback?.id).toBe('open-nudge-1'); expect(tick(c, 100, 'closed').feedback?.id).toBe('open-nudge-2'); expect(tick(c, 30000, 'closed').feedback?.id).toBe('open-nudge-2') })
  it('does not blame tracking loss, blinks, winks, or unknown input', () => { for (const eye of ['unavailable', 'blinking', 'left-closed', 'right-closed'] as const) { const c = atFirstOpen(); expect(tick(c, 20000, eye).feedback).toBeNull() } const c = atFirstOpen(); expect(tick(c, 20000, 'closed', false).feedback).toBeNull() })
  it('clears responses when the player follows the cue and restarts the delay after signal loss', () => { const c = atFirstOpen(); tick(c, 5000, 'closed'); expect(tick(c, 100, 'open').feedback).toBeNull(); tick(c, 4000, 'closed'); tick(c, 100, 'closed', false); expect(tick(c, 4900, 'closed').feedback).toBeNull() })
  it('responds to open eyes during a close cue', () => { const c = atFirstOpen(); tick(c, 1600); expect(tick(c, 5000, 'open').feedback?.id).toBe('closed-nudge-1') })
})
