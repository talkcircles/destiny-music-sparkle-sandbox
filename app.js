/**
 * Destiny's Music & Sparkle Sandbox
 * Core Application Logic:
 * 1. Particle Canvas Engine (Visual Sparkles)
 * 2. Audio Engine (Web Audio API Synthesizer)
 * 3. Step Sequencer (Beat Maker)
 * 4. Interactive Event Listeners & Mascot Logic
 */

// --- PARTICLE ENGINE ---
const canvas = document.getElementById('sparkle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];

// Resize Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Particle Class
class Particle {
  constructor(x, y, color = '#ffffff', shape = 'star') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.shape = shape;
    
    // Random velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - Math.random() * 3; // slight upward drift
    
    // Size, alpha and spin
    this.size = Math.random() * 12 + 8;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.02 + 0.015;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.15;
    this.gravity = 0.12;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity; // Gravity pulling it down
    this.vx *= 0.98; // Friction
    this.angle += this.spin;
    this.alpha -= this.decay;
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    
    // Draw glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    if (this.shape === 'star') {
      this.drawStarPath(0, 0, 5, this.size, this.size / 2);
    } else if (this.shape === 'heart') {
      this.drawHeartPath(0, 0, this.size);
    } else if (this.shape === 'bubble') {
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else { // 'circle' / sparkle dot
      ctx.arc(0, 0, this.size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.closePath();
    if (this.shape !== 'bubble') {
      ctx.fill();
    }
    ctx.restore();
  }

  drawStarPath(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
  }

  drawHeartPath(x, y, size) {
    const w = size;
    const h = size;
    ctx.moveTo(x, y - h / 4);
    ctx.bezierCurveTo(x, y - h / 2, x - w / 2, y - h / 2, x - w / 2, y - h / 4);
    ctx.bezierCurveTo(x - w / 2, y + h / 8, x, y + h / 3, x, y + h / 2);
    ctx.bezierCurveTo(x, y + h / 3, x + w / 2, y + h / 8, x + w / 2, y - h / 4);
    ctx.bezierCurveTo(x + w / 2, y - h / 2, x, y - h / 2, x, y - h / 4);
  }
}

// Spawn Particles
function spawnParticles(x, y, color = '#ffffff', count = 12, forceShape = null) {
  const shapes = ['star', 'heart', 'bubble', 'sparkle'];
  for (let i = 0; i < count; i++) {
    const shape = forceShape || shapes[Math.floor(Math.random() * shapes.length)];
    particles.push(new Particle(x, y, color, shape));
  }
}

// Particle Loop
function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].alpha <= 0) {
      particles.splice(i, 1);
    } else {
      particles[i].draw();
    }
  }
  
  requestAnimationFrame(animateParticles);
}
requestAnimationFrame(animateParticles);


// --- AUDIO ENGINE (Synthesizers) ---
let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;

const keyColors = {
  'key-c4': '#ff477e',
  'key-d4': '#ff8500',
  'key-e4': '#ffd000',
  'key-f4': '#00f5d4',
  'key-g4': '#00bbf9',
  'key-a4': '#9b5de5',
  'key-b4': '#f15bb5',
  'key-c5': '#00f5d4'
};

// Initialize Audio Context (requires user interaction)
function initAudio() {
  if (audioCtx) return;
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime); // Limit overall volume to prevent clipping
  masterGain.connect(audioCtx.destination);
  
  // Generate White Noise Buffer for Clap/Hihat
  const bufferSize = audioCtx.sampleRate * 0.3; // 0.3s of noise
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
}

// Active Piano Note Tracks (for releasing notes gracefully)
const activeSynthNotes = {};

// Warm Synthesizer Piano Sound
function playPianoSynth(frequency, keyId) {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  
  // Create nodes
  const osc = audioCtx.createOscillator();
  const oscSub = audioCtx.createOscillator(); // Sub oscillator for richness
  const gainNode = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, now);
  
  oscSub.type = 'sine';
  oscSub.frequency.setValueAtTime(frequency / 2, now); // Octave below
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, now);
  filter.Q.setValueAtTime(1, now);
  
  // Envelope (Attack, Decay, Sustain, Release)
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.4, now + 0.03); // Attack
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.2); // Decay to Sustain
  
  // Connect nodes
  osc.connect(filter);
  oscSub.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(now);
  oscSub.start(now);
  
  // Save references for key release handling
  if (activeSynthNotes[keyId]) {
    stopPianoSynth(keyId);
  }
  
  activeSynthNotes[keyId] = {
    osc: osc,
    oscSub: oscSub,
    gainNode: gainNode,
    startTime: now
  };
}

function stopPianoSynth(keyId) {
  const synth = activeSynthNotes[keyId];
  if (!synth) return;
  
  const now = audioCtx.currentTime;
  const gainNode = synth.gainNode;
  const osc = synth.osc;
  const oscSub = synth.oscSub;
  
  // Release Phase
  try {
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); // Release envelope
    
    osc.stop(now + 0.45);
    oscSub.stop(now + 0.45);
  } catch(e) {
    // Already stopped or invalid state
  }
  
  delete activeSynthNotes[keyId];
}


// --- SOUND EFFECTS SYNTHESIS ---

function playWandEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6 (Pentatonic roll)
  
  notes.forEach((freq, idx) => {
    const delay = idx * 0.06;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + delay);
    
    gainNode.gain.setValueAtTime(0, now + delay);
    gainNode.gain.linearRampToValueAtTime(0.15, now + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.25);
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.3);
  });
}

function playBubblePopEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  // Rapid frequency sweep upwards
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(950, now + 0.06);
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.08);
}

function playSpaceLaserEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sawtooth';
  // Rapid frequency sweep downwards
  osc.frequency.setValueAtTime(1800, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.35);
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(500, now + 0.35);
  
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  
  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.4);
}

function playChimeEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  const chord = [261.63, 329.63, 392.00, 523.25]; // C chord C4, E4, G4, C5
  
  chord.forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Add tiny detune for nice shimmer
    osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(now);
    osc.stop(now + 1.3);
  });
}

function playGiggleEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  
  // Multiple rapid, cute chirps
  const chirps = 5;
  for (let i = 0; i < chirps; i++) {
    const delay = i * 0.08;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(550 + (i * 50), now + delay);
    osc.frequency.exponentialRampToValueAtTime(900 + (i * 50), now + delay + 0.06);
    
    gainNode.gain.setValueAtTime(0, now + delay);
    gainNode.gain.linearRampToValueAtTime(0.2, now + delay + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.07);
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.08);
  }
}

function playDrumEffect() {
  initAudio();
  const now = audioCtx.currentTime;
  
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, now);
  osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.15); // rapid pitch drop
  
  gainNode.gain.setValueAtTime(0.5, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(now);
  osc.stop(now + 0.2);
}


// --- SEQUENCER INSTRUMENTS (For Beat Maker) ---

function playSeqKick(time) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
  
  gainNode.gain.setValueAtTime(0.5, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(time);
  osc.stop(time + 0.16);
}

function playSeqClap(time) {
  if (!noiseBuffer) return;
  
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  filter.Q.value = 2;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.3, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  source.start(time);
  source.stop(time + 0.15);
}

function playSeqHat(time) {
  if (!noiseBuffer) return;
  
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7500;
  
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.18, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  
  source.start(time);
  source.stop(time + 0.05);
}

function playSeqBeep(time) {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, time); // A5 note
  
  gainNode.gain.setValueAtTime(0.15, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  
  osc.start(time);
  osc.stop(time + 0.1);
}


// --- SEQUENCER LOOP TIMER (Beat Maker) ---

let isPlaying = false;
let currentStep = 0;
let nextNoteTime = 0.0;
let tempo = 120; // BPM
const lookahead = 25.0; // milliseconds
const scheduleAheadTime = 0.1; // seconds
let timerId = null;

function nextStep() {
  const secondsPerBeat = 60.0 / tempo;
  const secondsPerStep = secondsPerBeat / 2; // 8th notes (8 steps total in 4/4 half-bar, looping)
  
  nextNoteTime += secondsPerStep;
  
  currentStep = (currentStep + 1) % 8;
}

function scheduleNote(stepNumber, time) {
  // Read current active rows
  const kickActive = document.querySelector('.seq-row[data-instrument="kick"] .seq-step[data-step="' + stepNumber + '"]').classList.contains('active');
  const clapActive = document.querySelector('.seq-row[data-instrument="clap"] .seq-step[data-step="' + stepNumber + '"]').classList.contains('active');
  const hatActive = document.querySelector('.seq-row[data-instrument="hat"] .seq-step[data-step="' + stepNumber + '"]').classList.contains('active');
  const beepActive = document.querySelector('.seq-row[data-instrument="beep"] .seq-step[data-step="' + stepNumber + '"]').classList.contains('active');
  
  // Play sounds
  if (kickActive) playSeqKick(time);
  if (clapActive) playSeqClap(time);
  if (hatActive) playSeqHat(time);
  if (beepActive) playSeqBeep(time);
  
  // Visual Triggering sync (delayed to exactly match playback timing)
  const delayMs = Math.max(0, (time - audioCtx.currentTime) * 1000);
  setTimeout(() => {
    // Visual Highlight of step column
    highlightStepColumn(stepNumber);
    
    // Trigger sparkles
    if (kickActive) triggerStepVisuals(stepNumber, 'kick');
    if (clapActive) triggerStepVisuals(stepNumber, 'clap');
    if (hatActive) triggerStepVisuals(stepNumber, 'hat');
    if (beepActive) triggerStepVisuals(stepNumber, 'beep');
  }, delayMs);
}

function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
    scheduleNote(currentStep, nextNoteTime);
    nextStep();
  }
  timerId = setTimeout(scheduler, lookahead);
}

// Highlight the playhead column visually
function highlightStepColumn(stepNumber) {
  // Remove playing-head class from all steps
  document.querySelectorAll('.seq-step').forEach(btn => btn.classList.remove('playing-head'));
  
  // Add playing-head to the current step column buttons
  document.querySelectorAll('.seq-step[data-step="' + stepNumber + '"]').forEach(btn => {
    btn.classList.add('playing-head');
  });
}

function triggerStepVisuals(stepNumber, instrument) {
  const activeBtn = document.querySelector('.seq-row[data-instrument="' + instrument + '"] .seq-step[data-step="' + stepNumber + '"]');
  if (!activeBtn) return;
  
  const rect = activeBtn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  
  let color = '#ffffff';
  let forceShape = 'sparkle';
  
  if (instrument === 'kick') { color = '#ff8500'; forceShape = 'circle'; }
  else if (instrument === 'clap') { color = '#ff477e'; forceShape = 'heart'; }
  else if (instrument === 'hat') { color = '#ffd000'; forceShape = 'star'; }
  else if (instrument === 'beep') { color = '#00bbf9'; forceShape = 'bubble'; }
  
  spawnParticles(x, y, color, 8, forceShape);
  
  // Make the mascot bounce in time
  const mascot = document.querySelector('.mascot-star');
  if (mascot) {
    mascot.style.transform = 'scale(1.18) translateY(-10px)';
    setTimeout(() => {
      mascot.style.transform = '';
    }, 120);
  }
}

function startSequencer() {
  initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  isPlaying = true;
  currentStep = 0;
  nextNoteTime = audioCtx.currentTime + 0.05;
  scheduler();
  
  document.getElementById('seq-play').classList.add('playing');
  document.getElementById('seq-play').innerText = 'Pause Beat ⏸️';
  updateMascotSpeech("That beat is so bouncy! 🦄 Let's dance!");
}

function stopSequencer() {
  isPlaying = false;
  clearTimeout(timerId);
  document.getElementById('seq-play').classList.remove('playing');
  document.getElementById('seq-play').innerText = 'Play Beat ▶️';
  
  // Remove playhead styling
  document.querySelectorAll('.seq-step').forEach(btn => btn.classList.remove('playing-head'));
  updateMascotSpeech("Make your own music beats! 🎧");
}


// --- INTERACTIVE EVENT LISTENERS ---

// 1. Mouse Drag Sparkle Generator
let isDrawing = false;
window.addEventListener('mousedown', (e) => {
  isDrawing = true;
  spawnParticles(e.clientX, e.clientY, '#ffffff', 4, 'sparkle');
});

window.addEventListener('mouseup', () => { isDrawing = false; });

window.addEventListener('mousemove', (e) => {
  if (isDrawing) {
    spawnParticles(e.clientX, e.clientY, `hsl(${Math.random() * 360}, 95%, 70%)`, 2);
  }
});

// Touch controls for iPad/Tablets
window.addEventListener('touchstart', (e) => {
  isDrawing = true;
  const touch = e.touches[0];
  spawnParticles(touch.clientX, touch.clientY, '#ffffff', 4, 'sparkle');
});

window.addEventListener('touchend', () => { isDrawing = false; });

window.addEventListener('touchmove', (e) => {
  if (isDrawing && e.touches.length > 0) {
    const touch = e.touches[0];
    spawnParticles(touch.clientX, touch.clientY, `hsl(${Math.random() * 360}, 95%, 70%)`, 2);
  }
});


// 2. Piano Keys Interactive Actions
const pianoKeyboard = document.getElementById('piano-keyboard');

function triggerKeyOn(keyBtn) {
  if (!keyBtn) return;
  const freq = parseFloat(keyBtn.getAttribute('data-note'));
  const keyId = keyBtn.id;
  const color = keyColors[keyId] || '#ffffff';
  
  keyBtn.classList.add('active');
  playPianoSynth(freq, keyId);
  
  // Particles
  const rect = keyBtn.getBoundingClientRect();
  const particleX = rect.left + rect.width / 2;
  const particleY = rect.bottom - 20;
  spawnParticles(particleX, particleY, color, 14);
  
  // Random fun mascot response
  const notesStr = keyBtn.getAttribute('data-letter');
  updateMascotSpeech(`Played note ${notesStr}! 🎶`);
}

function triggerKeyOff(keyBtn) {
  if (!keyBtn) return;
  keyBtn.classList.remove('active');
  const keyId = keyBtn.id;
  stopPianoSynth(keyId);
}

// Mouse Piano trigger listeners
pianoKeyboard.addEventListener('mousedown', (e) => {
  const keyBtn = e.target.closest('.piano-key');
  if (keyBtn) {
    triggerKeyOn(keyBtn);
    
    // Save target for mouseleave and mouseup
    const handleMouseUp = () => {
      triggerKeyOff(keyBtn);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mouseup', handleMouseUp);
  }
});

// Touch Piano trigger listeners
pianoKeyboard.addEventListener('touchstart', (e) => {
  e.preventDefault(); // prevents dual trigger with mouse events
  const keyBtn = e.target.closest('.piano-key');
  if (keyBtn) {
    triggerKeyOn(keyBtn);
    
    const handleTouchEnd = () => {
      triggerKeyOff(keyBtn);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchend', handleTouchEnd);
  }
}, { passive: false });


// 3. Soundboard buttons listener
document.querySelectorAll('.sound-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const btnElement = e.currentTarget;
    const effectId = btnElement.id;
    
    btnElement.classList.add('active');
    setTimeout(() => btnElement.classList.remove('active'), 250);
    
    const rect = btnElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    let color = '#ffffff';
    let word = '';
    
    if (effectId === 'btn-wand') {
      playWandEffect();
      color = '#ffe600';
      word = 'Wooosh! 🪄';
      spawnParticles(x, y, color, 20, 'star');
    } else if (effectId === 'btn-bubble') {
      playBubblePopEffect();
      color = '#00ffcc';
      word = 'Pop! 🫧';
      spawnParticles(x, y, color, 18, 'bubble');
    } else if (effectId === 'btn-laser') {
      playSpaceLaserEffect();
      color = '#ff3366';
      word = 'Pew Pew! 🚀';
      spawnParticles(x, y, color, 20, 'sparkle');
    } else if (effectId === 'btn-chime') {
      playChimeEffect();
      color = '#33ccff';
      word = 'Ding Dong! 🔔';
      spawnParticles(x, y, color, 18, 'star');
    } else if (effectId === 'btn-giggle') {
      playGiggleEffect();
      color = '#ff99ff';
      word = 'Tee-hee! 🌈';
      spawnParticles(x, y, color, 22, 'heart');
    } else if (effectId === 'btn-drum') {
      playDrumEffect();
      color = '#ff9933';
      word = 'Boom! 🥁';
      spawnParticles(x, y, color, 16, 'circle');
    }
    
    updateMascotSpeech(word);
  });
});


// 4. Sequencer Grid Step toggles
document.querySelectorAll('.seq-step').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('active');
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnParticles(x, y, '#ffffff', 5, 'sparkle');
    
    initAudio(); // Initialize audio context on click
  });
});

// Sequencer Play Button
document.getElementById('seq-play').addEventListener('click', () => {
  if (isPlaying) {
    stopSequencer();
  } else {
    startSequencer();
  }
});

// Sequencer Tempo Slider
const tempoSlider = document.getElementById('seq-tempo');
const tempoDisplay = document.getElementById('tempo-val');
tempoSlider.addEventListener('input', (e) => {
  tempo = parseInt(e.target.value);
  tempoDisplay.innerText = tempo + ' BPM';
  
  if (tempo > 140) {
    updateMascotSpeech("Hyper Unicorn Speed! 🦄⚡");
  } else if (tempo < 90) {
    updateMascotSpeech("Slow Unicorn Walk... 🐢");
  } else {
    updateMascotSpeech("Sweet musical tempo! 🌈");
  }
});


// 5. Computer Keyboard Bindings
const keyBindings = {
  'KeyA': 'key-c4',
  'KeyS': 'key-d4',
  'KeyD': 'key-e4',
  'KeyF': 'key-f4',
  'KeyG': 'key-g4',
  'KeyH': 'key-a4',
  'KeyJ': 'key-b4',
  'KeyK': 'key-c5'
};

const keysPressed = {};

window.addEventListener('keydown', (e) => {
  if (e.repeat) return; // avoid double triggers
  
  const keyId = keyBindings[e.code];
  if (keyId) {
    const keyBtn = document.getElementById(keyId);
    if (keyBtn) {
      triggerKeyOn(keyBtn);
      keysPressed[e.code] = keyBtn;
    }
  }
});

window.addEventListener('keyup', (e) => {
  const keyBtn = keysPressed[e.code];
  if (keyBtn) {
    triggerKeyOff(keyBtn);
    delete keysPressed[e.code];
  }
});


// 6. Cute Mascot Speech and Clicking
const speechText = document.getElementById('bubble-speech');
const mascot = document.getElementById('mascot-container');

const funPhrases = [
  "Wow! You are a superstar, Destiny! ⭐",
  "Your music sounds magical! 🦄🌈",
  "Click my head to see more sparkles!",
  "Are you ready for your camping trip? 🌲⛺",
  "Music is the best sandbox to play in! 🎵",
  "Can you write a cool song? 🎹"
];

function updateMascotSpeech(text) {
  speechText.innerText = text;
}

// Click mascot for massive sparkles and sound
mascot.addEventListener('click', () => {
  initAudio();
  playWandEffect();
  playChimeEffect();
  
  const rect = mascot.querySelector('.mascot-star').getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  
  // Massive burst of colorful shapes!
  for (let c = 0; c < 3; c++) {
    setTimeout(() => {
      const hue = Math.random() * 360;
      spawnParticles(x, y, `hsl(${hue}, 95%, 65%)`, 15);
    }, c * 100);
  }
  
  // Pick random cute quote
  const randomPhrase = funPhrases[Math.floor(Math.random() * funPhrases.length)];
  updateMascotSpeech(randomPhrase);
});
