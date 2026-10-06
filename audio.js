// Efeitos sonoros do Duelo Medieval, todos sintetizados (sem arquivos de áudio).
"use strict";
const Sound = (() => {
  let ac = null, master = null;
  function ctx() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        // Compressor na saída: evita estourar quando muitos sons tocam juntos.
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -14; comp.ratio.value = 6;
        master = ac.createGain(); master.gain.value = .8;
        master.connect(comp).connect(ac.destination);
      } catch { ac = null; }
    }
    return ac && ac.state === "running" ? ac : null;
  }
  function unlock() { ctx(); if (ac && ac.state === "suspended") ac.resume(); }

  function tone(f, dur, { type = "sine", vol = .2, to = null, delay = 0, attack = .005 } = {}) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  }
  let noiseBuf = null;
  function noise(dur, { vol = .3, freq = 1200, q = 1, type = "lowpass", to = null, delay = 0 } = {}) {
    const a = ctx(); if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime + delay, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    s.connect(fl).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + .02);
  }
  const r = (a, b) => a + Math.random() * (b - a);
  const play = {
    // Golpes
    swing: (heavy) => noise(heavy ? .22 : .13, { vol: heavy ? .22 : .14, freq: heavy ? 900 : 2200, to: heavy ? 300 : 700, q: 2, type: "bandpass" }),
    blade: (big) => { noise(.12, { vol: .4, freq: 3500, type: "highpass" }); noise(big ? .25 : .15, { vol: .35, freq: 900 }); tone(r(180, 220), .12, { type: "triangle", vol: .2, to: 90 }); },
    blunt: (big) => { noise(big ? .3 : .18, { vol: .55, freq: big ? 400 : 650 }); tone(big ? 75 : 110, big ? .3 : .18, { type: "sine", vol: .45, to: 40 }); },
    pierce: () => { noise(.08, { vol: .35, freq: 4000, type: "highpass" }); tone(r(500, 600), .1, { type: "triangle", vol: .15, to: 200 }); },
    punch: () => { noise(.08, { vol: .35, freq: 700 }); tone(150, .09, { type: "triangle", vol: .25, to: 70 }); },
    whip: () => { noise(.05, { vol: .6, freq: 5000, type: "highpass" }); tone(r(2000, 2400), .05, { type: "square", vol: .05 }); },
    clang: () => { tone(r(1700, 2100), .35, { type: "square", vol: .05 }); tone(r(2500, 3000), .4, { vol: .08 }); tone(r(3800, 4300), .25, { vol: .04 }); noise(.06, { vol: .2, freq: 6000, type: "highpass" }); },
    block: () => { tone(320, .15, { type: "square", vol: .1, to: 180 }); noise(.1, { vol: .3, freq: 1500 }); },
    shock: () => { noise(.5, { vol: .6, freq: 300, to: 80 }); tone(55, .5, { vol: .5, to: 30 }); },
    // Distância
    bow: () => { tone(220, .18, { type: "triangle", vol: .25, to: 110 }); noise(.1, { vol: .15, freq: 3000, type: "highpass" }); },
    crossbow: () => { tone(140, .12, { type: "square", vol: .15, to: 70 }); noise(.08, { vol: .4, freq: 1800 }); },
    sling: () => { noise(.2, { vol: .15, freq: 1200, to: 3000, q: 3, type: "bandpass" }); },
    throw: () => { for (let i = 0; i < 3; i++) noise(.06, { vol: .12, freq: 1800, q: 3, type: "bandpass", delay: i * .07 }); },
    thud: () => { tone(160, .1, { type: "triangle", vol: .2, to: 90 }); noise(.06, { vol: .2, freq: 900 }); },
    glass: () => { noise(.25, { vol: .35, freq: 5000, type: "highpass" }); for (let i = 0; i < 4; i++) tone(r(2500, 4500), .12, { vol: .05, delay: i * .03 }); },
    bubble: () => tone(r(300, 500), .12, { vol: .06, to: r(700, 900) }),
    // Magia
    fire: () => { noise(.35, { vol: .3, freq: 600, to: 1800, type: "bandpass", q: 1 }); tone(180, .3, { type: "sawtooth", vol: .05, to: 90 }); },
    boom: () => { noise(.7, { vol: .7, freq: 500, to: 60 }); tone(70, .6, { vol: .45, to: 28 }); },
    ice: () => { for (let i = 0; i < 3; i++) tone(r(2400, 3600), .25, { vol: .07, delay: i * .03 }); noise(.1, { vol: .15, freq: 6000, type: "highpass" }); },
    thunder: () => { noise(.12, { vol: .6, freq: 7000, type: "highpass" }); noise(.8, { vol: .5, freq: 300, to: 60, delay: .05 }); tone(1100, .2, { type: "sawtooth", vol: .08, to: 150 }); },
    spark: () => tone(r(1300, 1700), .07, { type: "triangle", vol: .07, to: r(2400, 3000) }),
    dark: () => { tone(110, .5, { type: "sawtooth", vol: .08, to: 55 }); tone(165, .5, { vol: .07, to: 80 }); },
    star: () => [1046, 1318, 1568].forEach((f, i) => tone(f, .25, { type: "triangle", vol: .07, delay: i * .05 })),
    drain: () => tone(r(260, 300), .35, { type: "sine", vol: .07, to: 600 }),
    rumble: () => { noise(.6, { vol: .5, freq: 200, to: 90 }); tone(45, .6, { vol: .35 }); },
    magicHit: () => { tone(r(700, 900), .15, { type: "triangle", vol: .12, to: 300 }); noise(.08, { vol: .15, freq: 3000 }); },
    // Ficção científica
    saber: () => { tone(r(110, 140), .28, { type: "sawtooth", vol: .07, to: r(220, 300) }); tone(r(220, 260), .28, { vol: .06, to: r(140, 180) }); noise(.18, { vol: .08, freq: 1500, q: 4, type: "bandpass" }); },
    laser: () => tone(r(1500, 1900), .12, { type: "square", vol: .05, to: r(300, 400) }),
    plasma: () => { tone(r(400, 500), .25, { type: "sawtooth", vol: .08, to: 120 }); noise(.2, { vol: .12, freq: 800, to: 2500, type: "bandpass" }); },
    shotgun: () => { noise(.25, { vol: .5, freq: 2500, to: 400 }); tone(90, .2, { vol: .3, to: 40 }); },
    rocket: () => { noise(.6, { vol: .35, freq: 400, to: 1500, type: "bandpass", q: .8 }); tone(160, .4, { type: "sawtooth", vol: .06, to: 320 }); },
    rail: () => { tone(200, .15, { type: "sawtooth", vol: .1, to: 2400 }); tone(3000, .4, { vol: .07, to: 600, delay: .1 }); noise(.35, { vol: .45, freq: 5000, type: "highpass", delay: .08 }); },
    sweep: () => { tone(r(500, 600), .7, { type: "sawtooth", vol: .05, to: r(700, 800) }); tone(r(1000, 1100), .7, { vol: .04 }); },
    drone: () => [880, 1320, 1760].forEach((f, i) => tone(f, .08, { type: "square", vol: .04, delay: i * .06 })),
    grav: () => { tone(60, .5, { vol: .4, to: 30 }); tone(400, .35, { type: "sine", vol: .1, to: 80 }); noise(.4, { vol: .2, freq: 300, to: 100 }); },
    notes: () => { const sc = [523, 587, 659, 784, 880, 1047]; for (let i = 0; i < 3; i++) tone(sc[Math.floor(Math.random() * sc.length)], .22, { type: "triangle", vol: .1, delay: i * .06 }); },
    drum: () => { tone(95, .35, { vol: .55, to: 45 }); noise(.18, { vol: .3, freq: 400 }); tone(140, .2, { vol: .25, to: 70, delay: .09 }); },
    horn: (l = 0) => {
      tone(330, .35, { type: "sawtooth", vol: .1, to: 300 }); tone(440, .35, { type: "square", vol: .06, to: 420 }); noise(.25, { vol: .15, freq: 900 });
      if (l) [523, 659, 784, 1047].slice(0, l === 2 ? 4 : 2).forEach((f, i) => tone(f, .3, { type: "sawtooth", vol: .07, delay: .08 + i * .09 }));
    },
    pika: () => { tone(1400, .1, { type: "square", vol: .05, to: 1800 }); tone(1600, .14, { type: "square", vol: .05, to: 1200, delay: .13 }); },
    pea: () => { tone(500, .07, { type: "triangle", vol: .12, to: 260 }); noise(.04, { vol: .1, freq: 1500 }); },
    web: () => { noise(.12, { vol: .2, freq: 3000, to: 900, type: "bandpass", q: 2 }); tone(1600, .08, { vol: .04, to: 700 }); },
    snap: () => { noise(.05, { vol: .5, freq: 4000, type: "highpass" }); tone(80, 1.4, { vol: .25, to: 40, delay: .1 }); noise(1.2, { vol: .12, freq: 600, to: 150, delay: .15 }); },
    flame: () => noise(.7, { vol: .22, freq: 700, to: 1400, type: "bandpass", q: .7 }),
    baa: () => { tone(420, .45, { type: "sawtooth", vol: .08, to: 380 }); tone(431, .45, { type: "sawtooth", vol: .05, to: 390 }); },
    capture: () => { tone(880, .1, { type: "square", vol: .06 }); tone(660, .12, { type: "square", vol: .06, delay: .12 }); tone(1320, .2, { type: "triangle", vol: .08, delay: .26 }); },
    heart: () => { tone(784, .15, { type: "triangle", vol: .1 }); tone(1047, .25, { type: "triangle", vol: .1, delay: .12 }); },
    homerun: () => { tone(1500, .05, { type: "square", vol: .12 }); noise(.08, { vol: .4, freq: 2500 }); [784, 988, 1175].forEach((f, i) => tone(f, .2, { type: "triangle", vol: .08, delay: .1 + i * .08 })); },
    stand: () => { tone(110, .6, { type: "sawtooth", vol: .1, to: 220 }); noise(.4, { vol: .2, freq: 500, to: 2000 }); },
    wish: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .35, { type: "triangle", vol: .09, delay: i * .07 })); noise(.3, { vol: .1, freq: 3000, type: "highpass" }); },
    squeak: () => { tone(1100, .07, { type: "square", vol: .07, to: 1700 }); tone(1700, .09, { type: "square", vol: .06, to: 900, delay: .07 }); },
    zap: () => tone(1100, .1, { type: "square", vol: .05, to: 500 }),
    // Mega Buster, poderes das armas e os bichinhos da bola de captura
    mmSwitch: () => [523, 784, 1046].forEach((f, i) => tone(f, .07, { type: "square", vol: .05, delay: i * .045 })),
    mmEmpty: () => tone(220, .12, { type: "square", vol: .05, to: 160 }),
    skill: () => { noise(.25, { vol: .18, freq: 600, to: 3500, q: 2, type: "bandpass" }); tone(440, .18, { type: "triangle", vol: .09, to: 880 }); },
    whirl: () => noise(.5, { vol: .22, freq: 500, to: 1800, q: 3, type: "bandpass" }),
    reap: () => { noise(.35, { vol: .25, freq: 2500, to: 600, q: 2, type: "bandpass" }); tone(180, .5, { type: "sawtooth", vol: .06, to: 90 }); },
    firework: () => { noise(.4, { vol: .35, freq: 2500, to: 400 }); [1568, 1976, 2349].forEach((f, i) => tone(f, .25, { type: "triangle", vol: .04, delay: .05 + i * .06 })); },
    char: () => { tone(700, .12, { type: "sawtooth", vol: .04, to: 900 }); tone(820, .18, { type: "sawtooth", vol: .04, to: 600, delay: .14 }); },
    squirt: () => { tone(900, .08, { type: "triangle", vol: .07, to: 1300 }); tone(1100, .12, { type: "triangle", vol: .07, to: 800, delay: .1 }); },
    grab: () => { noise(.12, { vol: .3, freq: 500 }); tone(160, .12, { type: "triangle", vol: .15, to: 110 }); },
    spReady: () => [880, 1175, 1568].forEach((f, i) => tone(f, .18, { type: "triangle", vol: .08, delay: i * .06 })),
    special: () => { noise(.6, { vol: .3, freq: 300, to: 4000, q: 1.5, type: "bandpass" }); tone(110, .7, { type: "sawtooth", vol: .1, to: 440 }); [523, 659, 784, 1046].forEach((f, i) => tone(f, .3, { type: "square", vol: .05, delay: .25 + i * .05 })); },
    bulba: () => { tone(330, .14, { type: "triangle", vol: .09, to: 440 }); tone(392, .2, { type: "triangle", vol: .09, to: 294, delay: .16 }); },
    leaf: () => { noise(.18, { vol: .16, freq: 3500, to: 1500, q: 2, type: "bandpass" }); noise(.12, { vol: .1, freq: 5000, type: "highpass", delay: .06 }); },
    water: () => noise(.25, { vol: .22, freq: 1800, to: 700, q: 1.2, type: "bandpass" }),
    genie: () => { tone(400, .6, { vol: .12, to: 1200 }); [1047, 1319, 1568].forEach((f, i) => tone(f, .4, { type: "triangle", vol: .08, delay: .3 + i * .08 })); },
    timestop: () => { tone(900, 1.1, { vol: .14, to: 80 }); noise(.6, { vol: .2, freq: 1500, to: 100 }); tone(60, 1.2, { vol: .2, delay: .1 }); },
    chargeLost: () => { tone(900, .25, { type: "square", vol: .05, to: 150 }); noise(.15, { vol: .15, freq: 2500, type: "highpass" }); },
    chargeTick: (k) => tone(300 + k * 900, .05, { type: "triangle", vol: .035 }),
    charge: (lvl) => { tone(lvl === 2 ? 1320 : 880, .18, { type: "square", vol: .06 }); tone(lvl === 2 ? 1760 : 1175, .25, { type: "triangle", vol: .07, delay: .06 }); },
    chargeShot: (lvl) => { tone(lvl === 2 ? 1600 : 1100, .35, { type: "sawtooth", vol: .1, to: 200 }); noise(.3 + lvl * .15, { vol: .25 + lvl * .1, freq: 3000, to: 400 }); if (lvl === 2) tone(80, .4, { vol: .3, to: 40 }); },
    reload: () => { tone(500, .05, { type: "square", vol: .05 }); tone(800, .06, { type: "square", vol: .05, delay: .08 }); },
    dash: () => { noise(.25, { vol: .25, freq: 1000, to: 5000, q: 2, type: "bandpass" }); tone(300, .2, { type: "sawtooth", vol: .05, to: 900 }); },
    // Itens e magias de coleta
    heal: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .2, { vol: .12, delay: i * .07 })),
    shield: () => tone(300, .5, { vol: .15, to: 900 }),
    tele: () => { tone(400, .3, { type: "triangle", vol: .15, to: 1600 }); noise(.3, { vol: .1, freq: 2000, to: 6000, type: "bandpass" }); },
    pick: () => { tone(880, .08, { type: "square", vol: .06 }); tone(1320, .12, { type: "square", vol: .06, delay: .07 }); },
    jump: () => tone(300, .08, { vol: .05, to: 520 }),
    doubleJump: () => { tone(420, .18, { type: "triangle", vol: .09, to: 1100 }); noise(.22, { vol: .14, freq: 600, to: 3500, q: 2, type: "bandpass" }); tone(1320, .12, { vol: .04, delay: .08 }); },
    land: () => noise(.06, { vol: .1, freq: 400 }),
    // Estado de jogo
    ko: () => { tone(300, .7, { type: "sawtooth", vol: .1, to: 50 }); noise(.4, { vol: .3, freq: 700 }); tone(880, 1.2, { vol: .08, delay: .1 }); },
    beep: (hi) => tone(hi ? 988 : 659, hi ? .5 : .16, { type: "square", vol: .08 }),
    gong: () => { [110, 220.5, 331, 443].forEach((f, i) => tone(f, 2.2, { vol: .18 / (i + 1), attack: .01 })); noise(.3, { vol: .2, freq: 800 }); },
    roundWin: () => [523, 659, 784].forEach((f, i) => tone(f, .25, { type: "triangle", vol: .12, delay: i * .1 })),
    fanfare: () => [[392, 0], [392, .15], [392, .3], [523, .45], [659, .75], [784, 1.05], [1046, 1.35]].forEach(([f, d]) => { tone(f, .35, { type: "triangle", vol: .14, delay: d }); tone(f / 2, .35, { type: "sine", vol: .1, delay: d }); }),
    // Menu e transições
    nav: () => tone(1200, .04, { type: "square", vol: .035 }),
    confirm: () => { tone(784, .08, { type: "triangle", vol: .1 }); tone(1175, .14, { type: "triangle", vol: .1, delay: .07 }); },
    back: () => tone(500, .08, { type: "triangle", vol: .08, to: 350 }),
    join: () => [659, 880].forEach((f, i) => tone(f, .12, { type: "triangle", vol: .1, delay: i * .08 })),
    whoosh: () => noise(.45, { vol: .2, freq: 300, to: 3000, q: 1.5, type: "bandpass" }),
    whooshOut: () => noise(.45, { vol: .2, freq: 3000, to: 300, q: 1.5, type: "bandpass" }),
  };

  // ───────────────────────── Trilha sonora ─────────────────────────
  // Música eletrônica de luta feita na hora (sem arquivos): bateria, baixo, arpejo, pad e melodia.
  // Cada música tem andamento, tom, sequência de acordes e um "gancho" de melodia gerado a partir de uma semente.
  const MINOR = [0, 2, 3, 5, 7, 8, 10];
  const SONGS = {
    menu:    { bpm: 108, key: 57, prog: [[0, "m"], [-4, "M"], [3, "M"], [-2, "M"]], drums: "chill", seed: 3, lead: "triangle" },
    luta1:   { bpm: 150, key: 50, prog: [[0, "m"], [-4, "M"], [-2, "M"], [-5, "M"]], drums: "four", seed: 11, lead: "square" },
    luta2:   { bpm: 160, key: 52, prog: [[0, "m"], [3, "M"], [-2, "M"], [-4, "M"]], drums: "rock", seed: 7, lead: "sawtooth" },
    luta3:   { bpm: 142, key: 57, prog: [[0, "m"], [0, "m"], [-4, "M"], [-2, "M"]], drums: "half", seed: 23, lead: "square" },
    chefe:   { bpm: 168, key: 48, prog: [[0, "m"], [-4, "M"], [-2, "M"], [-5, "M"]], drums: "double", seed: 31, lead: "sawtooth" },
    zumbi:   { bpm: 118, key: 52, prog: [[0, "m"], [-4, "M"], [-7, "m"], [-1, "M"]], drums: "half", seed: 5, lead: "triangle", spooky: true },
    corrida: { bpm: 178, key: 53, prog: [[0, "m"], [-4, "M"], [-2, "M"], [-5, "M"]], drums: "four", seed: 17, lead: "square" },
    luta4:   { bpm: 132, key: 55, prog: [[0, "m"], [-2, "M"], [-4, "M"], [-2, "M"]], drums: "break", seed: 41, lead: "sawtooth" },
    luta5:   { bpm: 174, key: 49, prog: [[0, "m"], [-4, "M"], [3, "M"], [-2, "M"]], drums: "double", seed: 59, lead: "square" },
    luta6:   { bpm: 124, key: 52, prog: [[0, "m"], [5, "m"], [-4, "M"], [-5, "M"]], drums: "shuffle", seed: 73, lead: "square" },
  };
  const DRUMS = {
    //          kick                          caixa             chimbal
    four:   { k: [0, 4, 8, 12],               s: [4, 12],       h: [2, 6, 10, 14], h16: true },
    rock:   { k: [0, 3, 8, 10],               s: [4, 12],       h: [0, 2, 4, 6, 8, 10, 12, 14] },
    half:   { k: [0, 10],                     s: [8],           h: [0, 2, 4, 6, 8, 10, 12, 14] },
    double: { k: [0, 2, 4, 6, 8, 10, 12, 14], s: [4, 12],       h: [0, 2, 4, 6, 8, 10, 12, 14], h16: true },
    chill:  { k: [0, 7, 10],                  s: [4, 12],       h: [0, 2, 4, 6, 8, 10, 12, 14], soft: true },
    break:  { k: [0, 6, 10],                  s: [4, 12, 15],   h: [0, 2, 4, 6, 8, 10, 12, 14], h16: true },
    shuffle: { k: [0, 8, 11],                 s: [4, 12],       h: [0, 3, 4, 7, 8, 11, 12, 15] },
  };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let musicOn = (() => { try { return localStorage.getItem("duelo_music") !== "0"; } catch { return true; } })();
  let mus = null, musTimer = null, musDuck = 1, musWant = null;
  function seedRng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  // Gancho de 2 compassos: ritmo + qual nota do acorde em cada passo.
  function makeHook(song) {
    const R = seedRng(song.seed * 7919 + 1), notes = [];
    for (let i = 0; i < 32; i++) {
      const strong = i % 4 === 0, p = strong ? .85 : i % 2 === 0 ? .45 : .2;
      notes.push(R() < p ? { d: Math.floor(R() * 5), len: R() < .3 ? 2 : 1, pass: !strong && R() < .25 } : null);
    }
    notes[0] = { d: 2, len: 2 }; notes[16] = { d: 1, len: 2 };
    return notes;
  }
  // Instrumentos (todos ligados no volume da música).
  function mOsc(out, t, f, dur, type, vol, { attack = .004, cutoff = 0, to = 0, detune = 0 } = {}) {
    const a = ac, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    let node = o;
    if (cutoff) { const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.setValueAtTime(cutoff, t); fl.frequency.exponentialRampToValueAtTime(Math.max(120, cutoff * .3), t + dur); node.connect(fl); node = fl; }
    node.connect(g).connect(out); o.start(t); o.stop(t + dur + .02);
  }
  function mNoise(out, t, dur, vol, freq, type, q = 1) {
    const a = ac;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    s.connect(fl).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + dur + .02);
  }
  const kick = (o, t, v = 1) => { mOsc(o, t, 160, .16, "sine", .55 * v, { to: 42 }); mNoise(o, t, .02, .12 * v, 3000, "highpass"); };
  const snare = (o, t, v = 1) => { mNoise(o, t, .16, .22 * v, 1900, "bandpass", .8); mOsc(o, t, 190, .1, "triangle", .12 * v, { to: 140 }); };
  const hat = (o, t, v = 1, open = false) => mNoise(o, t, open ? .14 : .035, .05 * v, 8000, "highpass");
  // Um passo (semicolcheia) da música.
  function playStep(m, t) {
    const S = m.song, D = DRUMS[S.drums], s = m.step % 16, bar = Math.floor(m.step / 16), o = m.gain;
    const [rootOff, q] = S.prog[bar % S.prog.length], third = q === "m" ? 3 : 4, tones = [0, third, 7, 12, 12 + third];
    const root = S.key + rootOff, sec = Math.floor(bar / 8) % 2, intro = bar < 2, fillBar = bar % 8 === 7;
    const sp = 60 / S.bpm / 4;
    // Bateria
    if (D.k.includes(s) && !(intro && s > 0)) kick(o, t, D.soft ? .8 : 1);
    if (!intro && D.s.includes(s)) snare(o, t, D.soft ? .6 : 1);
    if (fillBar && s >= 12 && !intro) snare(o, t, .5 + (s - 12) * .15);
    if (!intro) { if (D.h.includes(s)) hat(o, t, s % 4 === 2 ? 1.2 : .8, D.h16 && s % 4 === 2); else if (D.h16) hat(o, t, .35); }
    if (bar % 8 === 0 && s === 0 && bar > 0) mNoise(o, t, 1.2, .07, 6000, "highpass"); // prato no começo de cada parte
    // Baixo
    const bassN = root - 12;
    let bassHit = null;
    if (S.drums === "four" || S.drums === "double") bassHit = s % 4 === 2 ? bassN : s === 0 ? bassN - 12 : null;
    else if (S.drums === "rock") bassHit = s % 2 === 0 ? (s % 8 === 6 ? bassN + 12 : bassN) : null;
    else bassHit = s === 0 || s === 8 ? bassN : s === 14 ? bassN + 7 : null;
    if (bassHit !== null && !(intro && bar === 0)) mOsc(o, t, midi(bassHit), sp * (S.drums === "half" || S.drums === "chill" ? 3.5 : 1.6), "sawtooth", .15, { cutoff: 900 });
    // Pad (acorde segurado o compasso inteiro)
    if (s === 0) for (const n of [0, third, 7]) { mOsc(o, t, midi(root + n), sp * 16, "sawtooth", .018, { attack: .25, cutoff: 1400, detune: -8 }); mOsc(o, t, midi(root + n), sp * 16, "sawtooth", .018, { attack: .25, cutoff: 1400, detune: 8 }); }
    // Arpejo
    if (!intro) { const n = root + 12 + tones[[0, 1, 2, 3, 2, 1, 4, 2][s % 8]]; mOsc(o, t, midi(n), sp * .9, S.spooky ? "triangle" : "square", .028, { cutoff: 2600 }); }
    // Melodia (o gancho) nas partes B; nas partes A ele aparece mais baixo uma oitava.
    if (bar >= 4) {
      const h = m.hook[(bar % 2) * 16 + s];
      if (h) {
        let n = root + 24 + tones[h.d] - (sec ? 0 : 12);
        if (h.pass) { n += 2; while (!MINOR.includes(((n - S.key) % 12 + 12) % 12)) n--; } // nota de passagem dentro da escala
        mOsc(o, t, midi(n), sp * h.len * 1.1, S.lead, sec ? .06 : .035, { cutoff: sec ? 4200 : 2400, detune: S.spooky ? Math.sin(t * 9) * 25 : 0 });
        if (sec && S.lead !== "triangle") mOsc(o, t, midi(n), sp * h.len * 1.1, S.lead, .025, { cutoff: 3000, detune: 12 });
      }
    }
    if (S.spooky && s === 0 && bar % 2 === 1) mOsc(o, t, midi(root + 30), sp * 8, "sine", .03, { attack: .01 }); // sino assombrado
  }
  function musTick() {
    const a = ctx(); if (!a) return;
    const want = musicOn ? musWant : null;
    if (!mus || mus.name !== want) {
      if (mus) { const g = mus.gain; g.gain.cancelScheduledValues(a.currentTime); g.gain.setValueAtTime(g.gain.value, a.currentTime); g.gain.linearRampToValueAtTime(0, a.currentTime + .5); setTimeout(() => g.disconnect(), 1500); mus = null; }
      if (want && SONGS[want]) {
        const g = a.createGain(); g.gain.value = 0; g.connect(master);
        g.gain.linearRampToValueAtTime(.34 * musDuck, a.currentTime + .6);
        mus = { name: want, song: SONGS[want], gain: g, step: 0, next: a.currentTime + .08, hook: makeHook(SONGS[want]) };
      }
    }
    if (!mus) return;
    const target = .34 * musDuck;
    if (Math.abs(mus.gain.gain.value - target) > .01 && mus.gain.gain.value > 0) mus.gain.gain.setTargetAtTime(target, a.currentTime, .15);
    const sp = 60 / mus.song.bpm / 4;
    // Se o navegador atrasou (aba escondida), pula as notas perdidas em vez de tocar todas juntas.
    while (mus.next < a.currentTime - .03) { mus.next += sp; mus.step++; }
    while (mus.next < a.currentTime + .15) { playStep(mus, mus.next); mus.next += sp; mus.step++; }
  }
  const music = {
    set(name) { musWant = name; if (!musTimer) musTimer = setInterval(musTick, 30); musTick(); },
    duck(v) { musDuck = v; },
    toggle() { musicOn = !musicOn; try { localStorage.setItem("duelo_music", musicOn ? "1" : "0"); } catch {} return musicOn; },
    get on() { return musicOn; },
  };
  return { unlock, play, music, get ready() { return !!ctx(); } };
})();
