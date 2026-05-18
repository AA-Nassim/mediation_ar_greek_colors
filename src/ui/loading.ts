export interface DownloadProgress {
  loaded: number
  total: number
  percent: number
}

export function showLoadingProgress(container: HTMLElement): (progress: DownloadProgress) => void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-4 p-8 text-center bg-gray-900'

  const label = document.createElement('p')
  label.className = 'text-base text-gray-400'
  label.textContent = 'Downloading recognition model...'

  const track = document.createElement('div')
  track.className = 'w-64 h-2 bg-gray-700 rounded-full overflow-hidden'

  const fill = document.createElement('div')
  fill.className = 'h-full bg-blue-500 rounded-full transition-all duration-300 ease-out'
  fill.style.width = '0%'

  track.appendChild(fill)

  const percentText = document.createElement('p')
  percentText.className = 'text-sm text-gray-400'
  percentText.textContent = '0%'

  wrapper.appendChild(label)
  wrapper.appendChild(track)
  wrapper.appendChild(percentText)
  container.appendChild(wrapper)

  return (progress: DownloadProgress): void => {
    const pct = Math.min(Math.max(progress.percent, 0), 100)
    fill.style.width = `${pct}%`
    percentText.textContent = `${Math.round(pct)}%`
  }
}

export function showDownloadError(container: HTMLElement, onRetry: () => void): void {
  container.innerHTML = ''

  const wrapper = document.createElement('div')
  wrapper.className = 'flex flex-col items-center justify-center h-full gap-6 p-8 text-center bg-gray-900'

  const heading = document.createElement('h2')
  heading.className = 'text-2xl font-bold text-red-400'
  heading.textContent = 'Download Failed'

  const message = document.createElement('p')
  message.className = 'text-base text-gray-400'
  message.textContent = 'Could not download the recognition model. Please check your connection and try again.'

  const retryBtn = document.createElement('button')
  retryBtn.className = 'px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer'
  retryBtn.textContent = 'Retry'
  retryBtn.addEventListener('click', (e) => {
    e.preventDefault()
    onRetry()
  })

  wrapper.appendChild(heading)
  wrapper.appendChild(message)
  wrapper.appendChild(retryBtn)
  container.appendChild(wrapper)
}
