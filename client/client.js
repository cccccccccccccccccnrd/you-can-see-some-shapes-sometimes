const word = document.getElementById('word-container')
const camera = document.getElementById('camera')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

let network
let latent = {}
const sizes = {
  canvas: 700,
  area: 10
}

canvas.width = sizes.canvas
canvas.height = sizes.canvas

camera.width = sizes.canvas
camera.height = sizes.canvas

ctx.fillStyle = 'black'
ctx.fillRect(0, 0, canvas.width, canvas.height)

function show (text) {
  if (text === undefined) return
  word.innerText = `${ word.innerText } ${ text }`
}

function draw([x, y], label) {
  ctx.fillStyle = 'white'
  ctx.fillRect(x, y, 1, 1)
}

function check (poses) {
  const pose = poses[0]

  const x = Math.floor(pose.keypoints[0].position.x)
  const y = Math.floor(pose.keypoints[0].position.y)

  const area = ctx.getImageData(x, y, sizes.area, sizes.area).data
  
  area.forEach((value, index) => {
    if (index % 4 != 0) return
    if (value === 255) {
      const pos = ('0' + index / 4).slice(-2)
      const offset = (pos / sizes.area).toString().split('.').map(n => Number(n)) 
      if (!offset[1]) offset[1] = 0
      const label = latent[`${ x + offset[1] },${ y + offset[0] }`]

      console.log(x + offset[1], y + offset[0], label)
      show(label)
    }
  })
}

async function estimate () {
  const poses = await network.estimatePoses(camera, {
    flipHorizontal: false,
    decodingMethod: 'single-person'
  })

  check(poses)

  requestAnimationFrame(() => {
    estimate()
  })
}

function detect() {
  posenet.load()
    .then((net) => {
      network = net
      estimate()
      console.log(latent)
  })
}

function init() {
  fetch('tsne.json')
    .then(res => res.json())
    .then(json => {
      Object.keys(json).forEach((label) => {
        const x = Math.floor(json[label][0])
        const y = Math.floor(json[label][1])

        draw([x, y], label)
        latent[`${x},${y}`] = label
      })
    })

  navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: canvas.width }, height: { ideal: canvas.height } } })
  .then(stream => {
    camera.srcObject = stream
    camera.play()
    detect()
  })
  .catch((err) => {
    console.log(err)
  })
}

init()
