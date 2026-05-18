import { describe, it, expect, vi } from 'vitest'
import type { WorkerOutboundMessage, WorkerInboundMessage } from '../types/events'
import { createWorkerHandler } from './index'
import type { WorkerScope } from './index'

describe('Web Worker', () => {
  it('FRAME_DATA handler posts FRAME_ACK with matching frameId', () => {
    const postMessage = vi.fn()
    const scope: WorkerScope = { postMessage, close: vi.fn() }

    const handler = createWorkerHandler(scope)

    const frameData: WorkerOutboundMessage = {
      type: 'FRAME_DATA',
      payload: { frameId: 42, width: 640, height: 480, data: new ArrayBuffer(100) },
    }

    handler({ data: frameData } as MessageEvent<WorkerOutboundMessage>)

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'FRAME_ACK',
        payload: { frameId: 42 },
      })
    )
  })

  it('TERMINATE calls close()', () => {
    const close = vi.fn()
    const scope: WorkerScope = { postMessage: vi.fn(), close }

    const handler = createWorkerHandler(scope)

    const terminateMsg: WorkerOutboundMessage = { type: 'TERMINATE' }
    handler({ data: terminateMsg } as MessageEvent<WorkerOutboundMessage>)

    expect(close).toHaveBeenCalled()
  })

  it('exhaustive switch warns on unknown message type', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope: WorkerScope = { postMessage: vi.fn(), close: vi.fn() }

    const handler = createWorkerHandler(scope)

    handler({ data: { type: 'UNKNOWN_TYPE' } } as unknown as MessageEvent<WorkerOutboundMessage>)

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
