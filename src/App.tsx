import { useCallback, useEffect, useRef, useState } from 'react'
import { cameraErrorMessage, requestFrontCamera, stopCamera } from './camera/camera'
import { CameraStage } from './components/CameraStage'
import { Diagnostics } from './components/Diagnostics'
import { createFaceDetector, type FaceDetector } from './detection/faceLandmarker'
import { createFaceObservation } from './detection/faceObservation'
import type { FaceObservation } from './detection/types'

type SessionState = 'idle' | 'starting-camera' | 'loading-model' | 'running' | 'error'

const targetIntervalMs = 1000 / 15

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastInferenceRef = useRef(0)
  const inferenceTimesRef = useRef<number[]>([])
  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [observation, setObservation] = useState<FaceObservation | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [delegate, setDelegate] = useState<'GPU' | 'CPU' | null>(null)

  const stopSession = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    detectorRef.current?.close()
    detectorRef.current = null
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    lastInferenceRef.current = 0
    inferenceTimesRef.current = []
    setObservation(null)
    setDelegate(null)
    setSessionState('idle')
  }, [])

  useEffect(() => stopSession, [stopSession])

  const processFrame = useCallback(function processFrameLoop() {
    const video = videoRef.current
    const detector = detectorRef.current

    if (!video || !detector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animationFrameRef.current = requestAnimationFrame(processFrameLoop)
      return
    }

    const now = performance.now()
    if (now - lastInferenceRef.current >= targetIntervalMs) {
      const inferenceStart = performance.now()
      const result = detector.detect(video, now)
      const inferenceMs = performance.now() - inferenceStart
      lastInferenceRef.current = now

      const recentTimes = inferenceTimesRef.current
      recentTimes.push(now)
      while (recentTimes.length > 1 && recentTimes[0] < now - 1000) recentTimes.shift()

      setObservation(
        createFaceObservation({
          result,
          timestampMs: now,
          inferenceMs,
          processedFps: recentTimes.length,
        }),
      )
    }

    animationFrameRef.current = requestAnimationFrame(processFrameLoop)
  }, [])

  const startSession = async () => {
    setErrorMessage('')
    setSessionState('starting-camera')

    try {
      const stream = await requestFrontCamera()
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('The camera preview is not available.')
      video.srcObject = stream
      await video.play()

      setSessionState('loading-model')
      const detector = await createFaceDetector()
      detectorRef.current = detector
      setDelegate(detector.delegate)
      setSessionState('running')
      animationFrameRef.current = requestAnimationFrame(processFrame)
    } catch (error) {
      detectorRef.current?.close()
      detectorRef.current = null
      stopCamera(streamRef.current)
      streamRef.current = null
      setErrorMessage(cameraErrorMessage(error))
      setSessionState('error')
    }
  }

  const isActive = sessionState !== 'idle' && sessionState !== 'error'
  const isStarting = sessionState === 'starting-camera' || sessionState === 'loading-model'

  return (
    <main className="app-shell">
      <header className="hero">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="EyeTestForWeb home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>EyeTestForWeb</span>
        </a>
        <span className="prototype-badge">Phase 1 prototype</span>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">Private, on-device vision</p>
          <h1>See the eye signals your browser can detect.</h1>
          <p className="lede">
            This first prototype opens your front camera, tracks one face, and displays MediaPipe's raw
            left and right blink signals. Stable blink and sustained-closure decisions come in the next phase.
          </p>
        </div>
        <div className="privacy-note">
          <span className="privacy-icon" aria-hidden="true">●</span>
          <p><strong>No video upload.</strong> Frames are processed in this tab and are not saved by the app.</p>
        </div>
      </section>

      <div className="workspace">
        <CameraStage videoRef={videoRef} observation={observation} active={isActive} />
        <div className="side-column">
          <section className="panel controls">
            <p className="eyebrow">Camera session</p>
            <h2>{isActive ? 'Tracking is active' : 'Ready when you are'}</h2>
            <p>
              Use a well-lit space, prop the phone at eye level, and keep your face inside the oval guide.
            </p>

            {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}

            <div className="button-row">
              {!isActive && (
                <button className="primary-button" onClick={startSession} disabled={isStarting}>
                  {isStarting ? 'Starting…' : sessionState === 'error' ? 'Try again' : 'Start camera'}
                </button>
              )}
              {isActive && (
                <button className="secondary-button" onClick={stopSession}>Stop camera</button>
              )}
            </div>

            <ol className="setup-list">
              <li><span>1</span> Grant camera access</li>
              <li><span>2</span> Wait for the model to load</li>
              <li><span>3</span> Center your face and blink</li>
            </ol>
          </section>

          <Diagnostics
            observation={observation}
            delegate={delegate}
            detectorStatus={
              sessionState === 'loading-model'
                ? 'Loading model'
                : sessionState === 'running'
                  ? 'Running'
                  : 'Not started'
            }
          />
        </div>
      </div>

      <section className="limitations">
        <p className="eyebrow">Prototype boundary</p>
        <h2>Signal inspection, not a medical result.</h2>
        <p>
          Lighting, glasses, camera angle, movement, and device performance can change these scores. This
          phase intentionally exposes diagnostics before adding calibration, smoothing, or alerts.
        </p>
      </section>

      <footer>
        <span>EyeTestForWeb · Open-source browser research prototype</span>
        <a href="https://github.com/SoundGuyAI/EyeTestForWeb">View source on GitHub</a>
      </footer>
    </main>
  )
}

export default App
