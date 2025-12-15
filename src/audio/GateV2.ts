/**
 * 🎯 GateV2 - Gate Inteligente com Energia + Spectral Flux
 * 
 * Decide QUANDO reagir (não classifica voz)
 * - Energia RMS mínima
 * - Mudança espectral (flux) mínima
 * - Sustain opcional para confirmar
 * 
 * Plugável: retorna target (0..1), você aplica seu envelope
 */
export class GateV2 {
  private analyser: AnalyserNode;

  private timeBuf: Float32Array<ArrayBuffer>;
  private freqBuf: Uint8Array<ArrayBuffer>;
  private prevFreq: Uint8Array<ArrayBuffer>;

  private sustainMs = 0;

  // presets default (funciona bem "geral")
  private energyGate = 0.018;     // RMS mínimo
  private fluxGate = 1200;        // mudança espectral mínima
  private minSustain = 50;        // ms pra confirmar (opcional)
  private boost = 2.4;            // ganho da boca

  constructor(analyser: AnalyserNode, opts?: Partial<{
    energyGate: number;
    fluxGate: number;
    minSustain: number;
    boost: number;
  }>) {
    this.analyser = analyser;

    this.timeBuf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
    this.freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    this.prevFreq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    if (opts?.energyGate != null) this.energyGate = opts.energyGate;
    if (opts?.fluxGate != null) this.fluxGate = opts.fluxGate;
    if (opts?.minSustain != null) this.minSustain = opts.minSustain;
    if (opts?.boost != null) this.boost = opts.boost;
  }

  private rms(): number {
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    let sum = 0;
    for (let i = 0; i < this.timeBuf.length; i++) {
      const v = this.timeBuf[i];
      sum += v * v;
    }
    return Math.sqrt(sum / this.timeBuf.length);
  }

  private spectralFlux(): number {
    this.analyser.getByteFrequencyData(this.freqBuf);

    let flux = 0;
    for (let i = 0; i < this.freqBuf.length; i++) {
      const diff = this.freqBuf[i] - this.prevFreq[i];
      if (diff > 0) flux += diff;
    }

    this.prevFreq.set(this.freqBuf);
    return flux;
  }

  /**
   * @returns abertura alvo (0..1)
   */
  update(dt: number): number {
    const energy = this.rms();
    const flux = this.spectralFlux();

    const pass = energy > this.energyGate && flux > this.fluxGate;

    if (pass) this.sustainMs += dt * 1000;
    else this.sustainMs = 0;

    const active = this.sustainMs >= this.minSustain;

    if (!active) return 0;

    return Math.min(1, energy * this.boost * 12);
  }

  // 🎛️ Métodos públicos para ajuste dinâmico via UI
  setEnergyGate(value: number) {
    this.energyGate = value;
  }

  setFluxGate(value: number) {
    this.fluxGate = value;
  }

  setMinSustain(value: number) {
    this.minSustain = value;
  }

  setBoost(value: number) {
    this.boost = value;
  }

  // 📊 Getters para debug
  getEnergyGate() { return this.energyGate; }
  getFluxGate() { return this.fluxGate; }
  getMinSustain() { return this.minSustain; }
  getSustainMs() { return this.sustainMs; }
  getBoost() { return this.boost; }
}
