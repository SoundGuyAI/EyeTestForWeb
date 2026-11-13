import { createElement } from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MeditationPanel } from './MeditationPanel'
const noop = () => {}
const render = () => renderToStaticMarkup(createElement(MeditationPanel, {eye:'unavailable', observation:null, monitoring:false, cameraBusy:false, onInputModeChange:noop, cameraSurface:createElement('div', {'data-camera-surface':'true'}, 'Camera setup'), showCameraPreview:false, onCameraPreviewChange:noop, onStopCamera:noop}))
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
    expect(html).toContain('disabled="">Start level 01')
    expect(html).not.toContain('camera panel below')
  })
})
