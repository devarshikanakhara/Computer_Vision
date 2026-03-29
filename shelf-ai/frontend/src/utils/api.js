import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const uploadImages = (files, onProgress) => {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  return api.post('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded / e.total * 100)),
  })
}

export const triggerProcess = (session_id) =>
  api.post('/process', { session_id })

export const getStatus = (session_id) =>
  api.get(`/process/${session_id}/status`)

export const getResults = (session_id) =>
  api.get(`/results/${session_id}`)

export const getHealth = () => api.get('/health')

export const downloadCSV   = (id) => `/api/results/${id}/download/csv`
export const downloadVideo = (id) => `/api/results/${id}/download/video`
