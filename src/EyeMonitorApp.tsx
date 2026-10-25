import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertSound } from './audio/alertSound'
import { cameraErrorMessage, requestFrontCamera, stopCamera } from './camera/camera'
import { CalibrationPanel } from './components/CalibrationPanel'
import { CameraStage } from './components/CameraStage'
import { Diagnostics } from './components/Diagnostics'
import { MonitorPanel } from './components/MonitorPanel'
import { SettingsPanel } from './components/SettingsPanel'
import { CalibrationController, defaultCalibrationProfile } from './detection/calibration'
import { createFaceDetector, type FaceDetector } from './detection/faceLandmarker'
import { createFaceObservation } from './detection/faceObservation'
import { EyeMonitor } from './detection/eyeMonitor'
import type {
  CalibrationProfile,
  CalibrationStatus,
  EyeMonitorOutput,
  FaceObservation,
} from './detection/types'

type SessionState =
  | 'idle'
  | 'starting-camera'
  | 'loading-model'
  | 'calibrating'
  | 'monitoring'
  | 'error'

const targetIntervalMs = 1000 / 15

const initialCalibrationStatus = (): CalibrationStatus => ({
  phase: 'positioning',
  progress: 0,
  completedBlinks: 0,
  requiredBlinks: 3,
  guidance: 'Center your face and hold still in good light.',
  profile: null,
})

const initialMonitorOutput = (): EyeMonitorOutput => ({
  state: 'unavailable',
  smoothedLeft: 0,
  smoothedRight: 0,
  closureDurationMs: 0,
  blinkCount: 0,
  sustainedClosureCount: 0,
  alerting: false,
  stateChanged: false,
  alertStarted: false,
})

const storedBoolean = (key: string, fallback: boolean) => {
  try {
    const value = localStorage.getItem(key)
    return value === null ? fallback : value === 'true'
  } catch {
    return fallback
  }
}

const storedNumber = (key: string, fallback: number) => {
  try {
    const value = Number(localStorage.getItem(key))
    return Number.isFinite(value) && value > 0 ? value : fallback
  } catch {
    return fallback
  }
}

const storeValue = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Preferences are optional; monitoring must still work when storage is unavailable.
  }
}

function EyeMonitorApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<FaceDetector | null>(null)
  const calibrationRef = useRef<CalibrationController | null>(null)
  const monitorRef = useRef<EyeMonitor | null>(null)
  const alertSoundRef = useRef<AlertSound | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastInferenceRef = useRef(0)
  const inferenceTimesRef = useRef<number[]>([])
  const sessionGenerationRef = useRef(0)
  const alertDelayRef = useRef(storedNumber('eye-test-alert-delay', 1000))
  const soundEnabledRef = useRef(storedBoolean('eye-test-sound', false))

  const [sessionState, setSessionState] = useState<SessionState>('idle')
  const [observation, setObservation] = useState<FaceObservation | null>(null)
  const [calibrationStatus, setCalibrationStatus] = useState(initialCalibrationStatus)
  const [profile, setProfile] = useState<CalibrationProfile | null>(null)
  const [monitorOutput, setMonitorOutput] = useState<EyeMonitorOutput | null>(null)
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [delegate, setDelegate] = useState<'GPU' | 'CPU' | null>(null)
  const [alertDelayMs, setAlertDelayMs] = useState(alertDelayRef.current)
  const [soundEnabled, setSoundEnabled] = useState(soundEnabledRef.current)
  const [showPreview, setShowPreview] = useState(() => storedBoolean('eye-test-preview', true))
  const [showDiagnostics, setShowDiagnostics] = useState(() =>
    storedBoolean('eye-test-diagnostics', false),
  )

  const stopSession = useCallback(() => {
    sessionGenerationRef.current += 1
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    detectorRef.current?.close()
    detectorRef.current = null
    calibrationRef.current = null
    monitorRef.current = null
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    lastInferenceRef.current = 0
    inferenceTimesRef.current = []
    setObservation(null)
    setCalibrationStatus(initialCalibrationStatus())
    setProfile(null)
    setMonitorOutput(null)
    setSessionElapsedSeconds(0)
    setDelegate(null)
    setSessionState('idle')
  }, [])

  useEffect(
    () => () => {
      stopSession()
      void alertSoundRef.current?.close()
    },
    [stopSession],
  )

  useEffect(() => {
    if (sessionState !== 'monitoring') return
    const timer = window.setInterval(() => {
      setSessionElapsedSeconds((seconds) => seconds + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [sessionState])

  useEffect(() => {
    alertDelayRef.current = alertDelayMs
    monitorRef.current?.setAlertDelay(alertDelayMs)
    storeValue('eye-test-alert-delay', String(alertDelayMs))
  }, [alertDelayMs])

  useEffect(() => storeValue('eye-test-preview', String(showPreview)), [showPreview])
  useEffect(
    () => storeValue('eye-test-diagnostics', String(showDiagnostics)),
    [showDiagnostics],
  )

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

      const nextObservation = createFaceObservation({
        result,
        timestampMs: now,
        inferenceMs,
        processedFps: recentTimes.length,
      })
      setObservation(nextObservation)

      if (calibrationRef.current) {
        const nextCalibrationStatus = calibrationRef.current.update(nextObservation)
        setCalibrationStatus(nextCalibrationStatus)

        if (nextCalibrationStatus.profile) {
          const calibratedProfile = nextCalibrationStatus.profile
          calibrationRef.current = null
          monitorRef.current = new EyeMonitor(calibratedProfile, {
            alertDelayMs: alertDelayRef.current,
          })
          setProfile(calibratedProfile)
          setMonitorOutput(initialMonitorOutput())
          setSessionElapsedSeconds(0)
          setSessionState('monitoring')
        }
      } else if (monitorRef.current) {
        const output = monitorRef.current.update(nextObservation)
        setMonitorOutput(output)
        if (output.alertStarted && soundEnabledRef.current) alertSoundRef.current?.play()
      }
    }

    animationFrameRef.current = requestAnimationFrame(processFrameLoop)
  }, [])

  const startSession = async () => {
    const generation = ++sessionGenerationRef.current
    setErrorMessage('')
    setSessionState('starting-camera')

    if (soundEnabledRef.current) {
      alertSoundRef.current ??= new AlertSound()
      try {
        await alertSoundRef.current.unlock()
      } catch {
        setSoundEnabled(false)
        soundEnabledRef.current = false
      }
    }
    if (generation !== sessionGenerationRef.current) return

    try {
      const stream = await requestFrontCamera()
      if (generation !== sessionGenerationRef.current) {
        stopCamera(stream)
        return
      }
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error('The camera preview is not available.')
      video.srcObject = stream
      await video.play()
      if (generation !== sessionGenerationRef.current) return

      setSessionState('loading-model')
      const detector = await createFaceDetector()
      if (generation !== sessionGenerationRef.current) {
        detector.close()
        return
      }
      detectorRef.current = detector
      calibrationRef.current = new CalibrationController()
      setCalibrationStatus(initialCalibrationStatus())
      setDelegate(detector.delegate)
      setSessionState('calibrating')
      animationFrameRef.current = requestAnimationFrame(processFrame)
    } catch (error) {
      if (generation !== sessionGenerationRef.current) return
      detectorRef.current?.close()
      detectorRef.current = null
      stopCamera(streamRef.current)
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setErrorMessage(cameraErrorMessage(error))
      setSessionState('error')
    }
  }

  const beginMonitoring = (calibratedProfile: CalibrationProfile) => {
    calibrationRef.current = null
    monitorRef.current = new EyeMonitor(calibratedProfile, {
      alertDelayMs: alertDelayRef.current,
    })
    setProfile(calibratedProfile)
    setMonitorOutput(initialMonitorOutput())
    setSessionElapsedSeconds(0)
    setSessionState('monitoring')
  }

  const recalibrate = () => {
    calibrationRef.current = new CalibrationController()
    monitorRef.current = null
    setCalibrationStatus(initialCalibrationStatus())
    setProfile(null)
    setMonitorOutput(null)
    setSessionElapsedSeconds(0)
    setSessionState('calibrating')
  }

  const handleSoundChange = (enabled: boolean) => {
    setSoundEnabled(enabled)
    soundEnabledRef.current = enabled
    storeValue('eye-test-sound', String(enabled))
    if (enabled) {
      alertSoundRef.current ??= new AlertSound()
      void alertSoundRef.current.unlock().catch(() => {
        setSoundEnabled(false)
        soundEnabledRef.current = false
      })
    }
  }

  const isActive = !['idle', 'error'].includes(sessionState)
  const isStarting = sessionState === 'starting-camera' || sessionState === 'loading-model'
  const cameraMode =
    sessionState === 'calibrating'
      ? 'calibrating'
      : sessionState === 'monitoring'
        ? 'monitoring'
        : 'idle'
  const currentOutput = monitorOutput ?? initialMonitorOutput()

  return (
    <main className={`app-shell ${currentOutput.alerting ? 'app-alerting' : ''}`}>
      <header className="hero">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="EyeTestForWeb home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>EyeTestForWeb</span>
        </a>
        <span className="prototype-badge">Eye monitoring MVP</span>
      </header>

      <section className="intro compact-intro">
        <div>
          <p className="eyebrow">Private, calibrated eye monitoring</p>
          <h1>Know when your eyes stay closed.</h1>
          <p className="lede">
            Calibrate once, then monitor blinks, one-eye closures, and sustained bilateral closure with
            configurable visual and sound alerts—all processed inside your browser.
          </p>
        </div>
        <div className="privacy-note">
          <span className="privacy-icon" aria-hidden="true">●</span>
          <p><strong>No video upload.</strong> Camera frames and eye signals stay in this tab.</p>
        </div>
      </section>

      <div className="workspace">
        <CameraStage
          videoRef={videoRef}
          observation={observation}
          active={isActive}
          showPreview={showPreview}
          mode={cameraMode}
          eyeState={currentOutput.state}
          alerting={currentOutput.alerting}
        />

        <div className="side-column">
          {(sessionState === 'idle' || sessionState === 'error' || isStarting) && (
            <section className="panel controls">
              <p className="eyebrow">Eye monitoring session</p>
              <h2>{isStarting ? 'Starting securely…' : 'Ready when you are'}</h2>
              <p>
                Prop the phone at eye level in steady light. A short calibration personalizes the detector
                before monitoring begins.
              </p>
              {errorMessage && <div className="error-message" role="alert">{errorMessage}</div>}
              <div className="button-row">
                <button className="primary-button" onClick={startSession} disabled={isStarting}>
                  {sessionState === 'starting-camera'
                    ? 'Requesting camera…'
                    : sessionState === 'loading-model'
                      ? 'Loading detector…'
                      : sessionState === 'error'
                        ? 'Try again'
                        : 'Start and calibrate'}
                </button>
                {isStarting && (
                  <button className="text-button danger-text" onClick={stopSession}>
                    Cancel startup
                  </button>
                )}
              </div>
              <ol className="setup-list">
                <li><span>1</span> Grant front-camera access</li>
                <li><span>2</span> Hold your eyes naturally open</li>
                <li><span>3</span> Blink three times</li>
              </ol>
            </section>
          )}

          {sessionState === 'calibrating' && (
            <CalibrationPanel
              status={calibrationStatus}
              onUseDefaults={() => beginMonitoring(defaultCalibrationProfile())}
              onStop={stopSession}
            />
          )}

          {sessionState === 'monitoring' && monitorOutput && observation && (
            <MonitorPanel
              output={monitorOutput}
              quality={observation.quality}
              sessionSeconds={sessionElapsedSeconds}
              onRecalibrate={recalibrate}
              onStop={stopSession}
            />
          )}

          {isActive && (
            <SettingsPanel
              alertDelayMs={alertDelayMs}
              soundEnabled={soundEnabled}
              showPreview={showPreview}
              showDiagnostics={showDiagnostics}
              onAlertDelayChange={setAlertDelayMs}
              onSoundChange={handleSoundChange}
              onPreviewChange={setShowPreview}
              onDiagnosticsChange={setShowDiagnostics}
            />
          )}

          {showDiagnostics && isActive && (
            <Diagnostics
              observation={observation}
              delegate={delegate}
              detectorStatus={sessionState === 'monitoring' ? 'Monitoring' : 'Calibrating'}
              monitorOutput={monitorOutput}
              profile={profile}
            />
          )}
        </div>
      </div>

      <section className="limitations">
        <p className="eyebrow">Important boundary</p>
        <h2>Awareness tool, not safety or medical monitoring.</h2>
        <p>
          Results can be wrong because of lighting, movement, camera quality, glasses, or individual
          differences. Do not use this app to determine whether it is safe to drive or operate machinery,
          and do not rely on it during an emergency.
        </p>
      </section>

      <footer>
        <span>EyeTestForWeb · Open-source, on-device browser prototype</span>
        <a href="https://github.com/SoundGuyAI/EyeTestForWeb">View source on GitHub</a>
      </footer>
    </main>
  )
}

export default EyeMonitorApp
