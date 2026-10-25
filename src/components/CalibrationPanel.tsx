import type { CalibrationStatus } from '../detection/types'

const phaseNumber = {
  positioning: 1,
  'eyes-open': 2,
  'blink-practice': 3,
  complete: 3,
}

interface CalibrationPanelProps {
  status: CalibrationStatus
  onUseDefaults: () => void
  onStop: () => void
}

export function CalibrationPanel({ status, onUseDefaults, onStop }: CalibrationPanelProps) {
  const percentage = Math.round(status.progress * 100)

  return (
    <section className="panel calibration-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Personal calibration</p>
          <h2>Step {phaseNumber[status.phase]} of 3</h2>
        </div>
        <span className="quality-pill">{percentage}%</span>
      </div>

      <p className="calibration-guidance" role="status" aria-live="polite">
        {status.guidance}
      </p>

      <div
        className="calibration-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>

      <div className="calibration-steps" aria-label="Calibration steps">
        <span className={phaseNumber[status.phase] >= 1 ? 'active' : ''}>Center</span>
        <span className={phaseNumber[status.phase] >= 2 ? 'active' : ''}>Eyes open</span>
        <span className={phaseNumber[status.phase] >= 3 ? 'active' : ''}>
          Blink {status.completedBlinks}/{status.requiredBlinks}
        </span>
      </div>

      <p className="helper-copy">
        Calibration adapts the thresholds to your eyes, camera, glasses, and current lighting.
      </p>

      <div className="stacked-actions">
        <button className="text-button" onClick={onUseDefaults}>
          Use default thresholds
        </button>
        <button className="text-button danger-text" onClick={onStop}>
          Stop camera
        </button>
      </div>
    </section>
  )
}
