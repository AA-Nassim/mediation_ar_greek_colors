import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FrameCapture } from './frame'
import type { WorkerOutboundMessage } from '../types/events'
import { FRAME_CAPTURE_INTERVAL_MS } from '../config'

function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperties(video, {
    videoWidth: { get: () => 640 },
    videoHeight: { get: () => 480 },
  })
  return video
}

function createMockWorker(): Worker {
  const postMessage = vi.fn((_msg: unknown, transfer?: Transferable[]) => {
    if (transfer) {
      for (const t of transfer) {
        if (t instanceof ArrayBuffer) {
          Object.defineProperty(t, 'byteLength', { value: 0 })
        }
      }
    }
  })
  return {
    postMessage,
    terminate: vi.fn(),
    onmessage: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onmessageerror: null,
  } as unknown as Worker
}

function stubOffscreenCanvas() {
  const mockCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: { buffer: new ArrayBuffer(640 * 480 * 4) },
    })),
  }

  class MockOffscreenCanvas {
    width = 640
    height = 480

    getContext(_type: string): typeof mockCtx {
      return mockCtx
    }
  }

  vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas)
}

describe('FrameCapture', () => {
  let capture: FrameCapture
  let video: HTMLVideoElement

  beforeEach(() => {
    vi.useFakeTimers()
    stubOffscreenCanvas()
    video = createMockVideo()
    capture = new FrameCapture(video)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('captures frames at configured interval and posts to worker', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    const call = vi.mocked(worker.postMessage).mock.calls[0]!
    const msg = call[0] as WorkerOutboundMessage
    expect(msg.type).toBe('FRAME_DATA')
  })

  it('posted messages include transferable ArrayBuffer', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)

    const call = vi.mocked(worker.postMessage).mock.calls[0]!
    const transferList = call[1] as unknown[]
    expect(transferList).toBeDefined()
    expect(transferList.length).toBe(1)
    expect(transferList[0]).toBeInstanceOf(ArrayBuffer)
  })

  it('buffer becomes detached after transfer (byteLength === 0 on original)', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)

    const call = vi.mocked(worker.postMessage).mock.calls[0]!
    const msg = call[0] as WorkerOutboundMessage
    if (msg.type === 'FRAME_DATA') {
      expect(msg.payload.data.byteLength).toBe(0)
    }
  })

  it('stop() clears interval and stops posting', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)
    capture.stop()
    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS * 5)

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })

  it('frames dropped while awaiting ACK (single in-flight safeguard)', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)
    const callCountAfterFirst = vi.mocked(worker.postMessage).mock.calls.length

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS * 3)

    expect(vi.mocked(worker.postMessage).mock.calls.length).toBe(callCountAfterFirst)
  })

  it('frameId resets to 0 on startWithWorker after stop', () => {
    const worker1 = createMockWorker()
    capture.startWithWorker(worker1)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS * 2)
    capture.stop()

    const worker2 = createMockWorker()
    capture.startWithWorker(worker2)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)

    expect(vi.mocked(worker2.postMessage)).toHaveBeenCalledTimes(1)
  })

  it('multiple startWithWorker calls do not create duplicate intervals', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)
    capture.startWithWorker(worker)
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
  })

  it('onFrameAck clears awaiting flag allowing next capture', () => {
    const worker = createMockWorker()
    capture.startWithWorker(worker)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS * 2)
    expect(worker.postMessage).toHaveBeenCalledTimes(1)

    capture.onFrameAck()

    vi.advanceTimersByTime(FRAME_CAPTURE_INTERVAL_MS)
    expect(worker.postMessage).toHaveBeenCalledTimes(2)
  })
})
