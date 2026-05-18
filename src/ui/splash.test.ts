import { describe, it, expect } from 'vitest'
import { showSplash, showSplashReady } from './splash'

describe('showSplash', () => {
  it('renders app name and subtitle', () => {
    const container = document.createElement('div')
    showSplash(container)

    expect(container.innerHTML).toContain('Mediation AR')
    expect(container.innerHTML).toContain('Preparing AR experience...')
  })

  it('clears container before appending', () => {
    const container = document.createElement('div')
    container.innerHTML = '<p>existing content</p>'

    showSplash(container)

    expect(container.children.length).toBe(1)
    const p = container.querySelector('p')
    expect(p?.textContent).toBe('Preparing AR experience...')
  })
})

describe('showSplashReady', () => {
  it('updates to ready state', () => {
    const container = document.createElement('div')
    showSplash(container)
    showSplashReady(container)

    expect(container.innerHTML).toContain('Mediation AR')
    expect(container.innerHTML).toContain('Initializing...')
    expect(container.innerHTML).not.toContain('Preparing AR experience...')
  })
})
