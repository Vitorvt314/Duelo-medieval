// Modo Chefão: todos os jogadores (e bots aliados) contra 9 chefões em sequência.
// Cada chefão luta como um bot gigante e, de tempos em tempos, prepara um ataque
// especial — sempre com aviso (brilho vermelho + "!") antes de acontecer.
"use strict";
const BOSSES = [
  { id: "golem", name: "Golem de Pedra", sub: "Ele faz o chão tremer", arena: "deserto", color: "#9a8672", hat: "elmo", outfit: "nenhuma",
    drop: "manoplaGolem", weapon: "clava", sc: 2.1, hp: [98, 82], speed: 0.49, kbMul: .15, dmgMul: .42, specials: ["stomp", "boulder", "spikes"] },
  { id: "esqueleto", name: "Rei Esqueleto", sub: "Senhor dos mortos", arena: "cemiterio", color: "#e6dfcc", hat: "coroa", outfit: "esqueleto",
    drop: "cetroMortos", weapon: "espadaLonga", sc: 1.8, hp: [75, 62], speed: 0.59, kbMul: .2, dmgMul: .31, specials: ["summon", "wave", "dash"] },
  { id: "gelido", name: "Cavaleiro Gélido", sub: "O inverno em armadura", arena: "neve", color: "#8fd3f0", hat: "elmo", outfit: "armadura",
    drop: "lancaGlacial", weapon: "alabarda", sc: 1.9, hp: [88, 72], speed: 0.56, kbMul: .18, dmgMul: .34, specials: ["icicles", "frostnova", "shards"] },
  { id: "ninja", name: "Mestre das Sombras", sub: "Ninguém vê o golpe chegar", arena: "templo", color: "#3a3a52", hat: "bandana", outfit: "ninja",
    drop: "shurikenGigante", weapon: "katana", sc: 1.7, hp: [80, 67], speed: 0.77, kbMul: .25, dmgMul: .4, specials: ["clones", "shurikens", "smokestrike"] },
  { id: "capitao", name: "Capitão Fantasma", sub: "O terror dos sete mares", arena: "porto", color: "#5fd0a8", hat: "pirata", outfit: "pirata", ghost: true,
    drop: "canhaoMao", weapon: "espada", sc: 1.8, hp: [116, 98], speed: 0.66, kbMul: .2, dmgMul: .5, specials: ["cannons", "anchor", "tentacles"] },
  { id: "maestro", name: "Maestro Fantasma", sub: "A última sinfonia", arena: "teatro", color: "#d8c8ff", hat: "cartola", outfit: "real", ghost: true,
    drop: "violino", weapon: "flauta", sc: 1.7, hp: [88, 74], speed: 0.63, kbMul: .25, dmgMul: 2.1, specials: ["notestorm", "soundwave", "requiem"] },
  { id: "feiticeira", name: "Feiticeira Sombria", sub: "Mestra das artes proibidas", arena: "ceu", color: "#8a4fd0", hat: "chapeu", outfit: "manto",
    drop: "cajadoSombrio", weapon: "cajadoFogo", sc: 1.7, hp: [195, 165], speed: 0.63, kbMul: .25, dmgMul: 1.35, specials: ["meteors", "orbring", "blink"] },
  { id: "mecha", name: "Mecha Destruidor", sub: "Sistema de combate ativado", arena: "cidade", color: "#8a96a8", hat: "astronauta", outfit: "espacial",
    drop: "canhaoBraco", weapon: "punhosCiber", sc: 2.2, hp: [112, 92], speed: 0.52, kbMul: .1, dmgMul: 1.25, specials: ["laser", "missiles", "stomp"] },
  { id: "demonio", name: "Senhor das Chamas", sub: "O fogo que nunca se apaga", arena: "vulcao", color: "#d8402a", hat: "chifres", outfit: "real",
    drop: "laminaInfernal", weapon: "espadaFlamejante", sc: 2.0, hp: [98, 78], speed: 0.59, kbMul: .15, dmgMul: .39, specials: ["firepillars", "fireballs", "stomp"] },
];
const SPECIAL_NAMES = { stomp: "Pisão", boulder: "Rocha", spikes: "Espinhos", summon: "Invocar Mortos", wave: "Onda de Lâmina", dash: "Investida", meteors: "Chuva de Meteoros", orbring: "Anel Sombrio", blink: "Teleporte",
  icicles: "Chuva de Gelo", frostnova: "Explosão Glacial", shards: "Estilhaços", cannons: "Fogo dos Canhões", anchor: "Âncora",
  tentacles: "Tentáculos", firepillars: "Colunas de Fogo", fireballs: "Leque de Fogo",
  clones: "Clones Sombrios", shurikens: "Chuva de Shurikens", smokestrike: "Golpe Fantasma",
  notestorm: "Tempestade de Notas", soundwave: "Onda Sonora", requiem: "Réquiem",
  laser: "Raio Laser", missiles: "Mísseis" };

// A vida do chefão cresce com o número de heróis. Valores calibrados simulando
// 3 bots heróis (sorteando entre as 80 armas, com os chefões mais lentos): a maioria dos chefões
// fica entre 40% e 60% de vitória dos heróis; a Feiticeira é a mais difícil
// (pessoas jogam melhor que os bots, então pra família fica desafiador mas possível).
function makeBoss(stage, heroes) {
  const B = BOSSES[stage];
  const pl = { id: "boss", name: B.name, kind: "bot", color: B.color, connected: true, team: "chefe" };
  const f = makeFighter(pl, WALL_R - 230, B.weapon, undefined,
    { sc: B.sc, hp: B.hp[0] + B.hp[1] * Math.max(1, heroes), team: "chefe", color: B.color, hat: B.hat, outfit: B.outfit, speed: B.speed, kbMul: B.kbMul, dmgMul: B.dmgMul, boss: B });
  f.facing = -1;
  f.bs = { cd: 3.5, wind: 0, special: null, last: null, dashT: 0, dashDir: 1, dashHits: new Set(), stomp: false, enraged: false, marks: [], pending: [], minions: 0 };
  return f;
}
const heroes = () => fighters.filter(f => f.alive && f.team === "heroi");

function bossThink(f, dt) {
  const st = f.bs, B = f.boss;
  // Ações atrasadas (ex.: raio depois do teleporte) e marcas de meteoro.
  for (const p of st.pending) { p.t -= dt; if (p.t <= 0 && !p.done) { p.done = true; p.fn(); } }
  st.pending = st.pending.filter(p => !p.done);
  for (const m of st.marks) {
    m.t += dt;
    if (m.proj === "cannon" && !m.fired && m.t >= 0) { m.fired = true; fireCannon(f, m); }
    if (m.t >= m.life && !m.done) {
      m.done = true;
      if (m.proj === "icicle") addProj("icicle", m.x, m.y - 318, Math.PI / 2, 250, f);
      else if (m.proj === "missile") { const sx = m.x + rnd(-120, 120); addProj("rocket", sx, -40, Math.atan2(m.y + 40, m.x - sx), 450, f); sfx.rocket(); }
      else if (!m.noMeteor && !m.proj) { const sx = m.x + rnd(-200, 200); addProj("meteor", sx, -40, Math.atan2(m.y + 20, m.x - sx), 980, f); }
    }
  }
  st.marks = st.marks.filter(m => !m.done);
  if (!st.enraged && f.hp < f.maxHp * .4) {
    st.enraged = true; floatText(f.head.x, f.head.y - 80, "FÚRIA!", "#ff4a4a", 46); sfx.gong(); shake = 16;
  }
  if (st.dashT > 0) { dashStep(f, dt); return; }
  if (st.wind > 0) {
    // Preparando o especial: fica parado, brilhando.
    st.wind -= dt; f.bot.jx = 0; f.bot.atk = false;
    if (rnd() < .5) particles.push({ x: f.neck.x + rnd(-40, 40) * f.sc, y: f.neck.y + rnd(-30, 60) * f.sc, vx: 0, vy: rnd(-90, -40), life: .4, max: .4, color: st.enraged ? "#ff4a4a" : "#ffb34a", size: rnd(3, 6), g: 0, glow: true });
    if (st.wind <= 0) doSpecial(f, st.special);
    return;
  }
  botThink(f, dt);
  st.cd -= dt * (st.enraged ? 1.6 : 1);
  if (st.cd <= 0 && heroes().length) {
    const opts = B.specials.filter(s => s !== st.last);
    st.special = st.last = pick(opts);
    st.wind = st.enraged ? .65 : .9; st.cd = rnd(3.2, 5);
    floatText(f.head.x, f.head.y - 70 * f.sc / 2, SPECIAL_NAMES[st.special], "#ffb34a", 30);
    sfx.beep(true);
  }
}

function nearestHero(f) {
  let best = null, bd = 1e9;
  for (const h of heroes()) { const d = Math.abs(h.pelvis.x - f.pelvis.x); if (d < bd) { bd = d; best = h; } }
  return best;
}
function doSpecial(f, sp) {
  const hs = heroes(), tgt = nearestHero(f), st = f.bs;
  if (!tgt) return;
  const dir = Math.sign(tgt.pelvis.x - f.pelvis.x) || 1;
  f.facing = dir;
  switch (sp) {
    case "stomp":
      // Pula alto e, ao cair, solta uma onda de choque enorme.
      for (const p of [...f.b, ...f.wpts]) { p.vy = -1050; p.vx += dir * 160; }
      st.stomp = true; sfx.jump(); break;
    case "boulder": {
      // Arremessa uma rocha em arco na direção de um herói.
      const t = 1.05, x = f.rh.x, y = f.rh.y - 20, dx = tgt.pelvis.x - x, dy = tgt.pelvis.y - y;
      const vx = dx / t, vy = (dy - .5 * PROJ.boulder.g * t * t) / t;
      addProj("boulder", x, y, Math.atan2(vy, vx), hyp(vx, vy), f); sfx.throw(); break;
    }
    case "spikes":
      for (const h of hs.slice(0, 3)) fx.push({ type: "spikes", owner: f, x: h.pelvis.x, y: surfaceBelow(h.pelvis.x, h.pelvis.y - 10, false), t: -.25, life: 1.0, hit: false, dmg: 12 });
      sfx.rumble(); shake = 8; break;
    case "summon": {
      // Até 4 esqueletos vivos ao mesmo tempo.
      const alive = fighters.filter(m => m.minion && m.alive).length;
      for (let i = 0; i < Math.min(2, 4 - alive); i++) {
        const x = clamp(f.pelvis.x + (i ? 1 : -1) * rnd(90, 160), WALL_L + 60, WALL_R - 60);
        const pl = { id: "npc" + (st.minions++), name: "Esqueleto", kind: "bot", color: "#d8d2c0", connected: true, team: "chefe" };
        const m = makeFighter(pl, x, pick(["espada", "adaga", "machado", "lanca"]), FLOOR - 60, { team: "chefe", hp: 28, color: "#d8d2c0", hat: "elmo", outfit: "esqueleto" });
        m.minion = true; fighters.push(m);
        ring(x, FLOOR - 10, "#b06cff", 70); dust(x, FLOOR, 16, "#8a7a6a");
        for (let k = 0; k < 16; k++) particles.push({ x: x + rnd(-30, 30), y: FLOOR - rnd(0, 20), vx: rnd(-40, 40), vy: rnd(-260, -120), life: .7, max: .7, color: pick(["#b06cff", "#d8d2c0"]), size: rnd(3, 6), g: 300, glow: true });
      }
      sfx.dark(); break;
    }
    case "wave":
      // Onda de lâmina rente ao chão: pulem!
      addProj("wave", f.pelvis.x + dir * 70 * f.sc, FLOOR - 28, dir > 0 ? 0 : Math.PI, 760, f);
      f.atkT = f.w.dur; f.atkSide = dir; f.swingHits.clear(); sfx.swing(true); shake = 8; break;
    case "dash":
      st.dashT = .75; st.dashDir = dir; st.dashHits.clear(); sfx.whoosh(); break;
    case "meteors":
      for (let i = 0; i < 6; i++) {
        const base = hs.length ? pick(hs).pelvis.x : rnd(WALL_L, WALL_R), x = clamp(base + rnd(-140, 140), WALL_L + 40, WALL_R - 40);
        st.marks.push({ x, y: surfaceBelow(x, 0, false), t: -i * .18, life: 1.1, r: 80, color: "#c58bff" });
      }
      sfx.star(); break;
    case "orbring":
      for (let i = 0; i < 12; i++) addProj("bossOrb", f.neck.x, f.neck.y, i * Math.PI / 6, 440, f);
      ring(f.neck.x, f.neck.y, "#c58bff", 120); sfx.dark(); break;
    case "clones": {
      // Dois clones de sombra com katana (somem sozinhos depois de 9s).
      for (let i = 0; i < 2; i++) {
        const x = clamp(f.pelvis.x + (i ? 1 : -1) * rnd(110, 170), WALL_L + 60, WALL_R - 60);
        const pl = { id: "cl" + (st.minions++), name: "Clone Sombrio", kind: "bot", color: "#2a2a40", connected: true, team: "chefe" };
        const m = makeFighter(pl, x, "katana", FLOOR - 60, { team: "chefe", hp: 12, color: "#2a2a40", hat: "bandana", outfit: "ninja", speed: 1.1 });
        m.minion = true; m.clone = true; m.life = 9; fighters.push(m);
        for (let k = 0; k < 18; k++) particles.push({ x: x + rnd(-30, 30), y: FLOOR - rnd(10, 90), vx: rnd(-60, 60), vy: rnd(-60, 10), life: .7, max: .7, color: pick(["#3a3a52", "#5a5a72", "#1a1a2a"]), size: rnd(8, 16), g: -30, puff: true });
      }
      sfx.tele(); break;
    }
    case "shurikens": {
      const a0 = Math.atan2(tgt.neck.y - f.rh.y, tgt.neck.x - f.rh.x);
      for (let i = -3; i <= 3; i++) addProj("shuriken", f.rh.x, f.rh.y, a0 + i * .1, 1250, f, { dmg: 8, spinDir: dir });
      sfx.throw(); break;
    }
    case "smokestrike": {
      // Some numa nuvem de fumaça, aparece atrás do herói e corta.
      const puff = (x, y) => { for (let k = 0; k < 24; k++) particles.push({ x: x + rnd(-40, 40), y: y + rnd(-90, 30), vx: rnd(-80, 80), vy: rnd(-80, 10), life: .8, max: .8, color: pick(["#3a3a52", "#5a5a72", "#8a8aa2"]), size: rnd(10, 20), g: -30, puff: true }); };
      puff(f.pelvis.x, f.pelvis.y);
      const side = -(tgt.facing || 1), nx = clamp(tgt.pelvis.x + side * 110, WALL_L + 60, WALL_R - 60);
      const dx = nx - f.pelvis.x, dy = (tgt.pelvis.y - 30) - f.pelvis.y;
      for (const q of [...f.b, ...f.wpts]) { q.x += dx; q.y += dy; q.ox += dx; q.oy += dy; q.vx = 0; q.vy = 0; }
      puff(f.pelvis.x, f.pelvis.y); sfx.tele();
      f.facing = Math.sign(tgt.pelvis.x - nx) || 1;
      st.pending.push({ t: .3, fn: () => {
        if (!f.alive || !tgt.alive) return;
        f.atkT = f.w.dur; f.atkSide = f.facing; f.swingHits.clear(); sfx.swing(true);
        if (hyp(tgt.neck.x - f.neck.x, tgt.neck.y - f.neck.y) < 220) hurt(tgt, 14, f.facing, -.5, 650, f, { stun: .4, fromX: f.neck.x, snd: "blade" });
      } });
      break;
    }
    case "notestorm":
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; addProj("note", f.neck.x, f.neck.y, a, 520, f, { base: a, wave: rnd(6), glyph: i % 3, dmg: 6 }); }
      ring(f.neck.x, f.neck.y, "#ffd84a", 120); sfx.notes(); break;
    case "soundwave": drumBeat(f, 430, 9); fx.push({ type: "sonic", x: f.neck.x, y: f.neck.y, t: 0, life: .7, r: 430 }); break;
    case "requiem":
      // Todos os heróis ficam tontos (controle invertido) por 3s.
      for (const h of hs) if (hyp(h.neck.x - f.neck.x, h.neck.y - f.neck.y) < 800) { confuse(h, 3); hurt(h, 4, h.neck.x - f.neck.x, -.3, 200, f, { stun: 0, fromX: f.neck.x, snd: "magicHit" }); ring(h.neck.x, h.neck.y, "#ff8af0", 60); }
      floatText(f.head.x, f.head.y - 90, "♪ Réquiem ♪", "#ff8af0", 34); sfx.notes(); sfx.dark(); break;
    case "laser": {
      // Mira, avisa com uma linha vermelha e dispara um raio que atravessa a arena.
      const a = Math.atan2(tgt.neck.y - f.neck.y, tgt.neck.x - f.neck.x);
      fx.push({ type: "lasertell", owner: f, a, t: 0, life: .75 });
      st.pending.push({ t: .75, fn: () => { if (f.alive) castBeam(f, f.neck.x, f.neck.y, a, 18, "rail", 1); } });
      sfx.charge(1); break;
    }
    case "missiles":
      for (let i = 0; i < 7; i++) {
        const b0 = hs.length ? pick(hs).pelvis.x : rnd(WALL_L, WALL_R), x = clamp(b0 + rnd(-170, 170), WALL_L + 40, WALL_R - 40);
        st.marks.push({ x, y: surfaceBelow(x, 0, false), t: -i * .16, life: 1.0, r: 80, color: "#ff4a4a", proj: "missile" });
      }
      sfx.beep(true); break;
    case "icicles":
      // Estalactites aparecem no alto, tremem sobre as marcas e caem.
      for (let i = 0; i < 7; i++) {
        const b0 = hs.length ? pick(hs).pelvis.x : rnd(WALL_L, WALL_R), x = clamp(b0 + rnd(-170, 170), WALL_L + 40, WALL_R - 40);
        st.marks.push({ x, y: surfaceBelow(x, 0, false), t: -i * .14, life: .95, r: 55, color: "#bff0ff", proj: "icicle" });
      }
      sfx.ice(); break;
    case "frostnova": {
      const R = 300 + (st.enraged ? 60 : 0);
      fx.push({ type: "nova", x: f.neck.x, y: f.neck.y + 30 * f.sc, t: 0, life: .55, r: R });
      sfx.ice(); sfx.shock(); shake = Math.max(shake, 12); flashScreen = .05;
      for (const h of hs) {
        const d = hyp(h.neck.x - f.neck.x, h.neck.y - f.neck.y);
        if (d < R && hurt(h, 10, h.neck.x - f.neck.x, -.4, 420, f, { stun: 0, fromX: f.neck.x, snd: "magicHit" })) h.frozen = Math.max(h.frozen, 1.3);
      }
      break;
    }
    case "shards": {
      const a0 = Math.atan2(tgt.neck.y - f.rh.y, tgt.neck.x - f.rh.x);
      for (let i = -3; i <= 3; i++) addProj("ice", f.rh.x, f.rh.y, a0 + i * .12, 950, f, { dmg: 9, freeze: .7 });
      ring(f.rh.x, f.rh.y, "#bff0ff", 60); sfx.ice(); break;
    }
    case "cannons":
      for (let i = 0; i < 6; i++) {
        const b0 = hs.length ? pick(hs).pelvis.x : rnd(WALL_L, WALL_R), x = clamp(b0 + rnd(-160, 160), WALL_L + 50, WALL_R - 50);
        st.marks.push({ x, y: surfaceBelow(x, 0, false), t: -i * .22, life: 1.1, r: 75, color: "#ff8a4a", proj: "cannon" });
      }
      sfx.gong(); break;
    case "anchor": {
      const a0 = Math.atan2(tgt.neck.y - f.rh.y - 20, tgt.neck.x - f.rh.x);
      addProj("anchor", f.rh.x, f.rh.y, a0, 1150, f); sfx.throw(); break;
    }
    case "tentacles":
      for (const h of hs.slice(0, 4)) fx.push({ type: "spikes", style: "tentacle", owner: f, x: h.pelvis.x, y: surfaceBelow(h.pelvis.x, h.pelvis.y - 10, false), t: -.2, life: 1.15, hit: false, dmg: 12 });
      sfx.bubble(); sfx.rumble(); break;
    case "firepillars": {
      const xs = hs.slice(0, 4).map(h => [h.pelvis.x, surfaceBelow(h.pelvis.x, h.pelvis.y - 10, false)]);
      for (let i = 0; i < 2; i++) { const x = rnd(WALL_L + 80, WALL_R - 80); xs.push([x, surfaceBelow(x, FLOOR - 5, false)]); }
      xs.forEach(([x, y], i) => fx.push({ type: "spikes", style: "fire", burn: true, owner: f, x, y, t: -.12 * i, life: 1.1, hit: false, dmg: 11 }));
      sfx.fire(); break;
    }
    case "fireballs": {
      const a0 = Math.atan2(tgt.neck.y - f.rh.y, tgt.neck.x - f.rh.x);
      for (let i = -2; i <= 2; i++) addProj("fire", f.rh.x, f.rh.y, a0 + i * .2, 720, f);
      ring(f.rh.x, f.rh.y, "#ff7a1a", 70); sfx.fire(); break;
    }
    case "blink": {
      // Some, aparece acima de um herói e lança um raio pra baixo.
      stars(f.pelvis.x, f.pelvis.y - 40, "#c58bff", 30);
      const dx = clamp(tgt.pelvis.x, WALL_L + 80, WALL_R - 80) - f.pelvis.x, dy = 170 - f.pelvis.y;
      for (const p of [...f.b, ...f.wpts]) { p.x += dx; p.y += dy; p.ox += dx; p.oy += dy; p.vx = 0; p.vy = -200; }
      stars(f.pelvis.x, f.pelvis.y - 40, "#c58bff", 30); sfx.tele();
      // Marca amarela no chão embaixo dela: o raio cai ali logo em seguida.
      st.marks.push({ x: f.pelvis.x, y: surfaceBelow(f.pelvis.x, f.pelvis.y + 80, false), t: 0, life: .5, r: 60, color: "#ffe95a", noMeteor: true });
      st.pending.push({ t: .5, fn: () => { if (f.alive) castBeam(f, f.neck.x, f.neck.y + 30, Math.PI / 2, 13); } });
      break;
    }
  }
}
// Bala de canhão disparada do navio (canto da tela) que cai exatamente na marca.
function fireCannon(f, m) {
  const sx = m.x < W / 2 ? WALL_R - 30 : WALL_L + 30, sy = 70, T = m.life, g = PROJ.cannonball.g;
  const vx = (m.x - sx) / T, vy = (m.y - 12 - sy - .5 * g * T * T) / T;
  const pr = addProj("cannonball", sx, sy, Math.atan2(vy, vx), hyp(vx, vy), f); pr.vx = vx; pr.vy = vy;
  ring(sx, sy, "#ffb34a", 40); for (let i = 0; i < 8; i++) particles.push({ x: sx, y: sy, vx: rnd(-80, 80), vy: rnd(-80, 20), life: .8, max: .8, color: "#9a9a9a", size: rnd(8, 14), g: -30, puff: true });
  sfx.thud(); shake = Math.max(shake, 4);
}
// Investida: corre reto e atropela quem estiver no caminho.
function dashStep(f, dt) {
  const st = f.bs;
  st.dashT -= dt; f.bot.jx = st.dashDir; f.bot.jy = 0; f.speed = 2.2;
  if (rnd() < .8) dust(f.pelvis.x - st.dashDir * 30, FLOOR, 2, "#d8c8a8");
  for (const h of heroes()) {
    if (st.dashHits.has(h.id)) continue;
    if (touches(h, f.neck.x, f.neck.y, f.pelvis.x, f.pelvis.y + 30 * f.sc, 26 * f.sc)) { st.dashHits.add(h.id); hurt(h, 14, st.dashDir, -.6, 720, f, { stun: .4, fromX: f.neck.x, snd: "blunt" }); }
  }
  if (st.dashT <= 0 || f.pelvis.x < WALL_L + 60 || f.pelvis.x > WALL_R - 60) { st.dashT = 0; f.speed = f.boss.speed; f.bot.jx = 0; shake = Math.max(shake, 6); }
}
function bossLanded(f) {
  if (!f.bs || !f.bs.stomp) return;
  f.bs.stomp = false;
  shockwave(f, f.pelvis.x, surfaceBelow(f.pelvis.x, f.pelvis.y, false), 340, 16);
  flashScreen = .08;
}

// Desenho: marcas de meteoro, aviso do especial e aura de fúria.
function drawBossLayer(c) {
  for (const f of fighters) {
    if (!f.boss || !f.alive) continue;
    const st = f.bs;
    for (const m of st.marks) {
      const k = clamp(m.t / m.life, 0, 1), pulse = .5 + Math.sin(time * (10 + k * 20)) * .5;
      c.save(); c.strokeStyle = m.color; c.globalAlpha = .35 + pulse * .5; c.lineWidth = 3 + k * 3;
      c.beginPath(); c.ellipse(m.x, m.y, m.r, m.r * .22, 0, 0, 7); c.stroke();
      c.fillStyle = m.color; c.globalAlpha = .1 + k * .25; c.beginPath(); c.ellipse(m.x, m.y, m.r * k, m.r * .22 * k, 0, 0, 7); c.fill(); c.restore();
      if (m.proj === "icicle" && m.t >= 0) {
        const x = m.x + Math.sin(time * 60) * 2 * k;
        c.save(); c.translate(x, m.y - 330); c.globalAlpha = Math.min(1, m.t * 5); c.fillStyle = "#120c09"; c.beginPath(); c.moveTo(-10, -32); c.lineTo(10, -32); c.lineTo(0, 22); c.fill();
        c.fillStyle = "#bff0ff"; c.beginPath(); c.moveTo(-8, -30); c.lineTo(8, -30); c.lineTo(0, 18); c.fill();
        c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(-5, -30); c.lineTo(0, -30); c.lineTo(-1, 8); c.fill(); c.restore();
      }
    }
    if (st.enraged || st.wind > 0) {
      const cx = (f.head.x + f.pelvis.x) / 2, cy = (f.head.y + f.pelvis.y) / 2 + 20 * f.sc, r = 85 * f.sc;
      const g = c.createRadialGradient(cx, cy, r * .3, cx, cy, r);
      const col = st.wind > 0 ? "255,180,74" : "255,60,60", a = st.wind > 0 ? .35 + Math.sin(time * 30) * .15 : .18 + Math.sin(time * 6) * .06;
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.7, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`);
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.restore();
    }
  }
}
function drawBossWarnings(c) {
  for (const f of fighters) {
    if (!f.boss || !f.alive || f.bs.wind <= 0) continue;
    const s = 1 + Math.sin(time * 20) * .12, x = f.head.x, y = f.head.y - 60 * f.sc;
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = "#ffb34a"; c.strokeStyle = "#120c09"; c.lineWidth = 5;
    c.beginPath(); c.moveTo(0, -30); c.lineTo(26, 16); c.lineTo(-26, 16); c.closePath(); c.stroke(); c.fill();
    c.fillStyle = "#120c09"; c.font = "bold 30px Georgia"; c.textAlign = "center"; c.fillText("!", 0, 11);
    c.restore();
  }
}
