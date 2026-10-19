function toGrayscale(imageData) {
  const { data, width, height } = imageData
  const result = new Uint8ClampedArray(data)

  for (let i = 0; i < result.length; i += 4) {
    const gray = result[i] * 0.299 + result[i + 1] * 0.587 + result[i + 2] * 0.114
    result[i] = gray
    result[i + 1] = gray
    result[i + 2] = gray
  }

  return { data: result.buffer, width, height }
}

function applyBlur(imageData, radius) {
  const { data, width, height } = imageData
  const r = Math.max(1, Math.floor(radius || 3))
  const src = new Uint8ClampedArray(data)
  const dst = new Uint8ClampedArray(src.length)
  const diameter = r * 2 + 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0

      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          const idx = (ny * width + nx) * 4
          rSum += src[idx]
          gSum += src[idx + 1]
          bSum += src[idx + 2]
          aSum += src[idx + 3]
          count++
        }
      }

      const idx = (y * width + x) * 4
      dst[idx] = rSum / count
      dst[idx + 1] = gSum / count
      dst[idx + 2] = bSum / count
      dst[idx + 3] = aSum / count
    }
  }

  return { data: dst.buffer, width, height }
}

function applyThreshold(imageData, value) {
  const { data, width, height } = imageData
  const result = new Uint8ClampedArray(data)
  const threshold = value !== undefined ? value : 128

  for (let i = 0; i < result.length; i += 4) {
    const gray = result[i] * 0.299 + result[i + 1] * 0.587 + result[i + 2] * 0.114
    const bw = gray >= threshold ? 255 : 0
    result[i] = bw
    result[i + 1] = bw
    result[i + 2] = bw
  }

  return { data: result.buffer, width, height }
}

self.onmessage = (e) => {
  const msg = e.data
  let result

  switch (msg.type) {
    case 'grayscale':
      result = toGrayscale(msg.imageData)
      self.postMessage({ type: 'grayscale', ...result }, [result.data])
      break
    case 'blur':
      result = applyBlur(msg.imageData, msg.radius)
      self.postMessage({ type: 'blur', ...result }, [result.data])
      break
    case 'threshold':
      result = applyThreshold(msg.imageData, msg.value)
      self.postMessage({ type: 'threshold', ...result }, [result.data])
      break
  }
}
