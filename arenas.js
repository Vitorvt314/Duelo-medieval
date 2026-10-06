// As 30 arenas do Duelo Medieval. Cada uma tem:
//   platforms  — onde dá pra subir (o chão é sempre FLOOR)
//   paint(c,R) — cenário estático (céu, fundo, chão, plataformas), pintado uma vez
//   anim(c,t)  — partes animadas atrás dos lutadores (água, lava, tochas...)
//   front(c,t) — efeitos na frente (neblina, brilho)
//   amb        — partículas de ambiente (neve, vaga-lumes, brasas...)
//   grav       — (opcional) multiplicador da gravidade: a Lua e o fundo do mar são mais leves
"use strict";
const ARENA_W = 1600, ARENA_H = 900, ARENA_FLOOR = 800;

// Aleatório com semente: o cenário sai igual toda vez que a arena é pintada.
function seeded(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const ArenaPaint = {
  sky(c, stops) {
    const g = c.createLinearGradient(0, 0, 0, ARENA_FLOOR);
    stops.forEach((col, i) => g.addColorStop(i / (stops.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, ARENA_W, ARENA_H);
  },
  stars(c, R, n, maxY, alpha = .7) { for (let i = 0; i < n; i++) { c.fillStyle = `rgba(255,255,255,${R() * alpha})`; const s = R() < .1 ? 2.5 : 1.5; c.fillRect(R() * ARENA_W, R() * maxY, s, s); } },
  orb(c, x, y, r, color, glow) {
    const g = c.createRadialGradient(x, y, r * .5, x, y, r * 4); g.addColorStop(0, glow); g.addColorStop(1, glow.slice(0, 7) + "00");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 4, 0, 7); c.fill();
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  },
  ridge(c, R, color, base, amp, rough = 1) {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, ARENA_FLOOR);
    const p1 = R() * 10, p2 = R() * 10;
    for (let x = 0; x <= ARENA_W; x += 20) c.lineTo(x, base - Math.sin(x * .004 + p1) * amp - Math.sin(x * .011 + p2) * amp * .4 * rough - (R() - .5) * 6 * rough);
    c.lineTo(ARENA_W, ARENA_FLOOR); c.fill();
  },
  fog(c, y, h, color) { const g = c.createLinearGradient(0, y - h, 0, y + h); g.addColorStop(0, color.slice(0, 7) + "00"); g.addColorStop(.5, color); g.addColorStop(1, color.slice(0, 7) + "00"); c.fillStyle = g; c.fillRect(0, y - h, ARENA_W, h * 2); },
  castle(c, x, top, w, color, light) {
    c.fillStyle = color; c.fillRect(x, top, w, ARENA_FLOOR - top);
    for (let bx = x; bx < x + w; bx += 18) c.fillRect(bx, top - 14, 10, 14);
    if (light) { c.fillStyle = light; c.fillRect(x + w / 2 - 5, top + 40, 10, 18); }
  },
  tree(c, x, base, h, trunk, leaf, R) {
    c.fillStyle = trunk; c.fillRect(x - h * .04, base - h * .55, h * .08, h * .55);
    c.fillStyle = leaf;
    for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(x + (R() - .5) * h * .3, base - h * .6 - R() * h * .3, h * (.07 + R() * .06), 0, 7); c.fill(); }
  },
  pine(c, x, base, h, color, snow) {
    c.fillStyle = color;
    for (let i = 0; i < 3; i++) { const y = base - h * (.25 + i * .25), w = h * (.32 - i * .08); c.beginPath(); c.moveTo(x, y - h * .3); c.lineTo(x - w, y + h * .05); c.lineTo(x + w, y + h * .05); c.fill(); if (snow) { c.fillStyle = snow; c.beginPath(); c.moveTo(x, y - h * .3); c.lineTo(x - w * .4, y - h * .16); c.lineTo(x + w * .4, y - h * .16); c.fill(); c.fillStyle = color; } }
    c.fillRect(x - 3, base - h * .2, 6, h * .2);
  },
  // ── Chão
  floor(c, R, style, top, bottom, accent) {
    const g = c.createLinearGradient(0, ARENA_FLOOR, 0, ARENA_H); g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, ARENA_FLOOR, ARENA_W, ARENA_H - ARENA_FLOOR);
    c.strokeStyle = "#00000044"; c.lineWidth = 2;
    if (style === "stone") {
      for (let row = 0; row < 4; row++) {
        const y = ARENA_FLOOR + row * 25; c.beginPath(); c.moveTo(0, y); c.lineTo(ARENA_W, y); c.stroke();
        for (let x = (row % 2) * 40; x < ARENA_W; x += 80) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 25); c.stroke(); }
      }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
    } else if (style === "grass") {
      for (let i = 0; i < 40; i++) { c.fillStyle = "#00000022"; c.beginPath(); c.ellipse(R() * ARENA_W, ARENA_FLOOR + 30 + R() * 60, 20 + R() * 30, 5, 0, 0, 7); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 6);
      c.strokeStyle = accent; c.lineWidth = 2;
      for (let x = 0; x < ARENA_W; x += 5) { const h = 6 + R() * 12; c.beginPath(); c.moveTo(x, ARENA_FLOOR + 4); c.lineTo(x + (R() - .5) * 6, ARENA_FLOOR - h); c.stroke(); }
    } else if (style === "snow") {
      c.fillStyle = accent; c.beginPath(); c.moveTo(0, ARENA_FLOOR + 14);
      for (let x = 0; x <= ARENA_W; x += 40) c.quadraticCurveTo(x + 20, ARENA_FLOOR - 4 - R() * 6, x + 40, ARENA_FLOOR + 2);
      c.lineTo(ARENA_W, ARENA_FLOOR + 18); c.lineTo(0, ARENA_FLOOR + 18); c.fill();
      for (let i = 0; i < 30; i++) { c.fillStyle = "#ffffff22"; c.fillRect(R() * ARENA_W, ARENA_FLOOR + 30 + R() * 60, 30 + R() * 50, 2); }
    } else if (style === "sand") {
      c.strokeStyle = "#00000018";
      for (let i = 0; i < 26; i++) { const y = ARENA_FLOOR + 12 + R() * 80, x = R() * ARENA_W; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 60, y - 6, x + 120, y); c.stroke(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
    } else if (style === "wood") {
      for (let x = 0; x < ARENA_W; x += 60) { c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.lineTo(x, ARENA_H); c.stroke(); c.fillStyle = "#00000033"; c.beginPath(); c.arc(x + 30, ARENA_FLOOR + 14, 2, 0, 7); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 6);
    } else if (style === "lava") {
      c.strokeStyle = "#ff6a1a"; c.lineWidth = 2; c.shadowColor = "#ff6a1a"; c.shadowBlur = 8;
      for (let i = 0; i < 18; i++) { let x = R() * ARENA_W, y = ARENA_FLOOR + 10 + R() * 70; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += 15 + R() * 25; y += (R() - .5) * 20; c.lineTo(x, y); } c.stroke(); }
      c.shadowBlur = 0; c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
    } else if (style === "dirt") {
      for (let i = 0; i < 50; i++) { c.fillStyle = "#00000025"; c.beginPath(); c.arc(R() * ARENA_W, ARENA_FLOOR + 10 + R() * 80, 2 + R() * 4, 0, 7); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
      c.strokeStyle = accent; c.lineWidth = 1.5;
      for (let x = 0; x < ARENA_W; x += 9) if (R() < .5) { c.beginPath(); c.moveTo(x, ARENA_FLOOR + 3); c.lineTo(x + (R() - .5) * 8, ARENA_FLOOR - 4 - R() * 8); c.stroke(); }
    } else if (style === "crystal") {
      for (let i = 0; i < 16; i++) { const x = R() * ARENA_W, y = ARENA_FLOOR + 20 + R() * 60, s = 6 + R() * 10; c.fillStyle = "#c58bff55"; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .5, y); c.lineTo(x, y + s); c.lineTo(x - s * .5, y); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
    } else if (style === "metal") {
      for (let x = 0; x < ARENA_W; x += 100) { c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.lineTo(x, ARENA_H); c.stroke(); for (const yy of [16, 70]) { c.fillStyle = "#ffffff22"; c.beginPath(); c.arc(x + 10, ARENA_FLOOR + yy, 2.5, 0, 7); c.arc(x + 90, ARENA_FLOOR + yy, 2.5, 0, 7); c.fill(); } }
      for (let x = 0; x < ARENA_W; x += 40) { c.fillStyle = (x / 40) % 2 ? "#e8b84a" : "#1a1a1a"; c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.lineTo(x + 40, ARENA_FLOOR); c.lineTo(x + 30, ARENA_FLOOR + 8); c.lineTo(x - 10, ARENA_FLOOR + 8); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 3);
    } else if (style === "candy") {
      for (let i = 0; i < 140; i++) { c.fillStyle = ["#ff6fb5", "#7ad8ff", "#ffe95a", "#7dff9a", "#ffffff"][i % 5]; c.save(); c.translate(R() * ARENA_W, ARENA_FLOOR + 14 + R() * 80); c.rotate(R() * 3); c.fillRect(-4, -1.2, 8, 2.4); c.restore(); }
      c.fillStyle = accent; c.beginPath(); c.moveTo(0, ARENA_FLOOR + 10);
      for (let x = 0; x <= ARENA_W; x += 30) c.quadraticCurveTo(x + 15, ARENA_FLOOR + 18 + R() * 14, x + 30, ARENA_FLOOR + 10);
      c.lineTo(ARENA_W, ARENA_FLOOR); c.lineTo(0, ARENA_FLOOR); c.fill();
    } else if (style === "moon") {
      for (let i = 0; i < 26; i++) { const x = R() * ARENA_W, y = ARENA_FLOOR + 20 + R() * 70, r = 8 + R() * 26; c.fillStyle = "#00000030"; c.beginPath(); c.ellipse(x, y, r, r * .3, 0, 0, 7); c.fill(); c.fillStyle = "#ffffff18"; c.beginPath(); c.ellipse(x, y + r * .12, r * .8, r * .2, 0, 0, Math.PI); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 4);
    } else if (style === "arena") {
      for (let i = 0; i < 40; i++) { c.fillStyle = "#00000014"; c.beginPath(); c.ellipse(R() * ARENA_W, ARENA_FLOOR + 20 + R() * 70, 30 + R() * 40, 4, 0, 0, 7); c.fill(); }
      c.fillStyle = accent; c.fillRect(0, ARENA_FLOOR, ARENA_W, 5);
      c.fillStyle = "#ffffff22"; c.fillRect(ARENA_W / 2 - 2, ARENA_FLOOR + 5, 4, ARENA_H);
    }
  },
  // ── Plataformas
  platform(c, p, style, R) {
    const { x, y, w } = p;
    const shade = (top, body, edge) => { c.fillStyle = body; c.fillRect(x, y, w, 22); c.fillStyle = top; c.fillRect(x, y, w, 6); c.fillStyle = edge; c.fillRect(x, y + 20, w, 3); };
    if (style === "stone" || style === "marble") {
      const [top, body] = style === "stone" ? ["#8a7258", "#5b4a3a"] : ["#efe6d6", "#c9bda6"];
      shade(top, body, "#0004");
      c.strokeStyle = "#0003"; c.lineWidth = 2; for (let bx = x + 35; bx < x + w; bx += 35) { c.beginPath(); c.moveTo(bx, y + 6); c.lineTo(bx, y + 22); c.stroke(); }
      c.fillStyle = style === "stone" ? "#3b2f25" : "#a89a82"; c.fillRect(x + 14, y + 22, 10, 30); c.fillRect(x + w - 24, y + 22, 10, 30);
    } else if (style === "wood") {
      shade("#a8794a", "#7a5232", "#0005");
      c.strokeStyle = "#0004"; c.lineWidth = 2; for (let bx = x + 30; bx < x + w; bx += 30) { c.beginPath(); c.moveTo(bx, y + 3); c.lineTo(bx, y + 22); c.stroke(); }
      c.strokeStyle = "#c9a878"; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 6, y + 22); c.lineTo(x + 6, y - 120); c.moveTo(x + w - 6, y + 22); c.lineTo(x + w - 6, y - 120); c.stroke();
    } else if (style === "branch") {
      c.fillStyle = "#3d2a1a"; c.beginPath(); c.moveTo(x - 10, y + 4); c.quadraticCurveTo(x + w / 2, y - 6, x + w + 10, y + 6); c.lineTo(x + w + 6, y + 20); c.quadraticCurveTo(x + w / 2, y + 12, x - 6, y + 20); c.fill();
      c.fillStyle = "#5a3e26"; c.fillRect(x, y, w, 5);
      for (let i = 0; i < w / 16; i++) { c.fillStyle = R() < .5 ? "#2f6b2f" : "#3f8a3a"; c.beginPath(); c.ellipse(x + R() * w, y + 2 + R() * 6, 9, 5, R() * 3, 0, 7); c.fill(); }
    } else if (style === "ice") {
      c.fillStyle = "#bfe8ffcc"; c.fillRect(x, y, w, 18); c.fillStyle = "#ffffff"; c.fillRect(x, y, w, 5);
      c.fillStyle = "#bfe8ffaa"; for (let ix = x + 8; ix < x + w - 6; ix += 14) { const h = 8 + R() * 18; c.beginPath(); c.moveTo(ix, y + 18); c.lineTo(ix + 5, y + 18 + h); c.lineTo(ix + 10, y + 18); c.fill(); }
    } else if (style === "rock" || style === "crystal") {
      c.fillStyle = "#4a3f5a"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 14, y + 28); c.lineTo(x + w * .6, y + 60); c.lineTo(x + w * .3, y + 48); c.lineTo(x + 12, y + 26); c.fill();
      c.fillStyle = "#6e6283"; c.fillRect(x, y, w, 6);
      if (style === "crystal") for (let i = 0; i < 3; i++) { const cx = x + 20 + R() * (w - 40); c.fillStyle = "#c58bffcc"; c.beginPath(); c.moveTo(cx, y + 30 + R() * 20); c.lineTo(cx - 6, y + 14); c.lineTo(cx, y + 8); c.lineTo(cx + 6, y + 14); c.fill(); }
    } else if (style === "basalt") {
      shade("#4a3a36", "#2a1f1d", "#ff5a1a88");
      c.strokeStyle = "#ff6a1a"; c.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const sx = x + R() * w; c.beginPath(); c.moveTo(sx, y + 6); c.lineTo(sx + 8, y + 14); c.lineTo(sx + 4, y + 22); c.stroke(); }
    } else if (style === "sandstone") {
      shade("#e8c98a", "#c49a5a", "#0003");
      c.fillStyle = "#a87c42"; for (let bx = x + 20; bx < x + w - 10; bx += 40) c.fillRect(bx, y + 9, 16, 4);
      c.fillStyle = "#b08850"; c.fillRect(x + 10, y + 22, 14, 40); c.fillRect(x + w - 24, y + 22, 14, 40);
    } else if (style === "metal") {
      shade("#9aa3ab", "#4a5260", "#0006");
      c.fillStyle = "#2a2e36"; for (let bx = x + 6; bx < x + w; bx += 24) { c.beginPath(); c.arc(bx, y + 14, 2, 0, 7); c.fill(); }
      c.fillStyle = "#5affd8"; c.fillRect(x + 4, y + 18, w - 8, 2);
      c.fillStyle = "#3a404a"; c.fillRect(x + w / 2 - 6, y + 22, 12, 40);
    } else if (style === "bamboo") {
      for (let k = 0; k < 2; k++) { const yy = y + 4 + k * 10; c.fillStyle = "#4a7a2a"; c.fillRect(x, yy - 5, w, 10); c.fillStyle = "#8ac05a"; c.fillRect(x, yy - 5, w, 3); c.fillStyle = "#3a5a1a"; for (let bx = x + 20 + k * 12; bx < x + w; bx += 40) c.fillRect(bx, yy - 5, 3, 10); }
      c.strokeStyle = "#6a4a2a"; c.lineWidth = 3; for (const bx of [x + 12, x + w - 12]) { c.beginPath(); c.moveTo(bx - 6, y - 2); c.lineTo(bx + 6, y + 22); c.moveTo(bx + 6, y - 2); c.lineTo(bx - 6, y + 22); c.stroke(); }
    } else if (style === "log") {
      c.fillStyle = "#4a3020"; c.fillRect(x, y, w, 20); c.fillStyle = "#6a4a2a"; c.fillRect(x, y, w, 6);
      c.strokeStyle = "#3a2010"; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const sx = x + R() * w; c.beginPath(); c.moveTo(sx, y + 8); c.lineTo(sx + 30, y + 10); c.stroke(); }
      for (const ex of [x, x + w]) { c.fillStyle = "#8a6a3a"; c.beginPath(); c.ellipse(ex, y + 10, 6, 10, 0, 0, 7); c.fill(); c.strokeStyle = "#5a3a1a"; c.beginPath(); c.ellipse(ex, y + 10, 3, 6, 0, 0, 7); c.stroke(); }
      c.fillStyle = "#3a7a3a"; for (let i = 0; i < w / 40; i++) { c.beginPath(); c.ellipse(x + R() * w, y + 1, 8, 3, 0, 0, 7); c.fill(); }
    } else if (style === "candy") {
      c.fillStyle = "#e8a05a"; c.fillRect(x, y, w, 22);
      c.strokeStyle = "#c87a3a"; c.lineWidth = 1.5; for (let bx = x + 8; bx < x + w; bx += 12) { c.beginPath(); c.moveTo(bx, y + 6); c.lineTo(bx, y + 22); c.stroke(); }
      c.fillStyle = "#ff9ad0"; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + w + 4, y);
      for (let bx = x + w; bx > x; bx -= 22) { c.lineTo(bx, y + 6); c.quadraticCurveTo(bx - 5, y + 14 + R() * 8, bx - 11, y + 6); }
      c.lineTo(x - 4, y + 6); c.fill(); c.fillStyle = "#ffffff88"; c.fillRect(x, y + 1, w, 2);
    } else if (style === "coral") {
      c.fillStyle = "#c85a6a"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 10, y + 24); c.lineTo(x + w * .5, y + 40); c.lineTo(x + 10, y + 24); c.fill();
      c.fillStyle = "#ff8a9a"; c.fillRect(x, y, w, 6);
      for (let i = 0; i < w / 18; i++) { c.fillStyle = ["#ffb34a", "#ff6fb5", "#b06cff"][i % 3]; c.beginPath(); c.arc(x + 8 + R() * (w - 16), y + 10 + R() * 18, 2.5 + R() * 3, 0, 7); c.fill(); }
    } else if (style === "balcony") {
      shade("#7a1a20", "#4a0a10", "#0006");
      c.fillStyle = "#e8b84a"; c.fillRect(x, y - 2, w, 4); c.fillRect(x, y + 18, w, 3);
      c.strokeStyle = "#c8962a"; c.lineWidth = 2; for (let bx = x + 10; bx < x + w; bx += 14) { c.beginPath(); c.moveTo(bx, y + 4); c.quadraticCurveTo(bx + 5, y + 11, bx, y + 18); c.stroke(); }
    } else if (style === "mushroom") {
      // Chapéu de cogumelo achatado (dá pra ficar em pé em cima).
      c.fillStyle = "#e8dcc8"; c.fillRect(x + w / 2 - 16, y + 18, 32, 60); c.fillStyle = "#c8b8a0"; c.fillRect(x + w / 2 + 6, y + 18, 6, 60);
      const g = c.createLinearGradient(0, y, 0, y + 28); g.addColorStop(0, "#ff5a6a"); g.addColorStop(1, "#a01a2a");
      c.fillStyle = "#3a0a14"; c.beginPath(); c.moveTo(x - 9, y + 29); c.quadraticCurveTo(x - 9, y - 3, x + 16, y - 3); c.lineTo(x + w - 16, y - 3); c.quadraticCurveTo(x + w + 9, y - 3, x + w + 9, y + 29); c.closePath(); c.fill();
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 6, y + 26); c.quadraticCurveTo(x - 6, y, x + 16, y); c.lineTo(x + w - 16, y); c.quadraticCurveTo(x + w + 6, y, x + w + 6, y + 26); c.closePath(); c.fill();
      c.fillStyle = "#f0e0c8"; c.fillRect(x - 2, y + 22, w + 4, 6);
      c.fillStyle = "#ffffffdd"; for (let i = 0; i < w / 30; i++) { c.beginPath(); c.ellipse(x + 14 + R() * (w - 28), y + 7 + R() * 10, 5 + R() * 5, 3 + R() * 2, 0, 0, 7); c.fill(); }
      c.fillStyle = "#ffffff44"; c.fillRect(x + 10, y + 2, w - 20, 3);
    } else if (style === "alien") {
      c.fillStyle = "#2a0a3a"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 18, y + 30); c.lineTo(x + w * .55, y + 56); c.lineTo(x + w * .3, y + 40); c.lineTo(x + 14, y + 28); c.fill();
      c.fillStyle = "#6a3a8a"; c.fillRect(x, y, w, 7);
      c.strokeStyle = "#5affd8"; c.lineWidth = 2; c.shadowColor = "#5affd8"; c.shadowBlur = 8;
      for (let i = 0; i < 3; i++) { let sx = x + 20 + R() * (w - 40), sy = y + 10; c.beginPath(); c.moveTo(sx, sy); for (let k = 0; k < 3; k++) { sx += (R() - .5) * 24; sy += 8 + R() * 8; c.lineTo(sx, sy); } c.stroke(); }
      c.shadowBlur = 0;
    } else if (style === "slab") {
      shade("#7d7f86", "#55575e", "#0005");
      c.fillStyle = "#3a6b3a88"; for (let i = 0; i < 4; i++) c.fillRect(x + R() * (w - 20), y + 2, 14, 4);
    }
  },
};

function torchAnim(c, t, pts, color = "#ffb34a") {
  for (const [tx, ty] of pts) {
    const fl = 1 + Math.sin(t * 17 + tx) * .08 + Math.sin(t * 31 + ty) * .04;
    const g = c.createRadialGradient(tx, ty, 2, tx, ty, 130 * fl); g.addColorStop(0, color + "55"); g.addColorStop(1, color + "00");
    c.fillStyle = g; c.beginPath(); c.arc(tx, ty, 130 * fl, 0, 7); c.fill();
    c.fillStyle = "#4a3426"; c.fillRect(tx - 3, ty, 6, 22);
    c.fillStyle = "#ff8a2a"; c.beginPath(); c.ellipse(tx, ty - 5, 7 * fl, 13 * fl, 0, 0, 7); c.fill();
    c.fillStyle = "#ffe08a"; c.beginPath(); c.ellipse(tx, ty - 2, 3.5 * fl, 7 * fl, 0, 0, 7); c.fill();
  }
}

const ARENAS = [
  {
    id: "castelo", name: "Castelo ao Entardecer", sub: "Muralhas e tochas",
    platforms: [{ x: 230, y: 590, w: 280 }, { x: 1090, y: 590, w: 280 }, { x: 660, y: 430, w: 280 }],
    plat: "stone", vignette: .45, amb: { kind: "dust", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1d1636", "#5a2f4a", "#d9774a"]); P.stars(c, R, 80, 300);
      P.orb(c, 1240, 210, 56, "#ffe2a8", "#ffd27a55");
      P.ridge(c, R, "#3a2238", 560, 60);
      for (const [x, top, w] of [[180, 360, 90], [270, 430, 160], [430, 330, 70], [500, 450, 200], [1150, 470, 260], [1410, 380, 80]]) P.castle(c, x, top, w, "#2a1828", "#f7c46a66");
      P.fog(c, 700, 60, "#d9774a33");
      P.floor(c, R, "stone", "#6b5a4a", "#2e251e", "#a08a6e");
    },
    torches: [[48, 520], [1552, 520], [680, 400], [920, 400]],
    anim(c, t) { torchAnim(c, t, this.torches); },
  },
  {
    id: "floresta", name: "Floresta Encantada", sub: "Galhos e vaga-lumes",
    platforms: [{ x: 150, y: 570, w: 230 }, { x: 685, y: 480, w: 230 }, { x: 1220, y: 570, w: 230 }, { x: 410, y: 340, w: 170 }, { x: 1020, y: 340, w: 170 }],
    plat: "branch", vignette: .5, amb: { kind: "fireflies", rate: 10 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0b1f1c", "#14402f", "#3f7a4a"]);
      for (let i = 0; i < 6; i++) { c.fillStyle = "#c8ffd012"; c.beginPath(); const x = 200 + i * 260; c.moveTo(x, 0); c.lineTo(x + 80, 0); c.lineTo(x + 260, ARENA_FLOOR); c.lineTo(x + 120, ARENA_FLOOR); c.fill(); }
      for (const [n, h, col, leaf] of [[16, 360, "#12302a", "#163b2f"], [11, 480, "#0e2620", "#1b4a35"], [7, 600, "#0a1c17", "#22573c"]]) for (let i = 0; i < n; i++) P.tree(c, R() * ARENA_W, ARENA_FLOOR, h * (.8 + R() * .3), col, leaf, R);
      P.fog(c, 760, 70, "#a8e6c033");
      P.floor(c, R, "grass", "#3b2a1a", "#1a120b", "#3f8a3a");
    },
    anim() {},
    front(c, t) { c.fillStyle = `rgba(160,230,190,${.05 + Math.sin(t * .5) * .02})`; c.fillRect(0, 640, ARENA_W, 160); },
  },
  {
    id: "masmorra", name: "Masmorra Sombria", sub: "Correntes e pedras",
    platforms: [{ x: 90, y: 620, w: 310 }, { x: 1200, y: 620, w: 310 }, { x: 560, y: 510, w: 480 }, { x: 700, y: 330, w: 200 }],
    plat: "stone", vignette: .7, amb: { kind: "dust", rate: 10 },
    paint(c, R) {
      c.fillStyle = "#1c1715"; c.fillRect(0, 0, ARENA_W, ARENA_H);
      for (let row = 0; row < 20; row++) for (let col = 0; col < 26; col++) {
        const x = col * 64 + (row % 2) * 32, y = row * 40; const v = 28 + R() * 14;
        c.fillStyle = `rgb(${v + 6},${v},${v - 4})`; c.fillRect(x + 1, y + 1, 62, 38);
      }
      for (const ax of [300, 800, 1300]) { c.fillStyle = "#0c0a09"; c.beginPath(); c.moveTo(ax - 110, ARENA_FLOOR); c.lineTo(ax - 110, 380); c.arc(ax, 380, 110, Math.PI, 0); c.lineTo(ax + 110, ARENA_FLOOR); c.fill(); }
      c.fillStyle = "#9ac4ff22"; c.beginPath(); c.moveTo(760, 80); c.lineTo(840, 80); c.lineTo(980, ARENA_FLOOR); c.lineTo(620, ARENA_FLOOR); c.fill();
      c.fillStyle = "#0c0a09"; c.fillRect(760, 60, 80, 60); c.strokeStyle = "#555"; c.lineWidth = 4; for (let bx = 772; bx < 840; bx += 16) { c.beginPath(); c.moveTo(bx, 60); c.lineTo(bx, 120); c.stroke(); }
      c.strokeStyle = "#4a4a4a"; c.lineWidth = 3; for (const cx of [150, 520, 1080, 1450]) { c.beginPath(); for (let y = 0; y < 260; y += 12) c.ellipse(cx, y, 4, 7, 0, 0, 7); c.stroke(); }
      ArenaPaint.floor(c, R, "stone", "#3d3530", "#151210", "#5d544c");
    },
    torches: [[200, 480], [1400, 480], [560, 300], [1040, 300]],
    anim(c, t) { torchAnim(c, t, this.torches, "#ff9a3a"); },
  },
  {
    id: "neve", name: "Pico Nevado", sub: "Cuidado com a avalanche", event: "avalanche",
    platforms: [{ x: 190, y: 640, w: 250 }, { x: 500, y: 500, w: 210 }, { x: 890, y: 500, w: 210 }, { x: 1160, y: 640, w: 250 }],
    plat: "ice", vignette: .35, amb: { kind: "snow", rate: 60 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#4a6a96", "#8fb2d6", "#dfeefa"]);
      P.orb(c, 380, 170, 40, "#fffbe8", "#ffffff44");
      for (const [base, amp, col] of [[430, 140, "#b8cce4"], [540, 110, "#90a8c8"], [640, 70, "#6d86a8"]]) {
        P.ridge(c, R, col, base, amp, 1.6);
      }
      c.fillStyle = "#ffffffcc";
      for (let i = 0; i < 9; i++) { const x = R() * ARENA_W; c.beginPath(); c.moveTo(x, 300 + R() * 60); c.lineTo(x - 40, 360 + R() * 40); c.lineTo(x + 40, 360 + R() * 40); c.fill(); }
      for (let i = 0; i < 22; i++) P.pine(c, R() * ARENA_W, ARENA_FLOOR - R() * 40, 90 + R() * 80, "#2a4a4a", "#ffffffdd");
      P.floor(c, R, "snow", "#d8e8f5", "#8aa8c4", "#ffffff");
    },
    anim() {},
    front(c, t) { c.fillStyle = `rgba(255,255,255,${.05 + Math.sin(t * .7) * .03})`; c.fillRect(0, 0, ARENA_W, ARENA_H); },
  },
  {
    id: "vulcao", name: "Coração do Vulcão", sub: "Rios de lava e calor de rachar",
    // Andares pra escalar: a lava cobre primeiro o chão e as de baixo, depois o meio.
    platforms: [{ x: 110, y: 650, w: 230 }, { x: 1260, y: 650, w: 230 }, { x: 460, y: 530, w: 210 }, { x: 930, y: 530, w: 210 },
                { x: 690, y: 400, w: 220 }, { x: 260, y: 290, w: 210 }, { x: 1130, y: 290, w: 210 }, { x: 690, y: 175, w: 220 }],
    plat: "basalt", vignette: .55, amb: { kind: "embers", rate: 26 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a0808", "#4a1210", "#a8341a"]);
      c.fillStyle = "#2a0f0c"; c.beginPath(); c.moveTo(380, ARENA_FLOOR); c.lineTo(720, 260); c.lineTo(880, 260); c.lineTo(1220, ARENA_FLOOR); c.fill();
      c.strokeStyle = "#ff6a1a"; c.lineWidth = 8; c.shadowColor = "#ff4a0a"; c.shadowBlur = 25;
      c.beginPath(); c.moveTo(800, 262); c.bezierCurveTo(770, 400, 840, 500, 790, ARENA_FLOOR); c.stroke(); c.shadowBlur = 0;
      for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(60,40,40,${.3 + R() * .2})`; c.beginPath(); c.arc(800 + (R() - .5) * 140, 220 - i * 50, 50 + i * 20, 0, 7); c.fill(); }
      P.ridge(c, R, "#1d0a08", 640, 40, 2);
      P.floor(c, R, "lava", "#2a1a17", "#0e0706", "#5a3a30");
    },
    anim(c, t) {
      const g = c.createLinearGradient(0, ARENA_FLOOR - 120, 0, ARENA_FLOOR);
      g.addColorStop(0, "#ff4a0a00"); g.addColorStop(1, `rgba(255,90,20,${.18 + Math.sin(t * 2) * .06})`);
      c.fillStyle = g; c.fillRect(0, ARENA_FLOOR - 120, ARENA_W, 120);
    },
  },
  {
    id: "deserto", name: "Ruínas do Deserto", sub: "Pirâmides e areia",
    platforms: [{ x: 590, y: 560, w: 420 }, { x: 160, y: 640, w: 200 }, { x: 1240, y: 640, w: 200 }],
    plat: "sandstone", vignette: .3, amb: { kind: "sand", rate: 30 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#3a6ab0", "#8ab4d8", "#f6d9a0"]);
      P.orb(c, 1200, 180, 70, "#fff6d0", "#ffe08a66");
      for (const [x, s, col] of [[340, 260, "#c9965a"], [560, 180, "#b8864c"], [1320, 220, "#c49058"]]) { c.fillStyle = col; c.beginPath(); c.moveTo(x - s, 700); c.lineTo(x, 700 - s * 1.1); c.lineTo(x + s, 700); c.fill(); c.fillStyle = "#00000022"; c.beginPath(); c.moveTo(x, 700 - s * 1.1); c.lineTo(x + s, 700); c.lineTo(x + s * .3, 700); c.fill(); }
      P.ridge(c, R, "#e0b878", 690, 30); P.ridge(c, R, "#d4a868", 740, 20);
      for (const x of [880, 940, 1020]) { c.fillStyle = "#c8a070"; c.fillRect(x, 520 + (x % 3) * 20, 24, 280); c.fillStyle = "#b08850"; c.fillRect(x - 4, 520 + (x % 3) * 20, 32, 10); }
      P.floor(c, R, "sand", "#e6c27e", "#b88a4a", "#f0d49a");
    },
    anim() {},
    front(c, t) { c.fillStyle = `rgba(255,220,150,${.06 + Math.sin(t) * .02})`; c.fillRect(0, 0, ARENA_W, ARENA_H); },
  },
  {
    id: "porto", name: "Porto dos Piratas", sub: "Chuva, navios e canhões",
    platforms: [{ x: 110, y: 600, w: 360 }, { x: 1130, y: 600, w: 360 }, { x: 640, y: 420, w: 320 }],
    plat: "wood", vignette: .45, amb: { kind: "spray", rate: 8 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0e1a33", "#24406a", "#5b7aa0"]); P.stars(c, R, 60, 300);
      P.orb(c, 300, 160, 46, "#f4f0dc", "#ffffff33");
      c.fillStyle = "#0e2238"; c.fillRect(0, 560, ARENA_W, ARENA_FLOOR - 560);
      for (const [x, s] of [[1250, 1], [420, .7]]) {
        c.fillStyle = "#1a1410"; c.beginPath(); c.moveTo(x - 120 * s, 560); c.lineTo(x + 120 * s, 560); c.lineTo(x + 90 * s, 600); c.lineTo(x - 90 * s, 600); c.fill();
        c.fillRect(x - 3, 560 - 200 * s, 6, 200 * s);
        c.fillStyle = "#d8ccb0"; c.beginPath(); c.moveTo(x + 6, 560 - 190 * s); c.quadraticCurveTo(x + 90 * s, 560 - 120 * s, x + 6, 570 - 40 * s); c.fill();
      }
      c.fillStyle = "#2a2a30"; c.fillRect(1460, 300, 40, 260); c.fillStyle = "#ffe08a"; c.fillRect(1462, 300, 36, 24);
      P.floor(c, R, "wood", "#7a5232", "#3a2616", "#a8794a");
    },
    anim(c, t) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = ["#1a3a5a88", "#24507888", "#2e608c66"][k];
        c.beginPath(); c.moveTo(0, ARENA_FLOOR);
        for (let x = 0; x <= ARENA_W; x += 20) c.lineTo(x, 640 + k * 50 + Math.sin(x * .012 + t * (1.2 + k * .4)) * 8);
        c.lineTo(ARENA_W, ARENA_FLOOR); c.fill();
      }
      const g = c.createRadialGradient(1480, 312, 4, 1480, 312, 220); g.addColorStop(0, `rgba(255,230,140,${.3 + Math.sin(t * 3) * .1})`); g.addColorStop(1, "#ffe08a00");
      c.fillStyle = g; c.beginPath(); c.arc(1480, 312, 220, 0, 7); c.fill();
    },
  },
  {
    id: "cemiterio", name: "Cemitério Assombrado", sub: "Lápides e neblina",
    platforms: [{ x: 250, y: 620, w: 190 }, { x: 700, y: 540, w: 200 }, { x: 1160, y: 620, w: 190 }, { x: 700, y: 360, w: 200 }],
    plat: "slab", vignette: .6, amb: { kind: "wisps", rate: 5 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0a0c1a", "#1c2238", "#3a4466"]); P.stars(c, R, 90, 350);
      P.orb(c, 1180, 200, 80, "#e8ecff", "#b8c4ff44");
      P.ridge(c, R, "#141828", 620, 40);
      c.fillStyle = "#101320"; c.fillRect(160, 480, 200, 320); c.beginPath(); c.moveTo(140, 480); c.lineTo(260, 400); c.lineTo(380, 480); c.fill();
      for (let i = 0; i < 26; i++) { const x = R() * ARENA_W, h = 30 + R() * 40, y = ARENA_FLOOR - R() * 30; c.fillStyle = "#1d2236"; if (R() < .4) { c.fillRect(x - 3, y - h - 10, 6, h + 10); c.fillRect(x - 14, y - h, 28, 6); } else { c.beginPath(); c.moveTo(x - 14, y); c.lineTo(x - 14, y - h); c.arc(x, y - h, 14, Math.PI, 0); c.lineTo(x + 14, y); c.fill(); } }
      c.strokeStyle = "#0d1020"; c.lineWidth = 6; for (const tx of [520, 1400]) { c.beginPath(); c.moveTo(tx, ARENA_FLOOR); c.lineTo(tx, 520); c.lineTo(tx - 60, 450); c.moveTo(tx, 580); c.lineTo(tx + 70, 500); c.lineTo(tx + 90, 470); c.stroke(); }
      P.floor(c, R, "dirt", "#2a2a2a", "#0e0e10", "#2f4a2f");
    },
    anim() {},
    front(c, t) {
      for (let k = 0; k < 3; k++) { const y = 700 + k * 35, off = (t * (14 + k * 8)) % ARENA_W; c.fillStyle = "rgba(190,200,230,.07)"; for (let x = -ARENA_W; x < ARENA_W * 2; x += 420) { c.beginPath(); c.ellipse(x + off, y, 240, 30, 0, 0, 7); c.fill(); } }
    },
  },
  {
    id: "ceu", name: "Ilhas do Céu Arcano", sub: "Rochas flutuantes",
    platforms: [{ x: 170, y: 640, w: 210 }, { x: 500, y: 490, w: 190 }, { x: 910, y: 490, w: 190 }, { x: 1220, y: 640, w: 210 }, { x: 705, y: 310, w: 190 }],
    plat: "crystal", vignette: .45, amb: { kind: "sparkles", rate: 14 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0c0620", "#2a1450", "#5a3a8a"]); P.stars(c, R, 160, 700, .9);
      for (let i = 0; i < 4; i++) { const g = c.createRadialGradient(R() * ARENA_W, R() * 500, 10, R() * ARENA_W, R() * 500, 400); g.addColorStop(0, ["#ff6fb522", "#6fb5ff22", "#b06cff22", "#6fffd022"][i]); g.addColorStop(1, "#00000000"); c.fillStyle = g; c.fillRect(0, 0, ARENA_W, ARENA_H); }
      P.orb(c, 1300, 200, 90, "#c8a8ff", "#b08aff33");
      c.fillStyle = "#00000033"; c.beginPath(); c.arc(1270, 180, 70, 0, 7); c.fill();
      for (let i = 0; i < 6; i++) { const x = R() * ARENA_W, y = 200 + R() * 350, w = 40 + R() * 80; c.fillStyle = "#2a1f3d"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w * .5, y + w * .7); c.fill(); }
      P.floor(c, R, "crystal", "#3a2f52", "#150f22", "#8a6ec0");
    },
    anim() {},
  },
  {
    id: "coliseu", name: "Grande Coliseu", sub: "Duelo diante do público",
    platforms: [{ x: 300, y: 640, w: 150 }, { x: 1150, y: 640, w: 150 }],
    plat: "marble", vignette: .3, amb: { kind: "petals", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#3f7fd0", "#86b8ea", "#d8ecff"]);
      for (let i = 0; i < 5; i++) { c.fillStyle = "#ffffffaa"; const x = R() * ARENA_W, y = 60 + R() * 120; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 30, y + (k % 2) * 8, 28, 0, 7); c.fill(); } }
      for (let tier = 0; tier < 3; tier++) {
        const top = 300 + tier * 110;
        c.fillStyle = ["#d8c8a8", "#cbb994", "#bca880"][tier]; c.fillRect(0, top, ARENA_W, 110);
        c.fillStyle = "#00000030"; for (let x = 20; x < ARENA_W; x += 80) { c.beginPath(); c.moveTo(x, top + 110); c.lineTo(x, top + 40); c.arc(x + 25, top + 40, 25, Math.PI, 0); c.lineTo(x + 50, top + 110); c.fill(); }
        c.fillStyle = "#8a7656"; c.fillRect(0, top, ARENA_W, 6);
      }
      c.fillStyle = "#6a5a40"; c.fillRect(0, 630, ARENA_W, 170);
      c.fillStyle = "#c9b48a"; c.fillRect(0, 630, ARENA_W, 8);
      for (const x of [200, 800, 1400]) { c.fillStyle = "#9e2b25"; c.fillRect(x - 30, 300, 60, 120); c.beginPath(); c.moveTo(x - 30, 420); c.lineTo(x, 440); c.lineTo(x + 30, 420); c.fill(); c.fillStyle = "#e8b84a"; c.fillRect(x - 8, 330, 16, 50); }
      P.floor(c, R, "arena", "#d9bc84", "#9a7a48", "#e8d0a0");
    },
    anim(c, t) {
      // Público pulando nas arquibancadas.
      for (let tier = 0; tier < 3; tier++) for (let i = 0; i < 70; i++) {
        const x = 10 + i * 23 + (tier % 2) * 11, base = 300 + tier * 110 + 34, hop = Math.max(0, Math.sin(t * 6 + i * 1.7 + tier)) * 4;
        c.fillStyle = ["#7a3a2a", "#2a4a7a", "#4a6a2a", "#7a6a2a", "#5a2a6a"][(i + tier) % 5];
        c.fillRect(x - 5, base - hop, 10, 14); c.fillStyle = "#e0b890"; c.beginPath(); c.arc(x, base - 6 - hop, 5, 0, 7); c.fill();
      }
    },
  },
  {
    id: "templo", name: "Templo das Cerejeiras", sub: "Pétalas e pagodes",
    platforms: [{ x: 200, y: 600, w: 240 }, { x: 1160, y: 600, w: 240 }, { x: 620, y: 470, w: 360 }, { x: 700, y: 300, w: 200 }],
    plat: "bamboo", vignette: .4, amb: { kind: "petals", rate: 14 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#2a1a3a", "#b85a6a", "#ffcf9a"]);
      P.orb(c, 1020, 210, 70, "#ffe0c0", "#ffb08a44");
      P.ridge(c, R, "#7a3a5a", 520, 90, 1.2); P.ridge(c, R, "#5a2a48", 600, 50);
      // Pagodes
      for (const [px, py, sc] of [[260, 600, 1], [1340, 620, .8]]) {
        for (let i = 0; i < 4; i++) {
          const y = py - i * 70 * sc, w = (120 - i * 20) * sc;
          c.fillStyle = "#3a1a28"; c.fillRect(px - w * .45, y - 50 * sc, w * .9, 50 * sc);
          c.fillStyle = "#2a0f1c"; c.beginPath(); c.moveTo(px - w * .85, y - 44 * sc); c.quadraticCurveTo(px - w * .4, y - 54 * sc, px, y - 76 * sc); c.quadraticCurveTo(px + w * .4, y - 54 * sc, px + w * .85, y - 44 * sc); c.lineTo(px + w * .7, y - 50 * sc); c.lineTo(px - w * .7, y - 50 * sc); c.fill();
          c.fillStyle = "#ffcf7a55"; c.fillRect(px - 6 * sc, y - 34 * sc, 12 * sc, 16 * sc);
        }
      }
      // Portal torii
      c.fillStyle = "#b02a2a"; c.fillRect(700, 520, 22, 280); c.fillRect(878, 520, 22, 280); c.fillRect(680, 540, 240, 14);
      c.beginPath(); c.moveTo(660, 505); c.quadraticCurveTo(800, 520, 940, 505); c.lineTo(944, 522); c.quadraticCurveTo(800, 534, 656, 522); c.fill();
      // Cerejeiras
      for (let i = 0; i < 7; i++) { const x = R() * ARENA_W; P.tree(c, x, ARENA_FLOOR, 220 + R() * 120, "#3a2028", ["#ff9ab8", "#ffb8cc", "#ff7aa0"][i % 3], R); }
      P.fog(c, 740, 60, "#ffb8cc33");
      P.floor(c, R, "stone", "#a08a7a", "#5a4a40", "#d8c0a8");
    },
    torches: [[640, 470], [960, 470]],
    anim(c, t) { torchAnim(c, t, this.torches, "#ffb84a"); },
  },
  {
    id: "cidade", name: "Cidade Neon", sub: "Chuva e luzes da noite",
    platforms: [{ x: 150, y: 620, w: 260 }, { x: 1190, y: 620, w: 260 }, { x: 560, y: 500, w: 200 }, { x: 840, y: 500, w: 200 }, { x: 660, y: 320, w: 280 }],
    plat: "metal", vignette: .55, amb: { kind: "rain", rate: 90 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#05040f", "#1a0f3a", "#4a1a5a"]); P.stars(c, R, 40, 250, .5);
      for (const [n, hMin, hMax, col, win] of [[14, 200, 420, "#1a1430", "#ffd84a33"], [10, 260, 520, "#120e24", "#7ad8ff55"], [8, 140, 300, "#0a0818", "#ffb84a66"]]) {
        for (let i = 0; i < n; i++) {
          const w = 80 + R() * 90, x = R() * ARENA_W - 40, h = hMin + R() * (hMax - hMin), top = ARENA_FLOOR - h;
          c.fillStyle = col; c.fillRect(x, top, w, h);
          for (let wy = top + 14; wy < ARENA_FLOOR - 20; wy += 18) for (let wx = x + 8; wx < x + w - 10; wx += 14) if (R() < .45) { c.fillStyle = win; c.fillRect(wx, wy, 7, 9); }
          if (R() < .3) { c.fillStyle = "#ff3a3a"; c.fillRect(x + w / 2 - 2, top - 20, 4, 20); }
        }
      }
      P.fog(c, 760, 50, "#ff4ad822");
      P.floor(c, R, "metal", "#2a2e3a", "#0a0c12", "#ff4ad8");
    },
    signs: [[180, 300, 120, 34, "#ff4ad8"], [1260, 260, 140, 30, "#5affd8"], [760, 200, 90, 26, "#ffe95a"], [470, 420, 70, 60, "#7ad8ff"]],
    anim(c, t) {
      // Letreiros de neon piscando, refletidos no chão molhado.
      for (const [x, y, w, h, col] of this.signs) {
        const on = Math.sin(t * 3 + x) > -.85 ? 1 : .2, gl = c.createRadialGradient(x + w / 2, y + h / 2, 4, x + w / 2, y + h / 2, w);
        gl.addColorStop(0, col + (on > .5 ? "55" : "11")); gl.addColorStop(1, col + "00"); c.fillStyle = gl; c.fillRect(x - w / 2, y - w / 2, w * 2, h + w);
        c.strokeStyle = col; c.globalAlpha = on; c.lineWidth = 4; c.strokeRect(x, y, w, h); c.lineWidth = 2; c.beginPath(); c.moveTo(x + 10, y + h / 2); c.lineTo(x + w - 10, y + h / 2); c.stroke(); c.globalAlpha = 1;
        c.fillStyle = col + "22"; c.fillRect(x, ARENA_FLOOR + 6, w, 30);
      }
    },
  },
  {
    id: "laboratorio", name: "Laboratório Secreto", sub: "Experimentos borbulhando",
    platforms: [{ x: 120, y: 640, w: 220 }, { x: 1260, y: 640, w: 220 }, { x: 430, y: 520, w: 220 }, { x: 950, y: 520, w: 220 }, { x: 690, y: 380, w: 220 }],
    plat: "metal", vignette: .5, amb: { kind: "bubbles", rate: 10 },
    paint(c, R) {
      c.fillStyle = "#0e1a1e"; c.fillRect(0, 0, ARENA_W, ARENA_H);
      for (let y = 0; y < ARENA_FLOOR; y += 100) for (let x = 0; x < ARENA_W; x += 160) {
        c.fillStyle = (x / 160 + y / 100) % 2 ? "#16262c" : "#132228"; c.fillRect(x + 2, y + 2, 156, 96);
        c.fillStyle = "#ffffff10"; c.fillRect(x + 2, y + 2, 156, 3);
      }
      c.fillStyle = "#e8b84a"; for (let x = 0; x < ARENA_W; x += 40) { c.beginPath(); c.moveTo(x, 90); c.lineTo(x + 20, 90); c.lineTo(x + 30, 104); c.lineTo(x + 10, 104); c.fill(); }
      for (const tx of [230, 560, 1040, 1370]) {
        c.fillStyle = "#2a3a40"; c.fillRect(tx - 50, 260, 100, 24); c.fillRect(tx - 50, 640, 100, 24);
        const g = c.createLinearGradient(tx - 40, 0, tx + 40, 0); g.addColorStop(0, "#1a8a5a66"); g.addColorStop(.5, "#5affb0aa"); g.addColorStop(1, "#1a8a5a66");
        c.fillStyle = g; c.fillRect(tx - 40, 284, 80, 356); c.fillStyle = "#ffffff22"; c.fillRect(tx - 30, 290, 8, 340);
        c.fillStyle = "#0a2a1a"; c.beginPath(); c.ellipse(tx, 470, 18, 40, 0, 0, 7); c.fill(); c.beginPath(); c.arc(tx, 420, 14, 0, 7); c.fill();
      }
      c.fillStyle = "#2a3238"; c.fillRect(700, 680, 200, 120); c.fillStyle = "#0a1a20"; c.fillRect(712, 692, 176, 60);
      ArenaPaint.floor(c, R, "metal", "#2a3a40", "#0a1214", "#5affd8");
    },
    anim(c, t) {
      for (const tx of [230, 560, 1040, 1370]) for (let i = 0; i < 4; i++) { const y = 630 - ((t * 60 + i * 90 + tx) % 340); c.strokeStyle = "#c8ffe8aa"; c.lineWidth = 1.5; c.beginPath(); c.arc(tx - 20 + ((i * 17) % 40), y, 4 + i % 3, 0, 7); c.stroke(); }
      for (let i = 0; i < 10; i++) { c.fillStyle = Math.sin(t * 4 + i * 1.7) > 0 ? ["#ff4a4a", "#5affd8", "#ffe95a"][i % 3] : "#1a2a30"; c.fillRect(720 + i * 17, 705, 10, 10); }
      c.fillStyle = "#5affd8"; c.fillRect(720, 735, 160 * (.5 + Math.sin(t) * .5), 6);
    },
  },
  {
    id: "pantano", name: "Pântano Sombrio", sub: "Lama, névoa e vaga-lumes",
    platforms: [{ x: 180, y: 610, w: 230 }, { x: 620, y: 530, w: 200 }, { x: 900, y: 420, w: 180 }, { x: 1190, y: 610, w: 230 }, { x: 360, y: 380, w: 160 }],
    plat: "log", vignette: .6, amb: { kind: "fireflies", rate: 12 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0a140e", "#1a3222", "#4a6a3a"]);
      P.orb(c, 1250, 180, 50, "#e8f0c0", "#c8e09a33");
      P.ridge(c, R, "#132418", 560, 60, 1.5);
      for (let i = 0; i < 9; i++) {
        const x = R() * ARENA_W, h = 220 + R() * 200; c.strokeStyle = ["#0e1a10", "#152a18"][i % 2]; c.lineCap = "round";
        c.lineWidth = 16; c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.quadraticCurveTo(x + (R() - .5) * 60, ARENA_FLOOR - h * .6, x + (R() - .5) * 40, ARENA_FLOOR - h); c.stroke();
        c.lineWidth = 5; for (let b = 0; b < 4; b++) { const by = ARENA_FLOOR - h * (.45 + b * .14), dir = b % 2 ? 1 : -1; c.beginPath(); c.moveTo(x, by); c.quadraticCurveTo(x + dir * 40, by - 30, x + dir * (60 + R() * 30), by - 10 - R() * 30); c.stroke(); }
        c.strokeStyle = "#3a5a2a88"; c.lineWidth = 2; for (let m = 0; m < 3; m++) { const mx = x + (R() - .5) * 80, my = ARENA_FLOOR - h * (.5 + R() * .3); c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + (R() - .5) * 6, my + 40 + R() * 40); c.stroke(); }
      }
      c.fillStyle = "#1a3a2a"; c.fillRect(0, 700, ARENA_W, 100);
      P.fog(c, 690, 70, "#a8c89a33");
      P.floor(c, R, "dirt", "#2a2a18", "#0e0e08", "#3a5a2a");
    },
    anim(c, t) {
      for (let k = 0; k < 2; k++) { c.fillStyle = ["#2a4a3a99", "#3a5a4a66"][k]; c.beginPath(); c.moveTo(0, ARENA_FLOOR); for (let x = 0; x <= ARENA_W; x += 25) c.lineTo(x, 712 + k * 30 + Math.sin(x * .01 + t * (1 + k * .5)) * 4); c.lineTo(ARENA_W, ARENA_FLOOR); c.fill(); }
      for (const lx of [300, 820, 1350]) { c.fillStyle = "#3a8a3a"; c.beginPath(); c.ellipse(lx + Math.sin(t + lx) * 6, 720, 24, 7, 0, .3, Math.PI * 2); c.fill(); }
      for (let i = 0; i < 5; i++) { const ph = (t * .8 + i * .37) % 1; c.strokeStyle = `rgba(160,220,140,${1 - ph})`; c.lineWidth = 1.5; c.beginPath(); c.arc(150 + i * 310, 730 - ph * 20, 3 + ph * 6, 0, 7); c.stroke(); }
    },
    front(c, t) { for (let k = 0; k < 2; k++) { const off = (t * (10 + k * 8)) % ARENA_W; c.fillStyle = "rgba(170,210,160,.07)"; for (let x = -ARENA_W; x < ARENA_W * 2; x += 480) { c.beginPath(); c.ellipse(x + off, 740 + k * 30, 260, 34, 0, 0, 7); c.fill(); } } },
  },
  {
    id: "praia", name: "Praia Tropical", sub: "Sol, coqueiros e ondas",
    platforms: [{ x: 200, y: 620, w: 280 }, { x: 1120, y: 620, w: 280 }, { x: 660, y: 470, w: 280 }],
    plat: "wood", vignette: .2, amb: { kind: "spray", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#2a8ad8", "#7ac8f0", "#ffe8b0"]);
      P.orb(c, 1300, 170, 70, "#fffbe0", "#ffe08a66");
      for (let i = 0; i < 6; i++) { c.fillStyle = "#ffffffcc"; const x = R() * ARENA_W, y = 70 + R() * 140; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + k * 34, y + (k % 2) * 8, 26 + R() * 8, 0, 7); c.fill(); } }
      c.fillStyle = "#2a9ad0"; c.fillRect(0, 560, ARENA_W, 120);
      c.fillStyle = "#3a6a4a"; c.beginPath(); c.moveTo(980, 562); c.quadraticCurveTo(1100, 470, 1240, 562); c.fill();
      // Coqueiros
      for (const [x, h, lean] of [[90, 380, 1], [1500, 420, -1], [420, 300, 1]]) {
        c.strokeStyle = "#8a5a2a"; c.lineWidth = 16; c.lineCap = "round"; c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.quadraticCurveTo(x + lean * 60, ARENA_FLOOR - h * .5, x + lean * 40, ARENA_FLOOR - h); c.stroke();
        c.strokeStyle = "#6a4a1a"; c.lineWidth = 2; for (let yy = 30; yy < h; yy += 22) { const k = yy / h, px = x + lean * (k * 60 * (2 - k)) * .8; c.beginPath(); c.moveTo(px - 7, ARENA_FLOOR - yy); c.lineTo(px + 7, ARENA_FLOOR - yy - 4); c.stroke(); }
        const tx = x + lean * 40, ty = ARENA_FLOOR - h;
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .5; c.strokeStyle = i % 2 ? "#2a8a3a" : "#3aa04a"; c.lineWidth = 10; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * 80, ty + Math.sin(a) * 60 - 20, tx + Math.cos(a) * 130, ty + Math.sin(a) * 40 + 40); c.stroke(); }
        c.fillStyle = "#5a3a1a"; for (const d of [-8, 6]) { c.beginPath(); c.arc(tx + d, ty + 12, 8, 0, 7); c.fill(); }
      }
      P.floor(c, R, "sand", "#f6dca0", "#d4aa68", "#fff0c8");
    },
    anim(c, t) {
      for (let k = 0; k < 3; k++) {
        c.fillStyle = ["#3aaae0aa", "#5ac0f0aa", "#ffffffaa"][k]; c.beginPath(); c.moveTo(0, 690);
        for (let x = 0; x <= ARENA_W; x += 20) c.lineTo(x, 600 + k * 30 + Math.sin(x * .01 + t * (1.4 + k * .3)) * (6 - k));
        c.lineTo(ARENA_W, 690); c.fill();
      }
      c.fillStyle = `rgba(255,255,255,${.4 + Math.sin(t * 1.5) * .3})`; c.fillRect(0, 676 + Math.sin(t * 1.5) * 6, ARENA_W, 4);
    },
  },
  {
    id: "cristais", name: "Caverna de Cristal", sub: "Luz que vem das pedras",
    platforms: [{ x: 140, y: 620, w: 230 }, { x: 520, y: 500, w: 200 }, { x: 880, y: 500, w: 200 }, { x: 1230, y: 620, w: 230 }, { x: 690, y: 330, w: 220 }],
    plat: "crystal", vignette: .65, amb: { kind: "sparkles", rate: 16 },
    paint(c, R) {
      c.fillStyle = "#070a1a"; c.fillRect(0, 0, ARENA_W, ARENA_H);
      // Paredes e estalactites
      c.fillStyle = "#121a34"; c.beginPath(); c.moveTo(0, 0); for (let x = 0; x <= ARENA_W; x += 40) c.lineTo(x, 60 + R() * 90); c.lineTo(ARENA_W, 0); c.fill();
      c.fillStyle = "#0e1428"; for (let i = 0; i < 24; i++) { const x = R() * ARENA_W, w = 14 + R() * 26, h = 60 + R() * 140; c.beginPath(); c.moveTo(x - w, 80); c.lineTo(x, 80 + h); c.lineTo(x + w, 80); c.fill(); }
      ArenaPaint.ridge(c, R, "#141c3a", 600, 70, 2);
      for (let i = 0; i < 12; i++) {
        const x = R() * ARENA_W, base = 560 + R() * 240, col = ["#5ac8ff", "#c58bff", "#5affd8"][i % 3];
        for (let k = 0; k < 4; k++) {
          const h = 50 + R() * 120, w = 12 + R() * 14, lean = (R() - .5) * .6;
          c.save(); c.translate(x + (k - 1.5) * 18, base); c.rotate(lean);
          const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, col + "55"); g.addColorStop(.5, col + "dd"); g.addColorStop(1, col + "44");
          c.fillStyle = g; c.beginPath(); c.moveTo(-w, 0); c.lineTo(-w * .7, -h); c.lineTo(0, -h - w); c.lineTo(w * .7, -h); c.lineTo(w, 0); c.fill();
          c.fillStyle = "#ffffff55"; c.fillRect(-w * .3, -h, 3, h * .8); c.restore();
        }
      }
      ArenaPaint.floor(c, R, "crystal", "#2a2a4a", "#0a0a1a", "#7ad8ff");
    },
    anim(c, t) {
      for (const [x, y, col] of [[300, 600, "#5ac8ff"], [800, 420, "#c58bff"], [1300, 560, "#5affd8"], [560, 250, "#5ac8ff"], [1100, 250, "#c58bff"]]) {
        const r = 180 + Math.sin(t * 1.5 + x) * 30, g = c.createRadialGradient(x, y, 5, x, y, r);
        g.addColorStop(0, col + "33"); g.addColorStop(1, col + "00"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
    },
  },
  {
    id: "teatro", name: "Ópera Fantasma", sub: "O espetáculo vai começar",
    platforms: [{ x: 160, y: 600, w: 260 }, { x: 1180, y: 600, w: 260 }, { x: 640, y: 450, w: 320 }, { x: 140, y: 380, w: 200 }, { x: 1260, y: 380, w: 200 }],
    plat: "balcony", vignette: .65, amb: { kind: "dust", rate: 10 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#12040a", "#2a0810", "#3a0c14"]);
      // Camarotes com plateia
      for (let tier = 0; tier < 3; tier++) {
        const y = 170 + tier * 120;
        c.fillStyle = "#4a0a14"; c.fillRect(0, y, ARENA_W, 80); c.fillStyle = "#e8b84a"; c.fillRect(0, y + 74, ARENA_W, 5);
        for (let x = 10; x < ARENA_W; x += 26) { c.fillStyle = "#1a0408"; c.beginPath(); c.arc(x, y + 46, 8, 0, 7); c.fill(); c.fillRect(x - 9, y + 52, 18, 22); }
        for (let x = 0; x < ARENA_W; x += 200) { c.fillStyle = "#c8962a"; c.fillRect(x, y, 8, 80); }
      }
      // Cortinas vermelhas
      for (const side of [0, 1]) {
        const x0 = side ? ARENA_W - 260 : 0;
        for (let i = 0; i < 9; i++) { const g = c.createLinearGradient(x0 + i * 29, 0, x0 + i * 29 + 29, 0); g.addColorStop(0, "#6a0a14"); g.addColorStop(.5, "#c0202e"); g.addColorStop(1, "#5a0810"); c.fillStyle = g; c.fillRect(x0 + i * 29, 0, 30, ARENA_FLOOR); }
        c.fillStyle = "#e8b84a"; c.fillRect(side ? x0 : x0 + 240, 300, 20, 14);
      }
      c.fillStyle = "#8a0a18"; c.beginPath(); c.moveTo(0, 0); c.lineTo(ARENA_W, 0); c.lineTo(ARENA_W, 60); for (let x = ARENA_W; x >= 0; x -= 100) c.quadraticCurveTo(x - 50, 110, x - 100, 60); c.fill();
      c.fillStyle = "#e8b84a"; c.fillRect(0, 56, ARENA_W, 5);
      // Lustre
      c.strokeStyle = "#c8962a"; c.lineWidth = 3; c.beginPath(); c.moveTo(800, 60); c.lineTo(800, 120); c.stroke();
      c.fillStyle = "#c8962a"; c.beginPath(); c.ellipse(800, 140, 90, 18, 0, 0, 7); c.fill();
      for (let i = -4; i <= 4; i++) { c.fillStyle = "#fff0b0"; c.beginPath(); c.arc(800 + i * 20, 128 - Math.abs(i) * 2, 4, 0, 7); c.fill(); }
      P.floor(c, R, "wood", "#6a3a1a", "#2a1408", "#c8962a");
    },
    anim(c, t) {
      // Holofotes passeando pelo palco.
      for (let i = 0; i < 2; i++) {
        const x = 800 + Math.sin(t * .6 + i * 2.5) * 500, g = c.createRadialGradient(x, ARENA_FLOOR, 10, x, ARENA_FLOOR, 150);
        c.fillStyle = "rgba(255,240,200,.08)"; c.beginPath(); c.moveTo(i ? 1300 : 300, 70); c.lineTo(x + 110, ARENA_FLOOR); c.lineTo(x - 110, ARENA_FLOOR); c.fill();
        g.addColorStop(0, "rgba(255,240,200,.3)"); g.addColorStop(1, "rgba(255,240,200,0)"); c.fillStyle = g; c.beginPath(); c.ellipse(x, ARENA_FLOOR, 150, 30, 0, 0, 7); c.fill();
      }
      for (let i = -4; i <= 4; i++) { const fl = .5 + Math.sin(t * 9 + i) * .2; const g = c.createRadialGradient(800 + i * 20, 124, 1, 800 + i * 20, 124, 26); g.addColorStop(0, `rgba(255,230,150,${fl})`); g.addColorStop(1, "rgba(255,230,150,0)"); c.fillStyle = g; c.beginPath(); c.arc(800 + i * 20, 124, 26, 0, 7); c.fill(); }
    },
  },
  {
    id: "doces", name: "Reino dos Doces", sub: "Pirulitos e algodão-doce",
    platforms: [{ x: 220, y: 610, w: 240 }, { x: 1140, y: 610, w: 240 }, { x: 560, y: 480, w: 190 }, { x: 850, y: 480, w: 190 }, { x: 700, y: 320, w: 200 }],
    plat: "candy", vignette: .2, amb: { kind: "sparkles", rate: 10 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#ff9ad8", "#ffd0ec", "#fff0dc"]);
      for (let i = 0; i < 7; i++) { const x = R() * ARENA_W, y = 60 + R() * 200; c.fillStyle = ["#ffffffdd", "#ffd8f0dd", "#d8f0ffdd"][i % 3]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + k * 28, y + Math.sin(k) * 10, 26 + R() * 10, 0, 7); c.fill(); } }
      P.ridge(c, R, "#ffb8d8", 560, 80); P.ridge(c, R, "#b8f0d8", 640, 50);
      // Pirulitos e bengalas
      for (const [x, y, r] of [[160, 420, 60], [1420, 380, 70], [620, 520, 40], [1020, 500, 46]]) {
        c.fillStyle = "#f6f0e0"; c.fillRect(x - 5, y, 10, ARENA_FLOOR - y);
        c.fillStyle = "#ff4a8a"; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.strokeStyle = "#ffffff"; c.lineWidth = r * .18; c.beginPath(); for (let a = 0; a < 18; a += .2) { const rr = a / 18 * r * .92; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.stroke();
      }
      for (const x of [380, 1240]) { c.lineCap = "round"; for (const [col, dash] of [["#ffffff", []], ["#e83a4a", [14, 14]]]) { c.strokeStyle = col; c.lineWidth = 16; c.setLineDash(dash); c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.lineTo(x, 520); c.arc(x + 34, 520, 34, Math.PI, 0); c.stroke(); } c.setLineDash([]); }
      P.floor(c, R, "candy", "#6a3a2a", "#3a1a10", "#ffffff");
    },
    anim() {},
  },
  {
    id: "lua", name: "Base Lunar", sub: "Gravidade baixa: pulos enormes!", grav: .62,
    platforms: [{ x: 180, y: 600, w: 240 }, { x: 1180, y: 600, w: 240 }, { x: 640, y: 430, w: 320 }, { x: 300, y: 260, w: 180 }, { x: 1120, y: 260, w: 180 }],
    plat: "metal", vignette: .45, amb: { kind: "dust", rate: 4 },
    paint(c, R) {
      const P = ArenaPaint;
      c.fillStyle = "#03030a"; c.fillRect(0, 0, ARENA_W, ARENA_H); P.stars(c, R, 260, 650, 1);
      // A Terra lá no céu
      const ex = 1250, ey = 170, er = 75, g = c.createRadialGradient(ex - 20, ey - 20, 10, ex, ey, er);
      g.addColorStop(0, "#7ac8ff"); g.addColorStop(1, "#1a4a9a"); c.fillStyle = g; c.beginPath(); c.arc(ex, ey, er, 0, 7); c.fill();
      c.fillStyle = "#3aa04a"; for (const [dx, dy, rx, ry] of [[-25, -10, 22, 30], [20, 20, 26, 16], [10, -35, 14, 8]]) { c.beginPath(); c.ellipse(ex + dx, ey + dy, rx, ry, .4, 0, 7); c.fill(); }
      c.fillStyle = "#ffffff55"; c.beginPath(); c.ellipse(ex - 10, ey + 40, 40, 6, -.2, 0, 7); c.fill();
      c.fillStyle = "#00000066"; c.beginPath(); c.arc(ex + 30, ey + 10, er, -1.2, 1.9); c.fill();
      P.ridge(c, R, "#5a5a66", 600, 60, 1.5); P.ridge(c, R, "#7a7a86", 680, 30);
      // Base com domo
      c.fillStyle = "#c8ccd4"; c.fillRect(160, 640, 300, 160); c.fillStyle = "#9aa0aa"; c.fillRect(160, 640, 300, 8);
      c.fillStyle = "#a8d8ffaa"; c.beginPath(); c.arc(310, 640, 110, Math.PI, 0); c.fill(); c.strokeStyle = "#e8eef4"; c.lineWidth = 4; c.stroke();
      c.fillStyle = "#ffffff55"; c.beginPath(); c.ellipse(270, 580, 30, 12, -.5, 0, 7); c.fill();
      c.strokeStyle = "#c8ccd4"; c.lineWidth = 4; c.beginPath(); c.moveTo(1380, 800); c.lineTo(1380, 560); c.stroke();
      c.fillStyle = "#e8eef4"; c.beginPath(); c.ellipse(1380, 560, 40, 14, -.4, Math.PI, 0); c.fill();
      c.fillStyle = "#c0392b"; c.fillRect(1000, 690, 4, 110); c.fillRect(1004, 690, 50, 30); c.fillStyle = "#ffffff"; c.fillRect(1004, 700, 50, 6);
      P.floor(c, R, "moon", "#9a9aa4", "#4a4a54", "#c8c8d0");
    },
    anim(c, t) { const on = Math.sin(t * 4) > 0; c.fillStyle = on ? "#ff4a4a" : "#5a1a1a"; c.beginPath(); c.arc(1380, 548, 5, 0, 7); c.fill(); if (on) { const g = c.createRadialGradient(1380, 548, 1, 1380, 548, 40); g.addColorStop(0, "#ff4a4a66"); g.addColorStop(1, "#ff4a4a00"); c.fillStyle = g; c.beginPath(); c.arc(1380, 548, 40, 0, 7); c.fill(); } },
  },
  {
    id: "oceano", name: "Fundo do Mar", sub: "Bolhas, corais e um navio afundado", grav: .8,
    platforms: [{ x: 160, y: 620, w: 250 }, { x: 600, y: 500, w: 180 }, { x: 820, y: 500, w: 180 }, { x: 1190, y: 620, w: 250 }, { x: 700, y: 330, w: 200 }],
    plat: "coral", vignette: .55, amb: { kind: "bubbles", rate: 18 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a6a9a", "#0a3a6a", "#02122a"]);
      for (let i = 0; i < 6; i++) { c.fillStyle = "#bfe8ff10"; const x = 100 + i * 280; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 200, ARENA_FLOOR); c.lineTo(x + 60, ARENA_FLOOR); c.fill(); }
      // Navio afundado
      c.fillStyle = "#0a1e30"; c.beginPath(); c.moveTo(980, 760); c.lineTo(1500, 700); c.lineTo(1470, 790); c.lineTo(1010, 800); c.fill();
      c.fillRect(1180, 470, 10, 250); c.beginPath(); c.moveTo(1190, 490); c.lineTo(1290, 560); c.lineTo(1190, 610); c.fill();
      c.fillStyle = "#06121e"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(1080 + i * 90, 750 - i * 10, 9, 0, 7); c.fill(); }
      P.ridge(c, R, "#0a2a40", 680, 40, 2);
      // Corais
      for (let i = 0; i < 10; i++) {
        const x = R() * ARENA_W, col = ["#ff6a8a", "#ffb34a", "#b06cff", "#5affd8"][i % 4]; c.strokeStyle = col; c.lineCap = "round";
        for (let k = 0; k < 5; k++) { c.lineWidth = 7 - k; const a = -Math.PI / 2 + (R() - .5) * 1.4, l = 30 + R() * 50; c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.quadraticCurveTo(x + Math.cos(a) * l * .5 + (R() - .5) * 20, ARENA_FLOOR + Math.sin(a) * l * .5, x + Math.cos(a) * l, ARENA_FLOOR + Math.sin(a) * l); c.stroke(); }
      }
      c.fillStyle = "#e8d8a8"; for (let i = 0; i < 6; i++) { const x = R() * ARENA_W; c.beginPath(); c.moveTo(x, ARENA_FLOOR - 2); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5, r = k % 2 ? 4 : 9; c.lineTo(x + Math.cos(a) * r, ARENA_FLOOR - 8 + Math.sin(a) * r); } c.fill(); }
      P.floor(c, R, "sand", "#c8b888", "#7a6a48", "#e8d8a8");
    },
    anim(c, t) {
      // Algas balançando.
      c.lineCap = "round";
      for (let i = 0; i < 14; i++) {
        const x = 40 + i * 115 + (i % 3) * 20, h = 160 + (i * 53) % 140;
        c.strokeStyle = i % 2 ? "#2a8a4a" : "#3aa05a"; c.lineWidth = 7; c.beginPath(); c.moveTo(x, ARENA_FLOOR);
        for (let k = 1; k <= 6; k++) c.lineTo(x + Math.sin(t * 1.4 + i + k * .6) * k * 4, ARENA_FLOOR - h * k / 6);
        c.stroke();
      }
      // Peixinhos passando.
      for (let i = 0; i < 4; i++) {
        const dir = i % 2 ? 1 : -1, x = ((t * (40 + i * 15) * dir + i * 400) % (ARENA_W + 200) + ARENA_W + 200) % (ARENA_W + 200) - 100, y = 200 + i * 90 + Math.sin(t * 2 + i) * 10;
        c.fillStyle = ["#ffb34a", "#5ac8ff", "#ff6a8a", "#ffe95a"][i]; c.beginPath(); c.ellipse(x, y, 16, 8, 0, 0, 7); c.fill();
        c.beginPath(); c.moveTo(x - dir * 14, y); c.lineTo(x - dir * 26, y - 8); c.lineTo(x - dir * 26, y + 8); c.fill();
        c.fillStyle = "#000"; c.beginPath(); c.arc(x + dir * 9, y - 2, 2, 0, 7); c.fill();
      }
    },
  },
  {
    id: "cogumelos", name: "Floresta de Cogumelos", sub: "Cogumelos gigantes que brilham no escuro",
    platforms: [{ x: 170, y: 600, w: 230 }, { x: 1200, y: 600, w: 230 }, { x: 560, y: 470, w: 200 }, { x: 860, y: 470, w: 200 }, { x: 690, y: 300, w: 220 }],
    plat: "mushroom", vignette: .5, amb: { kind: "spores", rate: 14 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0e0a2a", "#2a1a5a", "#5a3a8a"]);
      P.stars(c, R, 120, 420, .6);
      P.ridge(c, R, "#1a1238", 560, 70); P.ridge(c, R, "#241a48", 650, 40);
      const shroom = (x, base, h, capW, col) => {
        const halo = c.createRadialGradient(x, base - h, 10, x, base - h, capW);
        halo.addColorStop(0, col[0] + "44"); halo.addColorStop(1, col[0] + "00"); c.fillStyle = halo; c.beginPath(); c.arc(x, base - h, capW, 0, 7); c.fill();
        c.fillStyle = "#e8dcc8"; c.beginPath(); c.moveTo(x - capW * .12, base); c.quadraticCurveTo(x - capW * .05, base - h * .5, x - capW * .08, base - h);
        c.lineTo(x + capW * .08, base - h); c.quadraticCurveTo(x + capW * .05, base - h * .5, x + capW * .12, base); c.fill();
        c.fillStyle = "#c8b8a0"; c.fillRect(x - capW * .03, base - h, capW * .04, h);
        const g = c.createRadialGradient(x - capW * .2, base - h - capW * .22, 5, x, base - h, capW * .6); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
        c.fillStyle = g; c.beginPath(); c.ellipse(x, base - h, capW / 2, capW * .34, 0, Math.PI, 0); c.closePath(); c.fill();
        c.fillStyle = "#d8c8b0"; c.fillRect(x - capW / 2, base - h - 3, capW, 6);
        c.fillStyle = "#ffffffcc";
        for (let i = 0; i < 7; i++) { const a = Math.PI + .2 + R() * (Math.PI - .4), rr = .3 + R() * .6; c.beginPath(); c.ellipse(x + Math.cos(a) * capW / 2 * rr, base - h + Math.sin(a) * capW * .34 * rr, 4 + R() * capW * .04, 3 + R() * capW * .025, 0, 0, 7); c.fill(); }
      };
      shroom(130, 800, 390, 270, ["#ff8ab0", "#a02a5a"]); shroom(1470, 800, 430, 300, ["#7ad8ff", "#2a5aa8"]);
      shroom(430, 800, 220, 150, ["#ffd84a", "#c8761a"]); shroom(1120, 800, 250, 170, ["#b8ff8a", "#3a8a2a"]);
      shroom(800, 800, 150, 110, ["#d8a0ff", "#6a2aa8"]); shroom(300, 800, 110, 80, ["#7dffd8", "#1a8a7a"]); shroom(1300, 800, 120, 90, ["#ffb07a", "#a8461a"]);
      for (let i = 0; i < 40; i++) { const x = R() * ARENA_W, s = 4 + R() * 7, col = ["#ff8ab0", "#7ad8ff", "#ffd84a", "#b8ff8a"][i % 4];
        c.fillStyle = "#e8dcc8"; c.fillRect(x - 1.5, ARENA_FLOOR - s * 1.4, 3, s * 1.4); c.fillStyle = col; c.beginPath(); c.ellipse(x, ARENA_FLOOR - s * 1.4, s, s * .6, 0, Math.PI, 0); c.fill(); }
      P.floor(c, R, "grass", "#2a2a4a", "#141428", "#6a5aa8");
    },
    anim(c, t) {
      // Os chapéus dos cogumelos pulsam devagar.
      for (const [x, y, r, col] of [[130, 410, 200, "#ff8ab0"], [1470, 370, 220, "#7ad8ff"], [430, 580, 110, "#ffd84a"], [1120, 550, 120, "#b8ff8a"], [800, 650, 80, "#d8a0ff"]]) {
        const a = .12 + Math.sin(t * 1.6 + x) * .07, g = c.createRadialGradient(x, y, 5, x, y, r);
        g.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, "0")); g.addColorStop(1, col + "00"); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      }
    },
  },
  {
    id: "fabrica", name: "Fábrica a Vapor", sub: "Engrenagens, canos e vapor",
    platforms: [{ x: 150, y: 620, w: 260 }, { x: 1190, y: 620, w: 260 }, { x: 520, y: 480, w: 220 }, { x: 860, y: 480, w: 220 }, { x: 670, y: 320, w: 260 }],
    plat: "metal", vignette: .5, amb: { kind: "embers", rate: 8 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#2a1a12", "#4a2a18", "#6a3a1a"]);
      // Parede de tijolos.
      for (let y = 0; y < ARENA_FLOOR; y += 26) for (let x = (y / 26) % 2 ? -30 : 0; x < ARENA_W; x += 60) {
        c.fillStyle = `rgb(${70 + R() * 25},${36 + R() * 14},${24 + R() * 10})`; c.fillRect(x + 2, y + 2, 56, 22);
      }
      const dark = c.createLinearGradient(0, 0, 0, ARENA_FLOOR); dark.addColorStop(0, "#0008"); dark.addColorStop(1, "#0003"); c.fillStyle = dark; c.fillRect(0, 0, ARENA_W, ARENA_FLOOR);
      // Janelões com luz alaranjada.
      for (const x of [300, 700, 1100]) {
        c.fillStyle = "#1a0e08"; c.fillRect(x - 6, 90, 212, 252);
        const g = c.createLinearGradient(0, 96, 0, 336); g.addColorStop(0, "#ffb86a"); g.addColorStop(1, "#c8561a"); c.fillStyle = g; c.fillRect(x, 96, 200, 240);
        c.fillStyle = "#1a0e08"; for (let i = 1; i < 4; i++) c.fillRect(x + i * 50 - 3, 96, 6, 240); for (let i = 1; i < 4; i++) c.fillRect(x, 96 + i * 60 - 3, 200, 6);
      }
      // Canos de cobre.
      c.lineCap = "butt";
      for (const [pts, w] of [[[[0, 420], [240, 420], [240, 150], [520, 150]], 22], [[[1600, 380], [1380, 380], [1380, 560], [1180, 560]], 18], [[[960, 0], [960, 60], [1250, 60]], 16]]) {
        for (const [col, lw] of [["#3a1a08", w + 6], ["#b8672a", w], ["#e8a060", w * .3]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
        for (const [x, y] of pts) { c.fillStyle = "#7a4018"; c.beginPath(); c.arc(x, y, w * .8, 0, 7); c.fill(); }
      }
      // Caldeira.
      c.fillStyle = "#3a2a20"; c.fillRect(40, 600, 150, 200); c.fillStyle = "#5a4030"; c.beginPath(); c.ellipse(115, 600, 75, 22, 0, 0, 7); c.fill();
      c.fillStyle = "#ff6a1a"; c.fillRect(85, 700, 60, 40); c.fillStyle = "#ffd84a88"; c.fillRect(92, 708, 46, 24);
      P.floor(c, R, "metal", "#4a3a30", "#1a120c", "#b8672a");
    },
    anim(c, t) {
      // Engrenagens girando no fundo.
      const gear = (x, y, r, teeth, ang, col) => {
        c.save(); c.translate(x, y); c.rotate(ang); c.fillStyle = col; c.beginPath();
        for (let i = 0; i < teeth * 2; i++) { const a = i * Math.PI / teeth, rr = i % 2 ? r : r * 1.16; c.lineTo(Math.cos(a - .08) * rr, Math.sin(a - .08) * rr); c.lineTo(Math.cos(a + .08) * rr, Math.sin(a + .08) * rr); }
        c.closePath(); c.fill(); c.fillStyle = "#1a0e08"; c.beginPath(); c.arc(0, 0, r * .55, 0, 7); c.fill();
        c.fillStyle = col; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2); c.fillRect(-r * .08, 0, r * .16, r * .55); c.restore(); }
        c.beginPath(); c.arc(0, 0, r * .18, 0, 7); c.fill(); c.restore();
      };
      gear(975, 660, 80, 12, t * .5, "#7a5a3a"); gear(1112, 718, 50, 8, -t * .8 - .2, "#8a6a42"); gear(1460, 230, 110, 14, -t * .35, "#6a4a2a"); gear(1310, 330, 55, 8, t * .7, "#8a6a42");
      // Vapor saindo dos canos.
      for (const [x, y] of [[520, 140], [1250, 50], [115, 580]]) for (let i = 0; i < 4; i++) {
        const k = (t * .6 + i / 4) % 1; c.fillStyle = `rgba(230,220,210,${.35 * (1 - k)})`; c.beginPath(); c.arc(x + Math.sin(k * 6 + i) * 12, y - k * 120, 14 + k * 30, 0, 7); c.fill();
      }
    },
  },
  {
    id: "selva", name: "Templo da Selva", sub: "Cachoeira, cipós e uma pirâmide antiga",
    platforms: [{ x: 255, y: 610, w: 210 }, { x: 1180, y: 610, w: 240 }, { x: 600, y: 520, w: 400 }, { x: 680, y: 380, w: 240 }, { x: 740, y: 250, w: 120 }],
    plat: "slab", vignette: .4, amb: { kind: "fireflies", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#7ad0c8", "#b8e8b0", "#e8f0c0"]);
      P.ridge(c, R, "#6aa87a", 520, 60); P.ridge(c, R, "#4a8a5a", 600, 50);
      // Pirâmide em degraus.
      for (let i = 0; i < 7; i++) {
        const w = 760 - i * 100, y = 760 - i * 70, x = 800 - w / 2;
        c.fillStyle = i % 2 ? "#8a9a7a" : "#7a8a6a"; c.fillRect(x, y - 70, w, 72);
        c.fillStyle = "#5a6a4a"; for (let bx = x + 10; bx < x + w - 20; bx += 46) c.fillRect(bx, y - 40, 30, 4);
        c.fillStyle = "#4a7a3a"; for (let k = 0; k < w / 30; k++) { c.beginPath(); c.ellipse(x + R() * w, y - 68, 10 + R() * 12, 5, 0, 0, 7); c.fill(); }
      }
      c.fillStyle = "#3a3a2a"; c.fillRect(770, 230, 60, 80); c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(800, 260, 10, 0, 7); c.fill();
      // Copas da selva.
      for (let i = 0; i < 16; i++) { const x = R() * ARENA_W; c.fillStyle = ["#2a6a3a", "#3a8a4a", "#1a5a2a"][i % 3]; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + (R() - .5) * 120, 40 + R() * 90, 50 + R() * 40, 0, 7); c.fill(); } }
      // Cipós pendurados.
      c.strokeStyle = "#2a6a2a"; c.lineWidth = 4;
      for (let i = 0; i < 14; i++) { const x = R() * ARENA_W, l = 120 + R() * 260; c.beginPath(); c.moveTo(x, 60); c.quadraticCurveTo(x + (R() - .5) * 60, 60 + l / 2, x + (R() - .5) * 20, 60 + l); c.stroke();
        c.fillStyle = "#3a9a3a"; for (let k = 1; k < 5; k++) { c.beginPath(); c.ellipse(x + (R() - .5) * 20, 60 + l * k / 5, 7, 4, R() * 3, 0, 7); c.fill(); } }
      // Lago da cachoeira.
      c.fillStyle = "#3a8aa8"; c.beginPath(); c.ellipse(120, 790, 150, 22, 0, 0, 7); c.fill();
      c.fillStyle = "#6a7a5a"; c.fillRect(40, 240, 40, 560); c.fillRect(200, 240, 40, 560);
      P.floor(c, R, "grass", "#4a6a2a", "#2a3a14", "#6ab84a");
    },
    anim(c, t) {
      // Cachoeira correndo.
      const g = c.createLinearGradient(80, 0, 200, 0); g.addColorStop(0, "#8ad8f0"); g.addColorStop(.5, "#d8f4ff"); g.addColorStop(1, "#8ad8f0");
      c.fillStyle = g; c.fillRect(80, 240, 120, 550);
      c.fillStyle = "#ffffff88"; for (let i = 0; i < 12; i++) { const y = 240 + ((t * 420 + i * 70) % 550); c.fillRect(86 + (i * 37) % 100, y, 6, 40); }
      for (let i = 0; i < 6; i++) { const k = (t * 1.5 + i / 6) % 1; c.fillStyle = `rgba(255,255,255,${.5 * (1 - k)})`; c.beginPath(); c.arc(100 + i * 18, 785 - k * 30, 8 + k * 14, 0, 7); c.fill(); }
    },
  },
  {
    id: "mina", name: "Mina de Ouro", sub: "Trilhos, lanternas e pepitas",
    platforms: [{ x: 140, y: 620, w: 260 }, { x: 1200, y: 620, w: 260 }, { x: 540, y: 500, w: 200 }, { x: 860, y: 500, w: 200 }, { x: 640, y: 340, w: 320 }],
    plat: "wood", vignette: .65, amb: { kind: "dust", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a120c", "#2a1c12", "#3a2618"]);
      // Paredes de rocha com veios de ouro.
      for (let i = 0; i < 90; i++) {
        const x = R() * ARENA_W, y = R() * ARENA_FLOOR, r = 30 + R() * 60, v = 38 + R() * 22;
        c.fillStyle = `rgb(${v + 12},${v},${v - 8})`; c.beginPath();
        for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, rr = r * (.6 + R() * .5); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .7); }
        c.closePath(); c.fill(); c.strokeStyle = "#00000044"; c.lineWidth = 2; c.stroke();
      }
      for (let i = 0; i < 26; i++) { const x = R() * ARENA_W, y = 60 + R() * 680; c.fillStyle = "#ffd84a"; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x + k * 8, y); c.lineTo(x + k * 8 + 5, y - 6); c.lineTo(x + k * 8 + 9, y + 2); c.lineTo(x + k * 8 + 3, y + 6); c.fill(); }
        c.fillStyle = "#fff6c0"; c.fillRect(x + 3, y - 2, 2, 2); }
      // Escoras de madeira.
      for (const x of [100, 500, 900, 1300]) {
        c.fillStyle = "#4a2e18"; c.fillRect(x, 120, 26, 680); c.fillRect(x + 200, 120, 26, 680); c.fillRect(x - 10, 110, 246, 28);
        c.fillStyle = "#6a4426"; c.fillRect(x + 4, 120, 6, 680); c.fillRect(x + 204, 120, 6, 680); c.fillRect(x - 10, 110, 246, 6);
      }
      // Carrinho e trilhos ao fundo.
      c.fillStyle = "#3a3a40"; c.fillRect(0, 770, ARENA_W, 6);
      for (let x = 0; x < ARENA_W; x += 40) { c.fillStyle = "#4a2e18"; c.fillRect(x, 774, 26, 10); }
      c.fillStyle = "#5a5f66"; c.beginPath(); c.moveTo(1040, 700); c.lineTo(1160, 700); c.lineTo(1145, 760); c.lineTo(1055, 760); c.fill();
      c.fillStyle = "#ffd84a"; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(1060 + R() * 80, 698 - R() * 10, 7, 0, 7); c.fill(); }
      c.fillStyle = "#2a2a2e"; for (const x of [1075, 1125]) { c.beginPath(); c.arc(x, 764, 9, 0, 7); c.fill(); }
      P.floor(c, R, "dirt", "#4a3420", "#1e140c", "#7a5a36");
    },
    anim(c, t) { torchAnim(c, t, [[213, 180], [613, 180], [1013, 180], [1413, 180]], "#ffd84a"); },
  },
  {
    id: "alien", name: "Planeta Alienígena", sub: "Duas luas e gravidade mais leve", grav: .85,
    platforms: [{ x: 190, y: 590, w: 230 }, { x: 1180, y: 590, w: 230 }, { x: 600, y: 460, w: 400 }, { x: 300, y: 300, w: 170 }, { x: 1130, y: 300, w: 170 }],
    plat: "alien", vignette: .45, amb: { kind: "sparkles", rate: 8 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a0a3a", "#6a1a7a", "#d8508a"]);
      P.stars(c, R, 160, 420, .9);
      // Planeta com anéis e duas luas.
      c.save(); c.translate(1180, 200); c.rotate(-.3);
      c.strokeStyle = "#f0c8ff88"; c.lineWidth = 10; c.beginPath(); c.ellipse(0, 0, 180, 40, 0, Math.PI, 0); c.stroke();
      const pg = c.createRadialGradient(-30, -30, 10, 0, 0, 110); pg.addColorStop(0, "#ffb07a"); pg.addColorStop(1, "#a8461a"); c.fillStyle = pg; c.beginPath(); c.arc(0, 0, 110, 0, 7); c.fill();
      c.fillStyle = "#ffffff22"; for (let i = -2; i <= 2; i++) c.fillRect(-110, i * 30, 220, 10);
      c.strokeStyle = "#f0c8ffcc"; c.lineWidth = 10; c.beginPath(); c.ellipse(0, 0, 180, 40, 0, 0, Math.PI); c.stroke();
      c.restore();
      P.orb(c, 300, 140, 34, "#d8fff0", "#7affd8aa"); P.orb(c, 480, 90, 16, "#f0e0ff", "#c58bffaa");
      P.ridge(c, R, "#3a0a4a", 560, 90, 1.6); P.ridge(c, R, "#5a1a6a", 650, 50);
      // Plantas alienígenas com bulbos brilhando.
      for (let i = 0; i < 14; i++) {
        const x = R() * ARENA_W, h = 90 + R() * 200, col = ["#5affd8", "#ff6fb5", "#ffe95a"][i % 3];
        c.strokeStyle = "#2a8a7a"; c.lineWidth = 6; c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.quadraticCurveTo(x + (R() - .5) * 80, ARENA_FLOOR - h * .6, x + (R() - .5) * 30, ARENA_FLOOR - h); c.stroke();
        const g = c.createRadialGradient(x, ARENA_FLOOR - h, 2, x, ARENA_FLOOR - h, 40); g.addColorStop(0, col); g.addColorStop(.3, col + "88"); g.addColorStop(1, col + "00");
        c.fillStyle = g; c.beginPath(); c.arc(x, ARENA_FLOOR - h, 40, 0, 7); c.fill();
      }
      for (let i = 0; i < 10; i++) { const x = R() * ARENA_W, s = 14 + R() * 30; c.fillStyle = "#7affd8aa"; c.beginPath(); c.moveTo(x, ARENA_FLOOR - s * 2); c.lineTo(x + s * .4, ARENA_FLOOR); c.lineTo(x - s * .4, ARENA_FLOOR); c.fill(); }
      P.floor(c, R, "moon", "#6a3a8a", "#2a0a3a", "#b07ad8");
    },
    anim(c, t) {
      // Disco voador passando com o raio de luz.
      const x = ((t * 90) % (ARENA_W + 400)) - 200, y = 230 + Math.sin(t * 1.3) * 25;
      const beam = c.createLinearGradient(0, y, 0, y + 300); beam.addColorStop(0, "#9affd855"); beam.addColorStop(1, "#9affd800");
      c.fillStyle = beam; c.beginPath(); c.moveTo(x - 20, y + 10); c.lineTo(x + 20, y + 10); c.lineTo(x + 90, y + 300); c.lineTo(x - 90, y + 300); c.fill();
      c.fillStyle = "#a8d8ffcc"; c.beginPath(); c.ellipse(x, y - 10, 26, 20, 0, Math.PI, 0); c.fill();
      c.fillStyle = "#9aa3ab"; c.beginPath(); c.ellipse(x, y, 64, 16, 0, 0, 7); c.fill(); c.fillStyle = "#5a6068"; c.beginPath(); c.ellipse(x, y + 4, 64, 8, 0, 0, Math.PI); c.fill();
      for (let i = 0; i < 5; i++) { c.fillStyle = Math.sin(t * 8 + i) > 0 ? "#ffe95a" : "#ff6fb5"; c.beginPath(); c.arc(x - 44 + i * 22, y + 2, 4, 0, 7); c.fill(); }
    },
  },
  {
    id: "biblioteca", name: "Biblioteca Arcana", sub: "Estantes infinitas e livros que voam",
    platforms: [{ x: 150, y: 590, w: 260 }, { x: 1190, y: 590, w: 260 }, { x: 600, y: 470, w: 400 }, { x: 240, y: 330, w: 200 }, { x: 1160, y: 330, w: 200 }],
    plat: "balcony", vignette: .55, amb: { kind: "sparkles", rate: 10 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a0e1a", "#2a1a24", "#3a2418"]);
      // Vitral redondo no fundo, com a luz entrando.
      const vx = 800, vy = 230;
      const halo = c.createRadialGradient(vx, vy, 40, vx, vy, 360); halo.addColorStop(0, "#ffd89a44"); halo.addColorStop(1, "#ffd89a00");
      c.fillStyle = halo; c.fillRect(0, 0, ARENA_W, ARENA_FLOOR);
      c.fillStyle = "#1a1008"; c.beginPath(); c.arc(vx, vy, 158, 0, 7); c.fill();
      const cols = ["#c8302a", "#2a6ac8", "#e8b84a", "#3aa86a", "#8a3ac8", "#e8782a"];
      for (let i = 0; i < 12; i++) { c.fillStyle = cols[i % 6]; c.beginPath(); c.moveTo(vx, vy); c.arc(vx, vy, 146, i * Math.PI / 6, (i + 1) * Math.PI / 6); c.closePath(); c.fill(); }
      c.strokeStyle = "#1a1008"; c.lineWidth = 6; for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(vx, vy); c.lineTo(vx + Math.cos(i * Math.PI / 6) * 146, vy + Math.sin(i * Math.PI / 6) * 146); c.stroke(); }
      c.beginPath(); c.arc(vx, vy, 70, 0, 7); c.stroke(); c.fillStyle = "#ffe8b0"; c.beginPath(); c.arc(vx, vy, 34, 0, 7); c.fill();
      // Raios de luz do vitral.
      c.fillStyle = "#ffe0a014"; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(vx - 120 + i * 60, vy + 60); c.lineTo(vx - 260 + i * 130, ARENA_FLOOR); c.lineTo(vx - 200 + i * 130, ARENA_FLOOR); c.lineTo(vx - 90 + i * 60, vy + 60); c.fill(); }
      // Estantes cheias de livros dos dois lados e no fundo.
      const shelf = (x, top, w) => {
        c.fillStyle = "#3a2214"; c.fillRect(x, top, w, ARENA_FLOOR - top);
        c.fillStyle = "#2a160c"; c.fillRect(x, top, w, 16); c.fillRect(x, top, 12, ARENA_FLOOR - top); c.fillRect(x + w - 12, top, 12, ARENA_FLOOR - top);
        for (let y = top + 22; y < ARENA_FLOOR - 50; y += 74) {
          let bx = x + 14;
          while (bx < x + w - 22) {
            const bw = 9 + R() * 12, bh = 44 + R() * 22, col = ["#8a2a2a", "#2a4a8a", "#2a6a3a", "#8a6a2a", "#5a2a6a", "#a85a2a", "#2a5a6a"][Math.floor(R() * 7)];
            if (R() < .1) { c.save(); c.translate(bx + bw, y + 60); c.rotate(-.35); c.fillStyle = col; c.fillRect(-bw, -bh, bw, bh); c.restore(); bx += bw + 12; continue; }
            c.fillStyle = col; c.fillRect(bx, y + 62 - bh, bw, bh); c.fillStyle = "#e8b84a88"; c.fillRect(bx + 2, y + 66 - bh, bw - 4, 2); c.fillRect(bx + 2, y + 54, bw - 4, 2);
            bx += bw + 1;
          }
          c.fillStyle = "#4a2c18"; c.fillRect(x + 10, y + 62, w - 20, 10);
        }
      };
      shelf(0, 120, 300); shelf(1300, 120, 300); shelf(420, 470, 220); shelf(960, 470, 220);
      // Escada de biblioteca e um globo.
      c.strokeStyle = "#5a3a1a"; c.lineWidth = 6; c.beginPath(); c.moveTo(300, 800); c.lineTo(250, 280); c.moveTo(340, 800); c.lineTo(290, 280); c.stroke();
      c.lineWidth = 4; for (let y = 320; y < 800; y += 42) { const k = (y - 280) / 520; c.beginPath(); c.moveTo(250 + k * 50, y); c.lineTo(290 + k * 50, y); c.stroke(); }
      c.fillStyle = "#5a3a1a"; c.fillRect(1240, 730, 8, 70); c.fillStyle = "#2a6a8a"; c.beginPath(); c.arc(1244, 712, 30, 0, 7); c.fill(); c.fillStyle = "#6ac86a"; c.beginPath(); c.ellipse(1236, 705, 12, 16, .4, 0, 7); c.fill();
      P.floor(c, R, "wood", "#5a3a22", "#2a180c", "#8a5a32");
      // Tapete vermelho no meio.
      c.fillStyle = "#7a1a1a"; c.fillRect(520, ARENA_FLOOR, 560, 14); c.fillStyle = "#e8b84a"; c.fillRect(520, ARENA_FLOOR + 3, 560, 2); c.fillRect(520, ARENA_FLOOR + 10, 560, 2);
    },
    anim(c, t) {
      // Velas tremulando e livros voando em círculo.
      torchAnim(c, t, [[470, 450], [1130, 450]], "#ffd06a");
      for (let i = 0; i < 6; i++) {
        const a = t * .5 + i * Math.PI / 3, x = 800 + Math.cos(a) * 520, y = 300 + Math.sin(a * 1.3) * 120, flap = Math.sin(t * 8 + i) * .5;
        const col = ["#8a2a2a", "#2a4a8a", "#2a6a3a", "#8a6a2a", "#5a2a6a", "#a85a2a"][i];
        c.save(); c.translate(x, y); c.rotate(Math.sin(t + i) * .2);
        for (const s of [-1, 1]) { c.save(); c.scale(s, 1); c.rotate(-flap * .6); c.fillStyle = col; c.fillRect(0, -10, 22, 22); c.fillStyle = "#f3ead2"; c.fillRect(1, -8, 19, 18); c.restore(); }
        c.restore();
      }
    },
  },
  {
    id: "aurora", name: "Lago da Aurora", sub: "Gelo fino e luzes dançando no céu",
    platforms: [{ x: 180, y: 600, w: 240 }, { x: 1180, y: 600, w: 240 }, { x: 640, y: 480, w: 320 }, { x: 330, y: 330, w: 190 }, { x: 1080, y: 330, w: 190 }],
    plat: "ice", vignette: .45, amb: { kind: "snow", rate: 14 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#020814", "#0a1a3a", "#1a3a5a"]);
      P.stars(c, R, 220, 520, .95);
      P.ridge(c, R, "#1a2a44", 560, 110, 1.4);
      P.ridge(c, R, "#e8f2ff", 600, 40); P.ridge(c, R, "#c0d4ec", 640, 30);
      // Pinheiros com neve e o lago congelado refletindo.
      for (let i = 0; i < 26; i++) { const x = R() * ARENA_W, h = 90 + R() * 120; P.pine(c, x, 690 + R() * 20, h, "#0e2a2a", "#e8f4ff"); }
      const lake = c.createLinearGradient(0, 700, 0, ARENA_FLOOR); lake.addColorStop(0, "#9ac8e8"); lake.addColorStop(1, "#4a7aa8");
      c.fillStyle = lake; c.beginPath(); c.ellipse(800, 760, 760, 60, 0, 0, 7); c.fill();
      c.strokeStyle = "#ffffff66"; c.lineWidth = 2; for (let i = 0; i < 12; i++) { const x = 200 + R() * 1200, y = 735 + R() * 45; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 + R() * 50, y + (R() - .5) * 10); c.lineTo(x + 50 + R() * 60, y + (R() - .5) * 14); c.stroke(); }
      // Cabana com janela acesa.
      c.fillStyle = "#3a2214"; c.fillRect(1290, 650, 150, 90); c.fillStyle = "#f4faff"; c.beginPath(); c.moveTo(1275, 655); c.lineTo(1365, 590); c.lineTo(1455, 655); c.fill();
      c.fillStyle = "#ffd06a"; c.fillRect(1320, 675, 30, 26); c.fillRect(1380, 675, 30, 26); c.fillStyle = "#2a160c"; c.fillRect(1333, 675, 4, 26); c.fillRect(1393, 675, 4, 26);
      c.fillStyle = "#4a3a34"; c.fillRect(1410, 600, 16, 40);
      P.floor(c, R, "snow", "#e8f2ff", "#9ab8d8", "#ffffff");
    },
    anim(c, t) {
      // Aurora boreal: faixas verdes e roxas ondulando.
      c.save(); c.globalCompositeOperation = "lighter";
      for (let b = 0; b < 3; b++) {
        const col = ["90,255,170", "120,200,255", "200,120,255"][b], base = 120 + b * 55;
        for (let x = 0; x < ARENA_W; x += 16) {
          const y = base + Math.sin(x * .004 + t * .6 + b * 2) * 50 + Math.sin(x * .011 - t * .9) * 18, h = 120 + Math.sin(x * .007 + t + b) * 50;
          const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(.3, `rgba(${col},${.16 + Math.sin(x * .02 + t * 2) * .05})`); g.addColorStop(1, `rgba(${col},0)`);
          c.fillStyle = g; c.fillRect(x, y, 17, h);
        }
      }
      c.restore();
      // Fumaça saindo da chaminé.
      for (let i = 0; i < 5; i++) { const k = (t * .25 + i / 5) % 1; c.fillStyle = `rgba(220,230,240,${.35 * (1 - k)})`; c.beginPath(); c.arc(1418 + Math.sin(t + i) * 10 + k * 40, 595 - k * 160, 10 + k * 26, 0, 7); c.fill(); }
    },
  },
  {
    id: "faroeste", name: "Cidade do Faroeste", sub: "Duelo ao pôr do sol",
    platforms: [{ x: 120, y: 560, w: 280 }, { x: 1200, y: 560, w: 280 }, { x: 640, y: 470, w: 320 }, { x: 180, y: 360, w: 180 }, { x: 1240, y: 360, w: 180 }],
    plat: "wood", vignette: .5, amb: { kind: "sand", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#2a1a4a", "#d85a3a", "#ffc070"]);
      P.orb(c, 800, 560, 120, "#ffe08a", "#ffb04a88");
      // Mesas de pedra (cânion) ao longe.
      c.fillStyle = "#8a3a2a"; for (const [x, w, h] of [[60, 220, 200], [380, 160, 150], [1100, 260, 230], [1380, 200, 170]]) { c.beginPath(); c.moveTo(x, 640); c.lineTo(x + 20, 640 - h); c.lineTo(x + w - 20, 640 - h); c.lineTo(x + w, 640); c.fill(); }
      c.fillStyle = "#a84a32"; for (const [x, w, h] of [[60, 220, 200], [1100, 260, 230]]) c.fillRect(x + 22, 640 - h, w - 44, 10);
      P.ridge(c, R, "#c0703a", 650, 30);
      // Fachadas: saloon, xerife e banco.
      const front = (x, w, h, col, sign) => {
        c.fillStyle = col; c.fillRect(x, ARENA_FLOOR - h, w, h); c.fillRect(x + 10, ARENA_FLOOR - h - 30, w - 20, 30);
        c.fillStyle = "#00000033"; for (let y = ARENA_FLOOR - h; y < ARENA_FLOOR; y += 12) c.fillRect(x, y, w, 2);
        c.fillStyle = "#e8d0a0"; c.fillRect(x + w / 2 - w * .35, ARENA_FLOOR - h - 22, w * .7, 26);
        c.fillStyle = "#3a1a0a"; c.font = "bold 20px Georgia"; c.textAlign = "center"; c.fillText(sign, x + w / 2, ARENA_FLOOR - h - 2);
        c.fillStyle = "#2a1408"; c.fillRect(x + w / 2 - 22, ARENA_FLOOR - 70, 44, 70);
        c.fillStyle = "#ffd06a"; c.fillRect(x + 20, ARENA_FLOOR - h + 30, 34, 30); c.fillRect(x + w - 54, ARENA_FLOOR - h + 30, 34, 30);
        c.fillStyle = "#5a3418"; c.fillRect(x - 6, ARENA_FLOOR - 120, w + 12, 10);
        for (const px of [x, x + w - 6]) c.fillRect(px, ARENA_FLOOR - 120, 6, 120);
      };
      front(40, 230, 260, "#8a5a32", "SALOON"); front(560, 200, 200, "#7a4a2a", "XERIFE"); front(980, 210, 230, "#9a6a3a", "BANCO"); front(1340, 220, 250, "#7a5030", "HOTEL");
      // Cactos e caixa d'água.
      const cactus = (x, h) => { c.fillStyle = "#3a7a3a"; c.beginPath(); c.roundRect(x - 9, ARENA_FLOOR - h, 18, h, 9); c.fill(); c.beginPath(); c.roundRect(x - 30, ARENA_FLOOR - h * .7, 12, h * .35, 6); c.fill(); c.beginPath(); c.roundRect(x + 18, ARENA_FLOOR - h * .8, 12, h * .3, 6); c.fill(); c.fillRect(x - 30, ARENA_FLOOR - h * .42, 24, 10); c.fillRect(x + 6, ARENA_FLOOR - h * .55, 24, 10); };
      cactus(470, 120); cactus(880, 90); cactus(1270, 140);
      c.fillStyle = "#5a3418"; for (const px of [720, 800]) c.fillRect(px, 330, 8, 140); c.fillStyle = "#7a4a22"; c.beginPath(); c.roundRect(700, 270, 120, 70, 10); c.fill();
      P.floor(c, R, "sand", "#d8a060", "#8a5a2a", "#f0c080");
    },
    anim(c, t) {
      // Bola de feno rolando e um abutre voando em círculos.
      const x = ((t * 120) % (ARENA_W + 200)) - 100, y = ARENA_FLOOR - 22 - Math.abs(Math.sin(t * 4)) * 26;
      c.save(); c.translate(x, y); c.rotate(t * 5); c.strokeStyle = "#b08a4a"; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(Math.sin(i) * 4, Math.cos(i * 1.7) * 4, 14 + (i % 3) * 3, i, i + 3.5); c.stroke(); }
      c.restore();
      const vx = 800 + Math.cos(t * .4) * 420, vy = 150 + Math.sin(t * .4) * 60, f = Math.sin(t * 6) * 6;
      c.fillStyle = "#1a0e0a"; c.beginPath(); c.moveTo(vx - 34, vy - f); c.quadraticCurveTo(vx - 14, vy - 10, vx, vy); c.quadraticCurveTo(vx + 14, vy - 10, vx + 34, vy - f); c.lineTo(vx, vy + 6); c.fill();
    },
  },
  {
    id: "estacao", name: "Estação Orbital", sub: "A Terra lá embaixo, pela janela",
    platforms: [{ x: 160, y: 590, w: 250 }, { x: 1190, y: 590, w: 250 }, { x: 600, y: 460, w: 400 }, { x: 260, y: 310, w: 200 }, { x: 1140, y: 310, w: 200 }],
    plat: "metal", vignette: .5, amb: { kind: "sparkles", rate: 6 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#1a1e26", "#242a34", "#2e3440"]);
      // Janelão com o espaço, a Terra e uma nebulosa.
      const wx = 260, wy = 60, ww = 1080, wh = 420;
      c.save(); c.beginPath(); c.roundRect(wx, wy, ww, wh, 40); c.clip();
      const sp = c.createLinearGradient(0, wy, 0, wy + wh); sp.addColorStop(0, "#02030a"); sp.addColorStop(1, "#0a0a24"); c.fillStyle = sp; c.fillRect(wx, wy, ww, wh);
      for (let i = 0; i < 4; i++) { const g = c.createRadialGradient(wx + 200 + i * 220, wy + 120 + (i % 2) * 80, 10, wx + 200 + i * 220, wy + 120, 200); g.addColorStop(0, ["#c058ff33", "#ff5aa833", "#5a8aff33", "#5affd822"][i]); g.addColorStop(1, "#00000000"); c.fillStyle = g; c.fillRect(wx, wy, ww, wh); }
      for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(255,255,255,${R() * .9})`; c.fillRect(wx + R() * ww, wy + R() * wh, R() < .1 ? 2 : 1, R() < .1 ? 2 : 1); }
      const ex = 800, ey = wy + wh + 300, er = 520;
      const eg = c.createRadialGradient(ex - 120, ey - 300, 40, ex, ey, er); eg.addColorStop(0, "#5ab8ff"); eg.addColorStop(.7, "#1a5aa8"); eg.addColorStop(1, "#0a2a5a");
      c.fillStyle = eg; c.beginPath(); c.arc(ex, ey, er, 0, 7); c.fill();
      c.fillStyle = "#3a9a4a"; for (const [x, y, rx, ry] of [[640, 420, 90, 40], [900, 400, 120, 36], [1040, 450, 70, 30], [520, 470, 60, 26]]) { c.beginPath(); c.ellipse(x, y, rx, ry, -.2, 0, 7); c.fill(); }
      c.fillStyle = "#ffffff55"; for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(450 + R() * 700, 400 + R() * 80, 40 + R() * 60, 8, R() - .5, 0, 7); c.fill(); }
      c.strokeStyle = "#7ac8ff66"; c.lineWidth = 14; c.beginPath(); c.arc(ex, ey, er + 6, 0, 7); c.stroke();
      c.restore();
      c.strokeStyle = "#5a6070"; c.lineWidth = 18; c.beginPath(); c.roundRect(wx, wy, ww, wh, 40); c.stroke();
      c.strokeStyle = "#8a92a2"; c.lineWidth = 4; c.stroke();
      c.fillStyle = "#4a505e"; for (const x of [wx + ww / 3, wx + ww * 2 / 3]) c.fillRect(x - 6, wy, 12, wh);
      // Painéis de parede, luzes e canos.
      c.fillStyle = "#3a404c"; for (let x = 0; x < ARENA_W; x += 100) { c.fillRect(x + 4, 500, 92, 290); }
      c.fillStyle = "#2a2e38"; for (let x = 0; x < ARENA_W; x += 100) c.fillRect(x + 12, 520, 76, 6);
      for (let i = 0; i < 16; i++) { c.fillStyle = ["#5affd8", "#ff5a6a", "#ffd84a"][i % 3]; c.fillRect(30 + i * 100, 560, 10, 6); c.fillRect(46 + i * 100, 560, 10, 6); }
      c.strokeStyle = "#6a7080"; c.lineWidth = 10; c.beginPath(); c.moveTo(0, 520); c.lineTo(ARENA_W, 520); c.stroke();
      c.fillStyle = "#5a6070"; for (const x of [80, 1520]) c.fillRect(x - 30, 60, 60, 740);
      P.floor(c, R, "metal", "#5a6070", "#2a2e38", "#9aa2b2");
      c.fillStyle = "#e8c83a"; for (let x = 0; x < ARENA_W; x += 40) { c.beginPath(); c.moveTo(x, ARENA_FLOOR); c.lineTo(x + 20, ARENA_FLOOR); c.lineTo(x + 10, ARENA_FLOOR + 8); c.fill(); }
    },
    anim(c, t) {
      // Luzes piscando e um satélite passando lá fora.
      const sx = 300 + ((t * 40) % 1000), sy = 150 + Math.sin(t * .5) * 30;
      c.save(); c.beginPath(); c.roundRect(260, 60, 1080, 420, 40); c.clip();
      c.fillStyle = "#c8ccd4"; c.fillRect(sx - 8, sy - 6, 16, 12); c.fillStyle = "#2a5ac8"; c.fillRect(sx - 40, sy - 4, 28, 8); c.fillRect(sx + 12, sy - 4, 28, 8);
      c.fillStyle = Math.sin(t * 6) > 0 ? "#ff5a5a" : "#5a1a1a"; c.beginPath(); c.arc(sx, sy - 9, 2.5, 0, 7); c.fill();
      c.restore();
      for (let i = 0; i < 16; i++) { if (Math.sin(t * 3 + i * 1.7) > .3) { c.fillStyle = "#ffffffcc"; c.fillRect(30 + i * 100, 560, 10, 6); } }
      const alarm = .5 + Math.sin(t * 2) * .5, g = c.createRadialGradient(80, 80, 4, 80, 80, 80); g.addColorStop(0, `rgba(255,80,60,${alarm * .6})`); g.addColorStop(1, "rgba(255,80,60,0)");
      c.fillStyle = g; c.beginPath(); c.arc(80, 80, 80, 0, 7); c.fill(); c.fillStyle = "#ff5a3a"; c.beginPath(); c.arc(80, 80, 9, 0, 7); c.fill();
    },
  },
  {
    id: "parque", name: "Parque de Diversões", sub: "Roda-gigante, luzes e algodão-doce",
    platforms: [{ x: 150, y: 600, w: 240 }, { x: 1210, y: 600, w: 240 }, { x: 610, y: 480, w: 380 }, { x: 300, y: 340, w: 180 }, { x: 1120, y: 340, w: 180 }],
    plat: "candy", vignette: .45, amb: { kind: "sparkles", rate: 10 },
    paint(c, R) {
      const P = ArenaPaint;
      P.sky(c, ["#0a0624", "#2a1a5a", "#7a3a8a"]);
      P.stars(c, R, 140, 400, .8);
      P.orb(c, 1380, 120, 40, "#fff4d8", "#ffe0a066");
      // Tendas de circo listradas.
      const tent = (x, w, h, a, b) => {
        for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? a : b; c.beginPath(); c.moveTo(x + w / 2, ARENA_FLOOR - h); c.lineTo(x + i * w / 8, ARENA_FLOOR - h * .45); c.lineTo(x + (i + 1) * w / 8, ARENA_FLOOR - h * .45); c.fill(); }
        c.fillStyle = a; c.fillRect(x, ARENA_FLOOR - h * .45, w, h * .45); c.fillStyle = b; for (let i = 0; i < 8; i += 2) c.fillRect(x + i * w / 8, ARENA_FLOOR - h * .45, w / 8, h * .45);
        c.fillStyle = "#1a0a1a"; c.beginPath(); c.moveTo(x + w / 2 - 30, ARENA_FLOOR); c.lineTo(x + w / 2, ARENA_FLOOR - h * .35); c.lineTo(x + w / 2 + 30, ARENA_FLOOR); c.fill();
        c.fillStyle = "#ffd84a"; c.beginPath(); c.moveTo(x + w / 2, ARENA_FLOOR - h - 30); c.lineTo(x + w / 2 + 26, ARENA_FLOOR - h - 20); c.lineTo(x + w / 2, ARENA_FLOOR - h - 10); c.fill(); c.fillRect(x + w / 2 - 2, ARENA_FLOOR - h - 30, 3, 30);
      };
      tent(20, 300, 300, "#c8202e", "#f4ead8"); tent(1290, 290, 280, "#2a5ac8", "#f4ead8");
      // Montanha-russa ao fundo.
      c.strokeStyle = "#4a3a6a"; c.lineWidth = 5; c.beginPath();
      for (let x = 320; x <= 1280; x += 10) c.lineTo(x, 480 - Math.abs(Math.sin(x * .008)) * 200 - (x > 900 ? 60 : 0));
      c.stroke(); c.lineWidth = 2; for (let x = 330; x < 1280; x += 30) { const y = 480 - Math.abs(Math.sin(x * .008)) * 200 - (x > 900 ? 60 : 0); c.beginPath(); c.moveTo(x, y); c.lineTo(x, ARENA_FLOOR); c.stroke(); }
      // Barracas de doces.
      for (const [x, col] of [[420, "#ff6fb5"], [1050, "#5ad8a8"]]) { c.fillStyle = "#5a3418"; c.fillRect(x, 690, 130, 110); c.fillStyle = col; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x + 13 + i * 26, 690, 13, Math.PI, 0); c.fill(); } c.fillStyle = "#ffe8f0"; c.fillRect(x + 10, 720, 110, 30); c.fillStyle = "#3a1a0a"; c.font = "bold 16px Georgia"; c.textAlign = "center"; c.fillText(col === "#ff6fb5" ? "DOCES" : "PIPOCA", x + 65, 741); }
      P.floor(c, R, "candy", "#6a3a6a", "#2a142a", "#ff8ac8");
    },
    anim(c, t) {
      // Roda-gigante girando com cabines e luzes.
      const cx = 800, cy = 330, r = 240, rot = t * .25;
      c.strokeStyle = "#e8e0f0"; c.lineWidth = 6; c.beginPath(); c.moveTo(cx - 120, ARENA_FLOOR); c.lineTo(cx, cy); c.lineTo(cx + 120, ARENA_FLOOR); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, r * .55, 0, 7); c.stroke();
      for (let i = 0; i < 12; i++) {
        const a = rot + i * Math.PI / 6, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        c.strokeStyle = "#c8c0d8"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
        c.fillStyle = ["#ff5a7a", "#ffd84a", "#5ac8ff", "#7dff6a"][i % 4]; c.beginPath(); c.roundRect(x - 16, y + 4, 32, 26, 6); c.fill();
        c.fillStyle = "#1a0a2a"; c.fillRect(x - 10, y + 9, 20, 9); c.strokeStyle = "#8a8098"; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 4); c.stroke();
      }
      for (let i = 0; i < 36; i++) { const a = rot + i * Math.PI / 18, on = Math.sin(t * 5 + i) > 0; c.fillStyle = on ? "#fff6c0" : "#8a7aa0"; c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, on ? 4 : 2.5, 0, 7); c.fill(); }
      c.fillStyle = "#ffd84a"; c.beginPath(); c.arc(cx, cy, 14, 0, 7); c.fill();
      // Varal de lâmpadas coloridas.
      for (let i = 0; i < 30; i++) { const x = 40 + i * 52, y = 230 + Math.sin(i * .6) * 14, on = (Math.floor(t * 4) + i) % 3 !== 0; c.fillStyle = on ? ["#ff5a7a", "#ffd84a", "#5ac8ff", "#7dff6a"][i % 4] : "#3a2a4a"; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
    },
  },
];

// ── Paredes de cada arena: o lado de dentro segue o desenho da parede (tijolo, tronco, rocha, metal...)
// e é exatamente essa linha que segura os lutadores. Perfil = quanto a parede entra na arena em cada altura.
const WALL_STYLE = {
  castelo: "stone", masmorra: "stone", cemiterio: "stone", coliseu: "marble", templo: "wood", deserto: "sandstone",
  floresta: "tree", selva: "tree", pantano: "tree", cogumelos: "mushroom", neve: "ice", aurora: "ice", vulcao: "basalt",
  cristais: "crystal", mina: "mine", praia: "rock", ceu: "rock", lua: "moon", alien: "alien", oceano: "coral",
  fabrica: "metal", laboratorio: "metal", estacao: "metal", cidade: "building", porto: "hull", faroeste: "plank",
  teatro: "curtain", biblioteca: "shelf", doces: "candy", parque: "candy",
};
const WALL_STEP = 8, WALL_TOP = -220, WALL_FACE = 12;
function wallProfile(style, R) {
  // Parede reta: a face de dentro é uma linha vertical (fácil de ver onde acaba a arena).
  const n = Math.ceil((ARENA_H - WALL_TOP + 240) / WALL_STEP) + 1;
  return new Float32Array(n).fill(WALL_FACE);
}
function arenaWalls(a) {
  if (!a.walls) {
    const st = WALL_STYLE[a.id] || "rock", h = a.id.split("").reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) | 0;
    a.walls = { style: st, L: wallProfile(st, seeded(h + 1)), R: wallProfile(st, seeded(h + 2)) };
  }
  return a.walls;
}
// Quanto a parede entra na arena na altura y (interpolado).
function wallDepth(prof, y) {
  const f = (y - WALL_TOP) / WALL_STEP, i = Math.max(0, Math.min(prof.length - 2, Math.floor(f))), k = Math.max(0, Math.min(1, f - i));
  return prof[i] + (prof[i + 1] - prof[i]) * k;
}

// Partículas de ambiente: nascem fora da tela e atravessam a arena.
function spawnAmbient(kind, list, R = Math.random) {
  const x = R() * ARENA_W;
  switch (kind) {
    case "snow": list.push({ x, y: -10, vx: -30 + R() * 20, vy: 60 + R() * 60, s: 1.5 + R() * 2.5, life: 15, color: "#ffffff", a: .5 + R() * .4, wob: R() * 6 }); break;
    case "embers": list.push({ x, y: ARENA_FLOOR + 10, vx: (R() - .5) * 30, vy: -40 - R() * 80, s: 1.5 + R() * 2.5, life: 6, color: R() < .5 ? "#ff8a2a" : "#ffd04a", a: 1, glow: true, wob: R() * 6 }); break;
    case "fireflies": list.push({ x, y: 300 + R() * 480, vx: (R() - .5) * 20, vy: (R() - .5) * 20, s: 2.2, life: 6 + R() * 4, color: "#d8ff8a", a: 1, glow: true, blink: R() * 6, wob: R() * 6 }); break;
    case "sand": list.push({ x: -10, y: 450 + R() * 350, vx: 160 + R() * 120, vy: (R() - .5) * 20, s: 1.2 + R() * 1.5, life: 12, color: "#f0d49a", a: .5, wob: R() * 6 }); break;
    case "spray": list.push({ x, y: 640 + R() * 60, vx: (R() - .5) * 30, vy: -30 - R() * 40, s: 1.5 + R() * 2, life: 2, color: "#cfe6ff", a: .6, wob: 0 }); break;
    case "wisps": list.push({ x, y: 500 + R() * 280, vx: (R() - .5) * 15, vy: -10 - R() * 10, s: 4 + R() * 3, life: 7, color: "#a8ffe8", a: .5, glow: true, wob: R() * 6 }); break;
    case "sparkles": list.push({ x, y: R() * ARENA_FLOOR, vx: 0, vy: -8 - R() * 10, s: 1.5 + R() * 2, life: 3 + R() * 3, color: ["#ffffff", "#c58bff", "#7ad8ff"][Math.floor(R() * 3)], a: 1, glow: true, blink: R() * 6, wob: R() * 6 }); break;
    case "petals": list.push({ x, y: -10, vx: 20 + R() * 30, vy: 40 + R() * 30, s: 3, life: 18, color: R() < .5 ? "#ff8aa8" : "#ffd0dc", a: .9, petal: true, wob: R() * 6 }); break;
    case "rain": list.push({ x: x + 200, y: -20, vx: -220, vy: 900 + R() * 300, s: 1.2, life: 2, color: "#a8c8ff", a: .35, rain: true, wob: 0 }); break;
    case "spores": list.push({ x, y: ARENA_FLOOR - R() * 250, vx: (R() - .5) * 20, vy: -12 - R() * 25, s: 2 + R() * 2.5, life: 8, color: ["#ff8ab0", "#7ad8ff", "#ffd84a", "#b8ff8a"][Math.floor(R() * 4)], a: .8, glow: true, blink: R() * 6, wob: R() * 6 }); break;
    case "bubbles": list.push({ x, y: ARENA_FLOOR + 10, vx: 0, vy: -50 - R() * 70, s: 2 + R() * 4, life: 12, color: "#dff4ff", a: .5, bubble: true, wob: R() * 6 }); break;
    default: list.push({ x, y: 200 + R() * 600, vx: (R() - .5) * 8, vy: (R() - .5) * 6, s: 1 + R() * 1.5, life: 8, color: "#f3e6c8", a: .25, wob: R() * 6 });
  }
}
function updateAmbient(arena, list, dt) {
  const n = arena.amb.rate * dt;
  for (let i = Math.floor(n + Math.random()); i > 0; i--) spawnAmbient(arena.amb.kind, list);
  for (const p of list) { p.wob += dt * 2; p.x += (p.vx + Math.sin(p.wob) * 12) * dt; p.y += p.vy * dt; p.life -= dt; }
  for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; if (p.life <= 0 || p.y > ARENA_H + 20 || p.x > ARENA_W + 20 || p.x < -30) list.splice(i, 1); }
  if (list.length > 400) list.splice(0, list.length - 400);
}
function drawAmbient(c, list, t) {
  for (const p of list) {
    let a = p.a * Math.min(1, p.life);
    if (p.blink !== undefined) a *= .5 + .5 * Math.sin(t * 4 + p.blink);
    c.globalAlpha = Math.max(0, a);
    if (p.glow) { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 4); g.addColorStop(0, p.color); g.addColorStop(1, p.color + "00"); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.s * 4, 0, 7); c.fill(); }
    else if (p.rain) { c.strokeStyle = p.color; c.lineWidth = p.s; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * .025, p.y - p.vy * .025); c.stroke(); }
    else if (p.bubble) { c.strokeStyle = p.color; c.lineWidth = 1.3; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.stroke(); c.fillStyle = "#ffffff66"; c.beginPath(); c.arc(p.x - p.s * .35, p.y - p.s * .35, p.s * .3, 0, 7); c.fill(); }
    else if (p.petal) { c.fillStyle = p.color; c.beginPath(); c.ellipse(p.x, p.y, p.s * 1.6, p.s * .8, p.wob, 0, 7); c.fill(); }
    else { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 7); c.fill(); }
  }
  c.globalAlpha = 1;
}

// Pinta o cenário fixo de uma arena num canvas (cache), com plataformas.
// ── Acabamento comum a todas as arenas: profundidade, sombras, textura e luz.
const ArenaPolish = {
  // Cor média de um pedaço do cenário (usada pra névoa e pro primeiro plano).
  sample(c, q, x, y, w, h) {
    const d = c.getImageData(Math.round(x * q), Math.round(y * q), Math.max(1, Math.round(w * q)), Math.max(1, Math.round(h * q))).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return [r / n, g / n, b / n].map(Math.round);
  },
  rgba: ([r, g, b], a) => `rgba(${r},${g},${b},${a})`,
  depth(c, arena, q) {
    const sky = this.sample(c, q, 200, 10, 1200, 60), hz = this.sample(c, q, 0, 600, ARENA_W, 60), fl = this.sample(c, q, 0, ARENA_FLOOR + 20, ARENA_W, 40);
    arena.mood = (sky[0] * .3 + sky[1] * .59 + sky[2] * .11) / 255 > .42 ? "day" : "night";
    arena.haze = hz; arena.floorCol = fl;
    // Névoa no horizonte: o fundo fica mais distante.
    let g = c.createLinearGradient(0, 430, 0, ARENA_FLOOR);
    g.addColorStop(0, this.rgba(hz, 0)); g.addColorStop(.65, this.rgba(hz, arena.mood === "day" ? .22 : .16)); g.addColorStop(1, this.rgba(hz, 0));
    c.fillStyle = g; c.fillRect(0, 430, ARENA_W, ARENA_FLOOR - 430);
    // Sombra onde o fundo encontra o chão.
    g = c.createLinearGradient(0, ARENA_FLOOR - 110, 0, ARENA_FLOOR);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.3)");
    c.fillStyle = g; c.fillRect(0, ARENA_FLOOR - 110, ARENA_W, 110);
    // Chão: borda iluminada em cima e mais escuro lá embaixo.
    g = c.createLinearGradient(0, ARENA_FLOOR, 0, ARENA_H);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)");
    c.fillStyle = g; c.fillRect(0, ARENA_FLOOR, ARENA_W, ARENA_H - ARENA_FLOOR);
    c.fillStyle = "rgba(255,255,255,.16)"; c.fillRect(0, ARENA_FLOOR, ARENA_W, 2);
    c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, ARENA_FLOOR + 3, ARENA_W, 3);
  },
  // Sombra suave que a plataforma joga no fundo.
  platShadow(c, p) {
    c.save(); c.filter = "blur(10px)"; c.fillStyle = "rgba(0,0,0,.38)";
    c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 40, p.w * .5, 22, 0, 0, 7); c.fill(); c.restore();
  },
  // Brilho na borda de cima da plataforma.
  platRim(c, p) {
    const g = c.createLinearGradient(p.x, 0, p.x + p.w, 0);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(p.x + 4, p.y, p.w - 8, 2);
  },
  finish(c, arena, q, R) {
    // Luz geral: de dia vem quente de cima; de noite, um tom frio.
    c.save(); c.globalCompositeOperation = "soft-light";
    const g = arena.mood === "day" ? c.createRadialGradient(300, -200, 100, 300, -200, 1500) : c.createRadialGradient(800, 300, 100, 800, 300, 1100);
    if (arena.mood === "day") { g.addColorStop(0, "rgba(255,240,200,.55)"); g.addColorStop(1, "rgba(60,40,80,.25)"); }
    else { g.addColorStop(0, "rgba(200,210,255,.25)"); g.addColorStop(1, "rgba(10,10,40,.45)"); }
    c.fillStyle = g; c.fillRect(0, 0, ARENA_W, ARENA_H); c.restore();
    // Textura bem leve (granulado) pra tirar o "chapado" das cores.
    const n = document.createElement("canvas"); n.width = n.height = 128;
    const nc = n.getContext("2d"), img = nc.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) { const v = R() < .5 ? 0 : 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = R() * 14; }
    nc.putImageData(img, 0, 0);
    c.save(); c.fillStyle = c.createPattern(n, "repeat"); c.fillRect(0, 0, ARENA_W, ARENA_H); c.restore();
  },
  // Primeiro plano: plantas e pedras escuras nos cantos de baixo (não cobrem os lutadores).
  foreground(arena, q) {
    const cv = document.createElement("canvas"); cv.width = Math.round(ARENA_W * q); cv.height = Math.round(ARENA_H * q);
    const c = cv.getContext("2d"); c.scale(q, q);
    const R = seeded(arena.id.length * 131 + 7), f = arena.floorCol || [40, 30, 20], dark = `rgb(${f.map(v => Math.round(v * .25)).join(",")})`;
    c.filter = "blur(2.5px)"; c.fillStyle = dark; c.strokeStyle = dark; c.lineCap = "round";
    for (const side of [0, 1]) {
      const x0 = side ? ARENA_W - 230 : 0, x1 = side ? ARENA_W : 230;
      // Pedras
      for (let i = 0; i < 3; i++) { const x = x0 + R() * (x1 - x0), r = 26 + R() * 34; c.beginPath(); c.ellipse(x, ARENA_H - 4, r * 1.3, r, 0, Math.PI, 0); c.fill(); }
      // Folhas/capim
      for (let i = 0; i < 26; i++) {
        const x = x0 + R() * (x1 - x0), h = 30 + R() * 60, lean = (side ? -1 : 1) * (8 + R() * 26);
        c.lineWidth = 3 + R() * 4; c.beginPath(); c.moveTo(x, ARENA_H); c.quadraticCurveTo(x + lean * .4, ARENA_H - h * .6, x + lean, ARENA_H - h); c.stroke();
      }
    }
    return cv;
  },
};

// q = escala de resolução (TV grande pinta com mais pixels pra ficar nítido).
function paintArena(arena, canvas, q = 1) {
  canvas.width = Math.round(ARENA_W * q); canvas.height = Math.round(ARENA_H * q);
  const c = canvas.getContext("2d"), R = seeded(arena.id.length * 977 + arena.id.charCodeAt(0));
  c.scale(q, q);
  arena.paint(c, R);
  ArenaPolish.depth(c, arena, q);
  for (const p of arena.platforms) ArenaPolish.platShadow(c, p);
  ArenaPolish.finish(c, arena, q, R);
  // Plataformas numa camada própria, desenhada depois das animações (ondas, lava...) pra nunca sumirem.
  const pc = document.createElement("canvas"); pc.width = canvas.width; pc.height = canvas.height;
  const px = pc.getContext("2d"); px.scale(q, q);
  for (const p of arena.platforms) { ArenaPaint.platform(px, p, arena.plat, R); ArenaPolish.platRim(px, p); }
  arena.platCv = pc;
  arena.fg = ArenaPolish.foreground(arena, q);
  return canvas;
}
// Arenas fechadas (sem céu): não ganham nuvens.
const INDOOR = new Set(["biblioteca", "estacao", "masmorra", "laboratorio", "teatro", "mina", "fabrica", "cristais", "oceano", "lua", "coliseu", "selva", "floresta"]); // sem céu aberto (ou coberto por copas)
const cloudSprites = new Map();
function makeCloudSprite(col) {
  const cv = document.createElement("canvas"); cv.width = 420; cv.height = 160;
  const c = cv.getContext("2d"); c.filter = "blur(6px)"; c.fillStyle = col;
  for (const [x, y, r] of [[90, 100, 48], [150, 80, 62], [220, 70, 70], [290, 88, 56], [340, 104, 40], [200, 110, 60]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  return cv;
}
// Luz que se mexe: raios de sol nas arenas de dia, névoa rasteira nas de noite, nuvens passando no céu.
function drawArenaMood(c, a, t) {
  if (!INDOOR.has(a.id) && a.haze) {
    // De dia nuvens brancas; de noite nuvens escuras recortadas no céu.
    const day = a.mood === "day", col = day ? "#ffffff" : `rgb(${a.haze.map(v => Math.round(v * .45)).join(",")})`;
    if (!cloudSprites.has(col)) cloudSprites.set(col, makeCloudSprite(col));
    const cloudSprite = cloudSprites.get(col);
    c.save(); c.globalAlpha = day ? .55 : .6;
    for (let i = 0; i < 5; i++) {
      const sp = 8 + i * 4, x = ((t * sp + i * 430) % (ARENA_W + 600)) - 500, y = 40 + (i * 67) % 230, s = .7 + (i % 3) * .3;
      c.drawImage(cloudSprite, x, y, 420 * s, 160 * s);
    }
    c.restore();
  }
  if (a.mood === "day") {
    c.save(); c.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const x = 120 + i * 390 + Math.sin(t * .2 + i) * 40, al = .04 + Math.sin(t * .6 + i * 1.7) * .02;
      const g = c.createLinearGradient(0, 0, 0, ARENA_FLOOR); g.addColorStop(0, `rgba(255,245,210,${al * 2})`); g.addColorStop(1, "rgba(255,245,210,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 90, 0); c.lineTo(x + 330, ARENA_FLOOR); c.lineTo(x + 150, ARENA_FLOOR); c.fill();
    }
    c.restore();
  } else if (a.haze) {
    const [r, g2, b] = a.haze.map(v => Math.round(v + (255 - v) * .35));
    for (let i = 0; i < 4; i++) {
      const x = ((t * (14 + i * 6) + i * 520) % 2200) - 300, y = ARENA_FLOOR - 20 - (i % 2) * 30;
      const gr = c.createRadialGradient(x, y, 10, x, y, 380); gr.addColorStop(0, `rgba(${r},${g2},${b},.14)`); gr.addColorStop(1, `rgba(${r},${g2},${b},0)`);
      c.save(); c.translate(x, y); c.scale(1, .22); c.translate(-x, -y); c.fillStyle = gr; c.beginPath(); c.arc(x, y, 380, 0, 7); c.fill(); c.restore();
    }
  }
}
