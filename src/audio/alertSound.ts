export class AlertSound {
  private context: AudioContext | null = null

  async unlock() {
    this.context ??= new AudioContext()
    if (this.context.state === 'suspended') await this.context.resume()
  }

  play() {
    const context = this.context
    if (!context || context.state !== 'running') return

    const start = context.currentTime
    const gain = context.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42)
    gain.connect(context.destination)

    for (const [index, frequency] of [660, 880].entries()) {
      const oscillator = context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, start)
      oscillator.connect(gain)
      oscillator.start(start + index * 0.12)
      oscillator.stop(start + 0.22 + index * 0.12)
    }
  }

  async close() {
    if (this.context) await this.context.close()
    this.context = null
  }
}
