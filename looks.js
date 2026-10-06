// Duelo Medieval — visual dos personagens: cores, roupas e chapéus.
// Usado pela TV (ui.js) e pelo celular (tela "Personagem"), por isso não depende de nenhum outro arquivo.
"use strict";
const LOOK_COLORS = [
  ["#e74c3c", "Vermelho"], ["#3498db", "Azul"], ["#2ecc71", "Verde"], ["#f1c40f", "Amarelo"], ["#b06cff", "Roxo"],
  ["#ff8c2a", "Laranja"], ["#1fd1b5", "Turquesa"], ["#ff6fb5", "Rosa"], ["#ecf0f1", "Branco"], ["#555b66", "Grafite"],
  ["#9c6b3f", "Marrom"], ["#a8e04a", "Lima"], ["#7fd3ff", "Celeste"], ["#9b2d50", "Vinho"], ["#e0b040", "Dourado"],
];
const LOOK_HATS = [
  ["nenhum", "Nenhum"], ["elmo", "Elmo"], ["chifres", "Viking"], ["chapeu", "Mago"], ["coroa", "Coroa"], ["capuz", "Capuz"],
  ["bandana", "Bandana"], ["pluma", "Pluma"], ["tiara", "Tiara"], ["bobo", "Bobo da Corte"], ["pirata", "Pirata"],
  ["samurai", "Samurai"], ["cartola", "Cartola"], ["aureola", "Auréola"], ["gato", "Orelhas de Gato"], ["astronauta", "Astronauta"],
];
const LOOK_OUTFITS = [
  ["nenhuma", "Nenhuma"], ["tunica", "Túnica"], ["armadura", "Armadura"], ["cota", "Cota de Malha"], ["capa", "Capa"],
  ["manto", "Manto de Mago"], ["couro", "Colete de Couro"], ["ninja", "Ninja"], ["pirata", "Pirata"], ["dourada", "Armadura Dourada"],
  ["samurai", "Samurai"], ["clerigo", "Clérigo"], ["espacial", "Traje Espacial"], ["esqueleto", "Esqueleto"], ["ferreiro", "Ferreiro"], ["real", "Manto Real"],
];
const LOOK_OUT = "#120c09";
const lookName = (list, id) => (list.find(x => x[0] === id) || ["", ""])[1];
function lookShade(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16), f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ── Chapéus: desenhados com a origem no centro da cabeça (raio 13), olhando para +x.
// Contorno escuro + preenchimento (o traço vai antes, o preenchimento cobre a metade de dentro).
function olFill(c, fill) { c.strokeStyle = LOOK_OUT; c.lineWidth = 3; c.stroke(); c.fillStyle = fill; c.fill(); }
const grad = (c, x0, y0, x1, y1, a, b) => { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
function drawHatShape(c, hat, base, t = 0) {
  switch (hat) {
    case "elmo": {
      // Elmo de cavaleiro: domo de aço com crista, fenda da viseira, respiros e rebites.
      c.beginPath(); c.moveTo(-15.5, 7); c.lineTo(-15.5, -3); c.arc(0, -3, 15.5, Math.PI, 0); c.lineTo(15.5, 7); c.quadraticCurveTo(0, 11, -15.5, 7); c.closePath();
      olFill(c, grad(c, -12, -18, 10, 10, "#f2f5f7", "#6c757d"));
      c.strokeStyle = "#b8c0c7"; c.lineWidth = 3; c.beginPath(); c.arc(0, -3, 16.5, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      c.strokeStyle = LOOK_OUT; c.lineWidth = 1; c.beginPath(); c.arc(0, -3, 18, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
      c.fillStyle = "#4a5056"; c.fillRect(-15.5, 2, 31, 2.5);
      c.fillStyle = LOOK_OUT; c.beginPath(); c.moveTo(2, -5); c.lineTo(16, -6); c.lineTo(16, -1.5); c.lineTo(2, -1.2); c.fill();
      for (const [x, y] of [[8, 4.5], [11.5, 4.5], [8, 7.5], [11.5, 7.5]]) { c.beginPath(); c.arc(x, y, 1, 0, 7); c.fill(); }
      c.fillStyle = "#dfe5ea"; for (const x of [-12, -6]) { c.beginPath(); c.arc(x, 3.2, 1.3, 0, 7); c.fill(); }
      c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.ellipse(-5, -12, 5.5, 2.4, -.5, 0, 7); c.fill();
      break;
    }
    case "chifres": {
      // Capacete viking: chifres de marfim com anéis, domo de aço, faixa de bronze e protetor de nariz.
      for (const sd of [-1, 1]) {
        c.beginPath(); c.moveTo(sd * 10, -6); c.quadraticCurveTo(sd * 26, -12, sd * 23, -33); c.quadraticCurveTo(sd * 19, -16, sd * 5, -12); c.closePath();
        olFill(c, grad(c, sd * 6, -8, sd * 24, -32, "#fffaf0", "#c8b48a"));
        c.strokeStyle = "#a8946a"; c.lineWidth = 1.2; for (const k of [.35, .6]) { const x = sd * (10 + 13 * k), y = -8 - 18 * k; c.beginPath(); c.moveTo(x - sd * 3, y + 2); c.lineTo(x + sd * 3, y - 2); c.stroke(); }
      }
      c.beginPath(); c.arc(0, -2, 15, Math.PI, 0); c.closePath(); olFill(c, grad(c, -10, -16, 10, 0, "#e4e9ee", "#6c757d"));
      c.beginPath(); c.rect(-16, -5, 32, 5); olFill(c, "#b8862a");
      c.fillStyle = "#ffe08a"; for (const x of [-11, -4, 4, 11]) { c.beginPath(); c.arc(x, -2.5, 1.2, 0, 7); c.fill(); }
      c.beginPath(); c.rect(9.5, -4, 3.5, 11); olFill(c, "#9aa3ab");
      c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(-5, -11, 5, 2.2, -.4, 0, 7); c.fill();
      break;
    }
    case "chapeu":
      c.fillStyle = "#3a2a6a"; c.beginPath(); c.ellipse(0, -8, 20, 5, 0, 0, 7); c.fill();
      c.beginPath(); c.moveTo(-12, -9); c.quadraticCurveTo(-4, -30, -14, -46); c.quadraticCurveTo(6, -30, 12, -9); c.fill();
      c.fillStyle = "#e8b84a"; c.fillRect(-11, -14, 23, 4); break;
    case "coroa": {
      c.beginPath(); c.moveTo(-13, -7); c.lineTo(-13, -23); c.lineTo(-6.5, -14); c.lineTo(0, -27); c.lineTo(6.5, -14); c.lineTo(13, -23); c.lineTo(13, -7); c.closePath();
      olFill(c, grad(c, 0, -27, 0, -7, "#fff0a8", "#c8962a"));
      c.fillStyle = "#a87a20"; c.fillRect(-13, -11, 26, 4);
      for (const [x, col] of [[-7, "#3a8ae0"], [0, "#e74c3c"], [7, "#2ecc71"]]) { c.fillStyle = col; c.beginPath(); c.arc(x, -9, 1.9, 0, 7); c.fill(); }
      c.fillStyle = "#fff"; for (const [x, y] of [[-13, -23], [0, -27], [13, -23]]) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); }
      break;
    }
    case "capuz":
      c.fillStyle = lookShade(base, -.45); c.beginPath(); c.arc(0, -1, 17, Math.PI * .75, Math.PI * 2.1); c.quadraticCurveTo(14, 12, 4, 14); c.lineTo(-16, 14); c.fill();
      c.fillStyle = LOOK_OUT; c.beginPath(); c.arc(3, 1, 11, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.arc(7, 0, 2.2, 0, 7); c.fill(); break;
    case "bandana":
      c.fillStyle = "#c0392b"; c.beginPath(); c.arc(0, -2, 14, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(14, -4); c.lineTo(-14, -4); c.fill();
      c.beginPath(); c.moveTo(-13, -6); c.lineTo(-26, -2 + Math.sin(t * 12) * 3); c.lineTo(-24, 4 + Math.sin(t * 12 + 1) * 3); c.closePath(); c.fill(); break;
    case "pluma": {
      // Elmo com penacho: penas vermelhas balançando atrás, domo de aço com viseira.
      const sw = Math.sin(t * 8) * 2.5;
      for (const [dy, col] of [[0, "#8a1a1a"], [3, "#e74c3c"], [6, "#ff7a6a"]]) {
        c.beginPath(); c.moveTo(-1, -14); c.quadraticCurveTo(-14, -38 + dy, -30, -20 + dy + sw); c.quadraticCurveTo(-14, -24 + dy, -4, -11); c.closePath();
        c.strokeStyle = LOOK_OUT; c.lineWidth = dy ? 0 : 2.5; if (!dy) c.stroke(); c.fillStyle = col; c.fill();
      }
      c.beginPath(); c.arc(0, -2, 15, Math.PI, 0); c.lineTo(15, 4); c.lineTo(-15, 4); c.closePath(); olFill(c, grad(c, -10, -16, 10, 4, "#e4e9ee", "#5c656c"));
      c.fillStyle = LOOK_OUT; c.fillRect(3, -4, 13, 3);
      c.beginPath(); c.rect(-2.5, -18, 5, 5); olFill(c, "#e8b84a");
      c.fillStyle = "rgba(255,255,255,.55)"; c.beginPath(); c.ellipse(-5, -10, 5, 2.2, -.4, 0, 7); c.fill();
      break;
    }
    case "tiara":
      c.strokeStyle = "#e8b84a"; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
      c.fillStyle = "#7ad8ff"; c.beginPath(); c.moveTo(0, -18); c.lineTo(3, -13); c.lineTo(0, -9); c.lineTo(-3, -13); c.fill(); break;
    case "bobo": {
      // Gorro de duas pontas caídas, com guizos que balançam.
      const sw = Math.sin(t * 6) * 2;
      c.fillStyle = "#c0392b"; c.beginPath(); c.moveTo(-12, -6); c.quadraticCurveTo(-16, -26, -29, -16 + sw); c.quadraticCurveTo(-16, -15, -2, -11); c.fill();
      c.fillStyle = "#2a6ad8"; c.beginPath(); c.moveTo(12, -6); c.quadraticCurveTo(15, -27, 27, -15 - sw); c.quadraticCurveTo(14, -14, 2, -11); c.fill();
      c.fillStyle = "#e8b84a"; c.beginPath(); c.arc(0, -3, 14, Math.PI * 1.08, Math.PI * 1.92); c.lineTo(13, -5); c.lineTo(-13, -5); c.fill();
      for (const [x, y] of [[-29, -16 + sw], [27, -15 - sw]]) { c.beginPath(); c.arc(x, y + 2, 3.6, 0, 7); c.fill(); }
      break;
    }
    case "pirata":
      // Chapéu de três pontas com caveira.
      c.fillStyle = "#1d1a1f"; c.beginPath(); c.moveTo(-23, -7); c.quadraticCurveTo(-15, -32, 0, -27); c.quadraticCurveTo(15, -32, 23, -7); c.quadraticCurveTo(0, -15, -23, -7); c.fill();
      c.strokeStyle = "#e8b84a"; c.lineWidth = 2; c.beginPath(); c.moveTo(-23, -7); c.quadraticCurveTo(0, -15, 23, -7); c.stroke();
      c.fillStyle = "#f3ead2"; c.beginPath(); c.arc(1, -20, 4, 0, 7); c.fill(); c.fillRect(-1, -17, 4, 3);
      c.fillStyle = "#1d1a1f"; c.fillRect(-1.5, -21, 1.6, 1.6); c.fillRect(2, -21, 1.6, 1.6); break;
    case "samurai": {
      // Kabuto: proteção de nuca em lâminas, casco laqueado, aba e crescente dourado.
      for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-13, -3 + i * 4); c.lineTo(-21 - i * 1.5, 1 + i * 5); c.lineTo(-6, 5 + i * 4); c.lineTo(-4, -1 + i * 4); c.closePath(); olFill(c, i % 2 ? "#5a1414" : "#8a1f1f"); }
      c.beginPath(); c.arc(0, -2, 15.5, Math.PI, 0); c.closePath(); olFill(c, grad(c, -10, -18, 10, 0, "#5a3a3a", "#1a0e0e"));
      c.strokeStyle = "#8a6a2a"; c.lineWidth = 1; for (let a = 1.15; a < 1.9; a += .12) { c.beginPath(); c.moveTo(0, -2); c.lineTo(Math.cos(a * Math.PI) * 15, -2 + Math.sin(a * Math.PI) * 15); c.stroke(); }
      c.beginPath(); c.moveTo(-17, -4); c.lineTo(19, -4); c.lineTo(17, 0); c.lineTo(-15, 0); c.closePath(); olFill(c, "#8a1f1f");
      c.beginPath(); c.moveTo(2, -14); c.quadraticCurveTo(-7, -26, -13, -36); c.quadraticCurveTo(-3, -28, 3, -18); c.quadraticCurveTo(10, -28, 18, -37); c.quadraticCurveTo(12, -25, 3, -13); c.closePath();
      olFill(c, grad(c, 0, -36, 0, -12, "#fff0a8", "#c8962a"));
      c.beginPath(); c.arc(2.5, -14, 3.5, 0, 7); olFill(c, "#e8b84a");
      c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-5, -11, 5, 2, -.4, 0, 7); c.fill();
      break;
    }
    case "cartola":
      c.fillStyle = "#1d1a1f"; c.beginPath(); c.ellipse(0, -10, 19, 4, 0, 0, 7); c.fill(); c.fillRect(-11, -37, 22, 27);
      c.beginPath(); c.ellipse(0, -37, 11, 3, 0, 0, 7); c.fill();
      c.fillStyle = base; c.fillRect(-11, -17, 22, 5);
      c.fillStyle = "rgba(255,255,255,.14)"; c.fillRect(-8, -35, 4, 17); break;
    case "aureola": {
      const y = -25 + Math.sin(t * 3) * 1.5;
      c.save(); c.shadowColor = "#ffe680"; c.shadowBlur = 12; c.strokeStyle = "#ffe680"; c.lineWidth = 3.5;
      c.beginPath(); c.ellipse(0, y, 13, 4, 0, 0, 7); c.stroke(); c.restore();
      c.strokeStyle = "#fffbe0"; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, y, 13, 4, 0, Math.PI * 1.1, Math.PI * 1.6); c.stroke(); break;
    }
    case "gato":
      for (const s of [-1, 1]) {
        c.fillStyle = lookShade(base, -.25); c.beginPath(); c.moveTo(s * 2, -12); c.lineTo(s * 12, -27); c.lineTo(s * 13, -6); c.fill();
        c.fillStyle = "#ff9ab8"; c.beginPath(); c.moveTo(s * 5, -11); c.lineTo(s * 11, -21); c.lineTo(s * 11, -9); c.fill();
      }
      break;
    case "astronauta": {
      // Capacete espacial: aro de metal, vidro com reflexo e antena piscando.
      c.beginPath(); c.rect(-15, 13, 30, 7); olFill(c, grad(c, 0, 13, 0, 20, "#e4e9ee", "#7d868e"));
      const gl = c.createRadialGradient(-6, -8, 2, 0, 0, 21); gl.addColorStop(0, "rgba(220,240,255,.35)"); gl.addColorStop(1, "rgba(120,180,240,.25)");
      c.fillStyle = gl; c.beginPath(); c.arc(0, 0, 20.5, 0, 7); c.fill();
      c.strokeStyle = LOOK_OUT; c.lineWidth = 5; c.stroke(); c.strokeStyle = "#dfe5ea"; c.lineWidth = 2.8; c.stroke();
      c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 2.6; c.beginPath(); c.arc(0, 0, 15.5, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
      c.fillStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.arc(8, -10, 2, 0, 7); c.fill();
      c.strokeStyle = "#9aa3ab"; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, -18); c.lineTo(-13, -29); c.stroke();
      c.fillStyle = Math.sin(t * 5) > 0 ? "#ff4a4a" : "#6a1a1a"; c.beginPath(); c.arc(-13, -30, 2.7, 0, 7); c.fill();
      break;
    }
  }
}

// ── Roupas: desenhadas no tronco, do pescoço (N) à cintura (Pv). fx = para onde olha (1/-1), s = escala.
// layer "back" (capas, mochila) vem antes dos membros; "front" vem depois do tronco.
// sway: -1..1, quanto o corpo anda pra frente (a capa voa pra trás).
function drawOutfit(c, id, layer, N, Pv, fx, s, base, t = 0, sway = 0) {
  if (!id || id === "nenhuma") return;
  const L = Math.hypot(Pv.x - N.x, Pv.y - N.y) / s, ang = Math.atan2(Pv.y - N.y, Pv.x - N.x) - Math.PI / 2;
  c.save(); c.translate(N.x, N.y); c.rotate(ang); c.scale(fx * s, s);
  c.lineJoin = "round"; c.lineCap = "round";
  // Polígono com contorno escuro (o traço vai antes, o preenchimento cobre a metade de dentro).
  const shape = (p, fill, ol = 4) => {
    c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath();
    if (ol) { c.strokeStyle = LOOK_OUT; c.lineWidth = ol; c.stroke(); }
    c.fillStyle = fill; c.fill();
  };
  const belt = (y, col = "#3b2a1c", buckle = "#e8b84a") => { c.fillStyle = col; c.fillRect(-10.5, y, 21, 4); c.fillStyle = buckle; c.fillRect(1, y - .8, 4, 5.6); };
  const cape = (col, trim) => {
    const sw = sway * 14 + Math.sin(t * 3) * 2.5, w1 = Math.sin(t * 7) * 2, w2 = Math.sin(t * 7 + 2) * 2;
    c.beginPath(); c.moveTo(5, -1);
    c.quadraticCurveTo(-3, L * .5, -6 - sw * .5, L + 26 + w1);
    c.lineTo(-14 - sw, L + 30 + w2); c.lineTo(-23 - sw * 1.4, L + 23 + w1);
    c.quadraticCurveTo(-14, L * .4, -5, -1); c.closePath();
    c.strokeStyle = LOOK_OUT; c.lineWidth = 4; c.stroke(); c.fillStyle = col; c.fill();
    if (trim) { c.strokeStyle = trim; c.lineWidth = 2; c.beginPath(); c.moveTo(-6 - sw * .5, L + 24 + w1); c.lineTo(-14 - sw, L + 28 + w2); c.lineTo(-22 - sw * 1.4, L + 21 + w1); c.stroke(); }
  };
  const armor = (dark, mid, light, ridge, gem) => {
    const g = c.createLinearGradient(-10, 0, 10, 0); g.addColorStop(0, dark); g.addColorStop(.62, light); g.addColorStop(1, mid);
    for (let i = 0; i < 3; i++) shape([-10 + i * 7, L - 3, -3 + i * 7, L - 3, -4 + i * 7, L + 8, -9 + i * 7, L + 8], i % 2 ? mid : light, 3);
    shape([-10, 2, 10, 2, 9, L - 3, 0, L + 1, -9, L - 3], g);
    c.strokeStyle = ridge; c.lineWidth = 1.2; c.beginPath(); c.moveTo(3, 4); c.lineTo(3, L - 3); c.stroke();
    if (gem) { c.fillStyle = gem; c.beginPath(); c.arc(3, 11, 2.6, 0, 7); c.fill(); }
    c.beginPath(); c.ellipse(1, 3, 10, 7, -.2, 0, 7); c.strokeStyle = LOOK_OUT; c.lineWidth = 4; c.stroke(); c.fillStyle = mid; c.fill();
    c.fillStyle = light; c.beginPath(); c.ellipse(-1, 1, 6, 3.5, -.2, 0, 7); c.fill();
  };
  if (layer === "back") {
    if (id === "capa") cape(lookShade(base, -.35));
    else if (id === "real") cape("#a01d2a", "#e8b84a");
    else if (id === "espacial") { shape([-6, 2, -16, 4, -16, L - 4, -6, L - 2], "#c3cad0"); c.fillStyle = Math.sin(t * 5) > 0 ? "#ff4a4a" : "#6a1a1a"; c.beginPath(); c.arc(-11, 8, 2.2, 0, 7); c.fill(); }
    c.restore(); return;
  }
  switch (id) {
    case "tunica":
      shape([-9, 1, 9, 1, 11, L + 9, -11, L + 9], lookShade(base, -.42));
      c.fillStyle = lookShade(base, -.65); c.beginPath(); c.moveTo(-1, 1); c.lineTo(7, 1); c.lineTo(3, 8); c.fill();
      c.fillStyle = "#e8b84a"; c.fillRect(-11, L + 6, 22, 2); belt(L - 6, "#5a3a22"); break;
    case "armadura": armor("#6c757d", "#9aa3ab", "#e4e9ee", "#5c656c"); break;
    case "dourada": armor("#8a6418", "#c8962a", "#ffe9a0", "#7a5a10", "#e74c3c"); break;
    case "cota": {
      shape([-10, 1, 10, 1, 11, L + 8, -11, L + 8], "#8f9aa3");
      c.strokeStyle = "#6c757d"; c.lineWidth = 1; c.beginPath();
      for (let y = 5, r = 0; y < L + 7; y += 4, r++) for (let x = -9 + (r % 2) * 2; x < 10; x += 4) { c.moveTo(x + 2, y); c.arc(x, y, 2, 0, Math.PI); }
      c.stroke();
      shape([-3, 2, 8, 2, 8, L + 13, -3, L + 13], base, 3);
      c.fillStyle = lookShade(base, .55); c.fillRect(1.5, 8, 2.4, 11); c.fillRect(-1, 11, 7.5, 2.4);
      belt(L - 5); break;
    }
    case "capa":
      c.fillStyle = "#e8b84a"; c.beginPath(); c.arc(4, 2, 3, 0, 7); c.fill(); break;
    case "manto":
      shape([-8, 0, 8, 0, 17, L + 32, -17, L + 32], "#3a2a6a");
      c.fillStyle = "#e8b84a"; c.fillRect(-17, L + 28, 34, 3); c.fillRect(2, 2, 2.5, L + 27);
      for (const [x, y] of [[-6, L * .55], [9, L + 12], [-10, L + 21]]) { c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 1.2 : 3.4, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); }
      c.strokeStyle = "#c9a86a"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, L - 4); c.lineTo(10, L - 4); c.moveTo(7, L - 4); c.lineTo(8, L + 8); c.stroke(); break;
    case "couro":
      shape([-9, 2, 9, 2, 10, L - 1, -10, L - 1], "#7a4e2a");
      c.strokeStyle = "#d9c08a"; c.lineWidth = 1.2; c.beginPath(); for (let y = 5; y < L - 4; y += 4) { c.moveTo(4, y); c.lineTo(8, y + 2); c.lineTo(4, y + 4); } c.stroke();
      c.fillStyle = "#d8c8a8"; c.beginPath(); c.ellipse(0, 1.5, 10.5, 3.6, 0, 0, 7); c.fill();
      belt(L - 4, "#3b2a1c", "#c9a86a"); shape([-11, L - 3, -5, L - 3, -5, L + 6, -11, L + 6], "#5a3a22", 2.5); break;
    case "ninja": {
      shape([-9, 1, 9, 1, 10, L + 6, -10, L + 6], "#2a2e36");
      c.strokeStyle = "#454c58"; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, 1); c.lineTo(8, L - 7); c.moveTo(8, 1); c.lineTo(1, 9); c.stroke();
      const w = Math.sin(t * 10) * 3, sw = sway * 8;
      c.fillStyle = "#c0392b";
      c.beginPath(); c.moveTo(-10, L - 6); c.lineTo(-25 - sw, L - 4 + w); c.lineTo(-23 - sw, L + 1 + w); c.lineTo(-10, L - 1); c.fill();
      c.beginPath(); c.moveTo(-10, L - 4); c.lineTo(-21 - sw, L + 6 - w); c.lineTo(-18 - sw, L + 10 - w); c.lineTo(-10, L); c.fill();
      c.fillRect(-10.5, L - 7, 21, 5);
      c.fillStyle = "#2a2e36"; c.beginPath(); c.ellipse(0, -1, 9.5, 3.8, 0, 0, 7); c.fill(); break;
    }
    case "pirata": {
      const p = [-9, 1, 9, 1, 10, L + 5, -10, L + 5];
      shape(p, "#f3ead2");
      c.save(); c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < 8; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.clip();
      c.fillStyle = "#1d1a1f"; for (let y = 4; y < L + 6; y += 6) c.fillRect(-12, y, 24, 2.6); c.restore();
      c.fillStyle = "#c0392b"; c.fillRect(-10.5, L - 7, 21, 5);
      c.beginPath(); c.moveTo(-9, L - 3); c.lineTo(-14, L + 9); c.lineTo(-10, L + 10); c.lineTo(-6, L - 2); c.fill(); break;
    }
    case "samurai": {
      for (let i = 0; i < 3; i++) shape([-10 + i * 7, L, -3 + i * 7, L, -4 + i * 7, L + 10, -9 + i * 7, L + 10], i % 2 ? "#2a1a1a" : "#8a1f1f", 3);
      shape([-10, 2, 10, 2, 10, L + 2, -10, L + 2], "#2a1a1a");
      for (let y = 4, r = 0; y < L; y += 5, r++) { c.fillStyle = r % 2 ? "#8a1f1f" : "#a8322a"; c.fillRect(-9, y, 18, 3.6); }
      c.strokeStyle = "rgba(232,184,74,.55)"; c.lineWidth = 1; c.beginPath(); for (const x of [-5, 0, 5]) { c.moveTo(x, 4); c.lineTo(x, L); } c.stroke();
      shape([-3, -1, 12, 1, 11, 14, -4, 12], "#8a1f1f", 3);
      c.strokeStyle = "#2a1a1a"; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-3.5, 4.5); c.lineTo(11.5, 6); c.moveTo(-3.8, 8.5); c.lineTo(11.3, 10); c.stroke(); break;
    }
    case "clerigo":
      shape([-8, 0, 8, 0, 15, L + 30, -15, L + 30], "#ecebe3");
      shape([1, 1, 6, 1, 7, L + 28, 2, L + 28], "#e8b84a", 0);
      c.fillStyle = "#c0392b"; c.fillRect(3.2, 7, 2, 9); c.fillRect(1, 9.5, 6.4, 2);
      c.strokeStyle = "#8a6a3a"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-10, L - 3); c.lineTo(10, L - 3); c.stroke(); break;
    case "espacial":
      shape([-10, 1, 10, 1, 11, L + 6, -11, L + 6], "#ecf0f1");
      c.fillStyle = base; c.fillRect(-10, L - 11, 21, 3);
      c.fillStyle = "#2a2e36"; c.fillRect(-1, 6, 9, 8);
      ["#5ac8ff", "#7dff6a", "#ffd84a"].forEach((col, i) => { c.fillStyle = Math.sin(t * 4 + i * 2) > -.3 ? col : "#333"; c.fillRect(.5 + i * 2.6, 8, 1.8, 1.8); });
      c.fillStyle = "#9aa3ab"; c.fillRect(-10.5, L - 4, 21, 4); break;
    case "esqueleto":
      shape([-9, 1, 9, 1, 9, L + 3, -9, L + 3], "#1d1a1f");
      c.strokeStyle = "#f3ead2"; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-3, 2); c.lineTo(-3, L + 1); c.stroke();
      c.lineWidth = 2; c.beginPath(); for (let i = 0; i < 4; i++) { const y = 6 + i * 6; c.moveTo(-3, y); c.quadraticCurveTo(6, y - 2, 8, y + 3); } c.stroke();
      c.beginPath(); c.ellipse(0, L, 6, 3, 0, 0, 7); c.stroke(); break;
    case "ferreiro":
      shape([-5, 4, 9, 4, 12, L + 26, -6, L + 26], "#6b4a2a");
      c.strokeStyle = "#4a3020"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-4, 5); c.quadraticCurveTo(1, -6, 8, 5); c.stroke();
      shape([0, L + 2, 9, L + 2, 9, L + 11, 0, L + 11], "#5a3a22", 2);
      c.fillStyle = "#c9a86a"; for (const [x, y] of [[-3, 7], [7, 7], [1, L + 3], [8, L + 3]]) { c.beginPath(); c.arc(x, y, 1.1, 0, 7); c.fill(); } break;
    case "real":
      c.strokeStyle = "#e8b84a"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-7, 4); c.quadraticCurveTo(0, 15, 7, 4); c.stroke();
      c.fillStyle = "#e8b84a"; c.beginPath(); c.arc(0, 12, 2.6, 0, 7); c.fill();
      c.beginPath(); c.ellipse(0, 2, 12, 5, 0, 0, 7); c.strokeStyle = LOOK_OUT; c.lineWidth = 4; c.stroke(); c.fillStyle = "#f6f3ea"; c.fill();
      c.fillStyle = "#1d1a1f"; for (const x of [-7, -1, 5]) c.fillRect(x, 1, 1.6, 2.6); break;
  }
  c.restore();
}

// Bonequinho parado (prévia do celular e figurinhas do menu da TV). (x, y) = cintura; k = escala.
function drawLookPreview(c, look, x, y, k = 1, t = 0, opts = {}) {
  const base = look.color || "#e74c3c", dark = lookShade(base, -.25), br = Math.sin(t * 2.2) * 1.2;
  const P = (dx, dy) => ({ x: x + dx * k, y: y + dy * k });
  const head = P(0, -62 + br), neck = P(0, -42 + br), pel = P(0, 0), le = P(-9, -24 + br), lh = P(-15, -7 + br), re = P(10, -24 + br), rh = P(19, -9 + br * 1.4);
  const lk = P(-7, 22), lf = P(-12, 44), rk = P(8, 22), rf = P(13, 44);
  const w = 8 * k, o = 4 * Math.sqrt(k);
  const limb = (a, b, d, col, wd = w) => { for (const [lw, cl] of [[wd + o, LOOK_OUT], [wd, col]]) { c.strokeStyle = cl; c.lineWidth = lw; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); if (d) c.lineTo(d.x, d.y); c.stroke(); } };
  c.lineCap = "round"; c.lineJoin = "round";
  if (!opts.noOutfit) drawOutfit(c, look.outfit, "back", neck, pel, 1, k, base, t, .3);
  limb(neck, le, lh, dark); limb(pel, lk, lf, dark); limb(pel, rk, rf, base); limb(neck, pel, null, base, w + 4 * k);
  if (!opts.noOutfit) drawOutfit(c, look.outfit, "front", neck, pel, 1, k, base, t, .3);
  limb(neck, re, rh, base);
  for (const h of [lh, rh]) { c.fillStyle = LOOK_OUT; c.beginPath(); c.arc(h.x, h.y, 6.5 * k, 0, 7); c.fill(); c.fillStyle = h === rh ? base : dark; c.beginPath(); c.arc(h.x, h.y, 4.5 * k, 0, 7); c.fill(); }
  c.fillStyle = LOOK_OUT; c.beginPath(); c.arc(head.x, head.y, 15.5 * k, 0, 7); c.fill();
  c.fillStyle = base; c.beginPath(); c.arc(head.x, head.y, 13 * k, 0, 7); c.fill();
  c.fillStyle = "rgba(255,255,255,.3)"; c.beginPath(); c.arc(head.x - 4 * k, head.y - 5 * k, 5 * k, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.ellipse(head.x + 5 * k, head.y - k, 4 * k, 5 * k, 0, 0, 7); c.fill();
  c.fillStyle = LOOK_OUT; c.beginPath(); c.arc(head.x + 6.5 * k, head.y - k, 2.2 * k, 0, 7); c.fill();
  c.save(); c.translate(head.x, head.y); c.scale(k, k); drawHatShape(c, look.hat, base, t); c.restore();
}
