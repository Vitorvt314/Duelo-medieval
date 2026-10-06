// Duelo Medieval — lógica do jogo que roda na TV/PC.
// Depende de: weapons.js, arenas.js, audio.js. Depois dele: events.js, bosses.js, ui.js.
"use strict";
// ───────────────────────── Configuração ─────────────────────────
const W = ARENA_W, H = ARENA_H, FLOOR = ARENA_FLOOR, WALL_L = 30, WALL_R = W - 30, G = 1900;
// Multiplicador de dano de TODAS as armas, projéteis e magias. Abaixe pra lutas mais longas.
const DAMAGE_SCALE = .45;
// Tiro carregado (estilo Mega Man): segure o ataque. Nível 1 a partir de 0,45s, nível 2 com 1,1s.
const CHARGE_L1 = .45, CHARGE_FULL = 1.1, CHARGE_MUL = [1, 2, 3.2], CHARGE_SIZE = [1, 1.6, 2.4];
const CHARGE_COLOR = ["", "#ffe95a", "#5affd8"];
const WIN_SCORE = 5, MAX_HP = 100, DT = 1 / 120, SELECT_TIME = 45, INTRO_TIME = 2.6, LOOKS_TIME = 45;
const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#b06cff", "#ff8c2a", "#1fd1b5", "#ff6fb5"];
const HATS = ["elmo", "chifres", "chapeu", "coroa", "capuz", "bandana", "pluma", "tiara"];
const BOT_NAMES = ["IA Merlin", "IA Lancelot", "IA Joana", "IA Arthur", "IA Morgana", "IA Robin"];
let PLATFORMS = ARENAS[0].platforms;

// Projéteis. Dano: armas físicas de distância > magia (cajados/varinha).
const PROJ = {
  arrow:   { g: 650, r: 4,  dmg: 14, kb: 260, stick: true, life: 3, snd: "pierce" },
  bolt:    { g: 100, r: 4,  dmg: 24, kb: 460, stick: true, life: 3, snd: "pierce" },
  stone:   { g: 950, r: 6,  dmg: 10, kb: 300, bounce: 2, life: 4, snd: "blunt" },
  axe:     { g: 950, r: 9,  dmg: 13, kb: 320, stick: true, life: 3, snd: "blade" },
  flask:   { g: 950, r: 7,  dmg: 6,  kb: 150, cloud: true, life: 4, snd: "blunt" },
  chakram: { g: 0,   r: 13, dmg: 11, kb: 260, pierce: true, life: 4, snd: "blade" },
  fire:    { g: 120, r: 12, explode: 13, life: 2.5 },
  ice:     { g: 0,   r: 6,  dmg: 5,  kb: 100, freeze: .7, life: 1.6, snd: "magicHit" },
  spark:   { g: 0,   r: 5,  dmg: 3,  kb: 70,  life: 1.1, snd: "magicHit" },
  seed:    { g: 700, r: 7,  dmg: 4,  kb: 80,  vines: true, life: 3, snd: "magicHit" },
  orb:     { g: 0,   r: 9,  dmg: 5,  kb: 200, life: 3.5, snd: "magicHit" },
  star:    { g: 500, r: 10, dmg: 5,  kb: 160, ghost: true, life: 2.2, snd: "magicHit" },
  // Armas de energia (sci-fi)
  laser:   { g: 0,   r: 4,  dmg: 7,  kb: 120, life: .9, snd: "magicHit" },
  plasma:  { g: 200, r: 12, explode: 12, boomR: 85, life: 2 },
  pellet:  { g: 0,   r: 4,  dmg: 4,  kb: 160, life: .28, snd: "magicHit" },
  sticky:  { g: 900, r: 7,  dmg: 3,  kb: 60,  sticky: true, life: 6, snd: "blunt" },
  rocket:  { g: 0,   r: 9,  explode: 18, boomR: 140, life: 3 },
  cryo:    { g: 0,   r: 6,  dmg: 4,  kb: 80,  freeze: .5, life: 1, snd: "magicHit" },
  droneShot: { g: 0, r: 4,  dmg: 4,  kb: 100, life: 1, snd: "magicHit" },
  thrown:  { g: 900, r: 13, dmg: 8,  kb: 420, life: 4, snd: "blunt" },
  // Ataques de chefões e de arenas
  boulder: { g: 900, r: 24, explode: 14, boomR: 110, safe: true, life: 4 },
  wave:    { g: 0,   r: 28, dmg: 16, kb: 560, pierce: true, life: 2.4, snd: "blade" },
  meteor:  { g: 1300, r: 16, explode: 12, boomR: 95, life: 4 },
  bossOrb: { g: 0,   r: 11, dmg: 9,  kb: 260, life: 4, snd: "magicHit" },
  icicle:  { g: 1600, r: 8, dmg: 12, kb: 300, freeze: .6, life: 3, snd: "magicHit" },
  cannonball: { g: 900, r: 12, explode: 13, boomR: 100, life: 4 },
  anchor:  { g: 300, r: 13, dmg: 10, kb: 0,   pull: true, life: 1.4, snd: "blunt" },
  flamewave: { g: 0, r: 20, dmg: 7,  kb: 300, pierce: true, burn: true, life: .55, snd: "fire" },
  // Música, místicas e especiais
  note:    { g: 0,   r: 9,  dmg: 5,  kb: 160, life: 1.4, snd: "magicHit" },
  charm:   { g: 0,   r: 9,  dmg: 3,  kb: 80,  life: 2.2, homing: 2.6, snd: "magicHit" },
  shuriken: { g: 120, r: 5, dmg: 4,  kb: 120, stick: true, life: 1.6, snd: "blade" },
  bigshuriken: { g: 0, r: 24, dmg: 11, kb: 320, pierce: true, life: 4, snd: "blade" },
  kiball:  { g: 0,   r: 8,  dmg: 5,  kb: 200, life: 1.2, snd: "magicHit" },
  buster:  { g: 0,   r: 6,  dmg: 6,  kb: 160, life: 1,   snd: "magicHit" },
  coin:    { g: 900, r: 7,  dmg: 4,  kb: 120, life: 3,   snd: "blunt" },
  xbomb:   { g: 900, r: 15, life: 9 },
  pea:     { g: 0,   r: 7,  dmg: 8,  kb: 140, life: 1.4, snd: "blunt" },
  bouncefire: { g: 1500, r: 8, dmg: 5, kb: 200, bounce: 5, burn: true, life: 3, snd: "fire" },
  web:     { g: 250, r: 8,  dmg: 2,  kb: 0,   web: true, life: .75, snd: "magicHit" },
  powerorb: { g: 0,  r: 14, explode: 9, boomR: 110, life: 2 },
  starshield: { g: 0, r: 15, dmg: 8, kb: 340, pierce: true, life: 4, snd: "blunt" },
  kunai:   { g: 200, r: 7,  dmg: 6,  kb: 0,   pull: true, life: .55, snd: "blade" },
  capture: { g: 1000, r: 9, dmg: 1,  kb: 0,   life: 3, snd: "blunt" },
  tornado: { g: 0,   r: 34, dmg: 4,  kb: 0,   pierce: true, lift: true, life: 1.8, snd: "blunt" },
  block:   { g: 1600, r: 26, dmg: 12, kb: 420, pierce: true, life: 3, snd: "blunt" },
  hook:    { g: 500, r: 8,  dmg: 5,  kb: 0,   fling: true, life: 1, snd: "blunt" },
  bubble:  { g: -60, r: 16, dmg: 1,  kb: 0,   trap: "bubble", trapT: 1.2, life: 2.5, snd: "magicHit" },
  sheepbolt: { g: 0, r: 9,  dmg: 1,  kb: 0,   sheep: 2.5, homing: 1.6, life: 1.5, snd: "magicHit" },
  cupid:   { g: 500, r: 5,  dmg: 2,  kb: 0,   charm: 2, life: 3, snd: "pierce" },
  yoyo:    { g: 0,   r: 10, dmg: 6,  kb: 260, pierce: true, life: 2, snd: "blunt" },
  flame:   { g: -200, r: 13, dmg: 1.3, kb: 50, pierce: true, burn: true, life: .33, snd: "fire" },
  leaf:    { g: 0,   r: 8,  dmg: 4,  kb: 140, homing: 2.2, life: 1.4, snd: "blade" },
  construct: { g: 0,  r: 24, dmg: 10, kb: 600, pierce: true, life: .7, snd: "blunt" },
  goldlasso: { g: 300, r: 13, dmg: 3, kb: 0,  life: .65, snd: "blunt" },
  terrabeam: { g: 0,  r: 20, dmg: 8,  kb: 280, pierce: true, life: .55, snd: "blade" },
  water:   { g: 500, r: 9,  dmg: 2,  kb: 190, life: .7, snd: "blunt" },
  // Mega Buster (poderes dos robôs)
  cutter:    { g: 0,    r: 12, dmg: 7,  kb: 220, pierce: true, life: 2.5, snd: "blade" },
  gutsblock: { g: 1100, r: 22, dmg: 14, kb: 520, life: 3, snd: "blunt" },
  rockfrag:  { g: 1200, r: 8,  dmg: 5,  kb: 220, life: 1.5, snd: "blunt" },
  iceslash:  { g: 0,    r: 10, dmg: 5,  kb: 120, pierce: true, freeze: .7, life: .9, snd: "magicHit" },
  hyperbomb: { g: 1100, r: 9,  explode: 15, boomR: 120, safe: true, life: 4 },
  firestorm: { g: 0,    r: 12, dmg: 6,  kb: 240, burn: true, life: .9, snd: "fire" },
  thunder:   { g: 0,    r: 12, dmg: 7,  kb: 200, pierce: true, life: .7, snd: "magicHit" },
  // Poderes das armas
  windslash: { g: 0,    r: 26, dmg: 11, kb: 380, pierce: true, life: .65, snd: "blade" },
  boomaxe:   { g: 0,    r: 14, dmg: 10, kb: 300, pierce: true, life: 3, snd: "blade" },
  saberdisc: { g: 0,    r: 22, dmg: 9,  kb: 260, pierce: true, life: 3, snd: "blade" },
  firework:  { g: 0,    r: 8,  explode: 7, boomR: 80, homing: 3.2, safe: true, life: 1.6 },
  wreck:     { g: 700,  r: 18, dmg: 15, kb: 950, life: 1.2, snd: "blunt" },
  tidal:     { g: 0,    r: 34, dmg: 9,  kb: 600, pierce: true, life: 1.4, snd: "blunt" },
  tnt:       { g: 0,    r: 24, life: 12 },
  megabomb:  { g: 0,    r: 55, life: 9 },
  minecart:  { g: 0,    r: 26, life: 3 },
  rocketfist: { g: 0,   r: 13, explode: 13, boomR: 100, safe: true, life: 1.4 },
  // Armas lendárias e magias novas
  bfg:       { g: 0,    r: 22, explode: 24, boomR: 210, life: 3.2 },
  swordbeam: { g: 0,    r: 14, dmg: 8,  kb: 260, pierce: true, life: .6, snd: "blade" },
  portal:    { g: 0,    r: 8,  dmg: 3,  kb: 120, life: 1.2, snd: "magicHit" },
  voidorb:   { g: 0,    r: 14, dmg: 4,  kb: 0,   life: 1.3, snd: "magicHit" },
  leviathan: { g: 0,    r: 16, dmg: 12, kb: 360, pierce: true, freeze: .8, life: 3, snd: "blade" },
  feather:   { g: 0,    r: 10, dmg: 4,  kb: 160, pierce: true, homing: 6, life: 2.4, snd: "blade" },
};
const STONES = [["poder", "#b06cff", "Joia do Poder"], ["espaco", "#5a8aff", "Joia do Espaço"], ["realidade", "#ff3a3a", "Joia da Realidade"],
                ["alma", "#ffa030", "Joia da Alma"], ["tempo", "#3aff8a", "Joia do Tempo"], ["mente", "#ffe95a", "Joia da Mente"]];
// Projéteis que voltam pra mão de quem jogou.
const RETURNERS = new Set(["chakram", "bigshuriken", "starshield", "yoyo", "cutter", "boomaxe", "saberdisc", "leviathan"]);
const NO_AMMO_RET = new Set(["cutter", "boomaxe", "saberdisc", "leviathan"]); // voltam, mas não são munição da arma
const MAGIC = {
  fogo:      { name: "Bola de Fogo",  icon: "🔥", uses: 2, color: "#ff7a1a" },
  raio:      { name: "Raio",          icon: "⚡", uses: 2, color: "#ffe95a" },
  gelo:      { name: "Gelo",          icon: "❄️", uses: 2, color: "#8fe3ff" },
  cura:      { name: "Poção de Vida", icon: "❤️", uses: 1, color: "#ff5a7a" },
  escudo:    { name: "Escudo Arcano", icon: "🛡️", uses: 1, color: "#7aa8ff" },
  teleporte: { name: "Teleporte",     icon: "✨", uses: 2, color: "#d17aff" },
};
const TRAIL = { fire: ["#ff7a1a", "#ffd84a", "#ff3a1a"], ice: ["#bff0ff", "#ffffff"], orb: ["#6a2fa0", "#c58bff"], spark: ["#ff8af0", "#ffffff"], star: ["#7ad8ff", "#ffffff"], flask: ["#7dff9a"],
                seed: ["#7dff6a", "#3f9a3a"], chakram: ["#ffe9a0"], laser: ["#ff6a6a"], plasma: ["#7dff6a", "#d8ffcf"], pellet: ["#ffb33a"],
                rocket: ["#ffd84a", "#888", "#aaa"], cryo: ["#8fe3ff", "#ffffff"], droneShot: ["#5ac8ff"], meteor: ["#ff7a1a", "#ffd84a", "#444"], boulder: ["#8a7a6a", "#5a4a3a"], bossOrb: ["#c58bff", "#ff4ad8"], wave: ["#ffffff", "#c9d6ff"],
                icicle: ["#bff0ff", "#ffffff"], note: ["#ffd84a", "#ffffff"], charm: ["#ff8af0", "#ffffff"], kiball: ["#8fe3ff", "#ffffff"], buster: ["#ffe95a"], coin: ["#ffd84a"], bouncefire: ["#ff7a1a", "#ffd84a"], powerorb: ["#b06cff", "#ffffff"], sheepbolt: ["#ffffff", "#ffd0f0"], bubble: ["#dff4ff"], cannonball: ["#666", "#999", "#ffb34a"], flamewave: ["#ff7a1a", "#ffd84a", "#ff3a1a"] };

Object.assign(TRAIL, { iceslash: ["#bff0ff", "#ffffff"], firestorm: ["#ff7a1a", "#ffd84a", "#ff3a1a"], thunder: ["#fff27a", "#ffffff"], windslash: ["#e8f8ff", "#bff0ff"],
  hyperbomb: ["#ffd84a"], rocketfist: ["#5affd8", "#ffd84a", "#ff7a1a"], tidal: ["#bff0ff", "#5ac8ff", "#ffffff"], leaf: ["#7dff6a", "#3f9a3a"], firework: ["#ff8af0", "#ffd84a", "#7ad8ff", "#7dff6a"], water: ["#7ad8ff", "#bff0ff", "#ffffff"] });
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hyp = Math.hypot;
const sfx = Sound.play;
addEventListener("pointerdown", () => { Sound.unlock(); hideSoundHint(); });
addEventListener("keydown", () => { Sound.unlock(); hideSoundHint(); });
function hideSoundHint() { const el = document.getElementById("sound"); if (el) el.classList.add("off"); }

// ───────────────────────── Física (PBD) ─────────────────────────
// plat: este ponto pousa em plataformas? Só os pés dos vivos (e o corpo todo dos derrotados).
function P(x, y, r = 5, im = 1) { return { x, y, ox: x, oy: y, vx: 0, vy: 0, r, im, ground: false, noPlat: false, plat: false }; }
function stick(a, b, stiff = 1) { return { a, b, len: hyp(b.x - a.x, b.y - a.y), stiff }; }
function solve(s) {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, d = hyp(dx, dy) || .0001;
  const w = s.a.im + s.b.im; if (!w) return;
  const k = (d - s.len) / d / w * s.stiff;
  s.a.x += dx * k * s.a.im; s.a.y += dy * k * s.a.im;
  s.b.x -= dx * k * s.b.im; s.b.y -= dy * k * s.b.im;
}
function surfaceBelow(x, y, noPlat) {
  let best = FLOOR;
  if (!noPlat) for (const p of PLATFORMS) if (x > p.x && x < p.x + p.w && p.y >= y && p.y < best) best = p.y;
  return best;
}
// Quanto a arena cresce pra cada lado (mais jogadores = arena mais larga). O cenário é estendido espelhando as bordas.
let arenaExt = 0, frameTop = WALL_FACE;
// Moldura da arena: com a arena mais larga, o teto sobe pra manter o formato da tela (a arena enche a TV).
function computeFrame() { const iw = ARENA_W + 2 * arenaExt - 2 * WALL_FACE; frameTop = Math.min(WALL_FACE, (ARENA_H - WALL_FACE) - iw * ARENA_H / ARENA_W); }
const wallLeft = (y) => -arenaExt + wallDepth(arenaWalls(arena).L, y), wallRight = (y) => ARENA_W + arenaExt - wallDepth(arenaWalls(arena).R, y);
function arenaExtFor(n) { return mode === "corrida" ? 0 : n <= 2 ? 0 : n <= 4 ? 130 : n <= 6 ? 230 : 300; }
// Plataformas perto das bordas ganham uma cópia espelhada na parte estendida.
function extendPlatforms() {
  if (!arenaExt) return;
  const X = arenaExt, add = [];
  for (const p of arena.platforms) {
    if (p.x < X) add.push({ ...p, x: -p.x - p.w, mirror: true });
    if (p.x + p.w > ARENA_W - X) add.push({ ...p, x: 2 * ARENA_W - p.x - p.w, mirror: true });
  }
  PLATFORMS.push(...add);
}
// Bater com força na parede: quica de volta, racha a parede e levanta poeira.
function wallBounce(f) {
  if (!f.alive || (f.wallCd || 0) > time || (mode === "corrida" && race)) return;
  const v = f._vx || 0; if (Math.abs(v) < 950) return;
  const side = v < 0 ? -1 : 1, wx = side < 0 ? wallLeft(f.pelvis.y) : wallRight(f.pelvis.y);
  if (Math.abs(f.pelvis.x - wx) > 40 * f.sc) return;
  f.wallCd = time + .45;
  for (const p of [...f.b, ...f.wpts]) p.vx = -v * .42;
  f.extT = Math.max(f.extT || 0, .4);
  hurt(f, Math.min(9, (Math.abs(v) - 900) / 100), -side, -.2, 0, null, { env: true, quiet: true, stun: .3, snd: "blunt" });
  fx.push({ type: "wallcrack", x: wx, y: f.pelvis.y - 10, side, t: 0, life: 2.5, seed: Math.floor(rnd(1e6)) });
  dust(wx, f.pelvis.y, 16, "#c8b8a0"); shake = Math.max(shake, 10); sfx.thud();
  for (let i = 0; i < 10; i++) particles.push({ x: wx, y: f.pelvis.y + rnd(-30, 30), vx: -side * rnd(80, 320), vy: rnd(-300, -60), life: .7, max: .7, color: pick(["#8a7a6a", "#5a4a3a", "#c8b8a0"]), size: rnd(3, 6), g: 1200 });
}
function collideWorld(p) {
  p.ground = false;
  if (p.y + p.r > FLOOR) { p.y = FLOOR - p.r; p.ground = true; }
  if (p.plat && !p.noPlat) for (const pl of PLATFORMS) {
    if (p.x > pl.x && p.x < pl.x + pl.w && p.oy + p.r <= pl.y + 2 && p.y + p.r > pl.y) { p.y = pl.y - p.r; p.ground = true; }
  }
  collideBlocks(p);
  if (mode === "corrida" && race) {
    if (p.x - p.r < WALL_L) p.x = WALL_L + p.r;
    if (p.x + p.r > WALL_R) p.x = WALL_R - p.r;
  } else {
    // Paredes da arena: a colisão segue o desenho da parede em cada altura.
    const wl = wallLeft(p.y), wr = wallRight(p.y);
    if (p.x - p.r < wl) p.x = wl + p.r;
    if (p.x + p.r > wr) p.x = wr - p.r;
  }
  const ceil = mode === "corrida" && race ? 6 : frameTop;
  if (p.y - p.r < ceil) p.y = ceil + p.r; // teto: a parede de cima segura todo mundo
}
// Menor distância entre dois segmentos (p1-q1 e p2-q2); s = posição ao longo do primeiro.
function segSeg(p1x, p1y, q1x, q1y, p2x, p2y, q2x, q2y) {
  const d1x = q1x - p1x, d1y = q1y - p1y, d2x = q2x - p2x, d2y = q2y - p2y, rx = p1x - p2x, ry = p1y - p2y;
  const a = d1x * d1x + d1y * d1y, e = d2x * d2x + d2y * d2y, f = d2x * rx + d2y * ry;
  let s, t;
  if (a <= 1e-6 && e <= 1e-6) { s = t = 0; }
  else if (a <= 1e-6) { s = 0; t = clamp(f / e, 0, 1); }
  else {
    const c = d1x * rx + d1y * ry;
    if (e <= 1e-6) { t = 0; s = clamp(-c / a, 0, 1); }
    else {
      const b = d1x * d2x + d1y * d2y, den = a * e - b * b;
      s = den !== 0 ? clamp((b * f - c * e) / den, 0, 1) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    }
  }
  const x = p1x + d1x * s, y = p1y + d1y * s;
  return { d: hyp(x - (p2x + d2x * t), y - (p2y + d2y * t)), s, x, y };
}
const touches = (f, x1, y1, x2, y2, r) => f.parts.some(p => segSeg(x1, y1, x2, y2, p.a.x, p.a.y, p.b.x, p.b.y).d < p.r + r);

// ───────────────────────── Arena ─────────────────────────
let arena = ARENAS[0], arenaIdx = 0, ambient = [];
const bgCache = new Map(), thumbs = new Map();
function arenaCanvas(a) {
  if (!bgCache.has(a.id)) {
    // Pinta na resolução da tela (até 2x) e guarda só as últimas arenas, pra não gastar memória.
    const q = Math.min(2, Math.max(1, (innerWidth * (devicePixelRatio || 1)) / ARENA_W));
    bgCache.set(a.id, paintArena(a, document.createElement("canvas"), q));
    if (bgCache.size > 6) { const k = bgCache.keys().next().value; bgCache.delete(k); const old = ARENAS.find(x => x.id === k); if (old) old.fg = old.platCv = null; }
  }
  return bgCache.get(a.id);
}
function arenaThumb(a) {
  if (!thumbs.has(a.id)) { const t = document.createElement("canvas"); t.width = 320; t.height = 180; const tc = t.getContext("2d"); tc.drawImage(arenaCanvas(a), 0, 0, 320, 180); if (a.platCv) tc.drawImage(a.platCv, 0, 0, 320, 180); thumbs.set(a.id, t.toDataURL("image/jpeg", .8)); }
  return thumbs.get(a.id);
}
function setArena(i) { arenaIdx = i; arena = ARENAS[i]; PLATFORMS = [...arena.platforms]; ambient = []; arenaCanvas(arena); }
function nextArenaForRound() {
  if (mode === "chefe" && arenaChoice === "random") return ARENAS.findIndex(a => a.id === BOSSES[bossStage].arena);
  if (arenaChoice !== "random") return arenaChoice;
  let i; do { i = Math.floor(Math.random() * ARENAS.length); } while (i === arenaIdx && ARENAS.length > 1);
  return i;
}

// ───────────────────────── Relíquias ─────────────────────────
// Armas que só caem dos chefões. Quem pega usa nos próximos chefões, e a relíquia
// fica desbloqueada para sempre nesta TV (aparece no menu de escolha).
let relicsUnlocked = (() => { try { return JSON.parse(localStorage.getItem("duelo_relics") || "[]").filter(r => RELICS.includes(r)); } catch { return []; } })();
function unlockRelic(id) {
  if (relicsUnlocked.includes(id)) return false;
  relicsUnlocked.push(id);
  try { localStorage.setItem("duelo_relics", JSON.stringify(relicsUnlocked)); } catch {}
  return true;
}
// Lista do menu de escolha: armas comuns + relíquias já conquistadas.
const choiceList = () => [...SELECTABLE, ...RELICS.filter(r => relicsUnlocked.includes(r))];
let toastMsg = null;
function showToast(text, color = "#e8b84a") { toastMsg = { text, color, t: 0 }; }

// ───────────────────────── Jogadores ─────────────────────────
const players = new Map(); // id -> {id,name,color,score,kind,input,choice,ready,cursor}
let botCount = 0, mode = "aleatorio", arenaChoice = "random", bossStage = 0;
function nextColor() { const used = new Set([...players.values()].map(p => p.color)); return [...COLORS, ...LOOK_COLORS.map(c => c[0])].find(c => !used.has(c)) || pick(COLORS); }
// Visual escolhido no celular (cor, roupa, chapéu). Cor já usada por outro jogador é recusada.
function setLook(p, m) {
  if (LOOK_COLORS.some(c => c[0] === m.color) && ![...players.values()].some(o => o !== p && o.connected && o.color === m.color)) p.color = m.color;
  if (LOOK_HATS.some(h => h[0] === m.hat)) p.hat = m.hat;
  if (LOOK_OUTFITS.some(o => o[0] === m.outfit)) p.outfit = m.outfit;
  for (const f of fighters) if (f.id === p.id && !f.boss) { f.color = p.color; f.hat = p.hat; f.outfit = p.outfit; }
  refreshLobby();
}
// Teclado: troca cor/roupa/chapéu no menu, andando pela lista.
function cycleLook(p, what) {
  const list = what === "color" ? LOOK_COLORS : what === "hat" ? LOOK_HATS : LOOK_OUTFITS;
  const cur = list.findIndex(x => x[0] === p[what]);
  for (let i = 1; i <= list.length; i++) {
    const id = list[(cur + i) % list.length][0];
    if (what === "color" && [...players.values()].some(o => o !== p && o.connected && o.color === id)) continue;
    setLook(p, { [what]: id }); sfx.nav(); return;
  }
}
function newInput() { return { jx: 0, jy: 0, atk: false, mag: false, aiming: false, ax: 0, ay: 0, atkAim: null, magAim: null, charging: false, grab: false, grabHeld: false, dash: false, dashHeld: false, sp: false }; }
function addPlayer(id, name, kind) {
  if (players.has(id)) { const p = players.get(id); p.name = name; p.connected = true; refreshLobby(); return p; }
  const p = { id, name, kind, color: nextColor(), score: 0, input: newInput(), connected: true, choice: null, ready: false, cursor: 0 };
  // Visual inicial: cada um com chapéu e roupa diferentes (o celular pode trocar depois).
  const n = players.size;
  p.hat = kind === "bot" ? pick(LOOK_HATS.slice(1))[0] : HATS[Math.max(0, COLORS.indexOf(p.color)) % HATS.length];
  p.outfit = LOOK_OUTFITS[1 + (n * 4 + (kind === "bot" ? 7 : 0)) % (LOOK_OUTFITS.length - 1)][0];
  players.set(id, p); refreshLobby();
  if (kind !== "bot") sfx.join();
  return p;
}
function humans() { return [...players.values()].filter(p => p.kind !== "bot" && p.connected); }
function syncBots() {
  for (const [id, p] of players) if (p.kind === "bot") players.delete(id);
  // No Chefão e na Sobrevivência os bots lutam do lado dos jogadores; nos outros, completam a partida.
  const n = teamMode() ? Math.max(botCount, humans().length ? 0 : 1) : Math.max(botCount, 2 - humans().length);
  for (let i = 0; i < n; i++) addPlayer("bot" + i, BOT_NAMES[i % BOT_NAMES.length], "bot");
  refreshLobby();
}
const canEditSettings = () => phase === "lobby" || phase === "over";
const MODES = ["aleatorio", "escolha", "chefe", "bomba", "zumbi", "corrida"];
// Modos em que os jogadores lutam juntos, do mesmo lado (contra chefão ou zumbis).
const teamMode = () => mode === "chefe" || mode === "zumbi";
function setMode(m) { if (canEditSettings() && MODES.includes(m) && m !== mode) { mode = m; refreshLobby(); sfx.nav(); } }
function shiftArena(d) {
  if (!canEditSettings()) return;
  const opts = ["random", ...ARENAS.map((_, i) => i)];
  const i = opts.indexOf(arenaChoice);
  arenaChoice = opts[(i + d + opts.length) % opts.length];
  if (arenaChoice !== "random") setArena(arenaChoice);
  refreshLobby(); sfx.nav();
}
function shiftBots(d) { if (!canEditSettings()) return; botCount = clamp(botCount + d, 0, 6); refreshLobby(); sfx.nav(); }

// ───────────────────────── Lutadores ─────────────────────────
// Times: no modo Chefão, "heroi" contra "chefe" (sem fogo amigo). Nos outros modos, todos contra todos.
const isEnemy = (a, b) => !!b && b.alive && a !== b && !(a && a.team && a.team === b.team);
let fighters = [];
// opts: sc (tamanho), hp, team, color, hat, speed, kbMul (quanto é empurrado), dmgMul, boss
function makeFighter(pl, x, wid, y, opts = {}) {
  const s = opts.sc || 1;
  y = y ?? FLOOR - 50 * s;
  const pose = [[0, -62, 13], [0, -42, 6], [0, 0, 8], [-12, -28, 4], [-20, -12, 5], [12, -28, 4], [20, -12, 5], [-8, 22, 4], [-10, 44, 5], [8, 22, 4], [10, 44, 5]];
  const b = pose.map(([dx, dy, r]) => P(x + dx * s, y + dy * s, r * s));
  const [head, neck, pelvis, le, lh, re, rh, lk, lf, rk, rf] = b;
  lf.plat = rf.plat = true;
  const sticks = [stick(head, neck), stick(neck, pelvis), stick(neck, le), stick(le, lh), stick(neck, re), stick(re, rh),
                  stick(pelvis, lk), stick(lk, lf), stick(pelvis, rk), stick(rk, rf), stick(head, pelvis, .3)];
  // Hitbox: cápsulas do corpo. m = multiplicador de dano (cabeça dói mais, membros menos).
  const parts = [
    { a: head, b: head, r: 13 * s, m: 1.4, head: true }, { a: neck, b: pelvis, r: 9 * s, m: 1 },
    { a: neck, b: le, r: 5 * s, m: .8 }, { a: le, b: lh, r: 5 * s, m: .8 }, { a: neck, b: re, r: 5 * s, m: .8 }, { a: re, b: rh, r: 5 * s, m: .8 },
    { a: pelvis, b: lk, r: 6 * s, m: .9 }, { a: lk, b: lf, r: 6 * s, m: .85 }, { a: pelvis, b: rk, r: 6 * s, m: .9 }, { a: rk, b: rf, r: 6 * s, m: .85 },
  ];
  const color = opts.color || pl.color, maxHp = opts.hp || MAX_HP;
  const f = { pl, id: pl.id, color, sc: s, team: opts.team ?? pl.team ?? null, boss: opts.boss || null,
              hat: opts.hat || pl.hat || HATS[Math.max(0, COLORS.indexOf(pl.color)) % HATS.length], outfit: opts.outfit || pl.outfit || "nenhuma", b, head, neck, pelvis, le, lh, re, rh, lk, lf, rk, rf, sticks, parts,
              hp: maxHp, maxHp, speed: opts.speed || 1, kbMul: opts.kbMul ?? 1, dmgMul: opts.dmgMul || 1,
              alive: true, facing: x < W / 2 ? 1 : -1, aim: 0, botAim: 0, aimErr: 0, jumps: 1, upHeld: false, walk: rnd(6), wasGround: true,
              atkT: 0, atkCd: 0, magic: null, uses: 0, slowT: 0, trapT: 0, trapKind: null, charmT: 0, charmBy: null, sheepT: 0, hasteT: 0, webT: 0, zipT: 0, shield: 0, frozen: 0, stun: 0, rooted: 0, burn: 0, burnTick: 0, burnBy: null, lavaCd: 0,
              hitCd: {}, swingHits: new Set(), clashCd: 0, dropT: 0,
              think: 0, sp: 0, dashCd: 0, dodgeT: 0, dashFx: 0, grabCd: 0, armorT: 0, reachT: 0, escape: 0, thrownT: 0, pumCd: 0, grabT: 0,
              bot: pl.kind === "bot" ? { jx: 0, jy: 0, atk: false, mag: false } : null, flash: 0, punchR: true, trail: [], castT: 0, blockFx: 0 };
  f.aim = f.facing > 0 ? -.2 : Math.PI + .2;
  setWeapon(f, wid);
  return f;
}
function setWeapon(f, type) {
  const W_ = WEAPONS[type], g = f.rh, dir = f.facing, s = f.sc;
  f.wtype = type; f.w = W_; f.wpts = []; f.wsticks = []; f.ball = null; f.wtip = null; f.chain = null; f.trail = [];
  f.atkT = 0; f.atkCd = Math.min(f.atkCd, .2); f.ammo = W_.ammo || 0; f.reload = W_.reload || 0;
  f.clip = W_.clip || 0; f.clipT = 0; f.combo = 0; f.sweepT = 0; f.charge = 0; f.chargeLvl = 0;
  f.bombT = 0; f.mcT = 0; f.mmPow = 0; f.mmEn = type === "canhaoBraco" ? Array(MM_POWERS.length).fill(MM_MAX) : null; f.sk = null; f.skillCd = Math.min(f.skillCd || 0, 1.5);
  if (f.bot) f.bot.charging = false;
  if (W_.kind === "punch" || W_.kind === "claws") return;
  const tip = P(g.x + dir * W_.L * .7 * s, g.y - W_.L * .7 * s, 4 * s, W_.im);
  f.wpts.push(tip); f.wsticks.push(stick(g, tip));
  f.wtip = tip;
  if (type === "mangual") {
    let prev = tip;
    for (let i = 0; i < 3; i++) { const c = P(prev.x + dir * 14 * s, prev.y, 3 * s, 1.4); f.wpts.push(c); f.wsticks.push(stick(prev, c)); prev = c; }
    const ball = P(prev.x + dir * 14 * s, prev.y, 11 * s, .7); f.wpts.push(ball); f.wsticks.push(stick(prev, ball)); f.ball = ball;
  } else if (W_.kind === "whip") {
    let prev = tip; f.chain = [tip];
    for (let i = 0; i < 9; i++) { const c = P(prev.x + dir * 14 * s, prev.y, (i === 8 ? 5 : 3) * s, 1.6); f.wpts.push(c); f.wsticks.push(stick(prev, c)); f.chain.push(c); prev = c; }
  }
}
function roundWeapon(p) {
  if (mode === "aleatorio" || mode === "bomba" || mode === "corrida") return "punhos";
  if (mode === "chefe" && p.relic) return p.relic; // relíquia pega num chefão anterior
  return p.choice || pick(SELECTABLE);
}
// Quem conecta (ou aperta uma tecla) no meio da rodada entra na hora, caindo do céu.
function spawnLate(p) {
  if ((phase !== "fight" && phase !== "intro") || fighters.some(f => f.id === p.id)) return;
  if (mode !== "aleatorio" && !p.choice) p.choice = pick(SELECTABLE);
  p.team = teamMode() ? "heroi" : null;
  const f = makeFighter(p, rnd(WALL_L + 150, WALL_R - 150), roundWeapon(p), 120);
  fighters.push(f);
  stars(f.pelvis.x, f.pelvis.y - 30, p.color, 20);
}
function allPoints() { const a = []; for (const f of fighters) a.push(...f.b, ...f.wpts); return a; }

// ───────────────────────── Fases e transições ─────────────────────────
// lobby → (select) → intro → fight → between → intro … → over
let phase = "lobby", phaseT = 0, banner = "", round = 0, selT = 0, selGrace = 0, lastWinner = null, bossWon = false;
let projectiles = [], particles = [], pickups = [], fx = [], pickupT = 0;
let shake = 0, slowmo = 0, hitstop = 0, time = 0, flashScreen = 0;
let trans = null; // cortina: { t, mid, done }

function transition(mid) {
  if (trans) return;
  trans = { t: 0, mid, done: false };
  sfx.whoosh();
}
function startMatch() {
  if (!canEditSettings() || trans) return;
  sfx.confirm();
  transition(() => {
    for (const p of players.values()) { p.score = 0; p.relic = null; p.kills = 0; }
    round = 0; bossStage = 0; bossWon = false; syncBots();
    document.getElementById("lobby").classList.add("off");
    enterLooks();
  });
}
// ── Tela de Personagens: todos aparecem grandes, lado a lado; cada um ajusta o visual no celular.
let looksT = 0, looksGrace = 0;
function enterLooks() {
  phase = "looks"; phaseT = 0; looksT = LOOKS_TIME; looksGrace = 1; fighters = []; projectiles = []; pickups = []; fx = [];
  for (const p of players.values()) p.lookReady = p.kind === "bot";
}
function updateLooks(dt) {
  looksT -= dt;
  if (humans().every(p => p.lookReady)) looksGrace -= dt; else looksGrace = 1;
  if ((looksT <= 0 || looksGrace <= 0) && !trans) transition(() => mode === "aleatorio" || mode === "bomba" || mode === "corrida" ? startIntro() : enterSelect());
}
function enterSelect() {
  phase = "select"; phaseT = 0; selT = SELECT_TIME; selGrace = 1.2; fighters = []; projectiles = []; pickups = []; fx = [];
  for (const p of players.values()) {
    p.ready = false;
    if (p.kind === "bot") { p.choice = pick(SELECTABLE); p.ready = true; }
    if (p.choice) p.cursor = Math.max(0, choiceList().indexOf(p.choice));
  }
}
function updateSelect(dt) {
  selT -= dt;
  const allReady = humans().every(p => p.ready);
  if (allReady) selGrace -= dt; else selGrace = 1.2;
  if ((selT <= 0 || selGrace <= 0) && !trans) {
    for (const p of players.values()) if (!p.choice) p.choice = choiceList()[p.cursor] || pick(SELECTABLE);
    transition(startIntro);
  }
}
function startIntro() {
  round++;
  setArena(mode === "corrida" ? 0 : nextArenaForRound());
  const list = [...players.values()].filter(p => p.connected);
  arenaExt = arenaExtFor(list.length + (mode === "chefe" ? 1 : 0)); extendPlatforms(); computeFrame();
  for (const p of list) p.team = teamMode() ? "heroi" : null;
  bomb = null; zw = null; race = null; cutin = null;
  const n = list.length;
  if (mode === "chefe") {
    // Heróis do lado esquerdo, chefão do lado direito.
    fighters = list.map((p, i) => makeFighter(p, WALL_L + 120 + i * 110, roundWeapon(p)));
    fighters.push(makeBoss(bossStage, list.length));
  } else if (mode === "corrida") {
    // Corrida: todos na largada, à frente da Morte.
    fighters = list.map((p, i) => makeFighter(p, 420 + i * 75, roundWeapon(p)));
    startRace();
  } else {
    fighters = list.map((p, i) => makeFighter(p, -arenaExt + WALL_L + 120 + (W + 2 * arenaExt - 2 * WALL_L - 240) * (n === 1 ? .5 : i / (n - 1)), roundWeapon(p)));
  }
  projectiles = []; pickups = []; fx = []; particles = [];
  phase = "intro"; phaseT = 0; banner = "";
  // No Chefão o vulcão não entra em erupção (o chefe não sabe escalar).
  Events.reset(mode === "corrida" || (mode !== "aleatorio" && mode !== "escolha" && arena.event === "erupcao") ? null : arena);
  for (const p of players.values()) Object.assign(p.input, { jx: 0, jy: 0, atk: false, mag: false, atkAim: null, magAim: null, aiming: false, charging: false, grab: false, grabHeld: false, dash: false, dashHeld: false, sp: false, powHeld: false });
}
function beginFight() {
  phase = "fight"; phaseT = 0;
  if (mode === "aleatorio") {
    const n = Math.min(3, fighters.length);
    for (let i = 0; i < n; i++) spawnPickup("weapon", WALL_L + 200 + i * (W - 2 * WALL_L - 400) / Math.max(1, n - 1));
    pickupT = 2;
  } else pickupT = 4;
  if (mode === "bomba") bomb = { holder: null, wait: 1.2 };
  if (mode === "zumbi") { zw = zombieWave(1); showToast("Onda 1 · Sobrevivam!", "#9adf6a"); }
}
function endRound() {
  if (mode === "chefe") return endBossRound();
  if (mode === "zumbi") return endZombies();
  const alive = fighters.filter(f => f.alive);
  const winner = mode === "corrida" ? (race && race.order[0]) || null : alive.length === 1 ? alive[0].pl : null;
  lastWinner = winner;
  if (winner) winner.score++;
  if (winner && winner.score >= WIN_SCORE) {
    phase = "over"; phaseT = 0; banner = `${winner.name} é o campeão!`;
    sfx.fanfare();
  } else {
    phase = "between"; phaseT = 0; banner = winner ? `${winner.name} venceu a rodada` : "Empate!";
    sfx.roundWin();
  }
}
function endBossRound() {
  const boss = fighters.find(f => f.boss);
  lastWinner = null;
  if (boss && !boss.alive) {
    bossStage++;
    if (bossStage >= BOSSES.length) { phase = "over"; phaseT = 0; bossWon = true; banner = "Vocês derrotaram todos os chefões!"; sfx.fanfare(); }
    else { phase = "between"; phaseT = 0; banner = `${boss.pl.name} foi derrotado!`; sfx.roundWin(); }
  } else { phase = "between"; phaseT = 0; banner = "Derrota! Tentem de novo"; sfx.ko(); }
}
function goLobby() {
  transition(() => { phase = "lobby"; fighters = []; projectiles = []; fx = []; pickups = []; banner = ""; Events.reset(null); document.getElementById("lobby").classList.remove("off"); refreshLobby(); });
}

// ───────────────────────── Modo Bomba ─────────────────────────
// Batata quente: um jogador começa com a bomba; batendo em alguém, ela passa pra ele.
// Ninguém perde vida com golpes. Quando o tempo acaba, quem estiver com ela explode.
let bomb = null; // { holder, t, max, passCd, wait, sec }
function startBomb() {
  const alive = fighters.filter(f => f.alive);
  if (alive.length < 2) { bomb = null; return; }
  const f = pick(alive), t = rnd(13, 19);
  bomb = { holder: f, t, max: t, passCd: 1, wait: 0, sec: 99 };
  for (const x of fighters) x.speed = x === f ? 1.15 : 1;
  showToast(`A bomba está com ${f.pl.name}!`, "#ff6a4a"); sfx.beep(true); buzz(f.id, 300);
}
function passBomb(to) {
  bomb.holder.speed = 1; to.speed = 1.15; bomb.holder = to; bomb.passCd = .5;
  floatText(to.head.x, to.head.y - 70, "PEGOU A BOMBA!", "#ff6a4a", 26); ring(to.head.x, to.head.y - 40, "#ff6a4a", 50); sfx.beep(); buzz(to.id, 250);
}
function updateBomb(dt) {
  if (!bomb) return;
  if (!bomb.holder) { if ((bomb.wait -= dt) <= 0) startBomb(); return; }
  const h = bomb.holder;
  if (!h.alive) { bomb = { holder: null, wait: 1.5 }; return; }
  bomb.passCd -= dt; bomb.t -= dt;
  const sec = Math.ceil(bomb.t);
  if (sec !== bomb.sec) { bomb.sec = sec; if (sec <= 5 && sec > 0) sfx.beep(sec <= 2); }
  if (bomb.t > 0) return;
  // BUM!
  const x = h.head.x, y = h.head.y - 30;
  sfx.boom(); sfx.shock(); shake = 28; flashScreen = .14;
  ring(x, y, "#ffb34a", 230); ring(x, y, "#ffffff", 140);
  for (let i = 0; i < 70; i++) { const a = rnd(Math.PI * 2), sp = rnd(150, 700); particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(.4, .9), max: .9, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a", "#555", "#ffffff"]), size: rnd(5, 14), g: -100, glow: true }); }
  for (const o of fighters) {
    if (o === h || !o.alive) continue;
    const dx = o.neck.x - x, dy = o.neck.y - y, d = hyp(dx, dy);
    if (d < 280) { const k = 900 * (1 - d / 280); for (const q of [...o.b, ...o.wpts]) { q.vx += dx / (d || 1) * k; q.vy += dy / (d || 1) * k - 200; } o.stun = Math.max(o.stun, .35); o.extT = 1; }
  }
  floatText(x, y - 40, "BUM!", "#ffd84a", 64);
  h.speed = 1; kill(h, 0, -1, 1100);
  bomb = fighters.filter(f => f.alive).length >= 2 ? { holder: null, wait: 2 } : null;
}
// Bot no modo Bomba: com a bomba, persegue o mais perto; sem ela, foge de quem está com ela.
function bombThink(f, dt) {
  const bot = f.bot, h = bomb.holder; f.think -= dt;
  const others = fighters.filter(e => e !== f && e.alive);
  if (!others.length) return;
  let tgt = h;
  if (f === h) { let best = 1e9; for (const e of others) { const d = hyp(e.pelvis.x - f.pelvis.x, e.pelvis.y - f.pelvis.y); if (d < best) { best = d; tgt = e; } } }
  f.botAim = Math.atan2(tgt.head.y - f.neck.y, tgt.head.x - f.neck.x) + f.aimErr;
  if (f.think > 0) return;
  f.think = rnd(.08, .18); f.aimErr = rnd(-.2, .2);
  const dx = tgt.pelvis.x - f.pelvis.x, dy = tgt.pelvis.y - f.pelvis.y, d = hyp(dx, dy);
  if (f === h) {
    bot.jx = Math.abs(dx) > 30 ? Math.sign(dx) : 0;
    bot.jy = (dy < -90 && rnd() < .5) || rnd() < .04 ? -1 : dy > 90 && rnd() < .3 ? 1 : 0;
    if (d < 80 && rnd() < .7) bot.atk = true;
  } else {
    const away = -Math.sign(dx) || 1, cornered = (away < 0 && f.pelvis.x < WALL_L + 140) || (away > 0 && f.pelvis.x > WALL_R - 140);
    if (d < 420) { bot.jx = cornered ? -away : away; bot.jy = cornered && d < 220 ? -1 : rnd() < .06 ? -1 : 0; }
    else { bot.jx = rnd() < .3 ? rnd(-.5, .5) : 0; bot.jy = rnd() < .03 ? -1 : 0; }
    if (d < 70 && rnd() < .4) bot.atk = true; // empurra pra longe
    if (f.magic && d < 200 && rnd() < .4) { f.botAim = Math.atan2(-.6, away); bot.mag = true; }
  }
}

// ───────────────────────── Sobrevivência (zumbis) ─────────────────────────
// Ondas cada vez maiores. Quem cai volta no fim da onda; acaba quando todos caem juntos.
let zw = null; // { wave, toSpawn, spawnT, breakT, n, giant }
let zRecord = (() => { try { return +localStorage.getItem("duelo_zumbi_record") || 0; } catch { return 0; } })(), zNewRecord = false;
const ZCOLORS = ["#6a9a4a", "#7aa85a", "#5a8a6a", "#8aa86a", "#6a8a4a"];
function zombieWave(w, n = 0) { return { wave: w, toSpawn: 3 + w * 2, spawnT: 1.5, breakT: 0, n, giant: w % 5 === 0 }; }
function spawnZombie(giant) {
  const hs = fighters.filter(f => f.alive && f.team === "heroi");
  let x, tries = 0;
  do { x = rnd(WALL_L + 60, WALL_R - 60); } while (++tries < 25 && hs.some(h => Math.abs(h.pelvis.x - x) < 260));
  const w = zw.wave, pl = { id: `z${zw.n++}`, name: giant ? "Zumbi Gigante" : "Zumbi", kind: "bot", color: pick(ZCOLORS), connected: true, team: "zumbi" };
  const opts = giant
    ? { sc: 1.6, hp: 70 + w * 8, speed: .6, kbMul: .4, dmgMul: .45 + w * .03, team: "zumbi", hat: "nenhum", outfit: "ferreiro", color: "#4a7a3a" }
    : { hp: 16 + w * 4, speed: Math.min(.95, .55 + w * .03), dmgMul: .4 + w * .035, team: "zumbi", hat: pick(["nenhum", "nenhum", "bandana", "capuz", "elmo"]), outfit: pick(["nenhuma", "tunica", "couro", "pirata", "ferreiro", "cota"]) };
  const z = makeFighter(pl, x, giant ? "clava" : w >= 4 && rnd() < .3 ? "garras" : "punhos", undefined, opts);
  z.zombie = true; z.minion = true;
  if (hs.length) z.facing = Math.sign(hs[0].pelvis.x - x) || 1;
  // Sai da terra: poeira e terra voando.
  dust(x, FLOOR, giant ? 30 : 16, "#6a5a3a");
  for (let i = 0; i < 12; i++) particles.push({ x: x + rnd(-25, 25), y: FLOOR - 4, vx: rnd(-120, 120), vy: rnd(-380, -160), life: .6, max: .6, color: pick(["#5a4a2a", "#7a6a4a", "#3a2a1a"]), size: rnd(3, 6), g: 1200 });
  if (giant) { sfx.rumble(); shake = Math.max(shake, 10); floatText(x, FLOOR - 200, "ZUMBI GIGANTE!", "#9adf6a", 34); }
  fighters.push(z);
}
function updateZombies(dt) {
  if (!zw) return;
  // Corpos de zumbi somem depois de um tempo (pra não pesar).
  fighters = fighters.filter(f => !(f.zombie && !f.alive && (f.deadT = (f.deadT || 0) + dt) > 3));
  const alive = fighters.filter(f => f.zombie && f.alive).length;
  if (zw.breakT > 0) {
    if ((zw.breakT -= dt) <= 0) { zw = zombieWave(zw.wave + 1, zw.n); showToast(`Onda ${zw.wave}${zw.giant ? " · Zumbi Gigante!" : ""}`, "#9adf6a"); sfx.gong(); }
  } else if (zw.toSpawn > 0) {
    if ((zw.spawnT -= dt) <= 0 && alive < 8) {
      spawnZombie(zw.giant && !zw.giantDone); zw.giantDone = true;
      zw.toSpawn--; zw.spawnT = Math.max(.35, 1.4 - zw.wave * .07);
    }
  } else if (!alive) {
    // Onda vencida: cura todo mundo e quem caiu volta do céu.
    zw.breakT = 4; saveZRecord(zw.wave);
    showToast(`Onda ${zw.wave} concluída!`, "#e8b84a"); sfx.roundWin();
    for (const f of [...fighters]) {
      if (f.team !== "heroi" || f.minion) continue;
      if (f.alive) heal(f, 30);
      else if (f.pl.connected !== false) {
        fighters = fighters.filter(x => x !== f);
        const nf = makeFighter(f.pl, rnd(WALL_L + 150, WALL_R - 150), roundWeapon(f.pl), 120);
        fighters.push(nf); stars(nf.pelvis.x, nf.pelvis.y - 30, f.pl.color, 20); floatText(nf.head.x, nf.head.y - 50, "Voltou!", "#9adf6a", 24);
      }
    }
  }
}
const zombiesLeft = () => zw ? zw.toSpawn + fighters.filter(f => f.zombie && f.alive).length : 0;
function saveZRecord(w) {
  if (w > zRecord) { zRecord = w; zNewRecord = true; try { localStorage.setItem("duelo_zumbi_record", String(w)); } catch {} }
}
function endZombies() {
  zNewRecord = false; saveZRecord(zw ? zw.wave : 1);
  phase = "over"; phaseT = 0; lastWinner = null; banner = `Vocês chegaram à onda ${zw ? zw.wave : 1}`;
  if (zNewRecord) sfx.fanfare(); else sfx.ko();
}

// ───────────────────────── Controle dos lutadores ─────────────────────────
function spring(p, tx, ty, k, c, dt, rvx = 0, rvy = 0) {
  p.vx += (k * (tx - p.x) - c * (p.vx - rvx)) * dt;
  p.vy += (k * (ty - p.y) - c * (p.vy - rvy)) * dt;
}
// ───────────────────────── Controle de grupo (gelo, atordoar, prender...) ─────────────────────────
// Ninguém fica travado pra sempre: quem passa mais de CC_MAX segundos preso num curto espaço de tempo se solta
// sozinho ("LIVRE!") e fica um tempinho imune. O congelamento também tem recarga por alvo.
const CC_MAX = 1.3, CC_IMMUNE = 2.5, FREEZE_CAP = 1.0, FREEZE_CD = 2.4, STUN_CAP = .8;
// Congela respeitando a recarga: se acabou de ser congelado, só fica lento ("gelado").
function applyFreeze(e, t, o = {}) {
  if (!e.alive) return false;
  if ((e.ccImmune || 0) > 0 || time - (e.freezeAt ?? -9) < (o.cd ?? FREEZE_CD)) { slowDown(e, Math.min(1.2, t)); return false; }
  e.freezeAt = time; e.frozen = Math.max(e.frozen, Math.min(t, o.cap ?? FREEZE_CAP) * (e.boss ? .4 : 1)); e.stun = 0;
  return true;
}
function clearCC(f) {
  f.frozen = Math.min(f.frozen, 0); f.stun = Math.min(f.stun, 0); f.rooted = Math.min(f.rooted, 0);
  if (f.trapT > 0) endTrap(f);
  if (f.sheepT > 0) f.sheepT = 0; if (f.charmT > 0) f.charmT = 0; if ((f.truthT || 0) > 0) f.truthT = 0; if (f.webT > 0) f.webT = 0;
}
function ccStep(f, dt) {
  if (f.boss) { if (f.stun > .5) f.stun = .5; return; }
  if (time < (f.tstopT || 0)) return; // tempo parado do especial: não conta
  if (f.stun > STUN_CAP) f.stun = STUN_CAP;
  f.ccImmune = (f.ccImmune || 0) - dt;
  if (f.ccImmune > 0) { clearCC(f); return; }
  const held = f.frozen > 0 || f.stun > .2 || f.trapT > 0 || f.rooted > 0 || f.sheepT > 0 || f.charmT > 0 || (f.truthT || 0) > 0;
  f.ccLoad = held ? (f.ccLoad || 0) + dt : Math.max(0, (f.ccLoad || 0) - dt * .7);
  if (f.ccLoad > CC_MAX && !f.grabbedBy) {
    clearCC(f); f.ccImmune = CC_IMMUNE; f.ccLoad = 0;
    floatText(f.head.x, f.head.y - 80 * f.sc, "LIVRE!", "#ffffff", 28); ring(f.neck.x, f.neck.y + 10, "#ffffff", 90); poof(f, "#dff4ff"); sfx.shield();
  }
}
function control(f, dt) {
  const inp = f.bot || f.pl.input, s = f.sc;
  f.slowT -= dt; f.charmT -= dt; f.sheepT -= dt; f.hasteT -= dt; f.webT -= dt; f.truthT = (f.truthT || 0) - dt; f.cloakT = (f.cloakT || 0) - dt; f.reflectT = (f.reflectT || 0) - dt;
  if (f.trapT > 0 && (f.trapT -= dt) <= 0) endTrap(f);
  if (f.sheepWas && f.sheepT <= 0) { f.sheepWas = false; poof(f, "#ffffff"); }
  f.atkCd -= dt; f.atkT -= dt; f.shield -= dt; f.frozen -= dt; f.stun -= dt; f.rooted -= dt; f.clashCd -= dt; f.dropT -= dt; f.flash -= dt; f.castT -= dt; f.blockFx -= dt; f.lavaCd -= dt;
  for (const k in f.hitCd) f.hitCd[k] -= dt;
  if (f.w.ammo && f.ammo < f.w.ammo && !projectiles.some(p => RETURNERS.has(p.kind) && p.owner === f)) { f.reload -= dt; if (f.reload <= 0) { f.ammo++; f.reload = f.w.reload; } }
  if (f.clipT > 0 && (f.clipT -= dt) <= 0) { f.clip = f.w.clip; sfx.reload(); }
  if (f.comboT > 0 && (f.comboT -= dt) <= 0) f.combo = 0;
  if (!f.alive) return;
  f.skillCd = (f.skillCd || 0) - dt;
  f.dashCd -= dt; f.dodgeT -= dt; f.dashFx -= dt; f.grabCd -= dt; f.armorT -= dt; f.reachT -= dt;
  ccStep(f, dt);
  if (f.dashFx > 0) for (let i = 0; i < 2; i++) particles.push({ x: f.neck.x + rnd(-10, 10), y: lerp(f.head.y, f.pelvis.y + 40 * f.sc, rnd()), vx: -f.facing * rnd(250, 550), vy: 0, life: .22, max: .22, color: pick([f.color, "#ffffff"]), size: rnd(2, 4), g: 0, glow: true, line: true });
  if (f.sp >= 100 && rnd() < .45) particles.push({ x: f.neck.x + rnd(-22, 22) * f.sc, y: lerp(f.head.y, f.pelvis.y + 40 * f.sc, rnd()), vx: rnd(-25, 25), vy: rnd(-170, -70), life: .5, max: .5, color: pick([f.color, "#ffffff"]), size: rnd(3, 6), g: -40, glow: true });
  if (f.grabbedBy) {
    if (!f.grabbedBy.alive || f.grabbedBy.grabbing !== f) f.grabbedBy = null;
    else {
      if (inp.atk || inp.mag || inp.grab || inp.dash || inp.sp) f.escape += 1;
      if (Math.abs(inp.jx) > .5 && Math.sign(inp.jx) !== f.escDir) { f.escape += .5; f.escDir = Math.sign(inp.jx); }
      if (f.bot && rnd() < 1.6 * dt) f.escape += 1;
    }
  }
  if (f.thrownT > 0) {
    // Arremessado: atropela quem estiver no caminho.
    f.thrownT -= dt; const by = f.thrownBy;
    for (const e of fighters) if (e !== f && e !== by && e.alive && by && isEnemy(by, e) && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 52 * Math.max(f.sc, e.sc)) {
      hurt(e, 9, (e.neck.x - f.neck.x) || 1, -.6, 520, by, { stun: .5, fromX: f.neck.x, snd: "blunt" }); f.thrownT = 0; break;
    }
  }
  if (f.rageT > 0) {
    // Fúria do Ogro: mais força, mais rápido e mais pesado enquanto dura.
    f.rageT -= dt; f.hasteT = Math.max(f.hasteT, .05);
    if (rnd() < .5) particles.push({ x: f.neck.x + rnd(-18, 18) * f.sc, y: lerp(f.neck.y, f.pelvis.y + 30, rnd()), vx: rnd(-20, 20), vy: rnd(-140, -60), life: .4, max: .4, color: pick(["#ff3a2a", "#ff7a3a", "#ffd0a0"]), size: rnd(3, 6), g: -60, glow: true });
    if (f.rageT <= 0) { f.dmgMul = f.rageBase ?? 1; f.kbMul = f.rageKb ?? 1; poof(f, "#ff7a6a"); }
  }
  if (f.mmEn) for (let i = 1; i < f.mmEn.length; i++) f.mmEn[i] = Math.min(MM_MAX, f.mmEn[i] + dt * .9);
  if (f.mmSlowT > 0) { f.mmSlowT -= dt; if (f.atkCd > 0) f.atkCd += dt * .5; } // Tempo Lento: ataques demoram mais
  if (f.sweepT > 0) sweepStep(f, dt);
  if (f.flameT > 0) flameStep(f, dt);
  if (f.jetT > 0) {
    f.jetT -= dt;
    const back = Math.atan2(-f.neck.vy, -f.neck.vx), bx = f.neck.x - f.facing * 14 * f.sc, by = f.neck.y + 14 * f.sc;
    if (rnd() < .6) addProj("flame", bx, by, back + rnd(-.25, .25), rnd(350, 500), f);
  }
  // Gelo: estoura em cristais quando congela e se quebra quando acaba.
  const iced = f.frozen > 0 && !(time < (f.tstopT || 0));
  if (iced && !f.wasFrozen) { f.frozenAt = time; f.iceSeed = rnd(1000); iceBurst(f, false); }
  else if (!iced && f.wasFrozen) iceBurst(f, true);
  f.wasFrozen = iced;
  // Queimadura: dano aos poucos e chamas no corpo.
  if (f.burn > 0) {
    f.burn -= dt; f.burnTick -= dt;
    if (rnd() < .6) particles.push({ x: f.neck.x + rnd(-10, 10) * s, y: lerp(f.neck.y, f.pelvis.y, rnd()), vx: rnd(-20, 20), vy: rnd(-120, -60), life: .4, max: .4, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(3, 7), g: -80, glow: true });
    if (f.burnTick <= 0 && phase === "fight") { f.burnTick = .45; hurt(f, 4, 0, -.2, 20, f.burnBy, { quiet: true, stun: 0, dot: true }); }
  }
  const { head: Hd, neck: N, pelvis: Pv } = f;
  const disabled = f.frozen > 0 || f.stun > 0 || f.trapT > 0 || phase !== "fight";
  const pacified = f.charmT > 0 || f.sheepT > 0 || f.truthT > 0; // encantado, ovelha ou laçado pela verdade: anda, mas não ataca
  if (f.pl.kind === "pad" && time - (inp.joyT ?? -1e9) > .5 && (inp.jx || inp.jy)) { inp.jx = inp.jy = 0; inp.aiming = false; }
  let jx = disabled || f.rooted > 0 ? 0 : inp.jx, jy = disabled ? 0 : inp.jy;
  if (f.rooted > 0 && jy < 0) jy = 0;
  if (f.confused > 0) { f.confused -= dt; jx = -jx; } // tonto: esquerda vira direita
  if (f.charmT > 0 && f.charmBy && f.charmBy.alive && !disabled) { jx = Math.sign(f.charmBy.pelvis.x - Pv.x) * .7; jy = 0; } // encantado: vai até quem flechou
  if (Math.abs(jx) < .15) jx = 0;

  // Chão e equilíbrio
  const noPlat = f.dropT > 0;
  for (const p of f.b) p.noPlat = noPlat;
  const footY = Math.max(f.lf.y, f.rf.y);
  const gY = surfaceBelow(Pv.x, footY - 8 * s, noPlat);
  const grounded = gY - footY < 16 * s && gY - Pv.y < 62 * s && Pv.vy > -250;
  if (grounded) { f.jumps = 1; Pv.vy += (700 * (gY - 47 * s - Pv.y) - 40 * Pv.vy - G * (arena.grav || 1) * .9) * dt; }
  if (grounded && !f.wasGround) { sfx.land(); if (s > 1.3) { dust(Pv.x, gY, 10, "#d8c8a8"); shake = Math.max(shake, 4); } if (f.boss) bossLanded(f); }
  f.wasGround = grounded;
  const lean = jx * 7 * s;
  spring(Hd, Pv.x + lean * 1.4, Pv.y - 62 * s, f.frozen > 0 ? 200 : 520, 30, dt, Pv.vx, Pv.vy);
  spring(N, Pv.x + lean, Pv.y - 42 * s, f.frozen > 0 ? 200 : 520, 30, dt, Pv.vx, Pv.vy);

  // Dash (toque) e corrida (segurando o botão).
  if (inp.dash && !disabled && f.dashCd <= 0 && !f.grabbedBy) {
    const dir = Math.abs(jx) > .2 ? Math.sign(jx) : f.facing;
    for (const p of [...f.b, ...f.wpts]) { p.vx = dir * 1150; p.vy = grounded ? Math.min(p.vy, -80) : p.vy * .3 - 60; }
    f.extT = Math.max(f.extT, .32); f.dashCd = .7; f.dodgeT = .2; f.dashFx = .28; f.facing = dir; f.dashDir = dir;
    dust(Pv.x, footY, 8, "#d8c8a8"); sfx.dash();
  }
  inp.dash = false;
  f.sprinting = !!inp.dashHeld && grounded && jx !== 0 && !disabled && !f.grabbing;
  if (f.sprinting && rnd() < .25) dust(Pv.x - f.facing * 10, footY, 1, "#d8c8a8");

  // Andar
  if (jx) f.facing = Math.sign(jx);
  const spd = f.speed * (f.slowT > 0 ? .5 : 1) * (f.sheepT > 0 ? .75 : 1) * (f.hasteT > 0 ? 1.45 : 1) * (f.sprinting ? 1.5 : 1) * (f.grabbing ? .6 : 1);
  const tvx = jx * 440 * spd, acc = Math.min(1, (grounded ? 12 : 5) * dt);
  for (const p of [Pv, N, Hd]) p.vx += (tvx - p.vx) * acc;
  // Limite de velocidade: o balanço da própria arma (chicote, lança, espada longa...) não pode
  // lançar o corpo. Empurrões de fora (golpe, explosão, coice, dash) liberam o limite por um tempo (extT).
  f.extT = Math.max(0, (f.extT || 0) - dt);
  if (f.extT <= 0 && !f.boss) {
    const vmax = 440 * spd * 1.05;
    for (const p of [Pv, N, Hd, f.lk, f.rk, f.lf, f.rf]) if (Math.abs(p.vx) > vmax) p.vx = Math.sign(p.vx) * vmax;
  }
  if (grounded && !jx && f.stun <= 0) for (const p of [Pv, N, Hd]) p.vx *= 1 - Math.min(1, 7 * dt); // freada ao soltar o joystick
  if (f.dashFx > .1 && !disabled) for (const p of [...f.b, ...f.wpts]) p.vx = f.dashDir * 1050; // o dash mantém a velocidade

  // Pular / atravessar plataforma
  const up = jy < -.55 && !(f.sk && f.sk.id === "megabomb");
  if (up && !f.upHeld && (grounded || f.jumps > 0)) {
    if (!grounded) f.jumps--;
    for (const p of [...f.b, ...f.wpts]) p.vy = grounded ? -880 : -760;
    if (grounded) sfx.jump(); else doubleJumpFx(f);
  }
  f.upHeld = up;
  if (jy > .7 && grounded && gY < FLOOR) f.dropT = .3;
  if (jy > .6 && !grounded) for (const p of f.b) p.vy += 1500 * dt;
  // Guarda-chuva: no ar ele abre e você desce planando.
  f.gliding = !!f.w.glide && !grounded && Pv.vy > 140 && jy <= .6 && !disabled;
  if (f.gliding) for (const p of [...f.b, ...f.wpts]) p.vy = Math.min(p.vy, 140);
  // Teia: puxa você até onde ela grudou.
  if (f.zipT > 0) {
    f.zipT -= dt;
    const dx = f.zipX - N.x, dy = f.zipY - N.y, d = hyp(dx, dy);
    if (d > 50) { const k = Math.min(1, 12 * dt); for (const p of [...f.b, ...f.wpts]) { p.vx += (dx / d * 1000 - p.vx) * k; p.vy += (dy / d * 1000 - p.vy) * k - G * dt; } f.extT = .3; f.jumps = 1; }
    else f.zipT = 0;
  }

  // Pernas
  const speed = Math.min(1, Math.abs(Pv.vx) / 200), fc = f.facing;
  f.walk += Pv.vx * dt * .055 * f.facing / s;
  // Parado (sem comando e quase sem velocidade): os pés ficam plantados e o quadril é segurado
  // sobre eles. Sem isso, as molas da pose (pernas, braços, arma) faziam o boneco andar sozinho.
  if (grounded && !jx && f.stun <= 0 && f.frozen <= 0 && Math.abs(Pv.vx) < 70) {
    if (f.plantX == null || Math.abs(Pv.x - f.plantX) > 50 * s) f.plantX = Pv.x;
    for (const p of [Pv, N, Hd]) p.vx += ((f.plantX - Pv.x) * 40 - p.vx * 10) * dt;
  } else f.plantX = null;
  const baseX = f.plantX ?? Pv.x;
  if (grounded) {
    for (const [foot, knee, ph, off] of [[f.lf, f.lk, 0, -9], [f.rf, f.rk, Math.PI, 9]]) {
      const sn = Math.sin(f.walk + ph), c = Math.cos(f.walk + ph);
      const tx = baseX + (off * .6 + sn * 18 * speed * fc) * s, ty = gY - (5 + Math.max(0, c) * 14 * speed) * s;
      spring(foot, tx, ty, 900, 40, dt);
      // Um joelho pra frente e o outro pra trás (base de luta): as forças se anulam.
      // Com os dois pra frente, sobrava uma força e o boneco andava sozinho.
      spring(knee, (Pv.x + tx) / 2 + (ph ? -fc : fc) * 7 * s, (Pv.y + ty) / 2 - 3 * s, 300, 20, dt);
    }
  } else {
    spring(f.lf, Pv.x + (-10 + fc * 4) * s, Pv.y + 36 * s, 300, 20, dt, Pv.vx, Pv.vy);
    spring(f.rf, Pv.x + (10 + fc * 8) * s, Pv.y + 32 * s, 300, 20, dt, Pv.vx, Pv.vy);
    spring(f.lk, Pv.x + (-4 + fc * 14) * s, Pv.y + 16 * s, 200, 15, dt, Pv.vx, Pv.vy);
    spring(f.rk, Pv.x + (4 + fc * 16) * s, Pv.y + 12 * s, 200, 15, dt, Pv.vx, Pv.vy);
  }

  // Mira: arrastar o botão de ataque no celular mira; senão o joystick mira; solto, mira pra frente.
  if (f.bot) f.aim = f.botAim;
  else if (!disabled && inp.aiming && hyp(inp.ax, inp.ay) > .2) { f.aim = Math.atan2(inp.ay, inp.ax); f.facing = Math.cos(f.aim) >= 0 ? 1 : -1; }
  else if (!disabled && hyp(inp.jx, inp.jy) > .35) f.aim = Math.atan2(inp.jy, inp.jx);
  else f.aim = f.facing > 0 ? -.25 : Math.PI + .25;
  if (f.sk) { if (disabled) f.sk = null; else skillStep(f, dt); }

  // Ataque e magia (soltar o botão depois de mirar dispara na direção mirada)
  if (f.w.charge && !f.mmPow && inp.charging && !disabled && f.atkCd <= 0 && !(f.w.clip && f.clip <= 0)) chargeStep(f, dt);
  else if (!inp.charging && !inp.atk) f.charge = 0;
  if (f.bot && f.bot.charging && f.charge >= f.bot.chargeGoal) { f.bot.charging = false; f.bot.atk = true; }
  if (inp.atk && f.grabbing) { if (!disabled) pummel(f); inp.atk = false; }
  if (inp.atk && !disabled && !pacified && f.atkCd <= 0 && !(f.sk && f.sk.id === "megabomb")) {
    if (inp.atkAim != null) { f.aim = inp.atkAim; f.facing = Math.cos(f.aim) >= 0 ? 1 : -1; }
    f.chargeLvl = f.w.charge ? (f.charge >= CHARGE_FULL ? 2 : f.charge >= CHARGE_L1 ? 1 : 0) : 0;
    tryAttack(f, Math.cos(f.aim) >= 0 ? 1 : -1);
    f.charge = 0; f.chargeLvl = 0; inp.charging = false;
  }
  if (f.w.hold && !f.bot) holdStep(f, inp, dt, disabled || pacified); else f.holdOn = false;
  inp.atk = false; inp.atkAim = null;
  if (inp.mag && !disabled && !pacified) { if (inp.magAim != null) f.aim = inp.magAim; if (f.magic) useMagic(f); else if (f.mmEn) mmSet(f, f.mmPow + 1); else if (hasBombTypes(f)) bombSet(f, f.bombT + 1); else if (hasMc(f)) mcSet(f, (f.mcT || 0) + 1); else if (hasSkill(f)) useSkill(f); else throwWeapon(f); }
  inp.mag = false; inp.magAim = null; inp.atkMag = null; inp.atkPow = null;
  if (f.grabbing) grabStep(f, inp, dt, disabled);
  else if (inp.grab && !disabled && !pacified && f.grabCd <= 0 && !f.grabbedBy && !f.boss) tryGrab(f);
  inp.grab = false;
  if (inp.sp && !disabled && !pacified && f.sp >= 100 && !cutin && phase === "fight" && !f.boss && !f.minion && !f.zombie) startSpecial(f);
  inp.sp = false;
  if (f.trapT > 0) {
    // Preso na bolha: sobe flutuando.
    for (const p of [...f.b, ...f.wpts]) { p.vy += -G * (arena.grav || 1) * 1.12 * dt; p.vx *= .96; p.vy *= .985; }
    return;
  }
  if (f.frozen > 0) { for (const p of [...f.b, ...f.wpts]) p.vx *= .9; return; }
  poseWeapon(f, dt, Math.cos(f.aim) >= 0 ? 1 : -1);
  if (f.grabbing) { const v = f.grabbing; ispring(f, f.rh, v.neck.x, v.neck.y + 8 * v.sc, 900, 40, dt); ispring(f, f.lh, v.neck.x - f.facing * 6, v.neck.y + 18 * v.sc, 900, 40, dt); }
  else if (f.reachT > 0) ispring(f, f.rh, f.neck.x + f.facing * 46 * f.sc, f.neck.y + 18 * f.sc, 900, 40, dt);
}
function chargeStep(f, dt) {
  const before = f.charge;
  f.charge = Math.min(CHARGE_FULL + .3, f.charge + dt);
  const lvl = f.charge >= CHARGE_FULL ? 2 : f.charge >= CHARGE_L1 ? 1 : 0, tip = f.wtip || f.rh;
  const col = lvl === 2 ? pick(["#5affd8", "#ffffff", "#7ad8ff"]) : lvl === 1 ? pick(["#ffe95a", "#ffffff"]) : pick(["#ffffff", "#c9d6ff"]);
  // Partículas vindo de fora e sendo sugadas pra ponta da arma.
  for (let i = 0; i < 1 + lvl; i++) {
    const a = rnd(Math.PI * 2), r = rnd(50, 90) + lvl * 15;
    particles.push({ x: tip.x + Math.cos(a) * r, y: tip.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 5, vy: -Math.sin(a) * r * 5, life: .2, max: .2, color: col, size: rnd(2, 3.5) + lvl, g: 0, glow: true });
  }
  if (before < CHARGE_L1 && f.charge >= CHARGE_L1) { sfx.charge(1); ring(tip.x, tip.y, CHARGE_COLOR[1], 50); }
  if (before < CHARGE_FULL && f.charge >= CHARGE_FULL) { sfx.charge(2); ring(tip.x, tip.y, CHARGE_COLOR[2], 80); stars(tip.x, tip.y, CHARGE_COLOR[2], 10); }
  if (Math.floor(before * 8) !== Math.floor(f.charge * 8) && f.charge < CHARGE_FULL) sfx.chargeTick(f.charge / CHARGE_FULL);
}
function tryAttack(f, side) {
  const W_ = f.w;
  if (W_.clip && f.clip <= 0) return; // recarregando
  if (W_.kind === "shoot" && !fireShot(f)) return;
  if (W_.clip && --f.clip <= 0) {
    // Arma vazia: no Aleatório ela é jogada fora; nos outros modos, recarrega.
    if (mode === "aleatorio" && !f.boss) { f.atkCd = .2; setTimeout(() => f.alive && f.wtype !== "punhos" && throwWeapon(f, true), 250); }
    else f.clipT = W_.clipReload;
  }
  if (W_.recoil) { const dx = Math.cos(f.aim), dy = Math.sin(f.aim); for (const p of [...f.b, ...f.wpts]) { p.vx -= dx * W_.recoil; p.vy -= dy * W_.recoil * .8; } f.extT = .8; shake = Math.max(shake, 6); }
  if (W_.dash) {
    const dx = Math.cos(f.aim) >= 0 ? 1 : -1;
    for (const p of [...f.b, ...f.wpts]) { p.vx += dx * 950; p.vy -= 120; }
    f.extT = .45;
    for (let i = 0; i < 18; i++) particles.push({ x: f.pelvis.x - dx * rnd(0, 80), y: f.neck.y + rnd(-10, 50), vx: -dx * rnd(100, 300), vy: rnd(-30, 30), life: .3, max: .3, color: W_.glow, size: rnd(2, 4), g: 0, glow: true, line: true });
    sfx.dash();
  }
  if (W_.kind === "cast") castSpell(f);
  if (W_.terraBeam) terraBeam(f, f.aim);
  if (W_.swordBeam && f.hp >= (f.maxHp || MAX_HP) * .9) { addProj("swordbeam", f.rh.x + Math.cos(f.aim) * 30, f.rh.y + Math.sin(f.aim) * 30, f.aim, 1250, f); sfx.zap(); }
  if (W_.keyMagic && (f.keyN = (f.keyN || 0) + 1) % 3 === 0) keyMagic(f);
  if (W_.lunge) energyLunge(f);
  if (W_.leek) for (let i = 0; i < 3; i++) particles.push({ x: f.rh.x, y: f.rh.y, vx: rnd(-80, 80), vy: rnd(-160, -60), life: .7, max: .7, color: pick(["#39c5bb", "#ff6fb5", "#ffffff"]), text: pick(["♪", "♫"]), size: 20, g: 0 });
  if (W_.firewave) { const dx = Math.cos(f.aim) >= 0 ? 1 : -1; addProj("flamewave", f.neck.x + dx * 40 * f.sc, f.neck.y + 22 * f.sc, dx > 0 ? 0 : Math.PI, 780, f); sfx.fire(); }
  f.atkT = W_.dur; f.atkCd = f.cdOverride || W_.cd; f.cdOverride = 0; f.atkSide = side; f.swingHits.clear(); f.slammed = false;
  if (W_.kind === "punch" || W_.kind === "claws") { f.punchR = !f.punchR; sfx.swing(false); }
  else if (W_.energy) sfx.saber();
  else if (!RANGED.has(W_.kind)) sfx.swing(W_.dmg >= 18 || f.sc > 1.3);
  send({ to: f.id, type: "cd", ms: Math.round(f.atkCd * 1000) });
}
// Mola da pose (braços e arma), relativa ao pescoço.
function ispring(f, p, tx, ty, k, c, dt) { spring(p, tx, ty, k, c, dt, f.neck.vx, f.neck.vy); }
function poseWeapon(f, dt, side) {
  const W_ = f.w, N = f.neck, fc = f.facing, s = f.sc, dx = Math.cos(f.aim), dy = Math.sin(f.aim);
  if (W_.kind === "punch" || W_.kind === "claws") {
    // Guarda com as mãos e golpe alternando os lados.
    const atk = f.atkT > 0, u = atk ? 1 - f.atkT / W_.dur : 0;
    const reach = W_.kind === "claws" ? 50 : 42;
    const ext = (atk ? (u < .45 ? 20 + u / .45 * reach : 20 + reach - (u - .45) / .55 * reach) : 18) * s;
    const [front, back, fe, be] = f.punchR ? [f.rh, f.lh, f.re, f.le] : [f.lh, f.rh, f.le, f.re];
    ispring(f, front, N.x + dx * ext, N.y + 10 * s + dy * ext, atk ? 1600 : 500, 30, dt);
    ispring(f, back, N.x + dx * 14 * s, N.y + (14 + dy * 8) * s, 500, 30, dt);
    ispring(f, fe, N.x + dx * ext * .5, N.y + 16 * s, 150, 12, dt);
    ispring(f, be, N.x - fc * 4 * s, N.y + 20 * s, 150, 12, dt);
    return;
  }
  let ang = f.aim, reach = (34 + W_.L * .85) * s, k = W_.k;
  if (f.atkT > 0) {
    const u = clamp(1 - f.atkT / W_.dur, 0, 1), e = 1 - (1 - u) * (1 - u), sd = f.atkSide || 1;
    // No golpe o braço estica um pouco: a lâmina alcança onde o desenho mostra.
    if (W_.kind === "swing") { k *= 2.6; ang = f.aim + sd * (-1.9 + 3.8 * e); reach *= 1.12; }
    else if (W_.kind === "slam") { k *= 2.8; ang = f.aim + sd * (-2.4 + 3.7 * e); reach *= 1.1; }
    else if (W_.kind === "spin") { k *= 2.6; ang = f.aim - sd * Math.PI + sd * 3 * Math.PI * e; }
    else if (W_.kind === "whip") { k *= 3; ang = f.aim + sd * (-2.3 + 2.9 * e); }
    else if (W_.kind === "thrust") { k *= 2.6; reach *= u < .3 ? .55 : u < .65 ? 1.5 : 1.5 - (u - .65) * 1.4; }
    else if (W_.kind === "shoot") reach *= 1 - .15 * Math.sin(Math.PI * u);
  }
  if (W_.kind === "cast") {
    // Livro: segurado à frente; ao conjurar, erguido na direção da mira.
    const casting = f.castT > 0;
    const hx = casting ? N.x + dx * 22 * s : N.x + dx * 28 * s, hy = casting ? N.y - 18 * s + dy * 10 * s : N.y + (dy * 28 + 4) * s;
    ispring(f, f.rh, hx, hy, 600, 30, dt);
    ispring(f, f.wtip, hx + fc * W_.L * s, hy, 600, 25, dt);
    ispring(f, f.re, (N.x + hx) / 2, (N.y + hy) / 2 + 6 * s, 150, 12, dt);
    ispring(f, f.lh, casting ? N.x - fc * 10 * s : hx - fc * 6 * s, casting ? N.y - 16 * s : hy + 4 * s, 300, 20, dt);
    return;
  }
  const ax = Math.cos(ang), ay = Math.sin(ang), arm = (f.atkT > 0 && !RANGED.has(W_.kind) ? 40 : 30) * s;
  ispring(f, f.rh, N.x + ax * arm, N.y + ay * arm, 500, 25, dt);
  ispring(f, f.wtip, N.x + ax * reach, N.y + ay * reach, k, 20, dt);
  if (f.chain && f.atkT > 0) {
    // Chicote: no ataque a corrente estica acompanhando o arco e estala na ponta.
    const c = f.chain, n = c.length - 1;
    ispring(f, c[n], N.x + ax * (reach + 130 * s), N.y + ay * (reach + 130 * s), 1100, 15, dt);
    ispring(f, c[n >> 1], N.x + ax * (reach + 65 * s), N.y + ay * (reach + 65 * s), 500, 15, dt);
  }
  ispring(f, f.re, N.x + (ax * 14 - ay * 6 * side) * s, N.y + (ay * 14 + 8) * s, 120, 10, dt);
  if (W_.shield) {
    // Escudo à frente quando não está atacando.
    const atk = f.atkT > 0;
    ispring(f, f.lh, atk ? N.x - fc * 8 * s : N.x + dx * 24 * s, atk ? N.y + 22 * s : N.y + (dy * 24 + 10) * s, 500, 30, dt);
    ispring(f, f.le, N.x + (atk ? -fc * 6 : dx * 10) * s, N.y + 18 * s, 150, 12, dt);
  } else if (W_.two) ispring(f, f.lh, f.rh.x + (f.wtip.x - f.rh.x) * .3, f.rh.y + (f.wtip.y - f.rh.y) * .3, 400, 25, dt);
  else ispring(f, f.lh, N.x - fc * 14 * s, N.y + 30 * s, 120, 12, dt);
}

// ───────────────────────── IA dos bots ─────────────────────────
// Os bots miram com erro (não acertam sempre): o erro muda a cada "pensada".
function botThink(f, dt) {
  if (mode === "corrida" && race) return raceBot(f, dt);
  const bb = f.bot;
  // Agarrar: segura um pouco e arremessa; quando agarrado, aperta tudo pra escapar.
  if (f.grabbing) { if ((bb.grabRel -= dt) <= 0) { bb.grabHeld = false; bb.jx = rnd() < .5 ? -f.facing : f.facing; } else if (rnd() < .02) bb.atk = true; }
  if (f.sp >= 100 && !f.boss && !f.minion && !f.zombie && rnd() < .01 && (MELEE_KINDS.has(f.w.kind) ? aimedFoe(f, 420, .5) : fighters.some(e => isEnemy(f, e) && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 650))) bb.sp = true;
  if (mode === "bomba" && bomb && bomb.holder) return bombThink(f, dt);
  const bot = f.bot; f.think -= dt;
  const enemies = fighters.filter(e => isEnemy(f, e) && !(e.cloakT > 0 && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) > 70));
  if (!enemies.length) {
    const relic = pickups.find(p => p.kind === "relic" && p.landed && !f.minion);
    bot.jx = relic && Math.abs(relic.x - f.pelvis.x) > 15 ? Math.sign(relic.x - f.pelvis.x) : 0;
    bot.jy = relic && relic.y < f.pelvis.y - 80 ? (bot.jy === -1 ? 0 : -1) : 0;
    return;
  }
  let tgt = enemies[0], best = 1e9;
  for (const e of enemies) { const d = hyp(e.pelvis.x - f.pelvis.x, e.pelvis.y - f.pelvis.y); if (d < best) { best = d; tgt = e; } }
  // Com livro, mira nos pés do alvo (o feitiço nasce onde a mira encosta no chão).
  const ty = f.w.kind === "cast" || f.w.shot === "meteorRain" ? tgt.pelvis.y + 40 * tgt.sc : tgt.head.y;
  f.botAim = Math.atan2(ty - f.neck.y, tgt.head.x - f.neck.x) + f.aimErr;
  if (f.think > 0) return;
  f.think = rnd(.08, .2);
  f.aimErr = rnd(-.22, .22) * (f.boss ? .5 : 1);
  const s = f.sc, dx = tgt.pelvis.x - f.pelvis.x, kind = f.w.kind, ranged = RANGED.has(kind);
  const range = f.w.botRange ? f.w.botRange * s : (ranged ? (kind === "cast" ? 600 : 450) : kind === "punch" || kind === "claws" ? 55 : kind === "whip" ? 150 : f.w.L + 50) * (ranged ? 1 : s);
  const dist = (p) => hyp(p.x - f.pelvis.x, p.y - f.pelvis.y);
  const want = f.zombie ? [] : pickups.filter(p => (p.landed || p.y > 300) &&
    (p.kind === "relic" || (p.kind === "weapon" && kind === "punch") || (p.kind === "magic" && !f.magic && dist(p) < best * .9)));
  want.sort((a, b) => dist(a) - dist(b));
  const goal = want[0];
  if (goal) bot.jx = Math.abs(goal.x - f.pelvis.x) > 20 ? Math.sign(goal.x - f.pelvis.x) : 0;
  else if (Math.abs(dx) > range) bot.jx = Math.sign(dx);
  else if (Math.abs(dx) < range * (ranged && !f.w.botRange ? .6 : .45)) bot.jx = -Math.sign(dx) * .6;
  else bot.jx = rnd() < .3 ? rnd(-.5, .5) : 0;
  const gdy = (goal ? goal.y : tgt.pelvis.y) - f.pelvis.y;
  bot.jy = (gdy < -90 && rnd() < .45) || rnd() < .03 ? -1 : (gdy > 90 && rnd() < .3 ? 1 : 0);
  // Perigos da arena (lava subindo, bola de neve, raio marcado) têm prioridade.
  const ev = Events.botGoal(f);
  if (ev) { if (ev.jx !== undefined) bot.jx = ev.jx; if (ev.jump) bot.jy = bot.jy === -1 ? 0 : -1; }
  const xb = projectiles.find(p => p.kind === "xbomb" && p.fuse < 1.7 && Math.abs(p.x - f.pelvis.x) < 290 && Math.abs(p.y - f.pelvis.y) < 140);
  if (xb) { bot.jx = Math.sign(f.pelvis.x - xb.x) || 1; if (rnd() < .25) bot.jy = -1; }
  if (!ranged && best < range + 25 && rnd() < .55) bot.atk = true;
  if (ranged && best < (f.w.botRange ? f.w.botRange + 40 : 800) && !(f.w.clip && f.clip <= 0) && !bot.charging) {
    if (f.w.charge && !f.mmPow && rnd() < .3) { bot.charging = true; bot.chargeGoal = rnd(.5, 1.25); }
    else if (rnd() < .35) bot.atk = true;
  }
  if (!f.grabbing && !f.boss && !f.minion && !f.zombie && best < 70 && f.grabCd <= 0 && rnd() < .05 && !tgt.boss) { bot.grab = true; bot.grabHeld = true; bot.grabRel = rnd(.4, 1.3); }
  if (!f.boss && !f.zombie && f.dashCd <= 0 && rnd() < (best > 450 ? .03 : .008)) bot.dash = true;
  bot.dashHeld = !f.boss && !f.zombie && best > 380;
  if (hasMc(f) && rnd() < .02) mcSet(f, Math.floor(rnd(MC_ITEMS.length)));
  if (!f.magic && hasSkill(f) && f.skillCd <= 0 && best < SKILLS[f.wtype].range * s && rnd() < .25) bot.mag = true;
  if (hasBombTypes(f) && rnd() < .02) bombSet(f, Math.floor(rnd(BOMB_TYPES.length)));
  if (f.mmEn && rnd() < .03) mmSet(f, pick(MM_POWERS.map((P_, i) => i).filter(i => f.mmEn[i] >= MM_POWERS[i].cost)));
  if (f.magic) {
    const m = f.magic;
    if ((m === "cura" && f.hp < f.maxHp * .5) || (m === "escudo" && f.hp < f.maxHp * .65 && best < 220) ||
        ((m === "fogo" || m === "gelo") && best > 180 && best < 750 && rnd() < .25) ||
        (m === "raio" && best < 700 && rnd() < .3) || (m === "teleporte" && f.hp < f.maxHp * .35 && best < 160 && rnd() < .5)) {
      if (m === "teleporte") f.botAim = Math.atan2(-.6, -Math.sign(dx));
      bot.mag = true;
    }
  }
}

// ───────────────────────── Combate corpo a corpo ─────────────────────────
// Segmentos da arma que machucam, com velocidade nas pontas. Inclui o rastro
// da ponta entre o passo anterior e o atual, pra golpe rápido não "atravessar".
function hitSegs(f) {
  const W_ = f.w, out = [], s = f.sc;
  const seg = (a, b, va, vb, r) => out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, v1: va, v2: vb, r });
  const sweep = (p, r) => out.push({ x1: p.ox, y1: p.oy, x2: p.x, y2: p.y, v1: p, v2: p, r });
  if (W_.kind === "punch" || W_.kind === "claws") { for (const h of [f.rh, f.lh]) sweep(h, W_.hr * s); return out; }
  if (f.ball) { sweep(f.ball, f.ball.r + 1); return out; }
  if (f.chain) { const c = f.chain, n = c.length; for (let i = n - 4; i < n - 1; i++) seg(c[i], c[i + 1], c[i], c[i + 1], W_.hr * s); sweep(c[n - 1], W_.hr * s); return out; }
  const g = f.rh, t = f.wtip, bs = W_.bs || 0;
  const start = { x: g.x + (t.x - g.x) * bs, y: g.y + (t.y - g.y) * bs }, vs = { vx: g.vx + (t.vx - g.vx) * bs, vy: g.vy + (t.vy - g.vy) * bs };
  seg(start, t, vs, t, W_.hr * s); sweep(t, W_.hr * s);
  if (W_.double) {
    // Lâmina de trás: espelho da da frente em relação à mão.
    const back = { x: g.x - (t.x - g.x) * .95, y: g.y - (t.y - g.y) * .95 }, vb = { vx: g.vx - (t.vx - g.vx) * .95, vy: g.vy - (t.vy - g.vy) * .95 };
    const bstart = { x: g.x - (t.x - g.x) * bs, y: g.y - (t.y - g.y) * bs };
    seg(bstart, back, vs, vb, W_.hr * s);
  }
  return out;
}
function meleeCheck(A) {
  const W_ = A.w;
  if (W_.kind === "cast") return;
  const attacking = A.atkT > 0;
  const segs = hitSegs(A);
  if (attacking) meleeBlocks(A, segs);
  for (const B of fighters) {
    if (!isEnemy(A, B)) continue;
    if (attacking ? A.swingHits.has(B.id) : (A.hitCd[B.id] || 0) > 0) continue;
    let best = null;
    for (const sg of segs) for (const part of B.parts) {
      const r = segSeg(sg.x1, sg.y1, sg.x2, sg.y2, part.a.x, part.a.y, part.b.x, part.b.y);
      if (r.d - sg.r - part.r < 0 && (!best || part.m > best.part.m)) best = { sg, part, t: r.s, x: r.x, y: r.y };
    }
    if (!best) continue;
    const { sg, t } = best;
    const vx = lerp(sg.v1.vx, sg.v2.vx, t) - B.pelvis.vx, vy = lerp(sg.v1.vy, sg.v2.vy, t) - B.pelvis.vy, rs = hyp(vx, vy);
    if (rs < (attacking ? W_.min * .6 : W_.min * 1.25)) continue;
    const mult = clamp(rs / 800, .75, 1.3) * best.part.m * (attacking ? 1 : .5);
    if (attacking) A.swingHits.add(B.id); else A.hitCd[B.id] = .5;
    let dirx = vx, diry = vy, kb = W_.kb * mult;
    if (W_.pull) { dirx = A.neck.x - B.neck.x; diry = A.neck.y - B.neck.y - 40; kb = 560; }
    if (W_.homerun && attacking && mult > 1.05) { kb *= 1.9; diry = Math.min(diry, -Math.abs(dirx) * .6); floatText(B.head.x, B.head.y - 70, "HOME RUN!", "#ffd84a", 40); sfx.homerun(); shake = Math.max(shake, 14); }
    const fallCrit = W_.sweepHit && attacking && A.pelvis.vy > 250 && !(A.lf.ground || A.rf.ground), sneak = A.cloakT > 0;
    if (fallCrit) stars(best.x, best.y, "#ffffff", 8);
    if (sneak) { A.cloakT = 0; A.hasteT = 0; floatText(B.head.x, B.head.y - 70, "ATAQUE SURPRESA!", "#5ab8ff", 30); B.stun = Math.max(B.stun, .9); shake = Math.max(shake, 12); ring(best.x, best.y, "#5ab8ff", 70); sfx.saber(); }
    const ok = hurt(B, W_.dmg * mult * (fallCrit ? 1.5 : 1) * (sneak ? 2.2 : 1), dirx, diry, kb, A, { crit: !!best.part.head || fallCrit || sneak, x: best.x, y: best.y, fromX: A.neck.x, snd: W_.pan ? "clang" : W_.snd });
    if (ok && W_.burn) { B.burn = 2.6; B.burnBy = A; B.burnTick = .3; flameBurst(best.x, best.y); }
    if (ok && W_.leek && rnd() < .3) confuse(B, 1.2); // alho-poró: às vezes deixa tonto
    if (ok && W_.rip && attacking) gloryKill(A, B);
    if (ok && W_.pogo && attacking) pogoBounce(A);
    if (ok && W_.sweepHit && attacking) sweepAround(A, B, best.x, best.y);
    if (ok && W_.pan) { floatText(best.x, best.y - 30, "PANG!", "#f0f0f8", 30); shake = Math.max(shake, 6); }
    if (ok && W_.freeze && attacking && time - (B.freezeAt ?? -9) > FREEZE_CD && applyFreeze(B, W_.freeze)) {
      for (let i = 0; i < 12; i++) particles.push({ x: best.x, y: best.y, vx: rnd(-200, 200), vy: rnd(-250, 50), life: .5, max: .5, color: pick(["#bff0ff", "#ffffff", "#8fe3ff"]), size: rnd(2, 4), g: 500, star: true });
      sfx.ice();
    }
    if (ok && W_.chain && attacking) chainLightning(A, B);
    if (ok && W_.gravity && attacking) gravityPulse(A, best.x, best.y);
    if (ok && W_.combo) {
      A.combo = (A.combo || 0) + 1; A.comboT = 1.2;
      if (A.combo % 3 === 0) {
        // 3º soco seguido: choque que atordoa.
        B.stun = Math.max(B.stun, .35); for (const p of B.b) { p.vx += Math.sign(vx) * 260; p.vy -= 200; }
        fx.push({ type: "lightning", x1: best.x - 30, y1: best.y - 20, x2: best.x + 30, y2: best.y + 20, t: 0, life: .2 });
        spark(best.x, best.y, "#5ac8ff", 18); floatText(B.head.x, B.head.y - 60, "COMBO!", "#5ac8ff", 30); sfx.thunder();
      }
    }
    for (const p of A.wpts) { p.vx *= -.25; p.vy *= -.25; }
  }
  // Pá do Shovel Knight: golpe pra baixo no ar quica no chão também.
  if (W_.pogo && attacking && !A.slammed && A.wtip.y >= surfaceBelow(A.wtip.x, A.wtip.y - 30, false) - 8 && pogoBounce(A)) { A.slammed = true; dust(A.wtip.x, A.wtip.y, 10, "#b08a5a"); }
  // Clava: ao bater no chão durante o golpe, solta uma onda de choque.
  if (W_.kind === "slam" && attacking && !A.slammed) {
    const t = A.wtip, gy = surfaceBelow(t.x, t.y - 40, false);
    if (t.y >= gy - 10 * A.sc && t.vy > 150) {
      A.slammed = true; shockwave(A, t.x, gy, A.sc > 1.3 ? 300 : W_.relic ? 240 : 200, 10);
      if (W_.relic === "golem") for (let k = 1; k <= 3; k++) {
        const x = t.x + A.facing * k * 95;
        if (x > WALL_L + 20 && x < WALL_R - 20) fx.push({ type: "spikes", owner: A, x, y: surfaceBelow(x, gy - 20, false), t: .15 - k * .14, life: 1, hit: false, dmg: 9 });
      }
    }
  }
}
function shockwave(A, x, gy, radius = 200, dmg = 10) {
  sfx.shock(); shake = Math.max(shake, radius > 220 ? 22 : 16);
  fx.push({ type: "shock", x, y: gy, t: 0, life: .5, r: radius });
  dust(x, gy, radius > 220 ? 40 : 26, "#d8c8a8");
  for (const B of fighters) {
    if (!isEnemy(A, B)) continue;
    const d = Math.abs(B.pelvis.x - x);
    if (d < radius && B.pelvis.y > gy - 140 && B.pelvis.y < gy + 10) hurt(B, dmg * (1 - d / (radius * 1.3)), Math.sign(B.pelvis.x - x) || 1, -2.2, 520, A, { stun: .3, fromX: x, snd: "blunt" });
  }
}
// Martelo do Trovão: o raio salta do alvo pro inimigo mais próximo dele.
function chainLightning(A, B) {
  let next = null, best = 280;
  for (const C of fighters) { if (C === B || !isEnemy(A, C)) continue; const d = hyp(C.neck.x - B.neck.x, C.neck.y - B.neck.y); if (d < best) { best = d; next = C; } }
  spark(B.neck.x, B.neck.y, "#ffe95a", 12);
  if (!next) return;
  fx.push({ type: "lightning", x1: B.neck.x, y1: B.neck.y, x2: next.neck.x, y2: next.neck.y, t: 0, life: .25 });
  sfx.thunder();
  hurt(next, 9, next.neck.x - B.neck.x, -.3, 260, A, { stun: .3, fromX: B.neck.x, snd: "magicHit" });
}
// Martelo Gravitacional: puxa todos os inimigos por perto pro ponto do impacto.
function gravityPulse(A, x, y) {
  fx.push({ type: "grav", x, y, t: 0, life: .45 });
  sfx.grav(); shake = Math.max(shake, 10);
  for (const C of fighters) {
    if (!isEnemy(A, C)) continue;
    const dx = x - C.neck.x, dy = y - C.neck.y, d = hyp(dx, dy);
    if (d < 260 && d > 1) { const k = 700 * (1 - d / 260) / Math.max(1, C.sc); for (const p of [...C.b, ...C.wpts]) { p.vx += dx / d * k; p.vy += dy / d * k - 80; } C.extT = .8; C.stun = Math.max(C.stun, .25); }
  }
}
function flameBurst(x, y) { for (let i = 0; i < 14; i++) particles.push({ x, y, vx: rnd(-160, 160), vy: rnd(-240, -40), life: .5, max: .5, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(4, 9), g: -100, glow: true }); sfx.fire(); }
function clashCheck(A) {
  if (A.clashCd > 0 || !A.wtip || RANGED.has(A.w.kind)) return;
  const tip = A.ball || (A.chain ? A.chain[A.chain.length - 1] : A.wtip);
  for (const B of fighters) {
    if (!isEnemy(A, B) || !B.wtip || RANGED.has(B.w.kind) || B.chain) continue;
    const r = segSeg(tip.ox, tip.oy, tip.x, tip.y, B.rh.x, B.rh.y, B.wtip.x, B.wtip.y);
    if (r.d < 9 * Math.max(A.sc, B.sc) && hyp(tip.vx - B.wtip.vx, tip.vy - B.wtip.vy) > 300) {
      const nx = tip.x - B.wtip.x, ny = tip.y - B.wtip.y, nl = hyp(nx, ny) || 1;
      for (const p of A.wpts) { p.vx += nx / nl * 500 / A.sc; p.vy += ny / nl * 500 / A.sc; }
      for (const p of B.wpts) { p.vx -= nx / nl * 500 / B.sc; p.vy -= ny / nl * 500 / B.sc; }
      spark(r.x, r.y, "#ffe9a0", 16); ring(r.x, r.y, "#ffe9a0", 30); sfx.clang();
      A.clashCd = B.clashCd = .15; return;
    }
  }
}

// Dano em um lutador. Escudo (arma) bloqueia de frente; escudo arcano bloqueia tudo.
// o.env = perigo da arena (lava, raio...), que acerta qualquer um.
function hurt(victim, dmg, dirx, diry, kb, attacker, o = {}) {
  if (!victim.alive || phase !== "fight" || victim.finished) return false;
  if (victim.dodgeT > 0 && !o.env && !o.dot) { if (!(victim.dodgeMsg > time)) { victim.dodgeMsg = time + .5; floatText(victim.head.x, victim.head.y - 50, "Esquivou!", "#bff0ff", 20); } return false; }
  if (attacker && attacker !== victim && !o.env && !isEnemy(attacker, victim)) return false;
  if (victim.shield > 0 && !o.dot) { spark(victim.head.x, victim.head.y - 10, "#7aa8ff", 10); sfx.block(); return false; }
  if (mode === "bomba" && bomb && bomb.holder === attacker && attacker !== victim && bomb.passCd <= 0) passBomb(victim);
  const raw = dmg * (attacker && attacker.dmgMul || 1) * (attacker && attacker.w && attacker.w.dmgK || 1); // força original (com o balanceamento da arma): decide o peso dos efeitos (tremor, som, pausa)
  dmg = raw * DAMAGE_SCALE;
  kb *= victim.kbMul;
  if (victim.armorT > 0) kb *= .15; // especial em andamento: não é jogado longe
  let blocked = false;
  if (victim.trapT > 0 && victim.trapKind === "bubble" && !o.dot) { victim.trapT = 0; endTrap(victim); }
  if (!o.dot && victim.frozen > 0 && victim.wasFrozen && time - (victim.frozenAt || 0) > .35 && !(time < (victim.tstopT || 0))) {
    // Bater em quem está congelado quebra o gelo e machuca mais.
    dmg *= 1.3; victim.frozen = 0; floatText(victim.head.x, victim.head.y - 70 * victim.sc, "Quebrou!", "#bff0ff", 26);
  }
  if (!o.dot && (victim.w.shield || victim.w.panBlock || (victim.w.blockHeld && victim.ammo > 0)) && victim.atkT <= 0 && victim.frozen <= 0 && victim.stun <= 0 && o.fromX !== undefined && (o.fromX - victim.neck.x) * victim.facing > 0) {
    blocked = true; dmg *= .15; kb *= .25; victim.blockFx = .2;
    spark(victim.lh.x + victim.facing * 8, victim.lh.y, "#ffe9a0", 14); sfx.block();
  }
  dmg = mode === "bomba" ? 0 : Math.max(1, Math.round(dmg));
  victim.hp -= dmg; victim.flash = .12;
  if (victim.charge > .05) {
    // Tiro carregado é interrompido: a carga se desfaz em faíscas (dá pra começar a carregar de novo).
    const tip = victim.wtip || victim.rh;
    for (let i = 0; i < 16; i++) { const a = rnd(Math.PI * 2), sp = rnd(120, 360); particles.push({ x: tip.x, y: tip.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .35, max: .35, color: pick(["#ffffff", "#9aa3ab", CHARGE_COLOR[victim.charge >= CHARGE_FULL ? 2 : 1] || "#ffffff"]), size: rnd(2, 4), g: 400, line: true }); }
    if (victim.charge >= CHARGE_L1) floatText(victim.head.x, victim.head.y - 70 * victim.sc, "Carga perdida!", "#9aa3ab", 20);
    victim.charge = 0; if (victim.bot) victim.bot.charging = false;
    sfx.chargeLost(); send({ to: victim.id, type: "chargeLost" });
  }
  if (!o.dot && !(victim.armorT > 0) && !((victim.ccImmune || 0) > 0)) victim.stun = Math.max(victim.stun, blocked ? 0 : Math.min(STUN_CAP, o.stun ?? .12) * (victim.boss ? .3 : 1));
  const l = hyp(dirx, diry) || 1; dirx /= l; diry /= l;
  for (const p of [...victim.b, ...victim.wpts]) { p.vx += dirx * kb * rnd(.7, 1.1); p.vy += diry * kb * rnd(.7, 1.1) - kb * .25; }
  if (kb > 40) victim.extT = Math.max(victim.extT || 0, .4 + Math.min(.8, kb / 900));
  const hx = o.x ?? victim.neck.x, hy = o.y ?? victim.neck.y;
  if (dmg > 0 && (!o.quiet || dmg >= 2)) floatText(victim.head.x, victim.head.y - 30 * victim.sc, o.crit ? `${dmg}!` : `${dmg}`, blocked ? "#9ab" : o.dot ? "#ffb35a" : o.crit ? "#ffd84a" : "#fff", o.crit ? 34 : o.dot ? 20 : 26);
  if (!blocked) {
    stars(hx, hy, victim.color, 4 + raw / 3);
    if (!o.quiet) { ring(hx, hy, "#ffffff", 18 + raw); (sfx[o.snd] || sfx.blunt)(raw >= 18); }
    shake = Math.max(shake, Math.min(18, raw * .6));
    if (raw >= 18) hitstop = Math.max(hitstop, .06);
  }
  if (!blocked && !o.dot && mode === "aleatorio" && raw >= 15 && victim.wtype !== "punhos" && !victim.boss && !victim.minion && rnd() < .25) {
    dropPickup(victim.wtype, victim.rh.x, victim.rh.y, dirx * 260, -380);
    setWeapon(victim, "punhos"); floatText(victim.head.x, victim.head.y - 60, "Desarmado!", "#ffb35a", 26);
  }
  buzz(victim.id, 60 + raw * 6);
  if (!blocked && raw > 0) {
    if (attacker && attacker !== victim && !o.env && !(attacker.spLock > time)) gainSpecial(attacker, raw * (o.dot ? .4 : 1.15));
    gainSpecial(victim, raw * .45);
  }
  if (attacker && attacker.id) buzz(attacker.id, 25);
  if (victim.hp <= 0 && victim.zombie && victim.alive && attacker && attacker.pl && !attacker.zombie) attacker.pl.kills = (attacker.pl.kills || 0) + 1;
  if (victim.hp <= 0) kill(victim, dirx, diry, kb);
  return !blocked;
}
function kill(f, dirx, diry, kb) {
  f.alive = false; f.hp = 0; f.burn = 0;
  for (const p of f.b) { p.vx += dirx * kb * .8; p.vy += diry * kb * .8 - 300; p.noPlat = false; p.plat = true; }
  stars(f.pelvis.x, f.pelvis.y - 30, f.color, f.boss ? 120 : 40); ring(f.neck.x, f.neck.y, f.color, f.boss ? 260 : 80); sfx.ko();
  buzz(f.id, 500); hitstop = Math.max(hitstop, f.boss ? .25 : .1);
  if (f.boss) {
    sfx.boom(); flashScreen = .25; slowmo = 1.6; shake = 30;
    for (const m of fighters) if (m.minion && m.alive && !m.ally) kill(m, 0, -1, 200);
    // O chefão deixa cair a relíquia dele.
    if (f.boss.drop) pickups.push({ kind: "relic", type: f.boss.drop, x: clamp(f.pelvis.x, WALL_L + 80, WALL_R - 80), y: f.neck.y, vy: 120, life: 999, landed: false, bob: 0 });
  }
  // Invocações somem junto com quem as invocou.
  for (const m of fighters) if (m.ally && m.owner === f && m.alive) poofSummon(m);
  const heroesLeft = fighters.filter(x => x.alive && !x.minion && (mode !== "chefe" || x.team === "heroi")).length;
  if (heroesLeft <= 1 && !f.minion) { slowmo = Math.max(slowmo, .9); shake = Math.max(shake, 25); }
}
function buzz(id, ms) { send({ to: id, type: "buzz", ms: Math.min(400, ms) }); }

// ───────────────────────── Mira e projéteis ─────────────────────────
// Ponto onde a mira encosta: segue a direção mirada até bater no chão/plataforma.
function aimPoint(f, max = 650) {
  const dx = Math.cos(f.aim), dy = Math.sin(f.aim);
  let x = f.neck.x, y = f.neck.y;
  for (let d = 0; d < max; d += 8) {
    const nx = x + dx * 8, ny = y + dy * 8;
    if (nx < WALL_L + 10 || nx > WALL_R - 10 || ny < 40) return { x, y, ground: false };
    const gy = surfaceBelow(nx, y, false);
    if (ny >= gy) return { x: nx, y: gy, ground: true };
    x = nx; y = ny;
  }
  return { x, y, ground: false };
}
// Primeiro inimigo dentro de um cone estreito na direção da mira (não procura sozinho).
function enemyInCone(f, cone, range) {
  let tgt = null, best = 1e9;
  for (const e of fighters) {
    if (!isEnemy(f, e)) continue;
    const ex = e.neck.x - f.neck.x, ey = e.neck.y - f.neck.y, d = hyp(ex, ey);
    if (d > range) continue;
    let da = Math.atan2(ey, ex) - f.aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    if (Math.abs(da) < cone && d < best) { best = d; tgt = e; }
  }
  return tgt;
}
function addProj(kind, x, y, ang, speed, owner, extra = {}) {
  const d = PROJ[kind];
  const pr = { kind, x, y, px: x, py: y, vx: Math.cos(ang) * speed + (owner ? owner.pelvis.vx * .2 : 0), vy: Math.sin(ang) * speed, owner, life: d.life, g: d.g, dmg: d.dmg, rot: 0, hits: new Set(), ...extra };
  projectiles.push(pr); return pr;
}
// Armas de distância e cajados: dispara na direção da mira.
// Opções de um projétil carregado: dano multiplicado, tamanho maior; nível 2 atravessa todo mundo.
function chargeOpts(f, kind) {
  const L = f.chargeLvl || 0, d = PROJ[kind];
  if (!L) return {};
  const o = { charge: L, rMul: CHARGE_SIZE[L] };
  if (d.explode) { o.dmg = d.explode * CHARGE_MUL[L]; o.boomR = d.boomR * (1 + L * .45); }
  else o.dmg = d.dmg * CHARGE_MUL[L];
  if (L === 2) o.pierce = true;
  return o;
}
// Disparo carregado: estouro de luz, tremor e coice extra.
function chargeFire(f, x, y) {
  const L = f.chargeLvl, c = CHARGE_COLOR[L];
  ring(x, y, c, 40 + L * 30); stars(x, y, c, 10 + L * 10); shake = Math.max(shake, 5 + L * 5); if (L === 2) flashScreen = .06;
  const dx = Math.cos(f.aim), dy = Math.sin(f.aim); for (const p of f.b) { p.vx -= dx * 160 * L; p.vy -= dy * 120 * L; } f.extT = .6;
  sfx.chargeShot(L);
}
function fireShot(f) {
  const a = f.aim, dx = Math.cos(a), sx = Math.sign(dx) || 1, L = f.chargeLvl || 0;
  const tipGun = f.wtype.startsWith("cajado") || f.wtype === "varinha" || f.wtype === "canhaoBraco";
  const ox = tipGun ? f.wtip.x + dx * 6 : f.rh.x + dx * 24, oy = tipGun ? f.wtip.y + Math.sin(a) * 6 : f.rh.y + Math.sin(a) * 24;
  switch (f.w.shot) {
    case "arrow": addProj("arrow", ox, oy, a - .05 * sx, 1350, f); sfx.bow(); break;
    case "bolt": addProj("bolt", ox, oy, a, 2000 + L * 300, f, chargeOpts(f, "bolt")); sfx.crossbow(); if (L) chargeFire(f, ox, oy); break;
    case "stone": addProj("stone", ox, oy, a - .12 * sx, 1050, f); sfx.sling(); break;
    case "axe": if (f.ammo <= 0) return false; f.ammo--; addProj("axe", ox, oy, a - .15 * sx, 950, f, { spinDir: sx }); sfx.throw(); break;
    case "chakram": if (f.ammo <= 0) return false; f.ammo = 0; f.reload = f.w.reload; addProj("chakram", ox, oy, a, 1150, f, { dir: a, back: false }); sfx.throw(); break;
    case "flask": addProj("flask", ox, oy, a - .3 * sx, 760, f); sfx.throw(); break;
    case "fire": addProj("fire", ox, oy, a, 760, f); sfx.fire(); break;
    case "ice": for (const sp of [-.12, 0, .12]) addProj("ice", ox, oy, a + sp, 1050, f); sfx.ice(); break;
    case "seed": addProj("seed", ox, oy, a - .08 * sx, 900, f); sfx.magicHit(); break;
    case "beam": castBeam(f, ox, oy, a); break;
    case "spark": addProj("spark", ox, oy, a + rnd(-.05, .05), 1300, f); sfx.spark(); break;
    case "laser": addProj("laser", ox, oy, a + (L ? 0 : rnd(-.02, .02)), 2600 - L * 400, f, chargeOpts(f, "laser")); sfx.laser(); muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#ff6a6a", 1 + L); if (L) chargeFire(f, ox, oy); break;
    case "plasma": addProj("plasma", ox, oy, a, 950, f, chargeOpts(f, "plasma")); sfx.plasma(); muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#7dff6a", 1 + L); if (L) chargeFire(f, ox, oy); break;
    case "pellets": for (let i = 0; i < 6; i++) addProj("pellet", ox, oy, a + rnd(-.24, .24), rnd(1700, 2200), f); sfx.shotgun(); muzzle(f, ox, oy, "#ffb33a", 1.6); break;
    case "sticky": addProj("sticky", ox, oy, a - .12 * sx, 1000, f); sfx.throw(); muzzle(f, ox, oy, "#ff4ad8"); break;
    case "rocket": addProj("rocket", ox, oy, a, 650, f); sfx.rocket(); muzzle(f, ox, oy, "#ffd84a", 1.8); break;
    case "cannon":
      addProj("cannonball", ox, oy, a - .06 * sx, 1050, f, { dmg: 15, boomR: 105 }); sfx.boom(); muzzle(f, ox, oy, "#ffb34a", 2.2);
      for (let i = 0; i < 10; i++) particles.push({ x: ox, y: oy, vx: Math.cos(a) * rnd(40, 160) + rnd(-40, 40), vy: Math.sin(a) * rnd(40, 160) + rnd(-60, 0), life: .9, max: .9, color: pick(["#9a9a9a", "#c8c8c8"]), size: rnd(6, 12), g: -40, puff: true });
      break;
    case "cryo": addProj("cryo", ox, oy, a, 1800, f, { ...chargeOpts(f, "cryo"), freeze: [.5, .8, 1.2][L] }); sfx.ice(); muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#8fe3ff", 1 + L); if (L) chargeFire(f, ox, oy); break;
    case "rail": castBeam(f, ox, oy, a, 22 * CHARGE_MUL[L], "rail", L); muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#5ac8ff", 2 + L); if (L) chargeFire(f, ox, oy); break;
    case "sweep": f.sweepT = .7; f.sweepTick = 0; sfx.sweep(); break;
    case "notes": for (let i = 0; i < 3; i++) addProj("note", ox, oy, a, 720, f, { base: a, wave: i * 2.1, glyph: i }); sfx.notes(); break;
    case "drum": drumBeat(f, 230, 6); break;
    case "charm": {
      // Flauta: cada nota sai com um efeito surpresa.
      const eff = pick(["tonto", "lento", "repulsao"]);
      addProj("charm", ox, oy, a, 640, f, { effect: eff, confuse: eff === "tonto" ? 2.5 : 0, slow: eff === "lento" ? 2.8 : 0, repel: eff === "repulsao" });
      sfx.notes(); break;
    }
    case "cursednotes": addProj("charm", ox, oy, a, 760, f, { dmg: 6, confuse: 1.3, cursed: true }); sfx.notes(); break;
    case "blast": soundBlast(f, ox, oy, a, L); break;
    case "pea": addProj("pea", ox, oy, a, 1150, f); sfx.pea(); break;
    case "snowpea": addProj("pea", ox, oy, a, 1100, f, { snow: true, dmg: 6, slow: 2.2 }); sfx.pea(); break;
    case "tornado": addProj("tornado", f.pelvis.x + sx * 40, Math.max(f.lf.y, f.rf.y) - 34, sx > 0 ? 0 : Math.PI, 430, f); sfx.whoosh(); break;
    case "healzone": fx.push({ type: "healzone", owner: f, x: f.pelvis.x, y: surfaceBelow(f.pelvis.x, f.pelvis.y, false), t: 0, life: 4, tick: 0 }); sfx.wish(); break;
    case "block": {
      // Kit de Construção: bloco/TNT na casinha mirada (arraste o botão pra escolher), carrinho no chão.
      const c = mcCell(f), it = MC_ITEMS[f.mcT || 0].id;
      if (it === "bloco") { placeBlockAt(c.x, c.y, f); f.cdOverride = .3; }
      else if (it === "tnt") { addProj("tnt", c.x + 25, c.y + 25, 0, 0, f, { fuse: 2.2, vx: 0 }); sfx.thud(); f.cdOverride = 1.1; }
      else { const x = clamp(f.pelvis.x + f.facing * 50, WALL_L + 30, WALL_R - 30); addProj("minecart", x, surfaceBelow(x, f.pelvis.y, false) - 20, 0, 0, f, { dir: f.facing, life: 2.4, vx: 0 }); sfx.thud(); f.cdOverride = 2; }
      break;
    }
    case "jet": {
      // Mochila a jato: impulso na direção da mira (um pouco pra cima), fogo saindo pra trás.
      const dx = Math.cos(a), dy = Math.sin(a) - .35, l = hyp(dx, dy) || 1;
      for (const q of [...f.b, ...f.wpts]) { q.vx = dx / l * 950; q.vy = dy / l * 950; }
      f.extT = .8; f.jumps = 1; f.jetT = .4; sfx.rocket(); break;
    }
    case "hook": addProj("hook", f.wtip.x, f.wtip.y, a - .08 * sx, 1200, f); sfx.whoosh(); break;
    case "bouncefire": addProj("bouncefire", ox, oy, a + .2 * sx, 820, f); sfx.fire(); break;
    case "web": addProj("web", ox, oy, a, 1650, f); sfx.web(); break;
    case "gauntlet": infinityStone(f, ox, oy, a, L); break;
    case "starshield": if (f.ammo <= 0) return false; f.ammo = 0; f.reload = f.w.reload; addProj("starshield", ox, oy, a, 1250, f, { dir: a, back: false, bounces: 0 }); sfx.throw(); break;
    case "kunai": addProj("kunai", ox, oy, a, 1500, f); sfx.throw(); break;
    case "construct": { const form = (f.glN = (f.glN || 0) + 1) % 3; addProj("construct", ox, oy, a, 1050, f, { form, dmg: form === 1 ? 13 : 10 }); sfx.zap(); muzzle(f, ox, oy, "#7dff6a", 2); break; }
    case "goldlasso": addProj("goldlasso", ox, oy, a - .05 * sx, 1150, f); sfx.throw(); break;
    case "bfg": addProj("bfg", ox + Math.cos(a) * 20, oy + Math.sin(a) * 20, a, 430, f); muzzle(f, ox, oy, "#7dff5a", 3); sfx.plasma(); shake = Math.max(shake, 8); break;
    case "portal": { const c = (f.portalN || 0) % 2; f.portalN = (f.portalN || 0) + 1; addProj("portal", ox, oy, a, 1600, f, { pc: c }); muzzle(f, ox, oy, PORTAL_COL[c][1]); sfx.zap(); break; }
    case "voidorb": addProj("voidorb", ox, oy, a, 520, f); sfx.dark(); break;
    case "gravpunt": gravPunt(f, ox, oy, a); break;
    case "capture": addProj("capture", ox, oy, a - .12 * sx, 900, f); sfx.throw(); break;
    case "bubble": addProj("bubble", ox, oy, a, 430, f); sfx.bubble(); break;
    case "sheep": addProj("sheepbolt", ox, oy, a, 800, f); sfx.notes(); break;
    case "cupid": addProj("cupid", ox, oy, a - .04 * sx, 1300, f); sfx.bow(); break;
    case "yoyo": if (f.ammo <= 0) return false; f.ammo = 0; f.reload = f.w.reload; addProj("yoyo", ox, oy, a, 1450, f, { dir: a, back: false }); sfx.whoosh(); break;
    case "flamer": f.flameT = .75; f.flameTick = 0; sfx.flame(); break;
    case "stand": summonStand(f); break;
    case "xbomb": {
      // Força: quem joga no celular/teclado segura o ATACAR pra encher a barra; o bot calcula pela distância.
      if (f.ammo <= 0) return false; f.ammo--;
      let pw;
      if (f.bot) { const e = nearestFoe(f, 1400); pw = e ? clamp((Math.abs(e.pelvis.x - f.pelvis.x) - 40) / 650, .12, 1) : .35; }
      else { pw = f.pl.input.atkPow ?? .45; f.pl.input.atkPow = null; }
      addProj("xbomb", ox, oy, a - .3 * sx, 220 + 640 * pw, f, { fuse: .8, btype: f.bombT || 0 });
    } sfx.throw(); break;
    case "shuriken": for (const sp of [-.08, 0, .08]) addProj("shuriken", ox, oy, a + sp, 1400, f, { spinDir: sx }); sfx.throw(); break;
    case "bigshuriken":
      if (f.ammo <= 0) return false; f.ammo = 0; f.reload = f.w.reload;
      addProj("bigshuriken", ox, oy, a, 980, f, { dir: a, back: false }); sfx.throw(); break;
    case "ki":
      if (L) { castBeam(f, ox, oy, a, [0, 16, 30][L], "ki", L); chargeFire(f, ox, oy); }
      else { addProj("kiball", ox, oy, a + rnd(-.03, .03), 1300, f); sfx.zap(); }
      muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#8fe3ff", 1 + L); break;
    case "buster": if (f.mmPow) return mmFire(f, ox, oy); addProj("buster", ox, oy, a, 1650 - L * 200, f, chargeOpts(f, "buster")); sfx.zap(); muzzle(f, ox, oy, L ? CHARGE_COLOR[L] : "#ffe95a", 1 + L); if (L) chargeFire(f, ox, oy); break;
    case "drone":
      for (const e of fx) if (e.type === "drone" && e.owner === f) e.t = e.life; // só um drone por vez
      fx.push({ type: "drone", owner: f, x: f.neck.x, y: f.neck.y - 90, t: 0, life: 8, shootT: .6 }); sfx.drone(); break;
    case "meteorRain": {
      const p = aimPoint(f, 900);
      for (let i = 0; i < 3; i++) {
        const x = clamp(p.x + (i - 1) * 85, WALL_L + 40, WALL_R - 40);
        fx.push({ type: "mark", x, y: surfaceBelow(x, p.ground ? p.y - 5 : p.y, false), t: -i * .15, life: .8, r: 70, color: "#c58bff", owner: f });
      }
      fx.push({ type: "circle", f, color: "#c58bff", t: 0, life: .6 }); sfx.star(); sfx.dark(); break;
    }
  }
  return true;
}
// ── Habilidades das armas novas
// Tambor: batida em volta de quem toca, empurrando todo mundo pra longe.
function drumBeat(f, r, dmg) {
  fx.push({ type: "sonic", x: f.neck.x, y: f.neck.y + 20 * f.sc, t: 0, life: .45, r, color: "#ffb34a" });
  sfx.drum(); shake = Math.max(shake, 8);
  for (const e of fighters) {
    if (!isEnemy(f, e)) continue;
    const dx = e.neck.x - f.neck.x, dy = e.neck.y - f.neck.y;
    if (hyp(dx, dy) < r) hurt(e, dmg, dx || 1, -.6, 620, f, { stun: .3, fromX: f.neck.x, snd: "blunt" });
  }
}
// Trompete: cone de som que arremessa, deixa zonzo e rebate tiros inimigos.
// Carregado ao máximo vira FANFARRA: explosão de som em volta toda.
function soundBlast(f, ox, oy, a, L = 0) {
  const big = L === 2, R = big ? 360 : L ? 300 : 260, cone = big ? Math.PI : L ? .7 : .55;
  fx.push({ type: "cone", x: ox, y: oy, a, t: 0, life: big ? .6 : .42, r: R, cone, lvl: L });
  sfx.horn(L); shake = Math.max(shake, 8 + L * 6); if (big) { flashScreen = .07; floatText(f.head.x, f.head.y - 80, "FANFARRA!", "#ffd84a", 40); }
  for (let i = 0; i < 8 + L * 6; i++) { const aa = a + rnd(-cone, cone), sp = rnd(250, 650); particles.push({ x: ox, y: oy, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, life: .55, max: .55, color: pick(["#ffd84a", "#ffffff", "#ffb34a"]), size: rnd(3, 6), g: 0, glow: true }); }
  const inCone = (x, y, r) => { const dx = x - ox, dy = y - oy; let da = Math.atan2(dy, dx) - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; return hyp(dx, dy) < r && Math.abs(da) <= cone; };
  // Rebate projéteis inimigos que estiverem no caminho do som.
  for (const pr of projectiles) {
    if (!pr.owner || pr.owner === f || !isEnemy(f, pr.owner) || pr.stuck || !inCone(pr.x, pr.y, R)) continue;
    const sp = Math.max(700, hyp(pr.vx, pr.vy)), ra = Math.atan2(pr.y - oy, pr.x - ox);
    pr.vx = Math.cos(ra) * sp; pr.vy = Math.sin(ra) * sp; pr.owner = f; pr.hits = new Set(); spark(pr.x, pr.y, "#ffd84a", 8);
  }
  for (const e of fighters) {
    if (!isEnemy(f, e) || !inCone(e.neck.x, e.neck.y, R)) continue;
    const dx = big ? e.neck.x - f.neck.x : Math.cos(a), dy = big ? e.neck.y - f.neck.y : Math.sin(a), l = hyp(dx, dy) || 1;
    if (hurt(e, 8 * (1 + L * .6), dx / l, dy / l - .35, 950 + L * 250, f, { stun: .55 + L * .2, fromX: f.neck.x, snd: "blunt" })) stars(e.head.x, e.head.y - 20, "#ffd84a", 8);
  }
}
// Deixa tonto: o controle fica invertido por um tempo (chefões ficam menos).
function confuse(f, t) {
  if (!f.alive) return;
  if (!(f.confused > 0)) floatText(f.head.x, f.head.y - 60 * f.sc, "Tonto!", "#ff8af0", 24);
  f.confused = Math.max(f.confused || 0, t * (f.boss ? .4 : 1));
}
// Espírito Estelar: o espírito surge, avança junto com você e segura o inimigo
// numa rajada de socos (ORA ORA ORA!), terminando com um soco que arremessa longe.
function summonStand(f) {
  const dir = Math.cos(f.aim) >= 0 ? 1 : -1;
  fx.push({ type: "stand", owner: f, dir, t: 0, life: 1.5, tick: 0, n: 0 });
  for (const p of [...f.b, ...f.wpts]) p.vx += dir * 620; f.extT = .5;
  floatText(f.head.x + dir * 60, f.head.y - 80, "ORA ORA ORA!", "#c58bff", 34); sfx.stand();
}
function standHits(e, dmg, kb, stun, quiet) {
  const o = e.owner, x0 = o.neck.x + e.dir * 20, out = [];
  for (const c of fighters) {
    if (!isEnemy(o, c)) continue;
    const rx = (c.neck.x - x0) * e.dir, cy = (c.neck.y + c.pelvis.y) / 2;
    if (rx > -20 && rx < 170 * Math.max(1, c.sc * .8) && Math.abs(cy - o.neck.y - 20) < 100 * Math.max(1, c.sc * .7) && hurt(c, dmg, e.dir, -.2, kb, o, { quiet, stun, fromX: o.neck.x, snd: "punch" })) out.push(c);
  }
  return out;
}
// Bomba clássica: explode em cruz, como no Bomberman (machuca até quem jogou).
// Bombas Clássicas: 5 tipos como no Bomberman 64 (troca no botão do celular).
const BOMB_TYPES = [
  { id: "normal",  name: "Bomba Comum",      c1: "#1d2028", c2: "#5a6070", glow: "#ffb34a" },
  { id: "terra",   name: "Bomba de Terra",   c1: "#5a3a1a", c2: "#b08a5a", glow: "#e8c88a" },
  { id: "ar",      name: "Bomba de Ar",      c1: "#2a7ab8", c2: "#cff4ff", glow: "#e8f8ff" },
  { id: "buraco",  name: "Buraco Negro",     c1: "#12061f", c2: "#6a2fa0", glow: "#c58bff" },
  { id: "energia", name: "Bomba de Energia", c1: "#9a7a10", c2: "#fff27a", glow: "#fff27a" },
];
const hasBombTypes = (f) => f.w.shot === "xbomb" && !f.boss && !f.minion;
// Força do arremesso da bomba: segurando o ATACAR a barra enche e esvazia (vai e volta); um toque rápido joga a meia força.
const POW_T = 1.0;
function bombPower(inp) {
  const t = (performance.now() - (inp.powStart || 0)) / 1000;
  if (t < .15) return .45;
  const u = (t / POW_T) % 2; return clamp(u < 1 ? u : 2 - u, .08, 1);
}
function bombSet(f, i) {
  if (!f.alive) return;
  f.bombT = ((i % BOMB_TYPES.length) + BOMB_TYPES.length) % BOMB_TYPES.length;
  const T = BOMB_TYPES[f.bombT], h = f.rh;
  ring(h.x, h.y, T.glow, 40); stars(h.x, h.y, T.c2, 10);
  floatText(f.head.x, f.head.y - 70 * f.sc, T.name, T.glow, 24); sfx.mmSwitch();
}
function crossExplode(x, y, owner, type = 0, mul = 1) {
  // Explosão redonda como no Bomberman 64 (pega todo mundo dentro do raio).
  const T = BOMB_TYPES[type] || BOMB_TYPES[0], R = { normal: 185, terra: 170, ar: 200, buraco: 120, energia: 175 }[T.id] * mul, cy = y - 12 * mul;
  if (mul > 1) { flashScreen = .2; shake = Math.max(shake, 30); floatText(x, y - 160, "BOOOOM!", T.glow, 56); hitstop = Math.max(hitstop, .08); }
  fx.push({ type: "xboom", x, y: cy, t: 0, life: .55, r: R, style: T.id });
  explodeBlocks(x, cy, R, 20 * mul);
  shake = Math.max(shake, 16);
  if (T.id === "buraco" && mul > 1.5) {
    // Especial: buraco negro "de verdade" — suga muito mais forte, deforma o espaço em volta e no fim explode.
    fx.push({ type: "realhole", owner, x, y: Math.min(y - 130, FLOOR - 160), t: 0, life: 3.8, tick: 0, big: 1.1 });
    floatText(x, y - 260, "BURACO NEGRO SUPERMASSIVO!", "#ffd8a0", 40); sfx.dark(); sfx.grav(); shake = Math.max(shake, 20); return;
  }
  if (T.id === "buraco") {
    // Buraco negro: suga todo mundo em volta e explode no fim.
    fx.push({ type: "vortex", owner, x, y: y - 50 * mul, t: 0, life: 2.2 * mul, tick: 0, color: "#8a3aff", big: true });
    floatText(x, y - 90, "Buraco negro!", "#c58bff", 30); sfx.dark(); sfx.grav(); return;
  }
  sfx.boom();
  const dmg = { normal: 26, terra: 22, ar: 10, energia: 19 }[T.id] * (mul > 1.5 ? 3 : 1);
  for (const f of fighters) {
    if (!f.alive || f === owner || !isEnemy(owner, f)) continue; // quem jogou a bomba não se machuca
    const dist = Math.min(...f.parts.map(p => hyp((p.a.x + p.b.x) / 2 - x, (p.a.y + p.b.y) / 2 - cy)));
    const self = f === owner, hit = dist < R + 8 * f.sc, fall = 1 - clamp(dist / R, 0, 1) * .45;
    if (hit) hurt(f, (self ? 7 : dmg) * fall, (f.pelvis.x - x) || 1, -.8, T.id === "ar" ? 200 : 620, self ? null : owner,
                  { fromX: x, snd: T.id === "energia" ? "magicHit" : "blunt", env: self, stun: T.id === "energia" ? .9 : T.id === "terra" ? .5 : undefined });
  }
  if (T.id === "terra") {
    // Terra: o chão treme e espinhos de pedra saem pelos dois lados.
    const gy = surfaceBelow(x, y - 20, false);
    const nS = Math.round(2 * mul);
    for (let i = -nS; i <= nS; i++) { const sx = x + i * 105; if (sx > WALL_L + 20 && sx < WALL_R - 20) fx.push({ type: "spikes", owner, x: sx, y: surfaceBelow(sx, gy - 40, false), t: .2 + Math.abs(i) * .07, life: 1, hit: false, dmg: 8 }); }
    dust(x, gy, 30, "#b08a5a"); sfx.rumble(); shake = Math.max(shake, 22);
  } else if (T.id === "ar") {
    // Ar: rajada de vento que arremessa todo mundo pra longe (inclusive você, se estiver perto).
    fx.push({ type: "gust", x, y: y - 30, t: 0, life: .55 });
    for (const f of fighters) {
      if (!f.alive || f === owner || !isEnemy(owner, f)) continue; // quem jogou a bomba não se machuca
      const dx = f.neck.x - x, dy = f.neck.y - (y - 30), d = hyp(dx, dy);
      if (d > 380 * mul) continue;
      const k = (1 - d / (420 * mul)) / Math.max(1, f.sc), dir = Math.sign(dx) || 1;
      for (const q of [...f.b, ...f.wpts]) { q.vx += dir * 1250 * k; q.vy -= 950 * k; }
      f.extT = 1.2; f.stun = Math.max(f.stun, .3);
    }
    floatText(x, y - 90, "Ventania!", "#e8f8ff", 30); sfx.whirl(); sfx.whoosh();
  } else if (T.id === "energia") {
    // Energia: descargas elétricas pulam até 4 inimigos por perto.
    const foes = fighters.filter(c => isEnemy(owner, c) && hyp(c.neck.x - x, c.neck.y - y) < 470 * mul).slice(0, Math.round(4 * mul));
    for (const c of foes) { fx.push({ type: "lightning", x1: x, y1: y - 20, x2: c.neck.x, y2: c.neck.y, t: 0, life: .4 }); hurt(c, 9, c.neck.x - x, -.3, 260, owner, { stun: .7, fromX: x, snd: "magicHit" }); spark(c.neck.x, c.neck.y, "#fff27a", 10); }
    flashScreen = .08; sfx.thunder();
  }
}
// Lâmpada: o gênio sai da lâmpada ("Seu desejo é uma ordem!") e realiza um desejo surpresa.
const WISHES = { raio: "Tempestade de raios!", cura: "Cura e proteção!", tornado: "Tornado!", ouro: "Chuva de ouro!", meteoros: "Meteoros!", pressa: "Super velocidade!", bolhas: "Prisão de bolhas!" };
function grantWish(e) {
  const o = e.owner, foes = fighters.filter(c => isEnemy(o, c)).sort((a, b) => Math.abs(a.pelvis.x - o.pelvis.x) - Math.abs(b.pelvis.x - o.pelvis.x));
  const wish = e.wish = foes.length ? pick(Object.keys(WISHES)) : pick(["cura", "pressa"]);
  floatText(e.gx, e.gy - 70, WISHES[wish], "#8fe3ff", 32); sfx.wish();
  const hx = e.gx + o.facing * 30, hy = e.gy - 10;
  if (wish === "raio") for (const c of foes.slice(0, 4)) { fx.push({ type: "lightning", x1: hx, y1: hy, x2: c.neck.x, y2: c.neck.y, t: 0, life: .35 }); hurt(c, 11, c.neck.x - hx, -.3, 360, o, { stun: .45, fromX: hx, snd: "magicHit" }); sfx.thunder(); }
  else if (wish === "cura") { heal(o, 25); o.shield = Math.max(o.shield, 3); stars(o.neck.x, o.neck.y, "#7dff9a", 30); }
  else if (wish === "tornado") { const c = foes[0]; fx.push({ type: "vortex", owner: o, x: c.neck.x, y: c.neck.y, t: 0, life: 1.8, tick: 0, color: "#5ac8ff" }); sfx.dark(); }
  else if (wish === "ouro") { for (const c of foes.slice(0, 2)) for (let i = 0; i < 9; i++) addProj("coin", c.neck.x + rnd(-130, 130), -20 - i * 30, Math.PI / 2, 200, o, { rot: rnd(6), dmg: 5 }); sfx.star(); }
  else if (wish === "meteoros") { for (const c of foes.slice(0, 3)) { const x = c.pelvis.x; fx.push({ type: "mark", x, y: surfaceBelow(x, c.pelvis.y - 5, false), t: 0, life: .8, r: 75, color: "#ffb34a", owner: o }); } sfx.star(); }
  else if (wish === "pressa") { o.hasteT = 6; stars(o.neck.x, o.neck.y, "#ffe95a", 24); }
  else for (const c of foes) if (hyp(c.neck.x - o.neck.x, c.neck.y - o.neck.y) < 800) startTrap(c, "bubble", 1.6, o);
}

// Bola de captura: abre e sai um bichinho que corre atrás dos inimigos.
// Elétrico (raios), de fogo (bafo de chamas) ou de água (jato que empurra e casco giratório).
const POKES = {
  pika:   { cry: "Pika Pika!",   color: "#ffe95a", keep: 140 },
  char:   { cry: "Chaaar!",      color: "#ff8a3a", keep: 130 },
  squirt: { cry: "Squirtle!",    color: "#5ac8ff", keep: 200 },
  bulba:  { cry: "Bulbasaur!",   color: "#7dff9a", keep: 230 },
};
function spawnPika(o, x, y, kind) {
  if (!o) return;
  kind = kind || pick(Object.keys(POKES));
  const P_ = POKES[kind], gy = surfaceBelow(x, y - 10, false);
  fx.push({ type: "pika", kind, owner: o, x, y: gy, t: 0, life: 7, zapT: .5, n: 0, dir: o.facing || 1, hop: 0, shellT: 0, actT: 0, blink: rnd(2, 4) });
  ring(x, gy - 20, "#ffffff", 90); ring(x, gy - 20, "#ff4a4a", 55); stars(x, gy - 20, P_.color, 22);
  for (let i = 0; i < 16; i++) particles.push({ x: x + rnd(-8, 8), y: gy - 14, vx: rnd(-40, 40), vy: rnd(-520, -220), life: .45, max: .45, color: pick(["#ffffff", "#ff8a8a", P_.color]), size: rnd(2, 4), g: 300, glow: true });
  floatText(x, gy - 95, P_.cry, P_.color, 30); sfx.capture();
  setTimeout(() => (kind === "pika" ? sfx.pika : kind === "char" ? sfx.char : kind === "bulba" ? sfx.bulba : sfx.squirt)(), 380);
}
function pikaStep(e, dt) {
  const o = e.owner;
  if (!o.alive) { e.t = e.life; return; }
  e.zapFx = Math.max(0, (e.zapFx || 0) - dt);
  if ((e.blink -= dt) < -.12) e.blink = rnd(2, 4);
  if (e.t >= e.life - .05 && !e.gone) { e.gone = true; ring(e.x, e.y - 20, "#ffffff", 60); ring(e.x, e.y - 20, "#ff4a4a", 40); stars(e.x, e.y - 20, "#ff4a4a", 12); }
  if (e.t < .45 || e.t > e.life - .3) return; // saindo da bola / voltando pra ela
  let tg = null, bd = 780;
  for (const c of fighters) { if (!isEnemy(o, c)) continue; const d = hyp(c.pelvis.x - e.x, c.pelvis.y - e.y); if (d < bd) { bd = d; tg = c; } }
  if (e.shellT > 0) {
    // Casco giratório: desliza atropelando quem estiver no caminho.
    e.shellT -= dt; e.spin = (e.spin || 0) + dt * 30;
    e.x = clamp(e.x + e.dir * 640 * dt, WALL_L + 20, WALL_R - 20); e.y = surfaceBelow(e.x, e.y - 12, false);
    if (e.x <= WALL_L + 21 || e.x >= WALL_R - 21) e.dir *= -1;
    for (const c of fighters) if (isEnemy(o, c) && !e.hits.has(c.id) && Math.abs(c.pelvis.x - e.x) < 42 && c.pelvis.y > e.y - 120 * c.sc && c.pelvis.y < e.y + 10) {
      e.hits.add(c.id); hurt(c, 9, e.dir, -.8, 650, o, { stun: .4, fromX: e.x, snd: "blunt" }); sfx.water();
    }
    if (rnd() < .5) particles.push({ x: e.x - e.dir * 20, y: e.y - 4, vx: -e.dir * rnd(60, 160), vy: rnd(-160, -40), life: .35, max: .35, color: pick(["#7ad8ff", "#ffffff"]), size: rnd(2, 4), g: 600 });
    return;
  }
  if (e.actT > 0) {
    // Ataque contínuo: bafo de fogo ou jato d'água na direção do alvo.
    e.actT -= dt;
    const ax = e.x + e.dir * 24, ay = e.y - 40, ang = tg ? Math.atan2(tg.neck.y + 20 - ay, tg.pelvis.x - ax) : (e.dir > 0 ? 0 : Math.PI);
    if (e.kind === "char" && rnd() < .38) addProj("flame", ax, ay, ang + rnd(-.18, .18), rnd(420, 580), o);
    if (e.kind === "squirt" && rnd() < .22) addProj("water", ax, ay, ang + rnd(-.06, .06) - .05 * e.dir, rnd(820, 950), o);
    return;
  }
  if (!tg) return;
  e.dir = Math.sign(tg.pelvis.x - e.x) || e.dir;
  if (Math.abs(tg.pelvis.x - e.x) > POKES[e.kind].keep) { e.x = clamp(e.x + e.dir * 290 * dt, WALL_L + 20, WALL_R - 20); e.hop += dt * 14; }
  e.y = surfaceBelow(e.x, e.y - 12, false);
  e.zapT -= dt;
  if (e.zapT > 0) return;
  e.n++;
  const big = e.n % 3 === 0;
  if (e.kind === "pika") {
    if (bd > 520) { e.zapT = .2; return; }
    e.zapT = .9;
    const x1 = e.x, y1 = e.y - 30;
    fx.push({ type: "lightning", x1, y1, x2: tg.neck.x, y2: tg.neck.y, t: 0, life: big ? .4 : .22 });
    if (big) { fx.push({ type: "lightning", x1: tg.neck.x + rnd(-30, 30), y1: 0, x2: tg.neck.x, y2: tg.neck.y, t: 0, life: .4 }); floatText(e.x, e.y - 90, "Piiika... CHUUU!", "#ffe95a", 30); flashScreen = .06; }
    hurt(tg, big ? 12 : 6, tg.neck.x - x1, -.3, big ? 520 : 220, o, { stun: big ? .5 : .3, fromX: x1, snd: "magicHit" });
    spark(tg.neck.x, tg.neck.y, "#ffe95a", 10); sfx.thunder(); e.zapFx = .25;
  } else if (e.kind === "char") {
    if (bd > 330) { e.zapT = .2; return; }
    e.zapT = 1.3; e.actT = big ? .9 : .45; e.zapFx = e.actT; sfx.flame(); sfx.char();
    if (big) floatText(e.x, e.y - 90, "Lança-chamas!", "#ff8a3a", 28);
  } else if (e.kind === "bulba") {
    // Folha navalha (3 folhas que perseguem) e, a cada 3, chicote de cipó que prende.
    if (bd > 520) { e.zapT = .2; return; }
    e.zapT = 1.1; e.zapFx = .3;
    const x1 = e.x + e.dir * 8, y1 = e.y - 44;
    if (big) {
      fx.push({ type: "vinewhip", x1, y1, x2: tg.neck.x, y2: tg.neck.y + 10, t: 0, life: .35 });
      hurt(tg, 10, tg.neck.x - x1, -.5, 320, o, { stun: .6, fromX: x1, snd: "blunt" });
      makeVines(tg.pelvis.x, surfaceBelow(tg.pelvis.x, tg.pelvis.y, false), o);
      floatText(e.x, e.y - 90, "Chicote de Cipó!", "#7dff9a", 28); sfx.whip();
    } else {
      const ang = Math.atan2(tg.neck.y - y1, tg.neck.x - x1);
      for (let i = -1; i <= 1; i++) addProj("leaf", x1, y1, ang + i * .25, 760, o, { rot: rnd(6) });
      sfx.leaf();
    }
  } else {
    if (bd > 460) { e.zapT = .2; return; }
    e.zapT = 1.2;
    if (big) { e.shellT = 1.1; e.hits = new Set(); floatText(e.x, e.y - 80, "Giro do casco!", "#5ac8ff", 26); sfx.whirl(); }
    else { e.actT = .45; e.zapFx = .45; sfx.water(); sfx.squirt(); }
  }
}
// Bloco mágico: vira uma plataforma temporária onde caiu (dá pra empilhar).
function placeBlock(x, gy) {
  const old = PLATFORMS.filter(p => p.temp);
  if (old.length >= 4) PLATFORMS.splice(PLATFORMS.indexOf(old[0]), 1);
  PLATFORMS.push({ x: x - 30, y: gy - 60, w: 60, temp: true, life: 9 });
  dust(x, gy, 14, "#9a7a5a"); shake = Math.max(shake, 6); sfx.thud();
}
function updateBlocks(dt) {
  for (const p of PLATFORMS) if (p.hitT > 0) p.hitT -= dt;
  for (const p of PLATFORMS) if (p.temp && (p.life -= dt) <= 0) { dust(p.x + 30, p.y + 30, 16, "#7a5230"); stars(p.x + 30, p.y + 30, "#5aa83a", 10); }
  for (let i = PLATFORMS.length - 1; i >= 0; i--) if (PLATFORMS[i].temp && PLATFORMS[i].life <= 0) PLATFORMS.splice(i, 1);
}

// ───────────────────────── Mega Buster (relíquia do Mecha) ─────────────────────────
// Tiro normal com carga + 8 poderes de robôs. Cada poder gasta energia, que volta aos poucos.
const MM_MAX = 28;
const MM_POWERS = [
  { id: "buster", name: "Mega Buster",        c1: "#2a7ad8", c2: "#7ac8ff", cost: 0 },
  { id: "cutter", name: "Cortador Giratório", c1: "#8a8f96", c2: "#f4f4f4", cost: 2 },
  { id: "guts",   name: "Super Braço",        c1: "#b8501a", c2: "#f0c890", cost: 6 },
  { id: "ice",    name: "Lâmina de Gelo",     c1: "#2a5ad8", c2: "#e8f8ff", cost: 2 },
  { id: "bomb",   name: "Hiper Bomba",        c1: "#2a9a3a", c2: "#e8f0a0", cost: 3 },
  { id: "fire",   name: "Tempestade de Fogo", c1: "#d83a1a", c2: "#ffd84a", cost: 2 },
  { id: "elec",   name: "Raio Trovão",        c1: "#8a8a4a", c2: "#fff27a", cost: 3 },
  { id: "time",   name: "Tempo Lento",        c1: "#8a3ac8", c2: "#f0c8ff", cost: 10 },
  { id: "oil",    name: "Deslizador de Óleo", c1: "#3a3a4a", c2: "#d8d0a0", cost: 4 },
];
function mmSet(f, i) {
  if (!f.mmEn || !f.alive) return;
  i = ((i % MM_POWERS.length) + MM_POWERS.length) % MM_POWERS.length;
  if (i === f.mmPow) return;
  f.mmPow = i; f.charge = 0; f.chargeLvl = 0;
  if (f.bot) f.bot.charging = false; else f.pl.input.charging = false;
  const P_ = MM_POWERS[i], tip = f.wtip || f.rh;
  ring(tip.x, tip.y, P_.c2, 40); ring(f.neck.x, f.neck.y, P_.c1, 70); stars(tip.x, tip.y, P_.c2, 12);
  floatText(f.head.x, f.head.y - 70 * f.sc, P_.name, P_.c2, 24); sfx.mmSwitch();
}
function mmFire(f, ox, oy) {
  const i = f.mmPow, P_ = MM_POWERS[i], a = f.aim, sx = Math.cos(a) >= 0 ? 1 : -1;
  if (f.mmEn[i] < P_.cost) {
    if (!f.bot) floatText(f.head.x, f.head.y - 60 * f.sc, "Sem energia!", "#9aa3ab", 20);
    sfx.mmEmpty(); f.cdOverride = .3; if (f.bot) mmSet(f, 0); return true;
  }
  f.mmEn[i] -= P_.cost;
  muzzle(f, ox, oy, P_.c2, 1);
  switch (P_.id) {
    case "cutter": addProj("cutter", ox, oy, a, 1150, f, { dir: a, back: false }); f.cdOverride = .4; sfx.throw(); break;
    case "guts":
      addProj("gutsblock", ox, oy - 24 * f.sc, a - .28 * sx, 920, f); f.cdOverride = .8; sfx.throw(); shake = Math.max(shake, 5);
      floatText(f.head.x, f.head.y - 60 * f.sc, "Hup!", "#f0c890", 20); break;
    case "ice": addProj("iceslash", ox, oy, a, 1500, f); f.cdOverride = .38; sfx.ice(); break;
    case "bomb": addProj("hyperbomb", ox, oy, a - .38 * sx, 840, f); f.cdOverride = .6; sfx.throw(); break;
    case "fire":
      addProj("firestorm", ox, oy, a, 1100, f); f.cdOverride = .55; sfx.fire();
      fx.push({ type: "fireshield", owner: f, t: 0, life: 1.1, tick: 0 }); break;
    case "elec":
      // Raio pra frente, pra cima e pra baixo, atravessando todo mundo.
      for (const da of [0, -Math.PI / 2, Math.PI / 2]) addProj("thunder", ox, oy, a + da, 1500, f);
      f.cdOverride = .6; sfx.zap(); sfx.thunder(); flashScreen = .05; break;
    case "time": {
      for (const e of fighters) if (isEnemy(f, e) && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 950) { slowDown(e, 3.5); e.mmSlowT = e.boss ? 1.8 : 3.5; }
      fx.push({ type: "mmclock", owner: f, x: f.neck.x, y: f.neck.y, t: 0, life: 1.2 });
      floatText(f.head.x, f.head.y - 95, "Tempo lento!", P_.c2, 30); sfx.timestop(); f.cdOverride = 1.1; break;
    }
    case "oil":
      f.sk = { id: "oil", t: 0, dur: .75, dir: sx, drop: 0, hits: new Set() };
      fx.push({ type: "oilboard", owner: f, t: 0, life: .75 }); bodyPush(f, sx * 400, -150);
      f.cdOverride = .9; sfx.dash(); break;
  }
  return true;
}

// ───────────────────────── Poderes especiais das armas (botão PODER) ─────────────────────────
// O nome de cada poder fica em weapons.js (SKILL_INFO); aqui vão recarga, cor e alcance (pros bots).
const SKILLS = {
  adaga:        { cd: 6,   color: "#c58bff", range: 520 },
  espada:       { cd: 5,   color: "#e8f0ff", range: 130 },
  espadaLonga:  { cd: 5,   color: "#bff0ff", range: 650 },
  rapieira:     { cd: 5,   color: "#ffe95a", range: 230 },
  machado:      { cd: 4.5, color: "#ffd8a0", range: 600 },
  machadoDuplo: { cd: 7,   color: "#cfe0ff", range: 200 },
  maca:         { cd: 6,   color: "#e8c88a", range: 240 },
  martelo:      { cd: 6,   color: "#d8a86a", range: 560 },
  lanca:        { cd: 6,   color: "#ff8a5a", range: 420 },
  alabarda:     { cd: 6,   color: "#9fe8d0", range: 170 },
  foice:        { cd: 7,   color: "#7dff9a", range: 200 },
  chicote:      { cd: 6,   color: "#e8b84a", range: 500 },
  arco:         { cd: 7,   color: "#ffd84a", range: 850 },
  funda:        { cd: 6,   color: "#c8b8a0", range: 600 },
  machadinhas:  { cd: 6,   color: "#ffd8a0", range: 420 },
  bombas:       { cd: 6,   color: "#7dff9a", range: 480 },
  varinha:      { cd: 6,   color: "#ff8af0", range: 750 },
  mangual:      { cd: 6,   color: "#c3cad0", range: 360 },
  sabreDuplo:   { cd: 5,   color: "#ff4a4a", range: 600 },
  cajadoFogo:   { cd: 7,   color: "#ff7a1a", range: 500 },
  espadaEscudo:         { cd: 5,   color: "#ffe9a0", range: 260 },
  espadaFlamejante:     { cd: 6,   color: "#ff7a1a", range: 130 },
  marteloTrovao:        { cd: 7,   color: "#fff27a", range: 800 },
  clava:                { cd: 12,  color: "#ff4a3a", range: 300 },
  tridente:             { cd: 6,   color: "#5ac8ff", range: 650 },
  besta:                { cd: 5,   color: "#ffd8a0", range: 800 },
  chakram:              { cd: 8,   color: "#ffe9a0", range: 160 },
  cajadoGelo:           { cd: 8,   color: "#bff0ff", range: 600 },
  cajadoNatureza:       { cd: 7,   color: "#7dff6a", range: 550 },
  sabreLuz:             { cd: 6,   color: "#7ad8ff", range: 300 },
  marteloGravitacional: { cd: 8,   color: "#b06cff", range: 400 },
  punhosCiber:          { cd: 5,   color: "#5affd8", range: 650 },
  katana:               { cd: 6,   color: "#ff5a7a", range: 340 },
  guitarra:             { cd: 7,   color: "#ff8af0", range: 240 },
  livroVida:            { cd: 10,  color: "#7dff9a", range: 9999 },
  anelLanterna:         { cd: 9,   color: "#7dff6a", range: 300 },
  lacoVerdade:          { cd: 7,   color: "#ffd84a", range: 500 },
  laminasCaos:          { cd: 7,   color: "#ff7a1a", range: 180 },
  laminaTerra:          { cd: 5,   color: "#7dff6a", range: 600 },
  alhoPoro:             { cd: 7,   color: "#39c5bb", range: 220 },
  crisol:               { cd: 6,   color: "#ff3a1a", range: 520 },
  bfg:                  { cd: 7,   color: "#7dff5a", range: 700 },
  espadaMestra:         { cd: 6,   color: "#bfe8ff", range: 170 },
  keyblade:             { cd: 7,   color: "#ffe27a", range: 200 },
  espadaBuster:         { cd: 7,   color: "#7ad8ff", range: 260 },
  machadoLeviata:       { cd: 5,   color: "#bff0ff", range: 650 },
  espadaEnergia:        { cd: 9,   color: "#5ab8ff", range: 9999 },
  armaPortal:           { cd: 5,   color: "#ff9a3a", range: 9999 },
  paShovel:             { cd: 5,   color: "#b08a5a", range: 450 },
  espadaDiamante:       { cd: 12,  color: "#c58bff", range: 9999 },
  frigideira:           { cd: 12,  color: "#ffd8a0", range: 9999 },
  masamune:             { cd: 6,   color: "#d8e0ff", range: 240 },
  armaGravidade:        { cd: 7,   color: "#ffa040", range: 550 },
  livroLuz:             { cd: 10,  color: "#ffe27a", range: 9999 },
  cajadoVazio:          { cd: 6,   color: "#9a4aff", range: 9999 },
};
const hasSkill = (f) => !!SKILLS[f.wtype] && !f.boss && !f.minion && !f.zombie;
function bodyPush(f, vx, vy) { for (const p of [...f.b, ...f.wpts]) { p.vx += vx; p.vy += vy; } f.extT = Math.max(f.extT || 0, .6); }
function moveBody(f, tx, ty) { for (const p of [...f.b, ...f.wpts]) { p.x += tx; p.y += ty; p.ox += tx; p.oy += ty; p.vx *= .2; p.vy *= .2; } }
function nearestFoe(f, range) {
  let tg = null, bd = range;
  for (const e of fighters) { if (!isEnemy(f, e)) continue; const d = hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y); if (d < bd) { bd = d; tg = e; } }
  return tg;
}
// Acerta todos os inimigos perto de (x, y). o.front = só do lado da frente; o.skip = quem já levou.
function areaHit(f, x, y, r, dmg, kb, o = {}) {
  const out = [];
  for (const e of fighters) {
    if (!isEnemy(f, e) || (o.skip && o.skip.has(e.id))) continue;
    const d = Math.min(hyp(e.neck.x - x, e.neck.y - y), hyp(e.pelvis.x - x, e.pelvis.y - y), hyp(e.head.x - x, e.head.y - y));
    if (d > r + 12 * e.sc) continue;
    if (o.front && Math.sign(e.neck.x - f.neck.x) !== o.front && Math.abs(e.neck.x - f.neck.x) > 30) continue;
    if (o.skip) o.skip.add(e.id);
    if (hurt(e, dmg, (e.neck.x - x) || 1, o.up ?? -.4, kb, f, { fromX: x, snd: o.snd || "blade", stun: o.stun, crit: o.crit, quiet: o.quiet })) out.push(e);
  }
  return out;
}
function useSkill(f) {
  const S = SKILLS[f.wtype];
  if (!S || !hasSkill(f) || !f.alive) return;
  if (f.skillCd > 0) { if (!f.bot) { floatText(f.head.x, f.head.y - 60 * f.sc, `Poder em ${Math.ceil(f.skillCd)}s`, "#9aa3ab", 18); sfx.mmEmpty(); } return; }
  f.skillCd = S.cd;
  const s = f.sc, a = f.aim, dx = Math.cos(a), dy = Math.sin(a), sx = dx >= 0 ? 1 : -1, col = f.w.glow || S.color;
  const ox = f.rh.x + dx * 24, oy = f.rh.y + dy * 24;
  f.facing = sx;
  floatText(f.head.x, f.head.y - 85 * s, f.w.skill + "!", col, 26); ring(f.neck.x, f.neck.y, col, 70); sfx.skill();
  for (let i = 0; i < 14; i++) { const an = rnd(Math.PI * 2); particles.push({ x: f.neck.x + Math.cos(an) * 60, y: f.neck.y + 20 + Math.sin(an) * 60, vx: -Math.cos(an) * 200, vy: -Math.sin(an) * 200, life: .3, max: .3, color: col, size: rnd(2, 4), g: 0, glow: true }); }
  switch (f.wtype) {
    case "adaga": {
      // Some na fumaça e aparece nas costas do inimigo mais perto, já golpeando.
      const e = nearestFoe(f, 680);
      poof(f, "#6a2fa0");
      if (e) {
        const side = -(e.facing || 1), tx = clamp(e.pelvis.x + side * 55 * e.sc, WALL_L + 30, WALL_R - 30);
        moveBody(f, tx - f.pelvis.x, Math.min(0, e.pelvis.y - f.pelvis.y));
        f.facing = Math.sign(e.pelvis.x - f.pelvis.x) || 1;
        poof(f, "#6a2fa0"); fx.push({ type: "slashx", x: e.neck.x, y: e.neck.y + 10, t: 0, life: .35, color: "#c58bff", r: 55 * e.sc });
        hurt(e, 14, f.facing, -.4, 420, f, { crit: true, stun: .55, fromX: f.neck.x, snd: "blade" });
      } else moveBody(f, clamp(f.pelvis.x + sx * 260, WALL_L + 30, WALL_R - 30) - f.pelvis.x, 0);
      sfx.tele(); break;
    }
    case "espada":
      // Giro com a espada em volta do corpo: acerta todo mundo perto.
      fx.push({ type: "spinslash", owner: f, t: 0, life: .4, color: "#e8f0ff", r: 125 * s, dir: sx });
      bodyPush(f, 0, -380);
      areaHit(f, f.neck.x, f.neck.y + 10, 125 * s, 12, 560, { up: -.8, stun: .35 });
      sfx.whirl(); break;
    case "espadaLonga": addProj("windslash", ox, oy, a, 1250, f); sfx.whirl(); sfx.blade(true); break;
    case "rapieira": f.sk = { id: "flurry", t: 0, dur: .55, dir: sx, tick: 0, n: 0 }; bodyPush(f, sx * 650, -100); sfx.dash(); break;
    case "machado": addProj("boomaxe", ox, oy, a, 1200, f, { dir: a, back: false }); sfx.throw(); break;
    case "machadoDuplo": f.sk = { id: "whirl", t: 0, dur: 1.3, dir: sx, tick: 0 }; fx.push({ type: "whirl", owner: f, t: 0, life: 1.3 }); sfx.whirl(); break;
    case "maca": f.sk = { id: "quake", t: 0, dur: 1.6, dir: sx }; bodyPush(f, sx * 200, -1150); sfx.dash(); break;
    case "martelo": {
      // Bate no chão e uma fileira de espinhos de pedra corre pra frente.
      const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
      shockwave(f, f.pelvis.x + sx * 40, gy, 140, 7);
      for (let i = 0; i < 5; i++) {
        const x = f.pelvis.x + sx * (115 + i * 95); if (x < WALL_L + 20 || x > WALL_R - 20) break;
        fx.push({ type: "spikes", owner: f, x, y: surfaceBelow(x, gy - 40, false), t: -i * .09, life: 1.0, hit: false, dmg: 8 });
      }
      break;
    }
    case "lanca": f.sk = { id: "dragon", t: 0, dur: 1.5, dir: sx, hits: new Set() }; bodyPush(f, sx * 250, -1350); sfx.dash(); break;
    case "alabarda":
      // Giro largo na frente que joga todos pro alto.
      fx.push({ type: "sweeparc", owner: f, t: 0, life: .4, color: "#9fe8d0", r: 175 * s, dir: sx });
      for (const e of areaHit(f, f.neck.x + sx * 60 * s, f.neck.y + 20, 150 * s, 10, 150, { front: sx, stun: .6, up: -1 })) {
        const k = 1 / Math.max(1, e.sc); for (const q of [...e.b, ...e.wpts]) { q.vy = -950 * k; q.vx += sx * 220 * k; } e.extT = 1.1;
      }
      sfx.whirl(); break;
    case "foice": {
      // Ceifa em volta: rouba um pouco de vida de cada um que acertar.
      fx.push({ type: "reap", owner: f, t: 0, life: .6, r: 200 * s, dir: sx });
      const hit = areaHit(f, f.neck.x, f.neck.y + 10, 200 * s, 9, 300, { stun: .4, snd: "magicHit" });
      for (const e of hit) for (let i = 0; i < 8; i++) particles.push({ x: e.neck.x + rnd(-15, 15), y: e.neck.y + rnd(-15, 25), vx: (f.neck.x - e.neck.x) / .55 + rnd(-40, 40), vy: (f.neck.y - e.neck.y) / .55 + rnd(-60, 0), life: .55, max: .55, color: pick(["#7dff9a", "#d8ffe0", "#3aa85a"]), size: rnd(3, 6), g: 0, glow: true });
      if (hit.length) heal(f, 5 * hit.length);
      sfx.reap(); break;
    }
    case "chicote": {
      // Laça o inimigo na mira, puxa pro alto e bate ele no chão.
      const e = enemyInCone(f, .7, 560) || nearestFoe(f, 420);
      if (!e) { fx.push({ type: "fizzle", x1: f.rh.x, y1: f.rh.y, x2: f.rh.x + dx * 300, y2: f.rh.y + dy * 300, color: "#e8b84a", t: 0, life: .35 }); break; }
      fx.push({ type: "lasso", owner: f, target: e, t: 0, life: .6 });
      hurt(e, 5, f.neck.x - e.neck.x, -1, 0, f, { stun: 1.0, fromX: f.neck.x, snd: "blunt" });
      floatText(e.head.x, e.head.y - 60, "Laçado!", "#e8b84a", 26); sfx.whip?.(); break;
    }
    case "arco": {
      const e = enemyInCone(f, .8, 1000) || nearestFoe(f, 900), x = e ? e.pelvis.x : aimPoint(f, 700).x;
      fx.push({ type: "arrowrain", owner: f, x: clamp(x, WALL_L + 60, WALL_R - 60), y: surfaceBelow(clamp(x, WALL_L + 60, WALL_R - 60), e ? e.pelvis.y : FLOOR - 50, false), t: 0, life: 1.2, tick: .25 });
      for (let i = 0; i < 10; i++) particles.push({ x: f.rh.x, y: f.rh.y, vx: sx * rnd(-60, 60), vy: rnd(-900, -600), life: .35, max: .35, color: "#ffd84a", size: 2.5, g: 0, line: true });
      sfx.bow(); break;
    }
    case "funda": addProj("boulder", ox, oy - 10, a - .3 * sx, 950, f, { dmg: 16 }); sfx.sling(); break;
    case "machadinhas": for (let i = -3; i <= 3; i++) addProj("axe", ox, oy, a - .12 * sx + i * .14, 1150, f, { spinDir: sx }); sfx.throw(); break;
    case "bombas": for (let i = 0; i < 5; i++) addProj("flask", ox, oy, a - .25 * sx - sx * i * .12, 600 + i * 90, f); sfx.throw(); break;
    case "varinha": for (let i = 0; i < 5; i++) addProj("firework", ox, oy, -Math.PI / 2 + (i - 2) * .32, 700 + rnd(-60, 60), f, { hue: i }); sfx.whoosh(); break;
    case "mangual": addProj("wreck", ox, oy, a - .1 * sx, 1300, f); sfx.throw(); break;
    case "sabreDuplo": addProj("saberdisc", ox, oy, a, 1250, f, { dir: a, back: false, color: f.w.glow || "#ff4a4a" }); sfx.saber(); break;
    case "espadaEscudo": f.sk = { id: "bash", t: 0, dur: .38, dir: sx, hits: new Set() }; f.shield = Math.max(f.shield, .45); sfx.dash(); sfx.shield(); break;
    case "espadaFlamejante":
      f.sk = { id: "phoenix", t: 0, dur: .6, dir: sx, hits: new Set() }; fx.push({ type: "phoenixfx", owner: f, t: 0, life: .65 });
      bodyPush(f, sx * 150, -1100); flameBurst(f.pelvis.x, f.pelvis.y + 30); break;
    case "marteloTrovao": {
      // Raios caem do céu em até 4 inimigos, um depois do outro.
      const foes = fighters.filter(c => isEnemy(f, c) && hyp(c.neck.x - f.neck.x, c.neck.y - f.neck.y) < 900).sort((p, q) => Math.abs(p.pelvis.x - f.pelvis.x) - Math.abs(q.pelvis.x - f.pelvis.x)).slice(0, 4);
      foes.forEach((c, i) => fx.push({ type: "skybolt", owner: f, target: c, t: -i * .16 - .1, life: .3 }));
      if (!foes.length) fx.push({ type: "lightning", x1: f.neck.x + rnd(-40, 40), y1: 0, x2: f.wtip ? f.wtip.x : f.neck.x, y2: f.wtip ? f.wtip.y : f.neck.y, t: 0, life: .35 });
      sfx.thunder(); flashScreen = .06; break;
    }
    case "clava":
      if (!(f.rageT > 0)) { f.rageBase = f.dmgMul; f.rageKb = f.kbMul; }
      f.rageT = 5; f.dmgMul = (f.rageBase || 1) * 1.6; f.kbMul = (f.rageKb ?? 1) * .55;
      floatText(f.head.x, f.head.y - 110, "RAAAAH!", "#ff4a3a", 36); shake = Math.max(shake, 10); ring(f.neck.x, f.neck.y, "#ff4a3a", 110); sfx.rumble(); break;
    case "tridente": addProj("tidal", f.pelvis.x + sx * 50, f.pelvis.y + 10, sx > 0 ? 0 : Math.PI, 760, f); sfx.water(); sfx.whoosh(); break;
    case "besta": for (let i = -1; i <= 1; i++) addProj("bolt", ox, oy, a + i * .09, 2100, f, { dmg: 16 }); sfx.crossbow(); muzzle(f, ox, oy, "#ffd8a0", 2); break;
    case "chakram": fx.push({ type: "bladering", owner: f, t: 0, life: 2.6, tick: 0 }); sfx.whirl(); break;
    case "cajadoGelo": {
      const e = enemyInCone(f, .8, 900) || nearestFoe(f, 800), p = e ? { x: e.pelvis.x, y: e.neck.y + 20 } : aimPoint(f, 600);
      fx.push({ type: "blizzard", owner: f, x: clamp(p.x, WALL_L + 80, WALL_R - 80), y: p.y, t: 0, life: 2.6, tick: 0 }); sfx.ice(); sfx.whoosh(); break;
    }
    case "cajadoNatureza": {
      const e = nearestFoe(f, 900), cx = e ? e.pelvis.x : f.pelvis.x + sx * 250;
      for (const off of [-150, 0, 150]) { const x = clamp(cx + off, WALL_L + 40, WALL_R - 40); makeVines(x, surfaceBelow(x, (e ? e.pelvis.y : f.pelvis.y) - 20, false), f); }
      heal(f, 10); sfx.rumble(); break;
    }
    case "sabreLuz": {
      // Empurrão da Força: arremessa quem estiver na frente e rebate os tiros.
      fx.push({ type: "forcewave", owner: f, x: f.neck.x, y: f.neck.y + 15, dir: sx, t: 0, life: .45 });
      for (const e of fighters) {
        if (!isEnemy(f, e)) continue;
        const dx2 = e.neck.x - f.neck.x, dy2 = e.neck.y - f.neck.y;
        if (dx2 * sx < -20 || hyp(dx2, dy2) > 380 || Math.abs(dy2) > 200) continue;
        const k = 1 / Math.max(1, e.sc); for (const q of [...e.b, ...e.wpts]) { q.vx += sx * 1300 * k; q.vy -= 420 * k; }
        e.extT = 1.2; hurt(e, 5, sx, -.4, 0, f, { stun: .6, fromX: f.neck.x, snd: "magicHit" });
      }
      for (const pr of projectiles) if (pr.owner !== f && (pr.x - f.neck.x) * sx > -20 && hyp(pr.x - f.neck.x, pr.y - f.neck.y) < 380) { pr.vx = Math.abs(pr.vx) * sx * 1.1; pr.vy *= -.5; pr.owner = f; pr.hits = new Set(); }
      sfx.whoosh(); sfx.saber(); shake = Math.max(shake, 8); break;
    }
    case "marteloGravitacional": {
      // Gravidade Zero: todo mundo perto flutua... e depois cai com tudo.
      const tg = fighters.filter(c => isEnemy(f, c) && hyp(c.neck.x - f.neck.x, c.neck.y - f.neck.y) < 450);
      for (const c of tg) { const k = 1 / Math.max(1, c.sc); for (const q of [...c.b, ...c.wpts]) { q.vy = -820 * k; q.vx *= .3; } c.extT = 1.2; c.stun = Math.max(c.stun, .9 * (c.boss ? .4 : 1)); }
      fx.push({ type: "gravslam", owner: f, targets: tg, t: 0, life: 1.0 }); ring(f.neck.x, f.neck.y, "#b06cff", 160); sfx.grav(); break;
    }
    case "punhosCiber": addProj("rocketfist", ox, oy, a, 1150, f); sfx.dash(); muzzle(f, ox, oy, "#5affd8", 2); floatText(f.head.x, f.head.y - 60, "Soco Foguete!", "#5affd8", 22); break;
    case "katana": {
      // Corte Instantâneo: atravessa a tela num piscar; quem ficou no caminho é cortado logo depois.
      const x0 = f.pelvis.x, x1 = clamp(x0 + sx * 380, WALL_L + 40, WALL_R - 40), lo = Math.min(x0, x1) - 25, hi = Math.max(x0, x1) + 25;
      const cut = fighters.filter(c => isEnemy(f, c) && c.pelvis.x > lo && c.pelvis.x < hi && Math.abs(c.pelvis.y - f.pelvis.y) < 110 * Math.max(1, c.sc * .7));
      fx.push({ type: "iaido", x1: x0, x2: x1, y: f.neck.y + 20, t: 0, life: .45 });
      moveBody(f, x1 - x0, 0); f.facing = sx;
      fx.push({ type: "delayedcut", owner: f, targets: cut, t: 0, life: .4 }); sfx.dash(); break;
    }
    case "guitarra": {
      drumBeat(f, 280, 10);
      for (const e of fighters) if (isEnemy(f, e) && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 280) confuse(e, 2);
      for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2; particles.push({ x: f.neck.x, y: f.neck.y, vx: Math.cos(an) * 320, vy: Math.sin(an) * 320, life: .7, max: .7, color: pick(["#ff8af0", "#ffd84a", "#7ad8ff"]), text: pick(["♪", "♫", "♬"]), size: 26, g: 0 }); }
      shake = Math.max(shake, 12); break;
    }
    case "anelLanterna":
      // Bolha de luz verde: escudo em você e nos aliados por perto.
      for (const c of fighters) if (c.alive && (c === f || (f.team && c.team === f.team)) && hyp(c.neck.x - f.neck.x, c.neck.y - f.neck.y) < 300) { c.shield = Math.max(c.shield, 2.5); ring(c.neck.x, c.neck.y, "#7dff6a", 80); }
      sfx.shield(); break;
    case "lacoVerdade": f.reflectT = 1.6; fx.push({ type: "bracelets", owner: f, t: 0, life: 1.6 }); sfx.clang(); break;
    case "laminasCaos": fx.push({ type: "bladering", owner: f, t: 0, life: 1.6, tick: 0, fire: true }); sfx.fire(); sfx.whirl(); break;
    case "laminaTerra": for (let i = -2; i <= 2; i++) terraBeam(f, a + i * .16, { dmg: 9 }); sfx.blade(true); break;
    case "alhoPoro": {
      f.sk = { id: "whirl", t: 0, dur: .9, dir: sx, tick: 0 }; fx.push({ type: "whirl", owner: f, t: 0, life: .9 });
      for (const e of foesOf(f, 260)) { confuse(e, 2.2); hurt(e, 6, e.neck.x - f.neck.x || 1, -.6, 400, f, { stun: .3, fromX: f.neck.x, snd: "magicHit" }); }
      for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2; particles.push({ x: f.neck.x, y: f.neck.y, vx: Math.cos(an) * 300, vy: Math.sin(an) * 300, life: .7, max: .7, color: pick(["#39c5bb", "#ff6fb5", "#ffffff"]), text: pick(["♪", "♫", "♬"]), size: 26, g: 0 }); }
      floatText(f.head.x, f.head.y - 110, "♪ Ievan Polkka ♪", "#39c5bb", 30); sfx.notes?.(); break;
    }
    case "crisol": {
      // Investida Glória: avança até o inimigo mais perto num corte vermelho.
      const e = nearestFoe(f, 560);
      if (e) {
        const side = Math.sign(e.pelvis.x - f.pelvis.x) || sx;
        for (let i = 0; i < 20; i++) particles.push({ x: lerp(f.pelvis.x, e.pelvis.x, rnd()), y: f.neck.y + rnd(-10, 50), vx: -side * rnd(100, 300), vy: rnd(-30, 30), life: .35, max: .35, color: "#ff3a1a", size: rnd(2, 4), g: 0, glow: true, line: true });
        moveBody(f, clamp(e.pelvis.x - side * 60 * e.sc, WALL_L + 30, WALL_R - 30) - f.pelvis.x, Math.min(0, e.pelvis.y - f.pelvis.y)); f.facing = side; f.atkT = .2;
        fx.push({ type: "slashx", x: e.neck.x, y: e.neck.y + 10, t: 0, life: .35, color: "#ff3a1a", r: 60 * e.sc });
        if (hurt(e, 16, side, -.5, 520, f, { crit: true, stun: .5, fromX: f.neck.x, snd: "blade" })) gloryKill(f, e);
      } else bodyPush(f, sx * 900, -150);
      sfx.dash(); break;
    }
    case "bfg": for (let i = -2; i <= 2; i++) addProj("plasma", ox, oy, a + i * .12, 900, f, { dmg: 7 }); muzzle(f, ox, oy, "#7dff5a", 2); sfx.plasma(); break;
    case "espadaMestra":
      // Ataque Giratório: gira com a espada brilhando.
      f.sk = { id: "whirl", t: 0, dur: .55, dir: sx, tick: 0 }; fx.push({ type: "whirl", owner: f, t: 0, life: .55, col: "#bfe8ff" });
      areaHit(f, f.neck.x, f.neck.y + 15, 150 * s, 15, 650, { stun: .4, up: -.7 });
      fx.push({ type: "nova2", x: f.neck.x, y: f.neck.y + 15, t: 0, life: .4, r: 160, color: "#bfe8ff" }); sfx.whirl(); break;
    case "keyblade": f.sk = { id: "flurry", t: 0, dur: 1.0, dir: sx, tick: 0, n: 0, big: true }; bodyPush(f, sx * 500, -100); sfx.dash(); break;
    case "espadaBuster": f.sk = { id: "braver", t: 0, dur: 1.4 }; sfx.dash(); break;
    case "machadoLeviata": addProj("leviathan", ox, oy, a, 1350, f, { dir: a, back: false }); sfx.throw(); break;
    case "espadaEnergia":
      // Camuflagem ativa: some da vista por 6s (os bots perdem você e tiros teleguiados não te seguem),
      // fica mais rápido e o primeiro golpe sai como ataque surpresa (dano dobrado e atordoa).
      f.cloakT = 6; f.hasteT = Math.max(f.hasteT, 6); poof(f, "#5ab8ff"); sfx.tele();
      for (const e of fighters) if (e.bot && isEnemy(e, f)) e.think = .6; // quem estava te mirando fica perdido
      break;
    case "armaPortal": {
      // Salto de Portal: entra num portal azul e sai num laranja onde mirou.
      const p = aimPoint(f, 460), tx = clamp(p.x, WALL_L + 40, WALL_R - 40), ty = (p.ground ? p.y - 60 : p.y);
      fx.push({ type: "portalfx", x: f.pelvis.x, y: f.pelvis.y + 30, c: 0, t: 0, life: .5 });
      moveBody(f, tx - f.pelvis.x, ty - f.pelvis.y);
      fx.push({ type: "portalfx", x: f.pelvis.x, y: f.pelvis.y + 30, c: 1, t: 0, life: .5 }); sfx.tele(); break;
    }
    case "paShovel": for (let i = 0; i < 5; i++) addProj("rockfrag", ox, oy, a - .5 + i * .25 - .2 * sx, rnd(650, 800), f, { dmg: 6, rot: rnd(6) }); dust(ox, oy, 12, "#b08a5a"); sfx.rumble(); break;
    case "espadaDiamante":
      // Poção de Força: 6s batendo 50% mais forte.
      if (!(f.rageT > 0)) { f.rageBase = f.dmgMul; f.rageKb = f.kbMul; }
      f.rageT = 6; f.dmgMul = (f.rageBase || 1) * 1.5; f.kbMul = f.rageKb ?? 1;
      for (let i = 0; i < 20; i++) particles.push({ x: f.neck.x + rnd(-25, 25), y: f.neck.y + rnd(-10, 60), vx: rnd(-40, 40), vy: rnd(-160, -60), life: .8, max: .8, color: pick(["#c58bff", "#ff5a7a", "#ffffff"]), size: rnd(3, 6), g: -40, glow: true });
      floatText(f.head.x, f.head.y - 110, "Força II", "#c58bff", 26); sfx.heal(); break;
    case "frigideira":
      heal(f, 18); floatText(f.head.x, f.head.y - 110, "Winner winner chicken dinner!", "#ffd84a", 22);
      for (let i = 0; i < 8; i++) particles.push({ x: f.neck.x, y: f.neck.y - 20, vx: rnd(-200, 200), vy: rnd(-420, -200), life: 1, max: 1, color: "#ffd84a", text: "🍗", size: 24, g: 900 }); break;
    case "masamune": f.sk = { id: "octa", t: 0, dur: .75, dir: sx, tick: 0, n: 0 }; sfx.blade(true); break;
    case "armaGravidade":
      // Atração: puxa todo mundo por perto pra frente de você.
      for (const e of foesOf(f, 560)) { const dx = f.neck.x + sx * 70 - e.neck.x; launch(e, dx * 2.2, -380); e.stun = Math.max(e.stun, .5); fx.push({ type: "lightning", x1: f.rh.x, y1: f.rh.y, x2: e.neck.x, y2: e.neck.y, t: 0, life: .2, col: "#ffa040" }); }
      fx.push({ type: "gravcone", x: ox, y: oy, ang: a, t: 0, life: .35, pull: true }); sfx.grav(); break;
    case "livroLuz":
      for (const c of fighters) if (c.alive && (c === f || (f.team && c.team === f.team)) && hyp(c.neck.x - f.neck.x, c.neck.y - f.neck.y) < 320) { c.shield = Math.max(c.shield, 3); heal(c, 6, true); ring(c.neck.x, c.neck.y, "#ffe27a", 80); }
      sfx.shield(); break;
    case "cajadoVazio": {
      // Passo do Vazio: some num rasgo e deixa um buraco negro onde estava.
      const p = aimPoint(f, 400), tx = clamp(p.x, WALL_L + 40, WALL_R - 40), ty = (p.ground ? p.y - 60 : p.y);
      fx.push({ type: "vortex", owner: f, x: f.neck.x, y: f.neck.y + 20, t: 0, life: 1.2, tick: 0, color: "#9a4aff" });
      moveBody(f, tx - f.pelvis.x, ty - f.pelvis.y); poof(f, "#6a2aff"); sfx.tele(); sfx.dark(); break;
    }
    case "livroVida":
      // Bênção: cura você e os aliados por perto e dá um escudo rápido.
      for (const c of fighters) if (c.alive && (c === f || (f.team && c.team === f.team)) && hyp(c.neck.x - f.neck.x, c.neck.y - f.neck.y) < 380) { heal(c, c === f ? 22 : 16); c.shield = Math.max(c.shield, 1.5); stars(c.neck.x, c.neck.y, "#7dff9a", 16); }
      ring(f.neck.x, f.neck.y, "#7dff9a", 200); sfx.heal(); break;
    case "cajadoFogo": {
      const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
      for (let i = 0; i < 4; i++) {
        const x = f.pelvis.x + sx * (120 + i * 110); if (x < WALL_L + 20 || x > WALL_R - 20) break;
        fx.push({ type: "spikes", style: "fire", burn: true, owner: f, x, y: surfaceBelow(x, gy - 60, false), t: -i * .12, life: 1.1, hit: false, dmg: 9 });
      }
      sfx.fire(); break;
    }
  }
}
// Poderes que duram alguns instantes (pulo, giro, rajada, deslize).
function skillStep(f, dt) {
  const k = f.sk, s = f.sc, grounded = f.lf.ground || f.rf.ground;
  k.t += dt; f.extT = Math.max(f.extT || 0, .1);
  if (specialStep(f, k, dt)) return;
  if (k.id === "flurry") {
    // Mil estocadas: avança dando estocadas rápidas na frente.
    f.aim = (k.dir > 0 ? 0 : Math.PI) + rnd(-.15, .15); f.facing = k.dir;
    if ((k.tick -= dt) <= 0) {
      k.tick = .06; k.n++;
      if (k.big) for (const p of f.b) p.vx = k.dir * 360;
      const x = f.neck.x + k.dir * 90 * s, y = f.neck.y + 15 * s, last = k.t + .06 >= k.dur;
      if (last && k.big) { fx.push({ type: "nova2", x, y, t: 0, life: .5, r: 200, color: "#ffe95a" }); areaHit(f, x, y, 200, 20, 900, { crit: true, stun: .6, up: -1 }); floatText(x, y - 80, "★", "#ffe95a", 60); sfx.boom(); }
      fx.push({ type: "stab", x: x + rnd(-15, 25) * k.dir, y: y + rnd(-25, 25), dir: k.dir, t: 0, life: .12, color: last ? "#ffffff" : "#ffe95a" });
      areaHit(f, x, y, 72 * s * (k.big ? 1.4 : 1), last ? 7 : k.big ? 3 : 2, last ? 520 : 30, { front: k.dir, quiet: !last, stun: .3, up: last ? -.5 : 0, crit: last, snd: "pierce" });
      if (k.n % 2) sfx.swing(false);
    }
  } else if (k.id === "whirl") {
    // Redemoinho: gira e anda pra frente puxando quem estiver perto.
    f.aim = k.t * 18 * k.dir;
    for (const p of f.b) p.vx = k.dir * (k.big ? 280 : 330); f.plantX = null; // gira andando pra frente
    const wb = k.big ? 1.6 : 1;
    if ((k.tick -= dt) <= 0) { k.tick = .14; if (areaHit(f, f.neck.x, f.neck.y + 15, 105 * s * wb, k.big ? 4 : 3, 140, { quiet: true, stun: .2 }).length) sfx.blade(false); }
    for (const e of fighters) if (isEnemy(f, e)) {
      const ddx = f.neck.x - e.neck.x, d = Math.abs(ddx);
      if (d < 230 * wb && d > 30 && Math.abs(f.neck.y - e.neck.y) < 160) { const kk = (k.big ? 1800 : 1000) * dt / Math.max(1, e.sc * e.sc); for (const q of e.b) q.vx += Math.sign(ddx) * kk; e.plantX = null; e.extT = Math.max(e.extT || 0, .2); }
    }
  } else if (k.id === "quake") {
    // Terremoto: pula alto e desce com tudo; ao tocar o chão, onda de choque.
    if (k.t > .32) { for (const p of [...f.b, ...f.wpts]) p.vy += 4200 * dt; f.aim = Math.PI / 2; } else f.aim = -Math.PI / 2;
    if (k.t > .4 && grounded) {
      f.sk = null; const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
      shockwave(f, f.pelvis.x, gy, 280, 16); flashScreen = .05;
      for (let i = -2; i <= 2; i++) if (i) fx.push({ type: "spikes", owner: f, x: f.pelvis.x + i * 110, y: surfaceBelow(f.pelvis.x + i * 110, gy - 40, false), t: .15, life: .9, hit: false, dmg: 6 });
      return;
    }
  } else if (k.id === "dragon") {
    // Salto do Dragão: sobe e mergulha na diagonal com a lança apontada.
    if (k.t < .38) f.aim = -Math.PI / 2;
    else {
      if (!k.dive) {
        k.dive = true; const e = nearestFoe(f, 750);
        const tx = e ? e.pelvis.x : f.pelvis.x + k.dir * 300, ty = e ? e.pelvis.y : FLOOR;
        k.ang = Math.atan2(Math.max(220, ty - f.pelvis.y), tx - f.pelvis.x); sfx.dash();
      }
      const vx = Math.cos(k.ang) * 1500, vy = Math.sin(k.ang) * 1500;
      for (const p of [...f.b, ...f.wpts]) { p.vx = vx; p.vy = vy; }
      f.aim = k.ang; f.facing = Math.cos(k.ang) >= 0 ? 1 : -1;
      const tip = f.wtip || f.pelvis;
      areaHit(f, tip.x, tip.y, 55 * s, 15, 650, { skip: k.hits, crit: true, stun: .5, snd: "pierce" });
      areaHit(f, f.pelvis.x, f.pelvis.y, 45 * s, 15, 650, { skip: k.hits, crit: true, stun: .5, snd: "pierce" });
      if (rnd() < .8) particles.push({ x: f.pelvis.x, y: f.pelvis.y, vx: -vx * .2, vy: -vy * .2, life: .3, max: .3, color: pick(["#ff8a5a", "#ffd84a"]), size: rnd(3, 6), g: 0, glow: true });
      if (grounded || k.t > k.dur) {
        f.sk = null; const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
        shockwave(f, f.pelvis.x, gy, 170, 9); for (const p of [...f.b, ...f.wpts]) { p.vx *= .2; p.vy *= .2; }
        return;
      }
    }
  } else if (k.id === "bash") {
    // Investida de Escudo: corre com o escudo na frente atropelando.
    for (const p of f.b) p.vx = k.dir * 950;
    f.aim = k.dir > 0 ? .1 : Math.PI - .1; f.facing = k.dir;
    areaHit(f, f.neck.x + k.dir * 35 * s, f.neck.y + 20, 55 * s * (k.big ? 1.5 : 1), k.big ? 18 : 9, k.big ? 1100 : 780, { skip: k.hits, front: k.dir, stun: .8, up: -.5, snd: "blunt" });
    if (rnd() < .6) dust(f.pelvis.x, f.pelvis.y + 44 * s, 2, "#b0a080");
  } else if (k.id === "phoenix") {
    // Fênix Ascendente: sobe girando em chamas e queima quem estiver em volta.
    if (k.t < .35) for (const p of [...f.b, ...f.wpts]) p.vy = Math.min(p.vy, -950);
    f.aim = -Math.PI / 2 + Math.sin(k.t * 30) * .6;
    for (const e of areaHit(f, f.neck.x, f.neck.y + 10, 80 * s, 11, 520, { skip: k.hits, up: -1.4, stun: .4, snd: "fire" })) { e.burn = 2.4; e.burnBy = f; e.burnTick = .3; }
    for (let i = 0; i < 3; i++) particles.push({ x: f.neck.x + rnd(-30, 30), y: lerp(f.neck.y, f.pelvis.y + 30, rnd()), vx: rnd(-80, 80), vy: rnd(40, 160), life: .45, max: .45, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(4, 9), g: -100, glow: true });
  } else if (k.id === "oil") {
    // Deslizador de Óleo: surfa numa onda de óleo atropelando quem estiver na frente.
    for (const p of [...f.b, ...f.wpts]) p.vx = k.dir * 900;
    f.aim = k.dir > 0 ? 0 : Math.PI; f.facing = k.dir;
    if ((k.drop -= dt) <= 0 && grounded) { k.drop = .09; fx.push({ type: "oil", owner: f, x: f.pelvis.x, y: surfaceBelow(f.pelvis.x, f.pelvis.y, false), t: 0, life: 4, tick: 0, seed: rnd(10) }); }
    areaHit(f, f.pelvis.x + k.dir * 20, f.pelvis.y + 10, 55 * s, 8, 650, { skip: k.hits, up: -.9, stun: .4, snd: "blunt" });
    if (f.pelvis.x < WALL_L + 40 || f.pelvis.x > WALL_R - 40) k.t = k.dur + 1;
  }
  if (f.sk && k.t > k.dur) f.sk = null;
}
// Efeitos dos poderes que agem sozinhos com o tempo.
function skillFxStep(e, dt) {
  ultFxStep(e, dt);
  if (e.type === "fireshield") {
    // Escudo de fogo girando em volta: queima quem encostar.
    const o = e.owner; if (!o.alive) { e.t = e.life; return; }
    if ((e.tick -= dt) <= 0) {
      e.tick = .15;
      for (const c of fighters) if (isEnemy(o, c) && hyp(c.neck.x - o.neck.x, c.neck.y + 20 - o.neck.y - 20) < 85 * o.sc + 20) {
        if (hurt(c, 4, c.neck.x - o.neck.x, -.4, 260, o, { quiet: true, stun: .15, fromX: o.neck.x, snd: "fire" })) { c.burn = 1.8; c.burnBy = o; c.burnTick = .3; }
      }
    }
  } else if (e.type === "lasso") {
    const o = e.owner, v = e.target;
    if (!o.alive || !v.alive) { e.t = e.life; return; }
    const k = 1 / Math.max(1, v.sc * v.sc);
    if (e.t < .34) { const tx = o.neck.x + o.facing * 75, ty = o.neck.y - 150; for (const q of [...v.b, ...v.wpts]) { q.vx = (tx - v.neck.x) * 7 * k; q.vy = (ty - v.neck.y) * 7 * k; } v.extT = .5; }
    else if (!e.slam) {
      e.slam = true; for (const q of [...v.b, ...v.wpts]) { q.vy = 1800 * k; q.vx *= .2; } v.extT = .6;
      hurt(v, 9, 0, 1, 0, o, { stun: .7, fromX: o.neck.x, snd: "blunt" }); shake = Math.max(shake, 14);
      dust(v.pelvis.x, surfaceBelow(v.pelvis.x, v.pelvis.y, false), 16, "#b08a5a");
    }
  } else if (e.type === "skybolt") {
    if (e.t >= 0 && !e.done) {
      e.done = true;
      if (!e.target) {
        fx.push({ type: "lightning", x1: e.x + rnd(-40, 40), y1: 0, x2: e.x, y2: e.y, t: 0, life: .35 }); spark(e.x, e.y, "#fff27a", 10); sfx.thunder(); flashScreen = .04;
        for (const c of fighters) if (isEnemy(e.owner, c) && Math.abs(c.pelvis.x - e.x) < 70 && c.pelvis.y > e.y - 330 && c.pelvis.y < e.y + 20) hurt(c, 12, rnd(-1, 1), -.4, 300, e.owner, { stun: .6, fromX: c.neck.x, snd: "magicHit" });
        return;
      }
      const c = e.target; if (!c.alive) return;
      fx.push({ type: "lightning", x1: c.neck.x + rnd(-40, 40), y1: 0, x2: c.neck.x, y2: c.neck.y, t: 0, life: .35 });
      fx.push({ type: "lightning", x1: c.neck.x + rnd(-60, 60), y1: 0, x2: c.pelvis.x, y2: c.pelvis.y, t: 0, life: .25 });
      hurt(c, 12, rnd(-1, 1), -.4, 300, e.owner, { stun: .6, fromX: c.neck.x, snd: "magicHit" }); spark(c.neck.x, c.neck.y, "#fff27a", 14); sfx.thunder(); flashScreen = .05;
    }
  } else if (e.type === "bladering") {
    const o = e.owner; if (!o.alive) { e.t = e.life; return; }
    if ((e.tick -= dt) <= 0) {
      e.tick = .18;
      for (const c of fighters) { if (!isEnemy(o, c)) continue; const d = hyp(c.neck.x - o.neck.x, c.neck.y + 10 - o.neck.y - 20); if (d < 125 * o.sc && hurt(c, 5, c.neck.x - o.neck.x || 1, -.2, 110, o, { quiet: true, stun: .2, fromX: o.neck.x, snd: e.fire ? "fire" : "blade" }) && e.fire) { c.burn = 2; c.burnBy = o; c.burnTick = .3; } }
    }
  } else if (e.type === "blizzard") {
    if ((e.tick -= dt) <= 0 && e.t < e.life) {
      e.tick = .3;
      for (const c of fighters) if (isEnemy(e.owner, c) && Math.abs(c.pelvis.x - e.x) < 160 && Math.abs(c.neck.y - e.y) < 170) { slowDown(c, .7); hurt(c, 2, 0, 0, 0, e.owner, { quiet: true, dot: true }); }
    }
    if (rnd() < .9) particles.push({ x: e.x + rnd(-170, 170), y: e.y - 160 + rnd(-20, 20), vx: rnd(-160, -60), vy: rnd(160, 300), life: .8, max: .8, color: pick(["#ffffff", "#dff4ff", "#bff0ff"]), size: rnd(2, 4.5), g: 0 });
    if (e.t >= e.life - .05 && !e.done) {
      e.done = true; sfx.ice();
      for (const c of fighters) if (isEnemy(e.owner, c) && Math.abs(c.pelvis.x - e.x) < 160 && Math.abs(c.neck.y - e.y) < 170) applyFreeze(c, .9);
    }
  } else if (e.type === "gravslam") {
    if (e.t >= .7 && !e.done) {
      e.done = true; shake = Math.max(shake, 16); sfx.shock();
      for (const c of e.targets) if (c.alive) { const k = 1 / Math.max(1, c.sc); for (const q of [...c.b, ...c.wpts]) { q.vy = 1900 * k; q.vx *= .2; } c.extT = .6; hurt(c, 11, 0, 1, 0, e.owner, { stun: .5, fromX: c.neck.x, snd: "blunt" }); }
    }
  } else if (e.type === "delayedcut") {
    if (e.t >= .3 && !e.done) {
      if (e.line) { const L = e.line; e.targets = foesOf(e.owner).filter(c => (c.neck.x - L.x) * L.dir > -30 && Math.abs(c.neck.x - L.x) < 950 && Math.abs(c.neck.y - L.y) < 95); }
      e.done = true; if (e.targets.length) { sfx.blade(true); slowmo = Math.max(slowmo, .25); }
      for (const c of e.targets) if (c.alive) { fx.push({ type: "slashx", x: c.neck.x, y: c.neck.y + 15, t: 0, life: .35, color: "#ff5a7a", r: 60 * c.sc }); hurt(c, 16, e.owner.facing, -.5, 480, e.owner, { crit: true, stun: .5, fromX: e.owner.neck.x, snd: "blade" }); }
    }
  } else if (e.type === "arrowrain") {
    if ((e.tick -= dt) <= 0 && e.t < e.life - .3) { e.tick = .055; addProj(e.kind || "arrow", e.x + rnd(-115, 115), -30, Math.PI / 2 + rnd(-.07, .07), 1350, e.owner, { dmg: e.dmg || 7 }); }
  } else if (e.type === "oil") {
    if ((e.tick -= dt) <= 0) {
      e.tick = .3;
      for (const c of fighters) if (isEnemy(e.owner, c) && Math.abs(c.pelvis.x - e.x) < 40 && c.pelvis.y > e.y - 90 * c.sc && c.pelvis.y < e.y + 10) slowDown(c, .8);
    }
  }
}
// Fogos de artifício: estouro colorido.
function fireworkBurst(x, y, hue = 0) {
  const cols = [["#ff4ad8", "#ffd0f4"], ["#ffd84a", "#fff6c0"], ["#5ac8ff", "#d8f4ff"], ["#7dff6a", "#e0ffd8"], ["#ff6a3a", "#ffe0c0"]][hue % 5];
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, sp = rnd(220, 380); particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .8, max: .8, color: pick(cols), size: rnd(2, 4), g: 160, glow: true, line: true }); }
  ring(x, y, cols[0], 70); sfx.firework();
}

// ───────────────────────── Agarrar ─────────────────────────
// Segura quem estiver na frente. Ataque = joelhada; soltar o botão = arremesso (na direção do joystick;
// pra baixo vira um pilão no chão). Quem foi agarrado se solta apertando os botões sem parar.
function tryGrab(f) {
  f.grabCd = .45; f.reachT = .2;
  const hx = f.neck.x + f.facing * 38 * f.sc, hy = f.neck.y + 22 * f.sc;
  let tg = null, bd = 74 * f.sc;
  for (const e of fighters) {
    if (!isEnemy(f, e) || e.grabbedBy || e.boss || e.sc > 1.45 || e.finished) continue;
    const d = Math.min(hyp(e.neck.x - hx, e.neck.y - hy), hyp(e.pelvis.x - hx, e.pelvis.y - hy));
    if (d < bd) { bd = d; tg = e; }
  }
  if (!tg) { sfx.swing(false); return; }
  if (tg.shield > 0 || tg.dodgeT > 0) { spark(tg.neck.x, tg.neck.y, "#7aa8ff", 8); return; }
  if (tg.grabbing) endGrab(tg);
  f.grabbing = tg; tg.grabbedBy = f; f.grabT = 0; tg.escape = 0; f.pumCd = .15;
  tg.charge = 0; tg.sk = null; if (tg.bot) tg.bot.charging = false;
  floatText(tg.head.x, tg.head.y - 55 * tg.sc, "Agarrado!", "#ffd84a", 24); sfx.grab(); buzz(tg.id, 120); buzz(f.id, 40);
}
function endGrab(f) {
  const v = f.grabbing; f.grabbing = null; f.grabCd = .5;
  if (v) { v.grabbedBy = null; v.escape = 0; }
  return v;
}
function grabStep(f, inp, dt, disabled) {
  const v = f.grabbing;
  if (!v.alive || !f.alive || v.grabbedBy !== f) { endGrab(f); return; }
  f.grabT += dt; f.pumCd -= dt;
  if (disabled || f.grabT > 3 || v.escape >= 6) {
    endGrab(f); const dx = Math.sign(v.neck.x - f.neck.x) || 1;
    for (const q of [...v.b, ...v.wpts]) { q.vx += dx * 520; q.vy -= 320; }
    v.extT = .6; v.stun = 0; floatText(v.head.x, v.head.y - 55, "Escapou!", "#9adf6a", 22); sfx.whoosh(); return;
  }
  if (!inp.grabHeld) { throwGrab(f, inp); return; }
  // Segura na frente do corpo; o resto do corpo do agarrado vem junto.
  const tx = f.neck.x + f.facing * 44 * f.sc, ty = f.neck.y + 2 * f.sc, dx = tx - v.neck.x, dy = ty - v.neck.y;
  for (const q of [...v.b, ...v.wpts]) { q.vx = f.neck.vx + dx * 14; q.vy = f.neck.vy + dy * 14; }
  v.stun = Math.max(v.stun, .1); v.extT = .2; v.facing = -f.facing;
}
function throwGrab(f, inp) {
  const v = endGrab(f);
  let ax = inp.jx || 0, ay = inp.jy || 0; const l = hyp(ax, ay);
  if (l > .4) { ax /= l; ay /= l; } else { ax = f.facing; ay = 0; }
  if (Math.abs(ax) < .3 && ay < 0) ax = f.facing * .3; // pra cima também vai um pouco pra frente
  const k = 1 / Math.max(1, v.sc), down = ay > .6;
  for (const q of [...v.b, ...v.wpts]) { q.vx = (down ? 0 : ax) * 1250 * k; q.vy = (down ? 1500 : ay * 1000 - 420) * k; }
  v.extT = 1.2; v.thrownT = .9; v.thrownBy = f;
  hurt(v, down ? 13 : 10, ax, ay, 0, f, { stun: .75, fromX: f.neck.x, snd: "blunt" });
  floatText(v.head.x, v.head.y - 60, down ? "Pilão!" : "Arremesso!", "#ffd84a", 26); sfx.throw(); shake = Math.max(shake, 8);
  for (const q of f.b) q.vx -= ax * 150;
}
function pummel(f) {
  if (f.pumCd > 0) return;
  const v = f.grabbing; f.pumCd = .32; f.grabT += .25;
  hurt(v, 5, f.facing, -.2, 0, f, { stun: .3, fromX: f.neck.x, snd: "punch" });
  spark(v.neck.x, v.neck.y + 20, "#ffffff", 8);
}

// ───────────────────────── Especial ─────────────────────────
// Bater (e apanhar) enche a barra. Cheia: aura da cor do personagem. Soltar: cena rápida e o golpe da arma.
let cutin = null;
const VOLLEY = new Set(["arrow", "bolt", "stone", "axe", "axes", "fire", "ice", "beam", "seed", "spark", "laser", "plasma", "pellets", "sticky", "rocket", "cryo",
  "notes", "charm", "pea", "snowpea", "bouncefire", "shuriken", "kunai", "ki", "cupid", "bubble", "sheep", "tornado", "flask", "cursednotes", "cannon", "rail", "blast", "hook", "web"]);
const MELEE_KINDS = new Set(["swing", "thrust", "spin", "whip", "slam", "claws", "punch"]);
const meteorSpecial = (f) => {
  let i = 0;
  for (const e of fighters.filter(e => isEnemy(f, e))) for (let j = 0; j < 3; j++) {
    const x = clamp(e.pelvis.x + rnd(-90, 90), WALL_L + 40, WALL_R - 40);
    fx.push({ type: "mark", x, y: surfaceBelow(x, e.pelvis.y - 5, false), t: -(i++) * .12, life: .8, r: 75, color: "#ff7a1a", owner: f });
  }
  for (let j = 0; j < 5; j++) { const x = rnd(WALL_L + 60, WALL_R - 60); fx.push({ type: "mark", x, y: surfaceBelow(x, 400, false), t: -(i++) * .12, life: .8, r: 75, color: "#ff7a1a", owner: f }); }
  sfx.star();
};
const SPECIALS = {
  ervilha:         { name: "Tempestade de Ervilhas", run: f => { f.sk = { id: "peastorm", t: 0, dur: 2.2, dir: f.facing, tick: 0, n: 0 }; } },
  ervilhaGelo:     { name: "Nevasca de Ervilhas", run: f => { f.sk = { id: "peastorm", t: 0, dur: 2.2, dir: f.facing, tick: 0, n: 0, ice: true }; } },
  bombasClassicas: { name: "Bomba Gigante", run: f => { f.sk = { id: "megabomb", t: 0, dur: 3.4, dir: f.facing }; fx.push({ type: "giantbomb", owner: f, t: 0, life: 3.4, btype: f.bombT || 0 }); sfx.charge(2); if (!f.bot) floatText(f.head.x, f.head.y - 150, "Arraste o ATACAR pra mirar e solte!", "#ffe9a0", 22); } },
  canhaoBraco:     { name: "Arsenal Total", run: f => { f.sk = { id: "megaall", t: 0, dur: 2.7, tick: .15, n: 0 }; sfx.charge(2); } },
  espiritoEstelar: { name: "Star Platinum: The World", run: f => {
    for (const e of fighters) if (isEnemy(f, e)) { const t = e.boss ? 1 : 2.2; e.frozen = Math.max(e.frozen, t); e.tstopT = time + t; e.stun = 0; }
    fx.push({ type: "timestop", owner: f, x: f.neck.x, y: f.neck.y, t: 0, life: 2.5 });
    floatText(f.head.x, f.head.y - 110, "Tempo, pare!", "#e8b84a", 36); sfx.timestop();
    summonStand(f); const st = fx.findLast(e => e.type === "stand"); if (st) st.life = 2.8;
  } },
  bolaCaptura:     { name: "Eu Escolho Vocês!", run: f => { f.spLock = time + 8; ["pika", "char", "squirt", "bulba"].forEach((k, i) => spawnPika(f, clamp(f.pelvis.x + f.facing * (60 + i * 75), WALL_L + 30, WALL_R - 30), f.pelvis.y + 40, k)); } },
  katana:          { name: "Mil Cortes", run: f => {
    const line = { x: f.neck.x, y: f.neck.y, dir: f.facing };
    for (let i = 0; i < 3; i++) fx.push({ type: "delayedcut", owner: f, targets: [], line, t: -i * .14, life: .4 });
    fx.push({ type: "iaido", x1: f.facing > 0 ? f.neck.x : WALL_L, x2: f.facing > 0 ? WALL_R : f.neck.x, y: f.neck.y + 20, t: 0, life: .5 }); flashScreen = .2; sfx.blade(true);
  } },
  arco:            { name: "Chuva de Mil Flechas", run: f => {
    const tg = fighters.filter(e => isEnemy(f, e)).slice(0, 5);
    for (const e of tg) { const x = clamp(e.pelvis.x, WALL_L + 60, WALL_R - 60); fx.push({ type: "arrowrain", owner: f, x, y: surfaceBelow(x, e.pelvis.y, false), t: 0, life: 2.2, tick: .2 }); }
    sfx.bow();
  } },
  cajadoFogo:      { name: "Apocalipse de Meteoros", run: meteorSpecial },
  cajadoSombrio:   { name: "Apocalipse de Meteoros", run: meteorSpecial },
  lampada:         { name: "Três Desejos", run: f => { for (let i = 0; i < 3; i++) fx.push({ type: "genie", owner: f, t: -i * 1.1, life: 2.5, done: false, gx: f.neck.x, gy: f.head.y - 100 }); sfx.genie(); } },
  manopla:         { name: "Estalo do Infinito", run: f => { f.snapUlt = true; infinitySnap(f); f.cdOverride = 0; } },
  marteloTrovao:   { name: "Tempestade Divina", run: f => {
    aimSpots(f, 5, 160, 140).forEach((p, i) => { fx.push({ type: "mark", x: p.x, y: p.y, t: 0, life: .5, r: 70, color: "#fff27a", owner: f, noHit: true }); for (let j = 0; j < 3; j++) fx.push({ type: "skybolt", owner: f, x: p.x, y: p.y, t: -(j * .35 + i * .08) - .3, life: .3 }); });
    flashScreen = .1; sfx.thunder();
  } },
  anelLanterna:    { name: "Tropa dos Lanternas", run: f => {
    foesOf(f).slice(0, 5).forEach((e, i) => { const x = clamp(e.pelvis.x, WALL_L + 60, WALL_R - 60); fx.push({ type: "giantsword", owner: f, x, y: surfaceBelow(x, e.pelvis.y, false), t: -i * .15, life: 1.4, style: "lantern" }); });
    floatText(f.head.x, f.head.y - 110, "No dia mais claro, na noite mais densa...", "#7dff6a", 22); sfx.zap(); flashScreen = .1;
  } },
  lacoVerdade:     { name: "Julgamento de Themyscira", run: f => {
    for (const e of foesOf(f, 1200).slice(0, 4)) truthLasso(f, e, 3);
    f.reflectT = 3; fx.push({ type: "bracelets", owner: f, t: 0, life: 3 }); flashScreen = .1;
  } },
  laminaTerra:     { name: "Tempestade Terra", run: f => {
    f.sk = { id: "terrastorm", t: 0, dur: 2.3, n: 0, hy: Math.max(140, f.pelvis.y - 170) }; f.armorT = Math.max(f.armorT || 0, 2.4);
    fx.push({ type: "terragiant", owner: f, t: 0, life: 1.8 });
    floatText(f.head.x, f.head.y - 120, "TEMPESTADE TERRA!", "#7dff6a", 40); sfx.charge(2);
  } },
  laminasCaos:     { name: "Fúria Espartana", run: f => {
    if (!(f.rageT > 0)) { f.rageBase = f.dmgMul; f.rageKb = f.kbMul; }
    f.rageT = 7; f.dmgMul = (f.rageBase || 1) * 2; f.kbMul = (f.rageKb ?? 1) * .35;
    fx.push({ type: "nova2", x: f.neck.x, y: f.neck.y + 20, t: 0, life: .7, r: 320, color: "#ff5a1a" });
    for (const e of foesOf(f, 320)) { hurt(e, 18, e.neck.x - f.neck.x || 1, -1, 900, f, { stun: .6, crit: true, fromX: f.neck.x, snd: "fire" }); e.burn = 3; e.burnBy = f; e.burnTick = .3; }
    fx.push({ type: "bladering", owner: f, t: 0, life: 7, tick: 0, fire: true });
    floatText(f.head.x, f.head.y - 120, "ESPARTA!", "#ff5a1a", 46); shake = 22; sfx.fire(); sfx.boom();
  } },
  alhoPoro:        { name: "Concerto da Miku", run: f => { f.sk = { id: "concert", t: 0, dur: 2.6, tick: 0 }; for (const e of foesOf(f, 420)) confuse(e, 3.5); fx.push({ type: "concert", owner: f, t: 0, life: 2.6 }); floatText(f.head.x, f.head.y - 120, "♪ Ievan Polkka ♪", "#39c5bb", 40); } },
  crisol:          { name: "Rip and Tear", run: f => { supremeSpecial(f, { per: 4, col: "#ff3a1a" }); floatText(f.head.x, f.head.y - 120, "RIP AND TEAR!", "#ff3a1a", 46); } },
  bfg:             { name: "BFG 10000", run: f => {
    const tg = foesOf(f).slice(0, 3);
    (tg.length ? tg : [null]).forEach((e, i) => { const a = e ? Math.atan2(e.neck.y - f.neck.y, e.neck.x - f.neck.x) : (f.facing > 0 ? 0 : Math.PI); addProj("bfg", f.rh.x, f.rh.y - 20, a + (i - 1) * .1, 380, f, { big: 1.8, rMul: 1.8, dmg: 22, boomR: 260, homing: 2.2, homeR: 2000, life: 4 }); });
    flashScreen = .2; shake = 24; sfx.plasma(); sfx.boom();
  } },
  espadaMestra:    { name: "Fúria da Triforce", run: f => {
    fx.push({ type: "triforce", owner: f, t: 0, life: 1.6 });
    aimSpots(f, 4, 160, 140).forEach((p, i) => fx.push({ type: "lightpillar", owner: f, x: p.x, y: p.y, t: -.6 - i * .15, life: .7, dmg: 34 }));
    floatText(f.head.x, f.head.y - 130, "Triforce!", "#ffe27a", 40); sfx.star(); flashScreen = .12;
  } },
  keyblade:        { name: "Trinity Limit", run: f => { for (let i = 0; i < 3; i++) fx.push({ type: "trinity", owner: f, t: -.2 - i * .35, life: .9, ang: -Math.PI / 2 + i * Math.PI * 2 / 3, idx: i }); floatText(f.head.x, f.head.y - 130, "Trinity Limit!", "#ffe27a", 40); sfx.charge(2); } },
  espadaBuster:    { name: "Omnislash", run: f => { supremeSpecial(f, { per: 5, col: "#7ad8ff" }); floatText(f.head.x, f.head.y - 120, "Omnislash!", "#7ad8ff", 44); } },
  machadoLeviata:  { name: "Fimbulwinter", run: f => {
    fx.push({ type: "nova2", x: f.neck.x, y: f.neck.y + 20, t: 0, life: .8, r: 400, color: "#bff0ff" });
    for (const e of foesOf(f, 400)) { if (hurt(e, 34, e.neck.x - f.neck.x || 1, -.8, 500, f, { crit: true, fromX: f.neck.x, snd: "magicHit" })) applyFreeze(e, 1.3, { cap: 1.3, cd: 0 }); }
    for (let i = 0; i < 60; i++) { const an = rnd(7), sp2 = rnd(200, 700); particles.push({ x: f.neck.x, y: f.neck.y + 20, vx: Math.cos(an) * sp2, vy: Math.sin(an) * sp2, life: .9, max: .9, color: pick(["#bff0ff", "#ffffff", "#8fe3ff"]), size: rnd(3, 8), g: 300, star: true }); }
    floatText(f.head.x, f.head.y - 120, "FIMBULWINTER!", "#bff0ff", 42); shake = 24; flashScreen = .15; sfx.ice(); sfx.boom();
  } },
  espadaEnergia:   { name: "Assassinato", run: f => { const tg = aimedFoes(f, 650, .6).slice(0, 3); if (!tg.length) { ultWhiff(f, "#5ab8ff"); return; } f.cloakT = 2.5; f.sk = { id: "assassin", t: 0, dur: 2.2, tg, i: 0, tick: .3 }; poof(f, "#5ab8ff"); } },
  armaPortal:      { name: "Chuva de Portais", run: f => { f.sk = { id: "portalrain", t: 0, dur: 1.9, tg: foesOf(f).slice(0, 5), n: 0, tick: .1 }; } },
  paShovel:        { name: "Pogo Supremo", run: f => { const tg = aimedFoes(f, 600, .6).slice(0, 4); if (!tg.length) { ultWhiff(f, "#5ab8ff"); return; } f.sk = { id: "pogostorm", t: 0, dur: 2.6, tg, i: 0, tick: .1 }; floatText(f.head.x, f.head.y - 120, "Pela Pá!", "#5ab8ff", 40); } },
  espadaDiamante:  { name: "Ataque dos Creepers", run: f => {
    aimSpots(f, 4, 160, 160).forEach((p, i) => fx.push({ type: "creeper", owner: f, x: p.x, y: p.y, t: -i * .12, life: 1.6 }));
    floatText(f.head.x, f.head.y - 120, "Ssssss...", "#5ac83a", 40);
  } },
  frigideira:      { name: "Frigideira Gigante", run: f => {
    aimSpots(f, 3, 200, 200).forEach((p, i) => fx.push({ type: "giantsword", owner: f, x: p.x, y: p.y, t: -i * .15, life: 1.4, style: "pan" }));
    sfx.whoosh();
  } },
  masamune:        { name: "Asa Única", run: f => { f.sk = { id: "onewing", t: 0, dur: 2.2, tick: 0 }; fx.push({ type: "blackwing", owner: f, t: 0, life: 2.2 }); floatText(f.head.x, f.head.y - 120, "Asa Única", "#d8e0ff", 40); sfx.dark(); } },
  armaGravidade:   { name: "Super Gravidade", run: f => { f.sk = { id: "supergrav", t: 0, dur: 1.8, tg: foesOf(f, 1400).slice(0, 3) }; sfx.grav(); } },
  livroLuz:        { name: "Julgamento Divino", run: f => {
    foesOf(f).forEach((e, i) => { for (let j = 0; j < 3; j++) fx.push({ type: "lightpillar", owner: f, target: e, x: e.pelvis.x, y: surfaceBelow(e.pelvis.x, e.pelvis.y, false), t: -.35 - j * .45 - i * .08, life: .7, dmg: 12 }); });
    floatText(f.head.x, f.head.y - 120, "Julgamento Divino", "#ffe27a", 38); flashScreen = .1; sfx.star();
  } },
  cajadoVazio:     { name: "Singularidade", run: f => {
    const tg = foesOf(f), cx = tg.length ? tg.reduce((s2, e) => s2 + e.neck.x, 0) / tg.length : f.neck.x + f.facing * 300, cy = tg.length ? tg.reduce((s2, e) => s2 + e.neck.y, 0) / tg.length : f.neck.y;
    const x = clamp(cx, WALL_L + 80, WALL_R - 80), y = clamp(cy - 20, 120, FLOOR - 80);
    fx.push({ type: "realhole", owner: f, x, y, t: 0, life: 3.4, tick: 0 });
    floatText(f.head.x, f.head.y - 120, "Singularidade", "#c58bff", 40); sfx.dark(); sfx.grav();
  } },
  blocoMagico:     { name: "Chuva de TNT", run: f => {
    for (const e of fighters.filter(e => isEnemy(f, e))) for (let j = 0; j < 2; j++) addProj("tnt", clamp(e.pelvis.x + rnd(-90, 90), WALL_L + 40, WALL_R - 40), -40 - j * 140, Math.PI / 2, 300, f, { fuse: 1.7 + j * .35 });
    sfx.throw();
  } },
};
function specialFor(f) {
  if (mode === "corrida") return { name: "Super Disparada", run: f => { f.hasteT = 4; f.armorT = 4; f.dodgeT = .6; bodyPush(f, f.facing * 900, -200); } };
  if (SPECIALS[f.wtype]) return SPECIALS[f.wtype];
  if (MELEE_ULTS[f.wtype]) return MELEE_ULTS[f.wtype];
  if (MELEE_KINDS.has(f.w.kind)) return { name: "Golpe Supremo", run: supremeSpecial };
  if (f.w.kind === "shoot" && VOLLEY.has(f.w.shot)) return { name: "Rajada Total", run: f => { f.sk = { id: "volley", t: 0, dur: 1.5, tick: 0 }; } };
  return { name: "Explosão de Aura", run: auraNova };
}
function gainSpecial(f, n) {
  if (f.sp === undefined || f.boss || f.minion || f.zombie || !f.alive) return;
  n /= 2.1; // barra do especial bem maior: a ultimate demora pra encher
  const was = f.sp; f.sp = Math.min(100, f.sp + n);
  if (was < 100 && f.sp >= 100) { floatText(f.head.x, f.head.y - 80 * f.sc, "ESPECIAL PRONTO!", f.color, 26); sfx.spReady(); buzz(f.id, 150); ring(f.neck.x, f.neck.y, f.color, 90); }
}
function startSpecial(f) {
  const S = specialFor(f);
  f.sp = 0; f.spLock = time + 6; f.armorT = 1.5;
  if (f.grabbing) endGrab(f);
  cutin = { f, t: 0, dur: 1.0, name: S.name, run: S.run };
  sfx.special(); buzz(f.id, 200);
}
// Chamado quando a cena acaba (o jogo fica parado durante ela).
function runSpecial(c) {
  const f = c.f;
  if (!f.alive || phase !== "fight") return;
  f.armorT = 2.5; flashScreen = .12;
  c.run(f);
}
// Golpe Supremo (armas de corpo a corpo): teleporta em volta de até 4 inimigos cortando, e fecha com um golpe enorme.
function supremeSpecial(f, o = {}) {
  const tg = aimedFoes(f, 430, .6).slice(0, 4);
  if (!tg.length) ultWhiff(f, o.col);
  f.sk = { id: "supreme", t: 0, dur: 9, tg, i: 0, tick: .05, per: o.per || 3, col: o.col || f.color };
}
// Explosão de Aura: onda enorme da cor do personagem.
function auraNova(f) {
  fx.push({ type: "nova2", x: f.neck.x, y: f.neck.y + 20, t: 0, life: .7, r: 340, color: f.color });
  for (const e of fighters) {
    if (!isEnemy(f, e)) continue;
    const d = hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y);
    if (d < 340) hurt(e, 38 * (1 - d / 650), e.neck.x - f.neck.x || 1, -1, 1000, f, { stun: .8, crit: true, fromX: f.neck.x, snd: "magicHit" });
  }
  shake = 26; flashScreen = .15; sfx.boom();
}
// Passo a passo dos especiais que duram um tempo. Devolve true se cuidou do f.sk.
function specialStep(f, k, dt) {
  if (ultStep(f, k, dt)) return true;
  if (k.id === "peastorm") {
    // Comida de planta (PvZ 2): rajada de ervilhas em 3 fileiras e uma ervilha gigante no final.
    for (const p of f.b) p.vx *= .8;
    f.aim = k.dir > 0 ? 0 : Math.PI; f.facing = k.dir;
    if (k.t < k.dur - .35 && (k.tick -= dt) <= 0) {
      k.tick = .055; k.n++;
      const row = [-32, -8, 16][k.n % 3];
      addProj("pea", f.rh.x + k.dir * 26, f.neck.y + 20 + row, (k.dir > 0 ? 0 : Math.PI) + rnd(-.025, .025), 1350, f, k.ice ? { snow: true, dmg: 2, slow: 1.5 } : { dmg: 2 });
      if (k.n % 2) sfx.pea();
    }
    if (rnd() < .6) particles.push({ x: f.neck.x + rnd(-30, 30), y: f.pelvis.y + rnd(-50, 40), vx: rnd(-30, 30), vy: rnd(-120, -40), life: .5, max: .5, color: k.ice ? pick(["#bff0ff", "#5ac8ff"]) : pick(["#7dff6a", "#d8ffcf"]), size: rnd(3, 6), g: -40, glow: true });
    if (k.t >= k.dur - .35 && !k.big) {
      k.big = true;
      addProj("pea", f.rh.x + k.dir * 30, f.neck.y + 10, k.dir > 0 ? 0 : Math.PI, 950, f, { dmg: 30, pierce: true, charge: 2, rMul: 3.2, snow: !!k.ice, slow: k.ice ? 3 : 0 });
      sfx.boom(); shake = Math.max(shake, 14); floatText(f.head.x + k.dir * 60, f.head.y - 60, "PLOP!", "#7dff6a", 34);
    }
  } else if (k.id === "megabomb") {
    // Bomba Gigante (Bomberman 64): levanta a bomba, ela cresce acima da cabeça e é arremessada.
    for (const p of f.b) p.vx *= .7;
    f.aim = -Math.PI / 2;
    const bi = f.bot || f.pl.input;
    // Depois de crescer, solta quando o jogador apertar/soltar o ATACAR (ou sozinha depois de 3s).
    if (k.t >= .7 && (bi.atk || k.t >= 3.2 || (f.bot && k.t >= 1.1))) {
      const m = megaAim(f); bi.atk = false; f.sk = null;
      f.facing = Math.cos(m.ang) >= 0 ? 1 : -1;
      addProj("megabomb", f.neck.x, f.head.y - 75, m.ang, m.sp, f, { fuse: 1.6, btype: f.bombT || 0, vx: Math.cos(m.ang) * m.sp });
      sfx.throw(); shake = Math.max(shake, 10); return true;
    }
  } else if (k.id === "megabeam") {
    // Mega Buster Máximo: carrega rapidinho e solta um raio gigante por um segundo.
    if (k.ang === undefined) { const e = nearestFoe(f, 1600); k.ang = e ? Math.atan2(e.neck.y + 10 - f.neck.y, e.neck.x - f.neck.x) : f.aim; }
    f.aim = k.ang; f.facing = Math.cos(k.ang) >= 0 ? 1 : -1;
    const tip = f.wtip || f.rh;
    for (const p of f.b) p.vx = p.vx * .5 - f.facing * (k.t > .25 ? 60 : 0);
    if (k.t < .25) { for (let i = 0; i < 3; i++) { const a = rnd(Math.PI * 2), r = rnd(50, 90); particles.push({ x: tip.x + Math.cos(a) * r, y: tip.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 5, vy: -Math.sin(a) * r * 5, life: .2, max: .2, color: pick(["#5affd8", "#ffffff"]), size: 3, g: 0, glow: true }); } }
    else if ((k.tick -= dt) <= 0) { k.tick = .1; castBeam(f, tip.x, tip.y, k.ang, 7, "ki", 2); }
  } else if (k.id === "supreme") {
    for (const p of [...f.b, ...f.wpts]) { p.vx *= .5; p.vy *= .5; }
    if ((k.tick -= dt) > 0) return true;
    k.tick = .16;
    const e = k.tg[Math.floor(k.i / k.per)];
    if (e && !e.alive) { k.i = (Math.floor(k.i / k.per) + 1) * k.per; return true; }
    if (e) {
      k.i++;
      const side = k.i % 2 ? 1 : -1, tx = clamp(e.pelvis.x + side * 60 * e.sc, WALL_L + 30, WALL_R - 30);
      moveBody(f, tx - f.pelvis.x, Math.min(0, e.pelvis.y - f.pelvis.y));
      f.facing = -side; f.aim = f.facing > 0 ? 0 : Math.PI; f.atkT = .15; f.atkSide = f.facing;
      fx.push({ type: "slashx", x: e.neck.x, y: e.neck.y + 15, t: 0, life: .3, color: k.col, r: 60 * e.sc });
      hurt(e, 13 * 3 / k.per, f.facing, -.3, 100, f, { stun: .8, crit: true, fromX: f.neck.x, snd: "blade" });
      poof(f, k.col); sfx.dash();
    } else if (!k.fin) {
      k.fin = true; k.dur = k.t + .35;
      ring(f.neck.x, f.neck.y, f.color, 230); flashScreen = .12; shake = Math.max(shake, 22); sfx.boom();
      for (const e2 of k.tg) if (e2.alive) { fx.push({ type: "slashx", x: e2.neck.x, y: e2.neck.y + 15, t: 0, life: .45, color: "#ffffff", r: 110 * e2.sc }); hurt(e2, 20, Math.sign(e2.neck.x - f.neck.x) || 1, -1.2, 900, f, { stun: .7, crit: true, fromX: f.neck.x, snd: "blade" }); }
      floatText(f.head.x, f.head.y - 90, "FIM!", f.color, 40);
    }
  } else if (k.id === "volley") {
    // Rajada Total: dispara a própria arma sem parar, mirando nos inimigos.
    if ((k.tick -= dt) <= 0) {
      k.tick = .09;
      const e = nearestFoe(f, 1500);
      if (e) f.aim = Math.atan2(e.neck.y + 10 - f.neck.y, e.neck.x - f.neck.x) + rnd(-.18, .18);
      f.facing = Math.cos(f.aim) >= 0 ? 1 : -1;
      const am = f.ammo, cl = f.clip; f.ammo = 9; f.chargeLvl = 0;
      try { fireShot(f); } catch (err) { k.t = k.dur; }
      f.ammo = am; f.clip = cl;
    }
  } else return false;
  if (f.sk && k.t > k.dur) f.sk = null;
  return true;
}

// ───────────────────────── Kit de Construção (Minecraft) ─────────────────────────
// Bloco onde você mirar (arraste o botão: quanto mais longe, mais longe o bloco), TNT e carrinho de mina.
const MC_ITEMS = [{ id: "bloco", name: "Bloco" }, { id: "tnt", name: "TNT" }, { id: "carrinho", name: "Carrinho" }];
const hasMc = (f) => f.w.shot === "block" && !f.boss && !f.minion;
function mcSet(f, i) {
  if (!f.alive) return;
  f.mcT = ((i % MC_ITEMS.length) + MC_ITEMS.length) % MC_ITEMS.length;
  floatText(f.head.x, f.head.y - 70 * f.sc, MC_ITEMS[f.mcT].name, "#9adf6a", 24); sfx.mmSwitch();
}
function mcCell(f) {
  const inp = f.bot || f.pl.input;
  const mag = f.bot ? .45 : inp.atkMag ?? (inp.aiming ? hyp(inp.ax, inp.ay) : .25);
  const dist = 55 + 245 * clamp(mag, 0, 1), a = f.aim;
  const x = clamp(Math.floor((f.neck.x + Math.cos(a) * dist) / 50) * 50, WALL_L, WALL_R - 50);
  const y = clamp(Math.floor((f.neck.y + 20 + Math.sin(a) * dist) / 50) * 50, 40, FLOOR - 50);
  return { x, y };
}
function placeBlockAt(x, y, f) {
  if (PLATFORMS.some(p => p.temp && p.x === x && p.y === y)) return;
  const mine = PLATFORMS.filter(p => p.temp);
  if (mine.length >= 12) PLATFORMS.splice(PLATFORMS.indexOf(mine[0]), 1);
  PLATFORMS.push({ x, y, w: 50, temp: true, life: 20, block: true, hp: BLOCK_HP, id: ++blockSeq });
  dust(x + 25, y + 30, 8, "#9a7a5a"); sfx.thud();
  for (const e of fighters) if (isEnemy(f, e) && e.pelvis.x > x - 10 && e.pelvis.x < x + 60 && e.head.y < y + 50 && e.pelvis.y + 40 * e.sc > y)
    hurt(e, 5, (e.pelvis.x - x - 25) || 1, -1, 420, f, { stun: .3, fromX: x + 25, snd: "blunt" });
}
// TNT: explode e ainda acende as outras TNTs por perto (reação em cadeia).
function tntBoom(pr) {
  crossExplode(pr.x, pr.y, pr.owner, 0, 1.05);
  for (const o of projectiles) if (o !== pr && o.kind === "tnt" && o.life > 0 && hyp(o.x - pr.x, o.y - pr.y) < 230) o.fuse = Math.min(o.fuse, .18);
}
// Carrinho de mina: corre pelo chão, pega o primeiro inimigo, leva ele e arremessa pro alto.
function cartStep(pr, dt) {
  const sp = 720, o = pr.owner;
  pr.life -= dt; pr.wheel = (pr.wheel || 0) + dt * 22;
  pr.x += pr.dir * sp * dt;
  pr.y = surfaceBelow(pr.x, pr.y + 4, false) - 20;
  const wall = pr.x < WALL_L + 25 || pr.x > WALL_R - 25 || !!blockAt(pr.x + pr.dir * 30, pr.y, 0);
  if (!pr.rider && o) for (const e of fighters) {
    if (!isEnemy(o, e) || e.boss || e.sc > 1.45 || Math.abs(e.pelvis.x - pr.x) > 42 || Math.abs(e.pelvis.y + 40 * e.sc - pr.y) > 60) continue;
    pr.rider = e; pr.rideT = 0; floatText(e.head.x, e.head.y - 60, "Pro carrinho!", "#c3cad0", 24); sfx.grab();
    hurt(e, 4, pr.dir, -.2, 0, o, { stun: .4, fromX: pr.x, snd: "blunt" }); break;
  }
  if (pr.rider) {
    const e = pr.rider; pr.rideT += dt;
    if (!e.alive) pr.rider = null;
    else {
      const dx = pr.x - e.pelvis.x, dy = pr.y - 48 * e.sc - e.pelvis.y;
      for (const q of [...e.b, ...e.wpts]) { q.vx = pr.dir * sp + dx * 14; q.vy = dy * 14; }
      e.stun = Math.max(e.stun, .15); e.extT = .3;
      if (pr.rideT > 1.0 || wall) {
        const k = 1 / Math.max(1, e.sc); for (const q of [...e.b, ...e.wpts]) { q.vx = pr.dir * 600 * k; q.vy = -1150 * k; }
        e.extT = 1.2; hurt(e, 12, pr.dir, -1, 0, o, { stun: .6, fromX: pr.x, snd: "blunt" });
        floatText(e.head.x, e.head.y - 60, "Lá vai!", "#ffd84a", 26); pr.rider = null; pr.life = 0;
      }
    }
  }
  if (rnd() < .3) spark(pr.x + rnd(-20, 20), pr.y + 18, "#ffd84a", 1);
  if (wall || pr.life <= 0) { pr.life = 0; dust(pr.x, pr.y + 20, 12, "#8a8f96"); sfx.thud(); }
}

// ───────────────────────── Armas lendárias e magias novas ─────────────────────────
// Crisol: golpe que deixa o inimigo quase sem vida termina o serviço e cura quem bateu.
function gloryKill(A, B) {
  if (!B.alive || B.boss || B.hp > 12) return;
  floatText(B.head.x, B.head.y - 70, "RIP AND TEAR!", "#ff3a1a", 34);
  for (let i = 0; i < 26; i++) particles.push({ x: B.neck.x + rnd(-20, 20), y: B.neck.y + rnd(-10, 50), vx: rnd(-300, 300), vy: rnd(-450, -50), life: .7, max: .7, color: pick(["#ff2a1a", "#8a0a0a", "#ffd84a"]), size: rnd(3, 7), g: 1200 });
  hurt(B, 80, B.neck.x - A.neck.x || 1, -1, 700, A, { crit: true, stun: .5, fromX: A.neck.x, snd: "blade" });
  heal(A, 16); shake = Math.max(shake, 14); hitstop = Math.max(hitstop, .06);
}
// Espada de Energia: o golpe avança até o inimigo que estiver na frente.
function energyLunge(f) {
  const e = enemyInCone(f, .7, 330); if (!e) return;
  const dx = Math.sign(e.neck.x - f.neck.x) || 1, dist = Math.max(0, Math.abs(e.neck.x - f.neck.x) - 55 * e.sc);
  for (const p of [...f.b, ...f.wpts]) { p.vx = dx * Math.min(1500, dist * 7 + 300); p.vy = Math.min(p.vy, (e.neck.y - f.neck.y) * 3 - 60); }
  f.extT = .35;
  for (let i = 0; i < 16; i++) particles.push({ x: f.pelvis.x - dx * rnd(0, 70), y: f.neck.y + rnd(-10, 50), vx: -dx * rnd(100, 300), vy: rnd(-30, 30), life: .3, max: .3, color: "#5ab8ff", size: rnd(2, 4), g: 0, glow: true, line: true });
  sfx.dash();
}
// Keyblade: a cada 3 golpes, uma magia (Fogo, Gelo, Trovão, em ciclo).
function keyMagic(f) {
  const a = f.aim, ox = f.wtip.x, oy = f.wtip.y, m = f.keySpell = ((f.keySpell ?? -1) + 1) % 3;
  if (m === 0) { addProj("fire", ox, oy, a, 760, f, { dmg: 11 }); floatText(f.head.x, f.head.y - 70, "Fogo!", "#ff7a1a", 24); sfx.fire(); }
  else if (m === 1) { for (const sp of [-.15, 0, .15]) addProj("ice", ox, oy, a + sp, 1000, f); floatText(f.head.x, f.head.y - 70, "Gelo!", "#8fe3ff", 24); sfx.ice(); }
  else {
    const e = nearestFoe(f, 650); floatText(f.head.x, f.head.y - 70, "Trovão!", "#fff27a", 24);
    if (e) { fx.push({ type: "lightning", x1: e.neck.x + rnd(-20, 20), y1: -20, x2: e.neck.x, y2: e.neck.y, t: 0, life: .25 }); hurt(e, 11, 0, -.4, 200, f, { stun: .4, fromX: e.neck.x, snd: "magicHit" }); }
    sfx.thunder(); flashScreen = .06;
  }
}
// Pá do Shovel Knight: golpe pra baixo no ar quica (no inimigo ou no chão).
function pogoBounce(A) {
  if (A.lf.ground || A.rf.ground || Math.sin(A.aim) < .35) return false;
  for (const p of [...A.b, ...A.wpts]) p.vy = -1150;
  A.extT = .2; A.jumps = 1; sfx.jump();
  for (let i = 0; i < 8; i++) particles.push({ x: A.wtip.x + rnd(-10, 10), y: A.wtip.y, vx: rnd(-160, 160), vy: rnd(-200, -40), life: .4, max: .4, color: pick(["#ffd84a", "#5ab8ff", "#ffffff"]), size: rnd(3, 5), g: 600, star: true });
  return true;
}
// Espada de Diamante: ataque de varredura pega quem está perto do alvo.
function sweepAround(A, B, x, y) {
  fx.push({ type: "mcsweep", x, y, dir: A.facing, t: 0, life: .25 });
  for (const e of fighters) {
    if (e === B || !isEnemy(A, e) || A.swingHits.has(e.id)) continue;
    if (hyp(e.neck.x - x, e.neck.y + 20 - y) < 120 * A.sc) { A.swingHits.add(e.id); hurt(e, A.w.dmg * .5, e.neck.x - A.neck.x || 1, -.4, 300, A, { fromX: A.neck.x, snd: "blade" }); }
  }
}
// BFG: no caminho, dá choque em quem estiver perto.
function bfgZap(pr, dt) {
  if ((pr.zapT = (pr.zapT || 0) - dt) > 0) return;
  pr.zapT = pr.big ? .3 : .14; const R = 260 * (pr.big || 1);
  for (const e of fighters) if (isEnemy(pr.owner, e) && hyp(e.neck.x - pr.x, e.neck.y - pr.y) < R) {
    fx.push({ type: "lightning", x1: pr.x, y1: pr.y, x2: e.neck.x + rnd(-10, 10), y2: e.neck.y + rnd(0, 30), t: 0, life: .12, col: "#7dff5a" });
    hurt(e, 3, e.neck.x - pr.x, -.2, 60, pr.owner, { quiet: true, stun: .15, fromX: pr.x, snd: "magicHit" });
  }
}
// Cajado do Vazio: o orbe puxa de leve no caminho e implode quando bate.
function voidPull(pr, dt) {
  for (const e of fighters) {
    if (!isEnemy(pr.owner, e)) continue;
    const dx = pr.x - e.neck.x, dy = pr.y - e.neck.y, d = hyp(dx, dy);
    if (d < 170 && d > 10) { const k = 900 * (1 - d / 170) * dt / Math.max(1, e.sc); for (const p of e.b) { p.vx += dx / d * k; p.vy += dy / d * k; } }
  }
}
function voidCollapse(pr) {
  fx.push({ type: "vortex", owner: pr.owner, x: clamp(pr.x, WALL_L + 20, WALL_R - 20), y: Math.min(pr.y, FLOOR - 40), t: 0, life: 1.2, tick: 0, color: "#9a4aff" });
  ring(pr.x, pr.y, "#b06cff", 60); sfx.dark(); sfx.grav();
}
// Arma da Gravidade: empurrão em cone que arremessa longe.
function gravPunt(f, ox, oy, a) {
  fx.push({ type: "gravcone", x: ox, y: oy, ang: a, t: 0, life: .28 });
  sfx.grav(); shake = Math.max(shake, 8);
  for (const e of fighters) {
    if (!isEnemy(f, e)) continue;
    const ex = e.neck.x - ox, ey = e.neck.y + 15 - oy, d = hyp(ex, ey);
    let da = Math.atan2(ey, ex) - a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    if (d < 270 && Math.abs(da) < .6) {
      const k = 1 - d / 400;
      if (hurt(e, 8 * k + 3, Math.cos(a), Math.sin(a) - .3, 0, f, { stun: .4, fromX: ox, snd: "blunt" })) launch(e, Math.cos(a) * 1500 * k, Math.sin(a) * 1100 * k - 450);
    }
  }
}
// Arma de Portal: portais azul (0) e laranja (1) de cada dono; quem entra num sai pelo outro.
const PORTAL_COL = [["#8ad8ff", "#2a8aff"], ["#ffc86a", "#ff7a1a"]];
function placePortal(pr, ground, wall, gy) {
  const o = pr.owner, c = pr.pc || 0;
  let x = clamp(pr.x, WALL_L + 4, WALL_R - 4), y = pr.y, nx = 0, ny = -1;
  if (wall && !ground) { nx = pr.x < W / 2 ? 1 : -1; ny = 0; x = nx > 0 ? WALL_L + 4 : WALL_R - 4; y = clamp(pr.y, 80, FLOOR - 50); }
  else if (ground) { y = gy; x = clamp(pr.x, WALL_L + 50, WALL_R - 50); }
  else { y = Math.max(pr.y, 20); ny = 1; }
  fx = fx.filter(e => !(e.type === "portal" && e.owner === o && e.c === c));
  fx.push({ type: "portal", owner: o, c, x, y, nx, ny, t: 0, life: 14 });
  for (let i = 0; i < 14; i++) particles.push({ x, y, vx: rnd(-200, 200), vy: rnd(-200, 200), life: .4, max: .4, color: PORTAL_COL[c][0], size: rnd(2, 4), g: 0, glow: true });
  sfx.tele();
}
function portalStep(dt) {
  const ps = fx.filter(e => e.type === "portal");
  for (const A of ps) {
    const B = ps.find(e => e.owner === A.owner && e.c !== A.c); if (!B) continue;
    for (const f of fighters) {
      if (!f.alive || (f.portalCd || 0) > time) continue;
      const px = f.pelvis.x, py = f.pelvis.y + 20 * f.sc;
      const inside = A.ny ? Math.abs(px - A.x) < 46 && Math.abs(py - (A.y - A.ny * 10)) < 40 : Math.abs(py - A.y) < 50 && Math.abs(px - A.x) < 34;
      if (!inside) continue;
      // Sai pelo outro portal com a mesma velocidade, empurrado pra fora dele.
      const sp = Math.max(700, hyp(f.pelvis.vx, f.pelvis.vy));
      const tx = B.x + B.nx * 50, ty = B.y + B.ny * 70 - 20 * f.sc;
      moveBody(f, tx - f.pelvis.x, ty - f.pelvis.y);
      for (const p of [...f.b, ...f.wpts]) { p.vx = B.nx * sp + (B.ny ? p.vx * .2 : 0); p.vy = B.ny * sp; }
      f.extT = .5; f.portalCd = time + .6;
      for (const P of [A, B]) ring(P.x, P.y, PORTAL_COL[P.c][1], 50);
      sfx.tele();
    }
  }
}
// Luz sagrada: coluna de luz que cai num ponto (ou seguindo um alvo até cair).
function holyStrike(e) {
  const o = e.owner, x = e.target && e.target.alive ? e.target.pelvis.x : e.x, y = e.target && e.target.alive ? surfaceBelow(x, e.target.pelvis.y, false) : e.y;
  e.x = x; e.y = y;
  for (const c of fighters) if (isEnemy(o, c) && Math.abs(c.pelvis.x - x) < 70 && c.pelvis.y > y - 320 && c.pelvis.y < y + 20) hurt(c, e.dmg || 13, 0, -1.2, 400, o, { stun: .5, fromX: x, snd: "magicHit", crit: e.dmg > 15 });
  for (let i = 0; i < 20; i++) particles.push({ x: x + rnd(-40, 40), y: y - rnd(0, 20), vx: rnd(-200, 200), vy: rnd(-500, -100), life: .6, max: .6, color: pick(["#fff6c0", "#ffd84a", "#ffffff"]), size: rnd(3, 6), g: 400, star: true });
  shake = Math.max(shake, 8); sfx.star();
}
// Lança-chamas e mochila a jato: segurando ATACAR o fogo é contínuo / a mochila voa de verdade.
// Arma da Gravidade (como no Half-Life 2): segurando ATACAR puxa e segura um inimigo (ou um tiro) na frente da arma;
// soltando, arremessa na direção da mira. Toque rápido sem nada pra pegar = empurrão em cone.
const GRAV_RANGE = 460, GRAV_HOLD = 2.6;
function gravPick(f) {
  const tip = f.wtip || f.rh;
  // Inimigo na direção da mira (os chefões são pesados demais).
  let best = null, bd = 1e9;
  for (const e of fighters) {
    if (!isEnemy(f, e) || e.boss || e.cloakT > 0) continue;
    const ex = e.neck.x - tip.x, ey = e.neck.y + 20 - tip.y, d = hyp(ex, ey);
    let da = Math.atan2(ey, ex) - f.aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    if (d < GRAV_RANGE && Math.abs(da) < .55 && d < bd) { bd = d; best = e; }
  }
  if (best) return { e: best };
  // Senão, um tiro ou bomba inimiga no caminho.
  for (const pr of projectiles) {
    if (pr.owner === f || pr.stuck || pr.orbit > 0) continue;
    const ex = pr.x - tip.x, ey = pr.y - tip.y, d = hyp(ex, ey);
    let da = Math.atan2(ey, ex) - f.aim; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    if (d < GRAV_RANGE && Math.abs(da) < .55 && d < bd) { bd = d; best = pr; }
  }
  return best ? { pr: best } : null;
}
function gravRelease(f, timeout) {
  const g = f.grav, a = f.aim, dx = Math.cos(a), dy = Math.sin(a), tip = f.wtip || f.rh;
  f.grav = null; f.atkCd = .45;
  fx.push({ type: "gravcone", x: tip.x, y: tip.y, ang: a, t: 0, life: .3 });
  shake = Math.max(shake, 10); sfx.grav(); sfx.dash();
  if (g && g.e && g.e.alive) {
    const e = g.e, power = 1500 + Math.min(1, g.t / 1.2) * 600; // segurar mais = arremesso mais forte
    if (hurt(e, 8, dx, dy, 0, f, { stun: .7, fromX: f.neck.x, snd: "blunt" })) {
      launch(e, dx * power, dy * power - 250); e.gravFly = { by: f, until: time + 1.1, hit: new Set([f.id, e.id]) };
      floatText(e.head.x, e.head.y - 50, "ARREMESSADO!", "#ffa040", 26);
    }
  } else if (g && g.pr && g.pr.life > 0) {
    // Devolve o tiro: agora ele é seu.
    const pr = g.pr, sp = 1500;
    pr.owner = f; pr.hits = new Set(); pr.vx = dx * sp; pr.vy = dy * sp; pr.held = false; if (pr.life < .6) pr.life = .8;
    if (pr.fuse !== undefined && pr.fuse < .5) pr.fuse = .5;
    floatText(pr.x, pr.y - 30, "Devolvido!", "#ffa040", 24);
  } else if (!timeout) gravPunt(f, tip.x, tip.y, a);
}
function gravGunStep(f, inp, dt, off) {
  const on = inp.fireHeld && !off && f.atkCd <= 0;
  if (on && !f.grav) {
    f.grav = { t: 0, ...(gravPick(f) || {}) };
    if (f.grav.e || f.grav.pr) { sfx.grav(); if (f.grav.e) floatText(f.grav.e.head.x, f.grav.e.head.y - 50, "Pego!", "#ffa040", 22); }
  }
  if (f.grav && on) {
    const g = f.grav, tip = f.wtip || f.rh, a = f.aim, hx = tip.x + Math.cos(a) * 110, hy = tip.y + Math.sin(a) * 110;
    g.t += dt;
    if (g.e) {
      const e = g.e;
      if (!e.alive) { f.grav = null; return; }
      // Segura o inimigo flutuando na frente da arma.
      const k = Math.min(1, dt * 12), G0 = G * (arena.grav || 1);
      for (const p of [...e.b, ...e.wpts]) { p.vx += ((hx - e.neck.x) * 9 - p.vx) * k; p.vy += ((hy - 25 * e.sc - e.neck.y) * 9 - p.vy) * k - G0 * dt; }
      e.stun = Math.max(e.stun, .25); e.extT = .3; e.plantX = null;
      if ((g.tick = (g.tick || 0) - dt) <= 0) { g.tick = .45; hurt(e, 2, 0, 0, 0, f, { quiet: true, dot: true }); }
    } else if (g.pr) {
      const pr = g.pr;
      if (pr.life <= 0) g.pr = null;
      else { pr.x += (hx - pr.x) * Math.min(1, dt * 14); pr.y += (hy - pr.y) * Math.min(1, dt * 14); pr.px = pr.x; pr.py = pr.y; pr.vx = pr.vy = 0; pr.life = Math.max(pr.life, .5); pr.held = true; if (pr.fuse !== undefined) pr.fuse += dt; }
    }
    if (g.t > GRAV_HOLD) gravRelease(f, true);
  } else if (f.grav && !on) gravRelease(f, false);
  // Quem foi arremessado acerta quem estiver no caminho.
  for (const e of fighters) {
    const gf = e.gravFly; if (!gf || gf.by !== f) continue;
    if (time > gf.until || !e.alive) { e.gravFly = null; continue; }
    for (const c of fighters) {
      if (gf.hit.has(c.id) || !isEnemy(f, c)) continue;
      if (hyp(c.pelvis.x - e.pelvis.x, c.pelvis.y - e.pelvis.y) < 60 * Math.max(c.sc, e.sc)) {
        gf.hit.add(c.id); const vx = e.pelvis.vx, vy = e.pelvis.vy, l = hyp(vx, vy) || 1;
        hurt(c, 12, vx, vy, 0, f, { stun: .6, crit: true, fromX: e.pelvis.x, snd: "blunt" }); launch(c, vx / l * 900, vy / l * 900 - 300);
        hurt(e, 5, -vx, -vy, 0, f, { quiet: true }); spark((c.neck.x + e.neck.x) / 2, (c.neck.y + e.neck.y) / 2, "#ffa040", 14); shake = Math.max(shake, 12);
        floatText(c.head.x, c.head.y - 50, "STRIKE!", "#ffa040", 28);
      }
    }
  }
}
function holdStep(f, inp, dt, off) {
  if (f.w.gravGun) return gravGunStep(f, inp, dt, off);
  f.fuel ??= 1;
  if (f.overheat > 0) f.overheat -= dt;
  const on = inp.fireHeld && !off && f.fuel > 0 && !(f.overheat > 0);
  const grounded = f.lf.ground || f.rf.ground;
  if (!on) {
    f.holdOn = false;
    if ((f.fuelWait = (f.fuelWait || 0) - dt) <= 0) f.fuel = Math.min(1, f.fuel + dt * (f.w.jetpack ? (grounded ? 1 : .2) : .45));
    return;
  }
  f.holdOn = true; f.fuelWait = .35;
  if (f.w.jetpack) {
    f.fuel -= dt / 2.8;
    // Direção: arrastar o botão ou o joystick; sem nada, sobe.
    let dx = 0, dy = -1;
    if (inp.aiming && hyp(inp.ax, inp.ay) > .2) { dx = inp.ax; dy = inp.ay; } else if (hyp(inp.jx, inp.jy) > .3) { dx = inp.jx; dy = inp.jy; }
    const l = hyp(dx, dy) || 1; dx /= l; dy /= l;
    const g = G * (arena.grav || 1), k = Math.min(1, dt * 5), tvx = dx * 660, tvy = f.pelvis.y < 110 && dy < 0 ? 0 : dy * 600; // não sai pelo teto
    for (const p of [...f.b, ...f.wpts]) { p.vx += (tvx - p.vx) * k; p.vy += (tvy - p.vy) * k - g * dt; if (grounded && dy < .3) p.vy = Math.min(p.vy, -460); }
    f.extT = Math.max(f.extT || 0, .12); f.jumps = 1; f.plantX = null;
    if (Math.abs(dx) > .2) f.facing = dx > 0 ? 1 : -1;
    if ((f.jetTick = (f.jetTick || 0) - dt) <= 0) {
      f.jetTick = .03;
      const back = Math.atan2(-dy, -dx) + rnd(-.2, .2), bx = f.neck.x - f.facing * 14 * f.sc, by = f.neck.y + 22 * f.sc;
      addProj("flame", bx, by, back, rnd(380, 520), f, { dmg: .8 });
    }
    if ((f.jetSnd = (f.jetSnd || 0) - dt) <= 0) { f.jetSnd = .24; sfx.rocket(); }
  } else {
    f.fuel -= dt / 3.4;
    f.flameT = Math.max(f.flameT || 0, .06);
    if ((f.jetSnd = (f.jetSnd || 0) - dt) <= 0) { f.jetSnd = .3; sfx.flame(); }
  }
  if (f.fuel <= 0) { f.fuel = 0; f.overheat = .9; floatText(f.head.x, f.head.y - 60 * f.sc, f.w.jetpack ? "Sem combustível!" : "Superaqueceu!", "#ff8a3a", 22); sfx.mmEmpty(); }
}
// Passos dos poderes e ults das armas novas. Devolve true se cuidou do f.sk.
function legendStep(f, k, dt) {
  const s = f.sc, grounded = f.lf.ground || f.rf.ground;
  if (k.id === "braver") {
    // Braver: salta alto e desce com a espada no chão.
    f.aim = k.t < .32 ? -Math.PI / 2 : (f.facing > 0 ? 1.2 : Math.PI - 1.2);
    if (k.t < .32) for (const p of [...f.b, ...f.wpts]) { p.vy = -1100; p.vx = f.facing * 160; }
    else if (!k.done) {
      for (const p of [...f.b, ...f.wpts]) p.vy = Math.max(p.vy, 1700);
      if (grounded || k.t > 1.2) {
        k.done = true; f.atkT = .2;
        const gy = surfaceBelow(f.pelvis.x, f.pelvis.y - 10, false);
        shockwave(f, f.pelvis.x + f.facing * 40, gy, 270, 16);
        areaHit(f, f.pelvis.x + f.facing * 50, f.pelvis.y, 120, 20, 800, { crit: true, stun: .6, up: -1.2 });
        fx.push({ type: "nova2", x: f.pelvis.x + f.facing * 40, y: gy - 10, t: 0, life: .5, r: 200, color: "#7ad8ff" });
        flashScreen = .08; k.t = k.dur;
      }
    }
  } else if (k.id === "octa") {
    // Octaslash: 8 cortes rapidíssimos na frente.
    f.aim = (k.dir > 0 ? 0 : Math.PI) + rnd(-.6, .6); f.facing = k.dir;
    for (const p of f.b) p.vx *= .8;
    if ((k.tick -= dt) <= 0 && k.n < 8) {
      k.tick = .075; k.n++; const last = k.n === 8;
      const x = f.neck.x + k.dir * 120 * s, y = f.neck.y + 15 * s;
      fx.push({ type: "slashx", x: x + rnd(-30, 30), y: y + rnd(-40, 40), t: 0, life: .2, color: last ? "#ffffff" : "#c8d0ff", r: last ? 90 : 60 });
      areaHit(f, x, y, 125 * s, last ? 10 : 4, last ? 750 : 60, { front: k.dir, quiet: !last, stun: .3, crit: last, up: last ? -.8 : 0 });
      sfx.blade(last);
    }
  } else if (k.id === "assassin") {
    // Assassinato: aparece nas costas de cada alvo e golpeia.
    if ((k.tick -= dt) <= 0) {
      k.tick = .5; const e = k.tg[k.i++];
      if (e && e.alive) {
        poof(f, "#4a9aff");
        const side = -(e.facing || 1), tx = clamp(e.pelvis.x + side * 55 * e.sc, WALL_L + 30, WALL_R - 30);
        moveBody(f, tx - f.pelvis.x, Math.min(0, e.pelvis.y - f.pelvis.y)); f.facing = Math.sign(e.pelvis.x - f.pelvis.x) || 1; f.aim = f.facing > 0 ? 0 : Math.PI; f.atkT = .2;
        fx.push({ type: "slashx", x: e.neck.x, y: e.neck.y + 10, t: 0, life: .35, color: "#5ab8ff", r: 60 * e.sc });
        hurt(e, 24, f.facing, -.4, 500, f, { crit: true, stun: .7, fromX: f.neck.x, snd: "blade" }); floatText(e.head.x, e.head.y - 60, "Assassinado!", "#5ab8ff", 26); sfx.saber();
      }
      if (k.i >= k.tg.length) k.dur = Math.min(k.dur, k.t + .4);
    }
  } else if (k.id === "pogostorm") {
    // Pogo Supremo: pula de cabeça em cabeça.
    if ((k.tick -= dt) <= 0) {
      const alive = k.tg.filter(e => e.alive);
      if (!alive.length) k.t = k.dur;
      else {
        k.tick = .3; const e = alive[k.i++ % alive.length];
        moveBody(f, e.head.x - f.pelvis.x, e.head.y - 70 * e.sc - f.pelvis.y);
        for (const p of [...f.b, ...f.wpts]) { p.vy = -700; p.vx = 0; }
        f.aim = Math.PI / 2; f.atkT = .15;
        hurt(e, 12, 0, 1, 250, f, { stun: .6, fromX: f.neck.x, snd: "blunt" }); floatText(e.head.x, e.head.y - 40, "Boing!", "#ffd84a", 26);
        for (let i = 0; i < 10; i++) particles.push({ x: e.head.x + rnd(-20, 20), y: e.head.y - 20, vx: rnd(-220, 220), vy: rnd(-300, -80), life: .6, max: .6, color: pick(["#ff4a6a", "#5ab8ff", "#7dff6a", "#ffd84a"]), size: rnd(3, 6), g: 900, star: true });
        sfx.jump();
      }
    }
  } else if (k.id === "onewing") {
    // Asa Única: abre a asa negra e dispara penas que perseguem os inimigos.
    for (const p of [...f.b, ...f.wpts]) p.vy = Math.min(p.vy, -60);
    if ((k.tick -= dt) <= 0 && k.t < k.dur - .3) { k.tick = .09; addProj("feather", f.neck.x + f.facing * 20, f.neck.y + 15 + rnd(-25, 25), ultAng(f) + rnd(-.12, .12), 1000, f, { homing: 1e-9, homeR: 1, dmg: 4, life: 1.2 }); sfx.whoosh(); }
  } else if (k.id === "supergrav") {
    // Super Gravidade: levanta até 3 inimigos no ar e arremessa todos de uma vez.
    for (const p of f.b) p.vx *= .7;
    k.tg.forEach((e, i) => {
      if (!e.alive) return;
      if (k.t < 1.3) {
        const tx = f.neck.x + f.facing * (110 + i * 70), ty = f.head.y - 140 - i * 40, kk = Math.min(1, dt * 6);
        for (const p of [...e.b, ...e.wpts]) { p.vx += ((tx - e.neck.x) * 4 - p.vx) * kk; p.vy += ((ty - e.neck.y) * 4 - p.vy) * kk - G * dt; }
        e.extT = .3; e.stun = Math.max(e.stun, .2);
      } else if (!k.done) {
        const dir = Math.sign(e.neck.x - f.neck.x) || f.facing;
        if (hurt(e, 18, dir, -.3, 0, f, { crit: true, stun: .8, fromX: f.neck.x, snd: "blunt" })) launch(e, dir * 1900, -500);
      }
    });
    if (k.t >= 1.3 && !k.done) { k.done = true; fx.push({ type: "gravcone", x: f.rh.x, y: f.rh.y, ang: f.facing > 0 ? 0 : Math.PI, t: 0, life: .35, big: true }); shake = 22; sfx.boom(); sfx.grav(); }
  } else if (k.id === "portalrain") {
    // Chuva de Portais: os inimigos caem num portal e despencam lá de cima, 3 vezes.
    if ((k.tick -= dt) <= 0 && k.n < 3) {
      k.tick = .55; k.n++;
      for (const e of k.tg) {
        if (!e.alive) continue;
        const gx = e.pelvis.x, gy = surfaceBelow(gx, e.pelvis.y, false);
        fx.push({ type: "portalfx", x: gx, y: gy, c: 1, t: 0, life: .5 }); fx.push({ type: "portalfx", x: gx, y: 40, c: 0, t: 0, life: .5, top: true });
        moveBody(e, 0, 90 - e.pelvis.y); launch(e, 0, 1700);
        hurt(e, 12, 0, 1, 0, f, { stun: .5, fromX: gx, snd: "blunt" });
      }
      sfx.tele();
    }
  } else return false;
  if (f.sk && k.t > k.dur) f.sk = null;
  return true;
}
// Efeitos com tempo das armas novas.
function realHoleStep(e, dt) {
  const o = e.owner, grow = Math.min(1, e.t / 1.1), E = 80 * (e.big || 1) * grow, R = 470 * (e.big || 1);
  for (const f of fighters) {
    if (!isEnemy(o, f)) continue;
    const dx = e.x - f.neck.x, dy = e.y - f.neck.y, d = hyp(dx, dy);
    if (d < R && d > 8) {
      const k = 3600 * grow * (1 - d / R) * dt / Math.max(1, f.sc * f.sc);
      for (const p of [...f.b, ...f.wpts]) { p.vx += dx / d * k; p.vy += dy / d * k - G * dt * .7 * (1 - d / R); }
      f.extT = Math.max(f.extT || 0, .3);
    }
  }
  // Tiros por perto também caem no buraco.
  for (const pr of projectiles) { const dx = e.x - pr.x, dy = e.y - pr.y, d = hyp(dx, dy); if (d < R * .8 && d > 5) { pr.vx += dx / d * 2200 * dt; pr.vy += dy / d * 2200 * dt; if (d < E * .7) pr.life = 0; } }
  if ((e.tick -= dt) <= 0 && e.t < e.life - .2) {
    e.tick = .2;
    for (const f of fighters) { if (!isEnemy(o, f)) continue; const d = hyp(e.x - f.neck.x, e.y - f.neck.y); if (d < E * 1.7) hurt(f, 4.5, 0, 0, 0, o, { quiet: true, dot: true }); else if (d < E * 3.2) hurt(f, 2, 0, 0, 0, o, { quiet: true, dot: true }); }
    shake = Math.max(shake, 3 * grow);
  }
  if (e.t >= e.life - .05 && !e.boom) {
    e.boom = true; flashScreen = .25; shake = 32; hitstop = Math.max(hitstop, .08); sfx.boom(); sfx.dark();
    fx.push({ type: "nova2", x: e.x, y: e.y, t: 0, life: .7, r: 380, color: "#ffd8a0" });
    for (let i = 0; i < 70; i++) { const a = rnd(7), s = rnd(200, 900); particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5, life: .8, max: .8, color: pick(["#ffffff", "#ffd8a0", "#ff8a3a"]), size: rnd(3, 8), g: 0, glow: true }); }
    for (const f of fighters) { if (!isEnemy(o, f)) continue; const d = hyp(f.neck.x - e.x, f.neck.y - e.y); if (d < 320) hurt(f, 28 * (1 - d / 420), f.neck.x - e.x || 1, -.8, 900, o, { crit: true, stun: .7, fromX: e.x, snd: "magicHit" }); }
    explodeBlocks(e.x, e.y, 320, 30);
  }
}
function legendFxStep(e, dt) {
  if (e.type === "realhole") return realHoleStep(e, dt);
  if (e.type === "lightpillar" && e.t >= 0 && !e.hit) { e.hit = true; holyStrike(e); }
  else if (e.type === "lightpillar" && e.t < 0 && e.target && e.target.alive) { e.x = e.target.pelvis.x; e.y = surfaceBelow(e.x, e.target.pelvis.y, false); }
  else if (e.type === "trinity" && e.t >= 0 && !e.hit) {
    e.hit = true; const o = e.owner; if (!o.alive) return;
    e.x = clamp(o.neck.x + o.facing * (190 + e.idx * 170), WALL_L + 40, WALL_R - 40); e.y = o.neck.y + 10;
    fx.push({ type: "nova2", x: e.x, y: e.y, t: 0, life: .55, r: 230, color: "#ffe27a" });
    for (const c of foesOf(o)) if (hyp(c.neck.x - e.x, c.neck.y - e.y) < 240) hurt(c, 26, c.neck.x - e.x || 1, -1, 700, o, { crit: true, stun: .6, fromX: e.x, snd: "magicHit" });
    flashScreen = .08; shake = Math.max(shake, 16); sfx.star(); sfx.boom();
  } else if (e.type === "creeper" && e.t >= 1.25 && !e.hit) {
    e.hit = true; explode(e.x, e.y - 30, e.owner, 50, 170, true); flashScreen = .06;
  } else if (e.type === "delayboom" && e.t >= 0 && !e.hit) {
    e.hit = true; explode(e.x, e.y, e.owner, e.dmg, e.r, true); flashScreen = .15; ring(e.x, e.y, "#b06cff", e.r);
  }
}

// ───────────────────────── Corrida da Morte ─────────────────────────
// A tela anda sozinha pra direita e a Morte vem logo atrás. Quem ficar pra trás é pego.
// O caminho passa por 4 zonas, cada uma com as suas armadilhas. Primeiro a cruzar a chegada vence.
const RACE_LEN = 10000;
const RACE_ZONES = [
  { id: "cemiterio", name: "Cemitério Assombrado", icon: "👻", from: 0,    col: "#c58bff", obs: { spikes: 3, crate: 3, hands: 3, boulder: 2, spring: 1, boost: 1 } },
  { id: "floresta",  name: "Floresta Sombria",     icon: "🌲", from: 2500, col: "#7dff9a", obs: { boulder: 3, bats: 3, spring: 2, spikes: 2, crate: 2, hands: 1, boost: 1 } },
  { id: "vulcao",    name: "Vulcão em Fúria",      icon: "🌋", from: 5000, col: "#ff8a3a", obs: { lava: 4, firejet: 3, rockfall: 3, spring: 1, boost: 1 } },
  { id: "castelo",   name: "Castelo da Morte",     icon: "🏰", from: 7500, col: "#8ab8ff", obs: { saw: 3, pendulum: 3, spikes: 2, bats: 2, crate: 1, boost: 1 } },
];
const zoneAt = (wx) => { let z = 0; RACE_ZONES.forEach((Z, i) => { if (wx >= Z.from) z = i; }); return z; };
const PEND_Y = 320, PEND_L = 420;
let race = null;
function startRace() {
  race = { dist: 0, t: 0, v: 270, deathX: 110, next: 1100, obs: [], orbs: [], order: [], finishW: RACE_LEN + 420, zone: 0, banner: null, final: false, scytheT: 7, heartT: 0, danger: 0 };
  PLATFORMS = [];
}
function raceShift(sh) {
  race.dist += sh;
  for (const f of fighters) {
    for (const p of [...f.b, ...f.wpts]) { p.x -= sh; p.ox -= sh; }
    if (f.plantX != null) f.plantX -= sh;
    if (f.zipX != null) f.zipX -= sh;
  }
  for (const pr of projectiles) { pr.x -= sh; pr.px -= sh; }
  for (const e of fx) for (const k of ["x", "x1", "x2", "gx"]) if (typeof e[k] === "number") e[k] -= sh;
  for (const p of particles) p.x -= sh;
  for (const p of pickups) p.x -= sh;
  for (const p of PLATFORMS) p.x -= sh;
  for (const o of race.obs) o.x -= sh;
  for (const o of race.orbs) o.x -= sh;
}
function pickWeighted(tbl) {
  const tot = Object.values(tbl).reduce((s, v) => s + v, 0); let r = rnd(tot);
  for (const [k, v] of Object.entries(tbl)) if ((r -= v) < 0) return k;
  return Object.keys(tbl)[0];
}
// Orbes de alma: enchem o especial e dão um empurrãozinho.
function spawnOrbs(x, y, n, arc) {
  for (let i = 0; i < n; i++) race.orbs.push({ x: x + i * 46, y: y - (arc ? Math.sin(i / (n - 1 || 1) * Math.PI) * 70 : 0), ph: rnd(7) });
}
function spawnObstacle(wx) {
  const x = wx - race.dist, Z = RACE_ZONES[zoneAt(wx)], type = pickWeighted(Z.obs);
  const o = { type, x, w: 0, hits: new Set(), rot: 0, ph: rnd(0, 6), zone: Z.id };
  if (type === "spikes") o.w = 110;
  else if (type === "crate") { o.w = 70; o.h = pick([70, 110]); o.plat = { x, y: FLOOR - o.h, w: 70, race: true, crate: true }; PLATFORMS.push(o.plat); }
  else if (type === "boulder") { o.r = 34; o.active = false; }
  else if (type === "boost") o.w = 100;
  else if (type === "spring") { o.w = 64; o.squash = 0; }
  else if (type === "hands") { o.w = 130; o.rise = 0; o.grab = 0; }
  else if (type === "bats") { o.y = FLOOR - rnd(110, 200); o.n = 4; o.active = false; }
  else if (type === "lava") {
    o.w = rnd(170, 250);
    if (o.w > 210 || rnd() < .5) PLATFORMS.push({ x: x + o.w / 2 - 55, y: FLOOR - 150, w: 110, race: true, rock: true });
  }
  else if (type === "firejet") o.w = 60;
  else if (type === "rockfall") { o.state = "idle"; o.ry = -80; o.rvy = 0; o.wt = 0; }
  else if (type === "saw") { o.sy = FLOOR - 60; }
  else if (type === "pendulum") { o.bx = x; o.by = PEND_Y + PEND_L; }
  race.obs.push(o);
  if (type !== "pendulum" && rnd() < .4) PLATFORMS.push({ x: x + rnd(-120, 120), y: FLOOR - rnd(170, 260), w: 170, race: true });
  // Orbes: em arco por cima do obstáculo ou numa fileira no chão logo depois.
  if (rnd() < .45) { if (rnd() < .5) spawnOrbs(x - 40, FLOOR - 140, 4, true); else spawnOrbs(x + 200, FLOOR - 70, 3, false); }
}
function deathCatch(f) {
  floatText(f.head.x, f.head.y - 60, "A Morte te pegou!", "#c58bff", 28);
  floatText(race.deathX + 20, FLOOR - 400, pick(["HA HA HA!", "Mais uma alma!", "Ninguém escapa!"]), "#ff5a7a", 34);
  for (let i = 0; i < 30; i++) particles.push({ x: f.neck.x + rnd(-30, 30), y: f.neck.y + rnd(-20, 60), vx: rnd(-200, 100), vy: rnd(-200, 50), life: .8, max: .8, color: pick(["#1a0a2a", "#6a2fa0", "#c58bff"]), size: rnd(5, 12), g: -50, puff: true });
  sfx.dark(); buzz(f.id, 400); f.hp = 0; kill(f, -1, -.6, 900);
  race.swingT = .5;
}
// Faixa de perigo de um runner perto de um ponto: true uma vez a cada "cd" segundos.
function raceHitOk(f, key, cd) { const k = "rh_" + key; if ((f[k] || 0) > time) return false; f[k] = time + cd; return true; }
function firejetPhase(o) { return (race.t + o.ph) % 2.4; }
function updateRace(dt) {
  const R = race; if (!R) return;
  R.t += dt; R.v = 270 + Math.min(150, R.t * 4) + (R.final ? 70 : 0); // a Morte acelera com o tempo
  if (R.banner) R.banner.t += dt;
  if (R.swingT > 0) R.swingT -= dt;
  const runners = fighters.filter(f => f.alive && !f.finished);
  const lead = runners.reduce((m, f) => Math.max(m, f.pelvis.x), 0), finishX = R.finishW - R.dist;
  if (finishX > 1350) raceShift((R.v + Math.max(0, lead - 1180) * 1.6) * dt);
  else R.deathX += R.v * dt * .85; // a tela parou na chegada: a Morte avança
  while (R.next < R.dist + W + 300 && R.next < R.finishW - 380) { spawnObstacle(R.next); R.next += rnd(400, 680) - zoneAt(R.next) * 25; }
  // Zonas novas e reta final.
  const leadW = lead + R.dist, z = zoneAt(leadW);
  if (runners.length && z > R.zone) { R.zone = z; const Z = RACE_ZONES[z]; R.banner = { text: `${Z.icon} ${Z.name}`, sub: `Zona ${z + 1} de ${RACE_ZONES.length}`, col: Z.col, t: 0 }; sfx.gong(); }
  if (runners.length && !R.final && leadW > R.finishW - 1500) { R.final = true; R.banner = { text: "🏁 RETA FINAL!", sub: "A Morte ficou furiosa!", col: "#ffd84a", t: 0 }; sfx.horn?.(); R.scytheT = Math.min(R.scytheT, 2); }
  // A Morte joga a foice no último da fila.
  if (runners.length && R.t > 6 && (R.scytheT -= dt) <= 0) {
    const last = runners.reduce((m, f) => f.pelvis.x < m.pelvis.x ? f : m);
    fx.push({ type: "deathscythe", x: R.deathX + 50, y: last.neck.y + 20, t: 0, life: 2.6, warn: .75 });
    R.scytheT = R.final ? rnd(3, 4.5) : rnd(5, 8); R.swingT = .6; sfx.whoosh();
  }
  for (const e of fx) if (e.type === "deathscythe" && e.t > e.warn) {
    e.x += 950 * dt;
    for (const f of runners) if (hyp(f.neck.x - e.x, f.neck.y + 20 - e.y) < 60 && raceHitOk(f, "scythe", 1)) {
      hurt(f, 9, 1, -.8, 380, null, { env: true, stun: .4, snd: "blade" }); slowDown(f, 1.2);
      floatText(f.head.x, f.head.y - 50, "A foice da Morte!", "#c58bff", 24);
    }
  }
  // Perigo: batida de coração quando alguém está quase sendo pego.
  R.danger = runners.reduce((m, f) => Math.max(m, clamp(1 - (f.pelvis.x - R.deathX - 75) / 280, 0, 1)), 0);
  if (R.danger > .25 && (R.heartT -= dt) <= 0) {
    sfx.heart(); R.heartT = lerp(.75, .32, R.danger);
    for (const f of runners) if (f.pelvis.x - R.deathX < 300 && !f.bot) buzz(f.id, 60);
  }
  for (const o of R.obs) {
    if (o.type === "boulder") {
      if (!o.active && o.x < W - 60) { o.active = true; sfx.rumble(); }
      if (o.active) { o.x -= 380 * dt; o.rot -= 380 * dt / o.r; }
    } else if (o.type === "bats") {
      if (!o.active && o.x < W + 40) { o.active = true; sfx.whoosh(); }
      if (o.active) o.x -= 280 * dt;
    } else if (o.type === "spring") o.squash = Math.max(0, o.squash - dt * 4);
    else if (o.type === "hands") { const near = runners.some(f => Math.abs(f.pelvis.x - o.x - o.w / 2) < 230); o.rise = clamp(o.rise + (near ? 3 : -1.5) * dt, 0, 1); o.grab = Math.max(0, o.grab - dt); }
    else if (o.type === "firejet") { const c = firejetPhase(o); if (c >= 1.6 && c - dt < 1.6 && o.x > -50 && o.x < W + 50) sfx.fire(); }
    else if (o.type === "rockfall") {
      if (o.state === "idle" && o.x < W - 160) { o.state = "warn"; o.wt = .9; }
      else if (o.state === "warn" && (o.wt -= dt) <= 0) { o.state = "fall"; o.ry = -80; o.rvy = 400; sfx.whoosh(); }
      else if (o.state === "fall") {
        o.rvy += 2400 * dt; o.ry += o.rvy * dt; o.rot += dt * 6;
        if (o.ry >= FLOOR - 38) {
          o.state = "done"; o.ry = FLOOR - 38; shake = Math.max(shake, 10); sfx.boom();
          for (let i = 0; i < 16; i++) particles.push({ x: o.x + rnd(-30, 30), y: FLOOR - rnd(0, 30), vx: rnd(-300, 300), vy: rnd(-500, -100), life: .7, max: .7, color: pick(["#4a3028", "#7a5040", "#ff8a3a"]), size: rnd(4, 9), g: 1400 });
        }
      }
    } else if (o.type === "saw") o.sy = FLOOR - 50 - (Math.sin((R.t + o.ph) * 2.2) * .5 + .5) * 200;
    else if (o.type === "pendulum") { const an = Math.sin((R.t + o.ph) * 2.4) * .95; o.an = an; o.bx = o.x + Math.sin(an) * PEND_L; o.by = PEND_Y + Math.cos(an) * PEND_L; }
    for (const f of runners) {
      const fy = Math.max(f.lf.y, f.rf.y), px = f.pelvis.x, inX = px > o.x - 5 && px < o.x + o.w + 5;
      if (o.type === "spikes" && inX && fy > FLOOR - 22 && raceHitOk(f, "spike", .8)) {
        hurt(f, 7, -1, -1.6, 520, null, { env: true, stun: .5, snd: "pierce" }); floatText(f.head.x, f.head.y - 50, "Ai!", "#ff6a5a", 22);
      } else if (o.type === "crate" && f.pelvis.y > FLOOR - o.h + 8 && px > o.x - 16 && px < o.x + o.w + 16) {
        const tx = px < o.x + o.w / 2 ? o.x - 16 : o.x + o.w + 16, dx = tx - px;
        for (const p of [...f.b, ...f.wpts]) { p.x += dx; p.ox = p.x; }
      } else if (o.type === "boulder" && o.active && !o.hits.has(f.id) && Math.abs(px - o.x) < o.r + 14 && f.pelvis.y > FLOOR - o.r * 2 - 30) {
        o.hits.add(f.id); hurt(f, 10, -1, -1, 650, null, { env: true, stun: .6, snd: "blunt" }); shake = Math.max(shake, 8);
      } else if (o.type === "boost" && px > o.x && px < o.x + o.w && fy > FLOOR - 25 && raceHitOk(f, "boost", 1)) {
        f.hasteT = Math.max(f.hasteT, 1.8); bodyPush(f, 650, -60); sfx.dash(); floatText(f.head.x, f.head.y - 50, "Turbo!", "#5affd8", 22);
      } else if (o.type === "spring" && px > o.x - 4 && px < o.x + o.w + 4 && fy > FLOOR - 30 && raceHitOk(f, "spring", .6)) {
        for (const p of [...f.b, ...f.wpts]) { p.vy = -1550; p.vx = Math.max(p.vx, 520); }
        f.extT = .5; o.squash = 1; sfx.jump(); sfx.squeak?.(); floatText(f.head.x, f.head.y - 50, "Boing!", "#ffd84a", 24);
      } else if (o.type === "hands" && inX && fy > FLOOR - 30 && o.rise > .5 && raceHitOk(f, "hands", 1.6)) {
        slowDown(f, 1.1); hurt(f, 3, 0, -.3, 0, null, { env: true, quiet: true, snd: "blunt" }); o.grab = .5;
        floatText(f.head.x, f.head.y - 50, "Agarrado!", "#9adf6a", 24); sfx.dark();
      } else if (o.type === "bats" && o.active) {
        for (let i = 0; i < o.n; i++) {
          const bx = o.x + i * 44, by = o.y + Math.sin(time * 6 + i * 1.7) * 24;
          if ((hyp(f.neck.x - bx, f.neck.y - by) < 36 || hyp(px - bx, f.pelvis.y - by) < 36) && raceHitOk(f, "bat", .9)) {
            hurt(f, 5, -1, -.6, 300, null, { env: true, stun: .25, snd: "pierce" }); floatText(f.head.x, f.head.y - 50, "Morcegos!", "#c58bff", 22);
          }
        }
      } else if (o.type === "lava" && px > o.x + 6 && px < o.x + o.w - 6 && fy > FLOOR - 18 && raceHitOk(f, "lava", .5)) {
        hurt(f, 9, 1, -1, 0, null, { env: true, stun: .2, snd: "fire" });
        for (const p of [...f.b, ...f.wpts]) { p.vy = -1250; p.vx = Math.max(p.vx, 380); }
        f.extT = .5; floatText(f.head.x, f.head.y - 50, "Queimou!", "#ff8a3a", 26); sfx.fire();
        for (let i = 0; i < 14; i++) particles.push({ x: px + rnd(-20, 20), y: FLOOR - 10, vx: rnd(-200, 200), vy: rnd(-500, -150), life: .6, max: .6, color: pick(["#ff5a1a", "#ffd84a", "#ff8a3a"]), size: rnd(3, 6), g: 900, glow: true });
      } else if (o.type === "firejet" && firejetPhase(o) >= 1.6 && Math.abs(px - o.x - 30) < 42 && f.pelvis.y > FLOOR - 280 && raceHitOk(f, "jet", .7)) {
        hurt(f, 8, 0, -1.4, 700, null, { env: true, stun: .3, snd: "fire" }); floatText(f.head.x, f.head.y - 50, "Fogo!", "#ff8a3a", 24);
      } else if (o.type === "rockfall" && o.state === "fall" && (hyp(px - o.x, f.pelvis.y - o.ry) < 54 || hyp(f.neck.x - o.x, f.neck.y - o.ry) < 54) && raceHitOk(f, "rock", 1)) {
        hurt(f, 12, rnd() < .5 ? -1 : 1, -1, 600, null, { env: true, stun: .6, snd: "blunt" }); shake = Math.max(shake, 10);
      } else if (o.type === "saw" && (hyp(px - o.x, f.pelvis.y - o.sy) < 46 || hyp(f.neck.x - o.x, f.neck.y - o.sy) < 46) && raceHitOk(f, "saw", .7)) {
        hurt(f, 9, -1, -1.2, 600, null, { env: true, stun: .35, snd: "blade" }); floatText(f.head.x, f.head.y - 50, "Serra!", "#dfe5ea", 22);
      } else if (o.type === "pendulum" && (hyp(px - o.bx, f.pelvis.y - o.by) < 56 || hyp(f.neck.x - o.bx, f.neck.y - o.by) < 56) && raceHitOk(f, "pend", .9)) {
        const dir = Math.cos((R.t + o.ph) * 2.4) >= 0 ? 1 : -1;
        hurt(f, 12, dir, -1, 900, null, { env: true, stun: .5, snd: "blade" }); shake = Math.max(shake, 8);
      }
    }
  }
  for (const ob of R.orbs) if (!ob.taken) for (const f of runners) if (hyp(f.neck.x - ob.x, f.neck.y + 20 - ob.y) < 48 || hyp(f.pelvis.x - ob.x, f.pelvis.y - ob.y) < 40) {
    ob.taken = true; gainSpecial(f, 9); f.hasteT = Math.max(f.hasteT, .5); sfx.pick();
    for (let i = 0; i < 8; i++) particles.push({ x: ob.x, y: ob.y, vx: rnd(-160, 160), vy: rnd(-160, 160), life: .4, max: .4, color: pick(["#9ae8ff", "#ffffff", "#c58bff"]), size: rnd(2, 4), g: 0, glow: true });
    break;
  }
  R.obs = R.obs.filter(o => o.x > -500);
  R.orbs = R.orbs.filter(o => !o.taken && o.x > -60);
  PLATFORMS = PLATFORMS.filter(p => !p.race || p.x + p.w > -300);
  for (const f of runners) if (f.pelvis.x < R.deathX + 75) deathCatch(f);
  for (const f of runners) if (f.alive && f.pelvis.x > finishX + 10) {
    f.finished = true; R.order.push(f.pl); f.shield = 999;
    const n = R.order.length; floatText(f.head.x, f.head.y - 80, `${n}º lugar!`, n === 1 ? "#ffd84a" : "#f3e6c8", 40);
    for (let i = 0; i < 60; i++) particles.push({ x: f.neck.x, y: f.neck.y, vx: rnd(-400, 400), vy: rnd(-750, -200), life: 1.4, max: 1.4, color: pick(["#ffd84a", "#ff5a7a", "#5ac8ff", "#7dff6a"]), size: 4, g: 700, confetti: true });
    for (let i = 0; i < 3; i++) fx.push({ type: "racefirework", x: finishX + rnd(-200, 260), y: rnd(160, 380), t: -i * .25, life: 1.1, col: pick(["#ffd84a", "#ff5a7a", "#5ac8ff", "#7dff6a", "#c58bff"]) });
    sfx.roundWin(); sfx.firework?.();
  }
}
function raceBot(f, dt) {
  const b = f.bot; b.jx = 1; b.dashHeld = true; f.botAim = 0;
  let jump = false;
  for (const o of race.obs) {
    const dx = o.x - f.pelvis.x;
    if ((o.type === "spikes" || o.type === "crate" || o.type === "boulder" || o.type === "hands" || o.type === "spring") && dx > -20 && dx < 150) jump = true;
    if (o.type === "lava" && dx > -o.w && dx < 110) jump = true;
    if (o.type === "firejet" && dx > -40 && dx < 130 && firejetPhase(o) > 1.2) b.jx = firejetPhase(o) > 2.2 ? 1 : .15;
    if (o.type === "bats" && o.active && Math.abs(o.x - f.pelvis.x) < 140 && o.y > FLOOR - 160) jump = true;
  }
  b.jy = jump && !f.upHeld ? -1 : 0;
  if (rnd() < .006) b.dash = true;
  const e = nearestFoe(f, 80); if (e && rnd() < .04) b.atk = true;
  if (f.sp >= 100 && rnd() < .02) b.sp = true;
}

// ───────────────────────── Ults das armas de corpo a corpo (cada uma diferente) ─────────────────────────
const foesOf = (f, r = 9999) => fighters.filter(e => isEnemy(f, e) && hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < r);
const launch = (e, vx, vy) => { const k = 1 / Math.max(1, e.sc); for (const q of [...e.b, ...e.wpts]) { q.vx = vx * k; q.vy = vy * k; } e.extT = 1.3; };
// As ults de corpo a corpo não acertam sozinhas: só pegam quem estiver na direção da mira, e o que cai do céu
// cai na frente do jogador (dá pra desviar).
// Mira da ult: quase na horizontal conta como reto pra frente.
function ultAng(f) { const a = f.aim ?? (f.facing > 0 ? 0 : Math.PI); return Math.abs(Math.sin(a)) < .35 ? (Math.cos(a) >= 0 ? 0 : Math.PI) : a; }
function aimedFoes(f, r = 520, cone = .5) {
  const a = ultAng(f), d = e => hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y);
  return foesOf(f, r).filter(e => { const t = Math.atan2(e.neck.y + 10 - f.neck.y, e.neck.x - f.neck.x) - a; return Math.abs(Math.atan2(Math.sin(t), Math.cos(t))) < cone; }).sort((p, q) => d(p) - d(q));
}
const aimedFoe = (f, r, cone) => aimedFoes(f, r, cone)[0] || null;
function aimSpots(f, n, d0 = 220, step = 170) {
  const out = [];
  for (let i = 0; i < n; i++) { const x = clamp(f.pelvis.x + f.facing * (d0 + i * step), WALL_L + 60, WALL_R - 60); out.push({ x, y: surfaceBelow(x, f.pelvis.y - 10, false) }); }
  return out;
}
// Errou: dá um bote pra frente no vazio.
function ultWhiff(f, col) {
  moveBody(f, clamp(f.pelvis.x + f.facing * 200, WALL_L + 30, WALL_R - 30) - f.pelvis.x, 0);
  fx.push({ type: "slashx", x: f.neck.x + f.facing * 70, y: f.neck.y + 15, t: 0, life: .3, color: col || f.color, r: 70 });
  areaHit(f, f.neck.x + f.facing * 80, f.neck.y + 15, 110, 14, 500, { front: f.facing, stun: .4, crit: true });
  floatText(f.head.x, f.head.y - 90, "ERROU!", "#c8c8c8", 30); poof(f, col || f.color); sfx.dash();
}
const MELEE_ULTS = {
  punhos:     { name: "Soco Sério", run: f => { f.sk = { id: "onepunch", t: 0, dur: .95, tg: aimedFoe(f, 480, .55) }; floatText(f.head.x, f.head.y - 90, "...", "#ffffff", 40); } },
  adaga:      { name: "Dança das Sombras", run: f => supremeSpecial(f, { per: 5, col: "#8a3aff" }) },
  espada:     { name: "Lâmina Celestial", run: f => {
    const p = aimSpots(f, 1, 300)[0];
    fx.push({ type: "giantsword", owner: f, x: p.x, y: p.y, t: 0, life: 1.4, style: "sword" }); sfx.whoosh();
  } },
  espadaLonga: { name: "Corte do Horizonte", run: f => {
    addProj("windslash", f.neck.x, f.neck.y + 20, f.facing > 0 ? 0 : Math.PI, 1500, f, { big: 4, rMul: 4, dmg: 28 });
    fx.push({ type: "iaido", x1: f.facing > 0 ? f.neck.x : WALL_L, x2: f.facing > 0 ? WALL_R : f.neck.x, y: f.neck.y + 20, t: 0, life: .4 }); sfx.whirl(); sfx.blade(true); flashScreen = .12;
  } },
  rapieira:   { name: "Estocada Estelar", run: f => { f.sk = { id: "flurry", t: 0, dur: 1.5, dir: f.facing, tick: 0, n: 0, big: true }; sfx.dash(); } },
  espadaEscudo: { name: "Fortaleza", run: f => {
    for (const c of fighters) if (c.alive && (c === f || (f.team && c.team === f.team))) { c.shield = Math.max(c.shield, 3); stars(c.neck.x, c.neck.y, "#ffe9a0", 12); }
    f.sk = { id: "bash", t: 0, dur: 1.0, dir: f.facing, hits: new Set(), big: true }; sfx.shield(); sfx.dash();
  } },
  espadaFlamejante: { name: "Inferno", run: f => {
    const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
    for (let i = 0; i < 7; i++) for (const s of [f.facing]) { const x = f.pelvis.x + s * (90 + i * 120); if (x > WALL_L + 20 && x < WALL_R - 20) fx.push({ type: "spikes", style: "fire", burn: true, owner: f, x, y: surfaceBelow(x, gy - 60, false), t: -i * .1, life: 1.1, hit: false, dmg: 11 }); }
    sfx.fire(); flameBurst(f.pelvis.x, f.pelvis.y);
  } },
  machado:    { name: "Tornado de Machados", run: f => { for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; addProj("boomaxe", f.neck.x, f.neck.y + 10, a, 1000, f, { dir: a, back: false, dmg: 12 }); } sfx.whirl(); } },
  machadoDuplo: { name: "Furacão", run: f => { f.sk = { id: "whirl", t: 0, dur: 3, dir: f.facing, tick: 0, big: true }; fx.push({ type: "whirl", owner: f, t: 0, life: 3, big: true }); sfx.whirl(); } },
  maca:       { name: "Meteoro Humano", run: f => { f.sk = { id: "meteorjump", t: 0, dur: 3, x: aimSpots(f, 1, 380)[0].x, ly: f.pelvis.y }; bodyPush(f, 0, -2200); sfx.dash(); } },
  martelo:    { name: "Terremoto Final", run: f => { f.sk = { id: "megaquake", t: 0, dur: 1.5, n: 0 }; } },
  clava:      { name: "Fúria do Gigante", run: f => {
    if (!(f.rageT > 0)) { f.rageBase = f.dmgMul; f.rageKb = f.kbMul; }
    f.rageT = 8; f.dmgMul = (f.rageBase || 1) * 2.2; f.kbMul = (f.rageKb ?? 1) * .3;
    shockwave(f, f.pelvis.x, surfaceBelow(f.pelvis.x, f.pelvis.y, false), 320, 18);
    floatText(f.head.x, f.head.y - 120, "ROOOAAAR!", "#ff4a3a", 44); ring(f.neck.x, f.neck.y, "#ff4a3a", 200);
  } },
  mangual:    { name: "Bola de Demolição", run: f => { addProj("wreck", f.rh.x, f.rh.y, f.facing > 0 ? -.15 : Math.PI + .15, 1250, f, { big: 2.6, rMul: 2.2, dmg: 40, life: 2 }); sfx.throw(); shake = Math.max(shake, 8); } },
  lanca:      { name: "Chuva de Lanças", run: f => {
    for (const p of aimSpots(f, 3, 200, 230)) fx.push({ type: "arrowrain", owner: f, x: p.x, y: p.y, t: 0, life: 1.9, tick: .25, kind: "bolt", dmg: 10 });
    sfx.throw();
  } },
  alabarda:   { name: "Ciclone de Aço", run: f => { for (const e of foesOf(f, 280)) launch(e, (f.neck.x - e.neck.x) * 1.1, -1050); f.sk = { id: "cyclone", t: 0, dur: 1.4, tick: .15, n: 0 }; sfx.whirl(); } },
  foice:      { name: "Colheita Sombria", run: f => { f.sk = { id: "harvest", t: 0, dur: 1.3, n: 0, next: 0 }; } },
  tridente:   { name: "Ira do Oceano", run: f => {
    const y = surfaceBelow(f.pelvis.x, f.pelvis.y, false) - 40;
    for (const [x, a] of [[WALL_L + 40, 0], [WALL_R - 40, Math.PI], [f.pelvis.x, 0], [f.pelvis.x, Math.PI]]) addProj("tidal", x, y, a, 800, f, { big: 1.6, rMul: 1.6, dmg: 14 });
    sfx.water(); sfx.whoosh(); shake = Math.max(shake, 10);
  } },
  chicote:    { name: "Laço Triplo", run: f => {
    const tg = aimedFoes(f, 560, .5).slice(0, 3); if (!tg.length) ultWhiff(f, "#c8a060");
    for (const e of tg) { fx.push({ type: "lasso", owner: f, target: e, t: 0, life: .6 }); hurt(e, 6, f.neck.x - e.neck.x, -1, 0, f, { stun: 1, fromX: f.neck.x, snd: "blunt" }); }
    sfx.whip?.();
  } },
  sabreLuz:   { name: "Tempestade da Força", run: f => { f.sk = { id: "forcestorm", t: 0, dur: 1.6, tick: 0 }; } },
  sabreDuplo: { name: "Dança dos Sabres", run: f => { for (let i = 0; i < 6; i++) { const a = (f.facing > 0 ? 0 : Math.PI) + (i - 2.5) * .35; addProj("saberdisc", f.neck.x, f.neck.y + 10, a, 1100, f, { dir: a, back: false, color: f.w.glow || "#ff4a4a", dmg: 12 }); } sfx.saber(); } },
  marteloGravitacional: { name: "Singularidade", run: f => {
    const x = aimSpots(f, 1, 320)[0].x, y = f.neck.y;
    fx.push({ type: "vortex", owner: f, x, y, t: 0, life: 3, tick: 0, color: "#b06cff", big: true }); sfx.dark(); sfx.grav();
  } },
  punhosCiber: { name: "Chuva de Foguetes", run: f => { f.sk = { id: "rocketrain", t: 0, dur: 1.5, tick: 0 }; } },
  marteloBrinquedo: { name: "Super Squeak", run: f => {
    fx.push({ type: "toyhammer", owner: f, dir: f.facing, t: 0, life: .9, hit: false }); sfx.whoosh();
  } },
  guardaChuva: { name: "Tempestade", run: f => { for (const p of aimSpots(f, 3, 180, 190)) fx.push({ type: "stormcloud", owner: f, x: p.x, gy: p.y, y: Math.max(60, p.y - 330), t: 0, life: 3, tick: .5 }); sfx.thunder(); } },
  luvaMola:   { name: "Soco de Mola Gigante", run: f => { addProj("rocketfist", f.rh.x, f.rh.y, f.facing > 0 ? 0 : Math.PI, 1300, f, { big: 2.6, rMul: 2.6, glove: true, dmg: 30 }); sfx.squeak?.(); sfx.dash(); } },
  taco:       { name: "Home Run Supremo", run: f => { f.sk = { id: "homerun", t: 0, dur: .75, done: false }; } },
  manoplaGolem: { name: "Punho da Montanha", run: f => {
    aimSpots(f, 3, 200, 200).forEach((p, i) => fx.push({ type: "giantsword", owner: f, x: p.x, y: p.y, t: -i * .2, life: 1.4, style: "fist" }));
    sfx.rumble();
  } },
  lancaGlacial: { name: "Era do Gelo", run: f => {
    fx.push({ type: "nova2", x: f.neck.x, y: f.neck.y + 20, t: 0, life: .6, r: 360, color: "#bff0ff" });
    for (const e of foesOf(f, 360)) { hurt(e, 12, 0, -.2, 0, f, { snd: "magicHit" }); applyFreeze(e, 1.3, { cap: 1.3, cd: 0 }); }
    for (let i = 0; i < 14; i++) addProj("icicle", clamp(f.pelvis.x + f.facing * rnd(120, 700), WALL_L + 30, WALL_R - 30), -30 - i * 40, Math.PI / 2, 300, f, { dmg: 9 });
    flashScreen = .2; sfx.ice(); floatText(f.head.x, f.head.y - 100, "Era do Gelo!", "#bff0ff", 34);
  } },
  laminaInfernal: { name: "Lâmina do Apocalipse", run: f => {
    for (const a of [0, Math.PI]) for (let i = 0; i < 3; i++) addProj("flamewave", f.neck.x, f.neck.y - 30 + i * 30, a, 650 + i * 120, f, { dmg: 12, life: 1.6 });
    aimSpots(f, 4, 150, 150).forEach((p, i) => fx.push({ type: "spikes", style: "fire", burn: true, owner: f, x: p.x, y: p.y, t: .1 - i * .08, life: 1.1, hit: false, dmg: 14 }));
    sfx.fire(); flashScreen = .12;
  } },
};
// Bomba Gigante: pra onde e com que força jogar (arrastar o ATACAR ou o joystick escolhe).
function megaAim(f) {
  const k = f.sk, inp = f.bot || f.pl.input, dir = k.dir || f.facing;
  let ang, pow;
  if (f.bot) {
    const e = nearestFoe(f, 1600), dx = e ? e.pelvis.x - f.neck.x : dir * 500;
    ang = dx >= 0 ? -.7 : Math.PI + .7; pow = clamp((Math.sqrt(Math.abs(dx) * 900 / .985) - 380) / 820, 0, 1);
  } else if (inp.aiming && hyp(inp.ax, inp.ay) > .2) { ang = Math.atan2(inp.ay, inp.ax); pow = Math.min(1, hyp(inp.ax, inp.ay)); }
  else if (inp.atkAim != null) { ang = inp.atkAim; pow = inp.atkMag ?? .55; }
  else if (hyp(inp.jx, inp.jy) > .3) { ang = Math.atan2(inp.jy, inp.jx); pow = Math.min(1, hyp(inp.jx, inp.jy)); }
  else { ang = dir > 0 ? -.6 : Math.PI + .6; pow = .55; }
  if (Math.sin(ang) > -.05) ang = Math.cos(ang) >= 0 ? -.05 : Math.PI + .05; // nunca pra baixo
  return { ang, sp: 380 + 820 * clamp(pow, 0, 1) };
}
// Passos das ults que duram um tempo.
function ultStep(f, k, dt) {
  if (legendStep(f, k, dt)) return true;
  const s = f.sc, grounded = f.lf.ground || f.rf.ground;
  if (k.id === "onepunch") {
    // Soco Sério: concentra... e um soco só.
    for (const p of f.b) p.vx *= .7;
    if (k.t < .4) { if (rnd() < .6) particles.push({ x: f.rh.x + rnd(-20, 20), y: f.rh.y + rnd(-20, 20), vx: 0, vy: rnd(-80, -20), life: .3, max: .3, color: "#ffffff", size: rnd(2, 4), g: 0, glow: true }); }
    else if (!k.done) {
      k.done = true; const e = k.tg && k.tg.alive && hyp(k.tg.pelvis.x - f.pelvis.x, k.tg.pelvis.y - f.pelvis.y) < 620 ? k.tg : null;
      if (!e) ultWhiff(f, "#ffffff");
      if (e) {
        const side = Math.sign(f.pelvis.x - e.pelvis.x) || -1, dir = -side;
        moveBody(f, clamp(e.pelvis.x + side * 55 * e.sc, WALL_L + 30, WALL_R - 30) - f.pelvis.x, Math.min(0, e.pelvis.y - f.pelvis.y));
        f.facing = dir; f.aim = dir > 0 ? 0 : Math.PI; f.atkT = .2; f.atkSide = dir;
        hurt(e, 45, dir, -.35, 1700, f, { crit: true, stun: .9, fromX: f.neck.x, snd: "punch" });
        fx.push({ type: "forcewave", owner: f, x: e.neck.x, y: e.neck.y + 15, dir, t: 0, life: .5 });
      }
      floatText(f.head.x, f.head.y - 100, "SOCO SÉRIO", "#ffd84a", 44); shake = 30; flashScreen = .25; hitstop = Math.max(hitstop, .15); sfx.boom();
    }
  } else if (k.id === "meteorjump") {
    // Meteoro Humano: sai pelo alto da tela e cai em cima do inimigo.
    f.aim = Math.PI / 2;
    if (k.t > .5 && !k.dive) {
      k.dive = true; const x = clamp(k.x, WALL_L + 40, WALL_R - 40);
      moveBody(f, x - f.pelvis.x, -140 - f.pelvis.y);
      k.landY = surfaceBelow(x, k.ly - 10, false);
    }
    if (k.dive) {
      for (const p of [...f.b, ...f.wpts]) { p.vy = 2400; p.vx *= .5; }
      if (f.pelvis.y < k.landY - 150) f.dropT = .15; // atravessa as plataformas acima do alvo
      for (let i = 0; i < 3; i++) particles.push({ x: f.pelvis.x + rnd(-20, 20), y: f.pelvis.y - rnd(0, 60), vx: rnd(-60, 60), vy: -rnd(100, 300), life: .35, max: .35, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(5, 10), g: 0, glow: true });
      if (f.pelvis.y >= k.landY - 60 || f.pelvis.y > FLOOR - 60) {
        const gy = k.landY;
        shockwave(f, f.pelvis.x, gy, 430, 30);
        for (let i = -3; i <= 3; i++) if (i) fx.push({ type: "spikes", owner: f, x: f.pelvis.x + i * 110, y: surfaceBelow(f.pelvis.x + i * 110, gy - 40, false), t: .2 + Math.abs(i) * .05, life: 1, hit: false, dmg: 10 });
        flashScreen = .15; shake = 30; sfx.boom(); f.sk = null; return true;
      }
    }
  } else if (k.id === "megaquake") {
    // Terremoto Final: três pancadas no chão que pegam a tela toda.
    f.aim = Math.PI / 2;
    for (const at of [.1, .6, 1.1]) if (k.t >= at && k.n < [.1, .6, 1.1].indexOf(at) + 1) {
      k.n++; const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false);
      shockwave(f, f.pelvis.x, gy, 460, 13);
      for (let i = 0; i < 6; i++) { const x = rnd(WALL_L + 40, WALL_R - 40); fx.push({ type: "spikes", owner: f, x, y: surfaceBelow(x, 400, false), t: .2, life: .9, hit: false, dmg: 8 }); }
      shake = 28;
    }
  } else if (k.id === "cyclone") {
    // Ciclone de Aço: todo mundo no ar e a alabarda girando em volta.
    f.aim = k.t * 20;
    if ((k.tick -= dt) <= 0) {
      k.tick = .2; k.n++;
      fx.push({ type: "sweeparc", owner: f, t: 0, life: .3, color: "#9fe8d0", r: 230 * s, dir: k.n % 2 ? 1 : -1 });
      for (const e of areaHit(f, f.neck.x, f.neck.y - 40, 320 * s, 7, 0, { stun: .4 })) launch(e, (f.neck.x - e.neck.x) * 1.5, -520);
      sfx.whirl();
    }
  } else if (k.id === "harvest") {
    // Colheita Sombria: três ceifadas enormes que roubam vida.
    if (k.t >= k.next) {
      k.next += .45;
      fx.push({ type: "reap", owner: f, t: 0, life: .55, r: 330 * s, dir: k.n++ % 2 ? -1 : 1 });
      const hit = areaHit(f, f.neck.x, f.neck.y + 10, 330 * s, 11, 260, { stun: .5, snd: "magicHit" });
      for (const e of hit) for (let i = 0; i < 6; i++) particles.push({ x: e.neck.x, y: e.neck.y, vx: (f.neck.x - e.neck.x) / .5, vy: (f.neck.y - e.neck.y) / .5, life: .5, max: .5, color: pick(["#7dff9a", "#d8ffe0"]), size: rnd(3, 6), g: 0, glow: true });
      if (hit.length) heal(f, 6 * hit.length);
      sfx.reap();
    }
  } else if (k.id === "forcestorm") {
    // Tempestade da Força: raios das mãos em quem estiver na frente.
    for (const p of f.b) p.vx *= .7;
    if ((k.tick -= dt) <= 0) {
      k.tick = .1;
      for (const e of aimedFoes(f, 560, .55)) { fx.push({ type: "lightning", x1: f.rh.x, y1: f.rh.y, x2: e.neck.x + rnd(-10, 10), y2: e.neck.y + rnd(0, 40), t: 0, life: .12 }); hurt(e, 3.5, f.facing, -.2, 90, f, { stun: .35, quiet: true, fromX: f.neck.x, snd: "magicHit" }); }
      sfx.zap();
    }
  } else if (k.id === "rocketrain") {
    // Chuva de Foguetes: punhos-foguete saindo pro alto e caçando os inimigos.
    if ((k.tick -= dt) <= 0) { k.tick = .12; addProj("rocketfist", f.neck.x, f.neck.y - 10, ultAng(f) + rnd(-.22, .22), 1100, f, { dmg: 7, life: 1.4 }); sfx.dash(); }
  } else if (k.id === "homerun") {
    // Home Run Supremo: prepara o taco e manda todo mundo perto pra fora do estádio.
    for (const p of f.b) p.vx *= .6;
    f.aim = k.t < .4 ? (f.facing > 0 ? Math.PI + .6 : -.6) : (f.facing > 0 ? -.3 : Math.PI + .3);
    if (k.t >= .4 && !k.done) {
      k.done = true; f.atkT = .2;
      for (const e of foesOf(f, 300)) if ((e.neck.x - f.neck.x) * f.facing > -40) { hurt(e, 25, f.facing, -1, 0, f, { crit: true, stun: .8, fromX: f.neck.x, snd: "blunt" }); launch(e, f.facing * 1700, -1000); e.homerunT = 1.2; }
      floatText(f.head.x, f.head.y - 100, "HOME RUN!!!", "#ffd84a", 48); shake = 24; flashScreen = .12; sfx.homerun?.(); sfx.boom();
    }
  } else if (k.id === "terrastorm") {
    // Tempestade Terra: sobe no ar, a Lâmina da Terra gigante corta 4 vezes soltando meias-luas enormes e no fim crava no chão.
    const base = k.ang ?? (k.ang = ultAng(f));
    f.facing = Math.cos(base) >= 0 ? 1 : -1; f.aim = base;
    if (k.t < 1.75) for (const p of [...f.b, ...f.wpts]) { p.vy = (k.hy - f.pelvis.y) * 5; p.vx *= .85; }
    if (k.t < .45 && rnd() < .9) { const an = rnd(7), r = rnd(120, 220); particles.push({ x: f.neck.x + Math.cos(an) * r, y: f.head.y - 120 + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.2, vy: -Math.sin(an) * r * 2.2, life: .4, max: .4, color: pick(["#7dff6a", "#ffe95a", "#c8ffb0"]), size: rnd(2, 4.5), g: 0, glow: true }); }
    if (k.n < TERRA_SLASHES.length && k.t >= TERRA_SLASHES[k.n]) {
      k.n++;
      terraBeam(f, base + (k.n % 2 ? .07 : -.07), { big: 2.6, rMul: 2.4, dmg: 13, life: 1.1 });
      shake = Math.max(shake, 10); sfx.blade(true); sfx.whoosh();
    }
    if (!k.slam && k.t >= 1.75) {
      k.slam = true; f.atkT = .2;
      const gx = clamp(f.pelvis.x + f.facing * 90, WALL_L + 60, WALL_R - 60), gy = surfaceBelow(gx, f.pelvis.y, false);
      fx.push({ type: "terraslam", x: gx, y: gy, t: 0, life: 1.1 });
      fx.push({ type: "nova2", x: gx, y: gy - 20, t: 0, life: .6, r: 300, color: "#7dff6a" });
      for (const c of foesOf(f)) if (hyp(c.pelvis.x - gx, c.pelvis.y - gy) < 300) hurt(c, 16, c.neck.x - gx || 1, -1.2, 950, f, { crit: true, stun: .7, fromX: gx, snd: "blade" });
      for (let i = 0; i < 10; i++) addProj("terrabeam", gx, gy - 30, -Math.PI + (i + .5) * Math.PI / 10, 1000, f, { big: 1.3, rMul: 1.3, dmg: 7 });
      explodeBlocks(gx, gy, 300, 20);
      for (let i = 0; i < 40; i++) particles.push({ x: gx + rnd(-40, 40), y: gy - rnd(0, 20), vx: rnd(-500, 500), vy: rnd(-700, -150), life: .9, max: .9, color: pick(["#7dff6a", "#ffe95a", "#5a3a20", "#c8ffb0"]), size: rnd(3, 7), g: 1200, glow: rnd() < .6 });
      shake = 26; flashScreen = .15; sfx.boom(); sfx.blade(true);
    }
  } else if (k.id === "concert") {
    // Concerto da Miku: chuva de notas musicais na tela toda.
    if ((k.tick -= dt) <= 0) { k.tick = .08; const x = clamp(rnd() < .65 ? f.pelvis.x + f.facing * rnd(60, 650) : rnd(WALL_L + 40, WALL_R - 40), WALL_L + 40, WALL_R - 40); addProj("note", x, -20, Math.PI / 2, 650, f, { base: Math.PI / 2, wave: rnd(6), dmg: 9 }); }
    if (Math.floor(k.t * 4) !== Math.floor((k.t - dt) * 4)) sfx.notes?.();
  } else if (k.id === "megaall") {
    // Arsenal Total (Mega Buster): quase todos os poderes de uma vez, várias vezes seguidas.
    for (const p of f.b) p.vx *= .6;
    const e = nearestFoe(f, 1600), base = e ? Math.atan2(e.neck.y + 10 - f.neck.y, e.neck.x - f.neck.x) : (f.facing > 0 ? 0 : Math.PI);
    f.aim = base; f.facing = Math.cos(base) >= 0 ? 1 : -1;
    f.mmPow = Math.floor(k.t * 14) % 8 + 1; // o canhão pisca as cores de todos os poderes
    if ((k.tick -= dt) <= 0 && k.t < k.dur - .25) {
      k.tick = .38; k.n++;
      const tip = f.wtip || f.rh, en = f.mmEn.slice(), start = projectiles.length;
      const list = k.n === 1 ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];
      list.forEach((pw, j) => { f.mmPow = pw; f.mmEn[pw] = MM_MAX; f.aim = base + (j - (list.length - 1) / 2) * .07; mmFire(f, tip.x, tip.y); });
      for (let i = start; i < projectiles.length; i++) { const pr = projectiles[i], d = PROJ[pr.kind]; if (d.explode) pr.dmg = d.explode * .45; else if (pr.dmg) pr.dmg *= .45; }
      addProj("buster", tip.x, tip.y, base, 1500, f, { charge: 2, rMul: CHARGE_SIZE[2], dmg: PROJ.buster.dmg * 1.5, pierce: true });
      f.mmEn = en; f.cdOverride = 0; f.aim = base;
      ring(tip.x, tip.y, "#5affd8", 60); shake = Math.max(shake, 10); sfx.chargeShot(2);
    }
    if (k.t > k.dur) { f.mmPow = 0; f.mmEn.fill(MM_MAX); }
  } else return false;
  if (f.sk && k.t > k.dur) f.sk = null;
  return true;
}
// Efeitos com tempo das ults.
function ultFxStep(e, dt) {
  legendFxStep(e, dt);
  if (e.type === "giantsword" && e.t >= .55 && !e.hit) {
    // Espada (ou punho de pedra) gigante caindo do céu.
    e.hit = true; const o = e.owner;
    shockwave(o, e.x, e.y, 280, e.style === "fist" ? 22 : 18);
    areaHit(o, e.x, e.y - 80, 130, e.style === "fist" ? 24 : 32, 900, { up: -1.5, crit: true, stun: .8, snd: "blunt" });
    flashScreen = .12; shake = Math.max(shake, 26); sfx.boom(); dust(e.x, e.y, 30, e.style === "fist" ? "#8a7a6a" : "#d8c8a8");
  } else if (e.type === "toyhammer" && e.t >= .45 && !e.hit) {
    e.hit = true; const o = e.owner;
    for (const c of foesOf(o, 380)) if ((c.neck.x - o.neck.x) * e.dir > -30) { hurt(c, 6, e.dir, -1, 0, o, { stun: .6, fromX: o.neck.x, snd: "squeak" }); launch(c, e.dir * 900, -1600); }
    floatText(o.head.x + e.dir * 120, o.head.y - 80, "BOING!", "#ffd84a", 54); shake = 20; sfx.squeak?.(); sfx.boom();
  } else if (e.type === "stormcloud") {
    if (!e.target) {
      // Nuvem parada: chove e solta raio em quem estiver embaixo.
      if (rnd() < .9) particles.push({ x: e.x + rnd(-80, 80), y: e.y + 20, vx: -40, vy: 700, life: .35, max: .35, color: "#9fd8ff", size: 2, g: 0, line: true });
      if ((e.tick -= dt) <= 0) {
        e.tick = .5;
        const c = fighters.find(c => isEnemy(e.owner, c) && Math.abs(c.pelvis.x - e.x) < 100 && c.neck.y > e.y && c.pelvis.y < e.gy + 20);
        fx.push({ type: "lightning", x1: e.x + rnd(-30, 30), y1: e.y + 20, x2: c ? c.neck.x : e.x + rnd(-20, 20), y2: c ? c.neck.y : e.gy, t: 0, life: .25 });
        if (c) hurt(c, 7, rnd(-1, 1), -.3, 150, e.owner, { stun: .4, fromX: c.neck.x, snd: "magicHit" }); sfx.thunder();
      }
      return;
    }
    const c = e.target; if (!c.alive) { e.t = e.life; return; }
    e.x = c.neck.x; e.y = Math.max(60, c.head.y - 220);
    if (rnd() < .9) particles.push({ x: e.x + rnd(-80, 80), y: e.y + 20, vx: -40, vy: 700, life: .35, max: .35, color: "#9fd8ff", size: 2, g: 0, line: true });
    if ((e.tick -= dt) <= 0) { e.tick = .5; fx.push({ type: "lightning", x1: e.x + rnd(-30, 30), y1: e.y + 20, x2: c.neck.x, y2: c.neck.y, t: 0, life: .25 }); hurt(c, 7, rnd(-1, 1), -.3, 150, e.owner, { stun: .4, fromX: c.neck.x, snd: "magicHit" }); sfx.thunder(); }
  }
}

// ───────────────────────── Blocos de grama como parede ─────────────────────────
// Blocos do Kit de Construção são sólidos: seguram jogadores e tiros e precisam ser quebrados.
const BLOCK_HP = 40;
let blockSeq = 0;
function blockAt(x, y, r = 0) {
  for (const b of PLATFORMS) if (b.block && x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + 50 + r) return b;
  return null;
}
function damageBlock(b, dmg) {
  if (!b || b.hp <= 0) return;
  b.hp -= dmg; b.hitT = .15;
  dust(b.x + 25, b.y + 25, 5, "#7a5230"); sfx.thud();
  if (b.hp <= 0) breakBlock(b);
}
function breakBlock(b) {
  const i = PLATFORMS.indexOf(b); if (i >= 0) PLATFORMS.splice(i, 1);
  for (let k = 0; k < 16; k++) particles.push({ x: b.x + rnd(5, 45), y: b.y + rnd(5, 45), vx: rnd(-220, 220), vy: rnd(-380, -80), life: .8, max: .8, color: pick(["#5aa83a", "#7a5230", "#9a6a40", "#3f8a2a"]), size: rnd(5, 9), g: 1200, star: true });
  sfx.glass(); shake = Math.max(shake, 4);
}
// Ponto do corpo/arma entrando no bloco: empurra pro lado mais perto (por cima vira chão).
function collideBlocks(p) {
  for (const b of PLATFORMS) {
    if (!b.block) continue;
    const x0 = b.x - p.r, x1 = b.x + b.w + p.r, y0 = b.y - p.r, y1 = b.y + 50 + p.r;
    if (p.x <= x0 || p.x >= x1 || p.y <= y0 || p.y >= y1) continue;
    const dl = p.x - x0, dr = x1 - p.x, dtp = p.y - y0, db = y1 - p.y, m = Math.min(dl, dr, dtp, db);
    if (m === dtp) { p.y = y0; p.ground = true; } else if (m === db) p.y = y1; else if (m === dl) p.x = x0; else p.x = x1;
  }
}
// Golpe corpo a corpo acertando um bloco.
function meleeBlocks(A, segs) {
  for (const b of PLATFORMS) {
    if (!b.block || A.swingHits.has(b)) continue;
    for (const sg of segs) {
      const hitB = [[sg.x2, sg.y2], [(sg.x1 + sg.x2) / 2, (sg.y1 + sg.y2) / 2]].some(([x, y]) => x > b.x - sg.r && x < b.x + b.w + sg.r && y > b.y - sg.r && y < b.y + 50 + sg.r);
      if (hitB) { A.swingHits.add(b); damageBlock(b, (A.w.dmg || 6) * 1.3); spark(sg.x2, sg.y2, "#e8d8a8", 6); break; }
    }
  }
}
function explodeBlocks(x, y, radius, dmg) {
  for (const b of PLATFORMS.filter(b => b.block)) if (hyp(b.x + 25 - x, b.y + 25 - y) < radius + 25) damageBlock(b, dmg * 1.5);
}

// ───────────────────────── Armas novas: heróis e jogos ─────────────────────────
// Laço da Verdade: laça, puxa, bate no chão e quem foi pego fica um tempo sem conseguir atacar.
function truthLasso(o, e, t = 1.6) {
  if (!o || !e.alive) return;
  fx.push({ type: "lasso", owner: o, target: e, t: 0, life: .6, gold: true });
  hurt(e, 6, o.neck.x - e.neck.x, -1, 0, o, { stun: .5, fromX: o.neck.x, snd: "blunt" });
  e.truthT = Math.max(e.truthT || 0, Math.min(t + .6, 1.3));
  floatText(e.head.x, e.head.y - 60, "Fale a verdade!", "#ffd84a", 24); sfx.whip?.();
}
// Lâmina da Terra: cada golpe solta uma lâmina verde voando.
const TERRA_SLASHES = [.5, .78, 1.06, 1.34];
function terraBeam(f, ang, extra = {}) {
  addProj("terrabeam", f.rh.x + Math.cos(ang) * 30, f.rh.y + Math.sin(ang) * 30, ang, 1150, f, extra);
}

// ── Estados especiais
function poof(f, col) { for (let i = 0; i < 22; i++) particles.push({ x: f.pelvis.x + rnd(-30, 30), y: f.pelvis.y - rnd(0, 70) * f.sc, vx: rnd(-90, 90), vy: rnd(-90, 20), life: .7, max: .7, color: pick([col, "#ffffff", "#dddddd"]), size: rnd(8, 16), g: -30, puff: true }); }
function slowDown(f, t) {
  if (!(f.slowT > 0)) floatText(f.head.x, f.head.y - 60 * f.sc, "Lento!", "#7ab8ff", 22);
  f.slowT = Math.max(f.slowT, t * (f.boss ? .5 : 1));
  for (let i = 0; i < 8; i++) particles.push({ x: f.pelvis.x + rnd(-20, 20), y: f.pelvis.y + rnd(-40, 30), vx: rnd(-30, 30), vy: rnd(-40, 10), life: .5, max: .5, color: pick(["#7ab8ff", "#bfe8ff"]), size: rnd(2, 4), g: 0, glow: true });
}
function startTrap(f, kind, t, by) {
  if (!f.alive) return;
  if (f.boss) t *= .35;
  f.trapT = t; f.trapKind = kind; f.charge = 0;
  sfx.bubble(); floatText(f.head.x, f.head.y - 60, "Preso na bolha!", "#8fe3ff", 22);
}
function endTrap(f) {
  const k = f.trapKind; f.trapKind = null; f.trapT = 0;
  if (!f.alive) return;
  if (k === "bubble") { for (let i = 0; i < 16; i++) { const a = rnd(Math.PI * 2); particles.push({ x: f.neck.x + Math.cos(a) * 45, y: f.neck.y + 10 + Math.sin(a) * 55, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: .35, max: .35, color: "#dff4ff", size: rnd(2, 4), g: 300 }); } sfx.glass(); }
}
function charmFoe(f, by, t) {
  if (!f.alive) return;
  f.charmT = Math.max(f.charmT, t * (f.boss ? .3 : 1)); f.charmBy = by;
  floatText(f.head.x, f.head.y - 60, "Apaixonado!", "#ff6aa8", 24); sfx.heart();
}
function makeSheep(f, t) {
  if (!f.alive) return;
  if (f.boss) { floatText(f.head.x, f.head.y - 80, "Imune!", "#ffffff", 26); return; }
  f.sheepT = Math.min(t, 1.8); f.sheepWas = true; f.charge = 0; poof(f, "#ffffff"); sfx.baa(); floatText(f.head.x, f.head.y - 60, "Méééé!", "#ffffff", 28);
}
function webbed(f, by) {
  f.rooted = Math.max(f.rooted, .8 * (f.boss ? .4 : 1)); f.webT = 1.0; slowDown(f, 1.5);
  if (by && hyp(by.neck.x - f.neck.x, by.neck.y - f.neck.y) > 160) { const dx = Math.sign(by.neck.x - f.neck.x); for (const q of f.b) { q.vx += dx * 300 / Math.max(1, f.sc); q.vy -= 120; } f.extT = .5; }
  floatText(f.head.x, f.head.y - 60, "Preso na teia!", "#ffffff", 22);
}
// Teia grudou numa superfície: puxa quem atirou até lá.
function webZip(f, x, y) {
  if (!f || !f.alive) return;
  f.zipT = .55; f.zipX = x; f.zipY = y;
  fx.push({ type: "webline", owner: f, x, y, t: 0, life: .6 });
  sfx.web(); for (let i = 0; i < 6; i++) particles.push({ x, y, vx: rnd(-80, 80), vy: rnd(-80, 80), life: .3, max: .3, color: "#ffffff", size: 2, g: 0, line: true });
}
// Efeitos que os projéteis aplicam em quem acertam.
function projEffects(pr, d, hit) {
  if (pr.freeze || d.freeze) applyFreeze(hit, pr.freeze || d.freeze, { cap: pr.charge === 2 ? 1.3 : FREEZE_CAP });
  if (pr.confuse || d.confuse) confuse(hit, pr.confuse || d.confuse);
  if (pr.slow || d.slow) slowDown(hit, pr.slow || d.slow);
  if (pr.repel && pr.owner) {
    const dx = Math.sign(hit.neck.x - pr.owner.neck.x) || 1;
    for (const q of [...hit.b, ...hit.wpts]) { q.vx += dx * 900 / Math.max(1, hit.sc); q.vy -= 420 / Math.max(1, hit.sc); }
    hit.extT = 1; hit.stun = Math.max(hit.stun, .3); ring(hit.neck.x, hit.neck.y, "#ffa040", 60); floatText(hit.head.x, hit.head.y - 60, "Repelido!", "#ffa040", 24);
  }
  if (d.web) webbed(hit, pr.owner);
  if (d.lift) { const dx = Math.sign(pr.vx) || 1, k = 1 / Math.max(1, hit.sc); for (const q of [...hit.b, ...hit.wpts]) { q.vy = -780 * k; q.vx += dx * 180 * k; } hit.extT = 1; hit.stun = Math.max(hit.stun, .5); }
  if (d.fling && pr.owner) {
    // Vara de pescar: puxa pra cima e arremessa por cima de quem pescou.
    const o = pr.owner, dx = o.neck.x - hit.neck.x, k = 1 / Math.max(1, hit.sc);
    for (const q of [...hit.b, ...hit.wpts]) { q.vx = (dx * 2.4 + Math.sign(dx) * 200) * k; q.vy = -1000 * k; }
    hit.extT = 1.2; hit.stun = Math.max(hit.stun, .6); floatText(hit.head.x, hit.head.y - 60, "Fisgado!", "#5ac8ff", 26);
  }
  if (d.trap) startTrap(hit, d.trap, d.trapT, pr.owner);
  if (d.sheep) makeSheep(hit, d.sheep);
  if (d.charm) charmFoe(hit, pr.owner, d.charm);
}
// Gelo: cristais quando congela; estilhaços quando quebra.
function iceBurst(f, shatter) {
  const n = shatter ? 22 : 12;
  for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), sp = rnd(80, shatter ? 420 : 200); particles.push({ x: f.neck.x + rnd(-20, 20), y: lerp(f.head.y, f.pelvis.y + 40, rnd()), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (shatter ? 150 : 0), life: shatter ? .7 : .45, max: .7, color: pick(["#bff0ff", "#ffffff", "#8fe3ff", "#5ab8e8"]), size: rnd(3, shatter ? 8 : 5), g: shatter ? 900 : 0, star: true }); }
  if (shatter) { sfx.glass(); ring(f.neck.x, f.neck.y + 20, "#bff0ff", 70); } else sfx.ice();
}
// Lança-chamas: jato contínuo de fogo enquanto dura.
function flameStep(f, dt) {
  f.flameT -= dt; f.flameTick -= dt;
  if (f.flameTick > 0 || !f.wtip) return;
  f.flameTick = .035;
  const a = f.aim, x = f.wtip.x + Math.cos(a) * 10, y = f.wtip.y + Math.sin(a) * 10;
  addProj("flame", x, y, a + rnd(-.12, .12), rnd(650, 820), f);
}
// Manopla do Infinito: cada disparo usa a próxima joia; carga máxima = estalo.
function infinityStone(f, ox, oy, a, L) {
  if (L === 2) return infinitySnap(f);
  const i = f.stone = ((f.stone ?? -1) + 1) % 6, [id, col, name] = STONES[i];
  floatText(f.head.x, f.head.y - 60, name, col, 22); ring(ox, oy, col, 50);
  for (let k = 0; k < 10; k++) particles.push({ x: ox, y: oy, vx: rnd(-160, 160), vy: rnd(-160, 160), life: .4, max: .4, color: col, size: rnd(2, 4), g: 0, glow: true });
  const foes = fighters.filter(e => isEnemy(f, e));
  switch (id) {
    case "poder": addProj("powerorb", ox, oy, a, 900, f); sfx.dark(); break;
    case "espaco": {
      const p = aimPoint(f, 520), tx = clamp(p.x, WALL_L + 40, WALL_R - 40), ty = (p.ground ? p.y - 60 : p.y);
      stars(f.pelvis.x, f.pelvis.y - 30, col, 20);
      const dx = tx - f.pelvis.x, dy = ty - f.pelvis.y;
      for (const q of [...f.b, ...f.wpts]) { q.x += dx; q.y += dy; q.ox += dx; q.oy += dy; q.vx = 0; q.vy = 0; }
      stars(f.pelvis.x, f.pelvis.y - 30, col, 20); ring(f.neck.x, f.neck.y, col, 80); sfx.tele(); break;
    }
    case "realidade": castBeam(f, ox, oy, a, 8, "reality"); break;
    case "alma": {
      let t = null, bd = 650; for (const e of foes) { const d = hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y); if (d < bd) { bd = d; t = e; } }
      if (t) fx.push({ type: "tether", owner: f, target: t, t: 0, life: 1.1, tick: 0, n: 0 }); sfx.dark(); break;
    }
    case "tempo": heal(f, 8); for (const e of foes) if (hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 650) slowDown(e, 2.5); sfx.timestop(); break;
    case "mente": for (const e of foes) if (hyp(e.neck.x - f.neck.x, e.neck.y - f.neck.y) < 560) confuse(e, 2.2); sfx.notes(); break;
  }
}
function infinitySnap(f) {
  floatText(f.head.x, f.head.y - 100, "*estalo*", "#ffd84a", 44); flashScreen = .3; slowmo = Math.max(slowmo, 1.1); shake = Math.max(shake, 20); sfx.snap();
  for (const e of fighters) {
    if (!isEnemy(f, e)) continue;
    const loss = e.boss ? e.maxHp * .06 : Math.max(1, e.hp * (f.snapUlt ? .35 : .2));
    hurt(e, loss / DAMAGE_SCALE / (f.dmgMul || 1), 0, -.3, 80, f, { stun: .6, snd: "magicHit" });
    // O corpo vira poeira levada pelo vento.
    for (let i = 0; i < 40; i++) { const pt = pick(e.b); particles.push({ x: pt.x + rnd(-6, 6), y: pt.y + rnd(-6, 6), vx: rnd(40, 160), vy: rnd(-90, -10), life: rnd(.8, 1.6), max: 1.6, color: pick(["#7a6a5a", "#5a4a3a", "#9a8a7a", e.color]), size: rnd(2, 4), g: -20 }); }
  }
  f.cdOverride = 16; f.snapUlt = false;
}

// Clarão na boca do cano.
function muzzle(f, x, y, color, big = 1) {
  ring(x, y, color, 14 * big);
  for (let i = 0; i < 6 * big; i++) { const a = f.aim + rnd(-.5, .5), sp = rnd(150, 500); particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .12, max: .12, color, size: rnd(2, 4), g: 0, glow: true }); }
}
// Feixe Laser: raio contínuo por 0,7s que acompanha a mira.
function sweepStep(f, dt) {
  f.sweepT -= dt; f.sweepTick -= dt;
  const a = f.aim, dx = Math.cos(a), dy = Math.sin(a), x = f.wtip.x, y = f.wtip.y;
  let len = 760;
  for (let d = 0; d < 760; d += 10) { const px = x + dx * d, py = y + dy * d; if (px < WALL_L || px > WALL_R || py > FLOOR || py < -50) { len = d; break; } }
  f.sweep = { x1: x, y1: y, x2: x + dx * len, y2: y + dy * len };
  if (rnd() < .6) particles.push({ x: f.sweep.x2, y: f.sweep.y2, vx: rnd(-200, 200), vy: rnd(-260, 0), life: .25, max: .25, color: pick(["#ff6a6a", "#ffd84a"]), size: rnd(2, 4), g: 600, glow: true });
  if (f.sweepTick <= 0) {
    f.sweepTick = .1;
    for (const e of fighters) if (isEnemy(f, e) && touches(e, x, y, f.sweep.x2, f.sweep.y2, 8)) hurt(e, 3, dx, dy, 60, f, { quiet: true, stun: .05, fromX: f.neck.x, snd: "magicHit" });
  }
  if (f.sweepT <= 0) f.sweep = null;
}
// Arremessar a arma (botão MAGIA sem magia): ela sai girando e depois fica no chão pra quem pegar.
function throwWeapon(f, empty) {
  if (!f.alive || f.wtype === "punhos" || f.boss || f.minion) return;
  const a = f.aim, sx = Math.cos(a) >= 0 ? 1 : -1, type = f.wtype;
  addProj("thrown", f.rh.x + Math.cos(a) * 20, f.rh.y + Math.sin(a) * 20, a - .12 * sx, empty ? 850 : 1150, f,
          { wt: type, dmg: empty ? 6 : Math.max(8, f.w.dmg * .9), spinDir: sx });
  setWeapon(f, "punhos"); sfx.throw();
  if (empty) floatText(f.head.x, f.head.y - 50, "Sem munição!", "#ffb35a", 22);
}
// Arma solta no chão (arremessada ou derrubada): cai com gravidade, sem paraquedas.
function dropPickup(type, x, y, vx = 0, vy = -250) {
  pickups.push({ kind: "weapon", type, x: clamp(x, WALL_L + 20, WALL_R - 20), y, vx, vy, free: true, life: 20, landed: false, bob: 0 });
}
// Raio do Cajado do Trovão: linha reta instantânea que atravessa todos no caminho.
function castBeam(f, x, y, a, dmg = 11, style = "beam", lvl = 0) {
  const dx = Math.cos(a), dy = Math.sin(a);
  let len = 950;
  for (let d = 0; d < 950; d += 10) { const px = x + dx * d, py = y + dy * d; if (px < WALL_L || px > WALL_R || py > FLOOR || py < -50) { len = d; break; } }
  const x2 = x + dx * len, y2 = y + dy * len;
  fx.push({ type: style, x1: x, y1: y, x2, y2, t: 0, life: style === "rail" || style === "ki" ? .45 + lvl * .15 : .28, lvl });
  if (style === "rail" || style === "ki" || style === "reality") { sfx.rail(); shake = Math.max(shake, 14); flashScreen = .12; } else { sfx.thunder(); flashScreen = .08; shake = Math.max(shake, 8); }
  for (const e of fighters) if (isEnemy(f, e) && touches(e, x, y, x2, y2, 10 + lvl * 10)) hurt(e, dmg, dx, dy - .3, 320, f, { stun: .4, fromX: f.neck.x, snd: "magicHit" });
}
// Livros: o feitiço nasce onde você mirou (não persegue ninguém sozinho).
function castSpell(f) {
  f.castT = f.w.dur;
  const c = WEAPONS[f.wtype].rune, p = aimPoint(f, 700);
  fx.push({ type: "circle", f, color: c, t: 0, life: .6 });
  switch (f.w.spell) {
    case "genie": fx.push({ type: "genie", owner: f, t: 0, life: 2.5, done: false, gx: f.neck.x, gy: f.head.y - 100 }); sfx.genie(); floatText(f.head.x, f.head.y - 160, "Seu desejo é uma ordem!", "#ffd84a", 22); break;
    case "timestop": {
      // Para o tempo: inimigos congelam no lugar (em tons de cinza).
      for (const e of fighters) if (isEnemy(f, e)) { const t = e.boss ? .5 : 1.0; e.frozen = Math.max(e.frozen, t); e.tstopT = time + t; e.stun = 0; }
      fx.push({ type: "timestop", owner: f, x: f.neck.x, y: f.neck.y, t: 0, life: 1.5 });
      floatText(f.head.x, f.head.y - 80, "O tempo parou!", "#e8b84a", 30); sfx.timestop(); break;
    }
    case "orbs":
      for (let i = 0; i < 3; i++) addProj("orb", f.neck.x, f.neck.y, 0, 0, f, { orbit: .5, oang: i * Math.PI * 2 / 3, spread: (i - 1) * .16, life: 4 });
      sfx.dark(); break;
    case "stars": {
      const gy = p.ground ? p.y : surfaceBelow(p.x, p.y, false);
      fx.push({ type: "rune", owner: f, x: p.x, y: Math.max(70, Math.min(p.y, gy) - 260), t: 0, life: .55, color: c });
      sfx.star(); break;
    }
    case "drain": {
      const tgt = enemyInCone(f, .3, 650);
      if (tgt) fx.push({ type: "tether", owner: f, target: tgt, t: 0, life: 1.05, tick: 0, n: 0 });
      else fx.push({ type: "fizzle", x1: f.rh.x, y1: f.rh.y, x2: f.rh.x + Math.cos(f.aim) * 300, y2: f.rh.y + Math.sin(f.aim) * 300, color: c, t: 0, life: .35 });
      sfx.drain(); break;
    }
    case "spikes": {
      const gy = p.ground ? p.y : surfaceBelow(p.x, p.y, false);
      fx.push({ type: "spikes", owner: f, x: p.x, y: gy, t: 0, life: 1.0, hit: false });
      sfx.rumble(); break;
    }
    case "holy": {
      const gy = p.ground ? p.y : surfaceBelow(p.x, p.y, false);
      fx.push({ type: "lightpillar", owner: f, x: clamp(p.x, WALL_L + 30, WALL_R - 30), y: gy, t: -.35, life: .7, dmg: 13 });
      sfx.star(); break;
    }
    case "vortex":
      fx.push({ type: "vortex", owner: f, x: p.x, y: p.ground ? p.y - 80 : p.y, t: 0, life: 1.6, tick: 0, color: c });
      sfx.dark(); break;
    case "summon": {
      // Até 2 esqueletos aliados vivos; nascem onde a mira encosta no chão e duram 14s.
      const mine = fighters.filter(m => m.ally && m.owner === f && m.alive);
      if (mine.length >= 2) poofSummon(mine[0]);
      if (!f.team) f.team = "t_" + f.id; // no "todos contra todos", o esqueleto ganha o time do dono
      const x = clamp(p.x, WALL_L + 60, WALL_R - 60), gy = p.ground ? p.y : surfaceBelow(x, p.y, false);
      const pl = { id: "sum" + Math.random().toString(36).slice(2, 7), name: `Esqueleto de ${f.pl.name}`, kind: "bot", color: "#e6dfcc", connected: true, team: f.team };
      const m = makeFighter(pl, x, pick(["espada", "machado", "lanca", "adaga"]), gy - 50, { team: f.team, hp: 14, color: "#e6dfcc", hat: "elmo", outfit: "esqueleto" });
      m.minion = true; m.ally = true; m.owner = f; m.life = 14; m.tint = f.color;
      fighters.push(m);
      ring(x, gy - 10, "#b06cff", 80); dust(x, gy, 18, "#8a7a6a");
      for (let k = 0; k < 24; k++) particles.push({ x: x + rnd(-30, 30), y: gy - rnd(0, 10), vx: rnd(-50, 50), vy: rnd(-320, -120), life: .8, max: .8, color: pick(["#b06cff", "#e6dfcc", f.color]), size: rnd(3, 6), g: 300, glow: true });
      sfx.dark(); sfx.rumble(); break;
    }
  }
  return true;
}
function updateProjectiles(dt) {
  for (const pr of projectiles) {
    const d = PROJ[pr.kind];
    if (pr.stuck) { pr.life -= dt; continue; }
    pr.px = pr.x; pr.py = pr.y;
    if (pr.orbit > 0) {
      // Orbes das sombras: giram em volta do dono e depois saem na direção da mira dele.
      pr.orbit -= dt; pr.oang += dt * 8;
      const o = pr.owner; pr.x = o.neck.x + Math.cos(pr.oang) * 55; pr.y = o.neck.y + 10 + Math.sin(pr.oang) * 55; pr.life -= dt;
      if (pr.orbit <= 0) { const a = o.aim + pr.spread; pr.vx = Math.cos(a) * 620; pr.vy = Math.sin(a) * 620; }
      continue;
    }
    if (pr.kind === "minecart") { cartStep(pr, dt); continue; }
    if (pr.kind === "xbomb" || pr.kind === "megabomb" || pr.kind === "tnt") {
      // Bomba clássica: rola até parar e explode quando o pavio acaba.
      pr.fuse -= dt; pr.vy += 900 * dt; pr.x = clamp(pr.x + pr.vx * dt, WALL_L + 10, WALL_R - 10); pr.y += pr.vy * dt;
      if (blockAt(pr.x, pr.y, d.r * .7) && pr.y > blockAt(pr.x, pr.y, d.r * .7).y + 8) { pr.x = pr.px; pr.vx *= -.35; } // bate no lado do bloco
      const gy = surfaceBelow(pr.x, pr.py - 1, false);
      const rr = pr.kind === "xbomb" ? 16 : d.r;
      if (pr.y >= gy - rr && pr.vy >= 0) { pr.y = gy - rr; pr.vy = 0; pr.vx *= .85; }
      if (pr.fuse <= 0) { if (pr.kind === "tnt") tntBoom(pr); else crossExplode(pr.x, pr.y, pr.owner, pr.btype || 0, pr.kind === "megabomb" ? 2.3 : 1); pr.life = 0; }
      continue;
    }
    if (pr.kind === "note") { pr.wt = (pr.wt || 0) + dt; const sp = 720, off = Math.cos(pr.wt * 11 + pr.wave) * 300; pr.vx = Math.cos(pr.base) * sp - Math.sin(pr.base) * off; pr.vy = Math.sin(pr.base) * sp + Math.cos(pr.base) * off; }
    const hm = pr.homing || d.homing;
    if (hm && pr.owner) {
      let tg = null, bd = pr.homeR || 420;
      for (const e of fighters) { if (!isEnemy(pr.owner, e) || e.cloakT > 0) continue; const dd = hyp(e.neck.x - pr.x, e.neck.y - pr.y); if (dd < bd) { bd = dd; tg = e; } }
      if (tg) {
        const sp = hyp(pr.vx, pr.vy), cur = Math.atan2(pr.vy, pr.vx);
        let da = Math.atan2(tg.neck.y - pr.y, tg.neck.x - pr.x) - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const na = cur + clamp(da, -hm * dt, hm * dt); pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
      }
    }
    if (RETURNERS.has(pr.kind)) {
      // Sai freando, volta pra mão do dono; acerta na ida e na volta.
      const o = pr.owner;
      if (!pr.back && pr.kind === "starshield") {
        pr.out = (pr.out || 0) + dt;
        if (pr.out > .6 || pr.x < WALL_L + 10 || pr.x > WALL_R - 10 || pr.y < 0 || pr.y > FLOOR) { pr.back = true; pr.hits.clear(); }
      } else if (!pr.back) {
        const dec = pr.kind === "yoyo" ? 6500 : 1900;
        pr.vx -= Math.cos(pr.dir) * dec * dt; pr.vy -= Math.sin(pr.dir) * dec * dt;
        if (pr.vx * Math.cos(pr.dir) + pr.vy * Math.sin(pr.dir) <= 0 || pr.x < WALL_L + 10 || pr.x > WALL_R - 10) { pr.back = true; pr.hits.clear(); }
      } else {
        const tx = o.rh.x - pr.x, ty = o.rh.y - pr.y, tl = hyp(tx, ty) || 1, sp = Math.min(1400, hyp(pr.vx, pr.vy) + 2400 * dt);
        pr.vx = tx / tl * sp; pr.vy = ty / tl * sp;
        if (tl < 34 || !o.alive) { pr.life = 0; if (!NO_AMMO_RET.has(pr.kind)) { o.ammo = 1; o.reload = o.w.reload; } if (o.alive) sfx.pick(); continue; }
      }
      pr.rot += 22 * dt;
    }
    if (pr.stuckTo) {
      // Granada grudada: segue quem ela pegou e explode depois de 1,1s.
      const t = pr.stuckTo; pr.x = t.neck.x + pr.ox2; pr.y = t.neck.y + pr.oy2; pr.fuse -= dt;
      if (pr.fuse <= 0 || !t.alive) { explode(pr.x, pr.y, pr.owner, 16, 115); pr.life = 0; }
      continue;
    }
    if (pr.fuse !== undefined && pr.landedAt) { pr.fuse -= dt; if (pr.fuse <= 0) { explode(pr.x, pr.y, pr.owner, 16, 115); pr.life = 0; } continue; }
    if (pr.kind === "bfg") bfgZap(pr, dt);
    if (pr.kind === "voidorb") voidPull(pr, dt);
    if (pr.kind === "rocket") { const sp = Math.min(1500, hyp(pr.vx, pr.vy) + 1800 * dt), a = Math.atan2(pr.vy, pr.vx); pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; }
    pr.vy += pr.g * dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
    if (pr.kind === "axe" || pr.kind === "thrown" || pr.kind === "shuriken") pr.rot += pr.spinDir * 16 * dt;
    if (pr.kind === "coin") pr.rot += 9 * dt;
    if (pr.kind === "flask" || pr.kind === "stone" || pr.kind === "boulder" || pr.kind === "seed" || pr.kind === "capture" || pr.kind === "gutsblock" || pr.kind === "rockfrag" || pr.kind === "hyperbomb" || pr.kind === "leaf") pr.rot += 10 * dt;
    const tr = TRAIL[pr.kind];
    if (tr && rnd() < .7) particles.push({ x: pr.x, y: pr.y, vx: rnd(-40, 40), vy: rnd(-50, 20), life: .35, max: .35, color: pick(tr), size: rnd(2.5, pr.kind === "fire" || pr.kind === "meteor" ? 10 : 5), g: pr.kind === "fire" ? -100 : 0, glow: pr.kind !== "boulder" });

    // Acerto: segmento percorrido neste passo contra as cápsulas do corpo.
    let hit = null;
    for (const f of fighters) {
      if (pr.owner ? !isEnemy(pr.owner, f) : !f.alive) continue;
      if (pr.hits.has(f.id)) continue;
      if (touches(f, pr.px, pr.py, pr.x, pr.y, d.r * (pr.rMul || 1))) { hit = f; break; }
    }
    if (hit && hit.shield > 0) { pr.vx *= -1; pr.vy *= -1; pr.owner = hit; spark(pr.x, pr.y, "#7aa8ff", 10); sfx.block(); continue; }
    if (hit && hit.reflectT > 0 && pr.kind !== "thrown") { pr.vx *= -1.15; pr.vy *= -1; pr.owner = hit; pr.hits = new Set(); spark(pr.x, pr.y, "#ffd84a", 14); ring(pr.x, pr.y, "#ffd84a", 30); sfx.clang(); continue; }
    if (hit && hit.w.deflect && hit.atkT > 0 && pr.kind !== "thrown") {
      // Sabre de Luz no meio do golpe rebate o tiro de volta.
      pr.vx *= -1.1; pr.vy *= -1; pr.owner = hit; pr.hits = new Set();
      spark(pr.x, pr.y, hit.w.glow, 16); ring(pr.x, pr.y, hit.w.glow, 30); sfx.clang(); floatText(hit.head.x, hit.head.y - 55, "Rebatido!", hit.w.glow, 22); continue;
    }
    if (pr.kind === "thrown" && (hit || pr.y >= surfaceBelow(pr.x, pr.py - 1, false) || pr.x < WALL_L || pr.x > WALL_R || pr.life <= 0 || blockAt(pr.x, pr.y, 8))) {
      if (hit) hurt(hit, pr.dmg, pr.vx, pr.vy - 100, PROJ.thrown.kb, pr.owner, { x: pr.x, y: pr.y, fromX: pr.x - Math.sign(pr.vx) * 60, snd: "blunt" });
      else sfx.thud();
      dropPickup(pr.wt, pr.x, Math.min(pr.y, surfaceBelow(pr.x, pr.py - 1, false) - 10), -pr.vx * .15, hit ? -300 : -150);
      pr.life = 0; continue;
    }
    if (pr.kind === "sticky" && (hit || pr.y >= surfaceBelow(pr.x, pr.py - 1, false))) {
      if (hit) { pr.stuckTo = hit; pr.ox2 = pr.x - hit.neck.x; pr.oy2 = pr.y - hit.neck.y; floatText(hit.head.x, hit.head.y - 50, "Grudou!", "#ff4ad8", 22); }
      else { pr.landedAt = true; pr.y = surfaceBelow(pr.x, pr.py - 1, false) - 6; }
      pr.fuse = 1.1; sfx.thud(); continue;
    }
    const blk = d.ghost ? null : blockAt(pr.x, pr.y, d.r * (pr.rMul || 1) * .6);
    if (blk) {
      damageBlock(blk, pr.dmg || d.explode || 5);
      if (RETURNERS.has(pr.kind) && !pr.back) { pr.back = true; pr.hits.clear(); continue; }
    }
    const wall = (mode === "corrida" && race ? pr.x < WALL_L || pr.x > WALL_R : pr.x < wallLeft(pr.y) || pr.x > wallRight(pr.y)) || (!!blk && !RETURNERS.has(pr.kind));
    const gy = d.ghost ? FLOOR : surfaceBelow(pr.x, pr.py - 1, false);
    const ground = pr.y >= gy && !RETURNERS.has(pr.kind) && pr.kind !== "tornado" && pr.kind !== "wave" && pr.kind !== "flamewave";
    if (pr.kind === "wave") { pr.y = FLOOR - 28; if (wall) pr.life = 0; }
    if ((d.pierce || pr.pierce) && hit && !d.explode) {
      pr.hits.add(hit.id);
      const ok = hurt(hit, pr.dmg, pr.vx, pr.vy - 200, d.kb * (pr.rMul || 1), pr.owner, { x: pr.x, y: pr.y, fromX: pr.x - Math.sign(pr.vx) * 60, snd: d.snd, crit: !!pr.charge, quiet: pr.kind === "flame" });
      if (ok) projEffects(pr, d, hit);
      if (ok && d.burn) { hit.burn = 2.2; hit.burnBy = pr.owner; hit.burnTick = .3; if (pr.kind !== "flame") flameBurst(pr.x, pr.y); }
      if (ok && pr.kind === "starshield" && !pr.back) {
        // Escudo: ricocheteia pro próximo inimigo (até 3 vezes) e depois volta.
        let nx = null, bd = 650;
        for (const e of fighters) { if (!isEnemy(pr.owner, e) || pr.hits.has(e.id)) continue; const dd = hyp(e.neck.x - pr.x, e.neck.y - pr.y); if (dd < bd) { bd = dd; nx = e; } }
        if (nx && (pr.bounces || 0) < 3) { pr.bounces = (pr.bounces || 0) + 1; const a2 = Math.atan2(nx.neck.y - pr.y, nx.neck.x - pr.x); pr.vx = Math.cos(a2) * 1250; pr.vy = Math.sin(a2) * 1250; pr.dir = a2; pr.out = 0; sfx.clang(); }
        else { pr.back = true; pr.hits.clear(); }
      }
      continue;
    }
    if (pr.kind === "gutsblock" && (hit || ground || wall)) {
      // Super Braço: o bloco se parte em 4 pedaços.
      if (hit) hurt(hit, pr.dmg, pr.vx, pr.vy - 200, d.kb, pr.owner, { x: pr.x, y: pr.y, fromX: pr.x - Math.sign(pr.vx) * 60, snd: "blunt" });
      const by = Math.min(pr.y, gy) - 12;
      for (let i = 0; i < 4; i++) addProj("rockfrag", pr.x, by, -Math.PI / 2 + (i - 1.5) * .6, 560, pr.owner, { hits: new Set(hit ? [hit.id] : []), rot: rnd(6) });
      dust(pr.x, by + 10, 22, "#b08a5a"); shake = Math.max(shake, 10); sfx.rumble(); pr.life = 0; continue;
    }
    if (pr.kind === "wreck" && (ground || wall) && !hit) { dust(pr.x, Math.min(pr.y, gy), 18, "#9a8a7a"); shake = Math.max(shake, 8); sfx.thud(); }
    if (pr.kind === "goldlasso" && hit) { truthLasso(pr.owner, hit); pr.life = 0; continue; }
    if (pr.kind === "capture" && (hit || ground || wall)) { spawnPika(pr.owner, clamp(pr.x, WALL_L + 30, WALL_R - 30), ground ? gy : pr.y); pr.life = 0; continue; }
    if (pr.kind === "block" && ground) { placeBlock(pr.x, gy); pr.life = 0; continue; }
    if (pr.kind === "web" && !hit && (ground || wall || pr.y < 10)) { webZip(pr.owner, clamp(pr.x, WALL_L + 5, WALL_R - 5), Math.max(pr.y, 10)); pr.life = 0; continue; }
    if (pr.kind === "portal" && !hit && (ground || wall || pr.y < 10)) { placePortal(pr, ground, wall, gy); pr.life = 0; continue; }
    if (pr.kind === "voidorb" && (hit || ground || wall || pr.life <= 0)) { if (hit) hurt(hit, pr.dmg, pr.vx, pr.vy, 0, pr.owner, { x: pr.x, y: pr.y, fromX: pr.x, snd: "magicHit" }); voidCollapse(pr); pr.life = 0; continue; }
    if (!hit && !ground && !wall && pr.life > 0) continue;
    if (RETURNERS.has(pr.kind) || pr.kind === "wave") continue;
    if (pr.kind === "rocket" && hit) { explode(pr.x, pr.y, pr.owner, PROJ.rocket.explode, PROJ.rocket.boomR); pr.life = 0; continue; }

    if (d.explode) { if (pr.kind === "firework") fireworkBurst(pr.x, Math.min(pr.y, gy), pr.hue); explode(pr.x, Math.min(pr.y, gy), pr.owner, pr.dmg || d.explode, pr.boomR || d.boomR, d.safe); pr.life = 0; continue; }
    if (hit) {
      const crit = (pr.kind === "arrow" || pr.kind === "bolt") && hyp(pr.x - hit.head.x, pr.y - hit.head.y) < 18 * hit.sc;
      const ok = hurt(hit, pr.dmg * (crit ? 1.5 : 1), pr.vx, pr.vy, d.kb * (pr.rMul || 1), pr.owner, { crit: crit || !!pr.charge, x: pr.x, y: pr.y, fromX: pr.x - Math.sign(pr.vx) * 60, snd: d.snd });
      if (ok) projEffects(pr, d, hit);
      if (ok && d.burn) { hit.burn = 2.2; hit.burnBy = pr.owner; hit.burnTick = .3; flameBurst(pr.x, pr.y); }
      if (ok && d.pull && pr.owner) {
        // Âncora: fisga e arrasta o herói até o capitão.
        const dx = Math.sign(pr.owner.neck.x - hit.neck.x) || 1;
        for (const q of [...hit.b, ...hit.wpts]) { q.vx = dx * 900; q.vy = -380; } hit.extT = 1;
        hit.stun = Math.max(hit.stun, .5); floatText(hit.head.x, hit.head.y - 55, pr.kind === "kunai" ? "VEM CÁ!" : "Fisgado!", pr.kind === "kunai" ? "#ffd84a" : "#9fe8d0", pr.kind === "kunai" ? 32 : 24);
      }
      if (d.cloud) makeCloud(pr.x, surfaceBelow(pr.x, pr.y - 30, false), pr.owner);
      if (d.vines) makeVines(pr.x, surfaceBelow(pr.x, pr.y - 60, false), pr.owner);
    } else if (wall && pr.kind === "stone" && pr.bounces !== 0) {
      pr.vx *= -.7; pr.x = clamp(pr.x, WALL_L + 1, WALL_R - 1); continue;
    } else if (ground && d.bounce && (pr.bounces ?? d.bounce) > 0) {
      pr.bounces = (pr.bounces ?? d.bounce) - 1; pr.y = gy - 1;
      if (pr.kind === "bouncefire") { pr.vy = -560; continue; }
      pr.vy = -Math.abs(pr.vy) * .55; pr.vx *= .8; pr.dmg = Math.round(pr.dmg * .7); sfx.thud(); continue;
    } else if (ground && d.stick) { pr.stuck = true; pr.y = Math.min(pr.y, gy); pr.life = Math.min(pr.life, 1.5); sfx.thud(); continue; }
    else if (ground && d.cloud) makeCloud(pr.x, gy, pr.owner);
    else if (ground && d.vines) makeVines(pr.x, gy, pr.owner);
    if (pr.kind === "flask") sfx.glass();
    if (tr) for (let i = 0; i < 12; i++) particles.push({ x: pr.x, y: pr.y, vx: rnd(-260, 260), vy: rnd(-300, 100), life: .45, max: .45, color: pick(tr), size: rnd(2.5, 5), g: 700, glow: true });
    if (pr.kind === "ice" || pr.kind === "icicle") sfx.ice();
    pr.life = 0;
  }
  // Chakram perdido (dono morreu ou acabou o tempo): devolve a munição.
  for (const pr of projectiles) if (RETURNERS.has(pr.kind) && !NO_AMMO_RET.has(pr.kind) && pr.life <= 0 && pr.owner) { pr.owner.ammo = 1; }
  projectiles = projectiles.filter(p => p.life > 0);
}
function explode(x, y, owner, dmg, radius = 130, safe = false) {
  explodeBlocks(x, y, radius, dmg);
  sfx.boom(); shake = 22; ring(x, y, "#ffb34a", radius + 10);
  for (let i = 0; i < 45; i++) { const a = rnd(Math.PI * 2), s = rnd(100, 520); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(.4, .8), max: .8, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a", "#555"]), size: rnd(5, 13), g: -150, glow: true }); }
  for (const f of fighters) {
    if (!f.alive || (owner && f !== owner && !isEnemy(owner, f)) || (safe && f === owner)) continue;
    const d = hyp(f.pelvis.x - x, f.pelvis.y - 30 - y);
    if (d < radius) hurt(f, dmg * (1 - d / (radius * 1.3)) * (f === owner ? .5 : 1), f.pelvis.x - x, f.pelvis.y - 30 - y - 40, 600, f === owner ? null : owner, { fromX: x, snd: "blunt", env: !owner });
  }
}
function makeCloud(x, y, owner) { fx.push({ type: "cloud", x, y, owner, t: 0, life: 2.6, tick: .2 }); }
// Cajado da Natureza: cipós brotam do chão e prendem quem estiver perto.
function makeVines(x, y, owner) {
  fx.push({ type: "vines", x, y, t: 0, life: 1.6, seed: rnd(100) });
  sfx.rumble(); dust(x, y, 10, "#6fd06a");
  for (const f of fighters) if (isEnemy(owner, f) && Math.abs(f.pelvis.x - x) < 80 && f.pelvis.y > y - 130 && f.pelvis.y < y + 10) {
    if (hurt(f, 5, 0, -.2, 40, owner, { stun: 0, fromX: x, snd: "magicHit" })) f.rooted = 1.0;
  }
}

function poofSummon(m) {
  m.alive = false; m.hp = 0;
  stars(m.neck.x, m.neck.y, "#b06cff", 20); dust(m.pelvis.x, m.pelvis.y + 40, 10, "#8a7a6a");
  for (const p of m.b) { p.vy -= 200; }
}
// Efeitos com duração (feitiços, onda de choque, nuvem de veneno...).
function updateFx(dt) {
  for (const e of fx) {
    e.t += dt;
    if (e.type === "drone") {
      const o = e.owner;
      if (!o.alive) { e.t = e.life; continue; }
      e.x = lerp(e.x, o.neck.x - o.facing * 50, Math.min(1, dt * 4)); e.y = lerp(e.y, o.neck.y - 100 + Math.sin(e.t * 3) * 10, Math.min(1, dt * 4));
      e.shootT -= dt;
      if (e.shootT <= 0) {
        let tgt = null, best = 650;
        for (const c of fighters) { if (!isEnemy(o, c)) continue; const d = hyp(c.neck.x - e.x, c.neck.y - e.y); if (d < best) { best = d; tgt = c; } }
        if (tgt) { e.shootT = .55; const a = Math.atan2(tgt.neck.y - e.y, tgt.neck.x - e.x) + rnd(-.08, .08); addProj("droneShot", e.x, e.y, a, 1800, o); sfx.laser(); }
        else e.shootT = .2;
      }
    }
    if (e.type === "stand") {
      const o = e.owner;
      if (!o.alive) { e.t = e.life; continue; }
      e.tick -= dt;
      if (e.t > .2 && e.t < e.life - .28 && e.tick <= 0) {
        e.tick = .05; e.n++;
        const fx0 = o.neck.x + e.dir * 120, fy0 = o.neck.y + 5;
        for (const v of standHits(e, 1.25, 40, .25, true)) {
          // Preso na rajada: fica suspenso na frente do espírito levando socos.
          const k = 1 / Math.max(1, v.sc * v.sc);
          for (const q of v.b) { q.vx = q.vx * .4 + (fx0 + e.dir * 30 - v.neck.x) * 4 * k; q.vy = q.vy * .4 + (fy0 - v.neck.y) * 4 * k - 60; }
          v.extT = .4; spark(v.neck.x + rnd(-15, 15), v.neck.y + rnd(-20, 30), pick(["#ffffff", "#c58bff", "#ffd84a"]), 4); shake = Math.max(shake, 3);
        }
        if (e.n % 3 === 0) floatText(o.neck.x + e.dir * rnd(60, 190), o.neck.y - rnd(30, 110), "ORA", pick(["#c58bff", "#ffffff", "#ffd84a"]), rnd(22, 36));
        if (e.n % 2) sfx.punch(false);
      }
      if (e.t >= e.life - .28 && !e.final) {
        e.final = true;
        const hit = standHits(e, 10, 1200, .5, false);
        floatText(o.neck.x + e.dir * 130, o.neck.y - 80, "ORAAA!", "#c58bff", 58);
        shake = Math.max(shake, 20); ring(o.neck.x + e.dir * 140, o.neck.y, "#c58bff", 110);
        if (hit.length) { slowmo = Math.max(slowmo, .45); hitstop = Math.max(hitstop, .12); flashScreen = .08; }
      }
    }
    if (e.type === "pika") pikaStep(e, dt);
    skillFxStep(e, dt);
    if (e.type === "healzone") {
      // Cajado da vida: cura quem é do seu lado (e você) dentro do círculo.
      e.tick -= dt;
      if (e.tick <= 0 && e.t < e.life) {
        e.tick = .5;
        for (const c of fighters) if (c.alive && (c === e.owner || (e.owner.team && c.team === e.owner.team)) && Math.abs(c.pelvis.x - e.x) < 140 && Math.abs(c.pelvis.y + 45 * c.sc - e.y) < 90) heal(c, 4, true);
      }
      if (rnd() < .5) particles.push({ x: e.x + rnd(-120, 120), y: e.y - 4, vx: 0, vy: rnd(-90, -40), life: .7, max: .7, color: "#7dff9a", text: "+", size: rnd(14, 22), g: 0 });
    }
    if (e.type === "genie") {
      const o = e.owner; e.gx = o.neck.x - o.facing * 10; e.gy = o.head.y - 100;
      if (e.t >= .95 && !e.done) { e.done = true; if (o.alive) grantWish(e); }
    }
    if (e.type === "mark" && e.noHit && e.t >= e.life) e.done = true;
    if (e.type === "mark" && e.t >= e.life && !e.done) {
      // Cajado Sombrio: o meteoro cai onde a marca avisou.
      e.done = true; const sx = e.x + rnd(-180, 180);
      addProj("meteor", sx, -40, Math.atan2(e.y + 20, e.x - sx), 980, e.owner);
    }
    if (e.type === "rune" && e.t >= e.life && !e.fired) {
      e.fired = true;
      for (let i = 0; i < 3; i++) addProj("star", e.x + (i - 1) * 30, e.y + 10, Math.PI / 2 + (i - 1) * .06, 700, e.owner);
    } else if (e.type === "tether") {
      const o = e.owner, t = e.target;
      if (!o.alive || !t.alive || hyp(o.neck.x - t.neck.x, o.neck.y - t.neck.y) > 760) { e.t = e.life; continue; }
      e.tick -= dt;
      if (e.tick <= 0 && e.n < 5) {
        e.tick = .2; e.n++;
        hurt(t, 2, t.neck.x - o.neck.x, -.2, 40, o, { quiet: true, stun: .05, fromX: o.neck.x, snd: "magicHit" });
        heal(o, e.n === 5 ? 2 : 1, true);
        for (let i = 0; i < 4; i++) particles.push({ x: lerp(t.neck.x, o.rh.x, rnd()), y: lerp(t.neck.y, o.rh.y, rnd()), vx: rnd(-30, 30), vy: rnd(-30, 30), life: .4, max: .4, color: "#7dff9a", size: 3, g: 0, glow: true });
      }
    } else if (e.type === "spikes" && e.t >= .35 && !e.hit) {
      e.hit = true; sfx.rumble(); shake = Math.max(shake, 10); dust(e.x, e.y, 18, e.style === "fire" ? "#ff8a3a" : e.style === "tentacle" ? "#3a6a5a" : "#b08a5a");
      if (e.style === "fire") flameBurst(e.x, e.y - 40); else if (e.style === "tentacle") sfx.bubble();
      for (const f of fighters) if ((e.owner ? isEnemy(e.owner, f) : f.alive) && Math.abs(f.pelvis.x - e.x) < 72 && f.pelvis.y > e.y - 150 * f.sc && f.pelvis.y < e.y + 10)
        if (hurt(f, e.dmg || 10, 0, -1, 760, e.owner, { stun: .35, fromX: e.x, snd: e.burn ? "fire" : "blunt", env: !e.owner }) && e.burn) { f.burn = 2.4; f.burnBy = e.owner; f.burnTick = .3; }
    } else if (e.type === "cloud") {
      e.tick -= dt;
      if (rnd() < .5) particles.push({ x: e.x + rnd(-80, 80), y: e.y - rnd(10, 60), vx: rnd(-15, 15), vy: rnd(-30, -5), life: .8, max: .8, color: pick(["#7dff9a", "#4bd36a", "#b0ff9a"]), size: rnd(6, 14), g: 0 });
      if (e.tick <= 0) {
        e.tick = .4;
        if (rnd() < .5) sfx.bubble();
        for (const f of fighters) if (isEnemy(e.owner, f) && Math.abs(f.pelvis.x - e.x) < 95 && f.pelvis.y > e.y - 130 && f.pelvis.y < e.y + 20)
          hurt(f, 3, 0, -.3, 20, e.owner, { quiet: true, stun: 0, dot: true });
      }
    } else if (e.type === "vortex") {
      // Livro do Caos: puxa os inimigos pro centro e explode no fim.
      const o = e.owner;
      for (const f of fighters) {
        if (!isEnemy(o, f)) continue;
        const dx = e.x - f.neck.x, dy = e.y - f.neck.y, d = hyp(dx, dy);
        const VR = e.big ? 340 : 240; if (d < VR && d > 10) { const k = (e.big ? 2100 : 1700) * (1 - d / VR) * dt / Math.max(1, f.sc * f.sc); for (const p of f.b) { p.vx += dx / d * k; p.vy += dy / d * k; } f.extT = .3; }
      }
      if (rnd() < .9) { const a = rnd(Math.PI * 2), r = rnd(120, 230); particles.push({ x: e.x + Math.cos(a) * r, y: e.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4 - Math.sin(a) * 160, vy: -Math.sin(a) * r * 2.4 + Math.cos(a) * 160, life: .4, max: .4, color: pick(["#ff4ad8", "#8a2aff", "#ffffff"]), size: rnd(2, 4), g: 0, glow: true }); }
      e.tick -= dt;
      if (e.tick <= 0 && e.t < e.life - .1) { e.tick = .3; for (const f of fighters) if (isEnemy(o, f) && hyp(e.x - f.neck.x, e.y - f.neck.y) < 150) hurt(f, 2, 0, 0, 0, o, { quiet: true, stun: 0, dot: true }); }
      if (e.t >= e.life && !e.boom) {
        e.boom = true; sfx.boom(); shake = 20; flashScreen = .08; ring(e.x, e.y, "#ff4ad8", 170); ring(e.x, e.y, "#ffffff", 110);
        for (let i = 0; i < 50; i++) { const a = rnd(Math.PI * 2), s = rnd(150, 600); particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .6, max: .6, color: pick(["#ff4ad8", "#8a2aff", "#ffffff", "#2a0a2a"]), size: rnd(3, 8), g: 0, glow: true }); }
        for (const f of fighters) { if (!isEnemy(o, f)) continue; const d = hyp(f.neck.x - e.x, f.neck.y - e.y); if (d < 140) hurt(f, 14 * (1 - d / 190), f.neck.x - e.x, f.neck.y - e.y - 60, 620, o, { fromX: e.x, snd: "magicHit" }); }
      }
    }
  }
  fx = fx.filter(e => e.t < e.life + (e.type === "rune" ? .2 : 0) && !(e.type === "mark" && e.done));
}

// ───────────────────────── Magias de coleta (botão MAGIA) ─────────────────────────
function useMagic(f) {
  if (!f.magic) return;
  const m = f.magic, a = f.aim, dx = Math.cos(a), dy = Math.sin(a);
  if (m === "fogo") { addProj("fire", f.rh.x + dx * 25, f.rh.y + dy * 25, a, 820, f); sfx.fire(); }
  else if (m === "gelo") { addProj("ice", f.rh.x + dx * 25, f.rh.y + dy * 25, a, 1000, f, { freeze: 1.0 }); sfx.ice(); }
  else if (m === "raio") {
    // Raio vai pra onde você mirou; só acerta se tiver alguém naquela direção.
    const tgt = enemyInCone(f, .22, 780), p = aimPoint(f, 600);
    const tx = tgt ? tgt.pelvis.x : p.x, ty = tgt ? tgt.neck.y : p.y;
    fx.push({ type: "lightning", x1: f.rh.x, y1: f.rh.y, x2: tx, y2: ty, t: 0, life: .3 });
    sfx.thunder(); flashScreen = .1;
    if (tgt) hurt(tgt, 12, tx - f.neck.x, ty - f.neck.y, 350, f, { stun: .6, fromX: f.neck.x, snd: "magicHit" });
  }
  else if (m === "cura") { heal(f, 45); sfx.heal(); }
  else if (m === "escudo") { f.shield = 4; sfx.shield(); }
  else if (m === "teleporte") {
    stars(f.pelvis.x, f.pelvis.y - 30, "#d17aff", 20);
    const tx = clamp(f.pelvis.x + dx * 280, WALL_L + 30, WALL_R - 30) - f.pelvis.x;
    const ty = clamp(f.pelvis.y + dy * 280, 60, FLOOR - 50) - f.pelvis.y;
    for (const p of [...f.b, ...f.wpts]) { p.x += tx; p.y += ty; p.ox += tx; p.oy += ty; p.vx *= .2; p.vy *= .2; }
    stars(f.pelvis.x, f.pelvis.y - 30, "#d17aff", 20); sfx.tele();
  }
  if (--f.uses <= 0) f.magic = null;
}
function heal(f, n, quiet) {
  if (!f.alive) return;
  const got = Math.min(n, f.maxHp - f.hp); f.hp += got;
  if (!quiet) stars(f.pelvis.x, f.pelvis.y - 30, "#5f5", 8 + got / 2);
  if (got > 0 && !quiet) floatText(f.head.x, f.head.y - 30, `+${got}`, "#5f5");
}

// ───────────────────────── Itens no mapa ─────────────────────────
const MAX_WEAPON_PICKUPS = 3, MAX_MAGIC_PICKUPS = 2;
function spawnPickup(kind, x) {
  kind = kind || (mode === "aleatorio" ? (rnd() < .75 ? "weapon" : "magic") : mode === "zumbi" && rnd() < .35 ? "weapon" : "magic");
  const type = kind === "magic" ? pick(mode === "bomba" ? ["teleporte", "escudo", "gelo"] : Object.keys(MAGIC)) : pick(SELECTABLE);
  pickups.push({ kind, type, x: x ?? rnd(-arenaExt + WALL_L + 80, WALL_R + arenaExt - 80), y: -30 - rnd(80), vy: 170, life: 1e9, landed: false, bob: rnd(6) }); // fica até alguém pegar
}
function updatePickups(dt) {
  pickupT -= dt;
  if (pickupT <= 0) {
    const nW = pickups.filter(p => p.kind === "weapon").length, nM = pickups.filter(p => p.kind === "magic").length;
    const roomW = nW < MAX_WEAPON_PICKUPS && (mode === "aleatorio" || mode === "zumbi"), roomM = nM < MAX_MAGIC_PICKUPS;
    if (roomW || roomM) {
      const want = mode === "aleatorio" ? (rnd() < .75 ? "weapon" : "magic") : mode === "zumbi" && rnd() < .35 ? "weapon" : "magic";
      spawnPickup(want === "weapon" ? (roomW ? "weapon" : "magic") : (roomM ? "magic" : "weapon"));
    }
    pickupT = mode === "aleatorio" ? rnd(2.5, 4.5) : rnd(6, 9);
  }
  for (const p of pickups) {
    p.life -= dt; p.bob += dt * 3;
    if (!p.landed) {
      if (p.free) { p.vy += 1400 * dt; p.x = clamp(p.x + (p.vx || 0) * dt, WALL_L + 20, WALL_R - 20); }
      p.y += p.vy * dt;
      const s = surfaceBelow(p.x, p.y - 30, false);
      if (p.y >= s - 24 && p.vy > 0) { p.y = s - 24; p.landed = true; dust(p.x, s, 6, "#ffffff66"); }
    }
    for (const f of fighters) {
      if (!f.alive || f.boss || f.minion) continue;
      if ([f.head, f.neck, f.pelvis, f.lf, f.rf, f.lh, f.rh].some(q => hyp(q.x - p.x, q.y - p.y) < (p.kind === "relic" ? 44 : 32))) {
        if (p.kind === "relic") {
          setWeapon(f, p.type); f.pl.relic = p.type;
          const fresh = unlockRelic(p.type);
          showToast(`${f.pl.name} pegou: ${WEAPONS[p.type].name}!${fresh ? " (desbloqueada no menu)" : ""}`, "#ffd84a");
          sfx.fanfare(); ring(p.x, p.y, "#ffd84a", 160); stars(p.x, p.y, "#ffd84a", 60); flashScreen = .12;
        }
        else if (p.kind === "weapon") {
          if (p.free && f.wtype !== "punhos" && mode !== "aleatorio") continue; // arma solta: só pega quem está de mãos vazias
          setWeapon(f, p.type); floatText(p.x, p.y - 30, WEAPONS[p.type].name, "#e8b84a");
        }
        else { f.magic = p.type; f.uses = MAGIC[p.type].uses; floatText(p.x, p.y - 30, MAGIC[p.type].name, MAGIC[p.type].color); }
        stars(p.x, p.y, "#ffe9a0", 14); ring(p.x, p.y, "#ffe9a0", 40); sfx.pick(); buzz(f.id, 40);
        p.life = 0; break;
      }
    }
  }
  pickups = pickups.filter(p => p.life > 0);
}

// ───────────────────────── Partículas ─────────────────────────
function spark(x, y, color, n) { for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), s = rnd(150, 520); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .3, max: .3, color, size: rnd(2, 4), g: 600, line: true }); } }
function stars(x, y, color, n) { for (let i = 0; i < n; i++) { const a = rnd(Math.PI * 2), s = rnd(80, 380); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 100, life: rnd(.4, .8), max: .8, color, size: rnd(3, 7), g: 700, star: true }); } }
function dust(x, y, n, color) { for (let i = 0; i < n; i++) particles.push({ x: x + rnd(-20, 20), y: y - rnd(2, 8), vx: rnd(-160, 160), vy: rnd(-90, -20), life: rnd(.4, .7), max: .7, color, size: rnd(4, 9), g: 80, puff: true }); }
function ring(x, y, color, r) { particles.push({ x, y, vx: 0, vy: 0, life: .25, max: .25, color, size: r, g: 0, ring: true }); }
function floatText(x, y, text, color, size = 26) { particles.push({ x, y, vx: rnd(-20, 20), vy: -120, life: 1, max: 1, color, text, size, g: 60 }); }
// Pulo duplo: anel de ar sob os pés, penas na cor do jogador e um "vuuush" subindo.
function doubleJumpFx(f) {
  const x = f.pelvis.x, y = Math.max(f.lf.y, f.rf.y) + 6;
  fx.push({ type: "airjump", x, y, color: f.color, t: 0, life: .4 });
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (.15 + .7 * i / 13), s = rnd(140, 300);
    particles.push({ x, y, vx: Math.cos(a) * s * (i % 2 ? 1 : -1), vy: Math.sin(a) * s * .5, life: rnd(.35, .6), max: .6, color: i % 3 ? f.color : "#ffffff", size: rnd(3, 6), g: 300, star: true });
  }
  for (let i = 0; i < 8; i++) particles.push({ x: x + rnd(-14, 14), y: y - rnd(0, 30), vx: rnd(-20, 20), vy: rnd(120, 260), life: .25, max: .25, color: "#ffffff", size: 2, g: 0, line: true });
  sfx.doubleJump();
}
// Partículas contínuas das armas especiais (chamas na lâmina, faíscas no martelo).
function weaponAura(f) {
  if (!f.alive || !f.wtip) return;
  const g = f.rh, t = f.wtip;
  if (f.w.burn && rnd() < .8) { const k = rnd(.25, 1); particles.push({ x: lerp(g.x, t.x, k) + rnd(-3, 3), y: lerp(g.y, t.y, k) + rnd(-3, 3), vx: rnd(-20, 20), vy: rnd(-110, -50), life: .35, max: .35, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(3, 6), g: -60, glow: true }); }
  if (f.w.chain && rnd() < .25) fx.push({ type: "arc", x: t.x, y: t.y, t: 0, life: .08 });
}
function updateParticles(dt) {
  for (const p of particles) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  if (particles.length > 1100) particles.splice(0, particles.length - 1100);
}

// ───────────────────────── Passo da simulação ─────────────────────────
let endTimer = 0;
function step(dt) {
  time += dt; phaseT += dt;
  if (phase === "looks") updateLooks(dt);
  if (phase === "select") updateSelect(dt);
  if (phase === "intro" && phaseT >= INTRO_TIME) beginFight();
  if (phase === "fight" || phase === "intro" || phase === "between" || phase === "over") {
    for (const f of fighters) {
      if (f.bot && f.alive && phase === "fight") { if (f.boss) bossThink(f, dt); else botThink(f, dt); }
      control(f, dt);
    }
    const pts = allPoints();
    const g = G * (arena.grav || 1);
    for (const p of pts) { p.vy += g * dt; p.vx *= .999; p.ox = p.x; p.oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let it = 0; it < 6; it++) for (const f of fighters) { for (const s of f.sticks) solve(s); for (const s of f.wsticks) solve(s); }
    for (const f of fighters) f._vx = f.pelvis.vx;
    for (const p of pts) collideWorld(p);
    for (const p of pts) { p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt; if (p.ground) p.vx *= .9; }
    for (const f of fighters) wallBounce(f);
    for (const f of fighters) { recordTrail(f, dt); weaponAura(f); if ((f.ally || f.clone) && f.alive && (f.life -= dt) <= 0) poofSummon(f); }
    if (phase === "fight") {
      for (const f of fighters) if (f.alive) { meleeCheck(f); clashCheck(f); }
      updateProjectiles(dt); updateFx(dt); updatePickups(dt); Events.update(dt);
      updateBlocks(dt); portalStep(dt);
      if (mode === "bomba") updateBomb(dt);
      if (mode === "zumbi") updateZombies(dt);
      if (mode === "corrida") updateRace(dt);
      endCheck(dt);
    } else { updateProjectiles(dt); updateFx(dt); }
    if (phase === "between" && phaseT > 2.6 && !trans) transition(startIntro);
  }
  if (toastMsg && (toastMsg.t += dt) > 3.6) toastMsg = null;
  updateParticles(dt);
  updateAmbient(arena, ambient, dt);
}
function endCheck(dt) {
  let over;
  let wait = 1.2;
  if (mode === "chefe") {
    const boss = fighters.find(f => f.boss);
    over = !boss || !boss.alive || !fighters.some(f => f.alive && f.team === "heroi" && !f.minion);
    // Chefão caiu: dá tempo (até 12s) pra alguém pegar a relíquia.
    wait = boss && !boss.alive && pickups.some(p => p.kind === "relic") && fighters.some(f => f.alive && f.team === "heroi" && !f.minion) ? 12 : 2;
  } else if (mode === "zumbi") { over = !fighters.some(f => f.alive && f.team === "heroi" && !f.minion); wait = 2.5; }
  else if (mode === "corrida") { over = !fighters.some(f => f.alive && !f.finished); wait = 1.8; }
  else over = fighters.filter(f => f.alive && !f.minion).length <= 1 && fighters.length > 1;
  if (over) { endTimer += dt; if (endTimer > wait) { endTimer = 0; endRound(); } }
  else endTimer = 0;
}
// Rastro da arma: guarda as últimas posições da lâmina enquanto ela se move rápido.
function recordTrail(f, dt) {
  for (const t of f.trail) t.life -= dt;
  f.trail = f.trail.filter(t => t.life > 0);
  if (!f.alive || RANGED.has(f.w.kind)) return;
  let a, b, v;
  if (f.w.kind === "punch" || f.w.kind === "claws") { const h = f.punchR ? f.rh : f.lh; a = b = h; v = hyp(h.vx, h.vy); }
  else if (f.ball) { a = b = f.ball; v = hyp(f.ball.vx, f.ball.vy); }
  else if (f.chain) { a = f.chain[f.chain.length - 3]; b = f.chain[f.chain.length - 1]; v = hyp(b.vx, b.vy); }
  else { const g = f.rh, t = f.wtip, bs = f.w.bs || 0; a = { x: g.x + (t.x - g.x) * bs, y: g.y + (t.y - g.y) * bs }; b = t; v = hyp(t.vx, t.vy); }
  if (f.atkT > 0 || v > 900) f.trail.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, life: .12, fire: !!f.w.burn, col: f.w.energy || f.w.gravity ? f.w.glow : f.w.freeze ? "#bff0ff" : f.w.trail || null });
}
