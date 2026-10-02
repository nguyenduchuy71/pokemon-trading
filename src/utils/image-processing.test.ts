import { computeTargetSize, ImageInputError, MAX_INPUT_BYTES, validateImageFile } from './image-processing'

describe('computeTargetSize', () => {
  it('downscales the long edge to the max and keeps ratio', () => {
    expect(computeTargetSize(4000, 3000, 960)).toEqual({ width: 960, height: 720 })
    expect(computeTargetSize(3000, 4000, 320)).toEqual({ width: 240, height: 320 })
  })
  it('never upscales', () => {
    expect(computeTargetSize(200, 100, 960)).toEqual({ width: 200, height: 100 })
  })
})

describe('validateImageFile', () => {
  it('accepts jpeg/png/webp under the limit', () => {
    expect(() => validateImageFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).not.toThrow()
  })
  it('rejects other types', () => {
    expect(() => validateImageFile(new File(['x'], 'a.gif', { type: 'image/gif' }))).toThrow(ImageInputError)
  })
  it('rejects oversized files', () => {
    const big = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: MAX_INPUT_BYTES + 1 })
    expect(() => validateImageFile(big)).toThrow('image_size')
  })
})
