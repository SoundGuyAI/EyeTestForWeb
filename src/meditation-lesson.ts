import type { EyeState } from './detection/types'

export const lesson = [
  { id: 'welcome', title: 'A perfectly ordinary moment', target: 'wait', holdMs: 3500, line: 'Welcome to Meditation: EXTREME. Sit comfortably. We have scheduled a perfectly ordinary moment of peace.' },
  { id: 'open', title: 'Observe the complete absence of problems', target: 'open', holdMs: 1600, line: 'Open your eyes. Locate absolutely nothing that requires your attention.' },
  { id: 'close', title: 'Allow the world to handle itself', target: 'closed', holdMs: 3000, line: 'Now close your eyes. Let the world handle itself for a moment.' },
  { id: 'inspection', title: 'Mandatory serenity inspection', target: 'open', holdMs: 2200, line: 'Open your eyes. A mandatory serenity inspection is now in progress. Please remain aggressively relaxed.' },
  { id: 'paperwork', title: 'A brief administrative retreat', target: 'closed', holdMs: 3000, line: 'Close your eyes once more. The paperwork cannot see you if you cannot see the paperwork.' },
  { id: 'return', title: 'Peace, provisionally approved', target: 'open', holdMs: 2200, line: 'And open. Congratulations. You have completed the introductory peace compliance procedure.' },
] as const

export interface LessonSnapshot { step: number; heldMs: number; running: boolean; paused: boolean; complete: boolean; waitingForSignal: boolean }
export class LessonController {
  private snapshot: LessonSnapshot = { step: 0, heldMs: 0, running: false, paused: false, complete: false, waitingForSignal: false }
  get(): LessonSnapshot { return { ...this.snapshot } }
  start() { this.snapshot = { step: 0, heldMs: 0, running: true, paused: false, complete: false, waitingForSignal: false }; return this.get() }
  reset() { this.snapshot = { step: 0, heldMs: 0, running: false, paused: false, complete: false, waitingForSignal: false }; return this.get() }
  pause(paused: boolean) { this.snapshot.paused = paused; this.snapshot.heldMs = 0; return this.get() }
  update(deltaMs: number, eye: EyeState, signalGood: boolean): LessonSnapshot {
    const s = this.snapshot
    if (!s.running || s.paused || s.complete) return this.get()
    s.waitingForSignal = !signalGood
    const cue = lesson[s.step]
    if (!signalGood || (cue.target !== 'wait' && eye !== cue.target)) { s.heldMs = 0; return this.get() }
    // Never turn a background-tab gap, delayed frame, or stale detector output into progress.
    if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 300) { s.heldMs = 0; return this.get() }
    s.heldMs += deltaMs
    if (s.heldMs >= cue.holdMs) {
      s.heldMs = 0
      if (s.step === lesson.length - 1) { s.running = false; s.complete = true }
      else s.step += 1
    }
    return this.get()
  }
}
