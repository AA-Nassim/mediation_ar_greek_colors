import { describe, it, expect, vi } from 'vitest'
import { showLoadingProgress, showDownloadError } from './loading'
import type { DownloadProgress } from './loading'

describe('showLoadingProgress', () => {
  it('returns an updater function', () => {
    const container = document.createElement('div')
    const updater = showLoadingProgress(container)

    expect(updater).toBeInstanceOf(Function)
  })

  it('updater function updates bar width to match percent', () => {
    const container = document.createElement('div')
    const updater = showLoadingProgress(container)

    updater({ loaded: 50, total: 100, percent: 50 })

    const track = container.querySelector('div[class*="overflow-hidden"]')!
    const fill = track.querySelector('div') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('clamps percent to 0-100 range', () => {
    const container = document.createElement('div')
    const updater = showLoadingProgress(container)

    updater({ loaded: 999, total: 100, percent: 999 })

    const track = container.querySelector('div[class*="overflow-hidden"]')!
    const fill = track.querySelector('div') as HTMLElement
    expect(fill.style.width).toBe('100%')
  })
})

describe('showDownloadError', () => {
  it('renders retry button that calls callback', () => {
    const container = document.createElement('div')
    const onRetry = vi.fn()

    showDownloadError(container, onRetry)

    const retryBtn = container.querySelector('button')
    expect(retryBtn).not.toBeNull()
    expect(retryBtn?.textContent).toBe('Retry')

    retryBtn?.click()
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
