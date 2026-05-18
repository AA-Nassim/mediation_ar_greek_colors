import { describe, it, expect, vi, beforeAll } from 'vitest'
import {
  requestCameraStream,
  requestCameraStreamWithFallback,
  createHiddenVideoElement,
  stopCameraStream,
} from './stream'
import type { CameraResult, CameraError } from './stream'

beforeAll(() => {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn(),
    },
    configurable: true,
    writable: true,
  })
})

function mockGetUserMedia(
  impl: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
): void {
  vi.mocked(navigator.mediaDevices!.getUserMedia).mockImplementation(impl)
}

function createMockStream(label = 'environment camera'): MediaStream {
  const mockTrack = {
    kind: 'video',
    label,
    stop: vi.fn(),
  } as unknown as MediaStreamTrack

  return {
    getVideoTracks: () => [mockTrack],
    getTracks: () => [mockTrack],
  } as unknown as MediaStream
}

describe('requestCameraStream', () => {
  it('returns CameraResult on successful stream acquisition', async () => {
    const mockStream = createMockStream()
    mockGetUserMedia(() => Promise.resolve(mockStream))

    const result = await requestCameraStream()
    expect('stream' in result).toBe(true)
    if ('stream' in result) {
      expect(result.stream).toBe(mockStream)
      expect(result.deviceLabel).toBe('environment camera')
    }
  })

  it('returns PERMISSION_DENIED on NotAllowedError', async () => {
    const error = new DOMException('Permission denied', 'NotAllowedError')
    mockGetUserMedia(() => Promise.reject(error))

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('PERMISSION_DENIED')
    }
  })

  it('returns OVERRULED_BY_CONSTRAINTS on OverconstrainedError', async () => {
    const error = new DOMException('Constraints not satisfied', 'OverconstrainedError')
    mockGetUserMedia(() => Promise.reject(error))

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('OVERRULED_BY_CONSTRAINTS')
    }
  })

  it('returns PERMISSION_DENIED on PermissionDeniedError', async () => {
    const error = new DOMException('Permission denied', 'PermissionDeniedError')
    mockGetUserMedia(() => Promise.reject(error))

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('PERMISSION_DENIED')
    }
  })

  it('returns NO_CAMERA on NotFoundError', async () => {
    const error = new DOMException('No camera found', 'NotFoundError')
    mockGetUserMedia(() => Promise.reject(error))

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('NO_CAMERA')
    }
  })

  it('returns UNKNOWN for unrecognized errors', async () => {
    const error = new Error('Something unexpected happened')
    mockGetUserMedia(() => Promise.reject(error))

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('UNKNOWN')
    }
  })

  it('returns NO_CAMERA when getUserMedia is not available', async () => {
    const original = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const result = await requestCameraStream()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('NO_CAMERA')
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      value: original,
      configurable: true,
      writable: true,
    })
  })
})

describe('requestCameraStreamWithFallback', () => {
  it('returns result from primary call on success', async () => {
    const mockStream = createMockStream()
    mockGetUserMedia(() => Promise.resolve(mockStream))

    const result = await requestCameraStreamWithFallback()
    expect('stream' in result).toBe(true)
  })

  it('falls back to no-f facingMode constraints on OverconstrainedError', async () => {
    const primaryReject = new DOMException('Overconstrained', 'OverconstrainedError')
    const mockStream = createMockStream('fallback camera')

    const mockFn = vi.mocked(navigator.mediaDevices!.getUserMedia)
    mockFn
      .mockRejectedValueOnce(primaryReject)
      .mockResolvedValueOnce(mockStream)

    const result = await requestCameraStreamWithFallback()
    expect('stream' in result).toBe(true)
    if ('stream' in result) {
      expect(result.deviceLabel).toBe('fallback camera')
    }
  })

  it('returns NO_CAMERA when navigator.mediaDevices is undefined', async () => {
    const original = navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const result = await requestCameraStreamWithFallback()
    expect('code' in result).toBe(true)
    if ('code' in result) {
      expect(result.code).toBe('NO_CAMERA')
    }

    Object.defineProperty(navigator, 'mediaDevices', {
      value: original,
      configurable: true,
      writable: true,
    })
  })
})

describe('createHiddenVideoElement', () => {
  it('creates a hidden video element with the stream', () => {
    const mockStream = createMockStream()
    const video = createHiddenVideoElement(mockStream as unknown as MediaStream)

    expect(video.tagName).toBe('VIDEO')
    expect(video.srcObject).toBe(mockStream)
    expect(video.style.display).toBe('none')
    expect(video.playsInline).toBe(true)
    expect(video.muted).toBe(true)
    expect(video.autoplay).toBe(true)

    video.remove()
  })
})

describe('stopCameraStream', () => {
  it('stops all tracks in the stream', () => {
    const track1 = { stop: vi.fn() } as unknown as MediaStreamTrack
    const track2 = { stop: vi.fn() } as unknown as MediaStreamTrack
    const stream = {
      getTracks: () => [track1, track2],
    } as unknown as MediaStream

    stopCameraStream(stream)
    expect(track1.stop).toHaveBeenCalledTimes(1)
    expect(track2.stop).toHaveBeenCalledTimes(1)
  })
})
