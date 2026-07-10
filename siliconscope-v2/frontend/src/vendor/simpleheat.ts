// Adapted from simpleheat by Vladimir Agafonkin.
// Source: https://github.com/mourner/simpleheat
// Copyright (c) 2014, Vladimir Agafonkin
// SPDX-License-Identifier: BSD-2-Clause

export type HeatPoint = [number, number, number]

type GradientStops = Record<number, string>

class SimpleHeat {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private maxValue = 1
  private points: HeatPoint[] = []
  private circle?: HTMLCanvasElement
  private radiusSize = 0
  private gradientData?: Uint8ClampedArray

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context is not available.')
    this.ctx = ctx
    this.width = canvas.width
    this.height = canvas.height
  }

  data(points: HeatPoint[]) {
    this.points = points
    return this
  }

  max(value: number) {
    this.maxValue = Math.max(1, value)
    return this
  }

  radius(radius: number, blur = 15) {
    const circle = this.circle = this.createCanvas()
    const ctx = circle.getContext('2d')
    if (!ctx) return this
    const radiusWithBlur = this.radiusSize = radius + blur
    circle.width = circle.height = radiusWithBlur * 2
    ctx.shadowOffsetX = radiusWithBlur * 2
    ctx.shadowOffsetY = radiusWithBlur * 2
    ctx.shadowBlur = blur
    ctx.shadowColor = 'black'
    ctx.beginPath()
    ctx.arc(-radiusWithBlur, -radiusWithBlur, radius, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()
    return this
  }

  resize() {
    this.width = this.canvas.width
    this.height = this.canvas.height
    return this
  }

  gradient(stops: GradientStops) {
    const canvas = this.createCanvas()
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return this
    const gradient = ctx.createLinearGradient(0, 0, 0, 256)
    canvas.width = 1
    canvas.height = 256
    for (const stop of Object.keys(stops)) gradient.addColorStop(Number(stop), stops[Number(stop)])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1, 256)
    this.gradientData = ctx.getImageData(0, 0, 1, 256).data
    return this
  }

  draw(minOpacity = 0.05) {
    if (!this.circle) this.radius(25)
    if (!this.gradientData) this.gradient({ 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' })
    if (!this.circle || !this.gradientData) return this

    this.ctx.clearRect(0, 0, this.width, this.height)
    for (const point of this.points) {
      this.ctx.globalAlpha = Math.min(Math.max(point[2] / this.maxValue, minOpacity), 1)
      this.ctx.drawImage(this.circle, point[0] - this.radiusSize, point[1] - this.radiusSize)
    }

    this.ctx.globalAlpha = 1
    const colored = this.ctx.getImageData(0, 0, this.width, this.height)
    this.colorize(colored.data, this.gradientData)
    this.ctx.putImageData(colored, 0, 0)
    return this
  }

  private colorize(pixels: Uint8ClampedArray, gradient: Uint8ClampedArray) {
    for (let i = 0; i < pixels.length; i += 4) {
      const j = pixels[i + 3] * 4
      if (!j) continue
      pixels[i] = gradient[j]
      pixels[i + 1] = gradient[j + 1]
      pixels[i + 2] = gradient[j + 2]
    }
  }

  private createCanvas() {
    return document.createElement('canvas')
  }
}

export function simpleheat(canvas: HTMLCanvasElement) {
  return new SimpleHeat(canvas)
}
