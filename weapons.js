// Catálogo de armas do Duelo Medieval: usado pela TV (física + desenho) e
// pelo celular (ícones do menu de seleção).
//
// kind: swing (golpe em arco) · thrust (estocada) · spin (giro, mangual)
//       slam (pancada no chão com onda de choque) · whip (chicote de corrente)
//       punch / claws (mãos) · shoot (projétil mirado) · cast (feitiço de livro,
//       mira sozinho no inimigo mais próximo)
// dmg: dano base do golpe físico. Projéteis e feitiços têm o dano em PROJ/SPELL
//      (game.js). Regra do jogo: corpo a corpo > distância > magia.
// bs: onde começa a parte que machuca (0 = cabo, 1 = ponta). hr: raio da parte que machuca.
// snd: som do acerto (blade, blunt, pierce, magic). s: [dano, velocidade, alcance] de 1 a 5.
// ext: [início, fim] do desenho no eixo da arma, pra enquadrar o ícone.
"use strict";
// Cantos arredondados em navegadores antigos.
if (typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { r = Math.min(+r || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
// Campos comuns das armas de disparo (o dano de verdade fica no projétil, em game.js).
const SH = { dmg: 3, dur: .15, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt" };
const WEAPONS = {
  punhos:       { name: "Punhos",            cat: "",          kind: "punch",  L: 0,   dmg: 7,  dur: .18, cd: .28, kb: 260, k: 0,   min: 250, hr: 7,  im: 1,   snd: "punch",  s: [1, 5, 1], desc: "Socos rápidos", ext: [-10, 20] },
  // ── Lâminas
  adaga:        { name: "Adaga",             cat: "Lâminas",   kind: "swing",  L: 34,  dmg: 9,  dur: .16, cd: .20, kb: 220, k: 900, min: 320, bs: .25, hr: 5,  im: 1.4, snd: "blade",  s: [2, 5, 1], desc: "Curta e muito rápida", ext: [-6, 40] },
  espada:       { name: "Espada",            cat: "Lâminas",   kind: "swing",  L: 64,  dmg: 14, dur: .26, cd: .36, kb: 380, k: 700, min: 380, bs: .2,  hr: 6,  im: 1.2, snd: "blade",  s: [3, 4, 3], desc: "Equilibrada", ext: [-8, 70] },
  espadaLonga:  { name: "Espada Longa",      cat: "Lâminas",   kind: "swing",  L: 92,  dmg: 20, dur: .38, cd: .58, kb: 560, k: 520, min: 360, bs: .15, hr: 7,  im: .9,  snd: "blade",  s: [4, 2, 4], desc: "Duas mãos, golpe pesado", two: true, ext: [-18, 98] },
  rapieira:     { name: "Rapieira",          cat: "Lâminas",   kind: "thrust", L: 78,  dmg: 12, dur: .20, cd: .28, kb: 300, k: 800, min: 260, bs: .15, hr: 4,  im: 1.3, snd: "pierce", s: [2, 5, 4], desc: "Estocadas velozes", ext: [-6, 84] },
  espadaEscudo: { name: "Espada e Escudo",   cat: "Lâminas",   kind: "swing",  L: 54,  dmg: 12, dur: .26, cd: .40, kb: 340, k: 700, min: 380, bs: .2,  hr: 6,  im: 1.2, snd: "blade",  s: [3, 3, 2], desc: "Bloqueia golpes e flechas de frente", shield: true, ext: [-8, 60] },
  espadaFlamejante: { name: "Espada Flamejante", cat: "Lâminas", kind: "swing", L: 66, dmg: 12, dur: .28, cd: .40, kb: 360, k: 680, min: 380, bs: .2, hr: 7, im: 1.15, snd: "blade", s: [3, 4, 3], desc: "Incendeia quem acerta", burn: true, ext: [-8, 74] },
  garras:       { name: "Garras",            cat: "Lâminas",   kind: "claws",  L: 0,   dmg: 8,  dur: .14, cd: .16, kb: 200, k: 0,   min: 260, hr: 9,  im: 1,   snd: "blade",  s: [2, 5, 1], desc: "Rajada de arranhões", hidden: true, ext: [-14, 30] },
  // ── Pesadas
  machado:      { name: "Machado",           cat: "Pesadas",   kind: "swing",  L: 60,  dmg: 18, dur: .34, cd: .50, kb: 480, k: 560, min: 380, bs: .6,  hr: 11, im: 1,   snd: "blade",  s: [4, 3, 3], desc: "Corte forte", ext: [-8, 66] },
  machadoDuplo: { name: "Machado Duplo",     cat: "Pesadas",   kind: "swing",  L: 72,  dmg: 25, dur: .48, cd: .80, kb: 700, k: 420, min: 340, bs: .6,  hr: 14, im: .7,  snd: "blade",  s: [5, 1, 3], desc: "Lâmina dos dois lados", two: true, ext: [-12, 78] },
  maca:         { name: "Maça",              cat: "Pesadas",   kind: "swing",  L: 58,  dmg: 16, dur: .30, cd: .45, kb: 520, k: 600, min: 360, bs: .75, hr: 13, im: .9,  snd: "blunt",  s: [3, 3, 2], desc: "Bola cravejada", ext: [-8, 72] },
  martelo:      { name: "Martelo de Guerra", cat: "Pesadas",   kind: "swing",  L: 78,  dmg: 26, dur: .50, cd: .80, kb: 850, k: 380, min: 340, bs: .8,  hr: 16, im: .6,  snd: "blunt",  s: [5, 1, 3], desc: "Arremessa longe", two: true, ext: [-10, 92] },
  clava:        { name: "Clava do Ogro",     cat: "Pesadas",   kind: "slam",   L: 82,  dmg: 22, dur: .50, cd: .90, kb: 620, k: 420, min: 340, bs: .45, hr: 14, im: .6,  snd: "blunt",  s: [5, 1, 3], desc: "Bate no chão: onda de choque", two: true, ext: [-10, 92] },
  marteloTrovao: { name: "Martelo do Trovão", cat: "Pesadas", kind: "swing", L: 74, dmg: 20, dur: .46, cd: .75, kb: 640, k: 400, min: 340, bs: .8, hr: 16, im: .65, snd: "blunt", s: [4, 1, 3], desc: "O raio pula pra outro inimigo", chain: true, two: true, ext: [-10, 90] },
  mangual:      { name: "Mangual",           cat: "Pesadas",   kind: "spin",   L: 26,  dmg: 19, dur: .45, cd: .60, kb: 620, k: 650, min: 450, hr: 12, im: 1,   snd: "blunt",  s: [4, 3, 4], desc: "Gire a corrente!", ext: [-8, 86] },
  // ── Longas
  lanca:        { name: "Lança",             cat: "Longas",    kind: "thrust", L: 112, dmg: 15, dur: .30, cd: .42, kb: 430, k: 650, min: 260, bs: .78, hr: 7,  im: 1.2, snd: "pierce", s: [3, 3, 5], desc: "Ataca de longe", two: true, ext: [-22, 128] },
  alabarda:     { name: "Alabarda",          cat: "Longas",    kind: "swing",  L: 120, dmg: 21, dur: .45, cd: .70, kb: 600, k: 420, min: 360, bs: .7,  hr: 12, im: .8,  snd: "blade",  s: [4, 2, 5], desc: "Machado na ponta da lança", two: true, ext: [-22, 132] },
  foice:        { name: "Foice",             cat: "Longas",    kind: "swing",  L: 108, dmg: 20, dur: .40, cd: .60, kb: 450, k: 480, min: 380, bs: .72, hr: 12, im: 1,   snd: "blade",  s: [4, 3, 5], desc: "Lâmina curva e longa", two: true, ext: [-22, 116] },
  tridente:     { name: "Tridente",          cat: "Longas",    kind: "thrust", L: 112, dmg: 14, dur: .32, cd: .55, kb: 0,   k: 650, min: 260, bs: .78, hr: 10, im: 1.1, snd: "pierce", s: [3, 3, 5], desc: "Fisga e puxa o inimigo", two: true, pull: true, ext: [-22, 128] },
  chicote:      { name: "Chicote de Corrente", cat: "Longas",  kind: "whip",   L: 22,  dmg: 11, dur: .32, cd: .50, kb: 380, k: 700, min: 520, hr: 6,  im: 1,   snd: "whip",   s: [2, 4, 5], desc: "Estalo de longo alcance", ext: [-8, 92] },
  // ── Distância (recarga entre disparos)
  arco:         { name: "Arco",              cat: "Distância", kind: "shoot",  L: 26,  dmg: 3,  dur: .15, cd: .90, kb: 150, k: 600, min: 600, hr: 5,  im: 1,   snd: "blunt",  s: [3, 3, 5], desc: "Flechas em curva", shot: "arrow", ext: [-44, 36] },
  besta:        { name: "Besta",             cat: "Distância", kind: "shoot",  L: 30,  dmg: 3,  dur: .15, cd: 1.6, kb: 150, k: 600, min: 600, hr: 5,  im: 1,   snd: "blunt",  s: [4, 1, 5], desc: "Virote reto e fortíssimo · segure pra carregar", charge: true, shot: "bolt", ext: [-14, 44] },
  funda:        { name: "Funda",             cat: "Distância", kind: "shoot",  L: 20,  dmg: 2,  dur: .15, cd: 1.0, kb: 150, k: 600, min: 600, hr: 5,  im: 1,   snd: "blunt",  s: [2, 3, 4], desc: "Pedra que quica", shot: "stone", ext: [-10, 34] },
  machadinhas:  { name: "Machadinhas",       cat: "Distância", kind: "shoot",  L: 34,  dmg: 6,  dur: .15, cd: .60, kb: 200, k: 650, min: 420, bs: .6, hr: 7, im: 1, snd: "blade",  s: [3, 4, 4], desc: "3 machados de arremesso", shot: "axe", ammo: 3, reload: 2.2, ext: [-6, 40] },
  chakram:      { name: "Chakram",           cat: "Distância", kind: "shoot",  L: 22,  dmg: 3,  dur: .15, cd: .35, kb: 200, k: 650, min: 600, hr: 6,  im: 1,   snd: "blade",  s: [3, 3, 4], desc: "Vai e volta pra sua mão", shot: "chakram", ammo: 1, reload: 4, ext: [-16, 40] },
  bombas:       { name: "Bombas Alquímicas", cat: "Distância", kind: "shoot",  L: 16,  dmg: 2,  dur: .15, cd: 1.8, kb: 150, k: 600, min: 600, hr: 5,  im: 1,   snd: "blunt",  s: [3, 1, 4], desc: "Nuvem de veneno", shot: "flask", ext: [-12, 30] },
  // ── Cajados: disparam na direção da mira, saindo da ponta
  cajadoFogo:   { name: "Cajado de Fogo",    cat: "Cajados",   kind: "shoot",  L: 88,  dmg: 4,  dur: .20, cd: 1.1, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt",  s: [2, 2, 4], desc: "Bola de fogo que explode", shot: "fire", two: true, gem: "#ff7a1a", ext: [-30, 100] },
  cajadoGelo:   { name: "Cajado de Gelo",    cat: "Cajados",   kind: "shoot",  L: 88,  dmg: 4,  dur: .20, cd: 1.0, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt",  s: [2, 3, 4], desc: "3 estilhaços que congelam", shot: "ice", two: true, gem: "#8fe3ff", ext: [-30, 100] },
  cajadoTrovao: { name: "Cajado do Trovão",  cat: "Cajados",   kind: "shoot",  L: 88,  dmg: 4,  dur: .20, cd: 1.3, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt",  s: [2, 2, 5], desc: "Raio reto que atravessa todos", shot: "beam", two: true, gem: "#ffe95a", ext: [-30, 100] },
  cajadoVida: { ...SH, name: "Cajado da Vida",     cat: "Cajados", kind: "shoot", L: 88, dur: .2, cd: 6, bs: .8, hr: 7, s: [1, 1, 3], desc: "Círculo de cura no chão por 4s", shot: "healzone", two: true, gem: "#7dff9a", botRange: 300, ext: [-30, 100] },
  cajadoNatureza: { name: "Cajado da Natureza", cat: "Cajados", kind: "shoot", L: 88, dmg: 4, dur: .20, cd: 1.2, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt", s: [2, 2, 4], desc: "Cipós prendem o inimigo", shot: "seed", two: true, gem: "#7dff6a", ext: [-30, 100] },
  varinha:      { name: "Varinha Arcana",    cat: "Cajados",   kind: "shoot",  L: 46,  dmg: 2,  dur: .10, cd: .22, kb: 120, k: 650, min: 500, bs: .8, hr: 5, im: 1.2, snd: "blunt", s: [1, 5, 4], desc: "Faíscas em rajada", shot: "spark", gem: "#ff8af0", ext: [-6, 56] },
  // ── Livros: o feitiço aparece sozinho no inimigo mais próximo
  livroSombras: { name: "Livro das Sombras", cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 1.7, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [2, 2, 4], desc: "3 orbes que perseguem", spell: "orbs", book: "#3a1f5c", rune: "#c58bff", ext: [-4, 28] },
  grimorio:     { name: "Grimório Arcano",   cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 1.5, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [2, 2, 5], desc: "Chuva de estrelas no alvo", spell: "stars", book: "#1f3f6b", rune: "#7ad8ff", ext: [-4, 28] },
  livroVida:    { name: "Livro da Vida",     cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 1.6, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [2, 2, 3], desc: "Laço que rouba vida", spell: "drain", book: "#1f5c32", rune: "#7dff9a", ext: [-4, 28] },
  livroCaos:    { name: "Livro do Caos",     cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 2.0, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [3, 1, 4], desc: "Buraco negro que puxa e explode", spell: "vortex", book: "#2a0a2a", rune: "#ff4ad8", ext: [-4, 28] },
  tomoTerra:    { name: "Tomo da Terra",     cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 1.6, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [2, 2, 4], desc: "Espinhos de pedra do chão", spell: "spikes", book: "#6b3f1f", rune: "#ffb35a", ext: [-4, 28] },
  // ── Sabres (ficção científica, corpo a corpo): lâminas de energia brilhando.
  sabreLuz:     { name: "Sabre de Luz",       cat: "Sabres",  kind: "swing",  L: 80,  dmg: 15, dur: .24, cd: .30, kb: 380, k: 780, min: 330, bs: .12, hr: 7,  im: 1.3, snd: "saber", s: [3, 5, 3], desc: "Rebate tiros enquanto golpeia", deflect: true, glow: "#4ab8ff", energy: true, ext: [-14, 86] },
  sabreDuplo:   { name: "Sabre Duplo",        cat: "Sabres",  kind: "spin",   L: 70,  dmg: 13, dur: .40, cd: .50, kb: 420, k: 700, min: 360, bs: .15, hr: 7,  im: 1.2, snd: "saber", s: [3, 4, 3], desc: "Lâmina dos dois lados, gira", double: true, glow: "#ff3a3a", energy: true, ext: [-74, 76] },
  marteloGravitacional: { name: "Martelo Gravitacional", cat: "Sabres", kind: "swing", L: 76, dmg: 18, dur: .46, cd: .80, kb: 300, k: 400, min: 340, bs: .8, hr: 16, im: .65, snd: "blunt", s: [4, 1, 3], desc: "Puxa todos para o impacto", gravity: true, two: true, glow: "#6a8aff", ext: [-10, 92] },
  punhosCiber:  { name: "Punhos Cibernéticos", cat: "Sabres", kind: "claws",  L: 0,   dmg: 8,  dur: .14, cd: .18, kb: 240, k: 0,   min: 260, hr: 9,  im: 1,   snd: "punch", s: [2, 5, 1], desc: "3º soco seguido atordoa", combo: true, glow: "#4ab8ff", ext: [-14, 30] },
  // ── Energia (ficção científica, distância): munição limitada; no Aleatório a arma vazia é jogada fora.
  pistolaLaser: { name: "Pistola Laser",      cat: "Energia", L: 30, cd: .22, shot: "laser",   clip: 12, clipReload: 1.6, s: [2, 5, 5], desc: "Tiros rápidos · segure pra carregar", charge: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-12, 40] },
  riflePlasma:  { name: "Rifle de Plasma",    cat: "Energia", L: 56, cd: .90, shot: "plasma",  clip: 6,  clipReload: 2.0, s: [3, 2, 5], desc: "Plasma que explode · segure pra carregar", charge: true, two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 64] },
  railgun:      { name: "Railgun",            cat: "Energia", L: 66, cd: 2.0, shot: "rail",    clip: 3,  clipReload: 2.5, recoil: 520, s: [5, 1, 5], desc: "Atravessa tudo · segure pra carregar", charge: true, two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 74] },
  escopetaEnergia: { name: "Escopeta de Energia", cat: "Energia", L: 48, cd: .80, shot: "pellets", clip: 4, clipReload: 2.0, recoil: 380, s: [4, 2, 2], desc: "6 tiros de perto", two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 56] },
  granadaPulsar: { name: "Granada Pulsar",    cat: "Energia", L: 44, cd: 1.2, shot: "sticky",  clip: 3,  clipReload: 2.4, s: [4, 2, 4], desc: "Gruda em quem acertar e explode", two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 54] },
  feixeLaser:   { name: "Feixe Laser",        cat: "Energia", L: 48, cd: 1.8, shot: "sweep",   clip: 3,  clipReload: 2.4, s: [3, 2, 5], desc: "Raio contínuo que você vai mirando", two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 58] },
  drone:        { name: "Drone de Combate",   cat: "Energia", L: 26, cd: 9.0, shot: "drone",   s: [2, 3, 4], desc: "Drone que atira sozinho por 8s", kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-16, 40] },
  criogenica:   { name: "Arma Criogênica",    cat: "Energia", L: 44, cd: .55, shot: "cryo",    clip: 6,  clipReload: 2.0, s: [2, 4, 4], desc: "Congela · segure pra carregar", charge: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-14, 54] },
  lancaMisseis: { name: "Lança-Mísseis",      cat: "Energia", L: 66, cd: 1.4, shot: "rocket",  clip: 2,  clipReload: 2.8, recoil: 600, s: [5, 1, 5], desc: "Explosão; coice joga você pra trás", two: true, kind: "shoot", dmg: 3, dur: .12, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", muzzle: true, ext: [-20, 76] },
  mochilaJato: { ...SH, name: "Mochila a Jato",    cat: "Energia", kind: "shoot", L: 12, cd: .7, clip: 4, clipReload: 2.6, s: [2, 4, 3], desc: "Segure ATACAR pra voar · o joystick escolhe a direção", shot: "jet", jetpack: true, hold: true, botRange: 220, ext: [-6, 22] },
  lancaChamas: { ...SH, name: "Lança-Chamas",      cat: "Energia", kind: "shoot", L: 50, cd: 1.2, clip: 3, clipReload: 2.2, two: true, s: [3, 3, 2], desc: "Segure ATACAR: jato de fogo contínuo que queima", shot: "flamer", muzzle: true, hold: true, ext: [-18, 62] },
  // ── Música: instrumentos que atacam com som.
  guitarra:   { ...SH, name: "Guitarra do Bardo",  cat: "Música", kind: "shoot", L: 50, cd: .75, s: [2, 3, 4], desc: "3 notas que ondulam no ar", shot: "notes", two: true, ext: [-20, 56] },
  tambor:     { ...SH, name: "Tambor de Guerra",   cat: "Música", kind: "shoot", L: 20, cd: 1.4, s: [3, 2, 2], desc: "Batida que empurra todos em volta", shot: "drum", botRange: 150, ext: [-10, 26] },
  flauta:     { ...SH, name: "Flauta Encantada",   cat: "Música", kind: "shoot", L: 40, cd: 1.5, s: [1, 2, 4], desc: "Notas mágicas: tontura, lentidão ou repulsão", shot: "charm", ext: [-6, 46] },
  trompete:   { ...SH, name: "Trompete Sônico",    cat: "Música", kind: "shoot", L: 36, cd: 1.1, s: [3, 3, 3], desc: "Som que arremessa, tonteia e rebate tiros · segure: FANFARRA", shot: "blast", charge: true, recoil: 180, botRange: 210, ext: [-8, 46] },
  // ── Místicas: objetos mágicos com poderes especiais.
  lampada:    { ...SH, name: "Lâmpada do Gênio",   cat: "Místicas", kind: "cast", L: 22, dur: .45, cd: 4.0, hr: 6, s: [3, 1, 4], desc: "O gênio realiza um desejo surpresa", spell: "genie", rune: "#5ac8ff", ext: [-14, 30] },
  ampulheta:  { ...SH, name: "Ampulheta do Tempo", cat: "Místicas", kind: "cast", L: 24, dur: .45, cd: 7.0, hr: 6, s: [1, 1, 5], desc: "Para o tempo dos inimigos por 1,5s", spell: "timestop", rune: "#e8b84a", ext: [-6, 30] },
  leque:      { ...SH, name: "Leque do Vento",     cat: "Místicas", kind: "shoot", L: 30, cd: 1.6, s: [2, 2, 4], desc: "Solta um tornado que anda e joga os inimigos pro alto", shot: "tornado", ext: [-6, 36] },
  bolaCaptura: { ...SH, name: "Bola de Captura",    cat: "Místicas", kind: "shoot", L: 12, cd: 8, s: [1, 2, 4], desc: "Sai um bichinho que luta por você: elétrico, de fogo ou de água", shot: "capture", ext: [-4, 22] },
  varinhaBolhas: { ...SH, name: "Varinha de Bolhas", cat: "Místicas", kind: "shoot", L: 40, cd: 1.3, s: [2, 2, 4], desc: "Bolha que prende e leva pro alto", shot: "bubble", ext: [-6, 54] },
  varinhaOvelha: { ...SH, name: "Varinha da Ovelha", cat: "Místicas", kind: "shoot", L: 40, cd: 3.0, s: [1, 2, 4], desc: "Transforma o inimigo em ovelha por 2,5s", shot: "sheep", ext: [-6, 54] },
  arcoCupido: { ...SH, name: "Arco do Cupido",      cat: "Místicas", kind: "shoot", L: 26, cd: 1.2, s: [1, 3, 5], desc: "Flecha do amor: o alvo vem até você sem atacar", shot: "cupid", ext: [-44, 40] },
  // ── Especiais: habilidades diferentes (e algumas referências).
  espiritoEstelar: { ...SH, name: "Espírito Estelar", cat: "Especiais", kind: "shoot", L: 14, cd: 3.2, s: [4, 2, 2], desc: "Um espírito surge e soca sem parar: ORA ORA!", shot: "stand", botRange: 120, ext: [-6, 22] },
  bombasClassicas: { ...SH, name: "Bombas Clássicas", cat: "Especiais", kind: "shoot", L: 14, cd: .5, ammo: 3, reload: 3.5, s: [4, 2, 3], desc: "Explosão redonda depois de 2s · troque: terra, ar, buraco negro e energia", shot: "xbomb", botRange: 140, ext: [-6, 30] },
  katana:     { name: "Katana", cat: "Especiais", kind: "swing", L: 82, dmg: 13, dur: .24, cd: .60, kb: 360, k: 820, min: 300, bs: .15, hr: 6, im: 1.3, snd: "blade", s: [3, 4, 4], desc: "Cada corte dá um avanço relâmpago", dash: true, glow: "#e8f4ff", ext: [-16, 88] },
  shuriken:   { ...SH, name: "Shurikens",          cat: "Especiais", kind: "shoot", L: 12, cd: .45, s: [2, 5, 4], desc: "3 estrelas ninja de uma vez", shot: "shuriken", ext: [-4, 20] },
  marteloBrinquedo: { name: "Martelo de Brinquedo", cat: "Especiais", kind: "swing", L: 70, dmg: 3, dur: .30, cd: .45, kb: 1250, k: 600, min: 340, bs: .75, hr: 15, im: 1, snd: "squeak", s: [1, 4, 3], desc: "Quase não machuca, mas arremessa longe!", ext: [-10, 86] },
  ondaKi:     { ...SH, name: "Onda de Energia",    cat: "Especiais", kind: "shoot", L: 10, cd: .45, s: [3, 4, 5], desc: "Bolinhas de energia · segure pra soltar a onda", shot: "ki", charge: true, ext: [-6, 26] },
  // ── Plantas
  ervilha:    { ...SH, name: "Ervilha Atiradora",   cat: "Plantas", kind: "shoot", L: 30, cd: .3, s: [2, 5, 5], desc: "Dispara ervilhas sem parar", shot: "pea", ext: [-12, 36] },
  ervilhaGelo: { ...SH, name: "Ervilha de Gelo",    cat: "Plantas", kind: "shoot", L: 30, cd: .38, s: [2, 4, 5], desc: "Ervilhas geladas que deixam lento", shot: "snowpea", ext: [-12, 36] },
  florFogo:   { ...SH, name: "Flor de Fogo",        cat: "Plantas", kind: "shoot", L: 22, cd: .35, s: [2, 4, 3], desc: "Bolas de fogo que quicam pelo chão", shot: "bouncefire", ext: [-8, 30] },
  // ── Heróis
  lancaTeias: { ...SH, name: "Lança-Teias",         cat: "Heróis", kind: "shoot", L: 12, cd: .55, s: [2, 4, 5], desc: "Prende na teia · mire na parede ou no alto pra se puxar até lá", shot: "web", ext: [-6, 22] },
  manopla:    { ...SH, name: "Manopla do Infinito", cat: "Heróis", kind: "shoot", L: 14, cd: 1.15, s: [5, 2, 5], desc: "Cada golpe usa uma joia · carregue até o fim pro estalo", shot: "gauntlet", charge: true, ext: [-10, 28] },
  escudoEstrelado: { ...SH, name: "Escudo Estrelado", cat: "Heróis", kind: "shoot", L: 16, cd: .3, ammo: 1, reload: .2, s: [3, 3, 4], desc: "Bloqueia de frente · arremessado, ricocheteia nos inimigos", shot: "starshield", blockHeld: true, ext: [-4, 32] },
  kunaiCorrente: { ...SH, name: "Kunai de Corrente", cat: "Heróis", kind: "shoot", L: 20, cd: 1.1, s: [2, 3, 4], desc: "VEM CÁ! Puxa o inimigo até você", shot: "kunai", ext: [-8, 30] },
  // ── Brinquedos
  blocoMagico: { ...SH, name: "Kit de Construção", cat: "Brinquedos", kind: "shoot", L: 14, cd: 1.0, s: [3, 3, 4], desc: "Arraste pra escolher onde vai o bloco · troque pra TNT ou carrinho de mina", shot: "block", ext: [-4, 26] },
  varaPescar: { ...SH, name: "Vara de Pescar",     cat: "Brinquedos", kind: "shoot", L: 60, cd: 1.3, two: true, s: [2, 3, 4], desc: "Fisga o inimigo e joga ele por cima de você", shot: "hook", ext: [-12, 66] },
  ioio:       { ...SH, name: "Ioiô de Combate",     cat: "Brinquedos", kind: "shoot", L: 10, cd: .2, ammo: 1, reload: .05, s: [2, 5, 2], desc: "Vai e volta rapidinho", shot: "yoyo", ext: [-4, 22] },
  guardaChuva: { name: "Guarda-Chuva", cat: "Brinquedos", kind: "thrust", L: 76, dmg: 9, dur: .24, cd: .4, kb: 360, k: 780, min: 260, bs: .7, hr: 7, im: 1.2, snd: "blunt", s: [2, 4, 4], desc: "Estocada · no ar, abre e você plana", glide: true, ext: [-12, 84] },
  luvaMola:   { name: "Luva de Mola", cat: "Brinquedos", kind: "thrust", L: 108, dmg: 7, dur: .26, cd: .75, kb: 1100, k: 700, min: 240, bs: .82, hr: 15, im: .9, snd: "punch", s: [2, 3, 5], desc: "Soco de longe que arremessa", ext: [-8, 126] },
  taco:       { name: "Taco de Beisebol", cat: "Brinquedos", kind: "swing", L: 74, dmg: 11, dur: .30, cd: .5, kb: 560, k: 620, min: 360, bs: .55, hr: 9, im: 1, snd: "blunt", s: [3, 3, 3], desc: "Rebate tiros · acerto em cheio é HOME RUN!", deflect: true, homerun: true, glow: "#ffe9a0", ext: [-10, 82] },
  // ── Heróis e jogos
  anelLanterna: { ...SH, name: "Anel do Lanterna",  cat: "Heróis", kind: "shoot", L: 10, cd: .6, s: [4, 3, 4], desc: "Construtos de luz verde: punho, martelo e serra que atravessam", shot: "construct", ext: [-6, 18] },
  lacoVerdade:  { ...SH, name: "Laço da Verdade",   cat: "Heróis", kind: "shoot", L: 16, cd: 1.0, s: [3, 3, 4], desc: "Laça e puxa · quem é pego fica um tempo sem atacar", shot: "goldlasso", ext: [-8, 26] },
  laminasCaos:  { name: "Lâminas do Caos",   cat: "Jogos", kind: "whip", L: 22, dmg: 13, dur: .32, cd: .48, kb: 420, k: 700, min: 520, hr: 7, im: 1, snd: "blade", s: [4, 3, 4], desc: "Lâminas em correntes de fogo que queimam", burn: true, chaos: true, ext: [-16, 116] },
  laminaTerra:  { name: "Lâmina da Terra",   cat: "Jogos", kind: "swing", L: 74, dmg: 13, dur: .28, cd: .42, kb: 380, k: 680, min: 380, bs: .2, hr: 7, im: 1.1, snd: "blade", s: [4, 3, 4], desc: "Cada golpe solta uma lâmina verde que voa", terraBeam: true, ext: [-16, 88], trail: "#7dff6a" },
  alhoPoro:     { name: "Alho-Poró da Miku", cat: "Jogos", kind: "swing", L: 72, dmg: 8, dur: .26, cd: .36, kb: 520, k: 700, min: 340, bs: .5, hr: 9, im: 1.2, snd: "blunt", s: [2, 4, 5], desc: "Bate cantando ♪ e às vezes deixa tonto", leek: true, ext: [-12, 84], trail: "#5ae8dc" },
  // ── Lendárias dos jogos
  crisol:       { name: "Crisol do Slayer",  cat: "Lendárias", kind: "swing", L: 74, dmg: 17, dur: .26, cd: .44, kb: 460, k: 760, min: 360, bs: .25, hr: 8, im: 1.2, snd: "blade", s: [5, 3, 3], desc: "Lâmina de energia do Doom · acabar com alguém cura você", glow: "#ff3a1a", energy: true, rip: true, ext: [-26, 84] },
  bfg:          { ...SH, name: "BFG 9000",          cat: "Lendárias", kind: "shoot", L: 52, cd: 2.4, two: true, s: [5, 1, 5], desc: "Bola de plasma que dá choque em quem passa perto e explode", shot: "bfg", muzzle: true, botRange: 750, ext: [-22, 66] },
  espadaMestra: { name: "Espada Mestra",     cat: "Lendárias", kind: "swing", L: 70, dmg: 13, dur: .26, cd: .38, kb: 400, k: 720, min: 370, bs: .2, hr: 7, im: 1.2, snd: "blade", s: [3, 4, 4], desc: "Com a vida quase cheia, cada golpe solta um raio de espada", swordBeam: true, trail: "#bfe8ff", ext: [-19, 78] },
  keyblade:     { name: "Keyblade",          cat: "Lendárias", kind: "swing", L: 68, dmg: 12, dur: .24, cd: .34, kb: 380, k: 760, min: 360, bs: .3, hr: 8, im: 1.2, snd: "blunt", s: [3, 4, 3], desc: "A cada 3 golpes solta uma magia: Fogo, Gelo ou Trovão", keyMagic: true, trail: "#ffe27a", ext: [-20, 72] },
  espadaBuster: { name: "Espada Buster",     cat: "Lendárias", kind: "swing", L: 100, dmg: 24, dur: .46, cd: .78, kb: 760, k: 440, min: 340, bs: .2, hr: 13, im: .7, snd: "blade", s: [5, 1, 4], desc: "A lâmina gigante do Cloud: lenta e devastadora", two: true, ext: [-27, 108] },
  machadoLeviata: { name: "Machado Leviatã", cat: "Lendárias", kind: "swing", L: 62, dmg: 15, dur: .32, cd: .46, kb: 440, k: 620, min: 380, bs: .6, hr: 12, im: 1, snd: "blade", s: [4, 3, 3], desc: "O machado de gelo do Kratos: congela quem acerta", freeze: .5, trail: "#bff0ff", ext: [-15, 72] },
  espadaEnergia: { name: "Espada de Energia", cat: "Lendárias", kind: "swing", L: 56, dmg: 18, dur: .24, cd: .5, kb: 420, k: 800, min: 340, bs: .25, hr: 10, im: 1.2, snd: "blade", s: [5, 3, 2], desc: "Plasma do Halo · o golpe avança até o inimigo · camuflado, o primeiro golpe dá dano dobrado", glow: "#4a9aff", energy: true, lunge: true, ext: [-12, 64] },
  armaPortal:   { ...SH, name: "Arma de Portal",     cat: "Lendárias", kind: "shoot", L: 40, cd: .55, two: true, s: [1, 4, 5], desc: "Atira portais azul e laranja · quem entra num sai no outro", shot: "portal", ext: [-16, 46] },
  paShovel:     { name: "Pá do Shovel Knight", cat: "Lendárias", kind: "swing", L: 64, dmg: 11, dur: .26, cd: .36, kb: 420, k: 700, min: 360, bs: .65, hr: 11, im: 1.1, snd: "blunt", s: [3, 4, 3], desc: "No ar, mire pra baixo e quique na cabeça dos inimigos", pogo: true, ext: [-15, 74] },
  espadaDiamante: { name: "Espada de Diamante", cat: "Lendárias", kind: "swing", L: 62, dmg: 14, dur: .3, cd: .5, kb: 420, k: 650, min: 360, bs: .2, hr: 8, im: 1, snd: "blade", s: [4, 3, 3], desc: "Varredura acerta quem está perto · caindo, dá crítico", sweepHit: true, trail: "#5affe0", ext: [-16, 58] },
  frigideira:   { name: "Frigideira",        cat: "Lendárias", kind: "swing", L: 56, dmg: 10, dur: .26, cd: .38, kb: 480, k: 700, min: 360, bs: .6, hr: 14, im: 1.1, snd: "blunt", s: [2, 4, 2], desc: "Bloqueia golpes e tiros de frente · PANG!", panBlock: true, pan: true, ext: [-10, 86] },
  masamune:     { name: "Masamune",          cat: "Lendárias", kind: "swing", L: 150, dmg: 12, dur: .3, cd: .5, kb: 360, k: 640, min: 360, bs: .25, hr: 5, im: 1, snd: "blade", s: [3, 3, 5], desc: "A espada longuíssima do Sephiroth: alcance enorme", two: true, trail: "#d8e0ff", ext: [-24, 156] },
  armaGravidade: { ...SH, name: "Arma da Gravidade", cat: "Lendárias", kind: "shoot", L: 46, cd: .9, two: true, s: [3, 3, 2], desc: "Segure ATACAR: puxa e segura um inimigo ou tiro · solte pra arremessar · toque rápido empurra", shot: "gravpunt", hold: true, gravGun: true, botRange: 230, ext: [-18, 58] },
  // ── Magias novas
  livroLuz:     { name: "Livro da Luz",      cat: "Livros",    kind: "cast",   L: 22,  dmg: 2,  dur: .45, cd: 1.5, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [4, 2, 4], desc: "Coluna de luz sagrada cai onde você mira", spell: "holy", book: "#f4ecd8", rune: "#ffe27a", ext: [-4, 28] },
  cajadoVazio:  { name: "Cajado do Vazio",   cat: "Cajados",   kind: "shoot",  L: 90,  dmg: 4,  dur: .20, cd: 1.3, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt", s: [4, 2, 4], desc: "Orbe do vazio que suga quem está perto e implode", shot: "voidorb", two: true, gem: "#9a4aff", ext: [-30, 106] },
  // ── Relíquias: só caem dos chefões. Depois de pegas, ficam desbloqueadas no menu.
  manoplaGolem: { name: "Manopla do Golem",  cat: "Relíquias", kind: "slam",   L: 54,  dmg: 22, dur: .42, cd: .85, kb: 640, k: 460, min: 340, bs: .5, hr: 16, im: .6,  snd: "blunt",  s: [5, 2, 4], desc: "Soco no chão: onda e espinhos", relic: "golem", ext: [-8, 72] },
  cetroMortos:  { name: "Cetro dos Mortos",  cat: "Relíquias", kind: "cast",   L: 64,  dmg: 3,  dur: .45, cd: 3.0, kb: 150, k: 600, min: 600, hr: 6,  im: 1,   snd: "blunt",  s: [3, 2, 4], desc: "Invoca esqueletos aliados", spell: "summon", rune: "#b06cff", relic: "esqueleto", ext: [-10, 78] },
  lancaGlacial: { name: "Lança Glacial",     cat: "Relíquias", kind: "thrust", L: 116, dmg: 15, dur: .30, cd: .50, kb: 380, k: 650, min: 260, bs: .78, hr: 8, im: 1.1, snd: "pierce", s: [3, 3, 5], desc: "Congela quem acertar", freeze: .7, two: true, relic: "gelido", ext: [-22, 132] },
  canhaoMao:    { name: "Canhão de Mão",     cat: "Relíquias", kind: "shoot",  L: 40,  dmg: 3,  dur: .15, cd: 1.5, kb: 150, k: 600, min: 600, hr: 5, im: 1, snd: "blunt", s: [5, 1, 4], desc: "Bala de canhão que explode", shot: "cannon", recoil: 420, relic: "capitao", ext: [-14, 50] },
  laminaInfernal: { name: "Lâmina Infernal", cat: "Relíquias", kind: "swing",  L: 84,  dmg: 17, dur: .34, cd: .62, kb: 480, k: 600, min: 380, bs: .2, hr: 8, im: 1, snd: "blade", s: [4, 3, 4], desc: "Cada golpe solta uma onda de fogo", burn: true, firewave: true, two: true, relic: "demonio", ext: [-16, 92] },
  shurikenGigante: { ...SH, name: "Shuriken Gigante", cat: "Relíquias", kind: "shoot", L: 30, cd: .3, ammo: 1, reload: 2.5, s: [4, 3, 4], desc: "Corta tudo na ida e na volta", shot: "bigshuriken", relic: "ninja", ext: [-8, 46] },
  violino:    { ...SH, name: "Violino Amaldiçoado", cat: "Relíquias", kind: "shoot", L: 46, cd: .55, s: [3, 4, 4], desc: "Notas que perseguem e deixam tonto", shot: "cursednotes", two: true, relic: "maestro", ext: [-16, 52] },
  canhaoBraco: { ...SH, name: "Mega Buster",       cat: "Relíquias", kind: "shoot", L: 34, cd: .28, s: [3, 5, 5], desc: "Segure pra carregar · troque entre 8 poderes de robôs", shot: "buster", charge: true, relic: "mecha", ext: [-24, 46] },
  cajadoSombrio: { name: "Cajado Sombrio",   cat: "Relíquias", kind: "shoot",  L: 92,  dmg: 4,  dur: .20, cd: 2.2, kb: 250, k: 550, min: 420, bs: .8, hr: 7, im: 1, snd: "blunt", s: [4, 1, 5], desc: "Chuva de meteoros na mira", shot: "meteorRain", two: true, gem: "#c58bff", relic: "feiticeira", ext: [-30, 106] },
};
// Poder especial de cada arma (botão PODER no celular, no lugar de ARREMESSAR).
const SKILL_INFO = {
  adaga: "Passo Sombrio", espada: "Corte Giratório", espadaLonga: "Lâmina de Vento", rapieira: "Mil Estocadas",
  machado: "Machado Bumerangue", machadoDuplo: "Redemoinho", maca: "Terremoto", martelo: "Onda Sísmica",
  lanca: "Salto do Dragão", alabarda: "Varredura Ciclone", foice: "Ceifa das Almas", chicote: "Laço",
  arco: "Chuva de Flechas", funda: "Pedra Gigante", machadinhas: "Leque de Machados", bombas: "Chuva de Frascos",
  varinha: "Fogos de Artifício", mangual: "Bola Demolidora", sabreDuplo: "Disco de Luz", cajadoFogo: "Muralha de Fogo",
  espadaEscudo: "Investida de Escudo", espadaFlamejante: "Fênix Ascendente", marteloTrovao: "Fúria do Trovão", clava: "Fúria do Ogro",
  tridente: "Maremoto", besta: "Rajada Tripla", chakram: "Anel de Lâminas", cajadoGelo: "Nevasca", cajadoNatureza: "Floresta Viva",
  sabreLuz: "Empurrão da Força", marteloGravitacional: "Gravidade Zero", punhosCiber: "Soco Foguete", katana: "Corte Instantâneo",
  guitarra: "Acorde Poderoso", livroVida: "Bênção",
  anelLanterna: "Bolha de Luz Verde", lacoVerdade: "Braceletes", laminasCaos: "Fúria de Esparta", laminaTerra: "Rajada Terra", alhoPoro: "Ievan Polkka",
  crisol: "Investida Glória", bfg: "Rajada de Plasma", espadaMestra: "Ataque Giratório", keyblade: "Ars Arcanum", espadaBuster: "Braver",
  machadoLeviata: "Arremesso do Leviatã", espadaEnergia: "Camuflagem Ativa", armaPortal: "Salto de Portal", paShovel: "Pá de Terra",
  espadaDiamante: "Poção de Força", frigideira: "Frango Assado", masamune: "Octaslash", armaGravidade: "Atração",
  livroLuz: "Escudo de Luz", cajadoVazio: "Passo do Vazio",
};
for (const k in SKILL_INFO) { WEAPONS[k].skill = SKILL_INFO[k]; WEAPONS[k].desc += ` · ⚡ ${SKILL_INFO[k]}`; }
// Balanceamento: multiplicador do dano de cada arma (medido com mira perfeita contra um alvo parado).
// Faixas (alvo parado, sem ser empurrado): corpo a corpo 17–26 de dano por segundo, distância 6,5–10,5, magia 4,5–7. Armas de efeito (ovelha, bolhas...) ficam como estão.
const BALANCE = {
  espada: 0.9, espadaEscudo: 1.0, machado: 0.77, maca: 0.91, lanca: 1.05, tridente: 1.47,
  chicote: 1.56, funda: 1.3, machadinhas: 1.55, bombas: 1.25, cajadoFogo: 1.44, cajadoGelo: 1.08,
  cajadoTrovao: 1.6, varinha: 1.51, livroSombras: 1.6, grimorio: 1.32, livroVida: 1.45, tomoTerra: 1.5,
  livroLuz: 1.07, sabreLuz: 0.82, sabreDuplo: 1.13, riflePlasma: 1.6, railgun: 1.3, granadaPulsar: 1.6,
  feixeLaser: 1.6, drone: 1.6, lancaMisseis: 1.6, lancaChamas: 0.65, bolaCaptura: 0.87, shuriken: 0.83,
  ondaKi: 1.55, ervilha: 0.85, escudoEstrelado: 0.6, guardaChuva: 1.3, laminasCaos: 1.06, laminaTerra: 0.79,
  bfg: 1.25, espadaMestra: 0.71, keyblade: 0.91, espadaEnergia: 0.87, paShovel: 1.1, cetroMortos: 0.5,
  canhaoMao: 1.6, violino: 1.2,
  crisol: 0.93,
  manoplaGolem: 0.95,
  laminaInfernal: 0.95,
  machadoLeviata: 0.95,
};
for (const k in BALANCE) WEAPONS[k].dmgK = BALANCE[k];
// Ordem do menu: agrupadas por categoria (na ordem em que cada categoria aparece no catálogo).
const CAT_ORDER = [...new Set(Object.values(WEAPONS).map(w => w.cat))];
const SELECTABLE = Object.keys(WEAPONS).filter(k => k !== "punhos" && !WEAPONS[k].relic && !WEAPONS[k].hidden)
  .map((k, i) => [k, i]).sort((a, b) => CAT_ORDER.indexOf(WEAPONS[a[0]].cat) - CAT_ORDER.indexOf(WEAPONS[b[0]].cat) || a[1] - b[1]).map(([k]) => k);
const RELICS = Object.keys(WEAPONS).filter(k => WEAPONS[k].relic);
const RANGED = new Set(["shoot", "cast"]);

// Desenha a arma em coordenadas locais: empunhadura na origem, apontando
// para +x. flip = lado das lâminas (1 ou -1). state.pulled = corda puxada;
// state.loaded = projétil pronto; state.icon = desenho completo pro ícone.
function drawWeaponShape(ctx, id, L, flip = 1, state = {}) {
  const wood = "#7a4e2a", woodD = "#4a3020", steel = "#dfe5ea", steelD = "#8f9aa3", gold = "#e8b84a";
  const w = WEAPONS[id];
  const ln = (x1, y1, x2, y2, width, color) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const poly = (pts, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
  const shaft = (x1, x2, width = 5) => { ln(x1, 0, x2, 0, width + 2, woodD); ln(x1, 0, x2, 0, width, wood); ln(x1, -width / 4, x2, -width / 4, 1, "#a87448"); };
  const blade = (x1, x2, half) => {
    poly([x1, -half, x2 - half * 2, -half, x2 + 4, 0, x2 - half * 2, half, x1, half], steelD);
    const g = ctx.createLinearGradient(0, -half, 0, 0); g.addColorStop(0, "#ffffff"); g.addColorStop(.5, steel); g.addColorStop(1, "#b8c2ca");
    poly([x1, -half + 1, x2 - half * 2, -half + 1, x2 + 2, 0, x1, 0], g);
    ln(x1 + 2, -half + 1.2, x2 - half * 2, -half + 1.2, .9, "#ffffffcc");
  };
  const spikes = (cx, cy, r, n) => { for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; poly([cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7), cx + Math.cos(a + .4) * r, cy + Math.sin(a + .4) * r, cx + Math.cos(a - .4) * r, cy + Math.sin(a - .4) * r], steelD); } };
  const ball = (cx, cy, r) => { ctx.fillStyle = "#7d868e"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.fillStyle = "#b8c0c7"; ctx.beginPath(); ctx.arc(cx - r * .3, cy - r * .3, r * .45, 0, 7); ctx.fill(); };
  const gem = (x, color) => {
    const g = ctx.createRadialGradient(x, 0, 1, x, 0, 22);
    g.addColorStop(0, color + "cc"); g.addColorStop(1, color + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 0, 22, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, 0, 7, 0, 7); ctx.fill();
    ctx.fillStyle = "#fffa"; ctx.beginPath(); ctx.arc(x - 2, -2, 2.5, 0, 7); ctx.fill();
  };
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  switch (id) {
    case "lancaGlacial": {
      ln(-22, 0, L - 22, 0, 7, "#1f3a55"); ln(-22, 0, L - 22, 0, 4.5, "#5a8ab0"); ln(-20, -1, L - 24, -1, 1, "#a8d8f0");
      for (const x of [6, 28, 50]) ln(x, -3.5, x, 3.5, 2.5, "#bff0ff");
      poly([L - 32, -4, L - 22, -13, L - 17, -3], "#8fe3ff"); poly([L - 32, 4, L - 22, 13, L - 17, 3], "#8fe3ff");
      poly([L - 26, -9, L + 9, 0, L - 26, 9, L - 20, 0], "#3a9ad0");
      poly([L - 24, -6.5, L + 5, 0, L - 20, 0], "#e8fbff");
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(L - 10, -2, 1.6, 0, 7); ctx.fill();
      break;
    }
    case "canhaoMao": {
      poly([-13, -3, 3, -6, 5, 6, -10, 10], "#5a3a22"); ln(-11, 2, 1, -2, 1.2, "#8a5a32");
      ln(-1, 0, L, 0, 15, "#14161a"); ln(-1, -2, L, -2, 10, "#3a3f47"); ln(1, -4.5, L - 3, -4.5, 2, "#7a828c");
      for (const x of [6, L - 5]) ln(x, -8.5, x, 8.5, 3.5, "#e8b84a");
      ctx.fillStyle = "#050505"; ctx.beginPath(); ctx.ellipse(L + 2, 0, 3, 6.5, 0, 0, 7); ctx.fill();
      ln(-3, -7, -7, -14, 2, "#c9a86a");
      break;
    }
    case "laminaInfernal": {
      ln(-15, 0, 10, 0, 6.5, "#2a0a0a"); ln(-13, -1, 8, -1, 1.5, "#5a1a1a");
      ctx.fillStyle = "#ff4a1a"; ctx.beginPath(); ctx.arc(-16, 0, 4.2, 0, 7); ctx.fill();
      poly([10, -3, 3, -17, 15, -7, 15, 7, 3, 17, 10, 3], "#3a1010");
      const g = ctx.createLinearGradient(14, 0, L, 0); g.addColorStop(0, "#5a0a0a"); g.addColorStop(.5, "#c0301a"); g.addColorStop(1, "#ffb33a");
      poly([14, -6.5, L * .55, -8.5, L - 14, -4.5, L + 6, 0, L - 14, 5, L * .55, 7.5, 14, 6.5], "#1a0505");
      poly([15, -5, L * .55, -6.5, L - 14, -3, L + 3, 0, L - 14, 3.5, L * .55, 5.5, 15, 5], g);
      ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(L * .3, -2.2); ctx.lineTo(L * .5, 1.6); ctx.lineTo(L * .75, -1.2); ctx.lineTo(L - 6, 0); ctx.stroke();
      break;
    }
    case "adaga":
      ln(-4, 0, 6, 0, 5, woodD); ln(6, -6, 6, 6, 4, gold); blade(8, L - 4, 3); break;
    case "espada": case "espadaEscudo":
      ln(-6, 0, 10, 0, 6, woodD); ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(-7, 0, 3.5, 0, 7); ctx.fill();
      ln(10, -10, 10, 10, 5, gold); blade(12, L - 4, 4); ln(14, 0, L - 8, 0, 1.2, steelD);
      if (state.icon && id === "espadaEscudo") { ctx.save(); ctx.translate(16, 22); ctx.rotate(Math.PI / 4); drawShield(ctx, 1.1); ctx.restore(); }
      break;
    case "espadaLonga":
      ln(-16, 0, 10, 0, 6, woodD); ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(-17, 0, 4, 0, 7); ctx.fill();
      ln(10, -13, 10, 13, 5, gold); blade(12, L - 4, 5); ln(14, 0, L - 10, 0, 1.6, steelD); break;
    case "espadaFlamejante": {
      ln(-6, 0, 10, 0, 6, woodD); ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(-7, 0, 3.5, 0, 7); ctx.fill();
      ln(10, -11, 10, 11, 5, "#8a2a1a"); ln(10, -9, 10, 9, 2, gold);
      const g = ctx.createLinearGradient(12, 0, L, 0); g.addColorStop(0, "#ff5a1a"); g.addColorStop(.6, "#ffb33a"); g.addColorStop(1, "#fff2b0");
      poly([12, -5, L - 10, -4, L + 5, 0, L - 10, 4, 12, 5], "#5a1a0a");
      poly([12, -3.5, L - 10, -3, L + 2, 0, L - 10, 3, 12, 3.5], g);
      ln(14, 0, L - 8, 0, 1.2, "#fff6");
      break;
    }
    case "rapieira":
      ln(-4, 0, 8, 0, 5, woodD);
      ctx.strokeStyle = gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(10, 0, 8, -1.6, 1.6); ctx.stroke();
      poly([10, -2, L, -.6, L + 6, 0, L, .6, 10, 2], steel); break;
    case "garras":
      // Desenhada em cada mão pelo jogo; aqui só o ícone/forma.
      ctx.fillStyle = "#5a4636"; ctx.fillRect(-12, -9, 16, 18);
      for (const y of [-7, 0, 7]) { ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(2, y - 2); ctx.quadraticCurveTo(18, y - 4, 28, y + 3 * flip); ctx.quadraticCurveTo(16, y + 1, 2, y + 2); ctx.fill(); }
      break;
    case "machado":
      shaft(-6, L + 2);
      ctx.fillStyle = steelD; ctx.beginPath();
      ctx.moveTo(L - 22, 0); ctx.lineTo(L - 26, -22 * flip); ctx.quadraticCurveTo(L - 8, -30 * flip, L + 4, -20 * flip); ctx.lineTo(L, 0); ctx.fill();
      ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(L - 24, -18 * flip); ctx.quadraticCurveTo(L - 8, -27 * flip, L + 3, -19 * flip); ctx.lineTo(L - 4, -10 * flip); ctx.fill();
      ctx.fillStyle = "#5c656c"; ctx.fillRect(L - 24, -4, 24, 8); break;
    case "machadoDuplo":
      shaft(-10, L + 4, 6);
      for (const s of [1, -1]) {
        ctx.fillStyle = steelD; ctx.beginPath();
        ctx.moveTo(L - 24, 0); ctx.lineTo(L - 30, -24 * s); ctx.quadraticCurveTo(L - 10, -34 * s, L + 6, -24 * s); ctx.lineTo(L, 0); ctx.fill();
        ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(L - 28, -21 * s); ctx.quadraticCurveTo(L - 10, -31 * s, L + 5, -22 * s); ctx.lineTo(L - 4, -12 * s); ctx.fill();
      }
      ctx.fillStyle = "#5c656c"; ctx.fillRect(L - 26, -5, 28, 10); break;
    case "maca":
      shaft(-6, L - 8); ln(-6, 0, 4, 0, 7, woodD);
      spikes(L, 0, 10, 8); ball(L, 0, 11); break;
    case "martelo":
      shaft(-8, L - 6, 6);
      ctx.fillStyle = "#6c757d"; ctx.fillRect(L - 13, -19, 24, 38);
      ctx.fillStyle = "#a9b2ba"; ctx.fillRect(L - 11, -17, 20, 34);
      ctx.fillStyle = "#6c757d"; ctx.fillRect(L - 11, -6, 20, 12); break;
    case "marteloTrovao": {
      shaft(-8, L - 6, 6); ln(-8, 0, 2, 0, 8, "#3a2a5a");
      ctx.fillStyle = "#2f3440"; ctx.fillRect(L - 14, -20, 26, 40);
      ctx.fillStyle = "#4a5266"; ctx.fillRect(L - 12, -18, 22, 36);
      ctx.fillStyle = gold; ctx.fillRect(L - 14, -20, 26, 4); ctx.fillRect(L - 14, 16, 26, 4);
      ctx.strokeStyle = "#ffe95a"; ctx.lineWidth = 2.5; ctx.shadowColor = "#ffe95a"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(L + 2, -11); ctx.lineTo(L - 4, 1); ctx.lineTo(L + 3, 1); ctx.lineTo(L - 3, 12); ctx.stroke(); ctx.shadowBlur = 0;
      break;
    }
    case "clava": {
      ctx.fillStyle = woodD; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(L - 30, -9); ctx.quadraticCurveTo(L + 8, -18, L + 8, 0); ctx.quadraticCurveTo(L + 8, 18, L - 30, 9); ctx.lineTo(-10, 4); ctx.fill();
      ctx.fillStyle = "#8a5a32"; ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(L - 30, -7); ctx.quadraticCurveTo(L + 4, -14, L + 5, -2); ctx.lineTo(-8, 1); ctx.fill();
      for (const [x, y] of [[L - 18, -10], [L - 4, 8], [L - 26, 6], [L + 2, -8]]) { ctx.fillStyle = "#c9ced3"; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
      break;
    }
    case "mangual":
      shaft(-6, L, 6);
      if (state.icon) {
        ctx.strokeStyle = steelD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(L, 0); ctx.lineTo(L + 44, 8); ctx.stroke();
        spikes(L + 52, 10, 10, 8); ball(L + 52, 10, 11);
      }
      break;
    case "lanca":
      shaft(-20, L - 10);
      poly([L - 14, -7, L + 14, 0, L - 14, 7], steelD); poly([L - 13, -5, L + 12, 0, L - 13, 0], steel);
      poly([L - 16, 0, L - 26, 8, L - 22, 0], "#c0392b"); break;
    case "alabarda":
      shaft(-20, L);
      poly([L - 4, -4, L + 12, 0, L - 4, 4], steel);
      ctx.fillStyle = steelD; ctx.beginPath();
      ctx.moveTo(L - 26, 0); ctx.lineTo(L - 30, -24 * flip); ctx.quadraticCurveTo(L - 14, -30 * flip, L - 4, -22 * flip); ctx.lineTo(L - 6, 0); ctx.fill();
      ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(L - 28, -20 * flip); ctx.quadraticCurveTo(L - 14, -27 * flip, L - 6, -20 * flip); ctx.lineTo(L - 10, -8 * flip); ctx.fill();
      poly([L - 18, 0, L - 16, 14 * flip, L - 10, 0], steelD); break;
    case "foice":
      shaft(-20, L + 2);
      ctx.fillStyle = steelD; ctx.beginPath();
      ctx.moveTo(L, -3 * flip); ctx.quadraticCurveTo(L + 6, -34 * flip, L - 48, -40 * flip);
      ctx.quadraticCurveTo(L - 12, -26 * flip, L - 6, 2 * flip); ctx.fill();
      ctx.fillStyle = steel; ctx.beginPath();
      ctx.moveTo(L - 2, -6 * flip); ctx.quadraticCurveTo(L + 2, -32 * flip, L - 44, -38 * flip); ctx.quadraticCurveTo(L - 10, -28 * flip, L - 4, -4 * flip); ctx.fill(); break;
    case "tridente":
      shaft(-20, L - 16);
      ln(L - 16, -12, L - 16, 12, 4, steelD);
      for (const y of [-12, 0, 12]) { ln(L - 16, y, L + (y ? 4 : 10), y, 3, steel); poly([L + (y ? 4 : 10), y - 4, L + (y ? 14 : 20), y, L + (y ? 4 : 10), y + 4], steel); }
      break;
    case "chicote":
      ln(-8, 0, L, 0, 7, "#3a2a1e"); ln(-8, 0, L, 0, 4, "#6a4a32");
      if (state.icon) { ctx.strokeStyle = steelD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, 0); ctx.bezierCurveTo(L + 30, -30, L + 40, 30, L + 70, 0); ctx.stroke(); }
      break;
    case "arco": {
      ctx.strokeStyle = woodD; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-14, 0, 28, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = wood; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(-14, 0, 28, -1.1, 1.1); ctx.stroke();
      const pulled = state.pulled ? -10 : 0;
      ctx.strokeStyle = "#eee"; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(-14 + 28 * Math.cos(-1.1), 28 * Math.sin(-1.1)); ctx.lineTo(pulled, 0); ctx.lineTo(-14 + 28 * Math.cos(1.1), 28 * Math.sin(1.1)); ctx.stroke();
      if (state.loaded !== false) { ln(pulled, 0, 32, 0, 2, "#d9c08a"); poly([32, -3, 38, 0, 32, 3], steel); }
      break;
    }
    case "besta":
      ln(-12, 0, 36, 0, 8, woodD); ln(-12, 0, 36, 0, 5, wood);
      ctx.strokeStyle = "#3b2a1c"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(30, -24); ctx.quadraticCurveTo(40, 0, 30, 24); ctx.stroke();
      ctx.strokeStyle = "#eee"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(30, -24); ctx.lineTo(state.loaded === false ? 28 : 10, 0); ctx.lineTo(30, 24); ctx.stroke();
      if (state.loaded !== false) { ln(10, -3, 42, -3, 3, "#444"); poly([42, -6, 48, -3, 42, 0], steel); }
      break;
    case "chakram":
      if (state.loaded === false) break;
      ctx.save(); ctx.translate(state.icon ? 12 : 16, 0); drawChakram(ctx, 15, 0); ctx.restore(); break;
    case "funda":
      ctx.strokeStyle = "#8a6a4a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, -10, 22, -2); ctx.moveTo(0, 0); ctx.quadraticCurveTo(12, 10, 22, 2); ctx.stroke();
      ctx.fillStyle = "#5a3e28"; ctx.beginPath(); ctx.ellipse(22, 0, 6, 8, 0, 0, 7); ctx.fill();
      if (state.loaded !== false) { ctx.fillStyle = "#9a9a92"; ctx.beginPath(); ctx.arc(24, 0, 5, 0, 7); ctx.fill(); }
      break;
    case "machadinhas":
      if (state.loaded === false) break;
      drawHatchet(ctx, L, flip); break;
    case "bombas":
      if (state.loaded === false) break;
      drawFlask(ctx, 12, 0); break;
    case "cajadoNatureza":
      // Cajado torcido, com folhas e uma gema verde.
      ctx.strokeStyle = woodD; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-30, 0);
      for (let x = -30; x <= L - 6; x += 6) ctx.lineTo(x, Math.sin(x * .25) * 2.5); ctx.stroke();
      ctx.strokeStyle = "#8a5a32"; ctx.lineWidth = 4; ctx.stroke();
      for (const [x, y, a] of [[L - 18, -6, -.6], [L - 30, 6, .7], [L - 8, 8, .9], [20, -5, -.5]]) { ctx.fillStyle = "#3f9a3a"; ctx.beginPath(); ctx.ellipse(x, y, 7, 3.2, a, 0, 7); ctx.fill(); ctx.fillStyle = "#6fd06a"; ctx.beginPath(); ctx.ellipse(x - 1, y - 1, 4, 1.5, a, 0, 7); ctx.fill(); }
      ln(L - 6, 0, L + 4, -10, 3, "#5a3e28"); ln(L - 6, 0, L + 4, 10, 3, "#5a3e28");
      gem(L + 4, w.gem); break;
    case "sabreLuz": case "sabreDuplo": {
      // Cabo metálico + lâmina de energia (brilho colorido com núcleo branco).
      const hilt = (a, b) => { ln(a, 0, b, 0, 8, "#2a2e36"); ln(a, 0, b, 0, 5, "#9aa3ab"); for (let x = a + 3; x < b - 2; x += 5) ln(x, -3, x, 3, 1.5, "#2a2e36"); };
      const blade = (x1, x2) => {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        ln(x1, 0, x2, 0, 13, w.glow + "55"); ln(x1, 0, x2, 0, 8, w.glow + "aa"); ln(x1, 0, x2, 0, 3.5, "#ffffff");
        ctx.restore();
      };
      if (id === "sabreDuplo") { hilt(-16, 16); blade(17, L); blade(-17, -L * .95); }
      else { hilt(-12, 12); ln(12, -5, 12, 5, 3, "#c0392b"); blade(13, L); }
      break;
    }
    case "marteloGravitacional": {
      ln(-10, 0, L - 8, 0, 7, "#2a2e36"); ln(-10, 0, L - 8, 0, 3, "#5a6270");
      ctx.fillStyle = "#1e2230"; ctx.fillRect(L - 16, -21, 30, 42);
      ctx.fillStyle = "#3a4258"; ctx.fillRect(L - 14, -19, 26, 38);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const r of [7, 12]) { ctx.strokeStyle = w.glow + (r === 7 ? "ff" : "88"); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(L - 1, 0, r, 0, 7); ctx.stroke(); }
      ctx.fillStyle = "#c8d4ff"; ctx.beginPath(); ctx.arc(L - 1, 0, 3.5, 0, 7); ctx.fill(); ctx.restore();
      break;
    }
    case "punhosCiber":
      ctx.fillStyle = "#2a2e36"; ctx.fillRect(-14, -10, 22, 20); ctx.fillStyle = "#6a7280"; ctx.fillRect(-12, -8, 18, 16);
      for (const y of [-6, 0, 6]) { ctx.fillStyle = "#9aa3ab"; ctx.fillRect(6, y - 2.5, 9, 5); }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = w.glow; ctx.beginPath(); ctx.arc(-4, 0, 3.5, 0, 7); ctx.fill(); ctx.restore();
      break;
    case "pistolaLaser": case "riflePlasma": case "railgun": case "escopetaEnergia": case "granadaPulsar": case "feixeLaser": case "criogenica": case "lancaMisseis": case "drone": {
      // Armas de energia: corpo escuro, detalhes coloridos e uma luz na ponta.
      const C = { pistolaLaser: "#ff4a4a", riflePlasma: "#7dff6a", railgun: "#5ac8ff", escopetaEnergia: "#ffb33a", granadaPulsar: "#ff4ad8", feixeLaser: "#ff3a3a", criogenica: "#8fe3ff", lancaMisseis: "#ffd84a", drone: "#5ac8ff" }[id];
      const body = "#2a2e36", mid = "#4a5260", light = "#7a8494";
      const glowAt = (x, r = 5) => { ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(x, 0, 0, x, 0, r * 3); g.addColorStop(0, C + "ff"); g.addColorStop(1, C + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, 0, r * 3, 0, 7); ctx.fill(); ctx.restore(); };
      if (id === "drone") {
        ctx.fillStyle = body; ctx.fillRect(-4, -4, 14, 10);
        ctx.fillStyle = mid; ctx.beginPath(); ctx.ellipse(18, -2, 14, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = light; ctx.fillRect(4, -10, 28, 2); glowAt(18, 3); break;
      }
      ctx.fillStyle = body; ctx.fillRect(-6, 2, 9, 12); // cabo
      if (id === "lancaMisseis") {
        ctx.fillStyle = body; ctx.fillRect(-20, -9, L + 16, 16); ctx.fillStyle = mid; ctx.fillRect(-18, -7, L + 12, 12);
        ctx.fillStyle = C; ctx.fillRect(L - 10, -6, 6, 10); if (state.loaded !== false) { ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(L - 4, -5); ctx.lineTo(L + 8, -1); ctx.lineTo(L - 4, 3); ctx.fill(); }
        break;
      }
      if (id === "granadaPulsar") { ctx.fillStyle = mid; ctx.beginPath(); ctx.arc(6, 0, 11, 0, 7); ctx.fill(); ctx.fillStyle = body; ctx.fillRect(6, -6, L - 6, 12); glowAt(6, 3); glowAt(L - 2, 3); break; }
      const h = id === "escopetaEnergia" ? 9 : id === "pistolaLaser" ? 6 : 7;
      ctx.fillStyle = body; ctx.fillRect(-10, -h, L + 4, h * 2 - 2);
      ctx.fillStyle = mid; ctx.fillRect(-8, -h + 2, L, h * 2 - 6);
      if (id === "railgun") { ctx.fillStyle = light; ctx.fillRect(10, -h - 4, L - 6, 3); ctx.fillRect(10, h - 1, L - 6, 3); }
      if (id === "riflePlasma") for (let x = 14; x < L - 6; x += 7) { ctx.fillStyle = C + "aa"; ctx.fillRect(x, -h + 1, 3, h * 2 - 4); }
      if (id === "criogenica") { ctx.fillStyle = C + "aa"; ctx.beginPath(); ctx.ellipse(8, -h - 3, 9, 5, 0, 0, 7); ctx.fill(); }
      if (id === "escopetaEnergia") { ctx.fillStyle = light; ctx.fillRect(L - 12, -h + 2, 14, 4); ctx.fillRect(L - 12, h - 7, 14, 4); }
      ctx.fillStyle = C; ctx.fillRect(4, -2, L - 14, 3);
      glowAt(L + 2, id === "pistolaLaser" ? 3 : 4);
      break;
    }
    case "manoplaGolem": {
      // Punho de pedra com cristais em brasa, num cabo curto.
      shaft(-8, L - 18, 7);
      ctx.fillStyle = "#5a4a3a"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = 19 + (i % 2) * 4; ctx.lineTo(L + Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
      ctx.fillStyle = "#8a7a6a"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, r = 15 + (i % 2) * 4; ctx.lineTo(L - 2 + Math.cos(a) * r, -2 + Math.sin(a) * r); } ctx.fill();
      ctx.fillStyle = "#ff9a3a"; ctx.shadowColor = "#ff7a1a"; ctx.shadowBlur = 10;
      for (const [x, y] of [[L - 6, -8], [L + 8, 4], [L - 4, 9]]) { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 3, y); ctx.fill(); }
      ctx.shadowBlur = 0; break;
    }
    case "cetroMortos": {
      // Cetro dourado com uma caveira brilhando na ponta.
      ln(-10, 0, L - 12, 0, 6, "#5a4a1a"); ln(-10, 0, L - 12, 0, 3.5, gold);
      for (const x of [8, 26, 44]) ln(x, -4, x, 4, 3, "#5a4a1a");
      const g = ctx.createRadialGradient(L, 0, 2, L, 0, 26); g.addColorStop(0, "#b06cffaa"); g.addColorStop(1, "#b06cff00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L, 0, 26, 0, 7); ctx.fill();
      ctx.fillStyle = "#efe8d6"; ctx.beginPath(); ctx.arc(L, -2, 11, 0, 7); ctx.fill(); ctx.fillRect(L - 6, 5, 12, 7);
      ctx.fillStyle = "#2a1a3a"; ctx.beginPath(); ctx.arc(L - 4, -3, 3, 0, 7); ctx.arc(L + 4, -3, 3, 0, 7); ctx.fill();
      ctx.fillRect(L - 4, 7, 2, 4); ctx.fillRect(L, 7, 2, 4); ctx.fillRect(L + 3, 7, 1.5, 4);
      ctx.fillStyle = "#c58bff"; ctx.beginPath(); ctx.arc(L - 4, -3, 1.3, 0, 7); ctx.arc(L + 4, -3, 1.3, 0, 7); ctx.fill();
      break;
    }
    case "cajadoSombrio": {
      // Cajado escuro com um aglomerado de cristais roxos.
      ln(-30, 0, L - 8, 0, 7, "#1a0f24"); ln(-30, 0, L - 8, 0, 4, "#3a2a4a");
      ctx.strokeStyle = "#c58bff"; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = -26; x < L - 12; x += 10) { ctx.moveTo(x, -3); ctx.lineTo(x + 5, 3); } ctx.stroke();
      const g = ctx.createRadialGradient(L + 4, 0, 2, L + 4, 0, 30); g.addColorStop(0, "#c58bffcc"); g.addColorStop(1, "#c58bff00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L + 4, 0, 30, 0, 7); ctx.fill();
      for (const [dx, dy, h, a] of [[0, 0, 22, 0], [-6, -6, 15, -.6], [-6, 6, 15, .6], [4, -9, 12, -.3]]) {
        ctx.save(); ctx.translate(L + dx, dy); ctx.rotate(a); ctx.fillStyle = "#6a2fa0"; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(h, 0); ctx.lineTo(0, 5); ctx.fill();
        ctx.fillStyle = "#e0c0ff"; ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(h * .8, 0); ctx.lineTo(0, 0); ctx.fill(); ctx.restore();
      }
      break;
    }
    case "cajadoFogo": case "cajadoGelo": case "cajadoTrovao": case "cajadoVida":
      shaft(-30, L - 6);
      ln(L - 8, 0, L + 4, -10, 3, gold); ln(L - 8, 0, L + 4, 10, 3, gold); ln(L - 8, 0, L - 2, 0, 5, gold);
      gem(L + 4, w.gem); break;
    case "varinha":
      ln(-6, 0, L, 0, 4, "#2a1f17"); ln(-6, 0, 8, 0, 5, gold);
      ctx.save(); ctx.translate(L + 4, 0);
      { const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 14); g.addColorStop(0, w.gem + "dd"); g.addColorStop(1, w.gem + "00"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.5 : 6, a = i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill(); ctx.restore(); break;
    case "guitarra": {
      ctx.fillStyle = "#8a1f1a"; ctx.beginPath(); ctx.ellipse(-6, 2, 14, 12, 0, 0, 7); ctx.ellipse(10, 1, 10, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#d8402a"; ctx.beginPath(); ctx.ellipse(-6, 1, 12, 10, 0, 0, 7); ctx.ellipse(10, 0, 8.5, 7.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#f3ead2"; ctx.beginPath(); ctx.ellipse(-10, 4, 6, 4, -.3, 0, 7); ctx.fill();
      ctx.fillStyle = "#1a0a08"; ctx.beginPath(); ctx.arc(4, 0, 4, 0, 7); ctx.fill();
      ln(14, 0, L - 6, 0, 5, woodD); ln(14, -1, L - 6, -1, 1.3, "#c9a86a");
      for (let x = 20; x < L - 8; x += 7) ln(x, -2.4, x, 2.4, .8, gold);
      ctx.fillStyle = "#3a2010"; ctx.fillRect(L - 8, -5, 12, 10);
      ctx.fillStyle = gold; for (const px of [L - 5, L]) { ctx.beginPath(); ctx.arc(px, -6.5, 1.7, 0, 7); ctx.arc(px, 6.5, 1.7, 0, 7); ctx.fill(); }
      ln(-14, -1, L - 6, -1, .6, "#eeeeee"); ln(-14, 1, L - 6, 1, .6, "#eeeeee");
      break;
    }
    case "tambor": {
      ctx.fillStyle = "#8a2a1a"; ctx.fillRect(-4, -13, 24, 26);
      ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(-4 + i * 4, i % 2 ? 10 : -10); ctx.stroke();
      ctx.fillStyle = "#5a1a10"; ctx.fillRect(-4, -14, 24, 3.5); ctx.fillRect(-4, 10.5, 24, 3.5);
      ctx.fillStyle = "#d8c8a8"; ctx.beginPath(); ctx.ellipse(-4, 0, 4, 13.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#f3e6c8"; ctx.beginPath(); ctx.ellipse(20, 0, 4, 13.5, 0, 0, 7); ctx.fill();
      ln(20, -4, 30, -14, 2.5, woodD); ctx.fillStyle = "#f3e6c8"; ctx.beginPath(); ctx.arc(30, -14, 3, 0, 7); ctx.fill();
      break;
    }
    case "flauta":
      ln(-4, 0, L, 0, 5.5, "#6a3a1a"); ln(-4, -1.3, L, -1.3, 1.8, "#b07a4a");
      ctx.fillStyle = "#2a1408"; for (let x = 12; x < L - 4; x += 6) { ctx.beginPath(); ctx.arc(x, 0, 1.4, 0, 7); ctx.fill(); }
      ln(L - 1, -3.5, L - 1, 3.5, 2.2, gold); ln(0, -3.5, 0, 3.5, 2.2, gold); break;
    case "trompete": {
      ctx.strokeStyle = "#c8962a"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(10, 5, 9, 5, 0, 0, 7); ctx.stroke();
      ln(-4, 0, L - 10, 0, 4.5, "#a87a20"); ln(-4, -1.2, L - 10, -1.2, 1.5, "#ffe9a0");
      poly([L - 12, -2.5, L + 2, -11, L + 2, 11, L - 12, 2.5], "#e8b84a");
      ctx.fillStyle = "#7a5a10"; ctx.beginPath(); ctx.ellipse(L + 2, 0, 2.6, 11, 0, 0, 7); ctx.fill();
      for (const x of [6, 10, 14]) { ln(x, -3, x, -8, 2.4, "#ffe9a0"); ctx.fillStyle = "#fff6d0"; ctx.beginPath(); ctx.arc(x, -9, 1.8, 0, 7); ctx.fill(); }
      break;
    }
    case "lampada": {
      ctx.strokeStyle = "#a87a20"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-7, 2, 5.5, Math.PI * .45, Math.PI * 1.6); ctx.stroke();
      poly([12, -1, 27, -7, 29, -4.5, 15, 5], "#c8962a");
      ctx.fillStyle = "#a87a20"; ctx.beginPath(); ctx.ellipse(5, 3, 12, 7.5, 0, 0, 7); ctx.fill();
      const g = ctx.createLinearGradient(0, -5, 0, 8); g.addColorStop(0, "#fff0a8"); g.addColorStop(1, "#c8962a");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(5, 2, 10.5, 5.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#c8962a"; ctx.beginPath(); ctx.ellipse(5, -4, 5.5, 2.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(5, -7.5, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#5ac8ff"; ctx.beginPath(); ctx.arc(5, 3, 2, 0, 7); ctx.fill();
      if (state.casting) { ctx.fillStyle = "#8fe3ffaa"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(29 + i * 3, -9 - i * 6, 3 + i * 1.5, 0, 7); ctx.fill(); } }
      break;
    }
    case "ampulheta": {
      ctx.fillStyle = "#cfe9f6cc"; ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(11, -1.6); ctx.lineTo(13, -1.6); ctx.lineTo(22, -9); ctx.lineTo(22, 9); ctx.lineTo(13, 1.6); ctx.lineTo(11, 1.6); ctx.lineTo(2, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8c06a"; ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(21, 8); ctx.lineTo(21, -8); ctx.lineTo(19, -6); ctx.fill();
      ctx.fillStyle = "#e8c06a"; ctx.beginPath(); ctx.moveTo(3, -8); ctx.lineTo(9, -3); ctx.lineTo(3, -3); ctx.fill();
      ctx.fillStyle = "#6a4a2a"; ctx.fillRect(-2, -12, 4.5, 24); ctx.fillRect(21.5, -12, 4.5, 24);
      ctx.fillStyle = gold; ctx.fillRect(-2, -12, 4.5, 3); ctx.fillRect(-2, 9, 4.5, 3); ctx.fillRect(21.5, -12, 4.5, 3); ctx.fillRect(21.5, 9, 4.5, 3);
      ctx.fillStyle = "#ffffff88"; ctx.fillRect(4, -6, 2, 4);
      break;
    }
    case "espiritoEstelar": {
      ctx.fillStyle = "#4a2a7a"; ctx.beginPath(); ctx.arc(8, 0, 9.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#7a4ac0"; ctx.beginPath(); ctx.arc(7, -1, 7.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a2a7a"; for (let i = 0; i < 3; i++) ctx.fillRect(11, -5 + i * 3.5, 6, 2);
      ctx.fillStyle = gold; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 4, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(6 + Math.cos(a) * r, -1 + Math.sin(a) * r); } ctx.fill();
      ln(-4, 0, 1, 0, 6, "#d8c8f0");
      break;
    }
    case "bombasClassicas": drawClassicBomb(ctx, 13, 0, 12.5, true, state.tint || 0); break;
    case "katana": {
      ln(-16, 0, 8, 0, 6.5, "#1a1a2a");
      ctx.fillStyle = "#e8e8f0"; for (let x = -13; x < 7; x += 5) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 2.5, 0); ctx.lineTo(x, 3); ctx.lineTo(x - 2.5, 0); ctx.fill(); }
      ctx.fillStyle = gold; ctx.beginPath(); ctx.ellipse(9.5, 0, 2.6, 7.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = steelD; ctx.beginPath(); ctx.moveTo(12, -3); ctx.quadraticCurveTo(L * .6, -8, L + 4, -5); ctx.quadraticCurveTo(L * .6, 1.5, 12, 3); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, -7, 0, 1); g.addColorStop(0, "#ffffff"); g.addColorStop(1, steel);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(12, -2.4); ctx.quadraticCurveTo(L * .6, -7, L + 2, -4.6); ctx.quadraticCurveTo(L * .6, -2, 12, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#9aa3ab"; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(14, -.6); ctx.quadraticCurveTo(L * .55, -3.4, L - 6, -3.2); ctx.stroke();
      break;
    }
    case "shuriken": ctx.save(); ctx.translate(8, 0); drawStar4(ctx, 10, 3.2); ctx.restore(); break;
    case "marteloBrinquedo": {
      ln(-8, 0, L - 16, 0, 6.5, "#ffd84a"); for (let x = -4; x < L - 18; x += 10) ln(x, 0, x + 4, 0, 6.5, "#e74c3c");
      ctx.fillStyle = "#d8402a"; ctx.fillRect(L - 18, -17, 26, 34);
      ctx.fillStyle = "#ff8a6a"; ctx.fillRect(L - 14, -14, 18, 5);
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(L - 18, 0, 5, 17, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(L + 8, 0, 5, 17, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff6"; ctx.beginPath(); ctx.ellipse(L + 7, -6, 1.6, 5, 0, 0, 7); ctx.fill();
      break;
    }
    case "ondaKi": {
      const g = ctx.createRadialGradient(12, 0, 1, 12, 0, 18); g.addColorStop(0, "#ffffff"); g.addColorStop(.35, "#8fe3ffee"); g.addColorStop(1, "#5ac8ff00");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(12, 0, 18, 0, 7); ctx.fill();
      ctx.fillStyle = "#e8fbff"; ctx.beginPath(); ctx.arc(12, 0, 5.5, 0, 7); ctx.fill();
      break;
    }
    case "shurikenGigante": ctx.save(); ctx.translate(18, 0); drawStar4(ctx, 24, 7, true); ctx.restore(); ln(-6, 0, 2, 0, 5, "#2a1a1a"); break;
    case "violino": {
      ctx.fillStyle = "#3a1408"; ctx.beginPath(); ctx.ellipse(-6, 0, 11, 10, 0, 0, 7); ctx.ellipse(9, 0, 9, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#7a2a3a"; ctx.beginPath(); ctx.ellipse(-6, -.5, 9.5, 8.5, 0, 0, 7); ctx.ellipse(9, -.5, 7.5, 6.5, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#1a0505"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, -5); ctx.quadraticCurveTo(0, 0, -2, 5); ctx.moveTo(5, -5); ctx.quadraticCurveTo(3, 0, 5, 5); ctx.stroke();
      ln(14, 0, L - 4, 0, 4, "#1a0a05"); ctx.fillStyle = "#1a0a05"; ctx.beginPath(); ctx.arc(L - 2, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#b06cff"; ctx.beginPath(); ctx.arc(L - 2, 0, 1.8, 0, 7); ctx.fill();
      ln(-14, -1, L - 6, -1, .5, "#e8e0ff"); ln(-14, 1, L - 6, 1, .5, "#e8e0ff");
      break;
    }
    case "canhaoBraco": {
      // Mega Buster: canhão grosso cobrindo o antebraço, frente arredondada; a cor muda com o poder.
      const pal = (typeof MM_POWERS !== "undefined" && MM_POWERS[state.tint || 0]) || { c1: "#2a7ad8", c2: "#7ac8ff" };
      const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
      const dark = lookShade(pal.c1, -.45);
      // Punho (cobre a mão e o antebraço).
      let g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, pal.c2); g.addColorStop(.4, pal.c1); g.addColorStop(1, dark);
      ctx.fillStyle = g; rr(-22, -16, 32, 32, 14); ctx.fill();
      ctx.fillStyle = lookShade(pal.c2, .3); for (const x of [-15, -8]) ctx.fillRect(x, -15, 3, 30);
      // Cano.
      g = ctx.createLinearGradient(0, -13, 0, 13); g.addColorStop(0, "#ffffff"); g.addColorStop(.2, pal.c2); g.addColorStop(.6, pal.c1); g.addColorStop(1, dark);
      ctx.fillStyle = g; rr(4, -13, L + 2, 26, 12); ctx.fill();
      ctx.fillStyle = dark; ctx.fillRect(5, -14, 5, 28);
      ctx.fillStyle = "#ffffff66"; rr(13, -10, L - 13, 4, 2); ctx.fill();
      ctx.fillStyle = "#00000033"; rr(13, 6, L - 13, 4, 2); ctx.fill();
      // Boca do cano com o núcleo brilhando.
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(L + 5, 0, 5.5, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#0a1020"; ctx.beginPath(); ctx.ellipse(L + 6, 0, 3.4, 7, 0, 0, 7); ctx.fill();
      if (state.loaded) { ctx.fillStyle = pal.c2; ctx.beginPath(); ctx.ellipse(L + 6, 0, 1.8, 3.6, 0, 0, 7); ctx.fill(); }
      break;
    }
    case "anelLanterna": {
      // Anel do Lanterna Verde: aro grosso no dedo, cabeça quadrada e a joia com o símbolo da lanterna.
      ctx.globalCompositeOperation = "lighter";
      let gg = ctx.createRadialGradient(13, 0, 2, 13, 0, 30); gg.addColorStop(0, "#9dff8a80"); gg.addColorStop(.5, "#3aff5a30"); gg.addColorStop(1, "#3aff5a00");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(13, 0, 30, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      // Aro (visto de lado, passando pelo dedo).
      ctx.lineWidth = 5.5; ctx.strokeStyle = "#0b4a1c"; ctx.beginPath(); ctx.ellipse(2, 0, 4.5, 9.5, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = "#2fb84a"; ctx.beginPath(); ctx.ellipse(2, 0, 4.5, 9.5, 0, -1.9, 1.2); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.strokeStyle = "#c8ffb8"; ctx.beginPath(); ctx.ellipse(2, 0, 4.5, 9.5, 0, -1.6, -.4); ctx.stroke();
      // Cabeça do anel (moldura).
      let g = ctx.createLinearGradient(6, -11, 6, 11); g.addColorStop(0, "#5ae86a"); g.addColorStop(.45, "#1a9a34"); g.addColorStop(1, "#0a4a18");
      ctx.fillStyle = "#06300f"; ctx.beginPath(); ctx.roundRect(5, -11.5, 17, 23, 5); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(6, -10.5, 15, 21, 4); ctx.fill();
      // Joia verde brilhante.
      g = ctx.createRadialGradient(12, -3, 1, 13.5, 0, 8.5); g.addColorStop(0, "#f2ffe8"); g.addColorStop(.35, "#9dff7a"); g.addColorStop(.8, "#22c83a"); g.addColorStop(1, "#0a7a22");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(13.5, 0, 7.6, 0, 7); ctx.fill();
      // Símbolo da lanterna: círculo com uma barra em cima e outra embaixo.
      ctx.strokeStyle = "#063a12"; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(13.5, 0, 3.6, 0, 7); ctx.stroke();
      ctx.fillStyle = "#063a12"; ctx.fillRect(9.4, -6.3, 8.2, 1.7); ctx.fillRect(9.4, 4.6, 8.2, 1.7);
      ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.ellipse(10.8, -3.6, 2.2, 1.2, -.6, 0, 7); ctx.fill();
      break;
    }
    case "lacoVerdade": {
      // Laço da Verdade: corda dourada trançada enrolada na mão, com o bracelete prateado no pulso.
      ctx.globalCompositeOperation = "lighter";
      const gg = ctx.createRadialGradient(13, 0, 2, 13, 0, 30); gg.addColorStop(0, "#ffe27a70"); gg.addColorStop(1, "#ffd84a00");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(13, 0, 30, 0, 7); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      // Ponta solta da corda caindo.
      const rope = (draw) => { for (const [w, c, dash] of [[5.5, "#7a4a0a", null], [3.6, "#f2b82a", null], [1.6, "#fff0a0", [3, 3.5]]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); draw(); ctx.stroke(); } ctx.setLineDash([]); };
      rope(() => { ctx.moveTo(18, 9); ctx.bezierCurveTo(24, 16, 16, 22, 22, 28); });
      ctx.fillStyle = "#f2b82a"; ctx.beginPath(); ctx.arc(22, 28.5, 2.6, 0, 7); ctx.fill();
      // Voltas do laço.
      for (let i = 0; i < 3; i++) rope(() => ctx.ellipse(9 + i * 4, 0, 9.5 - i * .6, 14 - i * 1.6, .28, 0, 7));
      // Bracelete prateado com a estrela.
      const gb = ctx.createLinearGradient(0, -10, 0, 10); gb.addColorStop(0, "#ffffff"); gb.addColorStop(.4, "#c8d2dc"); gb.addColorStop(1, "#6a7480");
      ctx.fillStyle = "#3a424c"; ctx.beginPath(); ctx.roundRect(-9, -9.5, 8, 19, 2.5); ctx.fill();
      ctx.fillStyle = gb; ctx.beginPath(); ctx.roundRect(-8.2, -8.6, 6.4, 17.2, 2); ctx.fill();
      ctx.fillStyle = "#e8b84a"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.4 : 3.2, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(-5 + Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
      break;
    }
    case "laminasCaos": {
      // Cabo das Lâminas do Caos: empunhadura de couro com anéis de bronze; a corrente sai da ponta.
      ctx.fillStyle = "#2a1610"; ctx.beginPath(); ctx.roundRect(-8, -4.5, L + 6, 9, 3); ctx.fill();
      ctx.strokeStyle = "#5a3220"; ctx.lineWidth = 2; for (let x = -6; x < L - 2; x += 4.5) { ctx.beginPath(); ctx.moveTo(x, -4.5); ctx.lineTo(x + 3, 4.5); ctx.stroke(); }
      for (const x of [-8, L - 4]) { const gb = ctx.createLinearGradient(0, -6, 0, 6); gb.addColorStop(0, "#f0c070"); gb.addColorStop(1, "#7a4a1a"); ctx.fillStyle = gb; ctx.beginPath(); ctx.roundRect(x - 1, -6, 5, 12, 1.5); ctx.fill(); }
      ctx.fillStyle = "#c83a1a"; ctx.beginPath(); ctx.arc(-11, 0, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = "#ffb070"; ctx.beginPath(); ctx.arc(-12, -1.5, 1.5, 0, 7); ctx.fill();
      if (state.icon) {
        // No ícone: corrente em brasa e a lâmina curva na ponta.
        for (let i = 0; i < 4; i++) { const x = L + 4 + i * 9, y = Math.sin(i * .9) * 3; ctx.strokeStyle = "#1a0e0a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(x, y, 5.5, i % 2 ? 1.6 : 3.4, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = i % 2 ? "#ff8a3a" : "#8a4a28"; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.save(); ctx.translate(L + 46, 2); ctx.rotate(.1); drawChaosBladeShape(ctx); ctx.restore();
      }
      break;
    }
    case "laminaTerra": {
      // Lâmina da Terra (Terraria): lâmina verde larga, guarda em asas e uma joia no cabo.
      // Pomo e cabo enrolado.
      ctx.fillStyle = "#1a3a24"; ctx.beginPath(); ctx.roundRect(-14, -5, 18, 10, 3); ctx.fill();
      ctx.strokeStyle = "#3f8a52"; ctx.lineWidth = 1.3; ctx.lineCap = "butt"; for (let x = -12; x < 2; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, -4.4); ctx.lineTo(x + 2.4, 4.4); ctx.stroke(); } ctx.lineCap = "round";
      let g = ctx.createRadialGradient(-17, -1.5, .5, -16, 0, 6); g.addColorStop(0, "#f2fff0"); g.addColorStop(.5, "#5ae8a8"); g.addColorStop(1, "#0a6a4a");
      ctx.fillStyle = "#e8c85a"; ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-22, 0); ctx.lineTo(-14, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-16.5, 0, 3.6, 0, 7); ctx.fill();
      // Guarda em forma de asas, virada pra lâmina.
      g = ctx.createLinearGradient(0, -20, 0, 20); g.addColorStop(0, "#9af0c8"); g.addColorStop(.5, "#1f9a6a"); g.addColorStop(1, "#9af0c8");
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(2, -4); ctx.quadraticCurveTo(2, -16, 16, -21); ctx.quadraticCurveTo(10, -13, 12, -6); ctx.lineTo(12, 6); ctx.quadraticCurveTo(10, 13, 16, 21); ctx.quadraticCurveTo(2, 16, 2, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#e8c85a"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(4, -6); ctx.quadraticCurveTo(5, -14, 14, -19); ctx.moveTo(4, 6); ctx.quadraticCurveTo(5, 14, 14, 19); ctx.stroke();
      // Lâmina: borda escura, corpo verde-limão, faixa clara no meio e reflexo.
      ctx.fillStyle = "#0e5a26"; ctx.beginPath(); ctx.moveTo(11, -7.5); ctx.lineTo(L * .45, -11); ctx.lineTo(L - 9, -8.5); ctx.lineTo(L + 7, 0); ctx.lineTo(L - 9, 8.5); ctx.lineTo(L * .45, 11); ctx.lineTo(11, 7.5); ctx.closePath(); ctx.fill();
      g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, "#d8ffb0"); g.addColorStop(.3, "#7ef04a"); g.addColorStop(.7, "#3ac83a"); g.addColorStop(1, "#1a8a2a");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(L * .45, -9.2); ctx.lineTo(L - 9.5, -7); ctx.lineTo(L + 4, 0); ctx.lineTo(L - 9.5, 7); ctx.lineTo(L * .45, 9.2); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
      // Losangos de energia ao longo da lâmina.
      ctx.fillStyle = "#e8ffd0"; for (let i = 0; i < 4; i++) { const x = 20 + i * (L - 30) / 4, s = 3.6 - i * .4; ctx.beginPath(); ctx.moveTo(x - s * 2, 0); ctx.lineTo(x, -s); ctx.lineTo(x + s * 2, 0); ctx.lineTo(x, s); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = "#f6fff0"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(L - 2, 0); ctx.stroke();
      ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(14, -4.6); ctx.lineTo(L * .45, -7.4); ctx.lineTo(L - 10, -5.6); ctx.stroke();
      ctx.fillStyle = "#ff6fb5"; ctx.beginPath(); ctx.arc(8, 0, 3.2, 0, 7); ctx.fill(); ctx.fillStyle = "#ffd0e8"; ctx.beginPath(); ctx.arc(7.2, -1, 1.1, 0, 7); ctx.fill();
      break;
    }
    case "alhoPoro": {
      // Alho-poró da Miku: talo branco, folhas verdes abertas em leque e um laço azul-turquesa.
      // Raízes.
      ctx.strokeStyle = "#d8c8a0"; ctx.lineWidth = 1.3;
      for (let i = 0; i < 7; i++) { const y = -4 + i * 1.4; ctx.beginPath(); ctx.moveTo(-9, y); ctx.quadraticCurveTo(-13, y + (i - 3) * 1.5, -17 - (i % 3) * 2, y + (i - 3) * 2.6); ctx.stroke(); }
      // Folhas (atrás do talo).
      const leaf = (ang, len, wid, c1, c2) => {
        ctx.save(); ctx.translate(L * .56, 0); ctx.rotate(ang);
        const lg = ctx.createLinearGradient(0, 0, len, 0); lg.addColorStop(0, c1); lg.addColorStop(1, c2);
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, -wid * .55); ctx.quadraticCurveTo(len * .55, -wid * 1.1, len, -wid * .15); ctx.quadraticCurveTo(len * .55, wid * .7, 0, wid * .55); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#ffffff55"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(len * .5, -wid * .2, len * .92, -wid * .15); ctx.stroke();
        ctx.restore();
      };
      leaf(.55, L * .38, 10, "#5ab84a", "#1a6a24"); leaf(-.38, L * .5, 12, "#6ac84a", "#1e7a2a"); leaf(.28, L * .48, 11, "#7ad85a", "#2a8a34"); leaf(-.06, L * .58, 13, "#8ae05a", "#2a9a3a");
      // Talo branco com listras e o meio esverdeando.
      let g = ctx.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, "#ffffff"); g.addColorStop(.5, "#f4f0e0"); g.addColorStop(1, "#c8c0a0");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-9, -6.5); ctx.lineTo(L * .6, -6); ctx.lineTo(L * .6, 6); ctx.lineTo(-9, 6.5); ctx.quadraticCurveTo(-13, 0, -9, -6.5); ctx.fill();
      g = ctx.createLinearGradient(L * .3, 0, L * .6, 0); g.addColorStop(0, "rgba(168,216,112,0)"); g.addColorStop(1, "rgba(120,200,80,.9)");
      ctx.fillStyle = g; ctx.fillRect(L * .3, -6, L * .3, 12);
      ctx.strokeStyle = "#d8d0b0"; ctx.lineWidth = .9; for (const y of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(-6, y); ctx.lineTo(L * .58, y * .9); ctx.stroke(); }
      ctx.fillStyle = "#ffffffcc"; ctx.fillRect(-4, -5, L * .5, 1.6);
      // Laço turquesa da Miku.
      const bx = 10;
      // Faixa em volta do talo, duas pontas caindo e o laço com duas alças.
      ctx.fillStyle = "#39c5bb"; ctx.fillRect(bx - 2.5, -6.8, 5, 13.6);
      ctx.fillStyle = "#1e8a84"; ctx.beginPath(); ctx.moveTo(bx - 1, 5); ctx.quadraticCurveTo(bx - 7, 11, bx - 9, 17); ctx.lineTo(bx - 5, 16); ctx.lineTo(bx - 4, 19); ctx.quadraticCurveTo(bx - 2, 11, bx + 1, 6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 1, 5); ctx.quadraticCurveTo(bx + 6, 11, bx + 10, 16); ctx.lineTo(bx + 6, 16.5); ctx.lineTo(bx + 6, 19.5); ctx.quadraticCurveTo(bx + 3, 11, bx - 1, 6); ctx.closePath(); ctx.fill();
      for (const s of [-1, 1]) {
        ctx.fillStyle = "#39c5bb"; ctx.beginPath(); ctx.ellipse(bx + s * 6.5, -1, 7, 4.6, s * .5, 0, 7); ctx.fill();
        ctx.fillStyle = "#1e8a84"; ctx.beginPath(); ctx.ellipse(bx + s * 6, -.6, 3.4, 1.8, s * .5, 0, 7); ctx.fill();
      }
      ctx.fillStyle = "#5ae8dc"; ctx.beginPath(); ctx.roundRect(bx - 3, -3.5, 6, 6, 1.5); ctx.fill(); ctx.fillStyle = "#c8fff8"; ctx.fillRect(bx - 2, -2.5, 1.5, 3);
      break;
    }
    case "crisol": {
      // Crisol do Slayer: cabo de metal com espinhos e lâmina de energia vermelha com estalos.
      const tt = typeof time !== "undefined" ? time : 0;
      let g = ctx.createLinearGradient(0, -9, 0, 9); g.addColorStop(0, "#8a8a94"); g.addColorStop(.5, "#3a3a42"); g.addColorStop(1, "#1a1a1e");
      poly([-26, 0, -18, -6, -18, 6], "#2a2a30");
      ctx.fillStyle = "#1e1e24"; ctx.beginPath(); ctx.roundRect(-19, -5, 19, 10, 2); ctx.fill();
      ctx.fillStyle = `rgba(255,60,30,${.7 + Math.sin(tt * 9) * .3})`; for (const x of [-15, -10, -5]) ctx.fillRect(x, -3.5, 2.5, 7);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-1, -10); ctx.lineTo(13, -8); ctx.lineTo(20, -13); ctx.lineTo(17, -4); ctx.lineTo(17, 4); ctx.lineTo(20, 13); ctx.lineTo(13, 8); ctx.lineTo(-1, 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#0e0e10"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#ff3a1a"; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(8, -4); ctx.lineTo(12, 0); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const bl = (w2, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(16, -6 - w2); ctx.lineTo(L - 8, -4 - w2 * .7); ctx.lineTo(L + 9 + w2, 0); ctx.lineTo(L - 8, 4 + w2 * .7); ctx.lineTo(16, 6 + w2); ctx.closePath(); ctx.fill(); };
      bl(7, "rgba(255,30,10,.25)"); bl(3, "rgba(255,60,20,.55)"); bl(0, "rgba(255,110,40,.85)");
      ctx.fillStyle = "rgba(255,230,190,.95)"; ctx.beginPath(); ctx.moveTo(17, -2); ctx.lineTo(L, -1); ctx.lineTo(L + 5, 0); ctx.lineTo(L, 1); ctx.lineTo(17, 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200,.8)"; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const x0 = 20 + ((i * 23 + Math.floor(tt * 12) * 17) % Math.max(10, L - 30)); ctx.beginPath(); ctx.moveTo(x0, -4); ctx.lineTo(x0 + 4, 1); ctx.lineTo(x0 + 7, -2); ctx.lineTo(x0 + 11, 3); ctx.stroke(); }
      ctx.restore();
      break;
    }
    case "bfg": {
      // BFG 9000: corpo pesado, tubos de energia verde e boca enorme brilhando.
      let g = ctx.createLinearGradient(0, -13, 0, 12); g.addColorStop(0, "#7a8a70"); g.addColorStop(.45, "#3e4a38"); g.addColorStop(1, "#1a2018");
      ctx.fillStyle = "#1a1e18"; ctx.beginPath(); ctx.roundRect(-22, -7, 16, 14, 3); ctx.fill();
      ctx.fillStyle = "#2a2e28"; ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(1, 20); ctx.lineTo(-6, 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-8, -13, L - 2, 24, 5); ctx.fill();
      ctx.strokeStyle = "#141810"; ctx.lineWidth = 1.2; for (const x of [6, 22, L - 16]) { ctx.beginPath(); ctx.moveTo(x, -12); ctx.lineTo(x, 10); ctx.stroke(); }
      // Tubos de energia.
      for (const y of [-9, 4]) { ctx.fillStyle = "#0e2a10"; ctx.beginPath(); ctx.roundRect(8, y, 26, 5, 2.5); ctx.fill(); ctx.fillStyle = "#7dff5a"; ctx.beginPath(); ctx.roundRect(9, y + 1, 24, 3, 1.5); ctx.fill(); }
      // Alça de cima e faixas de aviso.
      ctx.strokeStyle = "#2a2e28"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(4, -13); ctx.quadraticCurveTo(16, -24, 30, -13); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(L - 14, -13, 8, 24); ctx.clip(); ctx.fillStyle = "#e8c83a"; ctx.fillRect(L - 14, -13, 8, 24); ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 2.5; for (let y = -16; y < 14; y += 6) { ctx.beginPath(); ctx.moveTo(L - 15, y); ctx.lineTo(L - 5, y + 8); ctx.stroke(); } ctx.restore();
      // Boca do canhão.
      ctx.fillStyle = "#0e100c"; ctx.beginPath(); ctx.ellipse(L - 2, -1, 9, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#3a4a34"; ctx.beginPath(); ctx.ellipse(L - 2, -1, 9, 16, 0, -1.4, 1.4); ctx.lineTo(L - 2, -1); ctx.fill();
      g = ctx.createRadialGradient(L, -1, 1, L, -1, 11); g.addColorStop(0, "#f0ffe0"); g.addColorStop(.4, "#7dff5a"); g.addColorStop(1, "#1a6a10");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(L, -1, 6, 11, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(L + 4, -1, 2, L + 4, -1, 28); gg.addColorStop(0, "#9dff7a66"); gg.addColorStop(1, "#7dff5a00"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(L + 4, -1, 28, 0, 7); ctx.fill(); ctx.restore();
      break;
    }
    case "espadaMestra": {
      // Espada Mestra: cabo azul, guarda em asas roxas com joia amarela e a Triforce na lâmina.
      ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-19, 0); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2a3a8a"; ctx.beginPath(); ctx.roundRect(-14, -4, 17, 8, 2); ctx.fill();
      ctx.strokeStyle = "#5a7ad8"; ctx.lineWidth = 1.3; for (let x = -12; x < 2; x += 3.5) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + 2.2, 4); ctx.stroke(); }
      let g = ctx.createLinearGradient(0, -18, 0, 18); g.addColorStop(0, "#9a7ae8"); g.addColorStop(.5, "#3a2a8a"); g.addColorStop(1, "#9a7ae8");
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(3, -3); ctx.quadraticCurveTo(2, -12, 9, -19); ctx.quadraticCurveTo(9, -10, 12, -5); ctx.lineTo(12, 5); ctx.quadraticCurveTo(9, 10, 9, 19); ctx.quadraticCurveTo(2, 12, 3, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.moveTo(7, -3.5); ctx.lineTo(10, 0); ctx.lineTo(7, 3.5); ctx.lineTo(4, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = steelD; ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(L - 10, -4.5); ctx.lineTo(L + 6, 0); ctx.lineTo(L - 10, 4.5); ctx.lineTo(12, 6); ctx.closePath(); ctx.fill();
      g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, "#ffffff"); g.addColorStop(.45, "#dfe8f4"); g.addColorStop(1, "#9aa8bc");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(13, -4.8); ctx.lineTo(L - 10, -3.4); ctx.lineTo(L + 3, 0); ctx.lineTo(L - 10, 3.4); ctx.lineTo(13, 4.8); ctx.closePath(); ctx.fill();
      ln(16, 0, L - 6, 0, 1.2, "#7a88a0");
      ctx.fillStyle = "#e8b84a"; const tri = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .9, y + s * .6); ctx.lineTo(x - s * .9, y + s * .6); ctx.closePath(); ctx.fill(); };
      tri(18, -1.2, 2); tri(16.2, 1.8, 2); tri(19.8, 1.8, 2);
      break;
    }
    case "keyblade": {
      // Keyblade: guarda dourada em forma de alça, haste prateada, dentes da chave e o chaveiro.
      ctx.strokeStyle = "#8a6a1a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-18, 14, -16, 18); ctx.stroke();
      ctx.fillStyle = "#1a1a1a"; for (const [x, y, r] of [[-16, 23, 4], [-19.5, 19, 2.6], [-12.5, 19, 2.6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#2a3a7a"; ctx.beginPath(); ctx.roundRect(-11, -3.5, 14, 7, 2); ctx.fill();
      ctx.strokeStyle = "#8a6a1a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(-14, -15, 20, 30, 8); ctx.stroke();
      ctx.strokeStyle = "#ffd84a"; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.strokeStyle = "#fff4b0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -14); ctx.lineTo(2, -14); ctx.stroke();
      let g = ctx.createLinearGradient(0, -3, 0, 3); g.addColorStop(0, "#ffffff"); g.addColorStop(.5, "#c8d0d8"); g.addColorStop(1, "#7a848e");
      ctx.fillStyle = "#4a525a"; ctx.fillRect(6, -3.6, L - 12, 7.2);
      ctx.fillStyle = g; ctx.fillRect(6, -2.6, L - 12, 5.2);
      // Dentes da chave (coroa).
      ctx.fillStyle = "#4a525a"; ctx.beginPath(); ctx.moveTo(L - 18, 3); ctx.lineTo(L - 18, 15); ctx.lineTo(L - 13, 11); ctx.lineTo(L - 9, 17); ctx.lineTo(L - 5, 11); ctx.lineTo(L, 15); ctx.lineTo(L, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L - 16.5, 3); ctx.lineTo(L - 16.5, 12); ctx.lineTo(L - 13, 9); ctx.lineTo(L - 9, 14); ctx.lineTo(L - 5, 9); ctx.lineTo(L - 1.5, 12); ctx.lineTo(L - 1.5, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.arc(L - 3, 0, 3.4, 0, 7); ctx.fill();
      break;
    }
    case "espadaBuster": {
      // Espada Buster: lâmina larguíssima com a ponta inclinada e dois encaixes de matéria.
      ctx.fillStyle = "#3a2618"; ctx.beginPath(); ctx.roundRect(-22, -4.5, 22, 9, 2); ctx.fill();
      ctx.strokeStyle = "#6a4a30"; ctx.lineWidth = 1.5; for (let x = -20; x < -1; x += 4) { ctx.beginPath(); ctx.moveTo(x, -4.5); ctx.lineTo(x + 2.5, 4.5); ctx.stroke(); }
      ctx.fillStyle = "#8a929a"; ctx.beginPath(); ctx.arc(-23, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#5a626a"; ctx.beginPath(); ctx.roundRect(-1, -14, 10, 28, 2); ctx.fill(); ctx.fillStyle = "#9aa2aa"; ctx.fillRect(0, -13, 3, 26);
      ctx.fillStyle = "#4a525c"; ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(L + 8, -13); ctx.lineTo(L - 10, 13); ctx.lineTo(8, 13); ctx.closePath(); ctx.fill();
      let g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, "#f4f8fc"); g.addColorStop(.35, "#c8d0d8"); g.addColorStop(.7, "#a0aab4"); g.addColorStop(1, "#7a848e");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(9, -11.5); ctx.lineTo(L + 5, -11.5); ctx.lineTo(L - 11, 11.5); ctx.lineTo(9, 11.5); ctx.closePath(); ctx.fill();
      ln(10, -9.6, L + 2, -9.6, 1.2, "#ffffffcc"); ln(26, 2, L - 18, 2, 1, "#6a747e");
      for (const [x, c] of [[17, "#3aff7a"], [30, "#5ab8ff"]]) { ctx.fillStyle = "#2a3038"; ctx.beginPath(); ctx.arc(x, -2, 4.4, 0, 7); ctx.fill(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, -2, 2.8, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.arc(x - 1, -3, 1, 0, 7); ctx.fill(); }
      break;
    }
    case "machadoLeviata": {
      // Machado Leviatã: cabo com tiras de couro e lâmina azul-gelo com runas.
      ctx.fillStyle = "#4a3020"; ctx.beginPath(); ctx.roundRect(-10, -3.5, L - 4, 7, 2); ctx.fill();
      ctx.fillStyle = "#7a5a3a"; ctx.fillRect(-8, -2.5, L - 8, 1.5);
      for (const x of [-6, 4, 14]) { ctx.fillStyle = "#2a1a10"; ctx.fillRect(x, -4, 5, 8); ctx.fillStyle = "#5a3a22"; ctx.fillRect(x + 1, -4, 1.5, 8); }
      ctx.fillStyle = "#8a96a2"; ctx.beginPath(); ctx.arc(-11, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#6a7684"; ctx.beginPath(); ctx.roundRect(L - 24, -6, 14, 12, 2); ctx.fill();
      // Cabeça: lâmina larga de um lado e espigão do outro.
      ctx.fillStyle = "#2a3440"; ctx.beginPath(); ctx.moveTo(L - 22, -5); ctx.quadraticCurveTo(L - 22, -22, L - 8, -30); ctx.quadraticCurveTo(L + 8, -22, L + 10, -6); ctx.quadraticCurveTo(L + 2, -10, L - 10, -5); ctx.closePath(); ctx.fill();
      let g = ctx.createLinearGradient(0, -28, 0, -5); g.addColorStop(0, "#f4fcff"); g.addColorStop(.5, "#b8d8f0"); g.addColorStop(1, "#6a8aa8");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L - 20, -6); ctx.quadraticCurveTo(L - 20, -21, L - 8, -27.5); ctx.quadraticCurveTo(L + 6, -21, L + 8, -7); ctx.quadraticCurveTo(L + 1, -10, L - 10, -6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(L - 7, -27); ctx.quadraticCurveTo(L + 5, -20, L + 7, -8); ctx.stroke();
      poly([L - 22, 5, L - 12, 5, L - 18, 15], "#5a6a7a");
      ctx.strokeStyle = "#5ad8ff"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(L - 12, -20); ctx.lineTo(L - 9, -14); ctx.lineTo(L - 6, -20); ctx.moveTo(L - 4, -16); ctx.lineTo(L - 1, -11); ctx.moveTo(L - 14, -12); ctx.lineTo(L - 10, -10); ctx.stroke();
      break;
    }
    case "espadaEnergia": {
      // Espada de Energia: cabo curvo roxo e duas lâminas de plasma azul em forquilha.
      let g = ctx.createLinearGradient(0, -10, 0, 10); g.addColorStop(0, "#9a8ab8"); g.addColorStop(.5, "#4a3a6a"); g.addColorStop(1, "#2a1e40");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-12, -3); ctx.quadraticCurveTo(-4, -6, 4, -10); ctx.lineTo(10, -11); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.lineTo(10, 11); ctx.lineTo(4, 10); ctx.quadraticCurveTo(-4, 6, -12, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#1a1228"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "#5ab8ff"; ctx.fillRect(-6, -1, 10, 2);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const s of [-1, 1]) for (const [w2, c] of [[6, "rgba(60,140,255,.28)"], [3, "rgba(90,180,255,.6)"], [0, "rgba(220,240,255,.95)"]]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(8, s * (10 + w2)); ctx.quadraticCurveTo(L * .55, s * (9 + w2 * .8), L + 6 + w2, s * 3); ctx.quadraticCurveTo(L * .5, s * (4 - w2 * .3), 8, s * (5 - w2 * .4)); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "armaPortal": {
      // Arma de Portal: casco branco, garras pretas e o núcleo azul ou laranja (o próximo portal).
      const col = (state.tint || 0) % 2 ? ["#ffb04a", "#ff7a1a"] : ["#8ad8ff", "#2a8aff"];
      ctx.fillStyle = "#2a2a2e"; ctx.beginPath(); ctx.moveTo(-2, 6); ctx.lineTo(6, 6); ctx.lineTo(3, 18); ctx.lineTo(-5, 18); ctx.closePath(); ctx.fill();
      let g = ctx.createLinearGradient(0, -12, 0, 10); g.addColorStop(0, "#ffffff"); g.addColorStop(.6, "#d8dce2"); g.addColorStop(1, "#8a9098");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.quadraticCurveTo(-14, -13, 2, -12); ctx.lineTo(26, -9); ctx.lineTo(26, 8); ctx.lineTo(2, 10); ctx.quadraticCurveTo(-14, 10, -16, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1e1e22"; ctx.fillRect(-4, -3, 22, 4); ctx.fillRect(10, -12, 4, 21);
      ctx.fillStyle = col[1]; ctx.fillRect(-2, -2, 18, 2);
      ctx.fillStyle = "#1e1e22"; ctx.beginPath(); ctx.ellipse(28, 0, 5, 11, 0, 0, 7); ctx.fill();
      g = ctx.createRadialGradient(30, 0, 1, 30, 0, 8); g.addColorStop(0, "#ffffff"); g.addColorStop(.4, col[0]); g.addColorStop(1, col[1]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(31, 0, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = "#1e1e22"; ctx.lineWidth = 3; ctx.lineCap = "round";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(28, s * 8); ctx.quadraticCurveTo(L - 2, s * 13, L + 4, s * 4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(33, 0); ctx.lineTo(L + 2, 0); ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(32, 0, 2, 32, 0, 22); gg.addColorStop(0, col[0] + "88"); gg.addColorStop(1, col[1] + "00"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(32, 0, 22, 0, 7); ctx.fill(); ctx.restore();
      break;
    }
    case "paShovel": {
      // Pá do Shovel Knight: cabo com faixas e a pá de aço azulado.
      ctx.fillStyle = "#2a3a6a"; ctx.beginPath(); ctx.roundRect(-10, -3.5, L - 22, 7, 2); ctx.fill();
      for (const x of [-6, 6, 18, 30]) { ctx.fillStyle = "#5a8ad8"; ctx.fillRect(x, -3.5, 4, 7); }
      ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(-11, 0, 4, 0, 7); ctx.fill(); ctx.fillRect(L - 34, -5, 5, 10);
      ctx.fillStyle = "#8a96a6"; ctx.fillRect(L - 30, -2.5, 10, 5);
      ctx.fillStyle = "#2a3a50"; ctx.beginPath(); ctx.moveTo(L - 22, -13); ctx.quadraticCurveTo(L + 2, -15, L + 10, 0); ctx.quadraticCurveTo(L + 2, 15, L - 22, 13); ctx.closePath(); ctx.fill();
      let g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, "#e8f4ff"); g.addColorStop(.5, "#9ac0e0"); g.addColorStop(1, "#5a7ea8");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(L - 20, -11); ctx.quadraticCurveTo(L + 1, -13, L + 7, 0); ctx.quadraticCurveTo(L + 1, 13, L - 20, 11); ctx.closePath(); ctx.fill();
      ln(L - 18, 0, L + 3, 0, 2, "#5a7ea8"); ln(L - 17, -8, L - 2, -9, 1.3, "#ffffff");
      break;
    }
    case "espadaDiamante": {
      // Espada de Diamante em pixel art (cada "pixel" é um quadradinho).
      const p = 3, x0 = -12, px = (cx, cy, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + cx * p, (cy - 3) * p - p / 2, p + .3, p + .3); };
      const O = "#0a2e2a", C = "#2ee0c4", Lc = "#a8fff0", D = "#16a090", H = "#6a4a26", Hd = "#3a2810", G = "#1e1408";
      for (let c = 0; c < 6; c++) { px(c, 2, O); px(c, 4, O); px(c, 3, c % 2 ? H : Hd); }
      px(-1, 3, O);
      for (let r = 0; r <= 6; r++) { px(6, r, r === 0 || r === 6 ? O : G); px(7, r, r === 0 || r === 6 ? O : r === 3 ? "#5a4020" : G); }
      for (let c = 8; c <= 20; c++) { px(c, 1, O); px(c, 2, Lc); px(c, 3, C); px(c, 4, D); px(c, 5, O); }
      px(21, 2, O); px(21, 3, Lc); px(21, 4, O); px(22, 3, O);
      for (const c of [10, 14, 18]) px(c, 2, "#ffffff");
      break;
    }
    case "frigideira": {
      // Frigideira: cabo preto com furo e a panela de ferro com borda brilhando.
      ctx.fillStyle = "#1a1a1e"; ctx.beginPath(); ctx.roundRect(-10, -4, L - 14, 8, 4); ctx.fill();
      ctx.fillStyle = "#3a3a42"; ctx.beginPath(); ctx.arc(-4, 0, 2.2, 0, 7); ctx.fill();
      ctx.fillStyle = "#5a5a62"; ctx.fillRect(-2, -3, L - 18, 1.5);
      const cx = L + 6;
      let g = ctx.createLinearGradient(0, -25, 0, 25); g.addColorStop(0, "#9a9aa4"); g.addColorStop(.5, "#4a4a52"); g.addColorStop(1, "#1a1a1e");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, 0, 24, 25, 0, 0, 7); ctx.fill();
      g = ctx.createRadialGradient(cx - 6, -7, 2, cx, 0, 21); g.addColorStop(0, "#5a5a64"); g.addColorStop(.6, "#26262c"); g.addColorStop(1, "#141418");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, 0, 20, 21, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffffff55"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, 0, 22, 23, 0, 3.6, 5.2); ctx.stroke();
      ctx.fillStyle = "#ffffff22"; ctx.beginPath(); ctx.ellipse(cx - 7, -8, 6, 3, -.6, 0, 7); ctx.fill();
      break;
    }
    case "masamune": {
      // Masamune: nodachi longuíssima, cabo trançado e lâmina fina levemente curva.
      ln(-20, 0, 8, 0, 6.5, "#1a1a26");
      ctx.fillStyle = "#e8e8f0"; for (let x = -17; x < 7; x += 5) { ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x + 2.5, 0); ctx.lineTo(x, 3); ctx.lineTo(x - 2.5, 0); ctx.fill(); }
      ctx.fillStyle = "#8a92a0"; ctx.beginPath(); ctx.ellipse(-21, 0, 2.5, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#3a3a46"; ctx.beginPath(); ctx.ellipse(9.5, 0, 2.6, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#9aa2b0"; ctx.beginPath(); ctx.ellipse(9.5, 0, 1.2, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = steelD; ctx.beginPath(); ctx.moveTo(12, -2.6); ctx.quadraticCurveTo(L * .6, -7, L + 4, -6); ctx.quadraticCurveTo(L * .6, -1.4, 12, 2.6); ctx.closePath(); ctx.fill();
      const g = ctx.createLinearGradient(0, -7, 0, 2); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#c8d0dc");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(12, -2); ctx.quadraticCurveTo(L * .6, -6.2, L + 2, -5.6); ctx.quadraticCurveTo(L * .6, -2.6, 12, .4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#9aa3b0"; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(14, -.4); ctx.quadraticCurveTo(L * .55, -3.6, L - 8, -4.6); ctx.stroke();
      break;
    }
    case "armaGravidade": {
      // Arma da Gravidade: corpo laranja e preto, três garras e o núcleo brilhando.
      ctx.fillStyle = "#2a2a2e"; ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(1, 19); ctx.lineTo(-7, 19); ctx.closePath(); ctx.fill();
      let g = ctx.createLinearGradient(0, -12, 0, 10); g.addColorStop(0, "#ffb04a"); g.addColorStop(.5, "#d8701a"); g.addColorStop(1, "#7a3a0a");
      ctx.fillStyle = "#26262a"; ctx.beginPath(); ctx.roundRect(-18, -10, 22, 18, 4); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-2, -12); ctx.lineTo(L - 18, -9); ctx.lineTo(L - 14, 0); ctx.lineTo(L - 18, 9); ctx.lineTo(-2, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#26262a"; ctx.fillRect(6, -12, 5, 22); ctx.fillRect(20, -10, 3, 19);
      ctx.fillStyle = "#3a3a40"; ctx.beginPath(); ctx.roundRect(-14, -14, 16, 5, 2); ctx.fill();
      for (const a of [-1, 0, 1]) { ctx.save(); ctx.translate(L - 14, a * 7); ctx.rotate(a * .35); ctx.fillStyle = "#1e1e22"; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(14, -4 - a * 2, 20, a * 3); ctx.lineTo(16, a * 3 + 1); ctx.quadraticCurveTo(10, 2, 0, 3); ctx.closePath(); ctx.fill(); ctx.restore(); }
      g = ctx.createRadialGradient(L - 8, 0, 1, L - 8, 0, 8); g.addColorStop(0, "#ffffff"); g.addColorStop(.4, "#ffd890"); g.addColorStop(1, "#ff8a1a");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L - 8, 0, 5.5, 0, 7); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(L - 4, 0, 2, L - 4, 0, 24); gg.addColorStop(0, "#ffc86a77"); gg.addColorStop(1, "#ff8a1a00"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(L - 4, 0, 24, 0, 7); ctx.fill(); ctx.restore();
      break;
    }
    case "livroLuz": {
      // Livro da Luz: capa branca e dourada com o sol; aberto, as páginas brilham.
      const open = state.casting;
      if (open) {
        ctx.fillStyle = "#c8a040"; ctx.fillRect(-2, -16, 30, 32);
        ctx.fillStyle = "#fffaf0"; ctx.fillRect(0, -14, 12, 28); ctx.fillRect(14, -14, 12, 28);
        for (let y = -9; y < 12; y += 5) { ln(2, y, 10, y, 1, "#c8a04055"); ln(16, y, 24, y, 1, "#c8a04055"); }
        ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(13, 0, 2, 13, 0, 30); gg.addColorStop(0, "#fff6c0aa"); gg.addColorStop(1, "#ffd84a00"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(13, 0, 30, 0, 7); ctx.fill(); ctx.restore();
      } else {
        ctx.fillStyle = "#e8d8a8"; ctx.fillRect(-1, -13, 24, 26);
        const g = ctx.createLinearGradient(0, -15, 0, 15); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#d8d0c0");
        ctx.fillStyle = g; ctx.fillRect(-3, -15, 26, 30);
        ctx.fillStyle = "#e8b84a"; ctx.fillRect(-3, -15, 4, 30); ctx.fillRect(21, -13, 3, 26);
        ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 1.5; ctx.strokeRect(2, -12, 18, 24);
        ctx.fillStyle = "#e8b84a"; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(11 + Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(11 + Math.cos(a + .2) * 8.5, Math.sin(a + .2) * 8.5); ctx.lineTo(11 + Math.cos(a - .2) * 8.5, Math.sin(a - .2) * 8.5); ctx.closePath(); ctx.fill(); }
        ctx.beginPath(); ctx.arc(11, 0, 4, 0, 7); ctx.fill(); ctx.fillStyle = "#fff6c0"; ctx.beginPath(); ctx.arc(11, 0, 2.2, 0, 7); ctx.fill();
      }
      break;
    }
    case "cajadoVazio": {
      // Cajado do Vazio: madeira escura retorcida e garras segurando um buraco negro.
      ln(-30, 0, L - 10, 0, 7, "#120a1a"); ln(-30, 0, L - 10, 0, 4.5, "#3a2448");
      ctx.strokeStyle = "#8a4aff"; ctx.lineWidth = 1.4; ctx.beginPath(); for (let x = -26; x < L - 12; x += 2) ctx.lineTo(x, Math.sin(x * .35) * 2.2); ctx.stroke();
      ctx.fillStyle = "#2a1a3a"; ctx.beginPath(); ctx.roundRect(L - 16, -5, 8, 10, 2); ctx.fill();
      for (const s of [-1, 1]) { ctx.fillStyle = "#1a0e26"; ctx.beginPath(); ctx.moveTo(L - 10, s * 3); ctx.quadraticCurveTo(L - 4, s * 18, L + 8, s * 14); ctx.quadraticCurveTo(L + 2, s * 12, L - 4, s * 3); ctx.closePath(); ctx.fill(); }
      ctx.save(); ctx.globalCompositeOperation = "lighter"; const gg = ctx.createRadialGradient(L + 4, 0, 3, L + 4, 0, 24); gg.addColorStop(0, "#b06cff99"); gg.addColorStop(1, "#6a2aff00"); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(L + 4, 0, 24, 0, 7); ctx.fill(); ctx.restore();
      ctx.strokeStyle = "#d8a8ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(L + 4, 0, 13, 4, -.4, 0, 7); ctx.stroke();
      ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.arc(L + 4, 0, 7.5, 0, 7); ctx.fill();
      ctx.strokeStyle = "#b06cff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(L + 4, 0, 7.5, 0, 7); ctx.stroke();
      ctx.strokeStyle = "#d8a8ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(L + 4, 0, 13, 4, -.4, -.2, Math.PI + .2); ctx.stroke();
      break;
    }
    case "leque": {
      // Leque japonês aberto: varetas de bambu e papel vermelho e branco.
      ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 30, -.9, .9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f6f0e0"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 21, -.9, .9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 1.2; for (let i = 0; i <= 8; i++) { const an = -.9 + i * .225; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 30, Math.sin(an) * 30); ctx.stroke(); }
      ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.arc(12, 0, 4, 0, 7); ctx.fill();
      ctx.fillStyle = "#6a4a2a"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
      break;
    }
    case "mochilaJato": {
      // Controle remoto da mochila (a mochila em si é desenhada nas costas).
      ctx.fillStyle = "#2a2e36"; ctx.fillRect(-2, -6, 18, 12); ctx.fillStyle = "#e84a2a"; ctx.beginPath(); ctx.arc(10, -1, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#5ac8ff"; ctx.fillRect(2, -3, 4, 3); ln(4, -6, 4, -14, 1.5, "#9aa3ab"); ctx.fillStyle = "#ff4a4a"; ctx.beginPath(); ctx.arc(4, -15, 1.8, 0, 7); ctx.fill();
      break;
    }
    case "blocoMagico": {
      // Item na mão: bloco de grama, TNT ou carrinho (os dois últimos vêm do ui.js, só na TV).
      if (state.tint === 1 && typeof drawTNT === "function") drawTNT(ctx, 2, -11, 22);
      else if (state.tint === 2 && typeof drawMinecart === "function") drawMinecart(ctx, 14, 0, 28, 0);
      else drawGrassBlock(ctx, 2, -11, 22);
      break;
    }
    case "varaPescar": {
      ln(-12, 0, 4, 0, 5, "#3a2a1a"); ln(4, 0, L, 0, 2.5, "#c8925a"); ln(L - 20, 0, L, 0, 1.6, "#a87a4a");
      ctx.fillStyle = "#9aa3ab"; ctx.beginPath(); ctx.arc(2, 6, 4.5, 0, 7); ctx.fill(); ctx.fillStyle = "#5c656c"; ctx.beginPath(); ctx.arc(2, 6, 2, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(L, 0); ctx.quadraticCurveTo(L + 4, 10, L + 2, 18); ctx.stroke();
      ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(L, 21, 3, -Math.PI / 2, Math.PI * .8); ctx.stroke();
      ctx.fillStyle = "#e83a3a"; ctx.beginPath(); ctx.arc(L + 2, 12, 2.6, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(L + 2, 12, 2.6, Math.PI, 0); ctx.fill();
      break;
    }
    case "ervilha": case "ervilhaGelo": {
      // Ervilha atiradora: cabeça redonda com focinho, olho brilhante e folhas.
      const ice = id === "ervilhaGelo", G1 = ice ? "#8fdcff" : "#7ad84a", G2 = ice ? "#3a8ad0" : "#3a9a2a", G3 = ice ? "#e0f8ff" : "#c8f08a", D = ice ? "#0a2a4a" : "#173a0e";
      ctx.strokeStyle = G2; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, 5); ctx.quadraticCurveTo(2, 9, 5, 2); ctx.stroke();
      ctx.fillStyle = G2; ctx.beginPath(); ctx.ellipse(-8, 9, 7, 3, .5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-3, 11, 6, 2.6, -.4, 0, 7); ctx.fill();
      ctx.fillStyle = G2; ctx.beginPath(); ctx.moveTo(4, -9); ctx.quadraticCurveTo(-10, -18, -12, -5); ctx.quadraticCurveTo(-3, -10, 3, -3); ctx.fill();
      const g = ctx.createRadialGradient(8, -8, 1, 11, -3, 14); g.addColorStop(0, G3); g.addColorStop(.5, G1); g.addColorStop(1, G2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(11, -3, 12, 0, 7); ctx.fill();
      ctx.fillStyle = G1; ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(30, -9.5); ctx.lineTo(30, 4.5); ctx.lineTo(18, 3); ctx.fill();
      ctx.fillStyle = "#ffffff44"; ctx.fillRect(19, -7.5, 10, 2.5);
      const big = state.loaded === false ? 1.25 : 1;
      ctx.fillStyle = G2; ctx.beginPath(); ctx.ellipse(31, -2.5, 3.6 * big, 7.4 * big, 0, 0, 7); ctx.fill();
      ctx.fillStyle = D; ctx.beginPath(); ctx.ellipse(32, -2.5, 2 * big, 4.6 * big, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(12, -8, 3.8, 4.8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.ellipse(13.2, -7.6, 2.3, 3.3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(14, -9, 1, 0, 7); ctx.fill();
      if (ice) { ctx.fillStyle = "#ffffff"; for (const [x, y] of [[4, -13], [9, -15.5], [15, -14.5]]) { ctx.beginPath(); ctx.moveTo(x - 2, y + 2); ctx.lineTo(x, y - 4); ctx.lineTo(x + 2, y + 2); ctx.fill(); } }
      break;
    }
    case "florFogo": {
      ln(-6, 2, 8, 0, 3.5, "#2a8a2a");
      ctx.fillStyle = "#3aa03a"; ctx.beginPath(); ctx.ellipse(0, 6, 6, 2.6, .4, 0, 7); ctx.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.fillStyle = i % 2 ? "#ff7a1a" : "#ffd84a"; ctx.beginPath(); ctx.ellipse(16 + Math.cos(a) * 8, Math.sin(a) * 8, 6, 4, a, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(16, 0, 6.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff3a1a"; ctx.beginPath(); ctx.arc(16, 0, 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#111"; ctx.fillRect(14, -2.5, 1.4, 4); ctx.fillRect(17, -2.5, 1.4, 4);
      break;
    }
    case "lancaTeias": {
      // Lançador de teia no pulso.
      ctx.fillStyle = "#c0202a"; ctx.fillRect(-8, -6, 18, 12);
      ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = .8; for (let x = -6; x < 10; x += 4) { ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, 6); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(10, 0); ctx.stroke();
      ctx.fillStyle = "#9aa3ab"; ctx.fillRect(8, -4, 8, 8); ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(17, 0, 2.2, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1; for (const a of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(18 + Math.cos(a) * 6, Math.sin(a) * 6); ctx.stroke(); }
      break;
    }
    case "manopla": {
      // Manopla dourada com as seis joias.
      const g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, "#fff0a8"); g.addColorStop(.5, "#e8b84a"); g.addColorStop(1, "#8a6418");
      ctx.fillStyle = "#8a6418"; ctx.fillRect(-10, -10, 10, 20);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(8, 0, 13, 10.5, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#c8962a" : "#e8b84a"; ctx.fillRect(18, -9 + i * 4.6, 7, 4); }
      ctx.fillStyle = "#c8962a"; ctx.beginPath(); ctx.ellipse(6, -10, 6, 3.5, -.3, 0, 7); ctx.fill();
      for (const [x, y, c, r] of [[8, 0, "#b06cff", 3.4], [19, -7, "#5a8aff", 1.8], [21, -2.4, "#ff3a3a", 1.8], [21, 2.4, "#ffa030", 1.8], [19, 7, "#ffe95a", 1.8], [3, -10.5, "#3aff8a", 1.8]]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffffbb"; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .35, 0, 7); ctx.fill();
      }
      break;
    }
    case "escudoEstrelado": ctx.save(); ctx.translate(14, 0); drawStarShield(ctx, 16); ctx.restore(); break;
    case "kunaiCorrente": {
      ctx.strokeStyle = "#7d868e"; ctx.lineWidth = 1.6; for (let x = -8; x < 2; x += 4) { ctx.beginPath(); ctx.ellipse(x, 0, 2.4, 1.6, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(4, 0, 3, 0, 7); ctx.stroke();
      ln(7, 0, 15, 0, 4, "#2a2a3a"); ln(8, 0, 14, 0, 1, "#c0392b");
      poly([15, -4, 30, 0, 15, 4, 17, 0], steelD); poly([15, -3, 28, 0, 17, 0], steel);
      break;
    }
    case "bolaCaptura": drawCaptureBall(ctx, 10, 0, 9); break;
    case "varinhaBolhas": {
      ln(-6, 0, L - 8, 0, 3.5, "#5ac8ff"); ln(-6, 0, 6, 0, 4.5, "#ff8af0");
      const g = ctx.createRadialGradient(L, -2, 1, L, 0, 11); g.addColorStop(0, "#ffffff22"); g.addColorStop(.7, "#a8e8ff55"); g.addColorStop(1, "#ff8af088");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(L, 0, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = "#5ac8ff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(L, 0, 9, 0, 7); ctx.stroke();
      ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.ellipse(L - 3, -4, 2.5, 1.4, -.5, 0, 7); ctx.fill();
      break;
    }
    case "varinhaOvelha": {
      ln(-6, 0, L - 6, 0, 3.5, "#f3ead2"); ln(-6, 0, 6, 0, 4.5, "#b06cff");
      ctx.fillStyle = "#ffffff"; for (const [dx, dy] of [[0, -4], [5, 0], [0, 4], [-4, 0], [2, 0]]) { ctx.beginPath(); ctx.arc(L + 2 + dx, dy, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.ellipse(L + 9, 0, 3.4, 2.6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.4 : 3.4, a = i * Math.PI / 5; ctx.lineTo(L - 6 + Math.cos(a) * r, -9 + Math.sin(a) * r); } ctx.fill();
      break;
    }
    case "arcoCupido": {
      ctx.strokeStyle = "#a8365a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(-14, 0, 28, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = "#ff8ab8"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(-14, 0, 28, -1.1, 1.1); ctx.stroke();
      ctx.fillStyle = gold; ctx.beginPath(); ctx.arc(-14 + 28 * Math.cos(1.1), 28 * Math.sin(1.1), 2.5, 0, 7); ctx.arc(-14 + 28 * Math.cos(-1.1), 28 * Math.sin(-1.1), 2.5, 0, 7); ctx.fill();
      const pulled = state.pulled ? -10 : 0;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-14 + 28 * Math.cos(-1.1), 28 * Math.sin(-1.1)); ctx.lineTo(pulled, 0); ctx.lineTo(-14 + 28 * Math.cos(1.1), 28 * Math.sin(1.1)); ctx.stroke();
      if (state.loaded !== false) { ln(pulled, 0, 32, 0, 2, gold); drawHeart(ctx, 35, 0, 5, "#ff3a6a"); }
      break;
    }
    case "ioio": {
      ctx.strokeStyle = "#f3ead2"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 0); ctx.stroke();
      ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.arc(12, 0, 8, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff6a6a"; ctx.beginPath(); ctx.arc(12, 0, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(12, 0, 2, 0, 7); ctx.fill();
      break;
    }
    case "guardaChuva": {
      ctx.strokeStyle = "#3a2a1a"; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-8, 0); ctx.arc(-8, 5, 5, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
      ln(4, 0, L, 0, 2.5, "#5c656c");
      ctx.fillStyle = "#2a6ad8"; ctx.beginPath(); ctx.moveTo(14, -1); ctx.quadraticCurveTo(40, -9, L - 4, -1); ctx.lineTo(L - 4, 1); ctx.quadraticCurveTo(40, 9, 14, 1); ctx.fill();
      ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.moveTo(24, -3); ctx.quadraticCurveTo(40, -6, 52, -2); ctx.lineTo(52, 0); ctx.quadraticCurveTo(40, -2, 24, -1); ctx.fill();
      ctx.fillStyle = "#c3cad0"; ctx.beginPath(); ctx.arc(L, 0, 2, 0, 7); ctx.fill();
      break;
    }
    case "luvaMola": {
      ctx.strokeStyle = "#9aa3ab"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 4, k = 0; x < L - 14; x += 6, k++) ctx.lineTo(x, k % 2 ? 6 : -6); ctx.lineTo(L - 14, 0); ctx.stroke();
      ctx.fillStyle = "#5c656c"; ctx.fillRect(-4, -5, 8, 10);
      ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.ellipse(L - 2, 0, 13, 12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#e84a4a"; ctx.beginPath(); ctx.ellipse(L, -3, 9, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.ellipse(L - 6, 9, 6, 4, -.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#f3ead2"; ctx.fillRect(L - 18, -9, 5, 18);
      ctx.fillStyle = "#ffffff88"; ctx.beginPath(); ctx.ellipse(L + 2, -7, 4, 2, 0, 0, 7); ctx.fill();
      break;
    }
    case "taco": {
      ln(-10, 0, 14, 0, 5, "#f3ead2"); for (let x = -8; x < 12; x += 4) ln(x, -2.5, x + 2, 2.5, 1, "#c8b898");
      poly([12, -3, L - 18, -7, L, -6, L + 2, 0, L, 6, L - 18, 7, 12, 3], "#c8925a");
      poly([14, -2.5, L - 18, -6, L, -5, L + 1, -1, 14, -1], "#e8b880");
      ctx.fillStyle = "#3a2010"; ctx.beginPath(); ctx.ellipse(-11, 0, 2, 4.5, 0, 0, 7); ctx.fill();
      break;
    }
    case "lancaChamas": {
      ctx.fillStyle = "#a01d10"; ctx.beginPath(); ctx.ellipse(4, 9, 14, 6, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#e84a2a"; ctx.beginPath(); ctx.ellipse(4, 8, 12, 4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a5260"; ctx.fillRect(-14, -6, L - 4, 10); ctx.fillStyle = "#7a828c"; ctx.fillRect(-12, -5, L - 8, 3);
      ctx.fillStyle = "#2a2e36"; ctx.fillRect(L - 18, -8, 16, 14); ctx.fillStyle = "#1a1a1a"; ctx.fillRect(L - 2, -5, 6, 8);
      ctx.fillStyle = "#5ac8ff"; ctx.beginPath(); ctx.ellipse(L + 7, -1, 3.5, 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = gold; ctx.fillRect(-4, -8, 3, 14);
      break;
    }
    case "livroSombras": case "grimorio": case "livroVida": case "tomoTerra": case "livroCaos": {
      const open = state.casting;
      if (open) {
        ctx.fillStyle = w.book; ctx.fillRect(-2, -16, 30, 32);
        ctx.fillStyle = "#f3ead2"; ctx.fillRect(0, -14, 12, 28); ctx.fillRect(14, -14, 12, 28);
        ctx.strokeStyle = "#0003"; ctx.lineWidth = 1; for (let y = -9; y < 12; y += 5) { ln(2, y, 10, y, 1, "#0003"); ln(16, y, 24, y, 1, "#0003"); }
      } else {
        ctx.fillStyle = "#f3ead2"; ctx.fillRect(-1, -13, 24, 26);
        ctx.fillStyle = w.book; ctx.fillRect(-3, -15, 26, 30);
        ctx.fillStyle = "#f3ead2"; ctx.fillRect(21, -13, 3, 26);
        ctx.strokeStyle = gold; ctx.lineWidth = 1.5; ctx.strokeRect(-1, -13, 22, 26);
      }
      ctx.shadowColor = w.rune; ctx.shadowBlur = open ? 18 : 10; ctx.fillStyle = w.rune;
      ctx.beginPath(); ctx.arc(open ? 13 : 10, 0, open ? 7 : 6, 0, 7); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = open ? "#f3ead2" : w.book; ctx.beginPath(); ctx.arc(open ? 13 : 10, 0, 3, 0, 7); ctx.fill();
      break;
    }
  }
}
function drawShield(ctx, s = 1) {
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = "#3b2a1c"; ctx.beginPath(); ctx.moveTo(-15, -18); ctx.lineTo(15, -18); ctx.lineTo(15, 2); ctx.quadraticCurveTo(14, 16, 0, 24); ctx.quadraticCurveTo(-14, 16, -15, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#9e2b25"; ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(12, -15); ctx.lineTo(12, 2); ctx.quadraticCurveTo(11, 13, 0, 20); ctx.quadraticCurveTo(-11, 13, -12, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e8b84a"; ctx.fillRect(-2, -15, 4, 34); ctx.fillRect(-12, -4, 24, 4);
  ctx.restore();
}
function drawHatchet(ctx, L = 34, flip = 1) {
  ctx.strokeStyle = "#4a3020"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(L, 0); ctx.stroke();
  ctx.strokeStyle = "#7a4e2a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(L, 0); ctx.stroke();
  ctx.fillStyle = "#8f9aa3"; ctx.beginPath(); ctx.moveTo(L - 12, 0); ctx.lineTo(L - 14, -15 * flip); ctx.quadraticCurveTo(L - 2, -20 * flip, L + 5, -12 * flip); ctx.lineTo(L + 1, 0); ctx.fill();
  ctx.fillStyle = "#dfe5ea"; ctx.beginPath(); ctx.moveTo(L - 12, -12 * flip); ctx.quadraticCurveTo(L - 2, -18 * flip, L + 4, -12 * flip); ctx.lineTo(L, -6 * flip); ctx.fill();
}
function drawFlask(ctx, x, y) {
  ctx.fillStyle = "#cfe9d6aa"; ctx.beginPath(); ctx.arc(x, y + 3, 10, 0, 7); ctx.fill();
  ctx.fillStyle = "#4bd36a"; ctx.beginPath(); ctx.arc(x, y + 5, 8, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#cfe9d6cc"; ctx.fillRect(x - 3, y - 12, 6, 8);
  ctx.fillStyle = "#8a5a32"; ctx.fillRect(x - 4, y - 15, 8, 4);
  ctx.fillStyle = "#fff8"; ctx.beginPath(); ctx.arc(x - 4, y, 2.5, 0, 7); ctx.fill();
}

function drawChakram(ctx, r, rot = 0) {
  ctx.save(); ctx.rotate(rot);
  ctx.fillStyle = "#8f9aa3";
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (r + 7), Math.sin(a) * (r + 7)); ctx.lineTo(Math.cos(a + .3) * r, Math.sin(a + .3) * r); ctx.lineTo(Math.cos(a - .1) * r, Math.sin(a - .1) * r); ctx.fill(); }
  ctx.lineWidth = 6; ctx.strokeStyle = "#dfe5ea"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(0, 0, r - 5, 0, 7); ctx.stroke();
  ctx.restore();
}

// ── Arma com acabamento: contorno escuro em volta, luz de um lado e sombra do outro.
// Fica guardada como imagem (uma por arma/pose), então o custo por quadro é só copiar a imagem.
// Armas de energia continuam vetoriais: o brilho delas precisa somar luz com o cenário.
const WSPR = new Map(), WSPR_R = 2.5;
function weaponSprite(id, L, flip, state) {
  const key = `${id}|${Math.round(L / 3)}|${flip}|${state.pulled ? 1 : 0}${state.loaded ? 1 : 0}${state.casting ? 1 : 0}${state.icon ? 1 : 0}|${state.tint || 0}`;
  let sp = WSPR.get(key);
  if (sp) return sp;
  if (WSPR.size > 140) WSPR.clear();
  const w = WEAPONS[id], R = WSPR_R;
  const x0 = Math.min(w.ext[0], -12) - 34, x1 = Math.max(w.ext[1], L) + 30, y0 = -58, y1 = 58;
  const cw = Math.ceil((x1 - x0) * R), ch = Math.ceil((y1 - y0) * R);
  const a = document.createElement("canvas"); a.width = cw; a.height = ch;
  const ac = a.getContext("2d", { willReadFrequently: true });
  ac.setTransform(R, 0, 0, R, -x0 * R, -y0 * R);
  drawWeaponShape(ac, id, L, flip, state);
  ac.setTransform(1, 0, 0, 1, 0, 0);
  // Silhueta só das partes sólidas (os brilhos translúcidos não ganham contorno).
  const img = ac.getImageData(0, 0, cw, ch), d = img.data, sil = new ImageData(cw, ch), sd = sil.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 150) { sd[i - 3] = 18; sd[i - 2] = 12; sd[i - 1] = 9; sd[i] = 255; }
  const sc = document.createElement("canvas"); sc.width = cw; sc.height = ch; sc.getContext("2d").putImageData(sil, 0, 0);
  // Luz: metade de cima mais clara, de baixo mais escura (dá volume).
  ac.globalCompositeOperation = "source-atop";
  const g = ac.createLinearGradient(0, (-9 - y0) * R, 0, (9 - y0) * R);
  g.addColorStop(0, "rgba(255,255,255,.2)"); g.addColorStop(.48, "rgba(255,255,255,0)"); g.addColorStop(.52, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.24)");
  ac.fillStyle = g; ac.fillRect(0, 0, cw, ch);
  const b = document.createElement("canvas"); b.width = cw; b.height = ch;
  const bc = b.getContext("2d"), o = 1.7 * R, q = o * .72;
  for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o], [q, q], [-q, q], [q, -q], [-q, -q]]) bc.drawImage(sc, dx, dy);
  bc.drawImage(a, 0, 0);
  sp = { c: b, x0, y0, w: cw / R, h: ch / R }; WSPR.set(key, sp);
  return sp;
}
function drawWeaponSprite(ctx, id, L, flip = 1, state = {}) {
  if (WEAPONS[id].energy) return drawWeaponShape(ctx, id, L, flip, state);
  const sp = weaponSprite(id, L, flip, state);
  ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
}

// Estrela ninja de 4 pontas (shuriken), centrada na origem.
function drawStar4(ctx, r, ri, big) {
  ctx.fillStyle = big ? "#3a3f47" : "#7d868e"; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? ri : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = big ? "#9aa3ab" : "#c3cad0"; ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = (i % 2 ? ri : r) * .62; ctx.lineTo(Math.cos(a) * rr - 1, Math.sin(a) * rr - 1); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = big ? "#c0392b" : "#2a2e36"; ctx.beginPath(); ctx.arc(0, 0, ri * .55, 0, 7); ctx.fill();
}
// Escudo redondo com estrela (anéis vermelho e branco, centro azul).
function drawStarShield(ctx, r) {
  for (const [k, col] of [[1, "#b01a2a"], [.78, "#f3f3f3"], [.58, "#b01a2a"], [.4, "#1a4aa8"]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r * k, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .15 : r * .37, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill();
  ctx.fillStyle = "#ffffff55"; ctx.beginPath(); ctx.ellipse(-r * .4, -r * .45, r * .3, r * .14, -.6, 0, 7); ctx.fill();
}
// Bola de captura vermelha e branca.
function drawCaptureBall(ctx, x, y, r) {
  ctx.fillStyle = "#e83a3a"; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#f6f6f6"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI); ctx.fill();
  ctx.fillStyle = "#1a1a1a"; ctx.fillRect(x - r, y - r * .14, r * 2, r * .28);
  ctx.beginPath(); ctx.arc(x, y, r * .38, 0, 7); ctx.fill(); ctx.fillStyle = "#f6f6f6"; ctx.beginPath(); ctx.arc(x, y, r * .24, 0, 7); ctx.fill();
  ctx.fillStyle = "#ffffff88"; ctx.beginPath(); ctx.ellipse(x - r * .4, y - r * .55, r * .28, r * .14, -.5, 0, 7); ctx.fill();
}
// Coraçãozinho (Arco do Cupido).
function drawHeart(ctx, x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.bezierCurveTo(x + r * .2, y - r * 1.4, x - r * 1.3, y - r * .6, x - r * .6, y); ctx.bezierCurveTo(x - r * 1.3, y + r * .6, x + r * .2, y + r * 1.4, x + r, y); ctx.fill();
}
// Bloco de grama e terra (estilo blocos de construção), canto superior esquerdo em (x, y).
function drawGrassBlock(ctx, x, y, s) {
  ctx.fillStyle = "#7a5230"; ctx.fillRect(x, y, s, s);
  const px = s / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const h = (i * 7 + j * 13) % 5; if (h < 2) { ctx.fillStyle = h ? "#5a3a20" : "#9a6a40"; ctx.fillRect(x + i * px, y + j * px, px, px); } }
  ctx.fillStyle = "#5aa83a"; ctx.fillRect(x, y, s, px * 2.2);
  ctx.fillStyle = "#7ac84a"; for (let i = 0; i < 8; i += 2) ctx.fillRect(x + i * px, y, px, px);
  ctx.fillStyle = "#5aa83a"; for (let i = 1; i < 8; i += 3) ctx.fillRect(x + i * px, y + px * 2.2, px, px * (1 + i % 2));
  ctx.strokeStyle = "#2a1a0a"; ctx.lineWidth = Math.max(1, s / 22); ctx.strokeRect(x, y, s, s);
}
// Lâmina do Caos: lâmina curva em brasa com guarda de bronze espetada (base na origem, ponta pra +x).
function drawChaosBladeShape(c) {
  // Contorno.
  c.fillStyle = "#120806"; c.beginPath();
  c.moveTo(-2, -8); c.quadraticCurveTo(22, -16, 50, -24); c.quadraticCurveTo(42, -12, 34, -4); c.lineTo(36, 2); c.lineTo(28, 3);
  c.quadraticCurveTo(16, 11, -2, 10); c.closePath(); c.fill();
  // Corpo da lâmina: metal escuro perto da guarda, brasa no meio e amarelo quente na ponta.
  let g = c.createLinearGradient(0, 0, 48, -18); g.addColorStop(0, "#5a1a0e"); g.addColorStop(.35, "#c8381a"); g.addColorStop(.75, "#ff8a2a"); g.addColorStop(1, "#ffe08a");
  c.fillStyle = g; c.beginPath();
  c.moveTo(0, -6); c.quadraticCurveTo(22, -13.5, 46, -21); c.quadraticCurveTo(39, -11, 31.5, -4.5); c.lineTo(33, .5); c.lineTo(27, 1);
  c.quadraticCurveTo(15, 8.5, 0, 8); c.closePath(); c.fill();
  // Fio cortante brilhando e a nervura escura com runas.
  c.strokeStyle = "#fff2b0"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(2, 7.4); c.quadraticCurveTo(15, 7.6, 26.5, .6); c.moveTo(31, -4.8); c.quadraticCurveTo(38, -11, 45, -20); c.stroke();
  c.strokeStyle = "#2a0e08"; c.lineWidth = 2.4; c.beginPath(); c.moveTo(3, -1.5); c.quadraticCurveTo(20, -7, 38, -15); c.stroke();
  c.fillStyle = "#ffb04a"; for (let i = 0; i < 4; i++) { const t = .15 + i * .2, x = 3 + 35 * t, y = -1.5 - 13.5 * t * t - 1.5 * t; c.fillRect(x - 1, y - 1, 2, 2); }
  // Guarda de bronze com espinhos e o rubi.
  g = c.createLinearGradient(0, -14, 0, 14); g.addColorStop(0, "#f0c070"); g.addColorStop(.5, "#9a6a2a"); g.addColorStop(1, "#4a2a10");
  c.fillStyle = "#120806"; c.beginPath(); c.moveTo(3, -11); c.lineTo(-4, -17); c.lineTo(-6, -8); c.lineTo(-13, -10); c.lineTo(-10, 0); c.lineTo(-13, 10); c.lineTo(-6, 8); c.lineTo(-4, 17); c.lineTo(3, 11); c.closePath(); c.fill();
  c.fillStyle = g; c.beginPath(); c.moveTo(1.6, -9.5); c.lineTo(-3.6, -14.5); c.lineTo(-5, -6.6); c.lineTo(-11, -8); c.lineTo(-8.6, 0); c.lineTo(-11, 8); c.lineTo(-5, 6.6); c.lineTo(-3.6, 14.5); c.lineTo(1.6, 9.5); c.closePath(); c.fill();
  g = c.createRadialGradient(-4, -1, .5, -3.5, 0, 4.2); g.addColorStop(0, "#ffd0b0"); g.addColorStop(.5, "#e8281a"); g.addColorStop(1, "#5a0606");
  c.fillStyle = g; c.beginPath(); c.arc(-3.5, 0, 4, 0, 7); c.fill();
  // Cabo enrolado atrás da guarda.
  c.fillStyle = "#2a1610"; c.fillRect(-24, -3.5, 13, 7);
  c.strokeStyle = "#6a3a20"; c.lineWidth = 1.4; for (let x = -23; x < -12; x += 3.5) { c.beginPath(); c.moveTo(x, -3.5); c.lineTo(x + 2.2, 3.5); c.stroke(); }
  c.fillStyle = "#c8902a"; c.beginPath(); c.arc(-25, 0, 3.4, 0, 7); c.fill();
}
// Bomba redonda de pavio (estilo Bomberman).
function drawClassicBomb(ctx, x, y, r, spark, type = 0) {
  const T = (typeof BOMB_TYPES !== "undefined" && BOMB_TYPES[type]) || { id: "normal", c1: "#1d2028", c2: "#5a6070", glow: "#ffd84a" };
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r * 1.05); g.addColorStop(0, T.c2); g.addColorStop(.65, T.c1); g.addColorStop(1, T.c1);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  // Marca de cada tipo.
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  if (T.id === "terra") { ctx.strokeStyle = "#3a2410"; ctx.lineWidth = Math.max(1, r * .12); ctx.beginPath(); ctx.moveTo(x - r, y + r * .1); ctx.lineTo(x - r * .3, y + r * .2); ctx.lineTo(x, y - r * .3); ctx.lineTo(x + r * .4, y + r * .3); ctx.lineTo(x + r, y + r * .1); ctx.stroke(); }
  else if (T.id === "ar") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, r * .14); ctx.beginPath(); ctx.arc(x, y, r * .45, 0, 4.4); ctx.stroke(); ctx.beginPath(); ctx.arc(x + r * .1, y + r * .05, r * .18, 3, 7); ctx.stroke(); }
  else if (T.id === "buraco") { ctx.strokeStyle = "#c58bff"; ctx.lineWidth = Math.max(1, r * .16); ctx.beginPath(); ctx.ellipse(x, y, r * .7, r * .28, -.4, 0, 7); ctx.stroke(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, r * .3, 0, 7); ctx.fill(); }
  else if (T.id === "energia") { ctx.fillStyle = "#3a2a00"; ctx.beginPath(); ctx.moveTo(x + r * .15, y - r * .7); ctx.lineTo(x - r * .35, y + r * .1); ctx.lineTo(x, y + r * .1); ctx.lineTo(x - r * .15, y + r * .7); ctx.lineTo(x + r * .35, y - r * .1); ctx.lineTo(x, y - r * .1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); ctx.ellipse(x - r * .4, y - r * .45, r * .22, r * .14, -.6, 0, 7); ctx.fill();
  ctx.fillStyle = "#8f9aa3"; ctx.fillRect(x - r * .35, y - r - r * .35, r * .7, r * .45);
  ctx.strokeStyle = "#c9a86a"; ctx.lineWidth = Math.max(1.5, r * .18); ctx.beginPath(); ctx.moveTo(x, y - r - r * .3); ctx.quadraticCurveTo(x + r * .2, y - r * 1.8, x + r * .7, y - r * 1.9); ctx.stroke();
  if (spark) { ctx.fillStyle = T.id === "normal" ? "#ffd84a" : T.glow; ctx.beginPath(); ctx.arc(x + r * .7, y - r * 1.9, r * .3, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + r * .7, y - r * 1.9, r * .14, 0, 7); ctx.fill(); }
}

// Ícone da arma centralizado em (cx, cy), cabendo num quadrado de lado size.
function drawWeaponIcon(ctx, id, cx, cy, size) {
  const w = WEAPONS[id], [a, b] = w.ext, len = b - a;
  const flat = w.book || ["tambor", "ampulheta", "espiritoEstelar", "bombasClassicas", "shuriken", "blocoMagico", "ondaKi", "shurikenGigante", "lampada", "manopla", "escudoEstrelado", "bolaCaptura", "anelLanterna", "lacoVerdade", "ioio", "lancaTeias", "florFogo", "ervilha", "ervilhaGelo"].includes(id) || id === "garras" || id === "punhosCiber" || id === "bombas" || id === "funda" || id === "chakram" || id === "drone";
  const ang = flat ? 0 : -Math.PI / 4;
  const sc = flat ? size / 46 : size * 1.25 / len;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(sc, sc);
  ctx.translate(-(a + b) / 2, 0);
  drawWeaponSprite(ctx, id, w.L, -1, { icon: true });
  ctx.restore();
}
