export type SplashState = 'branded' | 'ready'

export function showSplash(container: HTMLElement): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center bg-gray-900'

  const heading = document.createElement('h1')
  heading.className = 'text-3xl font-bold text-white'
  heading.textContent = 'Mediation AR'

  const subtitle = document.createElement('p')
  subtitle.className = 'text-base text-gray-400'
  subtitle.textContent = 'Preparing AR experience...'

  wrapper.appendChild(heading)
  wrapper.appendChild(subtitle)
  container.appendChild(wrapper)
}

export function showSplashReady(container: HTMLElement): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center bg-gray-900'

  const heading = document.createElement('h1')
  heading.className = 'text-3xl font-bold text-white'
  heading.textContent = 'Mediation AR'

  const subtitle = document.createElement('p')
  subtitle.className = 'text-base text-gray-400'
  subtitle.textContent = 'Initializing...'

  wrapper.appendChild(heading)
  wrapper.appendChild(subtitle)
  container.appendChild(wrapper)
}
