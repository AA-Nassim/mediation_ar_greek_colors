import * as THREE from 'three'

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
}

export function createScene(container: HTMLElement): SceneContext {
  const width = container.clientWidth
  const height = container.clientHeight
  const aspect = width / height

  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
  camera.position.z = 0

  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true })
  renderer.setSize(width, height)
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  return { scene, camera, renderer }
}

export function createVideoBackground(scene: THREE.Scene, video: HTMLVideoElement): THREE.Mesh {
  const texture = new THREE.VideoTexture(video)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const fov = 75
  const distance = 2
  const aspect = video.videoWidth / video.videoHeight || 16 / 9
  const height = 2 * Math.tan((fov * Math.PI) / 360) * distance
  const width = height * aspect

  const geometry = new THREE.PlaneGeometry(width, height)
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = -distance

  scene.add(mesh)
  return mesh
}

export function startRenderLoop(ctx: SceneContext, onFrame?: () => void): () => void {
  let running = true

  function renderLoop(time: number): void {
    if (!running) return
    requestAnimationFrame(renderLoop)
    ctx.renderer.render(ctx.scene, ctx.camera)
    onFrame?.()
  }

  requestAnimationFrame(renderLoop)

  return () => {
    running = false
  }
}

export function resizeRenderer(ctx: SceneContext, container: HTMLElement): void {
  const width = container.clientWidth
  const height = container.clientHeight
  const aspect = width / height

  ctx.camera.aspect = aspect
  ctx.camera.updateProjectionMatrix()
  ctx.renderer.setSize(width, height)
}
