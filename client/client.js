const word = document.getElementById('word-container')
const camera = document.getElementById('camera')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

let network
let latent = {}
const sizes = {
  canvas: 700
}

canvas.width = sizes.canvas
canvas.height = sizes.canvas

camera.width = sizes.canvas
camera.height = sizes.canvas

ctx.fillStyle = 'black'
ctx.fillRect(0, 0, canvas.width, canvas.height)

function show (text) {
  if (text === undefined || text === 'UNK') return
  word.innerText = `${ word.innerText } ${ text }`
}

function draw ([x, y], label) {
  ctx.fillStyle = 'white'
  ctx.fillRect(x, y, 1, 1)
}

function getLabels (keypoint) {
  const x = Math.floor(keypoint.position.x)
  const y = Math.floor(keypoint.position.y)

  const area = ctx.getImageData(x, y, 10, 10).data
  /* ctx.fillRect(x, y, 10, 10) */
  let labels = []

  area.forEach((value, index) => {
    if (index % 4 != 0) return
    if (value === 255) {
      const pos = ('0' + index / 4).slice(-2)
      const offset = (pos / 10).toString().split('.').map(n => Number(n)) 
      if (!offset[1]) offset[1] = 0
      labels.push(latent[`${ x + offset[1] },${ y + offset[0] }`])
    }
  })

  return labels
}

function lstm (labels) {
  console.log('moin', labels)
}

const movement = {
  prev: null,
  moving: false,
  memory: 0,
  keypoints: [],
  labels: []
}

function check (poses) {
  const nose = poses[0].keypoints[0]
  /* const leftWrist = poses[9]
  const rightWrist = poses[10] */

  const threshold = 10
  const delay = 3
  const diff = movement.prev ? Math.abs(movement.prev.position.x - nose.position.x) : 0

  if (diff > threshold && movement.memory <= delay) {
    movement.memory++
  } else {
    if (movement.memory <= delay) movement.memory = 0
    movement.memory--
  }

  if (movement.memory >= delay) {
    movement.moving = true
    movement.keypoints.push(nose)
  } else if (movement.memory < 0) {
    if (movement.moving) {
      movement.keypoints.forEach((keypoint) => {
        const localLabels = getLabels(keypoint)
        movement.labels = movement.labels.concat(localLabels)
      })

      if (movement.labels.length > 0) lstm(movement.labels)
      movement.keypoints = []
      movement.labels = []
    }
    movement.moving = false
  }

  movement.prev = nose
  /* draw([nose.position.x, nose.position.y]) */
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
