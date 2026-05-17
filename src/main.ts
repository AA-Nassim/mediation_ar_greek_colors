import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center">
    <h1 class="text-4xl font-bold text-gray-800">mediation-ar-greek-colors</h1>
    <p class="text-lg text-gray-500">AR experience with Three.js + ONNX Runtime</p>
  </div>
`
