/* ==========================================================================
   DİJİTAL ODA: KEŞFEDİLEN MEKÂN - 3D VOXEL/PIXEL ENGINE
   ========================================================================== */

// --- SES SENTEZLEYİCİ MOTORU ---
class RoomAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isInitialized = false;
    this.isMuted = false;

    this.waveNode = null;
    this.purrNode = null;
    this.keyboardNode = null;
    this.rainNode = null;

    this.wavesActive = false;
    this.purrActive = false;
    this.keyboardActive = false;
    this.rainActive = false;
    this.birdsActive = false;
    this.lofiActive = false;
    this.purrSpeedMultiplier = 1.0;
    this.birdsTimer = null;
    this.lofiTimer = null;
  }

  init() {
    if (this.isInitialized) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.isInitialized = true;
    console.log("Web Audio API Sentezleyici Motoru Başlatıldı.");
  }

  setMasterVolume(volume) {
    if (!this.isInitialized) return;
    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
  }

  toggleMute() {
    if (!this.isInitialized) return false;
    this.isMuted = !this.isMuted;
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    return this.isMuted;
  }

  // --- 1. DENİZ DALGALARI SENTEZİ ---
  startWaves() {
    if (!this.isInitialized || this.wavesActive) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, this.ctx.currentTime);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(250, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    const volumeGain = this.ctx.createGain();
    const lfoVolumeGain = this.ctx.createGain();
    lfoVolumeGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    
    lfo.connect(lfoVolumeGain);
    lfoVolumeGain.connect(volumeGain.gain);
    volumeGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    noiseSource.connect(filter);
    filter.connect(volumeGain);
    volumeGain.connect(this.masterGain);

    noiseSource.start(0);
    lfo.start(0);

    this.waveNode = { source: noiseSource, filter: filter, lfo: lfo, volume: volumeGain };
    this.wavesActive = true;
  }

  stopWaves() {
    if (!this.wavesActive || !this.waveNode) return;
    try {
      this.waveNode.source.stop();
      this.waveNode.lfo.stop();
    } catch(e) {}
    this.wavesActive = false;
    this.waveNode = null;
  }

  // --- 1B. YAĞMUR SESİ SENTEZİ (Sonbahar için) ---
  startRainSound() {
    if (!this.isInitialized || this.rainActive) return;
    
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2800, this.ctx.currentTime);
    
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);
    
    noiseSource.connect(filter);
    filter.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    noiseSource.start(0);
    
    this.rainNode = { source: noiseSource, filter: filter, lowpass: lowpass, gain: gainNode };
    this.rainActive = true;
    console.log("Yağmur Sesi Sentezleyicisi Başlatıldı.");
  }
  
  stopRainSound() {
    if (!this.rainActive || !this.rainNode) return;
    try {
      this.rainNode.source.stop();
    } catch(e) {}
    this.rainActive = false;
    this.rainNode = null;
    console.log("Yağmur Sesi Sentezleyicisi Durduruldu.");
  }

  // --- 1C. KUŞ SESLERİ SENTEZİ (İlkbahar için) ---
  startBirds() {
    if (!this.isInitialized || this.birdsActive) return;
    this.birdsActive = true;

    const scheduleNext = () => {
      if (!this.birdsActive) return;
      this.playBirdChirp();
      const nextDelay = 3000 + Math.random() * 4000; // Her 3 ila 7 saniyede bir ötüş
      this.birdsTimer = setTimeout(scheduleNext, nextDelay);
    };
    scheduleNext();
    console.log("Kuş Sesleri Sentezleyicisi Başlatıldı.");
  }

  stopBirds() {
    if (!this.birdsActive) return;
    this.birdsActive = false;
    if (this.birdsTimer) {
      clearTimeout(this.birdsTimer);
      this.birdsTimer = null;
    }
    console.log("Kuş Sesleri Sentezleyicisi Durduruldu.");
  }

  playBirdChirp() {
    if (!this.isInitialized || this.isMuted || !this.birdsActive) return;

    const now = this.ctx.currentTime;
    const numChirps = 2 + Math.floor(Math.random() * 2);
    let startTime = now;

    for (let j = 0; j < numChirps; j++) {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      const duration = 0.08 + Math.random() * 0.05;
      const startFreq = 2200 + Math.random() * 800;
      const endFreq = startFreq + 1000 + Math.random() * 400;

      osc.frequency.setValueAtTime(startFreq, startTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

      gainNode.gain.setValueAtTime(0.001, startTime);
      gainNode.gain.linearRampToValueAtTime(0.018, startTime + duration * 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);

      startTime += duration + 0.06 + Math.random() * 0.06;
    }
  }

  // --- 2. KEDİ MIRILDANMASI SENTEZİ ---
  startPurr() {
    if (!this.isInitialized || this.purrActive) return;

    const baseOsc = this.ctx.createOscillator();
    baseOsc.type = 'sine';
    baseOsc.frequency.setValueAtTime(25, this.ctx.currentTime);

    const harmonicOsc = this.ctx.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(50, this.ctx.currentTime);

    const purrLfo = this.ctx.createOscillator();
    purrLfo.type = 'sawtooth';
    purrLfo.frequency.setValueAtTime(23 * this.purrSpeedMultiplier, this.ctx.currentTime);

    const purrLfoGain = this.ctx.createGain();
    purrLfoGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.12, this.ctx.currentTime);

    purrLfo.connect(purrLfoGain);
    purrLfoGain.connect(oscGain.gain);

    baseOsc.connect(oscGain);
    harmonicOsc.connect(oscGain);
    
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(80, this.ctx.currentTime);

    oscGain.connect(lowpass);
    lowpass.connect(this.masterGain);

    baseOsc.start(0);
    harmonicOsc.start(0);
    purrLfo.start(0);

    this.purrNode = { base: baseOsc, harmonic: harmonicOsc, lfo: purrLfo, gain: oscGain };
    this.purrActive = true;
  }

  stopPurr() {
    if (!this.purrActive || !this.purrNode) return;
    try {
      this.purrNode.base.stop();
      this.purrNode.harmonic.stop();
      this.purrNode.lfo.stop();
    } catch(e) {}
    this.purrActive = false;
    this.purrNode = null;
  }

  updatePurrSpeed(multiplier) {
    this.purrSpeedMultiplier = multiplier;
    if (this.purrActive && this.purrNode) {
      this.purrNode.lfo.frequency.setValueAtTime(23 * multiplier, this.ctx.currentTime);
      this.purrNode.gain.gain.setValueAtTime(0.12 + (multiplier - 1.0) * 0.05, this.ctx.currentTime);
    }
  }

  // --- 3. KLAVYE TIKLAMA SESİ SENTEZİ ---
  playKeyboardClick() {
    if (!this.isInitialized || this.isMuted) return;

    const bufferSize = 0.02 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const pitch = 800 + Math.random() * 400;
    osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(0);
    osc.start(0);
    
    noise.stop(this.ctx.currentTime + 0.03);
    osc.stop(this.ctx.currentTime + 0.03);
  }

  // --- 4. KİTAPLIK SAYFA SESİ SENTEZİ ---
  playPageRustle() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    for (let j = 0; j < 3; j++) {
      const delay = j * 0.07;
      const duration = 0.12 + Math.random() * 0.05;
      const bufferSize = duration * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2500 + Math.random() * 800, now + delay);
      filter.Q.setValueAtTime(2, now + delay);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.0, now + delay);
      gainNode.gain.linearRampToValueAtTime(0.06, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      noise.start(now + delay);
      noise.stop(now + delay + duration);
    }
  }

  // --- 5. KOZMİK YILDIZ MELODİSİ SENTEZİ ---
  playCosmicTwinkle() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    
    notes.forEach((freq, index) => {
      const noteDelay = index * 0.14;
      const carrier = this.ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, now + noteDelay);

      const modulator = this.ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 2.0, now + noteDelay);

      const modGain = this.ctx.createGain();
      modGain.gain.setValueAtTime(freq * 0.8, now + noteDelay);
      modGain.gain.exponentialRampToValueAtTime(1, now + noteDelay + 0.3);

      const carrierGain = this.ctx.createGain();
      carrierGain.gain.setValueAtTime(0, now + noteDelay);
      carrierGain.gain.linearRampToValueAtTime(0.08, now + noteDelay + 0.01);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, now + noteDelay + 0.6);

      const delayNode = this.ctx.createDelay();
      delayNode.delayTime.setValueAtTime(0.2, now + noteDelay);
      
      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(0.03, now + noteDelay);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      carrier.connect(carrierGain);
      carrierGain.connect(this.masterGain);

      carrierGain.connect(delayNode);
      delayNode.connect(delayGain);
      delayGain.connect(this.masterGain);

      carrier.start(now + noteDelay);
      modulator.start(now + noteDelay);

      carrier.stop(now + noteDelay + 0.8);
      modulator.stop(now + noteDelay + 0.8);
    });
  }

  // --- 5B. KAYAN YILDIZ SESİ SENTEZİ ---
  playShootingStarSound() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 2.0;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(400, now + duration);
    filter.Q.setValueAtTime(4.0, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.04, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  // --- 5B-2. YILDIRIM GÖK GÜRÜLTÜSÜ SESİ SENTEZİ ---
  playThunderSound() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const duration = 3.5;

    // Create a 3.5-second white noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Rumble low-pass filter (sweeps downwards)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, now);
    filter.frequency.exponentialRampToValueAtTime(35, now + 3.0);

    // Rumbling gain envelope
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.38, now + 0.05); // sharp explosion strike
    gainNode.gain.exponentialRampToValueAtTime(0.09, now + 0.8); // drops to low rumbling
    gainNode.gain.linearRampToValueAtTime(0.001, now + duration); // fade out

    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    noiseSource.start(now);

    // Initial high-frequency crackle/crackle sound
    const crackSource = this.ctx.createBufferSource();
    crackSource.buffer = noiseBuffer;
    const crackFilter = this.ctx.createBiquadFilter();
    crackFilter.type = 'bandpass';
    crackFilter.frequency.setValueAtTime(700, now);
    crackFilter.Q.setValueAtTime(3.0, now);

    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(0.001, now);
    crackGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    crackSource.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(this.masterGain);

    crackSource.start(now);

    // Safety clean up
    setTimeout(() => {
      try {
        noiseSource.stop();
        crackSource.stop();
      } catch (e) {}
    }, 4000);
  }

  // --- 5C. KOZMİK KRİSTAL SİHİRLİ TINISI SENTEZİ ---
  playCrystalMelody() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 622.25, 783.99, 932.33, 1046.50, 1244.51, 1567.98]; // C5, Eb5, G5, Bb5, C6, Eb6, G6
    
    notes.forEach((freq, index) => {
      const noteDelay = index * 0.08;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + noteDelay);

      // Add a slight vibrato using a second oscillator (LFO)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, now + noteDelay); // 8 Hz vibrato
      lfoGain.gain.setValueAtTime(8, now + noteDelay);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, now + noteDelay);
      filter.Q.setValueAtTime(2, now + noteDelay);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.06, now + noteDelay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDelay + 0.8);

      const delayNode = this.ctx.createDelay();
      const delayGain = this.ctx.createGain();
      delayNode.delayTime.setValueAtTime(0.25, now + noteDelay);
      delayGain.gain.setValueAtTime(0.04, now + noteDelay);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      gainNode.connect(delayNode);
      delayNode.connect(delayGain);
      delayGain.connect(this.masterGain);

      osc.start(now + noteDelay);
      lfo.start(now + noteDelay);

      osc.stop(now + noteDelay + 1.0);
      lfo.stop(now + noteDelay + 1.0);
    });
  }

  // --- 5D. LOFI MÜZİK SENTEZLEYİCİ ---
  startLofiMusic() {
    if (!this.isInitialized || this.lofiActive) return;
    this.lofiActive = true;

    const progressions = [
      // Fmaj7 - G6 - Em7 - Am7 (cozy chords)
      [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [196.00, 246.94, 293.66, 392.00], // G6
        [164.81, 196.00, 246.94, 329.63], // Em7
        [220.00, 261.63, 329.63, 392.00]  // Am7
      ],
      // Cmaj7 - Am7 - Dm7 - G7
      [
        [130.81, 164.81, 196.00, 246.94], // Cmaj7
        [220.00, 261.63, 329.63, 392.00], // Am7
        [146.83, 174.61, 220.00, 293.66], // Dm7
        [196.00, 246.94, 293.66, 349.23]  // G7
      ]
    ];

    let progIdx = 0;
    let chordIdx = 0;

    const playNextChord = () => {
      if (!this.lofiActive) return;

      const chord = progressions[progIdx][chordIdx];
      const now = this.ctx.currentTime;
      const duration = 4.0;

      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320 + Math.sin(idx * 0.5) * 50, now);
        filter.Q.setValueAtTime(1, now);

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.04, now + 0.5);
        gainNode.gain.setValueAtTime(0.04, now + duration - 0.5);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 0.1);
      });

      // Soft beat synthesis
      const playSoftBeat = (beatDelay) => {
        const beatTime = now + beatDelay;
        if (this.isMuted) return;

        // Kick drum
        const oscKick = this.ctx.createOscillator();
        const gainKick = this.ctx.createGain();
        oscKick.frequency.setValueAtTime(90, beatTime);
        oscKick.frequency.exponentialRampToValueAtTime(35, beatTime + 0.18);
        gainKick.gain.setValueAtTime(0.05, beatTime);
        gainKick.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);
        oscKick.connect(gainKick);
        gainKick.connect(this.masterGain);
        oscKick.start(beatTime);
        oscKick.stop(beatTime + 0.2);

        // Brush/rim click
        const bufferSize = 0.04 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for(let i=0; i<bufferSize; i++) noiseData[i] = Math.random()*2 - 1;
        const sourceNoise = this.ctx.createBufferSource();
        sourceNoise.buffer = noiseBuffer;
        const filterNoise = this.ctx.createBiquadFilter();
        filterNoise.type = 'bandpass';
        filterNoise.frequency.setValueAtTime(1200, beatTime);
        const gainNoise = this.ctx.createGain();
        gainNoise.gain.setValueAtTime(0.01, beatTime);
        gainNoise.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.04);
        sourceNoise.connect(filterNoise);
        filterNoise.connect(gainNoise);
        gainNoise.connect(this.masterGain);
        sourceNoise.start(beatTime);
        sourceNoise.stop(beatTime + 0.05);
      };

      playSoftBeat(0);
      playSoftBeat(1.33);
      playSoftBeat(2.66);

      chordIdx = (chordIdx + 1) % 4;
      if (chordIdx === 0) {
        progIdx = (progIdx + 1) % progressions.length;
      }

      this.lofiTimer = setTimeout(playNextChord, duration * 1000);
    };

    playNextChord();
  }

  stopLofiMusic() {
    this.lofiActive = false;
    if (this.lofiTimer) {
      clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
  }

  // --- 6. RÜZGAR ÇANI / AMBİYANS SWELL ---
  playAmbientSwell() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const chord = [440.00, 554.37, 659.25, 830.61, 987.77];

    chord.forEach((freq, index) => {
      const arpeggioDelay = index * 0.15;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + arpeggioDelay);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now + arpeggioDelay);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now + arpeggioDelay);
      gainNode.gain.linearRampToValueAtTime(0.04, now + arpeggioDelay + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + arpeggioDelay + 3.5);

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now + arpeggioDelay);
      osc.stop(now + arpeggioDelay + 3.8);
    });
  }

  // --- 7. SANATSAL GONG ---
  playArtGong() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const fundamental = 180;
    const partials = [1.0, 1.45, 1.91, 2.2, 2.7, 3.12];
    const partialGains = [0.08, 0.05, 0.04, 0.03, 0.02, 0.01];

    partials.forEach((multiplier, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * multiplier, now);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(partialGains[index], now);
      const decayTime = 1.8 / (multiplier * 0.6);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + decayTime + 0.1);
    });
  }

  // --- TEMA GEÇİŞ SESLERİ ---
  playThemeTransitionSound() {
    if (!this.isInitialized || this.isMuted) return;

    const now = this.ctx.currentTime;
    const notes = [659.25, 783.99, 987.77];
    
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.1);

      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0, now + index * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.05, now + index * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.6);

      osc.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start(now + index * 0.1);
      osc.stop(now + index * 0.1 + 0.7);
    });
  }
}

const audio = new RoomAudioEngine();

// --- THREE.JS WEBGL 3D INTERACTIVE ENGINE ---
class ThreeCamperEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isInterior = false;
    this.caravanColor = '#14b8a6';
    this.paintingColor = '#f97316';
    this.fireIntensity = 2;
    this.theme = 'sunset';
    this.zoomLevel = 1.0;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 3D Objects references
    this.camperGroup = null;
    this.exteriorShellGroup = null;
    this.interiorGroup = null;
    this.chassisMesh = null;
    this.paintingMesh = null;
    this.catBody = null;
    this.catHead = null;
    this.catTail = null;
    this.stoveLight = null;
    this.starsParticles = null;
    this.seaMesh = null;
    this.campfireLight = null;
    this.campfireFlames = [];
    this.seaGeometry = null;
    
    // Lighting
    this.ambientLight = null;
    this.dirLight = null;
    this.interiorGlowLight = null;
    
    // Interactive objects array
    this.interactiveObjects = [];
    this.gazeboLEDs = [];

    // Backyard Cinema
    this.cinemaPointLights = [];
    this.movieCanvas = null;
    this.movieCanvasCtx = null;
    this.movieTexture = null;
    this.screenReflectionLight = null;
    this.cinemaStringLEDs = [];

    // Weather & Seasons
    this.season = 'summer';
    this.rainParticles = null;
    this.snowParticles = null;
    this.springParticles = null;
    this.treeLEDsGroup = null;

    // Seasonal Materials references
    this.sandMaterial = null;
    this.lawnMaterial = null;
    this.leafMat = null;
    this.bLeavesMat = null;
    this.p2LeafMat = null;
    this.darkLeafMat = null;
    this.palmLeafMat = null;
    this.leafCinemaMat = null;

    // Shooting Star, Cosmic Crystal & Rainbow Effect
    this.crystalMesh = null;
    this.crystalLight = null;
    this.shootingStarMesh = null;
    this.shootingStarLight = null;
    this.shootingStarTrail = null;
    this.isShootingStarAnimating = false;
    this.shootingStarProgress = 0.0;
    this.isRainbowEffectActive = false;
    this.rainbowTimer = 0;
    this.isCrystalFading = false;
    this.crystalFadeProgress = 1.0;

    // [NEW] Lightning properties
    this.isLightningFlashing = false;
    this.lightningFlashStep = 0;
    this.lightningBaseAmbient = 0;
    this.lightningBaseDir = 0;
    this.lightningBaseAmbientColor = 0;
    this.lightningBaseDirColor = 0;

    // [NEW] Hover highlighting properties
    this.currentlyHoveredObject = null;

    // [NEW] Fireflies & Yakamoz properties
    this.firefliesGroup = null;
    this.fireflies = [];
    this.yakamozGroup = null;
    this.yakamozSparkles = [];
  }

  init() {
    // 1. Scene & Renderer Setup
    this.scene = new THREE.Scene();
    
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(14, 10, 14); // Set back for larger showroom caravan
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't look under the ground
    this.controls.minDistance = 6;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 1.6, 0);

    // 2. Add Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(10, 15, 10);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 40;
    const d = 10;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // Interior glow PointLight
    this.interiorGlowLight = new THREE.PointLight(0xfef08a, 0.0, 5);
    this.interiorGlowLight.position.set(0, 1.2, 0);
    this.scene.add(this.interiorGlowLight);

    // 3. Build the Scene
    this.buildEnvironment();
    this.buildCamper();
    this.buildBackyardCinema();
    this.buildWeatherParticles();
    this.buildTreeLEDs();

    // Set Theme
    this.updateThemeColors();

    // 4. Input & Controls bindings
    const zoomRange = document.getElementById('zoom-range');
    if (zoomRange) {
      zoomRange.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.setZoom(val);
      });
    }

    // Windows resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Click Raycasting
    this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));

    // Animation Loop
    this.animate();
  }

  setZoom(val) {
    this.zoomLevel = Math.min(Math.max(val, 0.6), 2.2);
    
    // Update Slider
    const zoomRange = document.getElementById('zoom-range');
    if (zoomRange) {
      zoomRange.value = this.zoomLevel;
    }

    // Update value text
    const zoomValText = document.getElementById('zoom-val-text');
    if (zoomValText) {
      zoomValText.textContent = Math.round(this.zoomLevel * 100) + '%';
    }

    // Move camera distance based on zoom level
    const targetDistance = 32 - this.zoomLevel * 18.0; // wider range for larger RV
    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
    this.camera.position.copy(direction.multiplyScalar(targetDistance).add(this.controls.target));
    this.controls.update();
  }

  buildEnvironment() {
    // Helper function to wrap LEDs around a tree trunk
    const wrapTrunkWithLEDs = (parentGroup, baseRadius, height, yOffset, ledCount = 12) => {
      const ledColor = 0xfef08a; // warm yellow glow
      const ledGeo = new THREE.SphereGeometry(0.05, 6, 6);
      
      for (let i = 0; i < ledCount; i++) {
        const angle = (i / ledCount) * Math.PI * 8; // 4 full spirals
        const progress = i / (ledCount - 1);
        const yPos = yOffset + progress * height;
        const radius = baseRadius - progress * 0.05; // slightly tapers up
        
        const ledMat = new THREE.MeshBasicMaterial({ color: ledColor, transparent: true, opacity: 0 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(
          Math.cos(angle) * (radius + 0.03),
          yPos,
          Math.sin(angle) * (radius + 0.03)
        );
        parentGroup.add(led);
        
        // Push to gazeboLEDs list so they automatically twinkle at night!
        this.gazeboLEDs.push(led);
      }
    };

    // Toon Materials (Sand is changed to Green Grass color)
    const sandMaterial = new THREE.MeshToonMaterial({ color: 0x15803d, roughness: 0.9 });
    this.sandMaterial = sandMaterial;
    const lawnMaterial = new THREE.MeshToonMaterial({ color: 0x166534, roughness: 0.8 });
    this.lawnMaterial = lawnMaterial;
    const stoneMaterial = new THREE.MeshToonMaterial({ color: 0x64748b, roughness: 0.7 });
    const woodMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 0.8 });
    const leafMat = new THREE.MeshToonMaterial({ color: 0x22c55e, roughness: 0.8 });
    this.leafMat = leafMat;

    // Sand Plane (Changed to green grass plane)
    const sandGeo = new THREE.BoxGeometry(50, 0.2, 28);
    const sandMesh = new THREE.Mesh(sandGeo, sandMaterial);
    sandMesh.position.set(0, -0.1, 11.8);
    sandMesh.receiveShadow = true;
    this.scene.add(sandMesh);

    // Lawn (Green Area)
    const lawnGeo = new THREE.BoxGeometry(22, 0.22, 20);
    const lawnMesh = new THREE.Mesh(lawnGeo, lawnMaterial);
    lawnMesh.position.set(-6, -0.09, 7.8);
    lawnMesh.receiveShadow = true;
    this.scene.add(lawnMesh);

    // Sea Plane (PlaneGeometry for static waves with flat shading)
    this.seaGeometry = new THREE.PlaneGeometry(60, 40, 40, 20);
    this.seaGeometry.rotateX(-Math.PI / 2); // Lay flat
    
    // Displace vertices once at start to form static waves
    const positionAttribute = this.seaGeometry.attributes.position;
    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);
      const y = Math.sin(x * 0.15) * 0.28 + Math.cos(z * 0.22) * 0.22;
      positionAttribute.setY(i, y);
    }
    positionAttribute.needsUpdate = true;
    this.seaGeometry.computeVertexNormals();

    const seaMaterial = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // Canlı turkuaz
      roughness: 0.15,
      metalness: 0.1,
      flatShading: true,
      transparent: true,
      opacity: 0.85
    });

    this.seaMesh = new THREE.Mesh(this.seaGeometry, seaMaterial);
    this.seaMesh.position.set(0, -0.2, -22.2);
    this.seaMesh.userData = { hotspotId: 7 }; // Sea Hotspot
    this.interactiveObjects.push(this.seaMesh);
    this.scene.add(this.seaMesh);

    // [NEW] Wooden Pier (Ahşap İskele) extending into the sea
    const pierGroup = new THREE.Group();
    pierGroup.position.set(-1.5, -0.05, -2.0); // start at the shore edge
    
    // Support posts
    const pierPostMat = new THREE.MeshToonMaterial({ color: 0x451a03, roughness: 1.0 }); // dark log wood
    const pierPostGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8);
    const pierPostPositions = [
      [-0.45, -0.5, -1.5], [0.45, -0.5, -1.5],
      [-0.45, -0.5, -3.5], [0.45, -0.5, -3.5],
      [-0.45, -0.5, -5.5], [0.45, -0.5, -5.5]
    ];
    pierPostPositions.forEach(pos => {
      const post = new THREE.Mesh(pierPostGeo, pierPostMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      pierGroup.add(post);
    });
    
    // Deck planks
    const plankMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 0.9 }); // weathered wood
    const plankCount = 14;
    for (let i = 0; i < plankCount; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.42), plankMat);
      plank.position.set(0, 0.1, -i * 0.46);
      plank.castShadow = true;
      plank.receiveShadow = true;
      pierGroup.add(plank);
    }
    
    // Lantern at the end of the pier
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), pierPostMat);
    lanternPost.position.set(0.48, 0.65, -6.2);
    pierGroup.add(lanternPost);
    
    const lanternSupport = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.04), pierPostMat);
    lanternSupport.position.set(0.38, 1.2, -6.2);
    pierGroup.add(lanternSupport);
    
    const lanternBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6), new THREE.MeshToonMaterial({ color: 0x1e293b }));
    lanternBody.position.set(0.28, 1.1, -6.2);
    pierGroup.add(lanternBody);
    
    const lanternGlow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    lanternGlow.position.set(0.28, 1.05, -6.2);
    pierGroup.add(lanternGlow);
    
    const pierLight = new THREE.PointLight(0xfef08a, 0.8, 4.0);
    pierLight.position.set(0.28, 0.95, -6.2);
    pierGroup.add(pierLight);
    this.cinemaPointLights.push(pierLight); // animates intensity dynamically with sunset/night themes
    
    pierGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 7 }; // Sea Hotspot
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(pierGroup);

    // [NEW] Gece Yakamozu (Sea Sparkles)
    this.yakamozGroup = new THREE.Group();
    this.yakamozSparkles = [];
    const ykGeo = new THREE.BoxGeometry(0.18, 0.01, 0.18);
    const ykMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 }); // glowing cyan
    
    for (let i = 0; i < 25; i++) {
      const yk = new THREE.Mesh(ykGeo, ykMat.clone());
      yk.position.set(
        (Math.random() - 0.5) * 32.0,
        -0.12,
        -5.0 - Math.random() * 15.0
      );
      yk.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 0.008 + Math.random() * 0.012
      };
      this.yakamozGroup.add(yk);
      this.yakamozSparkles.push(yk);
    }
    this.scene.add(this.yakamozGroup);

    // [NEW] Ateş Böcekleri (Fireflies)
    this.firefliesGroup = new THREE.Group();
    this.fireflies = [];
    const ffGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const ffMat = new THREE.MeshBasicMaterial({ color: 0xd9f99d }); // pale green-yellow glow
    
    for (let i = 0; i < 18; i++) {
      const ff = new THREE.Mesh(ffGeo, ffMat);
      const isNearTree = (i % 2 === 0);
      const centerX = isNearTree ? 8.0 : 5.0; // near orange tree or campfire
      const centerZ = isNearTree ? 14.0 : 4.0;
      
      ff.position.set(
        centerX + (Math.random() - 0.5) * 4.0,
        0.4 + Math.random() * 2.0,
        centerZ + (Math.random() - 0.5) * 4.0
      );
      
      ff.userData = {
        baseX: ff.position.x,
        baseY: ff.position.y,
        baseZ: ff.position.z,
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        speed: 0.01 + Math.random() * 0.02
      };
      
      this.firefliesGroup.add(ff);
      this.fireflies.push(ff);
    }
    this.scene.add(this.firefliesGroup);

    // Sun and Moon (Voxel / Toon style)
    const sunGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(12, 18, -25);
    this.scene.add(this.sunMesh);

    const moonGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.moonMesh.position.set(-12, -15, -25); // Start below horizon
    this.scene.add(this.moonMesh);

    // Path Stones (repositioned to lead from new caravan location to the bench)
    const stoneGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.05, 8);
    const stonePositions = [
      [-4.0, 0.03, 7.5],
      [-2.0, 0.03, 7.2],
      [0.0, 0.03, 6.7],
      [1.8, 0.03, 5.8]
    ];
    stonePositions.forEach(pos => {
      const stone = new THREE.Mesh(stoneGeo, stoneMaterial);
      stone.position.set(pos[0], pos[1], pos[2]);
      stone.rotation.y = Math.random() * Math.PI;
      stone.receiveShadow = true;
      this.scene.add(stone);
    });

    // 1. Orange Tree (repositioned to the former sand area: right side)
    const treeGroup = new THREE.Group();
    treeGroup.position.set(8.0, 0, 14.0);

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8);
    const trunkMat = new THREE.MeshToonMaterial({ color: 0x451a03 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage (Green cloud spheres)
    const fol1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 10), leafMat);
    fol1.position.set(0, 2.5, 0);
    fol1.castShadow = true;
    treeGroup.add(fol1);

    const fol2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), leafMat);
    fol2.position.set(-0.6, 2.8, 0.4);
    fol2.castShadow = true;
    treeGroup.add(fol2);

    const fol3 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 10, 10), leafMat);
    fol3.position.set(0.6, 2.7, -0.4);
    fol3.castShadow = true;
    treeGroup.add(fol3);

    const fol4 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), leafMat);
    fol4.position.set(0, 3.3, 0.2);
    fol4.castShadow = true;
    treeGroup.add(fol4);

    // Oranges (Orange small spheres)
    const orangeMat = new THREE.MeshToonMaterial({ color: 0xf97316 });
    const oPos = [
      [-0.4, 2.2, 0.7],
      [0.5, 2.4, 0.6],
      [-0.7, 2.7, -0.3],
      [0.6, 2.6, -0.6],
      [0, 3.1, -0.5]
    ];
    oPos.forEach(p => {
      const orange = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), orangeMat);
      orange.position.set(p[0], p[1], p[2]);
      treeGroup.add(orange);
    });

    // [NEW] Wrap Orange Tree Trunk with LEDs
    wrapTrunkWithLEDs(treeGroup, 0.22, 1.8, 0.2, 12);

    treeGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 9 };
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(treeGroup);

    // 2. Sonbahar Huş Ağacı (Birch Tree - repositioned to right side)
    const birchGroup = new THREE.Group();
    birchGroup.position.set(9.0, 0, 3.0);
    
    const bTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.2, 8), new THREE.MeshToonMaterial({ color: 0xf5f5f4 }));
    bTrunk.position.y = 1.6;
    bTrunk.castShadow = true;
    birchGroup.add(bTrunk);
    
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 8), new THREE.MeshToonMaterial({ color: 0x27272a }));
      ring.position.set(0, 0.6 + i * 0.7, 0);
      birchGroup.add(ring);
    }
    
    const bLeavesMat = new THREE.MeshToonMaterial({ color: 0xeab308, roughness: 0.85 });
    this.bLeavesMat = bLeavesMat;
    const bFol1 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), bLeavesMat);
    bFol1.position.set(0, 3.4, 0);
    bFol1.castShadow = true;
    birchGroup.add(bFol1);
    
    const bFol2 = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), bLeavesMat);
    bFol2.position.set(0.5, 3.8, -0.4);
    birchGroup.add(bFol2);
    

    this.scene.add(birchGroup);

    // 3. Ek Çam Ağacı 2 (repositioned to right side)
    const pine2Group = new THREE.Group();
    pine2Group.position.set(4.0, 0, 14.0);
    
    const p2Trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.2, 8), new THREE.MeshToonMaterial({ color: 0x451a03 }));
    p2Trunk.position.y = 1.1;
    p2Trunk.castShadow = true;
    pine2Group.add(p2Trunk);
    
    const p2LeafMat = new THREE.MeshToonMaterial({ color: 0x166534, roughness: 0.8 });
    this.p2LeafMat = p2LeafMat;
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.2, 1.4, 6), p2LeafMat);
      cone.position.y = 1.8 + i * 0.8;
      cone.castShadow = true;
      pine2Group.add(cone);
    }
    

    this.scene.add(pine2Group);

    // 4. Küçük Portakal Ağacı (repositioned to right side)
    const smallOrangeGroup = new THREE.Group();
    smallOrangeGroup.position.set(6.0, 0, 15.0);
    
    const sOTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.6, 8), new THREE.MeshToonMaterial({ color: 0x451a03 }));
    sOTrunk.position.y = 0.8;
    smallOrangeGroup.add(sOTrunk);
    
    const sOLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), leafMat);
    sOLeaves.position.set(0, 1.8, 0);
    sOLeaves.castShadow = true;
    smallOrangeGroup.add(sOLeaves);
    
    const sOrange = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 5), new THREE.MeshToonMaterial({ color: 0xf97316 }));
    sOrange.position.set(0.3, 1.6, 0.4);
    smallOrangeGroup.add(sOrange);
    

    this.scene.add(smallOrangeGroup);

    // 5. Sahil Palmiye Ağacı (repositioned to right side beach boundary)
    const palmGroup = new THREE.Group();
    palmGroup.position.set(12.0, 0, 3.0);
    
    const palmTrunkGroup = new THREE.Group();
    const segmentCount = 6;
    const trunkSegmentMat = new THREE.MeshToonMaterial({ color: 0x78350f });
    for (let i = 0; i < segmentCount; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.14 - i * 0.01, 0.16 - i * 0.01, 0.6, 8), trunkSegmentMat);
      seg.position.y = 0.3 + i * 0.5;
      seg.position.x = Math.sin(i * 0.2) * 0.15;
      seg.rotation.z = -0.12;
      seg.castShadow = true;
      palmTrunkGroup.add(seg);
    }
    palmGroup.add(palmTrunkGroup);
    
    const palmLeavesGroup = new THREE.Group();
    palmLeavesGroup.position.set(0.65, 3.1, 0);
    const leafGeo = new THREE.BoxGeometry(1.6, 0.02, 0.4);
    const palmLeafMat = new THREE.MeshToonMaterial({ color: 0x15803d, roughness: 0.7 });
    this.palmLeafMat = palmLeafMat;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(leafGeo, palmLeafMat);
      leaf.position.set(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
      leaf.rotation.y = -angle;
      leaf.rotation.z = Math.PI / 10;
      leaf.castShadow = true;
      palmLeavesGroup.add(leaf);
    }
    palmGroup.add(palmLeavesGroup);
    
    // [NEW] Wrap Palm Tree Trunk with LEDs
    wrapTrunkWithLEDs(palmGroup, 0.16, 2.5, 0.2, 14);


    this.scene.add(palmGroup);

    // ==========================================
    // EXTRA GARDEN DECORATIONS
    // ==========================================
    
    // 1. Kamp Ateşi (repositioned to right side)
    const campfireGroup = new THREE.Group();
    campfireGroup.position.set(5.0, 0.1, 4.0);

    // Stone ring
    const stoneCampMat = new THREE.MeshToonMaterial({ color: 0x78716c, roughness: 0.9 });
    const sGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const stoneCount = 10;
    for (let i = 0; i < stoneCount; i++) {
      const angle = (i / stoneCount) * Math.PI * 2;
      const stoneMesh = new THREE.Mesh(sGeo, stoneCampMat);
      stoneMesh.position.set(Math.cos(angle) * 0.55, 0.02, Math.sin(angle) * 0.55);
      campfireGroup.add(stoneMesh);
    }

    // Wood logs (teepee shape)
    const logCampMat = new THREE.MeshToonMaterial({ color: 0x451a03 });
    const logGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 6);
    logGeo.rotateX(Math.PI / 6);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const log = new THREE.Mesh(logGeo, logCampMat);
      log.position.set(Math.sin(angle) * 0.15, 0.12, Math.cos(angle) * 0.15);
      log.rotation.y = angle;
      campfireGroup.add(log);
    }

    // Fire flame meshes
    this.campfireFlames = [];
    const flameColors = [0xef4444, 0xf97316, 0xfacc15];
    for (let i = 0; i < 3; i++) {
      const flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.14 - i * 0.03, 0.45 - i * 0.08, 5),
        new THREE.MeshBasicMaterial({ color: flameColors[i] })
      );
      flameMesh.position.set((Math.random() - 0.5) * 0.08, 0.2 + i * 0.04, (Math.random() - 0.5) * 0.08);
      campfireGroup.add(flameMesh);
      this.campfireFlames.push(flameMesh);
    }

    // Campfire PointLight
    this.campfireLight = new THREE.PointLight(0xf97316, 1.2, 5);
    this.campfireLight.position.set(0, 0.25, 0);
    campfireGroup.add(this.campfireLight);

    // Register campfire for interaction
    campfireGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 4 };
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(campfireGroup);

    // 2. Katlanır Şezlonglar (repositioned to right side inside Gazebo)
    const woodChairMat = new THREE.MeshToonMaterial({ color: 0x92400e, roughness: 0.8 });
    const fabricMat = new THREE.MeshToonMaterial({ color: 0xf8fafc, roughness: 0.7 });

    const buildChair = (x, z, rotY) => {
      const chair = new THREE.Group();
      chair.position.set(x, 0.1, z);
      chair.rotation.y = rotY;

      // Legs/Frame
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.8), woodChairMat);
      legL.position.x = -0.3;
      legL.rotation.x = Math.PI / 6;
      chair.add(legL);

      const legR = legL.clone();
      legR.position.x = 0.3;
      chair.add(legR);

      // Fabric seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 0.7), fabricMat);
      seat.position.set(0, 0.18, -0.05);
      seat.rotation.x = Math.PI / 6;
      chair.add(seat);


      return chair;
    };

    const chair1 = buildChair(6.0, 7.8, Math.PI / 4);
    const chair2 = buildChair(4.2, 9.2, -Math.PI / 5);
    this.scene.add(chair1);
    this.scene.add(chair2);

    // [NEW] Backyard canvas camp chair near the campfire
    const campChairGroup = new THREE.Group();
    campChairGroup.position.set(4.0, 0.1, 4.6); // close to campfire at (5.0, 0.1, 4.0)
    campChairGroup.rotation.y = -Math.PI / 4; // angle facing the campfire
    
    const campWoodMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 0.8 }); // dark wood
    const canvasMat = new THREE.MeshToonMaterial({ color: 0xd97706, roughness: 0.9 }); // mustard/orange canvas
    
    // Folding X-frame legs
    const campLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), campWoodMat);
    campLeg1.position.set(-0.25, 0.3, 0);
    campLeg1.rotation.z = Math.PI / 6;
    campChairGroup.add(campLeg1);
    
    const campLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), campWoodMat);
    campLeg2.position.set(-0.25, 0.3, 0);
    campLeg2.rotation.z = -Math.PI / 6;
    campChairGroup.add(campLeg2);
    
    const campLeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), campWoodMat);
    campLeg3.position.set(0.25, 0.3, 0);
    campLeg3.rotation.z = Math.PI / 6;
    campChairGroup.add(campLeg3);
    
    const campLeg4 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.7, 0.04), campWoodMat);
    campLeg4.position.set(0.25, 0.3, 0);
    campLeg4.rotation.z = -Math.PI / 6;
    campChairGroup.add(campLeg4);
    
    // Horizontal cross rods
    const campRod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), campWoodMat);
    campRod1.rotation.z = Math.PI / 2;
    campRod1.position.set(0, 0.6, 0.16);
    campChairGroup.add(campRod1);
    
    const campRod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), campWoodMat);
    campRod2.rotation.z = Math.PI / 2;
    campRod2.position.set(0, 0.6, -0.16);
    campChairGroup.add(campRod2);
    
    const campRod3 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), campWoodMat);
    campRod3.rotation.z = Math.PI / 2;
    campRod3.position.set(0, 0.05, 0.16);
    campChairGroup.add(campRod3);
    
    const campRod4 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.54, 8), campWoodMat);
    campRod4.rotation.z = Math.PI / 2;
    campRod4.position.set(0, 0.05, -0.16);
    campChairGroup.add(campRod4);
    
    // Slung Canvas Seat
    const canvasSeat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.015, 0.44), canvasMat);
    canvasSeat.position.set(0, 0.45, 0);
    campChairGroup.add(canvasSeat);
    
    // Canvas Backrest
    const canvasBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.015), canvasMat);
    canvasBack.position.set(0, 0.72, -0.16);
    canvasBack.rotation.x = -Math.PI / 12;
    campChairGroup.add(canvasBack);
    
    // Backrest poles
    const campPoleL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), campWoodMat);
    campPoleL.position.set(-0.23, 0.75, -0.16);
    campPoleL.rotation.x = -Math.PI / 12;
    campChairGroup.add(campPoleL);
    
    const campPoleR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), campWoodMat);
    campPoleR.position.set(0.23, 0.75, -0.16);
    campPoleR.rotation.x = -Math.PI / 12;
    campChairGroup.add(campPoleR);
    
    campChairGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 4 }; // Links to fireplace/camp hotspot
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(campChairGroup);

    // 3. Bahçeye Renkli LED'li Çardak (repositioned to right side)
    const gazeboGroup = new THREE.Group();
    gazeboGroup.position.set(5.0, 0, 8.5);
    
    // Columns (4 wooden posts)
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8);
    const postPositions = [
      [-2.0, 1.2, -1.75], [2.0, 1.2, -1.75],
      [-2.0, 1.2, 1.75], [2.0, 1.2, 1.75]
    ];
    postPositions.forEach(pos => {
      const post = new THREE.Mesh(postGeo, woodMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      gazeboGroup.add(post);
    });
    
    // Roof Frame (wooden beams)
    const beamLongL = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.1, 0.12), woodMat);
    beamLongL.position.set(0, 2.4, -1.75);
    gazeboGroup.add(beamLongL);
    
    const beamLongR = beamLongL.clone();
    beamLongR.position.z = 1.75;
    gazeboGroup.add(beamLongR);
    
    const beamShortL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 3.6), woodMat);
    beamShortL.position.set(-2.0, 2.4, 0);
    gazeboGroup.add(beamShortL);
    
    const beamShortR = beamShortL.clone();
    beamShortR.position.x = 2.0;
    gazeboGroup.add(beamShortR);
    
    // Roof Grid cross-beams
    for (let i = -3; i <= 3; i++) {
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 3.6), woodMat);
      crossBeam.position.set(i * 0.5, 2.45, 0);
      gazeboGroup.add(crossBeam);
    }
    
    // Colorful LED String Lights (Gazebo LEDs)
    // Already initialized in constructor so we don't overwrite tree LEDs
    const ledColors = [0xef4444, 0x10b981, 0x3b82f6, 0xec4899, 0xeab308];
    const ledGeo = new THREE.SphereGeometry(0.06, 6, 6);
    
    // LED light positions around the roof frame
    const ledPositions = [
      [-2.0, 2.25, -1.75], [-1.0, 2.3, -1.75], [0.0, 2.3, -1.75], [1.0, 2.3, -1.75], [2.0, 2.25, -1.75],
      [2.0, 2.3, -0.87], [2.0, 2.3, 0.0], [2.0, 2.3, 0.87], [2.0, 2.25, 1.75],
      [1.0, 2.3, 1.75], [0.0, 2.3, 1.75], [-1.0, 2.3, 1.75], [-2.0, 2.25, 1.75],
      [-2.0, 2.3, 0.87], [-2.0, 2.3, 0.0], [-2.0, 2.3, -0.87]
    ];
    
    ledPositions.forEach((pos, idx) => {
      const color = ledColors[idx % ledColors.length];
      const ledMat = new THREE.MeshBasicMaterial({ color: color });
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(pos[0], pos[1], pos[2]);
      gazeboGroup.add(led);
      this.gazeboLEDs.push(led);
      
      // PointLights for night illumination
      if (idx === 2 || idx === 6 || idx === 10 || idx === 14) {
        const ledLight = new THREE.PointLight(color, 0.25, 1.8);
        ledLight.position.set(pos[0], pos[1] - 0.1, pos[2]);
        gazeboGroup.add(ledLight);
      }
    });
    
    gazeboGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 9 };
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(gazeboGroup);

    // 4. LED'li Bahçe Bankı (LED Bench in middle path/transition)
    const ledBenchGroup = new THREE.Group();
    ledBenchGroup.position.set(-0.5, 0.08, 4.0);
    ledBenchGroup.rotation.y = Math.PI / 2; // face the garden
    
    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), woodMat);
    benchSeat.castShadow = true;
    ledBenchGroup.add(benchSeat);
    
    const benchBack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.08), woodMat);
    benchBack.position.set(0, 0.24, -0.21);
    benchBack.castShadow = true;
    ledBenchGroup.add(benchBack);
    
    // Legs
    const bLegGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
    const legL = new THREE.Mesh(bLegGeo, woodMat);
    legL.position.set(-0.7, -0.2, 0);
    const legR = legL.clone();
    legR.position.x = 0.7;
    ledBenchGroup.add(legL);
    ledBenchGroup.add(legR);
    
    // Colorful LED lights on top of the bench backrest
    const bLedGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const bLedColors = [0xef4444, 0x10b981, 0xec4899, 0xeab308];
    for (let i = 0; i < 4; i++) {
      const ledColor = bLedColors[i];
      const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
      const led = new THREE.Mesh(bLedGeo, ledMat);
      led.position.set(-0.6 + i * 0.4, 0.48, -0.21);
      ledBenchGroup.add(led);
      this.gazeboLEDs.push(led); // twinkle together with gazebo LEDs
    }
    

    this.scene.add(ledBenchGroup);

    // 5. Bahçe Çiçekleri (repositioned around the new garden zone)
    const flowerColors = [0xef4444, 0xec4899, 0xfacc15, 0xffffff];
    const stemMat = new THREE.MeshToonMaterial({ color: 0x22c55e });
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 4);
    const petalGeo = new THREE.SphereGeometry(0.06, 6, 6);

    for (let i = 0; i < 16; i++) {
      const fx = 2 + Math.random() * 9;
      const fz = 2 + Math.random() * 9;
      const flower = new THREE.Group();
      flower.position.set(fx, 0.08, fz);

      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.075;
      flower.add(stem);

      const petal = new THREE.Mesh(petalGeo, new THREE.MeshToonMaterial({ color: flowerColors[i % flowerColors.length] }));
      petal.position.y = 0.15;
      flower.add(petal);

      this.scene.add(flower);
    }

    // 6. Ek Çam Ağacı (Tall Pine Tree - repositioned to right side)
    const pineGroup = new THREE.Group();
    pineGroup.position.set(11.0, 0, 12.0);

    const pTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.8, 8), new THREE.MeshToonMaterial({ color: 0x451a03 }));
    pTrunk.position.y = 1.4;
    pTrunk.castShadow = true;
    pineGroup.add(pTrunk);

    const darkLeafMat = new THREE.MeshToonMaterial({ color: 0x14532d, roughness: 0.8 });
    this.darkLeafMat = darkLeafMat;
    for (let i = 0; i < 3; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2 - i * 0.25, 1.8, 6), darkLeafMat);
      cone.position.y = 2.4 + i * 1.1;
      cone.castShadow = true;
      pineGroup.add(cone);
    }


    this.scene.add(pineGroup);

    // [NEW] Retro Garden Bicycle
    const gardenBikeGroup = new THREE.Group();
    gardenBikeGroup.position.set(3.5, 0.08, 12.0); // Standing in the garden area
    gardenBikeGroup.rotation.y = -Math.PI / 6; // slightly angled

    const bikeTealMat = new THREE.MeshToonMaterial({ color: 0x14b8a6, roughness: 0.5 }); // Teal/Mint frame
    const bikeMetalMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 }); // Silver metal
    const bikeTireMat = new THREE.MeshToonMaterial({ color: 0x1e293b, roughness: 0.9 }); // Dark tires
    const bikeLeatherMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 0.8 }); // Leather seat/grips
    const basketMat = new THREE.MeshToonMaterial({ color: 0xb45309, roughness: 0.9 }); // Woven wicker basket
    const bikeStemMat = new THREE.MeshToonMaterial({ color: 0x22c55e });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.06, 16);
    wheelGeo.rotateX(Math.PI / 2);

    const frontWheel = new THREE.Mesh(wheelGeo, bikeTireMat);
    frontWheel.position.set(0, 0.5, 0.95);
    frontWheel.castShadow = true;
    frontWheel.receiveShadow = true;
    gardenBikeGroup.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, bikeTireMat);
    rearWheel.position.set(0, 0.5, -0.95);
    rearWheel.castShadow = true;
    rearWheel.receiveShadow = true;
    gardenBikeGroup.add(rearWheel);

    // Spokes / Hubs (inner wireframe cylinders for details)
    const spokeMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, wireframe: true });
    const spokesGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.02, 8);
    spokesGeo.rotateX(Math.PI / 2);

    const frontSpokes = new THREE.Mesh(spokesGeo, spokeMat);
    frontSpokes.position.set(0, 0.5, 0.95);
    gardenBikeGroup.add(frontSpokes);

    const rearSpokes = frontSpokes.clone();
    rearSpokes.position.set(0, 0.5, -0.95);
    gardenBikeGroup.add(rearSpokes);

    // Frame tubes (retro design)
    // Chain stay
    const chainStay = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 8), bikeTealMat);
    chainStay.rotateX(Math.PI / 2);
    chainStay.position.set(0, 0.5, -0.475);
    chainStay.castShadow = true;
    gardenBikeGroup.add(chainStay);

    // Seat post tube (vertical-ish)
    const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), bikeTealMat);
    seatTube.rotateX(Math.PI / 12);
    seatTube.position.set(0, 0.8, -0.4);
    seatTube.castShadow = true;
    gardenBikeGroup.add(seatTube);

    // Down tube
    const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.15, 8), bikeTealMat);
    downTube.rotation.set(-Math.PI / 4, 0, 0);
    downTube.position.set(0, 0.78, 0.25);
    downTube.castShadow = true;
    gardenBikeGroup.add(downTube);

    // Top tube (curved or step-through retro loop)
    const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 8), bikeTealMat);
    topTube.rotation.set(-Math.PI / 12, 0, 0);
    topTube.position.set(0, 1.02, 0.15);
    topTube.castShadow = true;
    gardenBikeGroup.add(topTube);

    // Fork (holding front wheel)
    const forkL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8), bikeMetalMat);
    forkL.position.set(-0.06, 0.75, 0.9);
    forkL.rotation.x = -Math.PI / 15;
    forkL.castShadow = true;
    gardenBikeGroup.add(forkL);

    const forkR = forkL.clone();
    forkR.position.x = 0.06;
    gardenBikeGroup.add(forkR);

    // Handlebars stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), bikeMetalMat);
    stem.position.set(0, 1.25, 0.85);
    stem.rotation.x = -Math.PI / 15;
    stem.castShadow = true;
    gardenBikeGroup.add(stem);

    // Handlebar bars
    const handlebars = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), bikeMetalMat);
    handlebars.position.set(0, 1.45, 0.82);
    handlebars.castShadow = true;
    gardenBikeGroup.add(handlebars);

    // Leather Grips
    const gripL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), bikeLeatherMat);
    gripL.position.set(-0.25, 1.45, 0.82);
    gripL.castShadow = true;
    gardenBikeGroup.add(gripL);
    const gripR = gripL.clone();
    gripR.position.x = 0.25;
    gardenBikeGroup.add(gripR);

    // Leather Saddle (Seat)
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.28), bikeLeatherMat);
    saddle.position.set(0, 1.18, -0.45);
    saddle.castShadow = true;
    gardenBikeGroup.add(saddle);

    // Cute Wicker Basket at the front
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.24), basketMat);
    basket.position.set(0, 1.3, 1.0);
    basket.castShadow = true;
    basket.receiveShadow = true;
    gardenBikeGroup.add(basket);

    // Small flower in the basket
    const flowerInBasket = new THREE.Group();
    flowerInBasket.position.set(0, 1.42, 1.0);
    const basketFlowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4), bikeStemMat);
    basketFlowerStem.position.y = 0.04;
    flowerInBasket.add(basketFlowerStem);
    const basketFlowerPetal = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), new THREE.MeshToonMaterial({ color: 0xffffff }));
    basketFlowerPetal.position.y = 0.08;
    flowerInBasket.add(basketFlowerPetal);
    const basketFlowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.018, 4, 4), new THREE.MeshToonMaterial({ color: 0xfacc15 }));
    basketFlowerCenter.position.set(0, 0.09, 0.03);
    flowerInBasket.add(basketFlowerCenter);
    gardenBikeGroup.add(flowerInBasket);

    // Kickstand (tilting the bike slightly)
    const kickstand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 6), bikeMetalMat);
    kickstand.position.set(-0.15, 0.25, -0.15);
    kickstand.rotation.z = Math.PI / 6;
    kickstand.rotation.x = Math.PI / 12;
    kickstand.castShadow = true;
    gardenBikeGroup.add(kickstand);

    // Enable interaction


    this.scene.add(gardenBikeGroup);

    // Twinkling Stars particle system (for Night Theme) - upscaled size and visibility
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 200;
    const starsPositions = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starsPositions[i] = (Math.random() - 0.5) * 100;
      starsPositions[i + 1] = 20 + Math.random() * 25; // Keep them high in the sky
      starsPositions[i + 2] = (Math.random() - 0.5) * 100;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.85, // Prominent stars
      transparent: true,
      opacity: 0.0, // starts hidden
      sizeAttenuation: true
    });
    this.starsParticles = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.starsParticles);
  }

  // --- BUILD CAMPER ---
  buildCamper() {
    this.camperGroup = new THREE.Group();
    this.camperGroup.position.set(-6, 0.95, 2); // Shipped to green lawn area on the left

    this.exteriorShellGroup = new THREE.Group();
    this.interiorGroup = new THREE.Group();
    this.camperGroup.add(this.exteriorShellGroup);
    this.camperGroup.add(this.interiorGroup);

    // Base Materials
    const bodyBeigeMat = new THREE.MeshToonMaterial({ color: 0xf4f1ea, roughness: 0.6 });
    const bodyGreyMat = new THREE.MeshToonMaterial({ color: 0x5e5b56, roughness: 0.7 });
    const windowBlueMat = new THREE.MeshToonMaterial({ color: 0xbadae8, roughness: 0.2 });
    const blackMat = new THREE.MeshToonMaterial({ color: 0x1e293b, roughness: 0.8 });
    const wheelMat = new THREE.MeshToonMaterial({ color: 0x4a4744, roughness: 0.9 });
    const silverMat = new THREE.MeshToonMaterial({ color: 0xdde2e6, roughness: 0.3 });
    const woodMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 0.8 });
    const leafMat = new THREE.MeshToonMaterial({ color: 0x22c55e, roughness: 0.8 });

    // Custom Interior Materials
    const brickMat = new THREE.MeshToonMaterial({ color: 0xb45309, roughness: 0.9 }); // Warm orange-brown brick
    const blueCabinetMat = new THREE.MeshToonMaterial({ color: 0x1e3a8a, roughness: 0.7 }); // Dark blue kitchen cabinet
    const farmhouseSinkMat = new THREE.MeshToonMaterial({ color: 0xf8fafc, roughness: 0.5 }); // White ceramic
    const greenDeskMat = new THREE.MeshToonMaterial({ color: 0x166534, roughness: 0.8 }); // Green writing desk
    const yellowStoolMat = new THREE.MeshToonMaterial({ color: 0xeab308, roughness: 0.8 }); // Yellow stool pad
    const sofaBlueMat = new THREE.MeshToonMaterial({ color: 0x4f46e5, roughness: 0.7 }); // Blue sofa
    const rugBrownMat = new THREE.MeshToonMaterial({ color: 0x451a03, roughness: 0.95 }); // Brown cowhide rug
    const wallClockPinkMat = new THREE.MeshToonMaterial({ color: 0xec4899, roughness: 0.6 }); // Pink clock border

    // ==========================================
    // A. CHASSIS & WHEELS (Always visible)
    // ==========================================
    // Accent-colored Chassis bottom panel
    const chassisGeo = new THREE.BoxGeometry(12.5, 0.3, 9.0);
    this.chassisMesh = new THREE.Mesh(chassisGeo, new THREE.MeshToonMaterial({ color: 0x14b8a6, roughness: 0.7 }));
    this.chassisMesh.position.y = -0.25;
    this.chassisMesh.castShadow = true;
    this.chassisMesh.receiveShadow = true;
    this.camperGroup.add(this.chassisMesh);

    // Tires and Rims
    const wheelGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.7, 16);
    const rimGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.74, 12);
    wheelGeo.rotateX(Math.PI / 2);
    rimGeo.rotateX(Math.PI / 2);

    const wheelsPos = [
      [-3.8, -0.25, 4.6],   // Rear Left
      [-3.8, -0.25, -4.6],  // Rear Right
      [4.2, -0.25, 4.6],    // Front Left
      [4.2, -0.25, -4.6]    // Front Right
    ];

    wheelsPos.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      
      const rim = new THREE.Mesh(rimGeo, silverMat);
      wheel.add(rim);

      this.camperGroup.add(wheel);
    });

    // ==========================================
    // B. EXTERIOR SHELL GROUP (Beige motorhome body)
    // ==========================================
    
    // 1. Luton Body (Rear Living compartment)
    const livingGeo = new THREE.BoxGeometry(9.0, 4.2, 9.0);
    const livingMesh = new THREE.Mesh(livingGeo, bodyBeigeMat);
    livingMesh.position.set(-2.0, 2.0, 0);
    livingMesh.castShadow = true;
    livingMesh.receiveShadow = true;
    this.exteriorShellGroup.add(livingMesh);

    // 2. Driver Cabin
    const cabinGeo = new THREE.BoxGeometry(3.5, 2.4, 9.0);
    const cabinMesh = new THREE.Mesh(cabinGeo, bodyBeigeMat);
    cabinMesh.position.set(4.25, 1.1, 0);
    cabinMesh.castShadow = true;
    cabinMesh.receiveShadow = true;
    this.exteriorShellGroup.add(cabinMesh);

    // 3. Luton Nose (Overcab protrusion)
    const lutonGeo = new THREE.BoxGeometry(3.5, 1.8, 9.0);
    const lutonMesh = new THREE.Mesh(lutonGeo, bodyBeigeMat);
    lutonMesh.position.set(4.25, 3.2, 0);
    lutonMesh.castShadow = true;
    lutonMesh.receiveShadow = true;
    this.exteriorShellGroup.add(lutonMesh);

    // 4. Windows
    // Windshield (Front)
    const windshieldGeo = new THREE.BoxGeometry(0.04, 1.4, 8.8);
    const windshield = new THREE.Mesh(windshieldGeo, windowBlueMat);
    windshield.position.set(6.0, 1.2, 0);
    windshield.userData = { hotspotId: 17 }; // Cabin hotspot
    this.interactiveObjects.push(windshield);
    this.exteriorShellGroup.add(windshield);

    // Side Driver cabin Window (Front Left)
    const cabinWindowGeo = new THREE.BoxGeometry(1.8, 1.0, 0.04);
    const cabinWindow = new THREE.Mesh(cabinWindowGeo, windowBlueMat);
    cabinWindow.position.set(4.25, 1.3, 4.48);
    cabinWindow.userData = { hotspotId: 17 };
    this.interactiveObjects.push(cabinWindow);
    this.exteriorShellGroup.add(cabinWindow);

    // Large Living Room Window (Back Left)
    const livingWindowGeo = new THREE.BoxGeometry(3.0, 1.6, 0.04);
    const livingWindow = new THREE.Mesh(livingWindowGeo, windowBlueMat);
    livingWindow.position.set(-2.0, 2.1, 4.48);
    livingWindow.userData = { hotspotId: 3 }; // Kitchen/Counter hotspot
    this.interactiveObjects.push(livingWindow);
    this.exteriorShellGroup.add(livingWindow);

    // Small Luton Overcab Window
    const lutonWindowGeo = new THREE.BoxGeometry(1.0, 0.6, 0.04);
    const lutonWindow = new THREE.Mesh(lutonWindowGeo, blackMat);
    lutonWindow.position.set(4.25, 3.2, 4.48);
    this.exteriorShellGroup.add(lutonWindow);

    // 5. Entrance Door (Middle Left)
    const doorGroup = new THREE.Group();
    doorGroup.position.set(1.5, 1.3, 4.48);
    
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.04), bodyBeigeMat);
    doorPanel.castShadow = true;
    doorGroup.add(doorPanel);

    // Door window
    const doorWindow = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.05), blackMat);
    doorWindow.position.set(0, 0.7, 0);
    doorGroup.add(doorWindow);

    // Door handle
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), silverMat);
    handle.position.set(0.5, -0.1, 0.03);
    doorGroup.add(handle);

    doorGroup.traverse(child => {
      child.userData = { hotspotId: 12 }; // Door hotspot
      this.interactiveObjects.push(child);
    });
    this.exteriorShellGroup.add(doorGroup);

    // 6. Rooftop Vent box
    const ventBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 2.2), bodyBeigeMat);
    ventBox.position.set(-2.0, 4.225, 0);
    this.exteriorShellGroup.add(ventBox);

    // 7. Roof Chimney Pipe (Hotspot 4)
    const chimneyGroup = new THREE.Group();
    chimneyGroup.position.set(-5.4, 4.075, -2.8);

    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), bodyGreyMat);
    pipe.castShadow = true;
    chimneyGroup.add(pipe);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8), blackMat);
    cap.position.y = 0.4;
    chimneyGroup.add(cap);

    chimneyGroup.traverse(child => {
      child.userData = { hotspotId: 4 }; // Fireplace/Stove hotspot
      this.interactiveObjects.push(child);
    });
    this.exteriorShellGroup.add(chimneyGroup);

    // [NEW] Overbed ceiling skylight roof window
    const skylightGroup = new THREE.Group();
    skylightGroup.position.set(-5.28, 4.11, 0.5);
    
    const frameWoodMat = new THREE.MeshToonMaterial({ color: 0x5c3d2e, roughness: 0.8 }); // warm wood
    const glassMat = new THREE.MeshToonMaterial({ color: 0xbadae8, transparent: true, opacity: 0.6, roughness: 0.1 });
    
    const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 2.0), frameWoodMat);
    frameL.position.set(-0.75, 0.07, 0);
    const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 2.0), frameWoodMat);
    frameR.position.set(0.75, 0.07, 0);
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 0.12), frameWoodMat);
    frameT.position.set(0, 0.07, -1.0);
    const frameB = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.14, 0.12), frameWoodMat);
    frameB.position.set(0, 0.07, 1.0);
    
    const skylightGlass = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.06, 1.88), glassMat);
    skylightGlass.position.set(0, 0.05, 0);
    
    skylightGroup.add(frameL, frameR, frameT, frameB, skylightGlass);
    this.exteriorShellGroup.add(skylightGroup);

    // 8. Arka Bisiklet Askılığı ve Bisiklet
    const bikeGroup = new THREE.Group();
    bikeGroup.position.set(-6.54, 1.4, 0);

    // Askı demirleri
    const rack1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.2, 2.2), woodMat);
    rack1.position.x = 0.05;
    bikeGroup.add(rack1);

    const rackBars = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.8), blackMat);
    rackBars.position.set(-0.35, -0.2, 0);
    bikeGroup.add(rackBars);

    // Bisiklet tekerlekleri
    const bikeWheelMat = new THREE.MeshToonMaterial({ color: 0x334155, roughness: 0.9 });
    const bWheelLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), bikeWheelMat);
    bWheelLeft.rotateX(Math.PI / 2);
    bWheelLeft.position.set(-0.35, 0.03, -0.65);
    bikeGroup.add(bWheelLeft);

    const bWheelRight = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 12), bikeWheelMat);
    bWheelRight.rotateX(Math.PI / 2);
    bWheelRight.position.set(-0.35, 0.03, 0.65);
    bikeGroup.add(bWheelRight);

    // Bisiklet kadrosu
    const bikeFrame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), silverMat);
    bikeFrame.position.set(-0.35, 0.03, 0);
    bikeGroup.add(bikeFrame);

    const frameDiag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), silverMat);
    frameDiag.position.set(-0.35, 0.35, 0.2);
    bikeGroup.add(frameDiag);

    const bikeSeat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.36), blackMat);
    bikeSeat.position.set(-0.35, 0.75, -0.2);
    bikeGroup.add(bikeSeat);

    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.55), blackMat);
    handlebar.position.set(-0.35, 0.75, 0.5);
    bikeGroup.add(handlebar);

    bikeGroup.traverse(child => {
      child.userData = { hotspotId: 6 }; // Bookshelf / Bike rack hotspot
      this.interactiveObjects.push(child);
    });
    this.exteriorShellGroup.add(bikeGroup);

    // 9. DIŞ TENTE (Awning - over the door)
    const awningGroup = new THREE.Group();
    // Mounted at Z = 4.48 (right wall edge). Door center is at X = 1.5.
    
    // Wooden/Metal mounting beam along the wall
    const mountBeam = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.08), woodMat);
    mountBeam.position.set(1.5, 2.8, 4.44);
    awningGroup.add(mountBeam);

    // Front edge beam
    const frontBeam = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 0.08), woodMat);
    frontBeam.position.set(1.5, 2.4, 6.44);
    awningGroup.add(frontBeam);

    // Support poles (standing on ground Y = 0)
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), woodMat);
    pole1.position.set(-0.4, 1.2, 6.44);
    pole1.castShadow = true;
    awningGroup.add(pole1);

    const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), woodMat);
    pole2.position.set(3.4, 1.2, 6.44);
    pole2.castShadow = true;
    awningGroup.add(pole2);

    // Retro Striped Awning Fabric
    // Alternating teal (0x14b8a6) and beige (0xf4f1ea) panels.
    const panelWidth = 0.4;
    const panelDepth = 2.0; // Z direction
    const panelColors = [0x14b8a6, 0xf4f1ea];
    
    for (let i = 0; i < 10; i++) {
      const colHex = panelColors[i % 2];
      const panelMat = new THREE.MeshToonMaterial({ color: colHex, roughness: 0.8 });
      const panel = new THREE.Mesh(new THREE.BoxGeometry(panelWidth - 0.02, 0.03, panelDepth), panelMat);
      
      const px = -0.3 + i * panelWidth;
      panel.position.set(px, 2.6, 5.46);
      panel.rotation.x = Math.atan2(2.4 - 2.8, panelDepth);
      panel.castShadow = true;
      panel.receiveShadow = true;
      awningGroup.add(panel);
    }
    

    this.exteriorShellGroup.add(awningGroup);

    // 10. DIŞ LED SÜSLEMELERİ (Exterior LED Lights)
    const extLEDGroup = new THREE.Group();
    const ledKureGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const warmLEDMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    
    // Roofline LEDs (from X = -6.5 to X = 2.5, Y = 4.1, Z = 4.5)
    for (let i = 0; i <= 12; i++) {
      const px = -6.5 + i * 0.75;
      const led = new THREE.Mesh(ledKureGeo, warmLEDMat);
      led.position.set(px, 4.1, 4.52);
      extLEDGroup.add(led);
      this.gazeboLEDs.push(led); // twinkle together
    }

    // Awning edge dangling LEDs (along the front edge: X = -0.4 to 3.4, Y = 2.4, Z = 6.44)
    for (let i = 0; i <= 6; i++) {
      const px = -0.4 + i * 0.63;
      const wire = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.15, 0.005), blackMat);
      wire.position.set(px, 2.325, 6.44);
      extLEDGroup.add(wire);

      const led = new THREE.Mesh(ledKureGeo, warmLEDMat);
      led.position.set(px, 2.25, 6.44);
      extLEDGroup.add(led);
      this.gazeboLEDs.push(led);

      // Add a couple of PointLights to cast soft ambient glow on the ground/lawn in night theme
      if (i === 1 || i === 5) {
        const softLight = new THREE.PointLight(0xfef08a, 0.35, 3.5);
        softLight.position.set(px, 2.1, 6.4);
        extLEDGroup.add(softLight);
      }
    }

    // Wrap-around LEDs on support poles
    const spiralCount = 5;
    for (let s = 0; s < spiralCount; s++) {
      const angle = s * Math.PI * 0.8;
      const py = 0.2 + s * 0.5;
      const rad = 0.06;
      
      const led1 = new THREE.Mesh(ledKureGeo, warmLEDMat);
      led1.position.set(-0.4 + Math.cos(angle) * rad, py, 6.44 + Math.sin(angle) * rad);
      extLEDGroup.add(led1);
      this.gazeboLEDs.push(led1);

      const led2 = new THREE.Mesh(ledKureGeo, warmLEDMat);
      led2.position.set(3.4 + Math.cos(angle) * rad, py, 6.44 + Math.sin(angle) * rad);
      extLEDGroup.add(led2);
      this.gazeboLEDs.push(led2);
    }

    extLEDGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 8 }; // Link to Stars/Lights modal
        this.interactiveObjects.push(child);
      }
    });
    this.exteriorShellGroup.add(extLEDGroup);

    // [NEW] Cabin Headlights, Bumper, Grill, and Side Mirrors
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 8.2), silverMat);
    frontBumper.position.set(6.03, 0.1, 0);
    frontBumper.castShadow = true;
    this.exteriorShellGroup.add(frontBumper);

    const frontGrill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 3.2), blackMat);
    frontGrill.position.set(6.02, 0.35, 0);
    frontGrill.castShadow = true;
    this.exteriorShellGroup.add(frontGrill);

    // Left Headlight
    const leftLightGroup = new THREE.Group();
    leftLightGroup.position.set(6.01, 0.35, 3.0);
    const leftLightBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.32), bodyGreyMat);
    const leftLightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.28), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    leftLightGlass.position.x = 0.04;
    leftLightGroup.add(leftLightBody, leftLightGlass);
    this.exteriorShellGroup.add(leftLightGroup);

    // Right Headlight
    const rightLightGroup = new THREE.Group();
    rightLightGroup.position.set(6.01, 0.35, -3.0);
    const rightLightBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.32), bodyGreyMat);
    const rightLightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.28), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    rightLightGlass.position.x = 0.04;
    rightLightGroup.add(rightLightBody, rightLightGlass);
    this.exteriorShellGroup.add(rightLightGroup);

    // Left Side Mirror
    const leftMirror = new THREE.Group();
    leftMirror.position.set(5.2, 1.3, 4.5);
    const leftMirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.35), blackMat);
    leftMirrorArm.position.z = 0.155;
    const leftMirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.28), blackMat);
    leftMirrorHead.position.set(0.05, 0, 0.3);
    const leftMirrorRefl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.46, 0.24), silverMat);
    leftMirrorRefl.position.set(-0.075, 0, 0.3);
    leftMirror.add(leftMirrorArm, leftMirrorHead, leftMirrorRefl);
    this.exteriorShellGroup.add(leftMirror);

    // Right Side Mirror
    const rightMirror = new THREE.Group();
    rightMirror.position.set(5.2, 1.3, -4.5);
    const rightMirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.35), blackMat);
    rightMirrorArm.position.z = -0.155;
    const rightMirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 0.28), blackMat);
    rightMirrorHead.position.set(0.05, 0, -0.3);
    const rightMirrorRefl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.46, 0.24), silverMat);
    rightMirrorRefl.position.set(-0.075, 0, -0.3);
    rightMirror.add(rightMirrorArm, rightMirrorHead, rightMirrorRefl);
    this.exteriorShellGroup.add(rightMirror);

    // [NEW] Cabin/Living Area Divider Exterior Seam/Trim
    const divSeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.24, 9.06), blackMat);
    divSeam.position.set(2.5, 2.0, 0);
    this.exteriorShellGroup.add(divSeam);

    // ==========================================
    // C. COZY INTERIOR GROUP (Visible i    // İç Taban ve Duvarlar (Ölçeklenmiş)
    const lightFloorMat = new THREE.MeshToonMaterial({ color: 0xf5ebd0, roughness: 0.75 }); // Light oak parquet floor

    const intFloor = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.04, 8.85), lightFloorMat);
    intFloor.position.set(-2.0, -0.05, 0);
    intFloor.receiveShadow = true;
    this.interiorGroup.add(intFloor);

    // [NEW] Panoramic Windowed Wall - splitting the wall into 4 panels to leave a 6.0x1.6 gap at x=-1.5, y=1.95
    const wallColorMat = new THREE.MeshToonMaterial({ color: 0xe7e5e4 });

    // Left panel (spans X from -6.4 to -4.5, width 1.9)
    const wLeft = new THREE.Mesh(new THREE.BoxGeometry(1.9, 4.0, 0.04), wallColorMat);
    wLeft.position.set(-5.45, 1.95, -4.43);
    wLeft.receiveShadow = true;
    this.interiorGroup.add(wLeft);

    // Right panel (spans X from 1.5 to 2.4, width 0.9)
    const wRight = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.0, 0.04), wallColorMat);
    wRight.position.set(1.95, 1.95, -4.43);
    wRight.receiveShadow = true;
    this.interiorGroup.add(wRight);

    // Bottom panel (spans X from -4.5 to 1.5, height 1.2)
    const wBottom = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.04), wallColorMat);
    wBottom.position.set(-1.5, 0.55, -4.43);
    wBottom.receiveShadow = true;
    this.interiorGroup.add(wBottom);

    // Top panel (spans X from -4.5 to 1.5, height 1.2)
    const wTop = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.2, 0.04), wallColorMat);
    wTop.position.set(-1.5, 3.35, -4.43);
    wTop.receiveShadow = true;
    this.interiorGroup.add(wTop);

    // Semi-transparent blue glass window showing the outside (6.0 wide!)
    const intWindow = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 1.6, 0.02),
      new THREE.MeshToonMaterial({ color: 0xbadae8, transparent: true, opacity: 0.35, roughness: 0.1 })
    );
    intWindow.position.set(-1.5, 1.95, -4.43);
    intWindow.userData = { hotspotId: 11 };
    this.interactiveObjects.push(intWindow);
    this.interiorGroup.add(intWindow);

    const intWallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.0, 8.85), new THREE.MeshToonMaterial({ color: 0xf5f5f4 }));
    intWallLeft.position.set(-6.42, 1.95, 0);
    intWallLeft.receiveShadow = true;
    this.interiorGroup.add(intWallLeft);

    // [NEW] Cabin/Living Area Divider Interior Wood Archway
    const archGroup = new THREE.Group();
    archGroup.position.set(2.4, 0, 0);

    const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 2.2), woodMat);
    leftCol.position.set(0, 1.6, -3.32);
    leftCol.castShadow = true;
    leftCol.receiveShadow = true;
    archGroup.add(leftCol);

    const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 2.2), woodMat);
    rightCol.position.set(0, 1.6, 3.32);
    rightCol.castShadow = true;
    rightCol.receiveShadow = true;
    archGroup.add(rightCol);

    const topHeader = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 8.84), woodMat);
    topHeader.position.set(0, 3.6, 0);
    topHeader.castShadow = true;
    topHeader.receiveShadow = true;
    archGroup.add(topHeader);

    this.interiorGroup.add(archGroup);

    // 1. TUĞLA DUVAR (Voxel / Toon Brick Wall at left end bedroom wall)
    const brickWallGroup = new THREE.Group();
    const brickWidth = 0.58;
    const brickHeight = 0.16;
    const brickDepth = 0.06;
    const numRows = 23;
    const numCols = 15;
    
    for (let r = 0; r < numRows; r++) {
      const y = 0.08 + r * (brickHeight + 0.015);
      const isOffset = (r % 2 === 0);
      const cols = isOffset ? numCols : numCols + 1;
      
      for (let c = 0; c < cols; c++) {
        const brick = new THREE.Mesh(new THREE.BoxGeometry(brickDepth, brickHeight, brickWidth), brickMat);
        let z = -4.4 + c * (brickWidth + 0.015);
        if (isOffset) {
          z += (brickWidth + 0.015) / 2;
        }
        if (z > -4.4 && z < 4.4) {
          brick.position.set(-6.38, y, z);
          brick.castShadow = true;
          brick.receiveShadow = true;
          brickWallGroup.add(brick);
        }
      }
    }
    this.interiorGroup.add(brickWallGroup);

    // 2. FAIRY LIGHTS (Peri Işıkları Zinciri) on the Brick Wall
    const fairyLightsGroup = new THREE.Group();
    const lightPositions = [
      [-6.28, 3.3, -4.0], [-6.28, 3.4, -3.2], [-6.28, 3.2, -2.4], [-6.28, 3.0, -1.6],
      [-6.28, 2.9, -0.8], [-6.28, 3.1, 0.0], [-6.28, 3.4, 0.8], [-6.28, 3.3, 1.6],
      [-6.28, 3.0, 2.4], [-6.28, 2.8, 3.2], [-6.28, 3.1, 4.0]
    ];
    const lightGeo = new THREE.SphereGeometry(0.06, 6, 6);
    const lightBulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    lightPositions.forEach((pos, idx) => {
      const bulb = new THREE.Mesh(lightGeo, lightBulbMat);
      bulb.position.set(pos[0], pos[1], pos[2]);
      fairyLightsGroup.add(bulb);
      
      // PointLights at select locations for warm glow
      if (idx === 2 || idx === 5 || idx === 8) {
        const pointLight = new THREE.PointLight(0xfef08a, 0.22, 2.0);
        pointLight.position.set(pos[0] + 0.1, pos[1], pos[2]);
        fairyLightsGroup.add(pointLight);
      }
    });
    this.interiorGroup.add(fairyLightsGroup);

    // [NEW] Hanging Macrame Plants near the corners
    const spawnHangingPlant = (x, y, z) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(x, y, z);
      
      const ropeMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0, roughness: 1.0 }); // cream macrame rope
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 4), ropeMat);
      rope.position.y = 0.4;
      plantGroup.add(rope);
      
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), woodMat);
      bracket.position.set(-0.2, 0.8, 0);
      plantGroup.add(bracket);
      
      const potMat = new THREE.MeshToonMaterial({ color: 0xc2410c, roughness: 0.8 });
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.26, 8), potMat);
      plantGroup.add(pot);
      
      const soilMat = new THREE.MeshToonMaterial({ color: 0x451a03, roughness: 0.9 });
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), soilMat);
      soil.position.y = 0.11;
      plantGroup.add(soil);
      
      const vineMat1 = new THREE.MeshToonMaterial({ color: 0x22c55e, roughness: 0.8 }); // bright green
      const vineMat2 = new THREE.MeshToonMaterial({ color: 0x15803d, roughness: 0.8 }); // dark green
      
      const vine1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), vineMat1);
      vine1.position.set(0.08, -0.2, 0.08);
      
      const vine2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), vineMat2);
      vine2.position.set(-0.06, -0.3, 0.06);
      
      const vine3 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), vineMat1);
      vine3.position.set(0.02, -0.15, -0.08);
      
      plantGroup.add(vine1, vine2, vine3);
      
      const leafCount = 12;
      for (let i = 0; i < leafCount; i++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), i % 2 === 0 ? vineMat1 : vineMat2);
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.05 + Math.random() * 0.08;
        leaf.position.set(
          Math.cos(angle) * radius,
          -0.1 - Math.random() * 0.4,
          Math.sin(angle) * radius
        );
        leaf.rotation.set(Math.random(), Math.random(), Math.random());
        plantGroup.add(leaf);
      }
      
      plantGroup.traverse(child => {
        child.userData = { hotspotId: 6 }; // Bookshelf/Ivy hotspot
        this.interactiveObjects.push(child);
      });
      this.interiorGroup.add(plantGroup);
    };
    
    spawnHangingPlant(-6.0, 3.0, -2.5);
    spawnHangingPlant(-6.0, 3.0, 2.5);

    // [NEW] Bohemian Macrame Tapestry on Driver Divider Wall
    const macrameGroup = new THREE.Group();
    macrameGroup.position.set(2.38, 2.1, -1.8);
    macrameGroup.rotation.y = -Math.PI / 2; // face the living room
    
    const rodMat = new THREE.MeshToonMaterial({ color: 0x5c3d2e, roughness: 0.9 }); // wood rod
    const threadMat = new THREE.MeshToonMaterial({ color: 0xfdf6e2, roughness: 1.0 }); // off-white cotton threads
    
    // Hanger rod
    const macrameRod = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.7), rodMat);
    macrameGroup.add(macrameRod);
    
    // Hanging cord supports
    const hangerCordL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.25, 0.01), threadMat);
    hangerCordL.position.set(0, 0.12, -0.3);
    hangerCordL.rotation.x = Math.PI / 6;
    macrameGroup.add(hangerCordL);
    
    const hangerCordR = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.25, 0.01), threadMat);
    hangerCordR.position.set(0, 0.12, 0.3);
    hangerCordR.rotation.x = -Math.PI / 6;
    macrameGroup.add(hangerCordR);
    
    // Hanging cotton fringes forming a V-shape
    for (let i = 0; i < 9; i++) {
      const zPos = -0.28 + (i * 0.56) / 8;
      const length = 0.5 - Math.abs(i - 4) * 0.07;
      const cord = new THREE.Mesh(new THREE.BoxGeometry(0.015, length, 0.015), threadMat);
      cord.position.set(0, -length/2 - 0.01, zPos);
      macrameGroup.add(cord);
      
      const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.03), threadMat);
      tassel.position.set(0, -length - 0.02, zPos);
      macrameGroup.add(tassel);
    }
    
    macrameGroup.traverse(child => {
      child.userData = { hotspotId: 6 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(macrameGroup);

    // [NEW] Mia's Cat Food Bowl near the bed area
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(-4.2, 0.01, -1.2);
    
    const bowlMat = new THREE.MeshToonMaterial({ color: 0xef4444 }); // red bowl
    const bowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8), bowlMat);
    bowlGroup.add(bowlBase);
    
    const foodMat = new THREE.MeshToonMaterial({ color: 0x78350f, roughness: 1.0 }); // brown kibble
    const food = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 8), foodMat);
    food.position.y = 0.03;
    bowlGroup.add(food);
    
    const boneMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0, roughness: 1.0 }); // fish bone
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.02), boneMat);
    spine.position.set(0, 0.06, 0);
    spine.rotation.y = Math.PI / 4;
    bowlGroup.add(spine);
    
    for (let i = -1; i <= 1; i++) {
      if (i !== 0) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.06), boneMat);
        rib.position.set(i * 0.03, 0.065, 0);
        rib.rotation.y = Math.PI / 4;
        bowlGroup.add(rib);
      }
    }
    
    bowlGroup.traverse(child => {
      child.userData = { hotspotId: 10 }; // Cat hotspot
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(bowlGroup);

    // 3. YATAK BÖLMESİ (Hotspot 5 - Rear Bed) - Aligned flush against the rear brick wall
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-5.28, 0.02, 0.5);
    bedGroup.rotation.y = 0;

    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 4.5), woodMat);
    bedFrame.position.y = 0.175;
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;
    bedGroup.add(bedFrame);

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 4.5), woodMat);
    headboard.position.set(-1.02, 0.6, 0);
    headboard.castShadow = true;
    bedGroup.add(headboard);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 4.3), new THREE.MeshToonMaterial({ color: 0x3b82f6, roughness: 0.8 }));
    mattress.position.set(0.05, 0.4, 0);
    mattress.castShadow = true;
    bedGroup.add(mattress);

    // Blue checkered quilt patterns
    const quiltColors = [0x60a5fa, 0x1d4ed8];
    for (let xOffset = 0; xOffset < 5; xOffset++) {
      for (let zOffset = 0; zOffset < 10; zOffset++) {
        const check = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.02, 0.35),
          new THREE.MeshToonMaterial({ color: quiltColors[(xOffset + zOffset) % 2] })
        );
        check.position.set(-0.7 + xOffset * 0.35, 0.63, -1.71 + zOffset * 0.38);
        bedGroup.add(check);
      }
    }

    // Pillows (Centered inside narrower bed limits [-2.25, 2.25])
    const purpPillMat = new THREE.MeshToonMaterial({ color: 0x8b5cf6 });
    for (let i = 0; i < 2; i++) {
      const purpPill = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), purpPillMat);
      purpPill.rotation.x = Math.PI / 2;
      purpPill.position.set(-0.75, 0.7, -1.1 + i * 0.7);
      bedGroup.add(purpPill);
    }

    const flowerPillGroup = new THREE.Group();
    flowerPillGroup.position.set(-0.75, 0.7, 0.0);
    const centerNode = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshToonMaterial({ color: 0xfacc15 }));
    centerNode.scale.set(1, 0.5, 1);
    flowerPillGroup.add(centerNode);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshToonMaterial({ color: 0xffffff }));
      petal.position.set(Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12);
      petal.scale.set(1.2, 0.4, 1.2);
      flowerPillGroup.add(petal);
    }
    bedGroup.add(flowerPillGroup);

    const yelPillMat = new THREE.MeshToonMaterial({ color: 0xf59e0b });
    for (let i = 0; i < 2; i++) {
      const yelPill = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), yelPillMat);
      yelPill.position.set(-0.75, 0.7, 0.5 + i * 0.7);
      yelPill.rotation.y = Math.PI / 6;
      bedGroup.add(yelPill);
    }

    bedGroup.traverse(child => {
      child.userData = { hotspotId: 5 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(bedGroup);

    // Bedside Tables (Komodinler)
    const bedsideMat = new THREE.MeshToonMaterial({ color: 0xd97706, roughness: 0.8 });
    const lampBaseMat = new THREE.MeshToonMaterial({ color: 0x1e293b });
    const lampShadeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    
    const buildBedside = (zPos) => {
      const bedside = new THREE.Group();
      bedside.position.set(-5.28, 0, zPos);
      
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), bedsideMat);
      box.position.y = 0.3;
      box.castShadow = true;
      box.receiveShadow = true;
      bedside.add(box);
      
      // Drawer handle
      const hnd = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), silverMat);
      hnd.position.set(0.41, 0.3, 0);
      bedside.add(hnd);
      
      // Bedside lamp
      const lamp = new THREE.Group();
      lamp.position.set(0, 0.6, 0);
      
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), lampBaseMat);
      stem.position.y = 0.075;
      lamp.add(stem);
      
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.2, 10), lampShadeMat);
      shade.position.y = 0.25;
      lamp.add(shade);
      
      const light = new THREE.PointLight(0xfef08a, 0.4, 2.5);
      light.position.y = 0.25;
      lamp.add(light);
      
      bedside.add(lamp);
      
      bedside.traverse(child => {
        child.userData = { hotspotId: 5 }; // bed hotspot
        this.interactiveObjects.push(child);
      });
      return bedside;
    };
    const bedsideL = buildBedside(-2.2); // placing it next to the fireplace
    this.interiorGroup.add(bedsideL);

    // 4. RETRO GARDIROP (Wardrobe next to bed)
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(-3.7, 0, -3.95);

    const wardrobeBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.8, 1.0), new THREE.MeshToonMaterial({ color: 0xd97706, roughness: 0.8 }));
    wardrobeBody.position.y = 1.4;
    wardrobeBody.castShadow = true;
    wardrobeBody.receiveShadow = true;
    wardrobeGroup.add(wardrobeBody);

    const wardrobeArch = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.0, 12), new THREE.MeshToonMaterial({ color: 0xd97706 }));
    wardrobeArch.rotation.z = Math.PI / 2;
    wardrobeArch.position.set(0, 2.8, 0);
    wardrobeGroup.add(wardrobeArch);

    const wHandleL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), silverMat);
    wHandleL.position.set(0.52, 1.4, -0.08);
    const wHandleR = wHandleL.clone();
    wHandleR.position.set(0.52, 1.4, 0.08);
    wardrobeGroup.add(wHandleL);
    wardrobeGroup.add(wHandleR);

    wardrobeGroup.traverse(child => {
      child.userData = { hotspotId: 6 }; // Bookshelf/Wardrobe hotspot
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(wardrobeGroup);

    // 16. DETAYLI VOKSEL KİTAPLIK (Bookshelf)
    const bookshelfGroup = new THREE.Group();
    bookshelfGroup.position.set(-1.5, 0, -4.18);
    
    // Bookshelf hollow outer frame (left, right, top, bottom panels)
    const bsLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 0.5), woodMat);
    bsLeft.position.set(-0.87, 1.4, 0);
    bsLeft.castShadow = true;
    bsLeft.receiveShadow = true;
    bookshelfGroup.add(bsLeft);

    const bsRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.8, 0.5), woodMat);
    bsRight.position.set(0.87, 1.4, 0);
    bsRight.castShadow = true;
    bsRight.receiveShadow = true;
    bookshelfGroup.add(bsRight);

    const bsTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.5), woodMat);
    bsTop.position.set(0, 2.77, 0);
    bsTop.castShadow = true;
    bsTop.receiveShadow = true;
    bookshelfGroup.add(bsTop);

    const bsBottom = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.5), woodMat);
    bsBottom.position.set(0, 0.03, 0);
    bsBottom.castShadow = true;
    bsBottom.receiveShadow = true;
    bookshelfGroup.add(bsBottom);
    
    // Back panel
    const bsBack = new THREE.Mesh(new THREE.BoxGeometry(1.68, 2.68, 0.04), new THREE.MeshToonMaterial({ color: 0x451a03 }));
    bsBack.position.set(0, 1.4, -0.23);
    bookshelfGroup.add(bsBack);
    
    // Horizontal shelves
    const shelfGeo = new THREE.BoxGeometry(1.68, 0.06, 0.44);
    const shelfHeights = [0.7, 1.4, 2.1];
    shelfHeights.forEach(h => {
      const shelf = new THREE.Mesh(shelfGeo, woodMat);
      shelf.position.set(0, h, 0.02);
      bookshelfGroup.add(shelf);
    });
    
    // Add voxel books on the shelves
    const bookColors = [0xef4444, 0x3b82f6, 0x10b981, 0xeab308, 0xec4899, 0xf97316];
    
    // Shelf 1 (Bottom) Books
    for (let i = 0; i < 8; i++) {
      const bColor = bookColors[i % bookColors.length];
      const bookMat = new THREE.MeshToonMaterial({ color: bColor });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.32), bookMat);
      book.position.set(-0.6 + i * 0.16, 0.94, 0.05);
      if (i === 3) book.rotation.z = 0.2;
      bookshelfGroup.add(book);
    }
    
    // Shelf 2 (Middle) Books & Decor
    for (let i = 0; i < 6; i++) {
      const bColor = bookColors[(i + 2) % bookColors.length];
      const bookMat = new THREE.MeshToonMaterial({ color: bColor });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.32), bookMat);
      book.position.set(-0.5 + i * 0.15, 1.64, 0.05);
      bookshelfGroup.add(book);
    }
    // Small pot on shelf 2
    const bsPot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.18, 8), new THREE.MeshToonMaterial({ color: 0xd97706 }));
    bsPot.position.set(0.5, 1.52, 0.05);
    bookshelfGroup.add(bsPot);
    const bsPlant = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), leafMat);
    bsPlant.position.set(0.5, 1.63, 0.05);
    bookshelfGroup.add(bsPlant);
    
    // Shelf 3 (Top) Books and Plant
    for (let i = 0; i < 5; i++) {
      const bColor = bookColors[(i + 4) % bookColors.length];
      const bookMat = new THREE.MeshToonMaterial({ color: bColor });
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.32), bookMat);
      book.position.set(-0.6 + i * 0.18, 2.32, 0.05);
      if (i === 4) book.rotation.z = -0.22;
      bookshelfGroup.add(book);
    }
    
    // Hanging ivy plant on top shelf & edges
    const bsIvyPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.2, 8), new THREE.MeshToonMaterial({ color: 0x94a3b8 }));
    bsIvyPot.position.set(0.4, 2.23, 0.05);
    bookshelfGroup.add(bsIvyPot);
    
    const bsIvyLeaves = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), leafMat);
    bsIvyLeaves.position.set(0.4, 2.35, 0.05);
    bookshelfGroup.add(bsIvyLeaves);
    
    const darkLeafMat = new THREE.MeshToonMaterial({ color: 0x14532d, roughness: 0.8 });
    
    // Ivy Drape (Middle Front)
    const bsIvyDrape = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.08), leafMat);
    bsIvyDrape.position.set(0.4, 1.95, 0.2);
    bookshelfGroup.add(bsIvyDrape);

    // Left Frame Ivy Cascade
    const ivyL1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), leafMat);
    ivyL1.position.set(-0.8, 2.5, 0.22);
    const ivyL2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), darkLeafMat);
    ivyL2.position.set(-0.84, 2.1, 0.22);
    const ivyL3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), leafMat);
    ivyL3.position.set(-0.84, 1.7, 0.22);
    const ivyL4 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.08), darkLeafMat);
    ivyL4.position.set(-0.82, 1.3, 0.22);
    bookshelfGroup.add(ivyL1, ivyL2, ivyL3, ivyL4);

    // Middle Right Ivy Cascade
    const ivyR1 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.1), leafMat);
    ivyR1.position.set(0.42, 1.8, 0.22);
    const ivyR2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.08), darkLeafMat);
    ivyR2.position.set(0.4, 1.5, 0.22);
    bookshelfGroup.add(ivyR1, ivyR2);
    
    bookshelfGroup.traverse(child => {
      child.userData = { hotspotId: 6 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(bookshelfGroup);

    // 5. ÇALIŞMA MASASI, BİLGİSAYAR & ŞIK KİLİTLİ PANEL (Hotspot 1 - Screens)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-0.8, 0, 3.75); // door wall
    deskGroup.rotation.y = Math.PI;
    deskGroup.scale.set(1.15, 1.15, 1.15);
    
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.4), woodMat);
    deskTop.position.y = 0.9;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    const deskLegGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
    const deskLegPositions = [
      [-1.3, 0.45, -0.6], [1.3, 0.45, -0.6],
      [-1.3, 0.45, 0.6], [1.3, 0.45, 0.6]
    ];
    deskLegPositions.forEach(pos => {
      const leg = new THREE.Mesh(deskLegGeo, woodMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      deskGroup.add(leg);
    });

    // Enlarged Laptop on red glowing mat
    const laptopPad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.01, 0.6), new THREE.MeshToonMaterial({ color: 0xef4444 }));
    laptopPad.position.set(0, 0.94, 0);
    deskGroup.add(laptopPad);

    const laptopBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.4), blackMat);
    laptopBody.position.set(0, 0.95, 0.02);
    deskGroup.add(laptopBody);

    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.42, 0.02), blackMat);
    laptopScreen.position.set(0, 1.16, -0.15);
    laptopScreen.rotation.x = -Math.PI / 12;
    deskGroup.add(laptopScreen);

    const laptopGlow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.01), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
    laptopGlow.position.set(0, 1.16, -0.14);
    laptopGlow.rotation.x = -Math.PI / 12;
    deskGroup.add(laptopGlow);

    // Desk Lamp
    const deskLamp = new THREE.Group();
    deskLamp.position.set(-1.2, 0.94, -0.45);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), silverMat);
    lampStem.position.y = 0.25;
    deskLamp.add(lampStem);

    const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.22, 10), new THREE.MeshToonMaterial({ color: 0x3b82f6 }));
    lampShade.position.set(0.08, 0.48, 0.08);
    lampShade.rotation.z = -Math.PI / 6;
    deskLamp.add(lampShade);

    const lampLight = new THREE.PointLight(0xfef08a, 0.4, 3.0);
    lampLight.position.set(0.1, 0.38, 0.1);
    deskLamp.add(lampLight);
    deskGroup.add(deskLamp);

    // Wall Clock (Pink clock next to desk, aligned to wall relative to deskGroup)
    const wallClock = new THREE.Group();
    wallClock.position.set(-0.4, 2.4, -0.68); // will align to the wall because of negative local Z
    const clockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12), wallClockPinkMat);
    clockBody.rotation.x = Math.PI / 2;
    wallClock.add(clockBody);
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 12), new THREE.MeshToonMaterial({ color: 0xffffff }));
    clockFace.rotation.x = Math.PI / 2;
    wallClock.add(clockFace);
    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), blackMat);
    hourHand.position.set(0, 0.05, 0.03);
    wallClock.add(hourHand);
    deskGroup.add(wallClock);

    deskGroup.traverse(child => {
      child.userData = { hotspotId: 1 }; // computer screen hotspot
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(deskGroup);

    // Chair with blue seat pad (placed in front of the desk)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(-0.8, 0, 2.65);
    chairGroup.rotation.y = 0; // facing the desk
    
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.58), woodMat);
    chairSeat.position.y = 0.52;
    chairSeat.castShadow = true;
    chairGroup.add(chairSeat);

    const seatPad = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.54), new THREE.MeshToonMaterial({ color: 0x6366f1 }));
    seatPad.position.set(0, 0.56, 0);
    chairGroup.add(seatPad);

    const backL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6), woodMat);
    backL.position.set(-0.24, 0.82, -0.24);
    const backR = backL.clone();
    backR.position.x = 0.24;
    chairGroup.add(backL);
    chairGroup.add(backR);

    const backTop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.15, 0.04), woodMat);
    backTop.position.set(0, 1.1, -0.24);
    chairGroup.add(backTop);

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.5, 6), woodMat);
      leg.position.set(
        (i % 2 === 0 ? 0.24 : -0.24),
        0.26,
        (i < 2 ? 0.24 : -0.24)
      );
      leg.castShadow = true;
      chairGroup.add(leg);
    }
    chairGroup.traverse(child => {
      child.userData = { hotspotId: 1 }; // computer screen hotspot
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(chairGroup);

    // 6. YEMEK ALANI & TABURELER & YAPBOZ (Restored to the old desk location)
    const diningGroup = new THREE.Group();
    diningGroup.position.set(1.0, 0, -3.4);
    
    const dTableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 18), new THREE.MeshToonMaterial({ color: 0xf1f5f9 }));
    dTableTop.position.y = 0.85;
    dTableTop.castShadow = true;
    dTableTop.receiveShadow = true;
    diningGroup.add(dTableTop);

    const dTableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 8), woodMat);
    dTableLeg.position.y = 0.41;
    dTableLeg.castShadow = true;
    diningGroup.add(dTableLeg);

    // Sunset Puzzle on the table
    const puzzleBoardGroup = new THREE.Group();
    puzzleBoardGroup.position.set(0, 0.88, 0);

    const boardBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.6), new THREE.MeshToonMaterial({ color: 0x8d6e63 }));
    boardBase.castShadow = true;
    boardBase.receiveShadow = true;
    puzzleBoardGroup.add(boardBase);

    const pBCols = 8;
    const pBRows = 6;
    const pBW = 0.72 / pBCols;
    const pBH = 0.52 / pBRows;
    const pBD = 0.015;

    const getTablePuzzleColor = (r, c) => {
      if (r < 2) return 0xad1457; // Sky purple
      if (r >= 2 && r < 4) {
        if (c >= 3 && c <= 4) return 0xfff59d; // Sun yellow
        return 0xe65100; // Sky orange
      }
      return 0x006064; // Water
    };

    for (let r = 0; r < pBRows; r++) {
      for (let c = 0; c < pBCols; c++) {
        if ((r === 1 && c === 2) || (r === 4 && c === 5) || (r === 3 && c === 1)) {
          const loosePiece = new THREE.Mesh(new THREE.BoxGeometry(pBW - 0.005, pBD, pBH - 0.005), new THREE.MeshToonMaterial({ color: getTablePuzzleColor(r, c), roughness: 0.8 }));
          loosePiece.position.set(-0.3 + c * pBW + 0.02, 0.02, -0.2 + r * pBH - 0.03);
          loosePiece.rotation.y = 0.4;
          puzzleBoardGroup.add(loosePiece);
          continue;
        }
        const piece = new THREE.Mesh(new THREE.BoxGeometry(pBW - 0.005, pBD, pBH - 0.005), new THREE.MeshToonMaterial({ color: getTablePuzzleColor(r, c), roughness: 0.8 }));
        piece.position.set(-0.36 + (c + 0.5) * pBW, 0.015, -0.26 + (r + 0.5) * pBH);
        puzzleBoardGroup.add(piece);
      }
    }
    diningGroup.add(puzzleBoardGroup);

    // Stools relative to diningGroup
    const stoolPositions = [
      [-0.8, 0, 0],   // left
      [0.8, 0, 0],    // right
      [0, 0, 1.1]     // front
    ];
    stoolPositions.forEach(pos => {
      const stool = new THREE.Group();
      stool.position.set(pos[0], pos[1], pos[2]);
      
      const sSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 10), woodMat);
      sSeat.position.y = 0.46;
      sSeat.castShadow = true;
      stool.add(sSeat);

      const sSeatPad = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10), yellowStoolMat);
      sSeatPad.position.y = 0.51;
      stool.add(sSeatPad);

      for (let i = 0; i < 3; i++) {
        const sLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 6), woodMat);
        const angle = (i / 3) * Math.PI * 2;
        sLeg.position.set(Math.cos(angle) * 0.18, 0.23, Math.sin(angle) * 0.18);
        sLeg.rotation.z = Math.cos(angle) * 0.12;
        sLeg.rotation.x = -Math.sin(angle) * 0.12;
        sLeg.castShadow = true;
        stool.add(sLeg);
      }
      
      stool.traverse(child => {
        child.userData = { hotspotId: 2 };
        this.interactiveObjects.push(child);
      });
      diningGroup.add(stool);
    });

    diningGroup.traverse(child => {
      child.userData = { hotspotId: 2 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(diningGroup);

    // Boho Kilim Rug in center floor
    const rugGroup = new THREE.Group();
    rugGroup.position.set(-1.0, 0.005, 0);
    
    const creamMat = new THREE.MeshToonMaterial({ color: 0xfdf6e2, roughness: 1.0 }); // cream base
    const orangeMat = new THREE.MeshToonMaterial({ color: 0xf97316, roughness: 1.0 }); // terracotta orange
    const oliveMat = new THREE.MeshToonMaterial({ color: 0x556b2f, roughness: 1.0 }); // olive green
    
    // Base Rug
    const rugBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.01, 3.2), creamMat);
    rugBase.receiveShadow = true;
    rugGroup.add(rugBase);
    
    // Add kilim borders / geometric diamonds
    // Center diamond pattern
    for (let i = -1; i <= 1; i++) {
      // Orange diamonds
      const diamond1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.3), orangeMat);
      diamond1.position.set(0, 0.001, i * 0.8);
      diamond1.rotation.y = Math.PI / 4;
      rugGroup.add(diamond1);
      
      // Smaller olive green diamonds inside orange ones
      const diamondInner = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.014, 0.15), oliveMat);
      diamondInner.position.set(0, 0.002, i * 0.8);
      diamondInner.rotation.y = Math.PI / 4;
      rugGroup.add(diamondInner);
      
      // Side olive diamonds
      const diamondLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.25), oliveMat);
      diamondLeft.position.set(-0.6, 0.001, i * 0.8);
      diamondLeft.rotation.y = Math.PI / 4;
      rugGroup.add(diamondLeft);
      
      const diamondRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.012, 0.25), oliveMat);
      diamondRight.position.set(0.6, 0.001, i * 0.8);
      diamondRight.rotation.y = Math.PI / 4;
      rugGroup.add(diamondRight);
    }
    
    // Border stripes (orange stripes along the edges)
    const stripeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 3.0), orangeMat);
    stripeLeft.position.set(-1.0, 0.001, 0);
    rugGroup.add(stripeLeft);
    
    const stripeRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 3.0), orangeMat);
    stripeRight.position.set(1.0, 0.001, 0);
    rugGroup.add(stripeRight);
    
    // Fringes / Tassels along the top and bottom edges (Z = -1.6 and Z = 1.6)
    const tasselCount = 16;
    const tasselWidth = 0.04;
    const tasselLength = 0.12;
    for (let i = 0; i < tasselCount; i++) {
      const xPos = -1.1 + (i * 2.2) / (tasselCount - 1);
      
      // Top Tassels
      const tasselTop = new THREE.Mesh(new THREE.BoxGeometry(tasselWidth, 0.005, tasselLength), creamMat);
      tasselTop.position.set(xPos, 0.001, -1.6 - tasselLength/2);
      rugGroup.add(tasselTop);
      
      // Bottom Tassels
      const tasselBottom = new THREE.Mesh(new THREE.BoxGeometry(tasselWidth, 0.005, tasselLength), creamMat);
      tasselBottom.position.set(xPos, 0.001, 1.6 + tasselLength/2);
      rugGroup.add(tasselBottom);
    }
    
    this.interiorGroup.add(rugGroup);

    // [REMOVED] Purple sofa removed per user request

    // 8. TALL ÜÇ BAŞLIKLI LAMBADER (Hotspot 8 - Stars/Lights) - Cozy Brass Spotlight Design
    const floorLampGroup = new THREE.Group();
    floorLampGroup.position.set(2.0, 0, 2.0); // repositioned to front corner

    const brassMat = new THREE.MeshToonMaterial({ color: 0xd4af37, roughness: 0.3 }); // gold/brass metal

    const lampBasePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 12), brassMat);
    lampBasePlate.position.y = 0.02;
    floorLampGroup.add(lampBasePlate);

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), brassMat);
    lampPole.position.y = 1.7;
    lampPole.castShadow = true;
    floorLampGroup.add(lampPole);

    const glassGlobeMat = new THREE.MeshToonMaterial({ color: 0xffeedd, transparent: true, opacity: 0.8, roughness: 0.1 });

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const armGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.75, 8);
      armGeo.rotateX(Math.PI / 4);
      const arm = new THREE.Mesh(armGeo, brassMat);
      arm.position.set(Math.cos(angle) * 0.25, 3.3, Math.sin(angle) * 0.25);
      arm.rotation.y = -angle;
      floorLampGroup.add(arm);

      // Glass globe head instead of cheap primary colored spheres
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), glassGlobeMat);
      head.position.set(Math.cos(angle) * 0.5, 3.5, Math.sin(angle) * 0.5);
      floorLampGroup.add(head);

      // Small brass base ring for the globe
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8), brassMat);
      ring.position.set(Math.cos(angle) * 0.46, 3.38, Math.sin(angle) * 0.46);
      ring.rotation.x = Math.PI / 4;
      ring.rotation.y = -angle;
      floorLampGroup.add(ring);

      // Cozy sunset pointlight
      const pLight = new THREE.PointLight(0xffb07c, 0.65, 4.5);
      pLight.position.set(Math.cos(angle) * 0.5, 3.5, Math.sin(angle) * 0.5);
      floorLampGroup.add(pLight);
    }

    floorLampGroup.traverse(child => {
      child.userData = { hotspotId: 8 }; 
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(floorLampGroup);

    // [REMOVED] Nostalgic green secretary desk removed per user request

    // 10. DETAYLI MUTFAK & EVYE & RAFLAR (Hotspot 3)
    const kitchenGroup = new THREE.Group();
    kitchenGroup.position.set(-4.8, 0, 3.9);

    const kCabinets = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.0, 1.0), blueCabinetMat);
    kCabinets.position.y = 0.5;
    kCabinets.castShadow = true;
    kCabinets.receiveShadow = true;
    kitchenGroup.add(kCabinets);

    const kCounterTop = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.06, 1.04), woodMat);
    kCounterTop.position.y = 1.03;
    kitchenGroup.add(kCounterTop);

    // White farmhouse sink (large white ceramic box)
    const kSink = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.75), farmhouseSinkMat);
    kSink.position.set(-0.5, 0.8, 0.1); 
    kSink.castShadow = true;
    kitchenGroup.add(kSink);

    const kSinkHollow = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.02, 0.65), new THREE.MeshToonMaterial({ color: 0x94a3b8 }));
    kSinkHollow.position.set(-0.5, 1.01, 0.1);
    kitchenGroup.add(kSinkHollow);

    // Faucet
    const kFaucet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), silverMat);
    kFaucet.position.set(-0.5, 1.2, -0.2);
    kitchenGroup.add(kFaucet);

    const kFaucetSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), silverMat);
    kFaucetSpout.rotation.x = Math.PI / 2;
    kFaucetSpout.position.set(-0.5, 1.38, -0.09);
    kitchenGroup.add(kFaucetSpout);

    // Coffee Maker
    const kCoffeeMaker = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), blackMat);
    kCoffeeMaker.position.set(0.8, 1.25, -0.2);
    kCoffeeMaker.castShadow = true;
    kitchenGroup.add(kCoffeeMaker);

    const kCoffeePot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 8), windowBlueMat);
    kCoffeePot.position.set(0.8, 1.15, -0.06);
    kitchenGroup.add(kCoffeePot);

    // [NEW] Retro Toaster on Counter
    const toasterGroup = new THREE.Group();
    toasterGroup.position.set(0.1, 1.06, 0.15); // on the kitchen counter top
    
    const toasterBodyMat = new THREE.MeshToonMaterial({ color: 0xd97706 }); // retro orange toaster
    const toasterBody = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.22), toasterBodyMat);
    toasterBody.castShadow = true;
    toasterGroup.add(toasterBody);
    
    const toasterTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.18), silverMat);
    toasterTop.position.y = 0.12;
    toasterGroup.add(toasterTop);
    
    const breadMat = new THREE.MeshToonMaterial({ color: 0xd97706, roughness: 1.0 }); // brown crust / toast
    const breadSlice = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), breadMat);
    breadSlice.position.set(-0.04, 0.18, 0);
    toasterGroup.add(breadSlice);
    
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.05), blackMat);
    lever.position.set(0.17, 0.05, 0);
    toasterGroup.add(lever);
    
    toasterGroup.traverse(child => {
      child.userData = { hotspotId: 3 };
      this.interactiveObjects.push(child);
    });
    kitchenGroup.add(toasterGroup);
    
    // [NEW] Coffee Mug on Counter
    const kMug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), new THREE.MeshToonMaterial({ color: 0x14b8a6 })); // teal mug
    kMug.position.set(0.45, 1.125, 0.1);
    kMug.castShadow = true;
    kMug.userData = { hotspotId: 3 };
    this.interactiveObjects.push(kMug);
    kitchenGroup.add(kMug);

    // Ivy shelf on kitchen wall
    const kShelfGroup = new THREE.Group();
    kShelfGroup.position.set(-6.0, 2.1, 4.41);
    const kShelf1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.35), woodMat);
    kShelf1.castShadow = true;
    kShelfGroup.add(kShelf1);

    const decColors = [0xec4899, 0xfacc15, 0x22c55e];
    for (let i = 0; i < 3; i++) {
      const dPot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8), new THREE.MeshToonMaterial({ color: decColors[i] }));
      dPot.position.set(-0.6 + i * 0.6, 0.12, 0);
      kShelfGroup.add(dPot);
      
      if (i === 1) {
        const ivyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), leafMat);
        ivyMesh.position.set(-0.6 + i * 0.6, 0.22, 0);
        kShelfGroup.add(ivyMesh);
        const ivyDrape = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.08), leafMat);
        ivyDrape.position.set(-0.6 + i * 0.6, -0.1, 0.08);
        kShelfGroup.add(ivyDrape);
      }
    }

    // [NEW] Hanging Mugs under the shelf
    const mugColors = [0xec4899, 0xeab308, 0x3b82f6]; // pink, yellow, blue
    for (let i = 0; i < 3; i++) {
      const mugGroup = new THREE.Group();
      mugGroup.position.set(-0.6 + i * 0.6, -0.15, 0.05); // hanging below the shelf
      
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), silverMat);
      hook.position.y = 0.08;
      mugGroup.add(hook);
      
      const hMug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), new THREE.MeshToonMaterial({ color: mugColors[i] }));
      hMug.castShadow = true;
      mugGroup.add(hMug);
      
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.04), new THREE.MeshToonMaterial({ color: mugColors[i] }));
      handle.position.set(0.08, 0, 0);
      mugGroup.add(handle);
      
      mugGroup.traverse(child => {
        child.userData = { hotspotId: 3 };
        this.interactiveObjects.push(child);
      });
      kShelfGroup.add(mugGroup);
    }
    this.interiorGroup.add(kShelfGroup);

    kitchenGroup.traverse(child => {
      child.userData = { hotspotId: 3 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(kitchenGroup);

    // [REMOVED] Kitchen Island and stools removed per user request

    // 11. RETRO BUZDOLABI & MAGNETLER (Hotspot 3)
    const fridgeGroup = new THREE.Group();
    fridgeGroup.position.set(-2.7, 0, 3.85);
    
    const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.2), silverMat);
    fridgeBody.position.y = 1.6;
    fridgeBody.castShadow = true;
    fridgeBody.receiveShadow = true;
    fridgeGroup.add(fridgeBody);

    const fDoorLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.16, 0.02), blackMat);
    fDoorLine.position.set(0.61, 1.6, 0);
    fridgeGroup.add(fDoorLine);

    const fHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.04), blackMat);
    fHandleL.position.set(0.63, 1.7, -0.1);
    const fHandleR = fHandleL.clone();
    fHandleR.position.set(0.63, 1.7, 0.1);
    fridgeGroup.add(fHandleL);
    fridgeGroup.add(fHandleR);

    // Fridge magnets
    const magnetColors = [0xef4444, 0xeab308, 0x3b82f6, 0x10b981];
    for (let i = 0; i < 5; i++) {
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.15), new THREE.MeshToonMaterial({ color: magnetColors[i % magnetColors.length] }));
      mag.position.set(0.61, 2.1 - i * 0.25, -0.18 + (i % 2) * 0.12);
      fridgeGroup.add(mag);
    }

    fridgeGroup.traverse(child => {
      child.userData = { hotspotId: 3 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(fridgeGroup);

    // 12. DÖKÜM SOBA VE ODUNLUK (Hotspot 4 - Stove)
    const stoveGroup = new THREE.Group();
    stoveGroup.position.set(-5.4, 0, -2.8);

    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), bodyGreyMat);
    basePlate.position.y = 0.02;
    stoveGroup.add(basePlate);

    const stoveBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.1, 10), new THREE.MeshToonMaterial({ color: 0x1e293b, roughness: 0.9 }));
    stoveBody.position.y = 0.57;
    stoveBody.castShadow = true;
    stoveGroup.add(stoveBody);

    const pipeInt = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8), bodyGreyMat);
    pipeInt.position.set(0.0, 2.47, 0.0);
    pipeInt.castShadow = true;
    stoveGroup.add(pipeInt);

    this.stoveLight = new THREE.PointLight(0xf97316, 0.8, 4);
    this.stoveLight.position.set(0.06, 0.57, 0.25);
    stoveGroup.add(this.stoveLight);

    const stoveFlameGeo = new THREE.SphereGeometry(0.15, 6, 6);
    const stoveFlameMesh = new THREE.Mesh(stoveFlameGeo, new THREE.MeshBasicMaterial({ color: 0xffa500 }));
    stoveFlameMesh.position.set(0.12, 0.57, 0.25);
    stoveGroup.add(stoveFlameMesh);

    // Metal Log Rack
    const rackFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), new THREE.MeshToonMaterial({ color: 0x334155, roughness: 0.9 }));
    rackFrame.position.set(0.85, 0.2, 0);
    stoveGroup.add(rackFrame);

    const woodLogGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6);
    woodLogGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(woodLogGeo, woodMat);
      log.position.set(0.8 + i * 0.09, 0.25, -0.09 + i * 0.09);
      stoveGroup.add(log);
    }

    stoveGroup.traverse(child => {
      child.userData = { hotspotId: 4 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(stoveGroup);

    // 13. UYKUCU KEDİ (Hotspot 10 - Cat)
    const catGroup = new THREE.Group();
    // [NEW] Mia scaled up by 1.6 and positioned directly on the bed
    catGroup.position.set(0.2, 0.625, -0.5);
    catGroup.scale.set(1.6, 1.6, 1.6);

    const catBrownMat = new THREE.MeshToonMaterial({ color: 0xb45309, roughness: 0.85 }); // Medium warm brown / ginger
    const catLightBrownMat = new THREE.MeshToonMaterial({ color: 0xd97706, roughness: 0.8 }); // Vibrant light ginger
    const catMuzzleMat = new THREE.MeshToonMaterial({ color: 0xfef3c7, roughness: 0.8 }); // Cream muzzle & white socks!
    const catEyeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 }); // Bright emerald green eyes
    const catNoseMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 }); // Pink nose

    // Body
    const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.22), catBrownMat);
    catBody.position.set(0, 0.12, 0);
    catBody.castShadow = true;
    catBody.receiveShadow = true;
    catGroup.add(catBody);
    this.catBody = catBody;

    // Head Group (for easy rotation/tilting)
    const headGroup = new THREE.Group();
    headGroup.position.set(0.18, 0.22, 0);

    const catHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), catBrownMat);
    catHead.castShadow = true;
    headGroup.add(catHead);

    const leftEar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), catLightBrownMat);
    leftEar.position.set(0, 0.11, 0.06);
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), catLightBrownMat);
    rightEar.position.set(0, 0.11, -0.06);
    headGroup.add(rightEar);

    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), catEyeMat);
    leftEye.position.set(0.09, 0.02, 0.05);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), catEyeMat);
    rightEye.position.set(0.09, 0.02, -0.05);
    headGroup.add(rightEye);

    const catMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), catMuzzleMat);
    catMuzzle.position.set(0.09, -0.04, 0);
    headGroup.add(catMuzzle);

    const catNose = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), catNoseMat);
    catNose.position.set(0.11, -0.02, 0);
    headGroup.add(catNose);

    catGroup.add(headGroup);
    this.catHead = headGroup;

    // Lying Paws (with light socks!)
    const pGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const pawFL = new THREE.Mesh(pGeo, catMuzzleMat);
    pawFL.position.set(0.16, 0.025, 0.07);
    const pawFR = new THREE.Mesh(pGeo, catMuzzleMat);
    pawFR.position.set(0.16, 0.025, -0.07);
    const pawBL = new THREE.Mesh(pGeo, catLightBrownMat);
    pawBL.position.set(-0.14, 0.025, 0.07);
    const pawBR = new THREE.Mesh(pGeo, catLightBrownMat);
    pawBR.position.set(-0.14, 0.025, -0.07);
    catGroup.add(pawFL, pawFR, pawBL, pawBR);

    // Eklemli Kuyruk (Wagging tail)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(-0.18, 0.14, 0);
    const tailMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), catLightBrownMat);
    tailMesh.position.set(-0.11, 0, 0);
    tailMesh.castShadow = true;
    tailGroup.add(tailMesh);
    catGroup.add(tailGroup);
    this.catTail = tailGroup;

    catGroup.traverse(child => {
      child.userData = { hotspotId: 10 };
      this.interactiveObjects.push(child);
    });
    // Add Mia directly to the bedGroup so that she lies on the bed and moves with it
    bedGroup.add(catGroup);

    // [NEW] Add a soft glowing spotlight above Mia to make her highly visible in the interior
    const catPointLight = new THREE.PointLight(0xffedd5, 0.6, 2.0); // soft warm yellow light
    catPointLight.position.set(0.2, 1.25, -0.5); // centered above Mia
    catPointLight.castShadow = true;
    catPointLight.shadow.bias = -0.002;
    catPointLight.visible = this.isInterior; // only active in interior mode
    bedGroup.add(catPointLight);
    this.catPointLight = catPointLight;

    // [NEW] Add a speech bubble sprite above Mia's head in 3D (styled as a beautiful thought cloud)
    const bubbleCanvas = document.createElement('canvas');
    bubbleCanvas.width = 256;
    bubbleCanvas.height = 128;
    const ctx = bubbleCanvas.getContext('2d');

    // Enable soft glowing shadow for the cloud
    ctx.shadowColor = 'rgba(219, 39, 119, 0.35)'; // Cozy warm pink glow
    ctx.shadowBlur = 8;

    // Draw speech bubble cloud (overlapping circles for a fluffy cloud look!)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = '#db2777'; // Cozy deep pink border
    ctx.lineWidth = 4;
    
    ctx.beginPath();
    // Left lobe
    ctx.arc(60, 55, 25, 0, Math.PI * 2);
    // Top-left lobe
    ctx.arc(90, 35, 30, 0, Math.PI * 2);
    // Top-right lobe
    ctx.arc(135, 30, 32, 0, Math.PI * 2);
    // Right lobe
    ctx.arc(175, 35, 30, 0, Math.PI * 2);
    // Far-right lobe
    ctx.arc(200, 55, 25, 0, Math.PI * 2);
    // Bottom-right lobe
    ctx.arc(170, 75, 26, 0, Math.PI * 2);
    // Bottom lobe
    ctx.arc(130, 80, 28, 0, Math.PI * 2);
    // Bottom-left lobe
    ctx.arc(90, 75, 26, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Disable shadow to ensure clean text and floating thought circles
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Small thought circles pointing down to Mia (thought cloud tail)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.strokeStyle = '#db2777';
    ctx.lineWidth = 3;

    // Thought Circle 1 (closest to cloud)
    ctx.beginPath();
    ctx.arc(120, 100, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thought Circle 2 (middle)
    ctx.beginPath();
    ctx.arc(110, 113, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thought Circle 3 (closest to Mia's head)
    ctx.beginPath();
    ctx.arc(103, 122, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw text inside bubble
    ctx.fillStyle = '#0f172a'; // Dark slate for readable text
    ctx.font = 'bold 18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Beni sever misin? 🐾', 128, 55);

    const bubbleTexture = new THREE.CanvasTexture(bubbleCanvas);
    const bubbleMat = new THREE.SpriteMaterial({ map: bubbleTexture, transparent: true });
    const bubbleSprite = new THREE.Sprite(bubbleMat);
    bubbleSprite.position.set(0.2, 1.48, -0.5); // relative to bedGroup (raised slightly to account for thought circles)
    bubbleSprite.scale.set(1.4, 0.7, 1);
    bubbleSprite.visible = this.isInterior;
    this.catBubbleSprite = bubbleSprite;
    
    // Make bubble interactive to open cat modal
    bubbleSprite.userData = { hotspotId: 10 };
    this.interactiveObjects.push(bubbleSprite);
    
    bedGroup.add(bubbleSprite);

    // 14. SÜRÜCÜ KABİNİ / COCKPIT (Hotspot 1)
    const cockpitGroup = new THREE.Group();
    cockpitGroup.position.set(4.8, 0, 0);

    const dashPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.95, 8.8), bodyGreyMat);
    dashPanel.position.set(0.8, 0.475, 0);
    dashPanel.castShadow = true;
    cockpitGroup.add(dashPanel);

    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), new THREE.MeshToonMaterial({ color: 0x1e3a8a }));
    driverSeat.position.set(-0.4, 0.5, 2.0);
    driverSeat.castShadow = true;
    cockpitGroup.add(driverSeat);

    const driverHeadrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.16), new THREE.MeshToonMaterial({ color: 0x172554 }));
    driverHeadrest.position.set(-0.4, 1.1, 2.0);
    cockpitGroup.add(driverHeadrest);

    const passengerSeat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), new THREE.MeshToonMaterial({ color: 0x1e3a8a }));
    passengerSeat.position.set(-0.4, 0.5, -2.0);
    passengerSeat.castShadow = true;
    cockpitGroup.add(passengerSeat);

    const passengerHeadrest = driverHeadrest.clone();
    passengerHeadrest.position.set(-0.4, 1.1, -2.0);
    cockpitGroup.add(passengerHeadrest);

    const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 6, 16), blackMat);
    steeringWheel.position.set(0.2, 1.1, 2.0);
    steeringWheel.rotation.y = Math.PI / 2;
    steeringWheel.rotation.x = -Math.PI / 6;
    cockpitGroup.add(steeringWheel);

    const gpsScreen = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.42), new THREE.MeshBasicMaterial({ color: 0x00f2fe }));
    gpsScreen.position.set(0.41, 1.1, 0);
    gpsScreen.castShadow = true;
    cockpitGroup.add(gpsScreen);

    cockpitGroup.traverse(child => {
      child.userData = { hotspotId: 17 };
      this.interactiveObjects.push(child);
    });
    this.interiorGroup.add(cockpitGroup);
    
    // Tablo: Dostluk Tablosu (Birleştirilmiş Tek Büyük Tablo)
    const friendshipFrame = new THREE.Group();
    friendshipFrame.position.set(-6.35, 2.1, 0.5); // ortalanmış pozisyon
    friendshipFrame.rotation.y = Math.PI / 2;
    friendshipFrame.scale.set(1.3, 1.3, 1.3);
    
    const fOuter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.06), woodMat);
    fOuter.castShadow = true;
    friendshipFrame.add(fOuter);
    
    const canvas = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.92, 0.02), blackMat);
    canvas.position.z = 0.025;
    friendshipFrame.add(canvas);
    
    const pCols = 18;
    const pRows = 12;
    const pPixelW = 1.72 / pCols;
    const pPixelH = 0.92 / pRows;
    const pPixelD = 0.02;
    
    const getFriendshipPixelColor = (r, c) => {
      // Arka plan: Gökyüzü (mavi) ve çimenler (yeşil)
      let bg = 0x7dd3fc; // Gökyüzü mavisi
      if (r >= 10) bg = 0x22c55e; // Yeşil çimen
      
      // Sağ üst köşede güneş
      if (r >= 1 && r <= 3 && c >= 14 && c <= 16) return 0xfde047; // Sarı güneş
      
      // Arkadaş 1 (En sol: Kahverengi saç, mavi tişört, koyu pantolon)
      if (c >= 4 && c <= 5) {
        if (r >= 4 && r <= 5) return 0x78350f; // Saç
        if (r >= 6 && r <= 7) return 0xfdba74; // Cilt tonu
        if (r >= 8 && r <= 9) return 0x2563eb; // Mavi tişört
        if (r === 10) return 0x1e293b; // Pantolon
      }
      
      // Arkadaş 2 (Orta Sol - Dilara: Turuncu/kızıl saç, pembe tişört, kot pantolon)
      if (c >= 7 && c <= 8) {
        if (r >= 3 && r <= 5) return 0xea580c; // Kızıl saç
        if (r >= 6 && r <= 7) return 0xffedd5; // Cilt tonu
        if (r >= 8 && r <= 9) return 0xec4899; // Pembe tişört
        if (r === 10) return 0x0284c7; // Kot
      }
      
      // Arkadaş 3 (Orta Sağ: Sarı saç, yeşil tişört, gri pantolon)
      if (c >= 10 && c <= 11) {
        if (r >= 4 && r <= 5) return 0xeab308; // Sarı saç
        if (r >= 6 && r <= 7) return 0xfdba74; // Cilt tonu
        if (r >= 8 && r <= 9) return 0x10b981; // Yeşil tişört
        if (r === 10) return 0x334155; // Pantolon
      }
      
      // Arkadaş 4 (En sağ: Siyah saç, mor tişört, lacivert pantolon)
      if (c >= 13 && c <= 14) {
        if (r >= 4 && r <= 5) return 0x1e1b4b; // Siyah saç
        if (r >= 6 && r <= 7) return 0xfdba74; // Cilt tonu
        if (r >= 8 && r <= 9) return 0x8b5cf6; // Mor tişört
        if (r === 10) return 0x475569; // Pantolon
      }
      
      return bg;
    };
    
    for (let r = 0; r < pRows; r++) {
      for (let c = 0; c < pCols; c++) {
        const col = getFriendshipPixelColor(r, c);
        const pMesh = new THREE.Mesh(new THREE.BoxGeometry(pPixelW - 0.005, pPixelH - 0.005, pPixelD), new THREE.MeshToonMaterial({ color: col, roughness: 0.8 }));
        pMesh.position.set(-0.86 + (c + 0.5) * pPixelW, 0.46 - (r + 0.5) * pPixelH, 0.03);
        friendshipFrame.add(pMesh);
      }
    }
    
    friendshipFrame.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 11 };
        this.interactiveObjects.push(child);
      }
    });
    this.interiorGroup.add(friendshipFrame);

    // [CRITICAL FIX] Add the entire camper group to the scene so that it is visible!
    this.scene.add(this.camperGroup);
  }

  buildBackyardCinema() {
    // Materials
    const woodMat = new THREE.MeshToonMaterial({ color: 0x451a03, roughness: 0.85 }); // Table wood
    const poleMat = new THREE.MeshToonMaterial({ color: 0x1e293b, roughness: 0.8 }); // Screen poles (dark grey)
    const darkWoodMat = new THREE.MeshToonMaterial({ color: 0x27272a, roughness: 0.9 }); // Dark posts
    const leafCinemaMat = new THREE.MeshToonMaterial({ color: 0x14532d, roughness: 0.8 }); // Big tree foliage
    this.leafCinemaMat = leafCinemaMat;
    const trunkMat = new THREE.MeshToonMaterial({ color: 0x3f1f0b, roughness: 0.85 }); // Big tree trunk
    const hammockMat = new THREE.MeshToonMaterial({ color: 0xf4f1ea, roughness: 0.7 }); // Beige cotton hammock
    const ropeMat = new THREE.MeshToonMaterial({ color: 0xa16207, roughness: 0.9 }); // Rope
    const fabricMat = new THREE.MeshToonMaterial({ color: 0xe2e8f0, roughness: 0.75 }); // Armchair cushion
    const pillowPinkMat = new THREE.MeshToonMaterial({ color: 0xfbcfe8, roughness: 0.6 }); // Cushion pink
    const pillowTealMat = new THREE.MeshToonMaterial({ color: 0x99f6e4, roughness: 0.6 }); // Cushion teal
    const blanketMat = new THREE.MeshToonMaterial({ color: 0xe11d48, roughness: 0.8 }); // Blanket red-orange
    const potMat = new THREE.MeshToonMaterial({ color: 0xc2410c, roughness: 0.85 }); // Terracotta pot
    const soilMat = new THREE.MeshToonMaterial({ color: 0x451a03, roughness: 0.95 }); // Soil
    const stemMat = new THREE.MeshToonMaterial({ color: 0x166534, roughness: 0.8 }); // Stems
    const blackMetalMat = new THREE.MeshToonMaterial({ color: 0x1e293b, roughness: 0.7 }); // Lantern frame

    // 1. Two Large Trees
    const createLargeTree = (x, z) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(x, 0, z);

      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 4.2, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 2.1;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      treeGroup.add(trunk);

      const folPos = [
        [0, 4.4, 0, 1.7],
        [-0.9, 4.8, 0.6, 1.4],
        [0.9, 4.7, -0.6, 1.4],
        [0.6, 5.0, 0.8, 1.2],
        [-0.6, 5.2, -0.8, 1.3],
        [0, 5.7, 0, 1.1]
      ];
      folPos.forEach(p => {
        const sphereGeo = new THREE.SphereGeometry(p[3], 12, 12);
        const leafMesh = new THREE.Mesh(sphereGeo, leafCinemaMat);
        leafMesh.position.set(p[0], p[1], p[2]);
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;
        treeGroup.add(leafMesh);
      });


      this.scene.add(treeGroup);
    };

    createLargeTree(-13.5, 8.0);
    createLargeTree(-13.5, 14.5);

    // 2. Hammock
    const hammockGroup = new THREE.Group();
    const numSegments = 9;
    const startZ = 9.2;
    const endZ = 13.3;
    const midZ = (startZ + endZ) / 2;
    const zRange = endZ - startZ;

    for (let i = 0; i < numSegments; i++) {
      const segZ = startZ + (i / (numSegments - 1)) * zRange;
      const t = (segZ - midZ) / (zRange / 2);
      const segY = 1.0 + 0.5 * t * t;

      const segGeo = new THREE.BoxGeometry(1.2, 0.04, zRange / numSegments);
      const segMesh = new THREE.Mesh(segGeo, hammockMat);
      segMesh.position.set(-13.4, segY, segZ);
      segMesh.rotation.x = Math.atan(t * 0.5) * 0.7;
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      hammockGroup.add(segMesh);
    }

    const ropeGeoA = new THREE.BoxGeometry(0.04, 0.04, 1.25);
    const ropeA = new THREE.Mesh(ropeGeoA, ropeMat);
    ropeA.position.set(-13.5, 1.6, 8.6);
    ropeA.rotation.x = -Math.atan(0.2 / 1.2);
    hammockGroup.add(ropeA);

    const ropeGeoB = new THREE.BoxGeometry(0.04, 0.04, 1.25);
    const ropeB = new THREE.Mesh(ropeGeoB, ropeMat);
    ropeB.position.set(-13.5, 1.6, 13.9);
    ropeB.rotation.x = Math.atan(0.2 / 1.2);
    hammockGroup.add(ropeB);

    hammockGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 14 };
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(hammockGroup);

    // 3. Projeksiyon Perdesi (Projection Screen)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(-4.5, 0, 15.5);

    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8, 8), poleMat);
    poleL.position.set(-2.0, 1.9, 0);
    poleL.castShadow = true;
    screenGroup.add(poleL);

    const poleR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.8, 8), poleMat);
    poleR.position.set(2.0, 1.9, 0);
    poleR.castShadow = true;
    screenGroup.add(poleR);

    const crossbarTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), poleMat);
    crossbarTop.position.set(0, 3.6, 0);
    screenGroup.add(crossbarTop);

    const crossbarBottom = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), poleMat);
    crossbarBottom.position.set(0, 1.2, 0);
    screenGroup.add(crossbarBottom);

    const screenBacking = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.36, 0.04), darkWoodMat);
    screenBacking.position.set(0, 2.4, -0.02);
    screenBacking.castShadow = true;
    screenGroup.add(screenBacking);

    this.movieCanvas = document.createElement('canvas');
    this.movieCanvas.width = 512;
    this.movieCanvas.height = 320;
    this.movieCanvasCtx = this.movieCanvas.getContext('2d');

    this.movieTexture = new THREE.CanvasTexture(this.movieCanvas);

    const screenPlaneGeo = new THREE.PlaneGeometry(3.8, 2.26);
    const screenPlaneMat = new THREE.MeshBasicMaterial({
      map: this.movieTexture,
      side: THREE.DoubleSide
    });
    const screenPlane = new THREE.Mesh(screenPlaneGeo, screenPlaneMat);
    screenPlane.position.set(0, 2.4, 0.01);
    screenGroup.add(screenPlane);

    screenGroup.traverse(child => {
      if (child.isMesh) {
        child.userData = { hotspotId: 15 };
        this.interactiveObjects.push(child);
      }
    });
    this.scene.add(screenGroup);

    this.screenReflectionLight = new THREE.PointLight(0x99f6e4, 0.7, 7.0);
    this.screenReflectionLight.position.set(-4.5, 2.0, 14.5);
    this.scene.add(this.screenReflectionLight);
    this.cinemaPointLights.push(this.screenReflectionLight);

    this.updateMovieScreen();

    // 4. Piknik Masası ve Yiyecekler (Picnic Table)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-4.5, 0, 11.0);

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.0), woodMat);
    tableTop.position.set(0, 0.85, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    const bench1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.35), woodMat);
    bench1.position.set(0, 0.5, 0.65);
    bench1.castShadow = true;
    bench1.receiveShadow = true;
    tableGroup.add(bench1);

    const bench2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.35), woodMat);
    bench2.position.set(0, 0.5, -0.65);
    bench2.castShadow = true;
    bench2.receiveShadow = true;
    tableGroup.add(bench2);

    const legGeo = new THREE.BoxGeometry(0.08, 0.95, 0.08);
    const legPositions = [
      [-1.0, 0.42, 0.35, -Math.PI / 8],
      [-1.0, 0.42, -0.35, Math.PI / 8],
      [1.0, 0.42, 0.35, -Math.PI / 8],
      [1.0, 0.42, -0.35, Math.PI / 8]
    ];
    legPositions.forEach(p => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(p[0], p[1], p[2]);
      leg.rotation.z = p[3];
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    const supportA = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.6), woodMat);
    supportA.position.set(-1.0, 0.5, 0);
    tableGroup.add(supportA);

    const supportB = supportA.clone();
    supportB.position.x = 1.0;
    tableGroup.add(supportB);

    const plateGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.02, 10);
    const plateMat = new THREE.MeshToonMaterial({ color: 0xf1f5f9 });

    const plate1 = new THREE.Mesh(plateGeo, plateMat);
    plate1.position.set(-0.6, 0.9, 0.1);
    tableGroup.add(plate1);

    const plate2 = new THREE.Mesh(plateGeo, plateMat);
    plate2.position.set(0.6, 0.9, -0.1);
    tableGroup.add(plate2);

    const wmGroup = new THREE.Group();
    wmGroup.position.set(-0.6, 0.92, 0.1);
    wmGroup.rotation.y = 0.5;

    const wmGreen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), new THREE.MeshToonMaterial({ color: 0x166534 }));
    wmGreen.position.y = 0.03;
    wmGroup.add(wmGreen);

    const wmRed = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.04), new THREE.MeshToonMaterial({ color: 0xef4444 }));
    wmRed.position.set(0, 0.1, 0);
    wmGroup.add(wmRed);

    const wmSeeds = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.05), new THREE.MeshToonMaterial({ color: 0x000000 }));
    wmSeeds.position.set(-0.04, 0.08, 0);
    wmGroup.add(wmSeeds);

    tableGroup.add(wmGroup);

    const grapeGroup = new THREE.Group();
    grapeGroup.position.set(0.6, 0.91, -0.1);
    const grapeMat = new THREE.MeshToonMaterial({ color: 0x6b21a8 });
    const grapeGeo = new THREE.SphereGeometry(0.04, 5, 5);
    const grapePositions = [
      [0, 0, 0], [0.06, 0, 0], [-0.06, 0, 0],
      [0.03, 0, 0.05], [-0.03, 0, 0.05],
      [0.03, 0, -0.05], [-0.03, 0, -0.05],
      [0.02, 0.04, 0.02], [-0.02, 0.04, 0.02],
      [0, 0.06, 0]
    ];
    grapePositions.forEach(p => {
      const grape = new THREE.Mesh(grapeGeo, grapeMat);
      grape.position.set(p[0], p[1], p[2]);
      grapeGroup.add(grape);
    });
    tableGroup.add(grapeGroup);

    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshToonMaterial({ color: 0xdc2626 }));
    apple.position.set(0, 0.96, -0.15);
    tableGroup.add(apple);

    const buildMug = (x, z, color) => {
      const mug = new THREE.Group();
      mug.position.set(x, 0.89, z);

      const mugBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), new THREE.MeshToonMaterial({ color: color }));
      mugBody.position.y = 0.07;
      mugBody.castShadow = true;
      mug.add(mugBody);

      const handleGeo = new THREE.BoxGeometry(0.02, 0.08, 0.06);
      const handle = new THREE.Mesh(handleGeo, new THREE.MeshToonMaterial({ color: color }));
      handle.position.set(0.07, 0.07, 0);
      mug.add(handle);

      return mug;
    };

    const mug1 = buildMug(-0.2, 0.25, 0x0f766e);
    const mug2 = buildMug(0.2, -0.25, 0xbe185d);
    tableGroup.add(mug1);
    tableGroup.add(mug2);

    const lanternTable = new THREE.Group();
    lanternTable.position.set(-0.9, 0.89, -0.2);

    const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 8), blackMetalMat);
    lBase.position.y = 0.015;
    lanternTable.add(lBase);

    const lGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.8 }));
    lGlass.position.y = 0.1;
    lanternTable.add(lGlass);

    const lCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.04, 8), blackMetalMat);
    lCap.position.y = 0.19;
    lanternTable.add(lCap);

    const lHandle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.14), blackMetalMat);
    lHandle.position.set(0, 0.24, 0);
    lanternTable.add(lHandle);

    const lanternTableLight = new THREE.PointLight(0xfef08a, 0.6, 4.0);
    lanternTableLight.position.set(0, 0.1, 0);
    lanternTable.add(lanternTableLight);
    this.cinemaPointLights.push(lanternTableLight);


    this.scene.add(tableGroup);

    // 5. Konforlu Bahçe Koltuğu (Comfortable Armchair)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(-7.5, 0, 11.0);
    chairGroup.rotation.y = 0.3;

    const cBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.95), fabricMat);
    cBase.position.y = 0.175;
    cBase.castShadow = true;
    cBase.receiveShadow = true;
    chairGroup.add(cBase);

    const cBack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.75, 0.22), fabricMat);
    cBack.position.set(0, 0.55, 0.42);
    cBack.castShadow = true;
    chairGroup.add(cBack);

    const cArmL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.95), fabricMat);
    cArmL.position.set(-0.5, 0.24, 0);
    cArmL.castShadow = true;
    chairGroup.add(cArmL);

    const cArmR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.95), fabricMat);
    cArmR.position.set(0.5, 0.24, 0);
    cArmR.castShadow = true;
    chairGroup.add(cArmR);

    const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.16), pillowPinkMat);
    pillow1.position.set(-0.16, 0.45, 0.26);
    pillow1.rotation.set(0.2, 0.3, -0.4);
    pillow1.castShadow = true;
    chairGroup.add(pillow1);

    const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.16), pillowTealMat);
    pillow2.position.set(0.18, 0.42, 0.28);
    pillow2.rotation.set(0.15, -0.3, 0.25);
    pillow2.castShadow = true;
    chairGroup.add(pillow2);

    const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.65), blanketMat);
    blanket.position.set(-0.51, 0.28, -0.1);
    blanket.rotation.x = 0.08;
    blanket.castShadow = true;
    chairGroup.add(blanket);


    this.scene.add(chairGroup);

    // 6. Hanging String Lights & Lanterns
    const ledSphereGeo = new THREE.SphereGeometry(0.06, 6, 6);

    const numStringALEDs = 10;
    const sAZStart = 8.0;
    const sAZEnd = 14.5;
    for (let i = 0; i < numStringALEDs; i++) {
      const frac = i / (numStringALEDs - 1);
      const ledZ = sAZStart + frac * (sAZEnd - sAZStart);
      const t = frac * 2 - 1;
      const ledY = 2.7 - 0.7 * (1.0 - t * t);

      const ledMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const led = new THREE.Mesh(ledSphereGeo, ledMat);
      led.position.set(-13.4, ledY, ledZ);
      this.scene.add(led);
      this.gazeboLEDs.push(led);
      this.cinemaStringLEDs.push(led);
    }

    const numStringBLEDs = 8;
    for (let i = 0; i < numStringBLEDs; i++) {
      const frac = i / (numStringBLEDs - 1);
      const ledX = -13.5 + frac * 7.0;
      const ledZ = 14.5 + frac * 1.0;
      const t = frac * 2 - 1;
      const ledY = (2.6 * (1.0 - frac) + 3.2 * frac) - 0.4 * (1.0 - t * t);

      const ledMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const led = new THREE.Mesh(ledSphereGeo, ledMat);
      led.position.set(ledX, ledY, ledZ);
      this.scene.add(led);
      this.gazeboLEDs.push(led);
      this.cinemaStringLEDs.push(led);
    }

    const hangingLantern = new THREE.Group();
    hangingLantern.position.set(-12.8, 2.5, 13.5);

    const hChain = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.35, 0.015), blackMetalMat);
    hChain.position.y = 0.175;
    hangingLantern.add(hChain);

    const hCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.03, 8), blackMetalMat);
    hangingLantern.add(hCap);

    const hGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 }));
    hGlass.position.y = -0.075;
    hangingLantern.add(hGlass);

    const hBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.02, 8), blackMetalMat);
    hBase.position.y = -0.145;
    hangingLantern.add(hBase);

    const hangingLanternLight = new THREE.PointLight(0xfef08a, 0.65, 4.5);
    hangingLanternLight.position.set(0, -0.07, 0);
    hangingLantern.add(hangingLanternLight);
    this.cinemaPointLights.push(hangingLanternLight);


    this.scene.add(hangingLantern);

    // 7. Path Bollard Lights
    const stonePositions = [
      [-4.0, 0.03, 7.5],
      [-2.0, 0.03, 7.2],
      [0.0, 0.03, 6.7],
      [1.8, 0.03, 5.8]
    ];

    stonePositions.forEach((pos, idx) => {
      const bollard = new THREE.Group();
      bollard.position.set(pos[0], 0, pos[2] + 0.6);

      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8), blackMetalMat);
      bPost.position.y = 0.175;
      bPost.castShadow = true;
      bollard.add(bPost);

      const bGlow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      bGlow.position.y = 0.35;
      bollard.add(bGlow);

      const bLight = new THREE.PointLight(0xfef08a, 0.4, 2.5);
      bLight.position.set(0, 0.35, 0);
      bollard.add(bLight);
      this.cinemaPointLights.push(bLight);

      this.scene.add(bollard);
    });

    // 8. Potted Flowers (Saksıda Çiçekler)
    const spawnPottedFlower = (x, z) => {
      const potGroup = new THREE.Group();
      potGroup.position.set(x, 0.08, z);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.28, 8), potMat);
      pot.position.y = 0.14;
      pot.castShadow = true;
      potGroup.add(pot);

      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), soilMat);
      soil.position.y = 0.27;
      potGroup.add(soil);

      const stemLength = 0.22;
      const flowerColors = [0xef4444, 0xec4899, 0xfacc15];
      for (let i = 0; i < 3; i++) {
        const flowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, stemLength, 4), stemMat);
        const angle = (i * Math.PI * 2) / 3;
        flowerStem.position.set(Math.cos(angle) * 0.06, 0.35, Math.sin(angle) * 0.06);
        flowerStem.rotation.z = Math.cos(angle) * 0.25;
        flowerStem.rotation.x = Math.sin(angle) * 0.25;
        flowerStem.castShadow = true;
        potGroup.add(flowerStem);

        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshToonMaterial({ color: flowerColors[i] }));
        petal.position.set(
          flowerStem.position.x + Math.cos(angle) * 0.03,
          0.46,
          flowerStem.position.z + Math.sin(angle) * 0.03
        );
        petal.castShadow = true;
        potGroup.add(petal);
      }


      this.scene.add(potGroup);
    };

    spawnPottedFlower(-8.7, 12.3);
    spawnPottedFlower(-2.0, 15.0);
    spawnPottedFlower(-11.5, 9.8);
  }

  buildWeatherParticles() {
    // 1. Rain Particles
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPosArray = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPosArray[i] = (Math.random() - 0.5) * 45;
      rainPosArray[i + 1] = Math.random() * 25;
      rainPosArray[i + 2] = (Math.random() - 0.5) * 45;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPosArray, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);

    // 2. Snow Particles
    const snowCount = 1000;
    const snowGeo = new THREE.BufferGeometry();
    const snowPosArray = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount * 3; i += 3) {
      snowPosArray[i] = (Math.random() - 0.5) * 45;
      snowPosArray[i + 1] = Math.random() * 25;
      snowPosArray[i + 2] = (Math.random() - 0.5) * 45;
    }
    snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPosArray, 3));

    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.22,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    this.snowParticles = new THREE.Points(snowGeo, snowMat);
    this.snowParticles.visible = false;
    this.scene.add(this.snowParticles);

    // 3. Spring Particles (Butterflies / Pollen)
    const springCount = 150;
    const springGeo = new THREE.BufferGeometry();
    const springPosArray = new Float32Array(springCount * 3);
    const springColorsArray = new Float32Array(springCount * 3);
    
    const colorsList = [
      [1.0, 0.75, 0.85],  // Pink
      [1.0, 0.95, 0.65],  // Yellow
      [1.0, 1.0, 1.0],     // White
      [0.65, 0.95, 1.0]    // Soft Blue
    ];
    
    for (let i = 0; i < springCount * 3; i += 3) {
      springPosArray[i] = (Math.random() - 0.5) * 45;
      springPosArray[i + 1] = Math.random() * 20;
      springPosArray[i + 2] = (Math.random() - 0.5) * 45;
      
      const col = colorsList[Math.floor(Math.random() * colorsList.length)];
      springColorsArray[i] = col[0];
      springColorsArray[i + 1] = col[1];
      springColorsArray[i + 2] = col[2];
    }
    springGeo.setAttribute('position', new THREE.BufferAttribute(springPosArray, 3));
    springGeo.setAttribute('color', new THREE.BufferAttribute(springColorsArray, 3));
    
    const springMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });
    this.springParticles = new THREE.Points(springGeo, springMat);
    this.springParticles.visible = false;
    this.scene.add(this.springParticles);
  }

  buildTreeLEDs() {
    this.treeLEDsGroup = new THREE.Group();
    this.scene.add(this.treeLEDsGroup);

    const ledSphereGeo = new THREE.SphereGeometry(0.05, 5, 5);
    const ledColors = [0xef4444, 0x10b981, 0x3b82f6, 0xec4899, 0xeab308];

    const addSpiralToTree = (treeX, treeZ, trunkRadius, heightMax) => {
      const steps = 14;
      for (let i = 0; i < steps; i++) {
        const y = 0.2 + (i / steps) * heightMax;
        const angle = i * 1.3;
        const r = trunkRadius + 0.04;
        const px = treeX + r * Math.cos(angle);
        const pz = treeZ + r * Math.sin(angle);

        const color = ledColors[i % ledColors.length];
        const ledMat = new THREE.MeshBasicMaterial({ color: color });
        const led = new THREE.Mesh(ledSphereGeo, ledMat);
        led.position.set(px, y, pz);
        this.treeLEDsGroup.add(led);
        this.gazeboLEDs.push(led);
      }
    };

    addSpiralToTree(-13.5, 8.0, 0.45, 2.8);
    addSpiralToTree(-13.5, 14.5, 0.45, 2.8);
    addSpiralToTree(11.0, 12.0, 0.25, 2.0);

    // [NEW] Add canopy LEDs on the foliage spheres of the hammock-tied trees
    const addCanopyLEDs = (treeX, treeZ) => {
      const folPos = [
        [0, 4.4, 0, 1.7],
        [-0.9, 4.8, 0.6, 1.4],
        [0.9, 4.7, -0.6, 1.4],
        [0.6, 5.0, 0.8, 1.2],
        [-0.6, 5.2, -0.8, 1.3],
        [0, 5.7, 0, 1.1]
      ];
      let ledIndex = 0;
      folPos.forEach((p, sphereIdx) => {
        const cx = p[0];
        const cy = p[1];
        const cz = p[2];
        const r = p[3] + 0.05; // slightly outer diameter of foliage sphere
        const numLEDs = 3; // 3 LEDs on the surface of each sphere
        for (let i = 0; i < numLEDs; i++) {
          const theta = (i / numLEDs) * Math.PI * 2 + sphereIdx * 1.5;
          const phi = 0.3 + (i % 2) * 0.5; // upper hemisphere angles
          const px = treeX + cx + r * Math.sin(phi) * Math.cos(theta);
          const py = cy + r * Math.cos(phi);
          const pz = treeZ + cz + r * Math.sin(phi) * Math.sin(theta);

          const color = ledColors[ledIndex % ledColors.length];
          const ledMat = new THREE.MeshBasicMaterial({ color: color });
          const led = new THREE.Mesh(ledSphereGeo, ledMat);
          led.position.set(px, py, pz);
          this.treeLEDsGroup.add(led);
          this.gazeboLEDs.push(led);
          ledIndex++;
        }
      });
    };

    addCanopyLEDs(-13.5, 8.0);
    addCanopyLEDs(-13.5, 14.5);

    this.treeLEDsGroup.visible = false;
  }

  setSeason(seasonName) {
    this.season = seasonName;

    // Toggle Rain/Snow particle visibility
    if (this.rainParticles) this.rainParticles.visible = (seasonName === 'autumn');
    if (this.snowParticles) this.snowParticles.visible = (seasonName === 'winter');
    if (this.springParticles) this.springParticles.visible = (seasonName === 'spring');
    if (this.treeLEDsGroup) this.treeLEDsGroup.visible = (seasonName === 'winter');

    // Toggle Rain Synthesized Sound & Birds
    if (seasonName === 'autumn') {
      audio.startRainSound();
    } else {
      audio.stopRainSound();
    }

    if (seasonName === 'spring') {
      audio.startBirds();
    } else {
      audio.stopBirds();
    }

    // Material Color transitions
    if (seasonName === 'summer') {
      if (this.sandMaterial) this.sandMaterial.color.setHex(0x15803d);
      if (this.lawnMaterial) this.lawnMaterial.color.setHex(0x166534);
      if (this.leafMat) this.leafMat.color.setHex(0x22c55e);
      if (this.bLeavesMat) this.bLeavesMat.color.setHex(0xeab308);
      if (this.p2LeafMat) this.p2LeafMat.color.setHex(0x166534);
      if (this.darkLeafMat) this.darkLeafMat.color.setHex(0x14532d);
      if (this.palmLeafMat) this.palmLeafMat.color.setHex(0x15803d);
      if (this.leafCinemaMat) this.leafCinemaMat.color.setHex(0x14532d);
    } else if (seasonName === 'autumn') {
      if (this.sandMaterial) this.sandMaterial.color.setHex(0x7c2d12);
      if (this.lawnMaterial) this.lawnMaterial.color.setHex(0x9a3412);
      if (this.leafMat) this.leafMat.color.setHex(0xeab308);
      if (this.bLeavesMat) this.bLeavesMat.color.setHex(0xb45309);
      if (this.p2LeafMat) this.p2LeafMat.color.setHex(0x7c2d12);
      if (this.darkLeafMat) this.darkLeafMat.color.setHex(0x451a03);
      if (this.palmLeafMat) this.palmLeafMat.color.setHex(0xca8a04);
      if (this.leafCinemaMat) this.leafCinemaMat.color.setHex(0xb45309);
    } else if (seasonName === 'winter') {
      if (this.sandMaterial) this.sandMaterial.color.setHex(0xf1f5f9);
      if (this.lawnMaterial) this.lawnMaterial.color.setHex(0xf8fafc);
      if (this.leafMat) this.leafMat.color.setHex(0xffffff);
      if (this.bLeavesMat) this.bLeavesMat.color.setHex(0xe2e8f0);
      if (this.p2LeafMat) this.p2LeafMat.color.setHex(0xffffff);
      if (this.darkLeafMat) this.darkLeafMat.color.setHex(0x0f172a);
      if (this.palmLeafMat) this.palmLeafMat.color.setHex(0xe2e8f0);
      if (this.leafCinemaMat) this.leafCinemaMat.color.setHex(0xffffff);
    } else if (seasonName === 'spring') {
      if (this.sandMaterial) this.sandMaterial.color.setHex(0x15803d);
      if (this.lawnMaterial) this.lawnMaterial.color.setHex(0x22c55e);
      if (this.leafMat) this.leafMat.color.setHex(0x4ade80);
      if (this.bLeavesMat) this.bLeavesMat.color.setHex(0xa7f3d0);
      if (this.p2LeafMat) this.p2LeafMat.color.setHex(0x22c55e);
      if (this.darkLeafMat) this.darkLeafMat.color.setHex(0x15803d);
      if (this.palmLeafMat) this.palmLeafMat.color.setHex(0x4ade80);
      if (this.leafCinemaMat) this.leafCinemaMat.color.setHex(0xfbcfe8); // Pink cherry blossoms (Sakura)!
    }

    // Force update of screen texture in case day/night rendering shifts
    this.updateMovieScreen();
  }

  updateMovieScreen() {
    if (!this.movieCanvasCtx || !this.movieTexture) return;

    const ctx = this.movieCanvasCtx;
    const w = 512;
    const h = 320;

    ctx.clearRect(0, 0, w, h);

    if (this.theme === 'day') {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 10, h);
      ctx.fillRect(0, 0, w, 10);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('OUTDOOR CINEMA', w / 2, h / 2);
    } else {
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(0.5, '#4f46e5');
      skyGrad.addColorStop(1, '#ec4899');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#ffffff';
      const time = Date.now();
      for (let i = 0; i < 20; i++) {
        const starX = (Math.sin(i * 123 + 456) * 0.5 + 0.5) * w;
        const starY = (Math.cos(i * 654 + 321) * 0.5 + 0.5) * (h * 0.6);
        const twinkle = 0.3 + Math.sin(time * 0.005 + i) * 0.7;
        if (twinkle > 0) {
          ctx.globalAlpha = twinkle;
          ctx.fillRect(starX, starY, 2, 2);
        }
      }
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(420, 60, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(412, 56, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#312e81';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(120, h - 90);
      ctx.lineTo(260, h);
      ctx.fill();

      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(180, h);
      ctx.lineTo(340, h - 70);
      ctx.lineTo(512, h);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(80, h - 65, 90, 45);

      ctx.beginPath();
      ctx.arc(100, h - 20, 10, 0, Math.PI * 2);
      ctx.arc(150, h - 20, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(140, h - 85, 25, 25);

      ctx.fillRect(0, h - 20, w, 20);

      ctx.fillStyle = '#475569';
      ctx.fillRect(218, h - 24, 14, 4);
      ctx.fillRect(222, h - 28, 6, 8);

      const flameHeight = 16 + Math.sin(time * 0.03) * 6;
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(220, h - 24);
      ctx.quadraticCurveTo(220, h - 24 - flameHeight * 0.5, 225, h - 24 - flameHeight);
      ctx.quadraticCurveTo(230, h - 24 - flameHeight * 0.5, 230, h - 24);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(222, h - 24);
      ctx.quadraticCurveTo(222, h - 24 - flameHeight * 0.65 * 0.5, 225, h - 24 - flameHeight * 0.65);
      ctx.quadraticCurveTo(228, h - 24 - flameHeight * 0.65 * 0.5, 228, h - 24);
      ctx.closePath();
      ctx.fill();
    }

    this.movieTexture.needsUpdate = true;
  }

  // --- RENDERING & ANIMATION ---
  animate() {
    requestAnimationFrame(() => this.animate());

    // [NEW] Float the cat's speech bubble gently
    if (this.catBubbleSprite && this.catBubbleSprite.visible) {
      this.catBubbleSprite.position.y = 1.48 + Math.sin(Date.now() * 0.003) * 0.04;
    }

    // [NEW] Random Lightning trigger during Autumn season (rain)
    if (this.season === 'autumn' && !this.isLightningFlashing && Math.random() < 0.0055) { // Increased lightning frequency
      this.isLightningFlashing = true;
      this.lightningFlashStep = 0;
      if (this.ambientLight && this.dirLight) {
        this.lightningBaseAmbient = this.ambientLight.intensity;
        this.lightningBaseDir = this.dirLight.intensity;
        this.lightningBaseAmbientColor = this.ambientLight.color.getHex();
        this.lightningBaseDirColor = this.dirLight.color.getHex();
      }
      
      if (audio.playThunderSound) {
        const delay = 100 + Math.random() * 400;
        setTimeout(() => {
          audio.playThunderSound();
        }, delay);
      }
    }

    // [NEW] Lightning flash animation sequence
    if (this.isLightningFlashing && this.ambientLight && this.dirLight) {
      this.lightningFlashStep++;
      let flashMultiplier = 0;
      let flashSkyColor = null;
      
      if (this.lightningFlashStep === 1 || this.lightningFlashStep === 2) {
        flashMultiplier = 2.5;
        this.ambientLight.color.setHex(0xffffff);
        this.dirLight.color.setHex(0xffffff);
        flashSkyColor = 0xd8b4fe; // Purple lightning sky
      } else if (this.lightningFlashStep === 3 || this.lightningFlashStep === 4) {
        flashMultiplier = 0.3;
      } else if (this.lightningFlashStep === 5 || this.lightningFlashStep === 6) {
        flashMultiplier = 1.8;
        this.ambientLight.color.setHex(0xffffff);
        this.dirLight.color.setHex(0xffffff);
        flashSkyColor = 0xc084fc; // Second strike sky
      } else if (this.lightningFlashStep <= 18) {
        const decayFrac = (18 - this.lightningFlashStep) / 12;
        flashMultiplier = 1.0 + decayFrac * 0.8;
      } else {
        this.isLightningFlashing = false;
        this.ambientLight.intensity = this.lightningBaseAmbient;
        this.dirLight.intensity = this.lightningBaseDir;
        this.ambientLight.color.setHex(this.lightningBaseAmbientColor);
        this.dirLight.color.setHex(this.lightningBaseDirColor);
        
        let origSkyCol = 0xf97316;
        if (this.theme === 'day') origSkyCol = 0xbae6fd;
        else if (this.theme === 'night') origSkyCol = 0x090d16;
        this.scene.background = new THREE.Color(origSkyCol);
        
        flashMultiplier = -1;
      }
      
      if (flashMultiplier >= 0) {
        this.ambientLight.intensity = this.lightningBaseAmbient * flashMultiplier;
        this.dirLight.intensity = this.lightningBaseDir * flashMultiplier;
        if (flashSkyColor !== null) {
          this.scene.background = new THREE.Color(flashSkyColor);
        } else {
          let origSkyCol = 0xf97316;
          if (this.theme === 'day') origSkyCol = 0xbae6fd;
          else if (this.theme === 'night') origSkyCol = 0x090d16;
          this.scene.background = new THREE.Color(origSkyCol);
        }
      }
    }

    // 1. Controls update
    this.controls.update();

    // [NEW] Fireflies drifting animation
    if (this.firefliesGroup && this.fireflies) {
      if (this.theme === 'night' || this.theme === 'sunset') {
        this.firefliesGroup.visible = true;
        const time = Date.now();
        const maxOpacity = (this.theme === 'night') ? 1.0 : 0.45;
        this.fireflies.forEach(ff => {
          const ud = ff.userData;
          ud.phaseX += ud.speed;
          ud.phaseY += ud.speed * 0.8;
          ud.phaseZ += ud.speed * 1.2;
          
          // Drift around base coordinates
          ff.position.x = ud.baseX + Math.sin(ud.phaseX) * 0.8;
          ff.position.y = ud.baseY + Math.cos(ud.phaseY) * 0.4;
          ff.position.z = ud.baseZ + Math.sin(ud.phaseZ) * 0.8;
          
          // Twinkle effect (sine pulse)
          ff.material.opacity = (0.35 + Math.sin(time * 0.003 + ud.phaseX) * 0.65) * maxOpacity;
          ff.material.transparent = true;
        });
      } else {
        this.firefliesGroup.visible = false;
      }
    }

    // [NEW] Yakamoz sea sparkles animation
    if (this.yakamozGroup && this.yakamozSparkles) {
      if (this.theme === 'night' || this.theme === 'sunset') {
        this.yakamozGroup.visible = true;
        const maxOpacity = (this.theme === 'night') ? 0.75 : 0.22;
        this.yakamozSparkles.forEach(yk => {
          yk.userData.phase += yk.userData.speed;
          yk.material.opacity = Math.max(0, Math.sin(yk.userData.phase)) * maxOpacity;
          
          // Float/bob with sea waves (using same wave formula)
          const time = Date.now() * 0.0008;
          yk.position.y = -0.12 + Math.sin(yk.position.x * 0.1 + time * 0.5) * 0.12 + Math.cos(yk.position.z * 0.15 + time * 0.6) * 0.08;
        });
      } else {
        this.yakamozGroup.visible = false;
      }
    }

    // 2. Flame Flickering simulation
    if (this.stoveLight) {
      const scaleBase = 0.8 + Math.sin(Date.now() * 0.05) * 0.15;
      const intensity = (this.fireIntensity === 1) ? 0.3 : (this.fireIntensity === 2 ? 0.8 : 1.3);
      this.stoveLight.intensity = scaleBase * intensity;
    }

    // [NEW] Campfire light and flame animation
    if (this.campfireLight) {
      const scaleBase = 0.8 + Math.sin(Date.now() * 0.07) * 0.2;
      const baseIntensity = (this.theme === 'night') ? 1.6 : ((this.theme === 'sunset') ? 1.05 : 0.35);
      this.campfireLight.intensity = scaleBase * baseIntensity;
    }
    if (this.campfireFlames && this.campfireFlames.length > 0) {
      this.campfireFlames.forEach((flame, index) => {
        const bounce = 0.95 + Math.sin(Date.now() * 0.018 + index * 1.5) * 0.12;
        flame.scale.set(bounce, bounce * 1.15, bounce);
      });
    }

    // 3. Sea Waves animation (Yumuşak ve yavaş 3D dalgalanma efekti)
    if (this.seaMesh && this.seaGeometry) {
      const positionAttribute = this.seaGeometry.attributes.position;
      const time = Date.now() * 0.0008; // Yavaş salınım
      for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i);
        const z = positionAttribute.getZ(i);
        const y = Math.sin(x * 0.1 + time * 0.5) * 0.12 + Math.cos(z * 0.15 + time * 0.6) * 0.08;
        positionAttribute.setY(i, y);
      }
      positionAttribute.needsUpdate = true;
      this.seaGeometry.computeVertexNormals();
    }

    // 4. Smooth Sun & Moon Sunset transitions (lerp positions)
    let sunTargetPos = new THREE.Vector3(12, 18, -25);
    let moonTargetPos = new THREE.Vector3(-12, -15, -25);
    let sunColor = 0xfffbeb;
    
    if (this.theme === 'day') {
      sunTargetPos.set(12, 18, -25);
      moonTargetPos.set(-12, -15, -25);
      sunColor = 0xfffbeb;
    } else if (this.theme === 'sunset') {
      sunTargetPos.set(12, 1.6, -28); // Sinks low right above the sea horizon
      moonTargetPos.set(-12, -15, -25);
      sunColor = 0xf97316; // Deep sunset orange
    } else if (this.theme === 'night') {
      sunTargetPos.set(12, -18, -25); // Sinks completely below horizon
      moonTargetPos.set(-12, 16, -22); // Rises high
    }
    
    if (this.sunMesh) {
      this.sunMesh.position.lerp(sunTargetPos, 0.03);
      this.sunMesh.material.color.lerp(new THREE.Color(sunColor), 0.03);
    }
    if (this.moonMesh) {
      this.moonMesh.position.lerp(moonTargetPos, 0.03);
    }

    // 5. Gazebo & Cinema LED lights twinkling animation (faded out during day theme)
    if (this.gazeboLEDs && this.gazeboLEDs.length > 0) {
      const isDay = (this.theme === 'day');
      this.gazeboLEDs.forEach((led, index) => {
        if (isDay) {
          led.material.opacity = 0.1;
        } else {
          const brightness = 0.45 + Math.sin(Date.now() * 0.005 + index * 0.9) * 0.55;
          led.material.opacity = brightness;
        }
        led.material.transparent = true;
      });
    }

    // 6. Twinkling Stars animation (only active/visible during night theme)
    if (this.starsParticles) {
      if (this.theme === 'night') {
        this.starsParticles.material.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.45;
      } else {
        this.starsParticles.material.opacity = 0.0;
      }
    }

    // 7. Backyard Cinema movie projection and lighting animation
    this.updateMovieScreen();

    if (this.screenReflectionLight) {
      const flicker = 0.7 + Math.sin(Date.now() * 0.08) * 0.15 + (Math.random() - 0.5) * 0.05;
      const baseIntensity = (this.theme === 'night') ? 0.7 : ((this.theme === 'sunset') ? 0.45 : 0.0);
      this.screenReflectionLight.intensity = flicker * baseIntensity;
    }

    if (this.cinemaPointLights && this.cinemaPointLights.length > 0) {
      this.cinemaPointLights.forEach((light) => {
        if (light === this.screenReflectionLight) return;
        const scaleBase = 0.85 + Math.sin(Date.now() * 0.06 + Math.random() * 0.1) * 0.15;
        const baseIntensity = (this.theme === 'night') ? 0.65 : ((this.theme === 'sunset') ? 0.4 : 0.0);
        light.intensity = scaleBase * baseIntensity;
      });
    }

    // [NEW] 7B. Shooting Star, Crystal floating, and Rainbow lights animation
    if (this.isShootingStarAnimating && this.shootingStarMesh) {
      this.shootingStarProgress += 0.012; // Animates in ~1.5 seconds
      if (this.shootingStarProgress >= 1.0) {
        this.shootingStarProgress = 1.0;
        this.isShootingStarAnimating = false;
        
        // Remove shooting star from scene
        this.scene.remove(this.shootingStarMesh);
        this.scene.remove(this.shootingStarTrail);
        this.shootingStarMesh = null;
        this.shootingStarTrail = null;

        // Spawn the cosmic crystal at landing spot
        this.spawnCosmicCrystal(new THREE.Vector3(12.0, 0.2, 5.0));
      } else {
        const start = new THREE.Vector3(5, 20, -15);
        const end = new THREE.Vector3(12.0, 0.2, 5.0);
        
        // Linear interpolation for position
        const currentPos = new THREE.Vector3().lerpVectors(start, end, this.shootingStarProgress);
        this.shootingStarMesh.position.copy(currentPos);

        // Update trail particles
        if (this.shootingStarTrail) {
          const positions = this.shootingStarTrail.geometry.attributes.position.array;
          
          this.trailHistory.push(currentPos.clone());
          if (this.trailHistory.length > 50) {
            this.trailHistory.shift();
          }

          for (let i = 0; i < 50; i++) {
            const histPos = this.trailHistory[this.trailHistory.length - 1 - i] || currentPos;
            positions[i * 3] = histPos.x + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 1] = histPos.y + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 2] = histPos.z + (Math.random() - 0.5) * 0.2;
          }
          this.shootingStarTrail.geometry.attributes.position.needsUpdate = true;
        }
      }
    }

    if (this.crystalMesh) {
      this.crystalMesh.rotation.y += 0.015;
      this.crystalMesh.rotation.x += 0.005;
      this.crystalMesh.position.y = 0.25 + Math.sin(Date.now() * 0.002) * 0.08;
      
      if (this.crystalLight) {
        this.crystalLight.intensity = 1.2 + Math.sin(Date.now() * 0.005) * 0.4;
      }
    }

    if (this.isRainbowEffectActive) {
      const elapsed = Date.now() - this.rainbowTimer;
      if (elapsed > 5000) {
        this.isRainbowEffectActive = false;
        
        // Reset colors
        this.updateThemeColors();
        
        if (this.campfireLight) this.campfireLight.color.setHex(0xf97316);
        if (this.stoveLight) this.stoveLight.color.setHex(0xf97316);
        if (this.cinemaPointLights) {
          this.cinemaPointLights.forEach(light => {
            if (light === this.screenReflectionLight) {
              light.color.setHex(0x99f6e4);
            } else {
              light.color.setHex(0xfef08a);
            }
          });
        }

        // Trigger crystal fade out
        if (this.crystalMesh) {
          this.isCrystalFading = true;
          this.crystalFadeProgress = 1.0;
        }
      } else {
        const hue = (Date.now() * 0.0004) % 1.0;
        
        this.ambientLight.color.setHSL(hue, 0.8, 0.4);
        this.dirLight.color.setHSL((hue + 0.2) % 1.0, 0.7, 0.5);
        this.interiorGlowLight.color.setHSL((hue + 0.4) % 1.0, 0.9, 0.6);
        
        if (this.campfireLight) {
          this.campfireLight.color.setHSL((hue + 0.6) % 1.0, 0.9, 0.6);
        }
        if (this.stoveLight) {
          this.stoveLight.color.setHSL((hue + 0.8) % 1.0, 0.9, 0.6);
        }
        if (this.crystalLight) {
          this.crystalLight.color.setHSL((hue + 0.1) % 1.0, 0.9, 0.7);
        }
        
        if (this.cinemaPointLights) {
          this.cinemaPointLights.forEach((light, index) => {
            if (light === this.screenReflectionLight) {
              light.color.setHSL((hue + 0.3) % 1.0, 0.9, 0.5);
            } else {
              light.color.setHSL((hue + 0.1 * index) % 1.0, 0.8, 0.55);
            }
          });
        }
      }
    }

    // Crystal Fading animation
    if (this.isCrystalFading && this.crystalMesh) {
      this.crystalFadeProgress -= 0.02; // Fades out in 50 frames (~0.8s)
      if (this.crystalFadeProgress <= 0) {
        this.crystalFadeProgress = 0;
        this.isCrystalFading = false;

        // Remove crystal from scene
        this.scene.remove(this.crystalMesh);
        if (this.crystalLight) {
          this.scene.remove(this.crystalLight);
          this.crystalLight = null;
        }

        // Remove from interactiveObjects
        const idx = this.interactiveObjects.indexOf(this.crystalMesh);
        if (idx > -1) {
          this.interactiveObjects.splice(idx, 1);
        }
        this.crystalMesh = null;
      } else {
        // Apply opacity to material
        this.crystalMesh.material.opacity = this.crystalFadeProgress;
        if (this.crystalLight) {
          this.crystalLight.intensity = this.crystalFadeProgress * 1.5;
        }
      }
    }

    // 8. Weather particles animation
    if (this.season === 'autumn' && this.rainParticles) {
      const positions = this.rainParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.35; // fall speed
        if (positions[i + 1] < -0.1) {
          positions[i + 1] = 20 + Math.random() * 5;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.season === 'winter' && this.snowParticles) {
      const positions = this.snowParticles.geometry.attributes.position.array;
      const time = Date.now() * 0.0015;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 0.06; // fall speed
        positions[i] += Math.sin(time + i) * 0.015; // horizontal wiggle
        if (positions[i + 1] < -0.1) {
          positions[i + 1] = 20 + Math.random() * 5;
          positions[i] = (Math.random() - 0.5) * 45;
        }
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.season === 'spring' && this.springParticles) {
      const positions = this.springParticles.geometry.attributes.position.array;
      const time = Date.now() * 0.002;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.04; // rising speed
        positions[i] += Math.sin(time * 3 + i) * 0.04; // fluttering wiggle
        positions[i + 2] += Math.cos(time + i) * 0.01;
        if (positions[i + 1] > 20) {
          positions[i + 1] = 0 + Math.random() * 2;
          positions[i] = (Math.random() - 0.5) * 45;
          positions[i + 2] = (Math.random() - 0.5) * 45;
        }
      }
      this.springParticles.geometry.attributes.position.needsUpdate = true;
    }

    // [NEW] Kedi Mia Hareket Animasyonları (Nefes Alma, Kafa Oynatma, Kuyruk Sallama)
    if (this.catBody) {
      const breathingTime = Date.now() * 0.0035;
      this.catBody.scale.y = 1.0 + Math.sin(breathingTime) * 0.04;
      this.catBody.scale.z = 1.0 + Math.sin(breathingTime) * 0.02;
    }
    if (this.catTail) {
      const tailWagTime = Date.now() * 0.005;
      this.catTail.rotation.y = Math.sin(tailWagTime) * 0.16;
    }
    if (this.catHead) {
      const headTiltTime = Date.now() * 0.0012;
      this.catHead.rotation.z = Math.sin(headTiltTime) * 0.05;
    }

    // 7. Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --- THEME COLOR TRANSITIONS ---
  updateThemeColors() {
    const isSunset = (this.theme === 'sunset');
    const isDay = (this.theme === 'day');
    const isNight = (this.theme === 'night');

    // 1. Scene Background Color
    let skyCol = 0xf97316;
    if (isDay) skyCol = 0xbae6fd;
    else if (isNight) skyCol = 0x090d16;
    this.scene.background = new THREE.Color(skyCol);

    // 2. Lights Adjustments
    if (isDay) {
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.55;
      this.dirLight.color.setHex(0xfffbeb);
      this.dirLight.intensity = 0.95;
      this.dirLight.position.set(10, 15, 10);
      this.interiorGlowLight.intensity = 0.0; // off in day
    } else if (isSunset) {
      this.ambientLight.color.setHex(0xfeb78a);
      this.ambientLight.intensity = 0.45;
      this.dirLight.color.setHex(0xf97316);
      this.dirLight.intensity = 0.75;
      this.dirLight.position.set(8, 10, 8);
      this.interiorGlowLight.intensity = 0.15;
    } else {
      // Night
      this.ambientLight.color.setHex(0x312e81);
      this.ambientLight.intensity = 0.15;
      this.dirLight.color.setHex(0x3730a3);
      this.dirLight.intensity = 0.18;
      this.dirLight.position.set(-6, 8, -6);
      this.interiorGlowLight.intensity = 0.9; // warm yellow glow inside
    }

    // 3. Stars particles visibility
    if (this.starsParticles) {
      this.starsParticles.material.opacity = isNight ? 0.95 : 0.0;
    }
  }

  setTheme(themeName) {
    this.theme = themeName;
    this.updateThemeColors();
  }

  setInteriorMode(isInterior) {
    this.isInterior = isInterior;
    if (this.exteriorShellGroup) {
      this.exteriorShellGroup.visible = !isInterior;
    }
    if (this.catBubbleSprite) {
      this.catBubbleSprite.visible = isInterior;
    }
    if (this.catPointLight) {
      this.catPointLight.visible = isInterior;
    }
  }

  setCaravanColor(hex) {
    this.caravanColor = hex;
    if (this.chassisMesh) {
      this.chassisMesh.material.color.set(hex);
    }
    document.documentElement.style.setProperty('--accent-color', hex);
  }

  setPaintingColor(hexColor) {
    this.paintingColor = hexColor;
    if (this.paintingMesh) {
      this.paintingMesh.material.color.set(hexColor);
    }
  }

  setFireIntensity(val) {
    this.fireIntensity = val;
  }

  spawnShootingStar() {
    if (this.shootingStarMesh || this.crystalMesh || this.isCrystalFading) return;

    // Trigger toast notification
    const toast = document.getElementById('toast-notification');
    if (toast) {
      toast.classList.remove('hidden');
      setTimeout(() => {
        toast.classList.add('hidden');
      }, 5000);
    }

    // Create a glowing sphere for the shooting star
    const starGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.shootingStarMesh = new THREE.Mesh(starGeo, starMat);
    this.shootingStarMesh.position.set(5, 20, -15);
    this.scene.add(this.shootingStarMesh);

    // Add a PointLight to the shooting star
    this.shootingStarLight = new THREE.PointLight(0xa855f7, 2, 8);
    this.shootingStarMesh.add(this.shootingStarLight);

    // Create a particle system for the trail
    const trailCount = 50;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    for (let i = 0; i < trailPositions.length; i++) {
      trailPositions[i] = 0;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.shootingStarTrail = new THREE.Points(trailGeo, trailMat);
    this.scene.add(this.shootingStarTrail);
    
    this.trailHistory = [];
    this.isShootingStarAnimating = true;
    this.shootingStarProgress = 0.0;
    
    audio.playShootingStarSound();
  }

  spawnCosmicCrystal(pos) {
    // 1. Landing visual flash / particle blast
    const flashCount = 60;
    const flashGeo = new THREE.BufferGeometry();
    const flashPos = new Float32Array(flashCount * 3);
    const flashVels = [];
    for (let i = 0; i < flashCount; i++) {
      flashPos[i * 3] = pos.x;
      flashPos[i * 3 + 1] = pos.y;
      flashPos[i * 3 + 2] = pos.z;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.15;
      const vy = 0.05 + Math.random() * 0.15;
      flashVels.push({
        x: Math.cos(angle) * speed,
        y: vy,
        z: Math.sin(angle) * speed
      });
    }
    flashGeo.setAttribute('position', new THREE.BufferAttribute(flashPos, 3));
    const flashMat = new THREE.PointsMaterial({
      color: 0xa855f7,
      size: 0.2,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const blastParticles = new THREE.Points(flashGeo, flashMat);
    this.scene.add(blastParticles);

    // Animate blast particles briefly and remove them
    let blastTicks = 0;
    const animateBlast = () => {
      blastTicks++;
      if (blastTicks > 40) {
        this.scene.remove(blastParticles);
      } else {
        const positions = blastParticles.geometry.attributes.position.array;
        for (let i = 0; i < flashCount; i++) {
          positions[i * 3] += flashVels[i].x;
          positions[i * 3 + 1] += flashVels[i].y;
          positions[i * 3 + 2] += flashVels[i].z;
          flashVels[i].y -= 0.005; // gravity
        }
        blastParticles.geometry.attributes.position.needsUpdate = true;
        flashMat.opacity = 1.0 - (blastTicks / 40);
        requestAnimationFrame(animateBlast);
      }
    };
    animateBlast();

    audio.playAmbientSwell();

    // 2. Create the Crystal Mesh (Octahedron)
    const crystalGeo = new THREE.OctahedronGeometry(0.4, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6, // Purple
      emissive: 0x4c1d95,
      roughness: 0.1,
      metalness: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.95
    });
    this.crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
    this.crystalMesh.position.copy(pos);
    this.crystalMesh.castShadow = true;
    
    // Attach hotspot userData
    this.crystalMesh.userData = { hotspotId: 13 };
    this.interactiveObjects.push(this.crystalMesh);
    
    this.scene.add(this.crystalMesh);

    // 3. Add PointLight for crystal glow
    this.crystalLight = new THREE.PointLight(0xa855f7, 1.5, 4.0);
    this.crystalLight.position.set(pos.x, pos.y + 0.5, pos.z);
    this.scene.add(this.crystalLight);
  }

  // --- RAYCASTING MOUSE INTERACTION ---
  onCanvasClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      // Find the first intersected object that has a hotspotId
      let hitObj = intersects[0].object;
      while (hitObj && !hitObj.userData.hotspotId) {
        hitObj = hitObj.parent;
      }
      
      if (hitObj && hitObj.userData.hotspotId) {
        this.handleHotspotClick(hitObj.userData.hotspotId);
      }
    } else {
      // Clicked the empty sky
      this.handleHotspotClick(8);
    }
  }

  onCanvasMouseMove(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    // Hover mouse cursor update & visual glow highlight
    let isHovering = false;
    let hoveredHitObj = null;
    if (intersects.length > 0) {
      let hitObj = intersects[0].object;
      let checkObj = hitObj;
      let hasHotspot = false;
      while (checkObj) {
        if (checkObj.userData.hotspotId) {
          hasHotspot = true;
          break;
        }
        checkObj = checkObj.parent;
      }
      if (hasHotspot) {
        isHovering = true;
        hoveredHitObj = hitObj; // Highlight ONLY the specific hovered mesh, not the entire group!
      }
    }

    if (this.currentlyHoveredObject !== hoveredHitObj) {
      // Restore previous hovered object emissive colors (robust array check)
      if (this.currentlyHoveredObject) {
        this.currentlyHoveredObject.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat, idx) => {
              const key = `originalEmissive_${idx}`;
              if (mat.emissive && child.userData[key] !== undefined) {
                mat.emissive.setHex(child.userData[key]);
              }
              const keyColor = `originalColor_${idx}`;
              if (mat.color && child.userData[keyColor] !== undefined) {
                mat.color.setHex(child.userData[keyColor]);
              }
            });
          }
        });
      }

      // Apply glow to the newly hovered object
      this.currentlyHoveredObject = hoveredHitObj;
      if (hoveredHitObj) {
        // Find if this object or any parent is part of the hammock (hotspotId 14)
        let checkHammock = hoveredHitObj;
        let isHammock = false;
        while (checkHammock) {
          if (checkHammock.userData.hotspotId === 14) {
            isHammock = true;
            break;
          }
          checkHammock = checkHammock.parent;
        }

        hoveredHitObj.traverse(child => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat, idx) => {
              if (mat.emissive) {
                const key = `originalEmissive_${idx}`;
                if (child.userData[key] === undefined) {
                  child.userData[key] = mat.emissive.getHex();
                }
                const keyColor = `originalColor_${idx}`;
                if (mat.color && child.userData[keyColor] === undefined) {
                  child.userData[keyColor] = mat.color.getHex();
                }

                if (isHammock) {
                  // Beautiful warm orange-yellow highlight for the light beige hammock!
                  mat.color.setHex(0xf59e0b); 
                  mat.emissive.setHex(0x552200); 
                } else {
                  // Emissive glow (soft warm gold highlight, slightly brighter than before)
                  mat.emissive.setHex(0x554411);
                }
              }
            });
          }
        });
      }
    }

    if (isHovering) {
      this.container.style.cursor = 'pointer';
    } else {
      this.container.style.cursor = this.controls.state === -1 ? 'grab' : 'grabbing';
    }
  }

  handleHotspotClick(id) {
    const isExt = !this.isInterior;
    const interiorHotspots = [1, 2, 3, 4, 5, 6, 10, 11, 17];

    if (isExt && interiorHotspots.includes(id)) {
      this.isInterior = true;
      document.body.classList.remove('view-exterior');
      document.body.classList.add('view-interior');
      this.setInteriorMode(true);
      
      const btnViewExt = document.getElementById('btn-view-ext');
      const btnViewInt = document.getElementById('btn-view-int');
      if (btnViewExt && btnViewInt) {
        btnViewExt.classList.remove('active');
        btnViewInt.classList.add('active');
      }

      audio.playThemeTransitionSound();
      
      setTimeout(() => {
        this.openModal(id);
      }, 300);
    } else {
      this.openModal(id);
    }
  }

  openModal(id) {
    let modalId = '';
    let soundCallback = null;

    switch(id) {
      case 1:
        modalId = 'modal-screens';
        soundCallback = () => { if (audio.keyboardActive) audio.playKeyboardClick(); };
        break;
      case 17:
        modalId = 'modal-route';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 2:
        modalId = 'modal-sofa';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 3:
        modalId = 'modal-kitchen';
        soundCallback = () => audio.playPageRustle();
        break;
      case 4:
        modalId = 'modal-fireplace';
        soundCallback = () => audio.playArtGong();
        break;
      case 5:
        modalId = 'modal-bed';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 6:
        modalId = 'modal-bookshelf';
        soundCallback = () => audio.playPageRustle();
        break;
      case 7:
        modalId = 'modal-sea';
        soundCallback = () => {
          audio.startWaves();
          const btnSoundWaves = document.getElementById('btn-sound-waves');
          if (btnSoundWaves) btnSoundWaves.classList.add('active');
        };
        break;
      case 8:
        modalId = 'modal-stars';
        soundCallback = () => audio.playCosmicTwinkle();
        break;
      case 9:
        modalId = 'modal-garden';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 10:
        modalId = 'modal-cat';
        soundCallback = () => {
          audio.startPurr();
          const btnSoundPurr = document.getElementById('btn-sound-purr');
          if (btnSoundPurr) btnSoundPurr.classList.add('active');
        };
        break;
      case 11:
        modalId = 'modal-painting';
        soundCallback = () => audio.playArtGong();
        break;
      case 12:
        modalId = 'modal-door';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 13:
        modalId = 'modal-crystal';
        const MOTIVATIONAL_QUOTES = [
          "Yıldızlar sadece karanlık çöktüğünde parlar; kendi ışığını bulmak için sabret. ✨",
          "Zorluklar, başarının değerini artıran süslerdir. Yolundan asla vazgeçme! 🌅",
          "Büyük şeyler, küçük şeylerin bir araya getirilmesiyle oluşur. Bugün attığın küçük adım geleceğindir. 🧱",
          "Karanlık ne kadar derin olursa olsun, en küçük bir ışık bile onu delip geçebilir. Sen o ışıksın! 💡",
          "Fırtınanın gücü ne olursa olsun, martı sevdiği denizden asla vazgeçmez. İnancını koru! 🌊",
          "Zihnin sakinleştiğinde, evrenin sessiz melodisini duymaya başlarsın. Huzur seninle. 🧘‍♂️",
          "Her yeni gün, hayallerine bir adım daha yaklaşmak için yeni bir fırsattır. Başla! 🚀",
          "Gelecek, bugünden hazırlananlara aittir. Çalışmaya ve inanmaya devam et! 🏔️"
        ];
        const quoteElem = document.getElementById('crystal-quote');
        if (quoteElem) {
          const randQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
          quoteElem.textContent = randQuote;
        }
        this.isRainbowEffectActive = true;
        this.rainbowTimer = Date.now();
        soundCallback = () => audio.playCrystalMelody();
        break;
      case 14:
        modalId = 'modal-hammock';
        soundCallback = () => audio.playAmbientSwell();
        break;
      case 15:
        modalId = 'modal-cinema';
        soundCallback = () => audio.playCosmicTwinkle();
        break;
    }

    if (modalId) {
      if (modalId !== 'modal-garden' && modalId !== 'modal-stars') {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.showModal();
        }
      }
      if (soundCallback) soundCallback();
    }
  }
}

const engine = new ThreeCamperEngine('three-container');

// --- DOM ETKİLEŞİM RUTİNLERİ ---
document.addEventListener('DOMContentLoaded', () => {
  engine.init();

  // Trigger shooting star automatically every 2 minutes (120 seconds)
  setInterval(() => {
    engine.spawnShootingStar();
  }, 120000);

  const btnDay = document.getElementById('btn-day');
  const btnSunset = document.getElementById('btn-sunset');
  const btnNight = document.getElementById('btn-night');
  
  const btnViewExt = document.getElementById('btn-view-ext');
  const btnViewInt = document.getElementById('btn-view-int');
  
  const btnSeasonSummer = document.getElementById('btn-season-summer');
  const btnSeasonAutumn = document.getElementById('btn-season-autumn');
  const btnSeasonWinter = document.getElementById('btn-season-winter');
  const btnSeasonSpring = document.getElementById('btn-season-spring');
  
  const audioPrompt = document.getElementById('audio-prompt');
  const btnEnableAudio = document.getElementById('btn-enable-audio');
  const btnTriggerStar = document.getElementById('btn-trigger-star');

  const btnSoundWaves = document.getElementById('btn-sound-waves');
  const btnSoundKeyboard = document.getElementById('btn-sound-keyboard');
  const btnSoundPurr = document.getElementById('btn-sound-purr');
  const btnMute = document.getElementById('btn-mute');

  // --- 1. TEMA DEĞİŞTİRME ---
  const applyTheme = (themeClass, activeBtn, themeName) => {
    document.body.classList.remove('day-theme', 'sunset-theme', 'night-theme');
    document.body.classList.add(themeClass);

    [btnDay, btnSunset, btnNight].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    engine.setTheme(themeName);
    audio.playThemeTransitionSound();
  };

  btnDay.addEventListener('click', () => applyTheme('day-theme', btnDay, 'day'));
  btnSunset.addEventListener('click', () => applyTheme('sunset-theme', btnSunset, 'sunset'));
  btnNight.addEventListener('click', () => applyTheme('night-theme', btnNight, 'night'));

  // --- 1B. MEVSİM DEĞİŞTİRME ---
  const applySeason = (activeBtn, seasonName) => {
    [btnSeasonSummer, btnSeasonAutumn, btnSeasonWinter, btnSeasonSpring].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');

    engine.setSeason(seasonName);
    audio.playThemeTransitionSound();
  };

  btnSeasonSummer.addEventListener('click', () => applySeason(btnSeasonSummer, 'summer'));
  btnSeasonAutumn.addEventListener('click', () => applySeason(btnSeasonAutumn, 'autumn'));
  btnSeasonWinter.addEventListener('click', () => applySeason(btnSeasonWinter, 'winter'));
  btnSeasonSpring.addEventListener('click', () => applySeason(btnSeasonSpring, 'spring'));

  // --- 2. GÖRÜNÜM KONTROLÜ (Dış / İç Mekan) ---
  const applyViewMode = (mode) => {
    if (mode === 'exterior') {
      document.body.classList.remove('view-interior');
      document.body.classList.add('view-exterior');
      btnViewExt.classList.add('active');
      btnViewInt.classList.remove('active');
      engine.setInteriorMode(false);
    } else {
      document.body.classList.remove('view-exterior');
      document.body.classList.add('view-interior');
      btnViewInt.classList.add('active');
      btnViewExt.classList.remove('active');
      engine.setInteriorMode(true);
    }
    audio.playThemeTransitionSound();
  };

  btnViewExt.addEventListener('click', () => applyViewMode('exterior'));
  btnViewInt.addEventListener('click', () => applyViewMode('interior'));

  // --- 3. SES BAŞLATMA ---
  const enableAudioEngine = () => {
    if (!audio.isInitialized) {
      audio.init();
      audioPrompt.classList.add('hidden');

      [btnSoundWaves, btnSoundKeyboard, btnSoundPurr, btnMute].forEach(btn => {
        btn.removeAttribute('disabled');
      });

      audio.startWaves();
      btnSoundWaves.classList.add('active');

      if (typeof engine !== 'undefined' && engine.season === 'autumn') {
        audio.startRainSound();
      }
      if (typeof engine !== 'undefined' && engine.season === 'spring') {
        audio.startBirds();
      }
    }
  };

  btnEnableAudio.addEventListener('click', enableAudioEngine);
  if (btnTriggerStar) {
    btnTriggerStar.addEventListener('click', () => {
      // Check if a new star is going to spawn (no star active and no crystal present)
      const isNewStarSpawning = !engine.shootingStarMesh && !engine.crystalMesh && !engine.isCrystalFading;
      
      engine.spawnShootingStar();
      
      // If a new star is spawning, delay the modal opening by 1.6s so the user can watch the animation.
      // Otherwise, open the modal immediately.
      const delay = isNewStarSpawning ? 1600 : 0;
      
      setTimeout(() => {
        const starsModal = document.getElementById('modal-stars');
        if (starsModal) {
          starsModal.showModal();
          if (typeof audio !== 'undefined' && audio.playCosmicTwinkle) {
            audio.playCosmicTwinkle();
          }
        }
      }, delay);
    });
  }

  const btnOpenInstructions = document.getElementById('btn-open-instructions');
  if (btnOpenInstructions) {
    btnOpenInstructions.addEventListener('click', () => {
      const modal = document.getElementById('modal-instructions');
      if (modal) {
        modal.showModal();
        if (typeof audio !== 'undefined' && audio.playPageRustle) {
          audio.playPageRustle();
        }
      }
    });
  }

  // Automatically start audio context on first user interaction anywhere
  const autoStartAudio = () => {
    enableAudioEngine();
    window.removeEventListener('click', autoStartAudio);
    window.removeEventListener('touchstart', autoStartAudio);
    window.removeEventListener('keydown', autoStartAudio);
  };
  window.addEventListener('click', autoStartAudio);
  window.addEventListener('touchstart', autoStartAudio);
  window.addEventListener('keydown', autoStartAudio);

  // --- 4. ORTAM SESLERİ ---
  btnSoundWaves.addEventListener('click', () => {
    if (audio.wavesActive) {
      audio.stopWaves();
      btnSoundWaves.classList.remove('active');
    } else {
      audio.startWaves();
      btnSoundWaves.classList.add('active');
    }
  });

  btnSoundKeyboard.addEventListener('click', () => {
    if (audio.keyboardActive) {
      audio.keyboardActive = false;
      btnSoundKeyboard.classList.remove('active');
    } else {
      audio.keyboardActive = true;
      btnSoundKeyboard.classList.add('active');
      audio.playKeyboardClick();
    }
  });

  btnSoundPurr.addEventListener('click', () => {
    if (audio.purrActive) {
      audio.stopPurr();
      btnSoundPurr.classList.remove('active');
    } else {
      audio.startPurr();
      btnSoundPurr.classList.add('active');
    }
  });

  btnMute.addEventListener('click', () => {
    const isMuted = audio.toggleMute();
    if (isMuted) {
      btnMute.classList.add('muted');
      btnMute.textContent = "Sesi Aç";
    } else {
      btnMute.classList.remove('muted');
      btnMute.textContent = "Sesi Kapat";
    }
  });

  // --- 5. MODALLAR VE DIALOG KAPANMA ---
  const modals = document.querySelectorAll('dialog');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      const rect = modal.getBoundingClientRect();
      const isInDialog = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height
        && rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!isInDialog) {
        modal.close();
      }
    });
  });

  // --- 6. ÖZEL ETKİLEŞİM İÇERİKLERİ ---
  // Soba Alev Kaydırıcısı
  const fireSlider = document.getElementById('fire-intensity-slider');
  if (fireSlider) {
    fireSlider.addEventListener('input', () => {
      const val = parseInt(fireSlider.value);
      engine.setFireIntensity(val);
      audio.playKeyboardClick();
    });
  }

  // Karavan Gövde Rengi Özelleştirici
  const sofaSwatches = document.querySelectorAll('.sofa-swatch');
  sofaSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      sofaSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const chosenColor = swatch.getAttribute('data-color-base');
      document.body.style.setProperty('--caravan-color-base', chosenColor);
      document.body.style.setProperty('--accent-color', chosenColor);
      engine.setCaravanColor(chosenColor);
      audio.playAmbientSwell();
    });
  });

  // Kedi Sevme Sayacı
  const btnPetCat = document.getElementById('btn-pet-cat');
  const petCountText = document.getElementById('pet-count');
  const meterFill = document.getElementById('meter-fill');
  let petCount = 0;

  if (btnPetCat) {
    btnPetCat.addEventListener('click', () => {
      petCount += 1;
      petCountText.textContent = petCount;
      
      const fillPercentage = Math.min(petCount * 10, 100);
      meterFill.style.width = `${fillPercentage}%`;

      const speedMultiplier = 1.0 + (fillPercentage / 100) * 0.8;
      audio.updatePurrSpeed(speedMultiplier);

      if (!audio.purrActive) {
        audio.startPurr();
        btnSoundPurr.classList.add('active');
      } else {
        audio.playKeyboardClick();
      }
    });
  }

  // Yıldız Melodi Sentezleyici Butonu
  const btnPlayMelody = document.getElementById('btn-play-melody');
  if (btnPlayMelody) {
    btnPlayMelody.addEventListener('click', () => {
      audio.playCosmicTwinkle();
    });
  }

  // Tablo Renk Editörü
  const colorSwatches = document.querySelectorAll('.color-swatch');
  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const chosenColor = swatch.getAttribute('data-color');
      engine.setPaintingColor(chosenColor);
      audio.playArtGong();
    });
  });

  // --- COZY LOFI MUSIC PLAYER KONTROLLERİ ---
  const btnLofiPlay = document.getElementById('btn-lofi-play');
  const lofiVinyl = document.getElementById('lofi-vinyl');
  const musicWaveAnim = document.getElementById('music-wave-anim');
  const lofiProgressFill = document.getElementById('lofi-progress-fill');
  const lofiCurrentTime = document.getElementById('lofi-current-time');
  const lofiTrackTitle = document.getElementById('lofi-track-title');
  const lofiArtist = document.getElementById('lofi-artist');

  let lofiPlaying = false;
  let lofiProgressInterval = null;
  let playSeconds = 0;

  const playlist = [
    { title: "Cozy Sunset Beats", artist: "Dilara's Ambient Synth" },
    { title: "Forest Fireplace Chills", artist: "Cozy Caravan Beats" },
    { title: "Warm Tea Waves", artist: "127.0.0.1 Lounge" }
  ];
  let currentTrackIdx = 0;

  if (btnLofiPlay) {
    btnLofiPlay.addEventListener('click', () => {
      // Audio engine initialization if not already initialized
      if (!audio.isInitialized) {
        audio.init();
        const audioPrompt = document.getElementById('audio-prompt');
        if (audioPrompt) audioPrompt.classList.add('hidden');

        // Enable footer buttons
        const soundButtons = ['btn-sound-waves', 'btn-sound-keyboard', 'btn-sound-purr', 'btn-mute'];
        soundButtons.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.removeAttribute('disabled');
        });
      }

      lofiPlaying = !lofiPlaying;
      if (lofiPlaying) {
        btnLofiPlay.textContent = '⏸️';
        if (lofiVinyl) lofiVinyl.classList.add('playing');
        if (musicWaveAnim) musicWaveAnim.classList.add('active');
        audio.startLofiMusic();

        // Progress bar simulation (3:20 track = 200 seconds)
        lofiProgressInterval = setInterval(() => {
          playSeconds++;
          if (playSeconds >= 200) {
            playSeconds = 0;
            playNextTrack();
          }
          const min = Math.floor(playSeconds / 60);
          const sec = (playSeconds % 60).toString().padStart(2, '0');
          if (lofiCurrentTime) lofiCurrentTime.textContent = `${min}:${sec}`;
          if (lofiProgressFill) lofiProgressFill.style.width = `${(playSeconds / 200) * 100}%`;
        }, 1000);
      } else {
        pauseLofi();
      }
      audio.playKeyboardClick();
    });
  }

  const pauseLofi = () => {
    lofiPlaying = false;
    if (btnLofiPlay) btnLofiPlay.textContent = '▶️';
    if (lofiVinyl) lofiVinyl.classList.remove('playing');
    if (musicWaveAnim) musicWaveAnim.classList.remove('active');
    audio.stopLofiMusic();
    if (lofiProgressInterval) {
      clearInterval(lofiProgressInterval);
      lofiProgressInterval = null;
    }
  };

  const playNextTrack = () => {
    currentTrackIdx = (currentTrackIdx + 1) % playlist.length;
    updateTrackInfo();
    if (lofiPlaying) {
      audio.stopLofiMusic();
      audio.startLofiMusic();
    }
  };

  const playPrevTrack = () => {
    currentTrackIdx = (currentTrackIdx - 1 + playlist.length) % playlist.length;
    updateTrackInfo();
    if (lofiPlaying) {
      audio.stopLofiMusic();
      audio.startLofiMusic();
    }
  };

  const updateTrackInfo = () => {
    playSeconds = 0;
    if (lofiCurrentTime) lofiCurrentTime.textContent = "0:00";
    if (lofiProgressFill) lofiProgressFill.style.width = "0%";
    if (lofiTrackTitle) lofiTrackTitle.textContent = playlist[currentTrackIdx].title;
    if (lofiArtist) lofiArtist.textContent = playlist[currentTrackIdx].artist;
  };

  const btnLofiNext = document.getElementById('btn-lofi-next');
  if (btnLofiNext) {
    btnLofiNext.addEventListener('click', () => {
      playNextTrack();
      audio.playKeyboardClick();
    });
  }

  const btnLofiPrev = document.getElementById('btn-lofi-prev');
  if (btnLofiPrev) {
    btnLofiPrev.addEventListener('click', () => {
      playPrevTrack();
      audio.playKeyboardClick();
    });
  }

  // Screens modal kapatıldığında lofi müziği ve videoyu duraklat
  const modalScreens = document.getElementById('modal-screens');
  if (modalScreens) {
    modalScreens.addEventListener('close', () => {
      if (lofiPlaying) {
        pauseLofi();
      }
      const video = document.getElementById('desktop-video');
      if (video) {
        video.pause();
      }
    });
  }

  // Yatak modal kapatıldığında videoyu duraklat
  const modalBed = document.getElementById('modal-bed');
  if (modalBed) {
    modalBed.addEventListener('close', () => {
      const video = document.getElementById('bed-video');
      if (video) {
        video.pause();
      }
    });
  }

  // Kapı modal kapatıldığında videoyu duraklat
  const modalDoor = document.getElementById('modal-door');
  if (modalDoor) {
    modalDoor.addEventListener('close', () => {
      const video = document.getElementById('door-video');
      if (video) {
        video.pause();
      }
    });
  }

  // Klavyeden tuş seslerini yakalama
  window.addEventListener('keydown', (e) => {
    const modalScreens = document.getElementById('modal-screens');
    if ((modalScreens && modalScreens.hasAttribute('open')) || audio.keyboardActive) {
      audio.playKeyboardClick();
    }
  });

});

// Global Erişimler
window.playRustleSound = () => {
  audio.playPageRustle();
};
