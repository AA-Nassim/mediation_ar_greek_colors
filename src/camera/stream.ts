import { CAMERA_CONSTRAINTS, FALLBACK_CAMERA_CONSTRAINTS } from '../config'

export type CameraErrorCode = 'PERMISSION_DENIED' | 'NO_CAMERA' | 'OVERRULED_BY_CONSTRAINTS' | 'UNKNOWN'

export interface CameraResult {
  stream: MediaStream
  deviceLabel: string
}

export interface CameraError {
  code: CameraErrorCode
  message: string
  originalError?: DOMException | Error
}

function isPermissionDenied(error: DOMException): boolean {
  return error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError'
}

function isOverconstrainedError(error: DOMException): boolean {
  return error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError'
}

function isNoCameraError(error: DOMException): boolean {
  return error.name === 'NotFoundError'
}

export async function requestCameraStream(
  constraints: MediaStreamConstraints = CAMERA_CONSTRAINTS
): Promise<CameraResult | CameraError> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      code: 'NO_CAMERA',
      message: 'Camera access is not available on this device or browser.',
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    const deviceLabel =
      stream.getVideoTracks()[0]?.label ?? 'Unknown camera'

    return { stream, deviceLabel }
  } catch (error) {
    const domError = error as DOMException

    if (isPermissionDenied(domError)) {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Camera permission was denied. Please allow camera access and try again.',
        originalError: domError,
      }
    }

    if (isOverconstrainedError(domError)) {
      return {
        code: 'OVERRULED_BY_CONSTRAINTS',
        message: 'Could not find a camera matching the requested constraints.',
        originalError: domError,
      }
    }

    if (isNoCameraError(domError)) {
      return {
        code: 'NO_CAMERA',
        message: 'No camera found on this device.',
        originalError: domError,
      }
    }

    return {
      code: 'UNKNOWN',
      message: domError.message ?? 'An unknown camera error occurred.',
      originalError: domError,
    }
  }
}

export async function requestCameraStreamWithFallback(): Promise<CameraResult | CameraError> {
  const result = await requestCameraStream(CAMERA_CONSTRAINTS)

  if ('code' in result && result.code === 'OVERRULED_BY_CONSTRAINTS') {
    return requestCameraStream(FALLBACK_CAMERA_CONSTRAINTS)
  }

  return result
}

export function createHiddenVideoElement(stream: MediaStream): HTMLVideoElement {
  const video = document.createElement('video')
  video.srcObject = stream
  video.playsInline = true
  video.muted = true
  video.autoplay = true
  video.style.display = 'none'
  document.body.appendChild(video)
  return video
}

export function stopCameraStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}
