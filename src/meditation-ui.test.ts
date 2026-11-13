import { createElement } from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MeditationPanel } from './MeditationPanel'
import { openCalibrationGate } from './detection/calibration'
const noop = () => {}
const render = (overrides = {}) => renderToStaticMarkup(createElement(MeditationPanel, {eye:'unavailable', observation:null, monitoring:false, calibration:null, cueGateRef:{ current: openCalibrationGate() }, cameraBusy:false, onInputModeChange:noop, cameraSurface:createElement('div', {'data-camera-surface':'true'}, 'Camera setup'), showCameraPreview:false, onCameraPreviewChange:noop, onStopCamera:noop, ...overrides}))
describe('Meditation input defaults', () => {
  it('defaults to real eyes and retains manual fallback', () => {
    const html = render()
    expect(html).toContain('aria-pressed="true">Use my eyes')
    expect(html).toContain('aria-pressed="false">Manual rehearsal')
    expect(html).not.toContain('aria-label="Simulated eye state"')
  })
  it('has an unchecked preview checkbox without removing the camera surface', () => {
    const html = render()
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('checked=""')
    expect(html).toContain('data-camera-surface="true"')
    expect(html.indexOf('data-camera-surface')).toBeLessThan(html.indexOf('scene-subtitle'))
  })
  it('preserves female narration default and waits for camera calibration', () => {
    const html = render()
    expect(html).toContain('aria-pressed="true">Female voice')
    expect(html).not.toContain('meditation-start')
    expect(html).toContain('Start your camera in the scene above.')
  })
  it('offers Start in the central scene box once monitoring begins', () => {
    const html = render({ monitoring: true })
    expect(html).toContain('Calibration complete')
    expect(html).toContain('Start level 01')
    expect(html.indexOf('scene-calibration')).toBeLessThan(html.indexOf('scene-subtitle'))
    expect(html).not.toContain('meditation-start')
  })
})
