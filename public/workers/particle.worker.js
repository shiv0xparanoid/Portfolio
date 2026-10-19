let count = 2000
let width = 800
let height = 600

let positions
let velocities
let colors

const friction = 0.98
const maxSpeed = 15

function init(cfg) {
  if (cfg.count !== undefined) count = cfg.count
  if (cfg.width !== undefined) width = cfg.width
  if (cfg.height !== undefined) height = cfg.height

  positions = new Float32Array(count * 2)
  velocities = new Float32Array(count * 2)
  colors = new Uint8Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 2] = Math.random() * width
    positions[i * 2 + 1] = Math.random() * height
    velocities[i * 2] = (Math.random() - 0.5) * 2
    velocities[i * 2 + 1] = (Math.random() - 0.5) * 2
    colors[i * 3] = 100 + Math.floor(Math.random() * 155)
    colors[i * 3 + 1] = 150 + Math.floor(Math.random() * 105)
    colors[i * 3 + 2] = 200 + Math.floor(Math.random() * 55)
  }

  emit()
}

function update(delta, attractors) {
  if (!positions) return

  const dt = delta || 1 / 60

  for (let i = 0; i < count; i++) {
    const ix = i * 2
    const iy = ix + 1

    let ax = 0
    let ay = 0

    if (attractors && attractors.length) {
      for (let j = 0; j < attractors.length; j++) {
        const a = attractors[j]
        const dx = a.x - positions[ix]
        const dy = a.y - positions[iy]
        const distSq = dx * dx + dy * dy + 1000
        const dist = Math.sqrt(distSq)
        const force = (a.strength || 500) / distSq
        ax += (dx / dist) * force
        ay += (dy / dist) * force
      }
    }

    velocities[ix] = (velocities[ix] + ax * dt) * friction
    velocities[iy] = (velocities[iy] + ay * dt) * friction

    const sp = Math.sqrt(velocities[ix] * velocities[ix] + velocities[iy] * velocities[iy])
    if (sp > maxSpeed) {
      velocities[ix] = (velocities[ix] / sp) * maxSpeed
      velocities[iy] = (velocities[iy] / sp) * maxSpeed
    }

    positions[ix] += velocities[ix]
    positions[iy] += velocities[iy]

    if (positions[ix] < 0) {
      positions[ix] = 0
      velocities[ix] *= -0.5
    } else if (positions[ix] > width) {
      positions[ix] = width
      velocities[ix] *= -0.5
    }
    if (positions[iy] < 0) {
      positions[iy] = 0
      velocities[iy] *= -0.5
    } else if (positions[iy] > height) {
      positions[iy] = height
      velocities[iy] *= -0.5
    }
  }

  emit()
}

function resize(cfg) {
  if (cfg.width !== undefined) width = cfg.width
  if (cfg.height !== undefined) height = cfg.height
  if (positions) emit()
}

function emit() {
  // Copy buffers before sending so the worker retains its original arrays.
  // Transferring the original .buffer would detach it and subsequent
  // updates would fail with DataCloneError.
  const posCopy = positions ? positions.slice() : new Float32Array(0)
  const colCopy = colors ? colors.slice() : new Uint8Array(0)

  self.postMessage(
    {
      type: 'particles',
      positions: posCopy.buffer,
      colors: colCopy.buffer
    },
    [posCopy.buffer, colCopy.buffer]
  )
}

self.onmessage = (e) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      init(msg)
      break
    case 'update':
      update(msg.delta, msg.attractors)
      break
    case 'resize':
      resize(msg)
      break
  }
}
