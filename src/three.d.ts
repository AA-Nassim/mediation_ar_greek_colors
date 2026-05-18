declare module 'three' {
  export class Scene {
    children: Object3D[]
    add(object: Object3D): void
    remove(object: Object3D): void
  }

  export class Object3D {
    position: Vector3
  }

  export class PerspectiveCamera extends Object3D {
    fov: number
    aspect: number
    near: number
    far: number
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
    updateProjectionMatrix(): void
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    constructor(parameters?: WebGLRendererParameters)
    setSize(width: number, height: number): void
    render(scene: Scene, camera: PerspectiveCamera): void
    setAnimationLoop(callback: ((time: number) => void) | null): void
    dispose(): void
  }

  export interface WebGLRendererParameters {
    alpha?: boolean
    antialias?: boolean
  }

  export class Mesh extends Object3D {
    material: Material
    constructor(geometry?: BufferGeometry, material?: Material)
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number)
  }

  export class BufferGeometry {}

  export class MeshBasicMaterial implements Material {
    map: Texture | null
    side: number
    constructor(parameters?: MeshBasicMaterialParameters)
  }

  export interface MeshBasicMaterialParameters {
    map?: Texture
    side?: number
  }

  export interface Material {}

  export class VideoTexture extends Texture {
    constructor(video: HTMLVideoElement)
  }

  export class Texture {
    needsUpdate: boolean
    minFilter: number
    magFilter: number
  }

  export const LinearFilter: number
  export const DoubleSide: number

  export class Vector3 {
    x: number
    y: number
    z: number
    constructor(x?: number, y?: number, z?: number)
  }
}
