import './style.css'
import { createAppStateMachine, setSceneContext } from './state/states'
import { createScene, resizeRenderer } from './render/scene'
import { showSplash } from './ui/splash'

const appContainer = document.createElement('div')
appContainer.id = 'app'
appContainer.className = 'w-screen h-screen relative overflow-hidden'
document.body.appendChild(appContainer)

showSplash(appContainer)

const sceneCtx = createScene(appContainer)
setSceneContext(sceneCtx)

const fsm = createAppStateMachine(appContainer)

if (typeof ResizeObserver !== 'undefined') {
  const resizeObserver = new ResizeObserver(() => {
    resizeRenderer(sceneCtx, appContainer)
  })
  resizeObserver.observe(appContainer)
}

window.addEventListener('resize', () => {
  resizeRenderer(sceneCtx, appContainer)
})
