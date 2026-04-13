import { useState, useEffect } from 'react'

interface Props {
  filePath: string
  onClose: () => void
}

export default function FilePreview({ filePath, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fileName = filePath.split(/[/\\]/).pop() || filePath

  useEffect(() => {
    setLoading(true)
    window.claide.readFile(filePath).then(data => {
      setContent(data)
      setLoading(false)
    })
  }, [filePath])

  return (
    <div className="file-preview">
      <div className="file-preview-header">
        <span className="file-preview-name" title={filePath}>{fileName}</span>
        <button className="file-preview-close" onClick={onClose}>x</button>
      </div>
      <div className="file-preview-content">
        {loading ? (
          <span className="file-preview-loading">Loading...</span>
        ) : content === null ? (
          <span className="file-preview-error">Unable to read file</span>
        ) : (
          <pre className="file-preview-code">{content}</pre>
        )}
      </div>
    </div>
  )
}
