import type { EyeMonitorOutput, EyeState, SignalQuality } from '../detection/types'

const stateCopy: Record<EyeState, { title: string; detail: string }> = {
  unavailable: {
    title: 'Signal unavailable',
    detail: 'Recenter your face and check the lighting before monitoring continues.',
  },
  open: { title: 'Eyes open', detail: 'Monitoring is active and the signal looks usable.' },
  blinking: { title: 'Blink detected', detail: 'A short bilateral closure is being measured.' },
  'left-closed': { title: 'Left eye closed', detail: 'One-eye closure does not trigger the alert.' },
  'right-closed': { title: 'Right eye closed', detail: 'One-eye closure does not trigger the alert.' },
  closed: { title: 'Eyes closed', detail: 'The configured sustained-closure delay has elapsed.' },
}

const qualityGuidance: Partial<Record<SignalQuality, string>> = {
  'no-face': 'Move into the camera frame.',
  'too-far': 'Move closer to the camera.',
  'too-close': 'Move slightly farther back.',
  'off-center': 'Move your face toward the center guide.',
}

interface MonitorPanelProps {
  output: EyeMonitorOutput
  quality: SignalQuality
  sessionSeconds: number
  onRecalibrate: () => void
  onStop: () => void
}

export function MonitorPanel({
  output,
  quality,
  sessionSeconds,
  onRecalibrate,
  onStop,
}: MonitorPanelProps) {
  const copy = stateCopy[output.state]
  const minutes = Math.floor(sessionSeconds / 60)
  const seconds = Math.floor(sessionSeconds % 60)

  return (
    <section className={`panel monitor-panel state-${output.state}`}>
      <div className="monitor-status" role="status" aria-live="polite" aria-atomic="true">
        <span className="state-orb" aria-hidden="true" />
        <div>
          <p className="eyebrow">Live eye status</p>
          <h2>{copy.title}</h2>
          <p>{qualityGuidance[quality] ?? copy.detail}</p>
        </div>
      </div>

      {output.alerting && (
        <div className="active-alert" role="alert">
          Open your eyes to clear the alert.
        </div>
      )}

      <dl className="session-stats">
        <div>
          <dt>Session</dt>
          <dd>{minutes}:{seconds.toString().padStart(2, '0')}</dd>
        </div>
        <div>
          <dt>Blinks</dt>
          <dd>{output.blinkCount}</dd>
        </div>
        <div>
          <dt>Long closures</dt>
          <dd>{output.sustainedClosureCount}</dd>
        </div>
        <div>
          <dt>Current closure</dt>
          <dd>{output.closureDurationMs ? `${Math.round(output.closureDurationMs)} ms` : '—'}</dd>
        </div>
      </dl>

      <div className="split-actions">
        <button className="secondary-button" onClick={onRecalibrate}>Recalibrate</button>
        <button className="text-button danger-text" onClick={onStop}>Stop</button>
      </div>
    </section>
  )
}
