import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { MockWebGLRenderer } = vi.hoisted(() => {
  class MockWebGLRendererInner {
    domElement = document.createElement('canvas')
    setSize = vi.fn()
    render = vi.fn()
    setAnimationLoop = vi.fn()
    dispose = vi.fn()
  }
  return { MockWebGLRenderer: MockWebGLRendererInner }
})

vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  }
})

import { createScene, createVideoBackground, startRenderLoop, resizeRenderer } from './scene'
import type { SceneContext } from './scene'
import * as THREE from 'three'

function createMockContainer(): HTMLElement {
  const el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 375, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: 812, configurable: true })
  return el
}

function createMockVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true })
  return video
}

describe('createScene', () => {
  it('creates scene, camera, renderer with correct structure', () => {
    const container = createMockContainer()
    const ctx = createScene(container)

    expect(ctx.scene).toBeInstanceOf(THREE.Scene)
    expect(ctx.camera).toBeInstanceOf(THREE.PerspectiveCamera)
    expect(ctx.camera.fov).toBe(75)
    expect(ctx.camera.aspect).toBeCloseTo(375 / 812, 5)
    expect(ctx.renderer).toBeDefined()
    expect(container.contains(ctx.renderer.domElement)).toBe(true)
  })
})

describe('createVideoBackground', () => {
  it('adds a mesh to the scene', () => {
    const scene = new THREE.Scene()
    const video = createMockVideo()
    const mesh = createVideoBackground(scene, video)

    expect(mesh).toBeInstanceOf(THREE.Mesh)
    expect(mesh.position.z).toBe(-2)
    expect(scene.children).toContain(mesh)
  })
})

describe('startRenderLoop', () => {
  it('returns a stop function', () => {
    const container = createMockContainer()
    const ctx = createScene(container)
    const stop = startRenderLoop(ctx)

    expect(stop).toBeInstanceOf(Function)

    stop()
  })
})

describe('resizeRenderer', () => {
  it('updates aspect ratio and projection matrix', () => {
    const container = createMockContainer()
    const ctx = createScene(container)

    const initialAspect = ctx.camera.aspect

    const newContainer = document.createElement('div')
    Object.defineProperty(newContainer, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(newContainer, 'clientHeight', { value: 800, configurable: true })

    resizeRenderer(ctx, newContainer)

    expect(ctx.camera.aspect).toBe(0.5)
    expect(ctx.camera.aspect).not.toBe(initialAspect)
  })
})
