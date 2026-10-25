import { useEffect, useRef } from 'react'
import type { EyeState, FaceObservation } from '../detection/types'

interface CameraStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  observation: FaceObservation | null
  active: boolean
  showPreview?: boolean
  mode?: 'idle' | 'calibrating' | 'monitoring'
  eyeState?: EyeState
  alerting?: boolean
}

const cameraStateLabel: Record<EyeState, string> = {
  unavailable: 'Signal unavailable',
  open: 'Eyes open',
  blinking: 'Blinking',
  'left-closed': 'Left eye closed',
  'right-closed': 'Right eye closed',
  closed: 'Eyes closed',
}

export function CameraStage({
  videoRef,
  observation,
  active,
  showPreview = true,
  mode = 'idle',
  eyeState = 'unavailable',
  alerting = false,
}: CameraStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (!active || !observation) {
      const context = canvas.getContext('2d')
      if (context) context.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    const context = canvas.getContext('2d')
    if (!context) return

    context.clearRect(0, 0, width, height)
    context.fillStyle = observation.quality === 'good' ? 'rgba(89, 240, 190, 0.72)' : 'rgba(255, 188, 82, 0.68)'

    for (let index = 0; index < observation.landmarks.length; index += 4) {
      const point = observation.landmarks[index]
      context.beginPath()
      context.arc(point.x * width, point.y * height, 1.4, 0, Math.PI * 2)
      context.fill()
    }
  }, [active, observation, videoRef])

  return (
    <section className={`camera-shell ${alerting ? 'camera-alerting' : ''}`} aria-label="Camera preview">
      <div className="camera-frame">
        <video
          ref={videoRef}
          className={`camera-media mirrored ${showPreview ? '' : 'preview-hidden'}`}
          muted
          playsInline
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className={`camera-media camera-overlay mirrored ${showPreview ? '' : 'preview-hidden'}`}
          aria-hidden="true"
        />
        {!active && (
          <div className="camera-placeholder">
            <div className="face-guide" aria-hidden="true" />
            <p>Your camera preview will appear here.</p>
          </div>
        )}
        {active && <div className="framing-guide" aria-hidden="true" />}
        {mode === 'calibrating' && (
          <div className="camera-status-badge calibration-badge">Calibrating</div>
        )}
        {mode === 'monitoring' && (
          <div className={`camera-status-badge eye-state-${eyeState}`}>
            <span aria-hidden="true" />
            {cameraStateLabel[eyeState]}
          </div>
        )}
        {active && !showPreview && (
          <div className="preview-off-message">
            <span className="privacy-icon" aria-hidden="true">●</span>
            Camera preview hidden. On-device monitoring continues.
          </div>
        )}
      </div>
      <p className="camera-caption">Video remains on this device. This prototype does not record or upload frames.</p>
    </section>
  )
}
