import type { WorkerOutboundMessage, WorkerInboundMessage } from '../types/events'

export interface WorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void
  close(): void
}

export function createWorkerHandler(scope: WorkerScope = self as unknown as WorkerScope) {
  return function (this: WorkerScope | void, event: MessageEvent<WorkerOutboundMessage>): void {
    const s = this ?? scope
    const msg = event.data

    switch (msg.type) {
      case 'FRAME_DATA': {
        const reply: WorkerInboundMessage = {
          type: 'FRAME_ACK',
          payload: { frameId: msg.payload.frameId },
        }
        s.postMessage(reply)
        break
      }
      case 'TERMINATE': {
        s.close()
        break
      }
      default: {
        const _exhaustive: never = msg
        console.warn('Unknown message type received in worker:', (_exhaustive as { type: string }).type)
      }
    }
  }
}

const isWorkerScope = typeof self !== 'undefined' && typeof (self as Record<string, unknown>).document === 'undefined'
if (isWorkerScope) {
  self.onmessage = createWorkerHandler()
  const readyMsg: WorkerInboundMessage = { type: 'WORKER_READY' }
  self.postMessage(readyMsg)
}
