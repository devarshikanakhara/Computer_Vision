import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { uploadImages, triggerProcess, getStatus, getResults } from '../utils/api'

const POLL_INTERVAL = 2500

export function useSession() {
  const [sessionId, setSessionId]     = useState(null)
  const [stage, setStage]             = useState('idle')   // idle|uploading|processing|completed|error
  const [uploadPct, setUploadPct]     = useState(0)
  const [progress, setProgress]       = useState(0)
  const [results, setResults]         = useState(null)
  const [error, setError]             = useState(null)
  const pollRef = useRef(null)

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
  }

  const startPolling = useCallback((sid) => {
    stopPolling()
    pollRef.current = setInterval(async () => {
      try {
        const { data: status } = await getStatus(sid)
        setProgress(status.progress ?? 0)

        if (status.status === 'completed') {
          stopPolling()
          const { data } = await getResults(sid)
          setResults(data)
          setStage('completed')
          toast.success('Analysis complete!')
        } else if (status.status === 'failed') {
          stopPolling()
          setError(status.error || 'Processing failed')
          setStage('error')
          toast.error('Processing failed. Check logs.')
        }
      } catch (err) {
        console.error('Poll error:', err)
      }
    }, POLL_INTERVAL)
  }, [])

  const upload = useCallback(async (files) => {
    try {
      setStage('uploading')
      setError(null)
      setUploadPct(0)
      const { data } = await uploadImages(files, pct => setUploadPct(pct))
      const sid = data.session_id
      setSessionId(sid)
      toast.success(`${data.images_received} images uploaded`)

      setStage('processing')
      setProgress(0)
      await triggerProcess(sid)
      startPolling(sid)
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed'
      setError(msg)
      setStage('error')
      toast.error(msg)
    }
  }, [startPolling])

  const reset = useCallback(() => {
    stopPolling()
    setSessionId(null)
    setStage('idle')
    setUploadPct(0)
    setProgress(0)
    setResults(null)
    setError(null)
  }, [])

  return { sessionId, stage, uploadPct, progress, results, error, upload, reset }
}
