import { useState, useEffect } from 'react'

interface Settings {
  claudePath: string
  shellPath: string
  defaultProjectPath: string
  terminal: {
    fontSize: number
    fontFamily: string
  }
}

interface Props {
  onClose: () => void
}

export default function SettingsPanel({ onClose }: Props) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.claide.getSettings().then(setSettings)
  }, [])

  const handleBrowse = async (field: 'claudePath' | 'shellPath' | 'defaultProjectPath') => {
    const type = field === 'defaultProjectPath' ? 'directory' : 'file'
    const path = await window.claide.browseForPath(type)
    if (path && settings) {
      setSettings({ ...settings, [field]: path })
    }
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    await window.claide.saveSettings(settings)
    setSaving(false)
    onClose()
  }

  if (!settings) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>x</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <h3>CLI Paths</h3>
            <p className="settings-hint">Leave empty to auto-detect</p>

            <label className="settings-label">Claude CLI Path</label>
            <div className="settings-path-row">
              <input
                className="settings-input"
                value={settings.claudePath}
                onChange={(e) => setSettings({ ...settings, claudePath: e.target.value })}
                placeholder="Auto-detect"
              />
              <button className="settings-browse" onClick={() => handleBrowse('claudePath')}>
                Browse
              </button>
            </div>

            <label className="settings-label">Shell Path</label>
            <div className="settings-path-row">
              <input
                className="settings-input"
                value={settings.shellPath}
                onChange={(e) => setSettings({ ...settings, shellPath: e.target.value })}
                placeholder="Auto-detect (pwsh)"
              />
              <button className="settings-browse" onClick={() => handleBrowse('shellPath')}>
                Browse
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Startup</h3>

            <label className="settings-label">Default Project Path</label>
            <div className="settings-path-row">
              <input
                className="settings-input"
                value={settings.defaultProjectPath}
                onChange={(e) => setSettings({ ...settings, defaultProjectPath: e.target.value })}
                placeholder="Show welcome screen"
              />
              <button className="settings-browse" onClick={() => handleBrowse('defaultProjectPath')}>
                Browse
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Terminal</h3>

            <label className="settings-label">
              Font Size: {settings.terminal.fontSize}px
            </label>
            <input
              type="range"
              className="settings-slider"
              min={10}
              max={20}
              value={settings.terminal.fontSize}
              onChange={(e) => setSettings({
                ...settings,
                terminal: { ...settings.terminal, fontSize: parseInt(e.target.value) }
              })}
            />
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-cancel" onClick={onClose}>Cancel</button>
          <button className="settings-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
