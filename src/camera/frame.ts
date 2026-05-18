import { FRAME_CAPTURE_INTERVAL_MS } from '../config'
import type { WorkerOutboundMessage } from '../types/events'

export type FrameData = {
  width: number
  height: number
  data: ArrayBuffer
}

export class FrameCapture {
  #video: HTMLVideoElement
  #canvas: OffscreenCanvas | HTMLCanvasElement | null = null
  #ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null = null
  #intervalId: ReturnType<typeof setInterval> | null = null
  #worker: Worker | null = null
  #awaitingAck = false
  #frameId = 0

  constructor(video: HTMLVideoElement) {
    this.#video = video
  }

  capture(): FrameData | null {
    const { videoWidth, videoHeight } = this.#video
    if (videoWidth === 0 || videoHeight === 0) return null

    if (!this.#canvas || this.#canvas.width !== videoWidth || this.#canvas.height !== videoHeight) {
      this.#initCanvas(videoWidth, videoHeight)
    }

    const ctx = this.#ctx
    if (!ctx) return null

    ctx.drawImage(this.#video, 0, 0, videoWidth, videoHeight)

    const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)

    return {
      width: videoWidth,
      height: videoHeight,
      data: imageData.data.buffer,
    }
  }

  start(callback: (frame: FrameData) => void): void {
    if (this.#intervalId !== null) return
    this.#intervalId = setInterval(() => {
      const frame = this.capture()
      if (frame !== null) {
        callback(frame)
      }
    }, FRAME_CAPTURE_INTERVAL_MS)
  }

  startWithWorker(worker: Worker): void {
    this.#worker = worker
    this.#frameId = 0
    if (this.#intervalId !== null) return
    this.#intervalId = setInterval(() => {
      if (this.#awaitingAck) return
      const frame = this.capture()
      if (frame === null) return
      const frameId = this.#frameId
      const msg: WorkerOutboundMessage = {
        type: 'FRAME_DATA',
        payload: { frameId, width: frame.width, height: frame.height, data: frame.data },
      }
      this.#awaitingAck = true
      worker.postMessage(msg, [frame.data])
      this.#frameId++
    }, FRAME_CAPTURE_INTERVAL_MS)
  }

  onFrameAck(): void {
    this.#awaitingAck = false
  }

  stop(): void {
    if (this.#intervalId !== null) {
      clearInterval(this.#intervalId)
      this.#intervalId = null
    }
    this.#awaitingAck = false
  }

  #initCanvas(width: number, height: number): void {
    if (typeof OffscreenCanvas !== 'undefined') {
      this.#canvas = new OffscreenCanvas(width, height)
      this.#ctx = this.#canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
    } else {
      this.#canvas = document.createElement('canvas')
      this.#canvas.width = width
      this.#canvas.height = height
      this.#ctx = this.#canvas.getContext('2d')
    }
  }
}
