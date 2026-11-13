import type { EyeState } from './detection/types'

export const lesson = [
  { id: 'welcome', title: 'A perfectly ordinary moment', target: 'wait', holdMs: 3500, line: 'Welcome to Meditation: EXTREME. Sit comfortably. We have scheduled a perfectly ordinary moment of peace.' },
  { id: 'open', title: 'Observe the complete absence of problems', target: 'open', holdMs: 1600, line: 'Open your eyes. Locate absolutely nothing that requires your attention.' },
  { id: 'close', title: 'Allow the world to handle itself', target: 'closed', holdMs: 3000, line: 'Now close your eyes. Let the world handle itself for a moment.' },
  { id: 'inspection', title: 'Mandatory serenity inspection', target: 'open', holdMs: 2200, line: 'Open your eyes. A mandatory serenity inspection is now in progress. Please remain aggressively relaxed.' },
  { id: 'paperwork', title: 'A brief administrative retreat', target: 'closed', holdMs: 3000, line: 'Close your eyes once more. The paperwork cannot see you if you cannot see the paperwork.' },
  { id: 'return', title: 'Peace, provisionally approved', target: 'open', holdMs: 2200, line: 'And open. Congratulations. You have completed the introductory peace compliance procedure.' },
] as const

export const responses = {
  open: [
    { id: 'open-nudge-1', line: 'A small clarification: this is the eyes-open portion of the exercise.' },
    { id: 'open-nudge-2', line: 'The serenity inspector cannot approve what you refuse to look at. Open both eyes when you are ready.' },
  ],
  closed: [
    { id: 'closed-nudge-1', line: 'Your eyes are still open. The world has agreed to manage without supervision.' },
    { id: 'closed-nudge-2', line: 'We have detected continued visual management. Please close both eyes to delegate reality.' },
  ],
} as const

export interface LessonSnapshot { step: number; heldMs: number; running: boolean; paused: boolean; complete: boolean; waitingForSignal: boolean; feedback: { id: string; line: string } | null }
export class LessonController {
  private snapshot: LessonSnapshot = { step: 0, heldMs: 0, running: false, paused: false, complete: false, waitingForSignal: false, feedback: null }
  private wrongMs = 0
  private nudges = 0
  get(): LessonSnapshot { return { ...this.snapshot } }
  start() { this.wrongMs = 0; this.nudges = 0; this.snapshot = { step: 0, heldMs: 0, running: true, paused: false, complete: false, waitingForSignal: false, feedback: null }; return this.get() }
  reset() { this.wrongMs = 0; this.nudges = 0; this.snapshot = { step: 0, heldMs: 0, running: false, paused: false, complete: false, waitingForSignal: false, feedback: null }; return this.get() }
  pause(paused: boolean) { this.wrongMs = 0; this.snapshot.feedback = null; this.snapshot.paused = paused; this.snapshot.heldMs = 0; return this.get() }
  update(deltaMs: number, eye: EyeState, signalGood: boolean): LessonSnapshot {
    const s = this.snapshot
    if (!s.running || s.paused || s.complete) return this.get()
    s.waitingForSignal = !signalGood
    const cue = lesson[s.step]
    const freshFrame = Number.isFinite(deltaMs) && deltaMs >= 0 && deltaMs <= 300
    if (!signalGood || !freshFrame) { s.heldMs = 0; this.wrongMs = 0; s.feedback = null; return this.get() }
    if (cue.target !== 'wait' && eye !== cue.target) {
      s.heldMs = 0
      // Only a confidently detected opposite bilateral state merits a response.
      // Unknown, blinks, winks and tracking loss are not player choices.
      const opposite = cue.target === 'open' ? 'closed' : 'open'
      if (eye !== opposite) { this.wrongMs = 0; s.feedback = null; return this.get() }
      this.wrongMs += deltaMs
      const delay = this.nudges === 0 ? 5000 : 12000
      if (this.wrongMs >= delay && this.nudges < 2) {
        s.feedback = responses[cue.target][this.nudges]
        this.nudges += 1
        this.wrongMs = 0
      }
      return this.get()
    }
    this.wrongMs = 0
    s.feedback = null
    s.heldMs += deltaMs
    if (s.heldMs >= cue.holdMs) {
      s.heldMs = 0
      this.nudges = 0
      if (s.step === lesson.length - 1) { s.running = false; s.complete = true }
      else s.step += 1
    }
    return this.get()
  }
}
