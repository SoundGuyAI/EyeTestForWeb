import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { CalibrationStatus, EyeState, FaceObservation } from './detection/types'
import { LessonController, lesson } from './meditation-lesson'
import './meditation.css'
import { calibrationNarration, defaultNarrationVoice, narrationVoices } from './narration-assets'
import type { CalibrationCueId, NarrationVoice } from './narration-assets'
import { narrationAudio, unlockNarration } from './audio/narration-player'
import type { CalibrationNarrationGate } from './detection/calibration'

type Props = { eye: EyeState; observation: FaceObservation | null; monitoring: boolean; calibration: CalibrationStatus | null; cueGateRef: { current: CalibrationNarrationGate }; cameraSurface: ReactNode; showCameraPreview: boolean; onCameraPreviewChange: (show: boolean) => void; onStopCamera: () => void; cameraBusy: boolean; onInputModeChange: (mode: 'manual' | 'camera') => void }

const positioningCueId = (): CalibrationCueId =>
  typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? 'cal-positioning-phone'
    : 'cal-positioning-desktop'

export function MeditationPanel({ eye, observation, monitoring, calibration, cueGateRef, cameraSurface, showCameraPreview, onCameraPreviewChange, onStopCamera, cameraBusy, onInputModeChange }: Props) {
  const controller = useRef(new LessonController())
  const [snapshot, setSnapshot] = useState(() => new LessonController().get())
  const [mode, setMode] = useState<'manual' | 'camera'>('camera')
  const [manualEye, setManualEye] = useState<EyeState>('open')
  const [audioEnabled] = useState(true)
  const [voice, setVoice] = useState<NarrationVoice>(defaultNarrationVoice)
  const [audioStatus, setAudioStatus] = useState('Narration ready. Start the lesson to play.')
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioKind = useRef<'cue' | 'response' | 'calibration'>('cue')
  const spoken = useRef(new Set<string>())
  const calibrationQueue = useRef<CalibrationCueId[]>([])
  const blinkPromptsQueued = useRef(0)
  const input = useRef({ eye, observation, monitoring, manualEye, mode })
  useEffect(() => { input.current = { eye, observation, monitoring, manualEye, mode } }, [eye, observation, monitoring, manualEye, mode])
  const voiceRef = useRef(voice)
  useEffect(() => { voiceRef.current = voice }, [voice])

  const stopAudio = () => { if (audio.current) { audio.current.pause(); audio.current.onended = null; audio.current.onerror = null; audio.current.onplaying = null; audio.current = null } }

  const playClip = (kind: 'cue' | 'response' | 'calibration', source: string, statusWhilePlaying: string, statusWhenDone: string, onSettled?: () => void) => {
    stopAudio()
    const el = narrationAudio()
    el.src = source
    el.currentTime = 0
    audio.current = el
    audioKind.current = kind
    const settle = (status: string) => {
      if (audio.current === el) {
        audio.current = null
        setAudioStatus(status)
        onSettled?.()
      }
    }
    el.onended = () => settle(statusWhenDone)
    el.onerror = () => settle('Audio unavailable. Subtitles and eye controls still work.')
    el.onplaying = () => setAudioStatus(statusWhilePlaying)
    void el.play().catch(() => settle('Playback blocked. Tap again for narration; subtitles still work.'))
  }

  // A calibration cue counts as heard when it finishes, and also when it fails or is
  // blocked, so gated calibration phases never stall when audio cannot play.
  const markCalibrationCueDone = (id: CalibrationCueId) => {
    if (id === 'cal-positioning-phone' || id === 'cal-positioning-desktop') cueGateRef.current.positioningCueDone = true
    else if (id === 'cal-open') cueGateRef.current.openCueDone = true
    else if (id === 'cal-blink') cueGateRef.current.blinkIntroDone = true
    else if (id === 'cal-blink-each') cueGateRef.current.blinkPromptsDone += 1
  }

  // Calibration clips queue and always play to completion: phases are shorter than
  // the clips, so nothing cuts an instruction off and prompts follow the detected blinks.
  const pumpCalibrationQueue = () => {
    if (audio.current) return
    const next = calibrationQueue.current.shift()
    if (!next) return
    playClip('calibration', calibrationNarration[voiceRef.current][next], 'Calibration guidance playing.', 'Follow the on-screen calibration steps.', () => {
      markCalibrationCueDone(next)
      pumpCalibrationQueue()
    })
  }

  const queueCalibrationCue = (id: CalibrationCueId) => {
    if (spoken.current.has(id)) return
    spoken.current.add(id)
    calibrationQueue.current.push(id)
  }

  const prevCalibrationPhaseRef = useRef<CalibrationStatus['phase'] | null>(null)
  useEffect(() => { cueGateRef.current.narrationActive = audioEnabled && mode === 'camera' }, [audioEnabled, mode, cueGateRef])
  useEffect(() => {
    const phase = calibration ? calibration.phase : null
    const freshRun = phase === 'positioning' && prevCalibrationPhaseRef.current == null
    prevCalibrationPhaseRef.current = phase
    if (mode !== 'camera' || !audioEnabled) return
    if (snapshot.running || snapshot.complete) { calibrationQueue.current = []; return }
    if (freshRun) {
      // A new calibration run re-arms every cue and gate flag.
      for (const id of ['cal-positioning-phone', 'cal-positioning-desktop', 'cal-open', 'cal-blink', 'cal-blink-each', 'cal-done'] as const) spoken.current.delete(id)
      blinkPromptsQueued.current = 0
      cueGateRef.current.positioningCueDone = false
      cueGateRef.current.openCueDone = false
      cueGateRef.current.blinkIntroDone = false
      cueGateRef.current.blinkPromptsDone = 0
    }
    if (calibration) {
      if (calibration.phase === 'positioning') queueCalibrationCue(positioningCueId())
      else if (calibration.phase === 'eyes-open') queueCalibrationCue('cal-open')
      else if (calibration.phase === 'blink-practice') {
        queueCalibrationCue('cal-blink')
        // One separate prompt per blink: prompt 1 follows the intro, each later
        // prompt follows the blink before it, and a blink only counts once its
        // prompt has finished (enforced by the narration gate).
        const wanted = Math.min(3, 1 + calibration.completedBlinks)
        while (blinkPromptsQueued.current < wanted) {
          blinkPromptsQueued.current += 1
          calibrationQueue.current.push('cal-blink-each')
        }
      }
      pumpCalibrationQueue()
      return
    }
    if (monitoring) {
      // Calibration just finished: drop any unplayed blink prompts, then say so.
      calibrationQueue.current = calibrationQueue.current.filter((id) => id !== 'cal-blink-each')
      queueCalibrationCue('cal-done')
      pumpCalibrationQueue()
    }
  }, [calibration, monitoring, mode, audioEnabled, snapshot.running, snapshot.complete, cueGateRef])

  useEffect(() => {
    let previous = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const state = input.current
      const fresh = state.observation !== null && now - state.observation.timestampMs < 400
      const valid = state.mode === 'manual' || (state.monitoring && fresh && state.observation?.quality === 'good')
      if (audio.current) {
        if (audioKind.current === 'response' && !valid) stopAudio()
        else { previous = now; return }
      }
      setSnapshot(controller.current.update(now - previous, state.mode === 'manual' ? state.manualEye : state.eye, valid))
      previous = now
    }, 100)
    const hide = () => { if (document.hidden) { stopAudio(); calibrationQueue.current = []; setSnapshot(controller.current.pause(true)) } }
    document.addEventListener('visibilitychange', hide)
    return () => { stopAudio(); window.clearInterval(timer); document.removeEventListener('visibilitychange', hide) }
  }, [])
  useEffect(() => {
    if (!snapshot.running || snapshot.paused || !audioEnabled) {
      if (audio.current && audioKind.current !== 'calibration') stopAudio()
      return
    }
    const cueId = lesson[snapshot.step].id
    const id = snapshot.feedback?.id ?? cueId
    const key = `${snapshot.step}:${id}`
    if (spoken.current.has(key)) return
    const source = narrationVoices[voice][id]
    if (!source) return
    spoken.current.add(key)
    playClip(snapshot.feedback ? 'response' : 'cue', source, 'Narration playing. The eye-hold timer waits until it finishes.', 'Narration finished. Follow the eye cue.')
  }, [snapshot.step, snapshot.running, snapshot.paused, snapshot.feedback, audioEnabled, voice])
  const cue = lesson[snapshot.step]
  const started = snapshot.running || snapshot.complete
  const disrupted = snapshot.step >= 3
  const progress = Math.min(100, snapshot.heldMs / cue.holdMs * 100)
  const changeMode = (next: 'manual' | 'camera') => {
    stopAudio(); calibrationQueue.current = []; blinkPromptsQueued.current = 0; spoken.current.clear(); setMode(next); onInputModeChange(next); setManualEye('open'); setSnapshot(controller.current.reset())
    if (next === 'manual') onStopCamera()
  }
  const start = () => { stopAudio(); unlockNarration(); calibrationQueue.current = []; blinkPromptsQueued.current = 0; spoken.current.clear(); setManualEye('open'); setSnapshot(controller.current.start()) }
  const changeVoice = (next: NarrationVoice) => {
    if (next === voice) return
    stopAudio()
    spoken.current.clear()
    setVoice(next)
  }
  return (
    <section className="meditation-demo">
      <div className="meditation-heading">
        <p className="eyebrow">Meditation: EXTREME / playable first-level sketch</p><h1>Inner peace.<br /><em>Terms apply.</em></h1>
        <p className="meditation-intro">A calm eye-opening ritual meets an entirely unnecessary serenity inspection. A short, seated comedy prototype, not a health tool.</p>
      </div>
      <div className="meditation-layout">
        <div className={`serenity-stage ${disrupted ? 'inspection-active' : ''} ${snapshot.complete ? 'lesson-complete' : ''}`}>
          <div className="scene-caption"><span>01 / A perfectly ordinary moment</span><span>{mode === 'manual' ? 'REHEARSAL / CAMERA OFF' : 'CAMERA INPUT'}</span>{mode === 'camera' && <label className="camera-preview-choice"><input type="checkbox" checked={showCameraPreview} onChange={(event) => onCameraPreviewChange(event.target.checked)} /> Show camera preview in corner</label>}</div>
          <div className={`scene-space ${mode === 'camera' && !monitoring ? 'scene-setup' : ''}`}><div className="zen-room" aria-hidden="true">
            <div className="zen-window" /><div className="zen-horizon" /><div className="zen-orbit orbit-one" /><div className="zen-orbit orbit-two" />
            <div className="zen-stone stone-bottom" /><div className="zen-stone stone-middle" /><div className="zen-stone stone-top" />
            {disrupted && <><div className="inspection-slip slip-one">DEPT. OF INNER PEACE<br /><strong>INSPECTION<br />IN PROGRESS</strong><small>Please do not disturb the tranquility.</small></div><div className="inspection-slip slip-two">FORM 01-B<br /><strong>RELAXATION<br />IS MANDATORY</strong><small>Failure to unwind may result in more forms.</small></div><div className="inspection-stamp">{snapshot.complete ? 'PROVISIONALLY CALM' : 'CALM PENDING'}</div></>}
          </div>
          {mode === 'camera' && cameraSurface}
          {mode === 'camera' && monitoring && !started && (
            <div className="scene-calibration">
              <section className="panel scene-camera-start" aria-label="Begin the level">
                <p className="eyebrow">Calibration complete</p>
                <h2>Your eyes are registered.</h2>
                <p role="status">Everything is ready. The ritual begins when you do.</p>
                <button className="primary-button" onClick={start}>Start level 01 <span aria-hidden="true">↗</span></button>
                <p className="helper-copy">Camera images stay in this tab. No recording or upload.</p>
              </section>
            </div>
          )}</div>
          <div className="scene-subtitle" role="status" aria-live="polite">
            <p className="cue-label">{snapshot.complete ? 'First level complete' : started ? `Cue ${snapshot.step + 1} of ${lesson.length} / ${snapshot.paused ? 'Paused' : cue.target === 'wait' ? 'Settle in' : `${cue.target === 'closed' ? 'Close' : 'Open'} both eyes`}` : 'A small moment of peace, awaiting approval'}</p>
            <h2>{snapshot.complete ? 'You have been certified almost serene.' : started ? cue.title : 'The world can wait. Probably.'}</h2>
            <p>{started ? cue.line : 'Start with a quiet scene. Follow the open/close-eye prompts. Discover what happened while you were not looking.'}</p>
            {snapshot.feedback && <p className="reactive-dialogue" role="status">{snapshot.feedback.line}</p>}
          </div>
        </div>
        <aside className="lesson-controls">
          <p className="eyebrow">Your session</p>
          <div className="lesson-mode" role="group" aria-label="Input mode">
            <button aria-pressed={mode === 'manual'} onClick={() => changeMode('manual')}>Manual rehearsal</button><button aria-pressed={mode === 'camera'} onClick={() => changeMode('camera')}>Use my eyes</button>
          </div>
          <p className="lesson-mode-copy">{mode === 'manual' ? 'Camera off. Use the two buttons below to simulate eye states. This tests the scene, not eye detection.' : 'Your front camera supplies eye states after calibration. Position it at eye level. Camera images stay in this tab.'}</p>
          {mode === 'camera' && !monitoring && <p className="helper-copy">{cameraBusy ? 'Follow the calibration in the scene.' : 'Start your camera in the scene above. Preview is optional; tracking works with it hidden.'}</p>}
          {mode === 'camera' && monitoring && !started && <p className="helper-copy">Calibration complete. The Start button is waiting in the scene above.</p>}
          {!started && mode === 'manual' && <button className="meditation-start" onClick={start}>Start level 01 <span aria-hidden="true">↗</span></button>}
          {snapshot.complete && <button className="meditation-start" onClick={start}>Try the ritual again</button>}
          {snapshot.running && <div className="button-row"><button className="secondary-button" onClick={() => { stopAudio(); spoken.current.delete(`${snapshot.step}:${cue.id}`); setSnapshot(controller.current.pause(!snapshot.paused)) }}>{snapshot.paused ? 'Resume' : 'Pause'}</button><button className="text-button" onClick={() => { stopAudio(); spoken.current.clear(); setSnapshot(controller.current.reset()) }}>Reset level</button></div>}
          {mode === 'manual' && <div className="manual-eye-controls" role="group" aria-label="Simulated eye state"><button aria-pressed={manualEye === 'open'} onClick={() => setManualEye('open')}>Eyes open</button><button aria-pressed={manualEye === 'closed'} onClick={() => setManualEye('closed')}>Eyes closed</button></div>}
          {mode === 'camera' && <p className="lesson-signal">{monitoring ? `Detector: ${eye.replaceAll('-', ' ')}` : 'Detector: waiting for calibration'}</p>}
          {snapshot.running && <div className="hold-meter"><div role="progressbar" aria-label="Current eye hold" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div><p>{snapshot.paused ? 'Paused. Resume when ready.' : snapshot.waitingForSignal ? 'Waiting for a usable, fresh face signal. No progress counted.' : cue.target === 'wait' ? 'A moment to settle in...' : `Hold both eyes ${cue.target}. Brief blinks and one-eye closures do not complete this cue.`}</p></div>}
          <div className="voice-note"><strong>Spoken narration + subtitles</strong><p>Calm instructions, unnecessary bureaucracy. Extra responses wait for a reliable opposite eye state, never tracking loss.</p><div className="lesson-mode voice-picker" role="group" aria-label="Narration voice"><button aria-pressed={voice === 'female'} onClick={() => changeVoice('female')}>Female voice</button><button aria-pressed={voice === 'male'} onClick={() => changeVoice('male')}>Male voice</button></div><p role="status">{audioStatus}</p></div>
          <p className="lesson-safety">Play seated, with the device supported. Open your eyes or stop at any time. No flashing effects, breath holding, recording or medical claims.</p>
          {mode === 'camera' && <button className="text-button danger-text" onClick={() => { stopAudio(); calibrationQueue.current = []; blinkPromptsQueued.current = 0; spoken.current.clear(); setSnapshot(controller.current.reset()); onStopCamera() }}>End lesson and stop camera</button>}
        </aside>
      </div>
    </section>
  )
          }
