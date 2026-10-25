import type {
  CalibrationProfile,
  EyeMonitorOutput,
  FaceObservation,
  SignalQuality,
} from '../detection/types'

const qualityCopy: Record<SignalQuality, { title: string; guidance: string }> = {
  waiting: { title: 'Waiting for signal', guidance: 'Start the camera and look toward the screen.' },
  good: { title: 'Face signal ready', guidance: 'Position and distance look usable.' },
  'no-face': { title: 'No face detected', guidance: 'Move into the frame and face the camera.' },
  'too-far': { title: 'Move closer', guidance: 'Bring the phone closer so your face fills more of the guide.' },
  'too-close': { title: 'Move back', guidance: 'Increase the distance between your face and the camera.' },
  'off-center': { title: 'Recenter your face', guidance: 'Move toward the center of the oval guide.' },
}

const Score = ({ label, value }: { label: string; value: number }) => (
  <div className="score-row">
    <div className="score-label">
      <span>{label}</span>
      <strong>{value.toFixed(3)}</strong>
    </div>
    <div className="score-track" aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  </div>
)

interface DiagnosticsProps {
  observation: FaceObservation | null
  delegate: 'GPU' | 'CPU' | null
  detectorStatus: string
  monitorOutput?: EyeMonitorOutput | null
  profile?: CalibrationProfile | null
}

export function Diagnostics({
  observation,
  delegate,
  detectorStatus,
  monitorOutput = null,
  profile = null,
}: DiagnosticsProps) {
  const quality = observation?.quality ?? 'waiting'
  const copy = qualityCopy[quality]

  return (
    <section className="panel diagnostics">
      <div className="panel-heading" role="status" aria-live="polite">
        <div>
          <p className="eyebrow">Live diagnostics</p>
          <h2>{copy.title}</h2>
        </div>
        <span className={`quality-pill quality-${quality}`}>{quality.replace('-', ' ')}</span>
      </div>
      <p className="guidance">{copy.guidance}</p>

      <div className="scores">
        <Score label="Left eye blink signal" value={observation?.leftBlink ?? 0} />
        <Score label="Right eye blink signal" value={observation?.rightBlink ?? 0} />
        {monitorOutput && (
          <>
            <Score label="Smoothed left signal" value={monitorOutput.smoothedLeft} />
            <Score label="Smoothed right signal" value={monitorOutput.smoothedRight} />
          </>
        )}
      </div>

      <dl className="metrics">
        <div>
          <dt>Detector</dt>
          <dd>{detectorStatus}</dd>
        </div>
        <div>
          <dt>Delegate</dt>
          <dd>{delegate ?? '—'}</dd>
        </div>
        <div>
          <dt>Processed FPS</dt>
          <dd>{observation?.processedFps.toFixed(1) ?? '—'}</dd>
        </div>
        <div>
          <dt>Inference</dt>
          <dd>{observation ? `${observation.inferenceMs.toFixed(1)} ms` : '—'}</dd>
        </div>
        <div>
          <dt>Face width</dt>
          <dd>{observation ? `${Math.round(observation.faceWidthRatio * 100)}%` : '—'}</dd>
        </div>
        <div>
          <dt>Sample time</dt>
          <dd>{observation ? `${Math.round(observation.timestampMs)} ms` : '—'}</dd>
        </div>
        <div>
          <dt>Left thresholds</dt>
          <dd>{profile ? `${profile.openThresholdLeft.toFixed(2)} / ${profile.closeThresholdLeft.toFixed(2)}` : '—'}</dd>
        </div>
        <div>
          <dt>Right thresholds</dt>
          <dd>{profile ? `${profile.openThresholdRight.toFixed(2)} / ${profile.closeThresholdRight.toFixed(2)}` : '—'}</dd>
        </div>
      </dl>
    </section>
  )
}
