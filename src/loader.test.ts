import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { downloadModel } from './loader'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('downloadModel', () => {
  it('calls onProgress with correct loaded/total values', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('mock model data')
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Length': String(data.length) },
      })
    )

    const onProgress = vi.fn()
    const result = await downloadModel(onProgress)

    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledWith({
      loaded: data.length,
      total: data.length,
      percent: 100,
    })
    expect(result).toBeInstanceOf(ArrayBuffer)
    expect(result.byteLength).toBe(data.length)
  })

  it('returns ArrayBuffer with correct content', async () => {
    const encoder = new TextEncoder()
    const data = encoder.encode('mock model data chunked')
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Length': String(data.length) },
      })
    )

    const result = await downloadModel(() => {})
    expect(result.byteLength).toBe(data.length)
    const view = new Uint8Array(result)
    expect(Array.from(view)).toEqual(Array.from(data))
  })

  it('rejects with error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    await expect(downloadModel(() => {})).rejects.toThrow('Network error')
  })

  it('rejects on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 404, statusText: 'Not Found' })
    )

    await expect(downloadModel(() => {})).rejects.toThrow('Download failed: 404')
  })

  it('reports progress incrementally across multiple chunks', async () => {
    const encoder = new TextEncoder()
    const chunk1 = encoder.encode('chunk one ')
    const chunk2 = encoder.encode('chunk two ')

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(chunk1)
        controller.enqueue(chunk2)
        controller.close()
      },
    })

    const totalSize = chunk1.length + chunk2.length
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(stream, {
        headers: { 'Content-Length': String(totalSize) },
      })
    )

    const onProgress = vi.fn()
    await downloadModel(onProgress)

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      loaded: chunk1.length,
      total: totalSize,
      percent: (chunk1.length / totalSize) * 100,
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      loaded: totalSize,
      total: totalSize,
      percent: 100,
    })
  })
})
