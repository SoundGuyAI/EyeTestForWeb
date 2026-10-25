interface SettingsPanelProps {
  alertDelayMs: number
  soundEnabled: boolean
  showPreview: boolean
  showDiagnostics: boolean
  onAlertDelayChange: (value: number) => void
  onSoundChange: (value: boolean) => void
  onPreviewChange: (value: boolean) => void
  onDiagnosticsChange: (value: boolean) => void
}

const Toggle = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) => (
  <label className="toggle-row">
    <span>
      <strong>{label}</strong>
      <small>{description}</small>
    </span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="toggle-control" aria-hidden="true" />
  </label>
)

export function SettingsPanel({
  alertDelayMs,
  soundEnabled,
  showPreview,
  showDiagnostics,
  onAlertDelayChange,
  onSoundChange,
  onPreviewChange,
  onDiagnosticsChange,
}: SettingsPanelProps) {
  return (
    <section className="panel settings-panel">
      <p className="eyebrow">Session settings</p>
      <label className="select-label" htmlFor="alert-delay">
        <span>
          <strong>Eyes-closed alert delay</strong>
          <small>Short blinks below this duration will not alert.</small>
        </span>
        <select
          id="alert-delay"
          value={alertDelayMs}
          onChange={(event) => onAlertDelayChange(Number(event.target.value))}
        >
          <option value={500}>0.5 seconds</option>
          <option value={1000}>1 second</option>
          <option value={1500}>1.5 seconds</option>
          <option value={2000}>2 seconds</option>
          <option value={3000}>3 seconds</option>
        </select>
      </label>

      <Toggle
        label="Sound alert"
        description="Play a short tone when sustained closure begins."
        checked={soundEnabled}
        onChange={onSoundChange}
      />
      <Toggle
        label="Show camera preview"
        description="Detection continues locally when the preview is hidden."
        checked={showPreview}
        onChange={onPreviewChange}
      />
      <Toggle
        label="Developer diagnostics"
        description="Show raw signals, timing, and calibrated thresholds."
        checked={showDiagnostics}
        onChange={onDiagnosticsChange}
      />
    </section>
  )
}
