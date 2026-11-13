import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { EyeState, FaceObservation } from './detection/types'
import { LessonController, lesson } from './meditation-lesson'
import './meditation.css'
import { defaultNarrationVoice, narrationVoices } from './narration-assets'
import type { NarrationVoice } from './narration-assets'

type Props = { eye: EyeState; observation: FaceObservation | null; monitoring: boolean; cameraSurface: ReactNode; showCameraPreview: boolean; onCameraPreviewChange: (show: boolean) => void; onStopCamera: () => void; cameraBusy: boolean; onInputModeChange: (mode: 'manual' | 'camera') => void }

export function MeditationPanel({ eye, observation, monitoring, cameraSurface, showCameraPreview, onCameraPreviewChange, onStopCamera, cameraBusy, onInputModeChange }: Props) {
  const controller = useRef(new LessonController())
  const [snapshot, setSnapshot] = useState(() => new LessonController().get())
  const [mode, setMode] = useState<'manual' | 'camera'>('camera')
  const [manualEye, setManualEye] = useState<EyeState>('open')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [voice, setVoice] = useState<NarrationVoice>(defaultNarrationVoice)
  const [audioStatus, setAudioStatus] = useState('Narration ready. Start the lesson to play.')
  const audio = useRef<HTMLAudioElement | null>(null)
  const audioKind = useRef<'cue' | 'response'>('cue')
  const spoken = useRef(new Set<string>())
  const stopAudio = () => { if (audio.current) { audio.current.pause(); audio.current.onended = null; audio.current.onerror = null; audio.current = null } }
  const input = useRef({ eye, observation, monitoring, manualEye, mode })
  useEffect(() => { input.current = { eye, observation, monitoring, manualEye, mode } }, [eye, observation, monitoring, manualEye, mode])
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
    const hide = () => { if (document.hidden) { stopAudio(); setSnapshot(controller.current.pause(true)) } }
    document.addEventListener('visibilitychange', hide)
    return () => { stopAudio(); window.clearInterval(timer); document.removeEventListener('visibilitychange', hide) }
  }, [])
  useEffect(() => {
    if (!snapshot.running || snapshot.paused || !audioEnabled) { stopAudio(); return }
    const cueId = lesson[snapshot.step].id
    const id = snapshot.feedback?.id ?? cueId
    const key = `${snapshot.step}:${id}`
    if (spoken.current.has(key)) return
    const source = narrationVoices[voice][id]
    if (!source) return
    stopAudio()
    const clip = new Audio(source)
    audio.current = clip
    audioKind.current = snapshot.feedback ? 'response' : 'cue'
    spoken.current.add(key)
    clip.onended = () => { if (audio.current === clip) { audio.current = null; setAudioStatus('Narration finished. Follow the eye cue.') } }
    clip.onerror = () => { if (audio.current === clip) { audio.current = null; setAudioStatus('Audio unavailable. Subtitles and eye controls still work.') } }
    clip.onplaying = () => setAudioStatus('Narration playing. The eye-hold timer waits until it finishes.')
    void clip.play().catch(() => { if (audio.current === clip) { audio.current = null; setAudioStatus('Playback blocked. Use Enable narration or continue with subtitles.') } })
  }, [snapshot.step, snapshot.running, snapshot.paused, snapshot.feedback, audioEnabled, voice])
  const cue = lesson[snapshot.step]
  const started = snapshot.running || snapshot.complete
  const disrupted = snapshot.step >= 3
  const progress = Math.min(100, snapshot.heldMs / cue.holdMs * 100)
  const changeMode = (next: 'manual' | 'camera') => {
    stopAudio(); spoken.current.clear(); setMode(next); onInputModeChange(next); setManualEye('open'); setSnapshot(controller.current.reset())
    if (next === 'manual') onStopCamera()
  }
  const start = () => { stopAudio(); spoken.current.clear(); setManualEye('open'); setSnapshot(controller.current.start()) }
  const changeVoice = (next: NarrationVoice) => {
    if (next === voice) return
    stopAudio()
    spoken.current.delete(`${snapshot.step}:${cue.id}`)
    if (snapshot.feedback) spoken.current.delete(`${snapshot.step}:${snapshot.feedback.id}`)
    setVoice(next)
  }

  return (
    <section className="meditation-demo" aria-label="Meditation EXTREME demo">
      <div className="meditation-heading">
        <div><p className="eyebrow">Meditation: EXTREME / playable first-level sketch</p><h1>Inner peace.<br /><em>Terms apply.</em></h1></div>
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
          {mode === 'camera' && cameraSurface}</div>
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
          {!started && <button className="meditation-start" disabled={mode === 'camera' && !monitoring} onClick={start}>Start level 01 <span aria-hidden="true">↗</span></button>}
          {snapshot.complete && <button className="meditation-start" onClick={start}>Try the ritual again</button>}
          {snapshot.running && <div className="button-row"><button className="secondary-button" onClick={() => { stopAudio(); spoken.current.delete(`${snapshot.step}:${cue.id}`); setSnapshot(controller.current.pause(!snapshot.paused)) }}>{snapshot.paused ? 'Resume' : 'Pause'}</button><button className="text-button" onClick={() => { stopAudio(); spoken.current.clear(); setSnapshot(controller.current.reset()) }}>Reset level</button></div>}
          {mode === 'manual' && <div className="manual-eye-controls" role="group" aria-label="Simulated eye state"><button aria-pressed={manualEye === 'open'} onClick={() => setManualEye('open')}>Eyes open</button><button aria-pressed={manualEye === 'closed'} onClick={() => setManualEye('closed')}>Eyes closed</button></div>}
          {mode === 'camera' && <p className="lesson-signal">{monitoring ? `Detector: ${eye.replaceAll('-', ' ')}` : 'Detector: waiting for calibration'}</p>}
          {snapshot.running && <div className="hold-meter"><div role="progressbar" aria-label="Current eye hold" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div><p>{snapshot.paused ? 'Paused. Resume when ready.' : snapshot.waitingForSignal ? 'Waiting for a usable, fresh face signal. No progress counted.' : cue.target === 'wait' ? 'A moment to settle in...' : `Hold both eyes ${cue.target}. Brief blinks and one-eye closures do not complete this cue.`}</p></div>}
          <div className="voice-note"><strong>Spoken narration + subtitles</strong><p>Calm instructions, unnecessary bureaucracy. Extra responses wait for a reliable opposite eye state, never tracking loss.</p><div className="lesson-mode voice-picker" role="group" aria-label="Narration voice"><button aria-pressed={voice === 'female'} onClick={() => changeVoice('female')}>Female voice</button><button aria-pressed={voice === 'male'} onClick={() => changeVoice('male')}>Male voice</button></div><button className="secondary-button" aria-pressed={audioEnabled} onClick={() => { stopAudio(); spoken.current.delete(`${snapshot.step}:${cue.id}`); setAudioEnabled(!audioEnabled) }}>{audioEnabled ? 'Mute narration' : 'Enable narration'}</button><p role="status">{audioStatus}</p></div>
          <p className="lesson-safety">Play seated, with the device supported. Open your eyes or stop at any time. No flashing effects, breath holding, recording or medical claims.</p>
          {mode === 'camera' && <button className="text-button danger-text" onClick={() => { stopAudio(); spoken.current.clear(); setSnapshot(controller.current.reset()); onStopCamera() }}>End lesson and stop camera</button>}
        </aside>
      </div>
    </section>
  )
}
