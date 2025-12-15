const file = document.querySelector<HTMLInputElement>("#file")!;
const play = document.querySelector<HTMLButtonElement>("#play")!;
const pause = document.querySelector<HTMLButtonElement>("#pause")!;
const statusEl = document.querySelector<HTMLSpanElement>("#status")!;
const boostEl = document.querySelector<HTMLInputElement>("#boost")!;
const gateEl = document.querySelector<HTMLInputElement>("#gate")!;
const attackEl = document.querySelector<HTMLInputElement>("#attack")!;
const releaseEl = document.querySelector<HTMLInputElement>("#release")!;
const cv = document.querySelector<HTMLCanvasElement>("#cv")!;
const g = cv.getContext("2d")!;

let audioCtx: AudioContext | null = null;
let audioEl: HTMLAudioElement | null = null;

let analyser: AnalyserNode | null = null;
let srcNode: MediaElementAudioSourceNode | null = null;
let hp: BiquadFilterNode | null = null;
let lp: BiquadFilterNode | null = null;

let raf = 0;

// envelope + estado visual
let env = 0; // 0..1 (abertura)
let mouthShape = 0.5; // 0..1 (0=wide, 1=round)
let t0 = performance.now();

// blink/head
let blink = 0; // 0..1
let nextBlinkAt = performance.now() + 1200 + Math.random() * 2500;

function setStatus(t: string) {
  statusEl.textContent = t;
}

function ensureCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function cleanup() {
  cancelAnimationFrame(raf);
  raf = 0;

  if (audioEl) {
    audioEl.pause();
    audioEl.src = "";
    audioEl = null;
  }

  try { srcNode?.disconnect(); } catch {}
  try { hp?.disconnect(); } catch {}
  try { lp?.disconnect(); } catch {}
  try { analyser?.disconnect(); } catch {}

  analyser = null;
  srcNode = null;
  hp = null;
  lp = null;

  env = 0;
  mouthShape = 0.5;

  play.disabled = true;
  pause.disabled = true;
}

function connectGraph() {
  const ac = ensureCtx();
  if (!audioEl) throw new Error("audioEl null");

  srcNode = ac.createMediaElementSource(audioEl);

  // voz ~ 300-3400Hz (bom o suficiente pro MVP)
  hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 300;

  lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3400;

  analyser = ac.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.0;

  srcNode.connect(hp);
  hp.connect(lp);
  lp.connect(analyser);
  analyser.connect(ac.destination);
}

function rmsTimeDomain(an: AnalyserNode) {
  const buf = new Float32Array(an.fftSize);
  an.getFloatTimeDomainData(buf);

  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

// centroide espectral aproximado (0..1 na banda analisada)
function spectralCentroid01(an: AnalyserNode) {
  const bins = new Uint8Array(an.frequencyBinCount);
  an.getByteFrequencyData(bins);

  let num = 0;
  let den = 0;
  for (let i = 0; i < bins.length; i++) {
    const mag = bins[i];
    den += mag;
    num += mag * i;
  }
  if (den <= 1e-6) return 0.5;
  const idx = num / den; // 0..bins
  return idx / (bins.length - 1);
}

// envelope follower com attack/release
function followEnvelope(cur: number, target: number, dt: number, attack: number, release: number) {
  const a = Math.max(0.001, attack);
  const r = Math.max(0.001, release);

  const k = target > cur ? (1 - Math.exp(-dt / a)) : (1 - Math.exp(-dt / r));
  return cur + (target - cur) * k;
}

function tick(now: number) {
  raf = requestAnimationFrame(tick);

  if (!analyser) return;

  const dt = Math.min(0.05, (now - t0) / 1000);
  t0 = now;

  const boost = Number(boostEl.value);
  const gate = Number(gateEl.value);
  const attack = Number(attackEl.value);
  const release = Number(releaseEl.value);

  // 1) energia da voz
  const rms = rmsTimeDomain(analyser);

  // 2) gate: se rms abaixo do limiar, zera target (não mexe)
  const voiced = rms > gate;
  const target = voiced ? Math.min(1, Math.max(0, (rms * 14) * boost)) : 0;

  // 3) envelope com attack/release
  env = followEnvelope(env, target, dt, attack, release);

  // 4) formato da boca: wide vs round (centroide do espectro)
  // centroide mais baixo ~ "u/o" (round), mais alto ~ "a/e" (wide)
  const c = spectralCentroid01(analyser);
  // inverte pra ficar intuitivo: mais alto => wide (0), mais baixo => round (1)
  const shapeTarget = 1 - c;
  mouthShape = followEnvelope(mouthShape, shapeTarget, dt, 0.08, 0.18);

  // blink: evento rápido
  if (now > nextBlinkAt) {
    blink = 1;
    nextBlinkAt = now + 1200 + Math.random() * 2500;
  }
  // decai blink
  blink = Math.max(0, blink - dt * 6);

  draw(env, mouthShape, blink);
}

function draw(open: number, shape01: number, blink01: number) {
  g.clearRect(0, 0, cv.width, cv.height);

  // fundo
  g.fillStyle = "#fff";
  g.fillRect(0, 0, cv.width, cv.height);

  const cx = cv.width / 2;
  const cy = cv.height / 2;

  // head bob leve com open
  const bob = Math.sin(performance.now() / 140) * (2 + open * 6);

  // cabeça
  g.fillStyle = "#f2f2f2";
  g.beginPath();
  g.arc(cx, cy - 10 + bob, 110, 0, Math.PI * 2);
  g.fill();

  // olhos (blink fecha)
  const eyeOpen = 1 - Math.min(1, blink01 * 1.2);
  const eyeH = 8 * eyeOpen + 1;

  g.fillStyle = "#111";
  // esquerdo
  g.beginPath();
  g.ellipse(cx - 40, cy - 40 + bob, 9, eyeH, 0, 0, Math.PI * 2);
  g.fill();
  // direito
  g.beginPath();
  g.ellipse(cx + 40, cy - 40 + bob, 9, eyeH, 0, 0, Math.PI * 2);
  g.fill();

  // boca: mistura wide/round
  // wide: mais largura, menos altura relativa
  // round: menos largura, mais altura
  const baseW = 92;
  const baseH = 12;

  const roundFactor = shape01; // 0 wide -> 1 round
  const w = baseW * (1 - 0.28 * roundFactor);
  const h = (baseH + open * 58) * (1 + 0.18 * roundFactor);

  // leve curva de sorriso quando bem pouco aberto (interpretação)
  const smile = Math.max(0, 0.25 - open) * 18;

  g.fillStyle = "#111";
  g.beginPath();
  g.ellipse(cx, cy + 38 + bob + smile, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fill();

  // dentes quando abre bastante
  if (open > 0.55) {
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(cx, cy + 28 + bob, (w * 0.78) / 2, 10, 0, 0, Math.PI * 2);
    g.fill();
  }

  // debug
  g.fillStyle = "#666";
  g.font = "12px system-ui";
  g.fillText(`open=${open.toFixed(2)} shape=${shape01.toFixed(2)}`, 12, cv.height - 12);
}

file.addEventListener("change", () => {
  cleanup();

  const f = file.files?.[0];
  if (!f) return;

  const url = URL.createObjectURL(f);
  audioEl = new Audio();
  audioEl.src = url;
  audioEl.crossOrigin = "anonymous";

  connectGraph();

  play.disabled = false;
  pause.disabled = false;

  setStatus("Pronto. Aperte Play.");
  draw(0, 0.5, 0);
});

play.addEventListener("click", async () => {
  if (!audioEl) return;
  const ac = ensureCtx();
  if (ac.state !== "running") await ac.resume();

  await audioEl.play();
  setStatus("Tocando...");
  if (!raf) {
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }
});

pause.addEventListener("click", () => {
  audioEl?.pause();
  setStatus("Pausado.");
});

setStatus("Carregue um áudio.");
draw(0, 0.5, 0);
