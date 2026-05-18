export function showPermissionPrompt(container: HTMLElement, onAllow: () => void): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center'

  const heading = document.createElement('h2')
  heading.className = 'text-2xl font-bold text-gray-800'
  heading.textContent = 'Camera Access Required'

  const description = document.createElement('p')
  description.className = 'text-base text-gray-500 max-w-xs'
  description.textContent = 'This experience needs access to your camera to display the AR overlay. Please allow camera access to continue.'

  const button = document.createElement('button')
  button.className = 'px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer'
  button.textContent = 'Allow Camera Access'
  button.addEventListener('click', (e) => {
    e.preventDefault()
    onAllow()
  })

  wrapper.appendChild(heading)
  wrapper.appendChild(description)
  wrapper.appendChild(button)
  container.appendChild(wrapper)
}

export function showPermissionDenied(container: HTMLElement, onRetry: () => void): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center'

  const heading = document.createElement('h2')
  heading.className = 'text-2xl font-bold text-red-700'
  heading.textContent = 'Camera Permission Denied'

  const description = document.createElement('p')
  description.className = 'text-base text-gray-500 max-w-xs'
  description.textContent = 'Camera access is required for this AR experience. Please update your browser settings to allow camera access.'

  const retryButton = document.createElement('button')
  retryButton.className = 'px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer'
  retryButton.textContent = 'Try Again'
  retryButton.addEventListener('click', (e) => {
    e.preventDefault()
    onRetry()
  })

  wrapper.appendChild(heading)
  wrapper.appendChild(description)
  wrapper.appendChild(retryButton)
  container.appendChild(wrapper)
}

export function showCameraError(container: HTMLElement, message: string, onRetry: () => void): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center'

  const heading = document.createElement('h2')
  heading.className = 'text-2xl font-bold text-red-700'
  heading.textContent = 'Camera Error'

  const description = document.createElement('p')
  description.className = 'text-base text-gray-500 max-w-xs'
  description.textContent = message

  const retryButton = document.createElement('button')
  retryButton.className = 'px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer'
  retryButton.textContent = 'Retry'
  retryButton.addEventListener('click', (e) => {
    e.preventDefault()
    onRetry()
  })

  wrapper.appendChild(heading)
  wrapper.appendChild(description)
  wrapper.appendChild(retryButton)
  container.appendChild(wrapper)
}
