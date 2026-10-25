import { useEffect, useRef } from 'react'
import type { FaceObservation } from '../detection/types'

interface CameraStageProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  observation: FaceObservation | null
  active: boolean
}

export function CameraStage({ videoRef, observation, active }: CameraStageProps) {
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
    <section className="camera-shell" aria-label="Camera preview">
      <div className="camera-frame">
        <video ref={videoRef} className="camera-media mirrored" muted playsInline autoPlay />
        <canvas ref={canvasRef} className="camera-media camera-overlay mirrored" aria-hidden="true" />
        {!active && (
          <div className="camera-placeholder">
            <div className="face-guide" aria-hidden="true" />
            <p>Your camera preview will appear here.</p>
          </div>
        )}
        {active && <div className="framing-guide" aria-hidden="true" />}
      </div>
      <p className="camera-caption">Video remains on this device. This prototype does not record or upload frames.</p>
    </section>
  )
}
