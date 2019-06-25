const word = document.getElementById('word-container')
const camera = document.getElementById('camera')
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const poseNet = ml5.poseNet(camera, { detectionType: 'single' }, () => {
  console.log('posenet loaded')
})

const rnn = ml5.charRNN('models/eu-law/', () => {
  console.log('lstm loaded')
})

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
  word.innerText = `${ text }`
}

function draw ([x, y], label) {
  ctx.fillStyle = 'white'
  ctx.fillRect(x, y, 1, 1)
}

function getLabels (keypoint) {
  const x = Math.floor(keypoint.x)
  const y = Math.floor(keypoint.y)

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
  const options = {
    seed: labels.join(' '),
    length: 40,
    temperature: 0.5
  }

  rnn.generate(options, (err, results) => {
    const speech = new SpeechSynthesisUtterance(results.sample)
    window.speechSynthesis.speak(speech)
    show(results.sample)
    console.log(results.sample)
  })

  console.log(labels)
}

const movement = {
  prev: null,
  moving: false,
  memory: 0,
  keypoints: [],
  labels: []
}

function check (poses) {
  const nose = poses[0].pose.nose

  const threshold = 10
  const delay = 3
  const diff = movement.prev ? Math.abs(movement.prev.x - nose.x) : 0

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
  /* draw([nose.x, nose.y]) */
}

poseNet.on('pose', function(results) {
  if (results.length > 0) check(results)
})

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
    })
    .catch((err) => {
      console.log(err)
    })
}

init()