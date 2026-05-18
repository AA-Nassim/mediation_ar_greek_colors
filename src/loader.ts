import { MODEL_URL, MODEL_DOWNLOAD_TIMEOUT_MS } from './config'

export interface DownloadProgress {
  loaded: number
  total: number
  percent: number
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void

export async function downloadModel(onProgress: DownloadProgressCallback): Promise<ArrayBuffer> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), MODEL_DOWNLOAD_TIMEOUT_MS)

  try {
    const response = await fetch(MODEL_URL, { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`)
    }

    const total = Number(response.headers.get('Content-Length') ?? 0)
    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length
      onProgress({
        loaded,
        total,
        percent: total > 0 ? (loaded / total) * 100 : 0,
      })
    }

    const result = new Uint8Array(loaded)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result.buffer as ArrayBuffer
  } finally {
    clearTimeout(timeoutId)
  }
}
