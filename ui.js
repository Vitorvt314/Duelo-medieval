// Duelo Medieval — desenho, telas, loop principal, rede e menu.
// Continuação de game.js (mesmo escopo global).
"use strict";
// ───────────────────────── Desenho ─────────────────────────
const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
const topCv = document.getElementById("top"), tctx = topCv.getContext("2d");
let scale = 1, offX = 0, offY = 0;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  for (const c of [cv, topCv]) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
  scale = Math.min(cv.width / W, cv.height / H);
  offX = (cv.width - W * scale) / 2; offY = (cv.height - H * scale) / 2;
}
addEventListener("resize", resize); resize();
// Tela de escolha: mouse clica nas setas/abas/bolinhas e a rodinha passa a página.
function uiPoint(e) { const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * cv.width / r.width, py = (e.clientY - r.top) * cv.height / r.height; return { x: (px - offX) / scale, y: (py - offY) / scale }; }
addEventListener("pointerdown", (e) => {
  if (phase !== "select") return;
  const p = uiPoint(e), h = selHits.find(h => p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h);
  if (h) h.fn();
});
addEventListener("wheel", (e) => { if (phase === "select" && Math.abs(e.deltaY) > 4) { selAll = false; selNav(e.deltaY > 0 ? 1 : -1); } }, { passive: true });

const OUT = "#120c09";
const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
function shade(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16), f = (c) => clamp(Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)), 0, 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function seg(a, b, w, color) { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
function limb(a, b, c, w, color, o = 4) {
  for (const [lw, col] of [[w + o, OUT], [w, color]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); if (c) ctx.lineTo(c.x, c.y); ctx.stroke();
  }
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

const METAL_CATS = new Set(["Lâminas", "Pesadas", "Longas"]);
function drawTrail(f) {
  if (f.trail.length < 2) return;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 1; i < f.trail.length; i++) {
    const p = f.trail[i - 1], q = f.trail[i], a = q.life / .12 * .35;
    if (q.col) { ctx.globalAlpha = Math.min(1, a * 2.4); ctx.fillStyle = ctx.strokeStyle = q.col; }
    else ctx.fillStyle = ctx.strokeStyle = q.fire ? `rgba(255,130,40,${a * 1.4})` : `rgba(255,250,235,${a})`;
    if (p.ax === p.bx && p.ay === p.by) { ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(p.bx, p.by); ctx.lineTo(q.bx, q.by); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(p.ax, p.ay); ctx.lineTo(p.bx, p.by); ctx.lineTo(q.bx, q.by); ctx.lineTo(q.ax, q.ay); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
function drawWeapon(f) {
  const W_ = f.w, s = f.sc;
  if (W_.kind === "claws") {
    for (const [h, e] of [[f.rh, f.re], [f.lh, f.le]]) { ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(h.y - e.y, h.x - e.x)); ctx.scale(.75 * s, .75 * s); drawWeaponSprite(ctx, f.wtype, 0, f.facing); ctx.restore(); }
    return;
  }
  if (!f.wtip) return;
  if (W_.glide && f.gliding) return drawOpenUmbrella(f);
  if ((f.wtype === "machado" || f.wtype === "sabreDuplo" || f.wtype === "machadoLeviata") && projectiles.some(p => p.owner === f && (p.kind === "boomaxe" || p.kind === "saberdisc" || p.kind === "leviathan"))) return; // arma voando
  const g = f.rh, t = f.wtip, flip = Math.cos(f.aim) >= 0 ? 1 : -1;
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(Math.atan2(t.y - g.y, t.x - g.x)); ctx.scale(s, s);
  const ammoOk = !W_.ammo || f.ammo > 0;
  drawWeaponSprite(ctx, f.wtype, hyp(t.x - g.x, t.y - g.y) / s, flip, { pulled: f.atkCd < W_.cd - .12, loaded: ammoOk && f.atkCd < W_.cd - .25, casting: f.castT > 0, tint: f.mmEn ? f.mmPow : hasMc(f) ? f.mcT || 0 : f.wtype === "armaPortal" ? (f.portalN || 0) % 2 : f.bombT || 0 });
  ctx.restore();
  if (f.wtype === "canhaoBraco" && f.charge > .08) drawBusterCharge(f, g, t);
  if (METAL_CATS.has(W_.cat) || (W_.relic && W_.kind !== "cast" && W_.kind !== "shoot")) {
    // Reflexo de luz que corre pela lâmina de vez em quando.
    f.glintOff ??= rnd(3);
    const ph = (time * .55 + f.glintOff) % 2.2;
    if (ph < 1) {
      const k = .25 + ph * .75, x = lerp(g.x, t.x, k), y = lerp(g.y, t.y, k), r = (5 + Math.sin(ph * Math.PI) * 7) * s;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.sin(ph * Math.PI) * .9;
      glowDot(x, y, r * 1.6, "#ffffffcc", "#fff6d055");
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r * .18, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * .18, y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x, y + r * .18); ctx.lineTo(x + r, y); ctx.lineTo(x, y - r * .18); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (f.wtype === "armaGravidade" && f.grav) {
    // Raio trator: feixe laranja ondulando até o que está sendo segurado.
    const gr = f.grav, tg = gr.e ? { x: gr.e.neck.x, y: gr.e.neck.y + 20 * gr.e.sc } : gr.pr ? { x: gr.pr.x, y: gr.pr.y } : null;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    if (tg) {
      for (let i = 0; i < 3; i++) {
        const mx = (t.x + tg.x) / 2 + Math.sin(time * 20 + i * 2) * 14, my = (t.y + tg.y) / 2 + Math.cos(time * 17 + i * 2) * 14;
        ctx.strokeStyle = i ? "rgba(255,170,70,.55)" : "rgba(255,240,200,.9)"; ctx.lineWidth = i ? 5 : 2;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.quadraticCurveTo(mx, my, tg.x, tg.y); ctx.stroke();
      }
      const pz = 1 + Math.sin(time * 14) * .12;
      glowDot(tg.x, tg.y, 60 * pz, "#ffb04a66", "#ff8a1a00");
      ctx.strokeStyle = "rgba(255,180,80,.8)"; ctx.lineWidth = 3; for (let i = 0; i < 2; i++) { const st = time * 6 + i * Math.PI; ctx.beginPath(); ctx.ellipse(tg.x, tg.y, 46 * pz, 20 * pz, 0, st, st + 2.2); ctx.stroke(); }
    } else { const pz = .7 + Math.sin(time * 30) * .3; glowDot(t.x, t.y, 30 * pz, "#ffc86a88", "#ff8a1a00"); }
    ctx.restore();
    if (rnd() < .6) particles.push({ x: t.x + rnd(-6, 6), y: t.y + rnd(-6, 6), vx: Math.cos(f.aim) * rnd(100, 260), vy: Math.sin(f.aim) * rnd(100, 260), life: .3, max: .3, color: pick(["#ffa040", "#ffe0a0"]), size: rnd(2, 3.5), g: 0, glow: true });
  }
  if (f.wtype === "lancaChamas" && f.flameT > 0) {
    // Jato contínuo: cone de fogo saindo do bico, tremulando.
    const a = f.aim, len = (190 + rnd(25)) * s, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [w0, w1, c0, c1, lk] of [[10, 60, "rgba(255,120,30,.55)", "rgba(255,40,10,0)", 1], [5, 32, "rgba(255,210,90,.75)", "rgba(255,120,30,0)", .8], [2, 12, "rgba(255,255,230,.9)", "rgba(255,220,120,0)", .5]]) {
      const L2 = len * lk, ex = t.x + ca * L2, ey = t.y + sa * L2, gr = ctx.createLinearGradient(t.x, t.y, ex, ey); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(t.x + nx * w0 * s, t.y + ny * w0 * s);
      for (let i = 1; i <= 6; i++) { const q = i / 6, w = lerp(w0, w1, q) * s + Math.sin(time * 40 + i * 2) * 4 * s; ctx.lineTo(t.x + ca * L2 * q + nx * w, t.y + sa * L2 * q + ny * w); }
      for (let i = 6; i >= 1; i--) { const q = i / 6, w = lerp(w0, w1, q) * s + Math.cos(time * 37 + i * 2) * 4 * s; ctx.lineTo(t.x + ca * L2 * q - nx * w, t.y + sa * L2 * q - ny * w); }
      ctx.lineTo(t.x - nx * w0 * s, t.y - ny * w0 * s); ctx.closePath(); ctx.fill();
    }
    glowDot(t.x, t.y, 26 * s, "#fff6c0cc", "#ff7a1a00");
    ctx.restore();
  }
  if (f.wtype === "anelLanterna") {
    // Anel aceso: aura verde pulsando na mão e faíscas de luz subindo.
    const pz = .8 + Math.sin(time * 7) * .2;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(t.x, t.y, 38 * s * pz, "#9dff8a55", "#3aff5a00"); glowDot(t.x, t.y, 12 * s, "#e8ffe0aa", "#7dff6a00"); ctx.restore();
    if (rnd() < .3) particles.push({ x: t.x + rnd(-9, 9), y: t.y + rnd(-9, 9), vx: rnd(-25, 25), vy: rnd(-100, -40), life: .6, max: .6, color: pick(["#7dff6a", "#c8ffb8", "#3aff5a"]), size: rnd(1.5, 3.4), g: 0, glow: true });
  }
  if (f.wtype === "lacoVerdade" && rnd() < .2) particles.push({ x: lerp(g.x, t.x, rnd()) + rnd(-10, 10), y: lerp(g.y, t.y, rnd()) + rnd(-12, 12), vx: rnd(-15, 15), vy: rnd(-50, -15), life: .5, max: .5, color: pick(["#ffe27a", "#ffffff", "#ffd84a"]), size: rnd(1.5, 3), g: 0, glow: true });
  if (f.wtype === "laminaTerra") {
    // A lâmina brilha verde (mais forte no golpe) e solta faíscas.
    const k = f.atkT > 0 ? 1 : .55, x0 = lerp(g.x, t.x, .2), y0 = lerp(g.y, t.y, .2);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(110,255,90,${(.2 + Math.sin(time * 8) * .05) * k})`; ctx.lineWidth = 26 * s; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(t.x, t.y); ctx.stroke();
    ctx.strokeStyle = `rgba(230,255,210,${.3 * k})`; ctx.lineWidth = 7 * s; ctx.stroke(); ctx.restore();
    if (rnd() < .35 * k + .1) { const q = rnd(.2, 1); particles.push({ x: lerp(g.x, t.x, q) + rnd(-6, 6), y: lerp(g.y, t.y, q) + rnd(-6, 6), vx: rnd(-30, 30), vy: rnd(-70, -20), life: .5, max: .5, color: pick(["#7dff6a", "#ffe95a", "#c8ffb0"]), size: rnd(1.5, 3.5), g: 0, glow: true }); }
  }
  if (f.wtype === "alhoPoro" && rnd() < .035) particles.push({ x: t.x + rnd(-10, 10), y: t.y - 10, vx: rnd(-20, 20), vy: rnd(-70, -40), life: .9, max: .9, color: pick(["#39c5bb", "#ff6fb5"]), text: pick(["♪", "♫"]), size: 16, g: 0 });
  if (f.wtype === "manopla") {
    // A próxima joia a ser usada brilha na manopla.
    const col = STONES[((f.stone ?? -1) + 1) % 6][1];
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(g.x, g.y, (22 + Math.sin(time * 6) * 4) * s, col + "aa", col + "33"); ctx.restore();
  }
  if (W_.gem) {
    // Gema dos cajados pulsando.
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glowDot(t.x, t.y, (20 + Math.sin(time * 5 + (f.glintOff || 0)) * 5) * s, W_.gem + "77", W_.gem + "22"); ctx.restore();
    if (rnd() < .12) particles.push({ x: t.x + rnd(-6, 6), y: t.y + rnd(-6, 6), vx: rnd(-20, 20), vy: rnd(-60, -20), life: .5, max: .5, color: W_.gem, size: rnd(1.5, 3), g: 0, glow: true });
  }
  if ((W_.book || W_.spell) && rnd() < .1) particles.push({ x: g.x + rnd(-10, 10), y: g.y - 8, vx: rnd(-15, 15), vy: rnd(-70, -35), life: .7, max: .7, color: W_.rune || "#c58bff", size: rnd(1.5, 3), g: 0, glow: true });
  if (W_.energy && W_.kind !== "whip") {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const g2 = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 40 * s); g2.addColorStop(0, W_.glow + "33"); g2.addColorStop(1, W_.glow + "00");
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(lerp(g.x, t.x, .6), lerp(g.y, t.y, .6), 46 * s, 0, 7); ctx.fill(); ctx.restore();
  }
  if (f.charge > .08 && f.w.charge) {
    const tip = f.wtip || f.rh, lvl = f.charge >= CHARGE_FULL ? 2 : f.charge >= CHARGE_L1 ? 1 : 0;
    const col = lvl ? CHARGE_COLOR[lvl] : "#ffffff", r = (10 + Math.min(1, f.charge / CHARGE_FULL) * 22) * (1 + Math.sin(time * (lvl === 2 ? 40 : 18)) * .12);
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glowDot(tip.x, tip.y, r * 2.2, col + "cc", col + "55");
    glowDot(tip.x, tip.y, r * .8, "#ffffff", col);
    if (lvl === 2) { ctx.strokeStyle = col; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = time * 9 + i * 2.1; ctx.beginPath(); ctx.arc(tip.x, tip.y, r * 1.6, a, a + .9); ctx.stroke(); } }
    ctx.restore();
  }
  if (f.sweep) {
    const b = f.sweep;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [wd, col] of [[22, "rgba(255,60,60,.18)"], [11, "rgba(255,80,80,.55)"], [4, "#ffffff"]]) { ctx.strokeStyle = col; ctx.lineWidth = wd + Math.sin(time * 60) * 1.5; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); }
    glowDot(b.x2, b.y2, 26, "#ffffffcc", "#ff4a4a88"); ctx.restore();
  }
  if (W_.burn && !W_.energy) {
    // Brilho de calor em volta da lâmina.
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,120,30,${.25 + Math.sin(time * 25) * .1})`; ctx.lineWidth = 14 * s;
    ctx.beginPath(); ctx.moveTo(lerp(g.x, t.x, .2), lerp(g.y, t.y, .2)); ctx.lineTo(t.x, t.y); ctx.stroke(); ctx.restore();
  }
  if (f.ball) {
    const chain = f.wpts.slice(0, -1), b = f.ball;
    ctx.strokeStyle = "#5c656c"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(chain[0].x, chain[0].y); for (const c of chain) ctx.lineTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = "#5c656c";
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * 18 * s, b.y + Math.sin(a) * 18 * s); ctx.lineTo(b.x + Math.cos(a + .35) * 9 * s, b.y + Math.sin(a + .35) * 9 * s); ctx.lineTo(b.x + Math.cos(a - .35) * 9 * s, b.y + Math.sin(a - .35) * 9 * s); ctx.fill(); }
    ctx.fillStyle = "#8d969e"; ctx.beginPath(); ctx.arc(b.x, b.y, 11 * s, 0, 7); ctx.fill(); ctx.fillStyle = "#c3cad0"; ctx.beginPath(); ctx.arc(b.x - 3 * s, b.y - 3 * s, 4 * s, 0, 7); ctx.fill();
  }
  if (f.chain && W_.energy) {
    const c = f.chain;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [wd, col] of [[10 * s, W_.glow + "44"], [5 * s, W_.glow + "cc"], [2 * s, "#ffffff"]]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); for (const q of c) ctx.lineTo(q.x, q.y); ctx.stroke(); }
    ctx.restore();
  } else if (f.chain && W_.chaos) {
    // Lâminas do Caos: corrente de elos em brasa com a lâmina curva na ponta.
    const c = f.chain;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,100,20,${.26 + Math.sin(time * 20) * .08})`; ctx.lineWidth = 14 * s;
    ctx.beginPath(); ctx.moveTo(c[0].x, c[0].y); for (const q of c) ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.restore();
    for (let i = 1; i < c.length; i++) {
      const a = c[i - 1], b = c[i], an = Math.atan2(b.y - a.y, b.x - a.x), len = hyp(b.x - a.x, b.y - a.y) / s;
      for (let j = 0; j < 2; j++) {
        const k = (j + .5) / 2, open = (i * 2 + j) % 2 === 0;
        ctx.save(); ctx.translate(lerp(a.x, b.x, k), lerp(a.y, b.y, k)); ctx.rotate(an); ctx.scale(s, s);
        ctx.beginPath(); ctx.ellipse(0, 0, Math.max(3, len / 4 + 1.5), open ? 3.8 : 1.5, 0, 0, 7);
        ctx.strokeStyle = OUT; ctx.lineWidth = 3.8; ctx.stroke();
        ctx.strokeStyle = open ? "#a8603a" : "#ff9a4a"; ctx.lineWidth = 1.9; ctx.stroke();
        ctx.restore();
      }
    }
    const e = c[c.length - 1], p = c[c.length - 2];
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.atan2(e.y - p.y, e.x - p.x)); ctx.scale(s, s);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(16, -6, 34, `rgba(255,140,40,${.45 + Math.sin(time * 18) * .12})`, "#ff3a1a00"); ctx.restore();
    drawChaosBlade(ctx, 1); ctx.restore();
    if (rnd() < .6) particles.push({ x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10), vx: rnd(-40, 40), vy: rnd(-140, -50), life: .4, max: .4, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(2.5, 5.5), g: -80, glow: true });
  } else if (f.chain) {
    const c = f.chain;
    for (let i = 1; i < c.length; i++) seg(c[i - 1], c[i], (7 - i * .35) * s, OUT);
    for (let i = 1; i < c.length; i++) seg(c[i - 1], c[i], (5 - i * .35) * s, i % 2 ? "#8f9aa3" : "#b8c0c7");
    const e = c[c.length - 1]; ctx.fillStyle = "#dfe5ea"; ctx.beginPath(); ctx.arc(e.x, e.y, 4 * s, 0, 7); ctx.fill();
  }
}
// Lâmina do Caos na ponta da corrente (desenho em weapons.js).
function drawChaosBlade(c, k) { c.save(); c.scale(k * .8, k * .8); drawChaosBladeShape(c); c.restore(); }
// Chapéu escolhido no celular (desenhos em looks.js).
function drawHat(f, x, y, fx, base) {
  ctx.save(); ctx.translate(x, y); ctx.scale(fx * f.sc, f.sc); drawHatShape(ctx, f.hat, base, time); ctx.restore();
}
// Linha de mira dos jogadores: tracejada na cor do jogador; forte enquanto arrasta o botão.
function drawAim(f) {
  const a = f.aim, ranged = RANGED.has(f.w.kind), aiming = f.pl.input && f.pl.input.aiming;
  const len = ranged ? 240 : 120, cx = Math.cos(a), cy = Math.sin(a), x0 = f.neck.x, y0 = f.neck.y;
  ctx.save(); ctx.globalAlpha = aiming ? .9 : .3; ctx.strokeStyle = f.color; ctx.fillStyle = f.color; ctx.lineWidth = aiming ? 4 : 3;
  ctx.setLineDash([12, 10]); ctx.lineDashOffset = -time * 60;
  ctx.beginPath(); ctx.moveTo(x0 + cx * 34, y0 + cy * 34); ctx.lineTo(x0 + cx * len, y0 + cy * len); ctx.stroke(); ctx.setLineDash([]);
  const ex = x0 + cx * (len + 14), ey = y0 + cy * (len + 14);
  ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - cx * 18 - cy * 9, ey - cy * 18 + cx * 9); ctx.lineTo(ex - cx * 18 + cy * 9, ey - cy * 18 - cx * 9); ctx.fill();
  if (f.w.kind === "cast" && aiming) {
    // Livros: mostra onde o feitiço vai nascer.
    const p = aimPoint(f, 700);
    ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y - (p.ground ? 6 : 0), 22 + Math.sin(time * 8) * 3, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - 30, p.y); ctx.lineTo(p.x - 12, p.y); ctx.moveTo(p.x + 12, p.y); ctx.lineTo(p.x + 30, p.y); ctx.stroke();
  }
  ctx.restore();
}
function drawFighter(f) {
  const s = f.sc;
  if (f.alive && f.sheepT > 0) { drawSheep(f); return drawPlate(f); }
  const tstop = f.frozen > 0 && time < (f.tstopT || 0);
  const base = !f.alive ? "#6d6d6d" : tstop ? "#a89cb8" : f.frozen > 0 ? "#a8ecff" : f.flash > 0 ? "#ffffff" : f.color;
  const dark = shade(base, -.25), w = 8 * s, o = 4 * Math.sqrt(s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.globalAlpha = f.alive ? (f.boss && f.boss.ghost ? .8 : 1) : .6;
  const fx = Math.cos(f.aim) >= 0 ? 1 : -1, sway = clamp(f.pelvis.vx * fx / 400, -1, 1);
  if (f.alive) { const gy = surfaceBelow(f.pelvis.x, f.pelvis.y, false), k = clamp(1 - (gy - f.pelvis.y - 47 * s) / 400, .3, 1); ctx.fillStyle = `rgba(0,0,0,${.35 * k})`; ctx.beginPath(); ctx.ellipse(f.pelvis.x, gy, 26 * k * s, 6 * k * s, 0, 0, 7); ctx.fill(); }
  if (f.alive && !f.bot) drawAim(f);
  drawTrail(f);
  drawOutfit(ctx, f.outfit, "back", f.neck, f.pelvis, fx, s, f.color, time, sway);
  if (f.w.jetpack && f.alive) drawJetpack(f);
  limb(f.neck, f.le, f.lh, w, dark, o);
  limb(f.pelvis, f.lk, f.lf, w, dark, o);
  limb(f.pelvis, f.rk, f.rf, w, base, o);
  limb(f.neck, f.pelvis, null, w + 4 * s, base, o);
  ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(f.neck.x - 2 * s, f.neck.y + 4 * s); ctx.lineTo(f.pelvis.x - 2 * s, f.pelvis.y - 4 * s); ctx.stroke();
  drawOutfit(ctx, f.outfit, "front", f.neck, f.pelvis, fx, s, f.color, time, sway);
  if (f.w.shield) { ctx.save(); ctx.translate(f.lh.x, f.lh.y); ctx.scale(f.facing * s, s); drawShield(ctx, 1.05); if (f.blockFx > 0) { ctx.fillStyle = `rgba(255,255,255,${f.blockFx * 3})`; ctx.fillRect(-16, -19, 32, 44); } ctx.restore(); }
  drawWeapon(f);
  limb(f.neck, f.re, f.rh, w, base, o);
  if (f.alive) {
    ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 2 * s;
    for (const [a, b, c] of [[f.pelvis, f.rk, f.rf], [f.neck, f.re, f.rh]]) { ctx.beginPath(); ctx.moveTo(a.x - 2 * s, a.y - 1 * s); ctx.lineTo(b.x - 2 * s, b.y - 1 * s); ctx.lineTo(c.x - 2 * s, c.y - 1 * s); ctx.stroke(); }
  }
  for (const h of [f.lh, f.rh]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(h.x, h.y, 6.5 * s, 0, 7); ctx.fill(); ctx.fillStyle = h === f.rh ? base : dark; ctx.beginPath(); ctx.arc(h.x, h.y, 4.5 * s, 0, 7); ctx.fill(); }
  // Cabeça
  const hd = f.head;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hd.x, hd.y, 15.5 * s, 0, 7); ctx.fill();
  ctx.fillStyle = base; ctx.beginPath(); ctx.arc(hd.x, hd.y, 13 * s, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.arc(hd.x - 4 * s, hd.y - 5 * s, 5 * s, 0, 7); ctx.fill();
  if (f.alive && f.ally) { ctx.fillStyle = f.tint; ctx.fillRect(f.neck.x - 9 * s, f.neck.y + 8 * s, 18 * s, 4 * s); }
  if (f.alive && (f.boss || (f.minion && !f.ally))) {
    // Olhos vermelhos brilhando nos inimigos do modo Chefão.
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "#ff3a2a"; ctx.shadowColor = "#ff3a2a"; ctx.shadowBlur = 14 * s;
    ctx.beginPath(); ctx.ellipse(hd.x + fx * 4 * s, hd.y - 1 * s, 2.6 * s, 3.4 * s, 0, 0, 7); ctx.ellipse(hd.x + fx * 9 * s, hd.y - 1 * s, 2.2 * s, 3 * s, 0, 0, 7); ctx.fill(); ctx.restore();
  } else if (f.alive) {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(hd.x + fx * 5 * s, hd.y - 1 * s, 4 * s, 5 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hd.x + fx * 6.5 * s, hd.y - 1 * s, 2.2 * s, 0, 7); ctx.fill();
  } else { ctx.strokeStyle = OUT; ctx.lineWidth = 2 * s; for (const k of [-1, 1]) { const ex = hd.x + k * 5 * s; ctx.beginPath(); ctx.moveTo(ex - 3 * s, hd.y - 4 * s); ctx.lineTo(ex + 3 * s, hd.y + 2 * s); ctx.moveTo(ex + 3 * s, hd.y - 4 * s); ctx.lineTo(ex - 3 * s, hd.y + 2 * s); ctx.stroke(); } }
  drawHat(f, hd.x, hd.y, fx, f.color);
  ctx.globalAlpha = 1;
  if (!f.alive) return;
  if (f.rooted > 0) {
    // Cipós enrolados nos pés.
    ctx.strokeStyle = "#3f9a3a"; ctx.lineWidth = 3;
    for (const ft of [f.lf, f.rf]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(ft.x, ft.y - 4 - i * 7, 9, 4, Math.sin(time * 3 + i) * .3, 0, 7); ctx.stroke(); }
    ctx.fillStyle = "#6fd06a"; for (const ft of [f.lf, f.rf]) { ctx.beginPath(); ctx.ellipse(ft.x + 7, ft.y - 16, 5, 2.5, -.6, 0, 7); ctx.fill(); }
  }
  if (f.stun > .15 && f.frozen <= 0) for (let i = 0; i < 3; i++) { const a = time * 6 + i * 2.1; ctx.fillStyle = "#ffe95a"; ctx.font = `${14 * s}px sans-serif`; ctx.textAlign = "center"; ctx.fillText("★", hd.x + Math.cos(a) * 18 * s, hd.y - 22 * s + Math.sin(a) * 5); }
  if (f.confused > 0) for (let i = 0; i < 2; i++) { const a = -time * 5 + i * Math.PI; textShadow("?", hd.x + Math.cos(a) * 20 * s, hd.y - 26 * s + Math.sin(a) * 6, "#ff8af0", `bold ${Math.round(20 * s)}px Georgia`); }
  if (f.frozen > 0 && !tstop) drawIce(f);
  drawStatus(f, hd);
  if (f.shield > 0) {
    const cx = (f.head.x + f.pelvis.x) / 2, cy = (f.head.y + f.pelvis.y) / 2 + 10 * s;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(122,168,255,${.6 + Math.sin(time * 12) * .3})`; ctx.lineWidth = 4; ctx.fillStyle = "rgba(122,168,255,.12)";
    ctx.beginPath(); ctx.arc(cx, cy, 72 * s, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  if (f.ccImmune > 0) {
    // Acabou de se soltar: brilho branco mostrando que não pode ser travado agora.
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,255,255,${.25 + Math.sin(time * 14) * .15})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse((f.head.x + f.pelvis.x) / 2, (f.head.y + f.pelvis.y) / 2 + 12 * s, 40 * s, 78 * s, 0, 0, 7); ctx.stroke(); ctx.restore();
  }
  drawPlate(f);
}
// Nome, vida e munição em cima da cabeça.
function drawPlate(f) {
  if (f.boss || f.zombie) return; // a vida do chefão fica na barra grande do topo; zumbis não têm placa
  // Nome, vida (com rastro branco do dano) e barra de recarga das armas de distância.
  f.hpShow = f.hpShow === undefined ? f.hp : lerp(f.hpShow, f.hp, .08);
  const x = f.head.x, y = f.head.y - 40;
  ctx.font = "600 15px Georgia"; ctx.textAlign = "center";
  ctx.fillStyle = "#000b"; ctx.fillText(f.pl.name, x + 1, y - 9); ctx.fillStyle = f.minion ? "#d8d2c0" : "#fff"; ctx.fillText(f.pl.name, x, y - 10);
  if (mode !== "bomba") { // na Bomba ninguém perde vida com golpes
    ctx.fillStyle = "#000a"; roundRect(ctx, x - 32, y - 4, 64, 8, 4); ctx.fill();
    ctx.fillStyle = "#fff8"; ctx.fillRect(x - 31, y - 3, 62 * clamp(f.hpShow / f.maxHp, 0, 1), 6);
    ctx.fillStyle = f.hp > f.maxHp * .35 ? f.color : "#ff4a4a"; ctx.fillRect(x - 31, y - 3, 62 * clamp(f.hp / f.maxHp, 0, 1), 6);
  }
  if (f.sp !== undefined && !f.minion) {
    const full = f.sp >= 100, yy = y + (f.w.clip ? 12 : 6);
    ctx.fillStyle = "#000a"; ctx.fillRect(x - 32, yy - 1, 64, 5);
    ctx.fillStyle = full ? (Math.sin(time * 12) > 0 ? "#ffffff" : f.color) : "#e8b84a"; ctx.fillRect(x - 31, yy, 62 * clamp(f.sp / 100, 0, 1), 3);
  }
  if (f.w.clip) {
    const reloading = f.clipT > 0;
    for (let i = 0; i < f.w.clip; i++) { ctx.fillStyle = reloading ? "#fff2" : i < f.clip ? "#e8b84a" : "#fff3"; ctx.fillRect(x - 31 + i * (62 / f.w.clip), y + 6, 62 / f.w.clip - 1.5, 4); }
    if (reloading) { ctx.fillStyle = "#5ac8ff"; ctx.fillRect(x - 31, y + 12, 62 * (1 - f.clipT / f.w.clipReload), 2); ctx.font = "11px Georgia"; ctx.fillStyle = "#9cd8ff"; ctx.fillText("recarregando", x, y + 24); }
  } else if (RANGED.has(f.w.kind) || f.w.ammo) {
    const k = f.w.ammo && f.ammo === 0 ? 1 - f.reload / f.w.reload : 1 - clamp(f.atkCd / f.w.cd, 0, 1);
    ctx.fillStyle = "#0008"; ctx.fillRect(x - 31, y + 6, 62, 3);
    ctx.fillStyle = k >= 1 ? "#e8b84a" : "#9a8a6a"; ctx.fillRect(x - 31, y + 6, 62 * clamp(k, 0, 1), 3);
    if (f.w.ammo > 1) for (let i = 0; i < f.w.ammo; i++) { ctx.fillStyle = i < f.ammo ? "#e8b84a" : "#fff3"; ctx.beginPath(); ctx.arc(x - 12 + i * 12, y + 15, 3, 0, 7); ctx.fill(); }
  }
  if (f.magic) { ctx.font = "18px 'Segoe UI Emoji', sans-serif"; ctx.fillText(MAGIC[f.magic].icon + (f.uses > 1 ? "×" + f.uses : ""), x, y - 30); }
  if (f.pl.connected === false) { ctx.font = "13px Georgia"; ctx.fillStyle = "#f88"; ctx.fillText("(sem conexão)", x, y + 28); }
}

function drawRelic(p) {
  const y = p.y + (p.landed ? Math.sin(p.bob) * 6 : 0);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const beam = ctx.createLinearGradient(0, 0, 0, y);
  beam.addColorStop(0, "rgba(255,216,74,0)"); beam.addColorStop(1, `rgba(255,216,74,${.35 + Math.sin(time * 4) * .1})`);
  ctx.fillStyle = beam; ctx.fillRect(p.x - 34, 0, 68, y);
  ctx.translate(p.x, y); ctx.rotate(time * .8);
  for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = `rgba(255,220,120,${.18 + (i % 2) * .1})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(90, -9); ctx.lineTo(90, 9); ctx.fill(); }
  ctx.restore();
  glowDot(p.x, y, 60, "#fff6c8cc", "#ffd84a66");
  drawWeaponIcon(ctx, p.type, p.x, y, 78);
  ctx.font = "bold 18px Georgia"; ctx.textAlign = "center"; ctx.lineWidth = 4; ctx.strokeStyle = "#000c";
  ctx.strokeText(WEAPONS[p.type].name, p.x, y - 58); ctx.fillStyle = "#ffd84a"; ctx.fillText(WEAPONS[p.type].name, p.x, y - 58);
}
function drawPickup(p) {
  if (p.kind === "relic") return drawRelic(p);
  const y = p.y + (p.landed ? Math.sin(p.bob) * 4 : 0);
  if (p.life < 3 && Math.sin(time * 20) > 0) return;
  if (!p.landed && !p.free) { ctx.strokeStyle = "#fff8"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, y - 18); ctx.lineTo(p.x - 18, y - 46); ctx.moveTo(p.x, y - 18); ctx.lineTo(p.x + 18, y - 46); ctx.stroke(); ctx.fillStyle = "#e8e0d0"; ctx.beginPath(); ctx.arc(p.x, y - 46, 22, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(p.x, y - 46, 22, Math.PI * 1.4, Math.PI * 1.6); ctx.lineTo(p.x, y - 46); ctx.fill(); }
  const color = p.kind === "magic" ? MAGIC[p.type].color : "#e8b84a";
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const gl = ctx.createRadialGradient(p.x, y, 2, p.x, y, 40); gl.addColorStop(0, color + "88"); gl.addColorStop(1, color + "00");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, y, 40, 0, 7); ctx.fill(); ctx.restore();
  if (p.kind === "magic") {
    ctx.fillStyle = "#1b1410dd"; ctx.beginPath(); ctx.arc(p.x, y, 17, 0, 7); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    ctx.font = "20px 'Segoe UI Emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(MAGIC[p.type].icon, p.x, y + 1); ctx.textBaseline = "alphabetic";
  } else drawWeaponIcon(ctx, p.type, p.x, y, 56);
}

function glowDot(x, y, r, inner, outer) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, inner); g.addColorStop(.45, outer); g.addColorStop(1, outer.slice(0, 7) + "00");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function drawProjectile(pr) {
  const a = pr.stuck ? pr.ang : (pr.ang = Math.atan2(pr.vy, pr.vx));
  if (pr.kind === "buster") return drawBusterShot(pr, a);
  if (pr.charge) {
    const c = CHARGE_COLOR[pr.charge], m = pr.rMul;
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    glowDot(pr.x, pr.y, 26 * m, "#ffffffdd", c + "aa");
    ctx.strokeStyle = c + "88"; ctx.lineWidth = 8 * m; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - Math.cos(a) * 40 * m, pr.y - Math.sin(a) * 40 * m); ctx.stroke();
    ctx.restore();
    if (rnd() < .8) particles.push({ x: pr.x, y: pr.y, vx: rnd(-60, 60), vy: rnd(-60, 60), life: .3, max: .3, color: pick([c, "#ffffff"]), size: rnd(2, 4) * m, g: 0, glow: true });
  }
  ctx.save();
  if (pr.charge && pr.kind !== "plasma") { ctx.translate(pr.x, pr.y); ctx.scale(pr.rMul, pr.rMul); ctx.translate(-pr.x, -pr.y); }
  if (drawSkillProj(pr, a)) { /* desenhado acima */ }
  else if (pr.kind === "arrow" || pr.kind === "bolt") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    const len = pr.kind === "bolt" ? 28 : 36;
    ctx.strokeStyle = OUT; ctx.lineWidth = pr.kind === "bolt" ? 6 : 5; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.strokeStyle = pr.kind === "bolt" ? "#555" : "#d9c08a"; ctx.lineWidth = pr.kind === "bolt" ? 4 : 3; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = "#dfe5ea"; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.fill();
    ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.moveTo(-len - 4, -6); ctx.lineTo(-len + 8, 0); ctx.lineTo(-len - 4, 6); ctx.fill();
  } else if (pr.kind === "stone") { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y, 7.5, 0, 7); ctx.fill(); ctx.fillStyle = "#9a9a92"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#c8c8c0"; ctx.beginPath(); ctx.arc(pr.x - 2, pr.y - 2, 2, 0, 7); ctx.fill(); }
  else if (pr.kind === "axe") { ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot); ctx.translate(-17, 0); drawHatchet(ctx, 30, pr.spinDir); }
  else if (pr.kind === "flask") { ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot); drawFlask(ctx, 0, 0); }
  else if (pr.kind === "thrown") {
    // Arma arremessada girando.
    const w = WEAPONS[pr.wt], mid = (w.ext[0] + w.ext[1]) / 2;
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot); ctx.translate(-mid, 0); drawWeaponSprite(ctx, pr.wt, w.L || 20, pr.spinDir, { icon: true });
  } else if (pr.kind === "rocket") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.fillStyle = "#c8ccd2"; ctx.fillRect(-14, -5, 22, 10); ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.moveTo(8, -5); ctx.lineTo(18, 0); ctx.lineTo(8, 5); ctx.fill();
    ctx.fillStyle = "#555"; ctx.fillRect(-16, -8, 5, 16);
    ctx.globalCompositeOperation = "lighter"; glowDot(-20, 0, 16, "#fff2b0", "#ff8a2acc");
    particles.push({ x: pr.x - Math.cos(a) * 20, y: pr.y - Math.sin(a) * 20, vx: rnd(-30, 30), vy: rnd(-30, 30), life: .7, max: .7, color: "#9a9a9a", size: rnd(6, 11), g: -30, puff: true });
  } else if (pr.kind === "sticky") {
    ctx.translate(pr.x, pr.y);
    ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    const blink = pr.fuse !== undefined ? Math.sin(time * (20 + (1.1 - pr.fuse) * 40)) > 0 : true;
    ctx.globalCompositeOperation = "lighter"; if (blink) glowDot(0, 0, 18, "#ffffff", "#ff4ad8cc");
  }
  else if (pr.kind === "chakram") {
    ctx.translate(pr.x, pr.y);
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 30, "#ffe9a0aa", "#ffb34a55"); ctx.globalCompositeOperation = "source-over";
    drawChakram(ctx, 15, pr.rot);
  } else if (pr.kind === "boulder") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot);
    ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9, r = 26 + (i % 3) * 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
    ctx.fillStyle = "#8a7a6a"; ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9, r = 23 + (i % 3) * 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill();
    ctx.fillStyle = "#a8988a"; ctx.beginPath(); ctx.arc(-7, -7, 9, 0, 7); ctx.fill();
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(8, 10); ctx.lineTo(12, 2); ctx.stroke();
  } else if (pr.kind === "wave") {
    // Onda de lâmina: meia-lua brilhante rente ao chão.
    ctx.translate(pr.x, pr.y); ctx.scale(Math.sign(pr.vx) || 1, 1); ctx.globalCompositeOperation = "lighter";
    for (const [r, col, wd] of [[46, "rgba(200,215,255,.35)", 18], [44, "rgba(230,240,255,.8)", 7], [42, "#ffffff", 2.5]]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(-20, 0, r, -1.25, 1.25); ctx.stroke();
    }
  } else if (pr.kind === "seed") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot);
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 18, "#c8ff9a", "#3f9a3a88"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#6a4a2a"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#6fd06a"; ctx.beginPath(); ctx.ellipse(4, -5, 5, 2.5, -.6, 0, 7); ctx.fill();
  } else if (pr.kind === "pea") {
    const [c1, c2, c3] = pr.snow ? ["#ffffff", "#8fdcff", "#3a8ad0"] : ["#e0ffb0", "#7ad84a", "#2a7a1a"];
    if (pr.snow) { ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 20, "#bff0ffaa", "#5ac8ff33"); ctx.globalCompositeOperation = "source-over"; if (rnd() < .4) particles.push({ x: pr.x, y: pr.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: .3, max: .3, color: "#ffffff", size: 2, g: 0, star: true }); }
    const g = ctx.createRadialGradient(pr.x - 3, pr.y - 3, 1, pr.x, pr.y, 8); g.addColorStop(0, c1); g.addColorStop(.6, c2); g.addColorStop(1, c3);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y, 9, 0, 7); ctx.fill(); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr.x, pr.y, 7.5, 0, 7); ctx.fill();
  } else if (pr.kind === "bouncefire") {
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 22, "#fff6c0", "#ff7a1acc"); ctx.globalCompositeOperation = "source-over";
    ctx.translate(pr.x, pr.y); ctx.rotate(time * 14); ctx.fillStyle = "#ffd84a"; ctx.fillRect(-4, -4, 8, 8); ctx.fillStyle = "#ff3a1a"; ctx.fillRect(-2, -2, 4, 4);
  } else if (pr.kind === "web") {
    const o = pr.owner; if (o && o.alive) { ctx.strokeStyle = "#ffffffcc"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); }
    ctx.translate(pr.x, pr.y); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 11, Math.sin(an) * 11); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke(); ctx.fillStyle = "#f6f6f6"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
  } else if (pr.kind === "powerorb") {
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 40, "#f0d8ff", "#b06cffcc"); glowDot(pr.x + rnd(-3, 3), pr.y + rnd(-3, 3), 14, "#ffffff", "#e0c0ff");
  } else if (pr.kind === "starshield") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 18.5, 0, 7); ctx.fill(); drawStarShield(ctx, 16);
  } else if (pr.kind === "kunai") {
    const o = pr.owner; if (o && o.alive) { ctx.strokeStyle = "#7d868e"; ctx.lineWidth = 3; ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-2, -6); ctx.lineTo(-2, 6); ctx.fill();
    ctx.fillStyle = "#c3cad0"; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(0, -4); ctx.lineTo(0, 4); ctx.fill();
    ctx.fillStyle = "#2a2a3a"; ctx.fillRect(-12, -2, 11, 4); ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(-14, 0, 3, 0, 7); ctx.stroke();
  } else if (pr.kind === "capture") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); drawCaptureBall(ctx, 0, 0, 9);
  } else if (pr.kind === "bubble") {
    const r = 16 + Math.sin(time * 8) * 1.5, g = ctx.createRadialGradient(pr.x - 5, pr.y - 5, 2, pr.x, pr.y, r);
    g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(.7, "rgba(160,220,255,.2)"); g.addColorStop(1, "rgba(255,140,240,.55)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr.x, pr.y, r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(220,245,255,.9)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.ellipse(pr.x - r * .4, pr.y - r * .4, r * .25, r * .12, -.6, 0, 7); ctx.fill();
  } else if (pr.kind === "sheepbolt") {
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 22, "#ffffff", "#ffb8e8aa"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#ffffff"; for (const [dx, dy] of [[-5, 0], [0, -4], [5, 0], [0, 3]]) { ctx.beginPath(); ctx.arc(pr.x + dx, pr.y + dy, 5, 0, 7); ctx.fill(); }
    if (rnd() < .5) particles.push({ x: pr.x, y: pr.y, vx: rnd(-40, 40), vy: rnd(-40, 40), life: .4, max: .4, color: pick(["#ffd84a", "#ff8af0", "#fff"]), size: rnd(2, 3), g: 0, star: true });
  } else if (pr.kind === "cupid") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.strokeStyle = OUT; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.fillStyle = "#ff8ab8"; ctx.beginPath(); ctx.moveTo(-38, -6); ctx.lineTo(-28, 0); ctx.lineTo(-38, 6); ctx.fill();
    drawHeart(ctx, 5, 0, 6, "#ff3a6a");
  } else if (pr.kind === "yoyo") {
    const o = pr.owner; if (o && o.alive) { ctx.strokeStyle = "#f3ead2"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); }
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, 7); ctx.fill(); ctx.fillStyle = "#c0202a"; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff6a6a"; ctx.fillRect(-9, -1.5, 18, 3); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill();
  } else if (pr.kind === "flame") {
    const q = 1 - clamp(pr.life / .33, 0, 1), r = 9 + q * 24;
    ctx.globalCompositeOperation = "lighter";
    glowDot(pr.x, pr.y, r, q < .4 ? "#fff6c0" : "#ffb34a", q < .5 ? "#ff8a2acc" : "#ff3a1a88");
  } else if (pr.kind === "note" || pr.kind === "charm") {
    const col = pr.kind === "charm" ? (pr.cursed ? "#b06cff" : { lento: "#5a9aff", repulsao: "#ffa040" }[pr.effect] || "#ff8af0") : ["#ffd84a", "#7ad8ff", "#7dff9a"][pr.glyph || 0];
    ctx.translate(pr.x, pr.y);
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 24, col + "aa", col + "33"); ctx.globalCompositeOperation = "source-over";
    ctx.rotate(Math.sin(time * 8 + pr.x * .01) * .3);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-3, 6, 7.5, 6, -.4, 0, 7); ctx.fill(); ctx.fillRect(1.5, -15, 4.5, 22);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-3, 6, 5.8, 4.4, -.4, 0, 7); ctx.fill(); ctx.fillRect(2.6, -14, 2.3, 20);
    ctx.beginPath(); ctx.moveTo(4.5, -14); ctx.quadraticCurveTo(13, -9, 11, 0); ctx.quadraticCurveTo(10, -6, 4.5, -8); ctx.fill();
  } else if (pr.kind === "shuriken") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.stuck ? pr.ang : pr.rot);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill(); drawStar4(ctx, 11, 3.5);
  } else if (pr.kind === "tornado") {
    // Tornado: funil de vento girando, com folhas e poeira.
    ctx.translate(pr.x, pr.y + 34); const k = Math.min(1, pr.life / .3);
    ctx.globalAlpha = k;
    for (let i = 0; i < 9; i++) {
      const y = -i * 9, w = 10 + i * 5.5, off = Math.sin(time * 12 + i * .8) * 6;
      ctx.strokeStyle = `rgba(225,235,245,${.55 + (i % 2) * .25})`; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(off, y, w, 4 + i * .6, 0, time * 9 + i, time * 9 + i + 4.4); ctx.stroke();
    }
    if (rnd() < .6) particles.push({ x: pr.x + rnd(-20, 20), y: pr.y + rnd(-30, 30), vx: rnd(-150, 150), vy: rnd(-200, -60), life: .4, max: .4, color: pick(["#7ab84a", "#c8b898", "#ffffff"]), size: rnd(2, 4), g: 0, star: true });
  } else if (pr.kind === "block") {
    ctx.translate(pr.x, pr.y); drawGrassBlock(ctx, -30, -30, 60);
  } else if (pr.kind === "hook") {
    const o = pr.owner; if (o && o.alive && o.wtip) { ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(o.wtip.x, o.wtip.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); }
    ctx.translate(pr.x, pr.y); ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 4, 6, -Math.PI / 2, Math.PI * .9); ctx.stroke();
    ctx.fillStyle = "#e83a3a"; ctx.beginPath(); ctx.arc(0, -8, 4, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -8, 4, Math.PI, 0); ctx.fill();
  } else if (pr.kind === "bigshuriken") {
    ctx.translate(pr.x, pr.y);
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 40, "#ffffff55", "#c0c8d044"); ctx.globalCompositeOperation = "source-over";
    ctx.rotate(pr.rot); drawStar4(ctx, 28, 8, true);
  } else if (pr.kind === "coin") {
    ctx.translate(pr.x, pr.y); const w = Math.abs(Math.cos(pr.rot)) * 9 + 1.5;
    ctx.fillStyle = "#a87a20"; ctx.beginPath(); ctx.ellipse(0, 0, w, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffd84a"; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(.5, w - 2), 7, 0, 0, 7); ctx.fill();
  } else if (pr.kind === "xbomb") {
    const blink = pr.fuse < .8 && Math.sin(time * 40) > 0;
    const T = BOMB_TYPES[pr.btype || 0];
    if (pr.btype) { ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 22 + Math.sin(time * 8) * 3, T.glow + "55", T.glow + "00"); ctx.globalCompositeOperation = "source-over"; }
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y + 3, 19.5, 0, 7); ctx.fill();
    drawClassicBomb(ctx, pr.x, pr.y + 3, 17.5, true, pr.btype || 0);
    if (blink) { ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 36, pr.btype ? T.glow + "cc" : "#ff4a2acc", "#ff3a1a44"); }
    if (rnd() < .6) particles.push({ x: pr.x + 8, y: pr.y - 21, vx: rnd(-80, 80), vy: rnd(-120, 10), life: .2, max: .2, color: pick(["#ffd84a", "#ff7a1a"]), size: rnd(1.5, 3), g: 400, glow: true });
  } else if (pr.kind === "kiball" || pr.kind === "buster") {
    ctx.globalCompositeOperation = "lighter";
    if (pr.kind === "kiball") { glowDot(pr.x, pr.y, 24, "#ffffff", "#5ac8ffcc"); glowDot(pr.x, pr.y, 9, "#ffffff", "#e8fbff"); }
    else { glowDot(pr.x, pr.y, 16, "#fffbe0", "#ffe95acc"); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#fff6b0"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, 7); ctx.fill(); }
  } else if (pr.kind === "icicle") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-24, -9); ctx.lineTo(-24, 9); ctx.fill();
    ctx.fillStyle = "#bff0ff"; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-22, -7); ctx.lineTo(-22, 7); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(15, -1); ctx.lineTo(-22, -6); ctx.lineTo(-22, -1); ctx.fill();
  } else if (pr.kind === "cannonball") {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y, 14, 0, 7); ctx.fill();
    ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = "#6a7280"; ctx.beginPath(); ctx.arc(pr.x - 4, pr.y - 4, 4, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x - Math.cos(a) * 12, pr.y - Math.sin(a) * 12, 10, "#fff2b0", "#ff8a2a88");
  } else if (pr.kind === "anchor") {
    const o = pr.owner;
    if (o && o.alive) { ctx.strokeStyle = "#5c656c"; ctx.lineWidth = 3; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); ctx.setLineDash([]); }
    ctx.translate(pr.x, pr.y); ctx.rotate(a - Math.PI / 2); ctx.lineCap = "round";
    for (const [wd, col] of [[9, OUT], [5, "#7d868e"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd;
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 16); ctx.moveTo(-9, -12); ctx.lineTo(9, -12); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 4, 15, Math.PI * .15, Math.PI * .85); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -24, 4.5, 0, 7); ctx.stroke();
    }
  } else if (pr.kind === "flamewave") {
    ctx.translate(pr.x, pr.y); ctx.scale(Math.sign(pr.vx) || 1, 1); ctx.globalCompositeOperation = "lighter";
    const k = clamp(pr.life / .55, 0, 1);
    for (const [r, col, wd] of [[32, `rgba(255,90,20,${.4 * k})`, 16], [30, `rgba(255,170,50,${.85 * k})`, 6], [28, `rgba(255,250,200,${k})`, 2]]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(-14, 0, r, -1.2, 1.2); ctx.stroke();
    }
  } else if (pr.kind === "meteor") {
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 40, "#fff2b0", "#ff6a1acc"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#3a2420"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 11, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.arc(pr.x - 3, pr.y - 3, 4, 0, 7); ctx.fill();
  }
  else {
    ctx.globalCompositeOperation = "lighter";
    if (pr.kind === "fire") glowDot(pr.x, pr.y, 26, "#fff6c0", "#ff9a2acc");
    else if (pr.kind === "ice") { ctx.translate(pr.x, pr.y); ctx.rotate(a); glowDot(0, 0, 14, "#ffffff", "#8fe3ffaa"); ctx.fillStyle = "#e8fbff"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -5); ctx.lineTo(-3, 0); ctx.lineTo(-8, 5); ctx.fill(); }
    else if (pr.kind === "spark") glowDot(pr.x, pr.y, 12, "#ffffff", "#ff8af0cc");
    else if (pr.kind === "laser" || pr.kind === "pellet" || pr.kind === "droneShot" || pr.kind === "cryo") {
      // Tiro de energia: risco alongado na direção do movimento.
      const col = { laser: "255,70,70", pellet: "255,180,60", droneShot: "90,200,255", cryo: "143,227,255" }[pr.kind], len = pr.kind === "pellet" ? 18 : 30;
      ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.lineCap = "round";
      for (const [wd, al] of [[10, .25], [5, .7]]) { ctx.strokeStyle = `rgba(${col},${al})`; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(4, 0); ctx.stroke(); }
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-len * .7, 0); ctx.lineTo(3, 0); ctx.stroke();
    }
    else if (pr.kind === "plasma") { glowDot(pr.x, pr.y, 30, "#eaffde", "#5aff4acc"); glowDot(pr.x + rnd(-3, 3), pr.y + rnd(-3, 3), 12, "#ffffff", "#b0ff9a"); }
    else if (pr.kind === "bossOrb") { glowDot(pr.x, pr.y, 24, "#f0d8ff", "#9a3affcc"); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#1a0526"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, 7); ctx.fill(); }
    else if (pr.kind === "orb") { glowDot(pr.x, pr.y, 22, "#e0c0ff", "#7a2ac0cc"); ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#14051f"; ctx.beginPath(); ctx.arc(pr.x, pr.y, 6, 0, 7); ctx.fill(); }
    else if (pr.kind === "star") {
      glowDot(pr.x, pr.y, 20, "#ffffff", "#7ad8ffcc");
      ctx.translate(pr.x, pr.y); ctx.rotate(time * 8); ctx.fillStyle = "#fff"; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, ang = i * Math.PI / 5; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } ctx.fill();
    }
  }
  ctx.restore();
}
function jagged(x1, y1, x2, y2, n, amp) { ctx.beginPath(); ctx.moveTo(x1, y1); for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(lerp(x1, x2, t) + rnd(-amp, amp), lerp(y1, y2, t) + rnd(-amp, amp)); } ctx.lineTo(x2, y2); }
function drawFx(e, layer) {
  const k = clamp(1 - e.t / e.life, 0, 1);
  ctx.save();
  if (layer === "back") {
    if (e.type === "cloud") {
      ctx.globalAlpha = Math.min(1, k * 2) * .5;
      for (let i = 0; i < 7; i++) { const a = i * .9 + e.t; ctx.fillStyle = i % 2 ? "#4bd36a" : "#7dff9a"; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * 60, e.y - 40 + Math.sin(a * 1.3) * 18, 34 + Math.sin(a * 2) * 6, 0, 7); ctx.fill(); }
    } else if (e.type === "spikes" && e.style === "fire") {
      if (e.t < .35) {
        // Aviso: chão rachando e soltando brasas.
        ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,120,30,${.3 + Math.sin(e.t * 40) * .2})`;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, 55, 10, 0, 0, 7); ctx.fill();
        if (e.t > 0 && rnd() < .5) particles.push({ x: e.x + rnd(-40, 40), y: e.y - 4, vx: rnd(-20, 20), vy: rnd(-180, -80), life: .4, max: .4, color: pick(["#ff7a1a", "#ffd84a"]), size: rnd(2, 4), g: 0, glow: true });
      } else {
        const g = e.t < .45 ? easeOut((e.t - .35) / .1) : e.t > .85 ? clamp(1 - (e.t - .85) / .25, 0, 1) : 1, h = 230 * g;
        ctx.globalCompositeOperation = "lighter";
        const lg = ctx.createLinearGradient(0, e.y - h, 0, e.y);
        lg.addColorStop(0, "rgba(255,60,20,0)"); lg.addColorStop(.3, "rgba(255,120,30,.7)"); lg.addColorStop(1, "rgba(255,240,170,.95)");
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(e.x - 46, e.y);
        for (let i = 0; i <= 8; i++) { const yy = e.y - h * i / 8, w = 46 * (1 - i / 10) + Math.sin(time * 30 + i * 1.7) * 7; ctx.lineTo(e.x - w, yy); }
        for (let i = 8; i >= 0; i--) { const yy = e.y - h * i / 8, w = 46 * (1 - i / 10) + Math.sin(time * 27 + i * 2.3) * 7; ctx.lineTo(e.x + w, yy); }
        ctx.fill(); glowDot(e.x, e.y - 20, 70 * g + 1, "#fff6c0aa", "#ff6a1a55");
        if (rnd() < .8) particles.push({ x: e.x + rnd(-30, 30), y: e.y - rnd(0, h), vx: rnd(-40, 40), vy: rnd(-260, -120), life: .4, max: .4, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(3, 7), g: -100, glow: true });
      }
    } else if (e.type === "spikes" && e.style === "tentacle") {
      if (e.t < .35) {
        // Aviso: água borbulhando no chão.
        ctx.fillStyle = `rgba(30,70,60,${.5 + Math.sin(e.t * 30) * .2})`; ctx.beginPath(); ctx.ellipse(e.x, e.y, 60, 11, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = "#5fd0a8"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(e.x + (i - 1) * 26 + Math.sin(time * 9 + i) * 4, e.y - 4, 4 + ((time * 6 + i) % 1) * 5, 0, 7); ctx.stroke(); }
      } else {
        const g = e.t < .47 ? easeOut((e.t - .35) / .12) : e.t > .85 ? clamp(1 - (e.t - .85) / .3, 0, 1) : 1;
        ctx.lineCap = "round";
        for (let i = -1; i <= 1; i++) {
          const bx = e.x + i * 30, h = (150 - Math.abs(i) * 35) * g, sw = Math.sin(time * 5 + i * 2) * 18, tipX = bx + sw + i * 12;
          for (const [wd, col] of [[22 - Math.abs(i) * 4, OUT], [17 - Math.abs(i) * 4, "#2f7a66"]]) {
            ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(bx, e.y + 4); ctx.bezierCurveTo(bx - sw * .6, e.y - h * .4, tipX + sw * .4, e.y - h * .75, tipX, e.y - h); ctx.stroke();
          }
          ctx.fillStyle = "#9fe8d0"; for (let q = 1; q <= 3; q++) { const t = q / 4; ctx.beginPath(); ctx.arc(lerp(bx, tipX, t) + 5, e.y - h * t, 3.2 - q * .5, 0, 7); ctx.fill(); }
        }
      }
    } else if (e.type === "spikes") {
      if (e.t < .35) { ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,170,80,${.4 + Math.sin(e.t * 40) * .3})`; ctx.lineWidth = 5; jagged(e.x - 72, e.y - 2, e.x + 72, e.y - 2, 9, 4); ctx.stroke(); }
      else {
        const g = e.t < .45 ? easeOut((e.t - .35) / .1) : e.t > .8 ? clamp(1 - (e.t - .8) / .2, 0, 1) : 1;
        for (let i = -3; i <= 3; i++) {
          const h = (115 - Math.abs(i) * 20) * g, x = e.x + i * 22;
          ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x - 14, e.y); ctx.lineTo(x, e.y - h - 3); ctx.lineTo(x + 14, e.y); ctx.fill();
          ctx.fillStyle = "#8a6a4a"; ctx.beginPath(); ctx.moveTo(x - 11, e.y); ctx.lineTo(x, e.y - h); ctx.lineTo(x + 11, e.y); ctx.fill();
          ctx.fillStyle = "#b08a5a"; ctx.beginPath(); ctx.moveTo(x - 4, e.y); ctx.lineTo(x, e.y - h); ctx.lineTo(x + 3, e.y); ctx.fill();
        }
      }
    } else if (e.type === "circle") {
      const f = e.f; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k;
      ctx.strokeStyle = e.color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(f.pelvis.x, f.pelvis.y + 46, 46, 11, 0, 0, 7); ctx.stroke();
      for (let i = 0; i < 6; i++) { const a = time * 3 + i * Math.PI / 3; ctx.fillStyle = e.color; ctx.beginPath(); ctx.arc(f.pelvis.x + Math.cos(a) * 46, f.pelvis.y + 46 + Math.sin(a) * 11, 3, 0, 7); ctx.fill(); }
    } else if (e.type === "airjump") {
      // Dois anéis de ar se abrindo sob os pés.
      const q = easeOut(e.t / e.life);
      ctx.globalCompositeOperation = "lighter";
      for (const [r, col, wd] of [[48, "#ffffff", 3], [34, e.color, 4]]) {
        ctx.globalAlpha = k; ctx.strokeStyle = col; ctx.lineWidth = wd * k + 1;
        ctx.beginPath(); ctx.ellipse(e.x, e.y + q * 10, 10 + r * q, 4 + r * .28 * q, 0, 0, 7); ctx.stroke();
      }
    } else if (e.type === "mark" && e.t >= 0) {
      const q = clamp(e.t / e.life, 0, 1), pulse = .5 + Math.sin(time * (10 + q * 20)) * .5;
      ctx.strokeStyle = e.color; ctx.globalAlpha = .35 + pulse * .5; ctx.lineWidth = 3 + q * 3;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r, e.r * .22, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = e.color; ctx.globalAlpha = .1 + q * .25; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * q, e.r * .22 * q, 0, 0, 7); ctx.fill();
    } else if (e.type === "grav") {
      // Anéis contraindo: o espaço sendo puxado pro centro.
      const q = e.t / e.life; ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) { const r = 240 * (1 - ((q + i / 3) % 1)); ctx.strokeStyle = `rgba(110,140,255,${.6 * (1 - q)})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(4, r), 0, 7); ctx.stroke(); }
      glowDot(e.x, e.y, 40 * (1 - q) + 4, "#e0e8ff", "#6a8affaa");
    } else if (e.type === "vines") {
      // Cipós brotando do chão e se enrolando.
      const g = easeOut(e.t / .25), a = clamp((e.life - e.t) / .3, 0, 1);
      ctx.globalAlpha = a; ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const bx = e.x + (i - 3) * 22, h = (70 + ((i * 37 + e.seed) % 40)) * g, sw = Math.sin(time * 4 + i) * 8;
        ctx.strokeStyle = "#2f6b2f"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx, e.y); ctx.bezierCurveTo(bx + 14 + sw, e.y - h * .3, bx - 14 - sw, e.y - h * .7, bx + sw * .5, e.y - h); ctx.stroke();
        ctx.strokeStyle = "#4fae46"; ctx.lineWidth = 3.5; ctx.stroke();
        ctx.fillStyle = "#7ad86f"; ctx.beginPath(); ctx.ellipse(bx + sw * .5 + 5, e.y - h + 4, 7, 3, -.7, 0, 7); ctx.fill();
        ctx.fillStyle = "#c83a5a"; if (i % 3 === 0) { ctx.beginPath(); ctx.arc(bx + sw * .5, e.y - h - 3, 4, 0, 7); ctx.fill(); }
      }
    } else if (e.type === "healzone") {
      const a = Math.min(1, e.t / .3, (e.life - e.t) / .4), r = 140 + Math.sin(time * 4) * 6;
      ctx.globalAlpha = Math.max(0, a); ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(e.x, e.y, 10, e.x, e.y, r); g.addColorStop(0, "rgba(125,255,154,.35)"); g.addColorStop(1, "rgba(125,255,154,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * .28, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(160,255,180,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * .28, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * .7, r * .2, 0, time, time + 5); ctx.stroke();
      for (let i = 0; i < 5; i++) { const an = time * 1.5 + i * 1.26, x = e.x + Math.cos(an) * r * .8, y = e.y + Math.sin(an) * r * .22; ctx.fillStyle = "#c8ffd0"; ctx.fillRect(x - 6, y - 2, 12, 4); ctx.fillRect(x - 2, y - 6, 4, 12); }
    } else if (e.type === "pika") { drawPika(e);
    } else if (e.type === "shock") {
      const r = easeOut(e.t / e.life) * (e.r || 230); ctx.globalAlpha = k; ctx.strokeStyle = "#f3e6c8"; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * .22, 0, Math.PI, 0); ctx.stroke();
    }
  } else {
    ctx.globalCompositeOperation = "lighter";
    if (e.type === "beam" || e.type === "lightning") {
      for (const [wd, al] of [[16, .25], [7, .6], [2.5, 1]]) { ctx.strokeStyle = wd < 3 ? `rgba(255,255,255,${k})` : e.col ? e.col + Math.round(al * k * 255).toString(16).padStart(2, "0") : `rgba(255,236,120,${al * k})`; ctx.lineWidth = wd; jagged(e.x1, e.y1, e.x2, e.y2, e.type === "beam" ? 14 : 9, e.type === "beam" ? 9 : 20); ctx.stroke(); }
    } else if (e.type === "rail") {
      // Railgun: feixe azul grosso com anéis ao longo do caminho.
      const rc = ["90,200,255", "255,233,90", "90,255,216"][e.lvl || 0], wm = 1 + (e.lvl || 0) * .7;
      for (const [wd, col] of [[30, `rgba(${rc},${.25 * k})`], [14, `rgba(${rc},${.7 * k})`], [5, `rgba(255,255,255,${k})`]]) { ctx.strokeStyle = col; ctx.lineWidth = wd * wm * (.6 + k * .4); ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke(); }
      const L = hyp(e.x2 - e.x1, e.y2 - e.y1), ux = (e.x2 - e.x1) / (L || 1), uy = (e.y2 - e.y1) / (L || 1);
      for (let d = 40; d < L; d += 70) { ctx.strokeStyle = `rgba(150,220,255,${.6 * k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x1 + ux * d, e.y1 + uy * d, 6 + (1 - k) * 20, 18 + (1 - k) * 20, Math.atan2(uy, ux), 0, 7); ctx.stroke(); }
    } else if (e.type === "drone") {
      // Drone: disco com hélices girando e luz azul.
      ctx.globalCompositeOperation = "source-over";
      const fade = Math.min(1, (e.life - e.t) * 2); ctx.globalAlpha = fade;
      ctx.translate(e.x, e.y);
      ctx.fillStyle = "#2a2e36"; ctx.beginPath(); ctx.ellipse(0, 0, 22, 8, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#4a5260"; ctx.beginPath(); ctx.ellipse(0, -4, 12, 6, 0, Math.PI, 0); ctx.fill();
      for (const sx of [-20, 20]) { ctx.strokeStyle = "#9aa3ab"; ctx.lineWidth = 2; const w = Math.abs(Math.cos(time * 40)) * 12; ctx.beginPath(); ctx.moveTo(sx - w, -9); ctx.lineTo(sx + w, -9); ctx.stroke(); }
      ctx.globalCompositeOperation = "lighter"; glowDot(0, 3, 12, "#ffffff", "#5ac8ffcc");
    } else if (e.type === "arc") {
      // Faíscas elétricas na cabeça do Martelo do Trovão.
      ctx.strokeStyle = "rgba(255,240,140,.9)"; ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) { const a = rnd(Math.PI * 2), r = rnd(14, 26); jagged(e.x, e.y, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 4, 4); ctx.stroke(); }
    } else if (e.type === "fizzle") {
      ctx.strokeStyle = e.color; ctx.globalAlpha = k * .7; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(lerp(e.x1, e.x2, 1 - k * .5), lerp(e.y1, e.y2, 1 - k * .5)); ctx.stroke(); ctx.setLineDash([]);
    } else if (e.type === "vortex") {
      // Livro do Caos: buraco negro girando, crescendo e puxando partículas.
      const g = easeOut(e.t / .25), r = (e.big ? 95 : 70) * g * (1 + Math.sin(time * 12) * .05), fade = e.t > e.life ? 0 : 1;
      ctx.globalAlpha = fade;
      for (let arm = 0; arm < 4; arm++) {
        ctx.strokeStyle = arm % 2 ? "rgba(255,74,216,.55)" : "rgba(138,42,255,.55)"; ctx.lineWidth = 5; ctx.beginPath();
        for (let q = 0; q <= 30; q++) { const t = q / 30, ang = -time * 6 + arm * Math.PI / 2 + t * 5, rr = r * 2.4 * (1 - t) + 8; ctx.lineTo(e.x + Math.cos(ang) * rr, e.y + Math.sin(ang) * rr * .85); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      const cg = ctx.createRadialGradient(e.x, e.y, 2, e.x, e.y, r); cg.addColorStop(0, "#000"); cg.addColorStop(.6, "#14031f"); cg.addColorStop(1, "rgba(80,10,90,0)");
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = "#ff4ad8"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, r * .55, 0, 7); ctx.stroke();
    } else if (e.type === "sonic") {
      // Ondas de som se abrindo.
      const q = easeOut(e.t / e.life);
      for (let i = 0; i < 3; i++) { const r = Math.max(1, e.r * q * (1 - i * .18)); ctx.strokeStyle = `rgba(255,200,110,${k * (.8 - i * .2)})`; ctx.lineWidth = 6 - i * 1.5; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.stroke(); }
    } else if (e.type === "cone") {
      // Trompete: leque de som com ondas, brilho e notas voando (Fanfarra = em volta toda).
      const q = easeOut(e.t / e.life), c = e.cone || .45, R = e.r * (.35 + q * .65), L = e.lvl || 0;
      const gr = ctx.createRadialGradient(e.x, e.y, 5, e.x, e.y, R); gr.addColorStop(0, `rgba(255,240,180,${.4 * k})`); gr.addColorStop(1, "rgba(255,200,90,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, R, e.a - c, e.a + c); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 5; i++) { const r = R * (.25 + i * .19); ctx.strokeStyle = `rgba(255,${225 - i * 15},${150 - i * 22},${k * (1 - i * .15)})`; ctx.lineWidth = (8 - i) * (1 + L * .3); ctx.beginPath(); ctx.arc(e.x, e.y, r, e.a - c, e.a + c); ctx.stroke(); }
      ctx.fillStyle = `rgba(255,255,255,${k})`; ctx.font = `bold ${22 + L * 6}px "Segoe UI Symbol", Georgia, sans-serif`; ctx.textAlign = "center";
      const n = 4 + L * 3;
      for (let i = 0; i < n; i++) { const an = e.a + (i / Math.max(1, n - 1) - .5) * c * 1.6, r = R * (.45 + ((i * .37) % .45)); ctx.fillText(i % 2 ? "♪" : "♫", e.x + Math.cos(an) * r, e.y + Math.sin(an) * r); }
    } else if (e.type === "reality") {
      for (const [wd, al] of [[22, .3], [10, .7], [3.5, 1]]) { ctx.strokeStyle = wd < 4 ? `rgba(255,230,230,${k})` : `rgba(255,50,60,${al * k})`; ctx.lineWidth = wd; jagged(e.x1, e.y1, e.x2, e.y2, 18, 6); ctx.stroke(); }
    } else if (e.type === "webline") {
      const o = e.owner; if (!o.alive) { ctx.restore(); return; }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Math.min(1, k * 2);
      const mx = (o.rh.x + e.x) / 2, my = (o.rh.y + e.y) / 2 + 20 * k;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.quadraticCurveTo(mx, my, e.x, e.y); ctx.stroke();
      ctx.lineWidth = 1; for (let i = 0; i < 6; i++) { const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(an) * 14, e.y + Math.sin(an) * 14); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(e.x, e.y, 8, 0, 7); ctx.stroke();
    } else if (e.type === "ki") {
      // Onda de energia: feixe azul e branco bem grosso.
      const wm = 1 + (e.lvl || 0) * .8;
      for (const [wd, col] of [[44, `rgba(90,200,255,${.25 * k})`], [24, `rgba(150,230,255,${.75 * k})`], [10, `rgba(255,255,255,${k})`]]) { ctx.strokeStyle = col; ctx.lineWidth = wd * wm * (.6 + k * .4); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.lineTo(e.x2, e.y2); ctx.stroke(); }
      glowDot(e.x1, e.y1, 50 * wm, "#ffffffcc", "#5ac8ff66");
    } else if (e.type === "xboom") {
      // Explosão redonda (Bomberman 64): bola de fogo que cresce, anel de choque e fumaça.
      const PAL = { terra: ["#7a5028", "#d8a868", "#fff0d0"], ar: ["#5ab8e8", "#cff4ff", "#ffffff"], energia: ["#d8b010", "#fff27a", "#ffffff"],
                    buraco: ["#5a1aa0", "#c58bff", "#ffe8ff"] }[e.style] || ["#ff5a10", "#ffc84a", "#fff6d8"];
      const g = easeOut(Math.min(1, e.t / .14)), r = e.r * g, fade = clamp(1 - (e.t - .12) / (e.life - .12), 0, 1);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fade * .55; glowDot(e.x, e.y, r * 1.25, PAL[1], PAL[0] + "00");
      ctx.globalAlpha = fade;
      for (const [rr, c] of [[1, PAL[0]], [.72, PAL[1]], [.4, PAL[2]]]) {
        ctx.fillStyle = c; ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const an = i / 24 * Math.PI * 2, wob = 1 + Math.sin(an * 5 + e.t * 30 + rr * 9) * .06; ctx.lineTo(e.x + Math.cos(an) * r * rr * wob, e.y + Math.sin(an) * r * rr * wob * .92); }
        ctx.globalAlpha = fade * (rr === 1 ? .55 : .8); ctx.fill();
      }
      ctx.globalAlpha = clamp(1 - e.t / .35, 0, 1); ctx.strokeStyle = PAL[2]; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (.6 + e.t * 2.4), 0, 7); ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      if (e.t < .12) for (let i = 0; i < 6; i++) { const an = rnd(Math.PI * 2), sp = rnd(250, 600); particles.push({ x: e.x, y: e.y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, life: .5, max: .5, color: pick(PAL), size: rnd(4, 9), g: -60, glow: true }); }
      if (e.t > .18 && rnd() < .6) particles.push({ x: e.x + rnd(-r, r) * .6, y: e.y + rnd(-r, r) * .5, vx: rnd(-40, 40), vy: rnd(-90, -30), life: .7, max: .7, color: e.style === "ar" ? "#e8f8ff" : "#4a4440", size: rnd(10, 18), g: -20, puff: true });
    } else if (e.type === "lasertell") {
      // Aviso do laser do robô: linha vermelha piscando.
      const o = e.owner; if (!o.alive) { ctx.restore(); return; }
      const q = e.t / e.life, x2 = o.neck.x + Math.cos(e.a) * 1800, y2 = o.neck.y + Math.sin(e.a) * 1800;
      ctx.strokeStyle = `rgba(255,60,60,${.3 + Math.sin(time * 40) * .2 + q * .4})`; ctx.lineWidth = 2 + q * 8; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -time * 200;
      ctx.beginPath(); ctx.moveTo(o.neck.x, o.neck.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
      glowDot(o.neck.x, o.neck.y, 30 + q * 30, "#ffffffcc", "#ff3a3a88");
    } else if (e.type === "genie") { drawGenie(e);
    } else if (e.type === "stand") { drawStand(e);
    } else if (e.type === "timestop") {
      // O mundo perde a cor enquanto o tempo está parado; começa com uma onda que se expande.
      ctx.globalCompositeOperation = "source-over";
      if (e.t < .4) { ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(e.x, e.y, easeOut(e.t / .4) * 1900, 0, 7); ctx.fill(); }
      else { ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = Math.min(1, (e.life - e.t) / .3) * .85; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H); }
    } else if (e.type === "nova") {
      // Explosão Glacial: anel de gelo se abrindo com cristais.
      const q = easeOut(e.t / e.life), r = e.r * q;
      for (const [wd, col] of [[26, `rgba(140,220,255,${.3 * k})`], [9, `rgba(200,240,255,${.8 * k})`], [3, `rgba(255,255,255,${k})`]]) { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(1, r), 0, 7); ctx.stroke(); }
      ctx.fillStyle = `rgba(230,250,255,${k})`;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, -5); ctx.lineTo(-8, 0); ctx.lineTo(0, 5); ctx.fill(); ctx.restore(); }
    } else if (e.type === "rune") {
      const g = easeOut(e.t / .3), x = e.x, y = e.y; ctx.globalAlpha = e.fired ? clamp(1 - (e.t - e.life) / .2, 0, 1) : 1;
      ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 60 * g, 16 * g, 0, 0, 7); ctx.stroke();
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 44 * g, 11 * g, 0, 0, 7); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = -time * 2.5 + i * Math.PI / 4; ctx.fillStyle = e.color; ctx.fillRect(x + Math.cos(a) * 52 * g - 2, y + Math.sin(a) * 13 * g - 2, 4, 4); }
      glowDot(x, y, 50 * g + 1, e.color + "55", e.color + "22");
    } else if (e.type === "tether") {
      const o = e.owner.rh, t = e.target.neck, n = 18, nx = -(t.y - o.y), ny = t.x - o.x, nl = hyp(nx, ny) || 1;
      ctx.strokeStyle = `rgba(125,255,154,${.8 * k + .2})`; ctx.lineWidth = 4; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const s = i / n, wob = Math.sin(s * Math.PI * 4 - time * 20) * 8 * Math.sin(s * Math.PI); ctx.lineTo(lerp(t.x, o.x, s) + nx / nl * wob, lerp(t.y, o.y, s) + ny / nl * wob); }
      ctx.stroke(); ctx.lineWidth = 12; ctx.strokeStyle = "rgba(125,255,154,.15)"; ctx.stroke();
    }
  }
  ctx.restore();
  drawSkillFx(e, layer, k);
}
function drawParticles() {
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    if (p.text) {
      ctx.font = `bold ${p.size}px Georgia`; ctx.textAlign = "center";
      ctx.lineWidth = 4; ctx.strokeStyle = "#000c"; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y);
    } else if (p.ring) { ctx.strokeStyle = p.color; ctx.lineWidth = 3 * a; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1, p.size * (1.2 - a)), 0, 7); ctx.stroke(); }
    else if (p.line) { ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.stroke(); }
    else if (p.star) { ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 8); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); }
    else if (p.puff) { ctx.globalAlpha = a * .5; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - a * .6), 0, 7); ctx.fill(); }
    else if (p.confetti) { ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.life * 6 + p.size); ctx.fillRect(-5, -2.5, 10, 5); ctx.restore(); }
    else { if (p.glow) ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(.5, p.size * (.4 + a * .6)), 0, 7); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  }
  ctx.globalAlpha = 1;
}

// ── Telas sobrepostas (HUD, introdução, seleção, campeão)
function textShadow(text, x, y, color, font, align = "center") { ctx.font = font; ctx.textAlign = align; ctx.fillStyle = "#000a"; ctx.fillText(text, x + 2, y + 3); ctx.fillStyle = color; ctx.fillText(text, x, y); }
function drawBossBar() {
  const boss = fighters.find(f => f.boss); if (!boss) return;
  boss.hpShow = boss.hpShow === undefined ? boss.hp : lerp(boss.hpShow, boss.hp, .06);
  const w = 760, x = W / 2 - w / 2, y = 26;
  textShadow(`${boss.pl.name}  ·  Chefão ${bossStage + 1}/${BOSSES.length}`, W / 2, y + 2, boss.bs && boss.bs.enraged ? "#ff6a5a" : "#f3e6c8", "bold 22px Georgia");
  ctx.fillStyle = "#000b"; roundRect(ctx, x, y + 12, w, 20, 10); ctx.fill();
  ctx.fillStyle = "#fff6"; ctx.fillRect(x + 3, y + 15, (w - 6) * clamp(boss.hpShow / boss.maxHp, 0, 1), 14);
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, "#ff4a3a"); g.addColorStop(1, boss.color);
  ctx.fillStyle = g; ctx.fillRect(x + 3, y + 15, (w - 6) * clamp(boss.hp / boss.maxHp, 0, 1), 14);
  ctx.strokeStyle = "#e8b84a88"; ctx.lineWidth = 2; roundRect(ctx, x, y + 12, w, 20, 10); ctx.stroke();
  ctx.fillStyle = "#e8b84a"; ctx.fillRect(x + w * .4, y + 12, 2, 20);
}
// Espírito Estelar: musculoso, com cabelo e cachecol ao vento, aura roxa e dezenas de socos.
function drawStand(e) {
  const o = e.owner; if (!o.alive) return;
  const t = e.t, a = clamp(Math.min(t / .15, (e.life - t) / .2), 0, 1), d = e.dir;
  const barrage = t > .2 && t < e.life - .28, final = t >= e.life - .28;
  const sx = o.neck.x + d * (34 + Math.min(1, t / .2) * 26), sy = o.neck.y - 34 - Math.sin(time * 4) * 3, S = 1.45;
  ctx.save();
  // Aura em chamas.
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * .75;
  for (let i = 0; i < 9; i++) {
    const ph = time * 7 + i * 1.3, bx = sx + (i - 4) * 9 * S * d, by = sy + 70 * S, h = (95 + Math.sin(ph) * 22) * S;
    const g = ctx.createLinearGradient(0, by, 0, by - h); g.addColorStop(0, "rgba(140,90,255,0)"); g.addColorStop(.3, "rgba(160,110,255,.38)"); g.addColorStop(1, "rgba(210,170,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 11 * S, by); ctx.quadraticCurveTo(bx + Math.sin(ph) * 9, by - h * .6, bx + Math.sin(ph * 1.3) * 7, by - h); ctx.quadraticCurveTo(bx + 4, by - h * .5, bx + 11 * S, by); ctx.fill();
  }
  glowDot(sx, sy + 10 * S, 115 * S, "#c58bff55", "#6a3aff22");
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a * .95;
  // Daqui pra frente: coordenadas locais, olhando pra +x.
  ctx.translate(sx, sy); ctx.scale(d * S, S);
  const skin = (x0, y0, x1, y1) => { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "#c4adff"); g.addColorStop(.45, "#7a5ae0"); g.addColorStop(1, "#38207e"); return g; };
  const shape = (pts, fill, lw = 3.5) => { ctx.beginPath(); pts(); ctx.closePath(); ctx.lineJoin = "round"; ctx.strokeStyle = OUT; ctx.lineWidth = lw; ctx.stroke(); ctx.fillStyle = fill; ctx.fill(); };
  const sw = Math.sin(time * 9);
  // Cabelo longo e esvoaçante (atrás de tudo).
  ctx.fillStyle = "#140a30"; ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(10, -40);
  for (let i = 0; i < 6; i++) { const k = i / 5, w = Math.sin(time * 8 + i * .9) * 4; ctx.lineTo(-14 - 34 * k, -44 + 30 * k + w); ctx.lineTo(-8 - 22 * k, -34 + 26 * k + w * .5); }
  ctx.lineTo(-6, -8); ctx.lineTo(8, -14); ctx.closePath(); ctx.stroke(); ctx.fill();
  // Cachecol vermelho voando pra trás.
  ctx.fillStyle = "#c0202e"; ctx.beginPath(); ctx.moveTo(-4, -8); ctx.quadraticCurveTo(-40, -14 + sw * 6, -74, -4 + sw * 10); ctx.lineTo(-68, 8 + sw * 8); ctx.quadraticCurveTo(-36, 4 + sw * 4, -2, 2); ctx.closePath();
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
  ctx.fillStyle = "#ff5a5a55"; ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(-38, -11 + sw * 6, -66, -2 + sw * 9); ctx.lineTo(-62, 2 + sw * 9); ctx.quadraticCurveTo(-36, -4 + sw * 5, -6, -1); ctx.fill();
  // Pernas que somem na aura.
  for (const [x0, x1] of [[-12, -16], [12, 18]]) {
    const g = ctx.createLinearGradient(0, 40, 0, 96); g.addColorStop(0, "#5a3ab8"); g.addColorStop(1, "rgba(90,58,184,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 - 10, 42); ctx.lineTo(x0 + 10, 42); ctx.lineTo(x1 + 6, 96); ctx.lineTo(x1 - 7, 96); ctx.closePath(); ctx.fill();
  }
  // Tanga vermelha.
  ctx.fillStyle = "#a01824"; ctx.beginPath(); ctx.moveTo(-10, 44); ctx.lineTo(10, 44); ctx.lineTo(7 + sw * 2, 70); ctx.lineTo(-6 + sw * 2, 70); ctx.closePath(); ctx.fill();
  // Pescoço e tronco em V com peito e abdômen.
  shape(() => { ctx.moveTo(-8, -14); ctx.lineTo(9, -14); ctx.lineTo(12, -2); ctx.lineTo(-10, -2); }, skin(-8, -14, 10, 0));
  shape(() => { ctx.moveTo(-29, -4); ctx.quadraticCurveTo(0, -10, 29, -4); ctx.quadraticCurveTo(26, 18, 15, 44); ctx.lineTo(-15, 44); ctx.quadraticCurveTo(-26, 18, -29, -4); }, skin(-26, -6, 22, 44), 4);
  ctx.strokeStyle = "#2a1660"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  for (const px of [-1, 1]) { ctx.beginPath(); ctx.moveTo(px * 2, 3); ctx.quadraticCurveTo(px * 18, 0, px * 24, 8); ctx.quadraticCurveTo(px * 16, 16, px * 2, 14); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, 42); ctx.stroke();
  for (const yy of [21, 29, 37]) { ctx.beginPath(); ctx.moveTo(-9, yy); ctx.quadraticCurveTo(-5, yy + 2, -1, yy); ctx.moveTo(1, yy); ctx.quadraticCurveTo(5, yy + 2, 9, yy); ctx.stroke(); }
  ctx.fillStyle = "#ffffff30"; ctx.beginPath(); ctx.ellipse(-12, 5, 8, 4, -.3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(-6, 24, 3, 5, 0, 0, 7); ctx.fill();
  // Cinto dourado com fivela.
  shape(() => { ctx.rect(-15, 40, 30, 6); }, "#e8b84a", 2.5);
  shape(() => { ctx.rect(-4, 39, 8, 8); }, "#ffe08a", 2);
  // Braço de trás (fica atrás do tronco só na pose parada).
  const fist = (x, y, r, back) => {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r); g.addColorStop(0, back ? "#9a80f0" : "#d4c0ff"); g.addColorStop(1, back ? "#3a2290" : "#6a48d0");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2a1660"; ctx.lineWidth = 1.2; for (const k of [-.35, .05, .45]) { ctx.beginPath(); ctx.arc(x + r * .45, y + k * r, r * .22, -1.4, 1.4); ctx.stroke(); }
    ctx.fillStyle = "#e8b84a"; ctx.fillRect(x - r * 1.25, y - r * .7, r * .45, r * 1.4);
  };
  const arm = (x0, y0, x1, y1, w) => {
    ctx.lineCap = "round"; ctx.strokeStyle = OUT; ctx.lineWidth = w + 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = "#7a5ae0"; ctx.lineWidth = w; ctx.stroke(); ctx.strokeStyle = "#ffffff30"; ctx.lineWidth = w * .3; ctx.beginPath(); ctx.moveTo(x0, y0 - w * .2); ctx.lineTo(x1, y1 - w * .2); ctx.stroke();
  };
  if (barrage) {
    // Rajada: dezenas de punhos borrados (o efeito que já estava bom).
    for (let i = 0; i < 12; i++) {
      const fx2 = 40 + rnd(20, 125) * .8, fy = rnd(-32, 52), from = i % 2 ? [18, 0] : [-18, 0];
      ctx.globalAlpha = a * (.25 + rnd(.55));
      arm(from[0], from[1], fx2, fy, 8);
      ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 2 / S; ctx.beginPath(); ctx.moveTo(fx2 - 22, fy); ctx.lineTo(fx2 - 60, fy); ctx.stroke();
      fist(fx2, fy, 8.5);
    }
    ctx.globalAlpha = a * .95;
  } else if (final) {
    const k = easeOut((t - (e.life - .28)) / .1), fx2 = 30 + 95 * k;
    arm(18, 0, fx2, 6, 10); fist(fx2, 6, 13);
    ctx.globalCompositeOperation = "lighter"; glowDot(fx2 + 10, 6, 52, "#ffffffcc", "#c58bff66");
    ctx.fillStyle = "#ffffffaa"; ctx.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 10 : 33, an = i * Math.PI / 8 + time * 2; ctx.lineTo(fx2 + 15 + Math.cos(an) * r, 6 + Math.sin(an) * r); } ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else {
    // Guarda de boxe: os dois punhos na altura do queixo.
    arm(-20, 0, -2, 24, 9); arm(-2, 24, 22, 12, 8); fist(24, 11, 8.5, true);
    arm(20, 0, 32, 26, 10); arm(32, 26, 42, 4, 9); fist(43, 2, 9.5);
  }
  // Ombreiras douradas.
  for (const px of [-25, 25]) {
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(px, -3, 11, 8, 0, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(px - 3, -6, 1, px, -3, 10); g.addColorStop(0, "#fff0b0"); g.addColorStop(1, "#c08a20");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(px, -3, 9, 6, 0, 0, 7); ctx.fill();
  }
  // Cabeça: queixo forte, faixa dourada com protetores nas orelhas, olhos brilhando.
  shape(() => { ctx.moveTo(-10, -38); ctx.quadraticCurveTo(4, -46, 14, -34); ctx.lineTo(15, -22); ctx.quadraticCurveTo(13, -12, 5, -11); ctx.lineTo(-6, -13); ctx.quadraticCurveTo(-13, -22, -10, -38); }, skin(-10, -44, 14, -12));
  ctx.fillStyle = "#38207e66"; ctx.beginPath(); ctx.moveTo(-6, -13); ctx.quadraticCurveTo(-12, -22, -9, -32); ctx.lineTo(-3, -24); ctx.closePath(); ctx.fill();
  // Franja espetada na testa.
  ctx.fillStyle = "#140a30"; ctx.beginPath(); ctx.moveTo(-12, -36); ctx.lineTo(-4, -50); ctx.lineTo(0, -40); ctx.lineTo(6, -52); ctx.lineTo(9, -40); ctx.lineTo(16, -46); ctx.lineTo(14, -34); ctx.quadraticCurveTo(2, -40, -12, -36); ctx.fill();
  shape(() => { ctx.moveTo(-11, -34); ctx.quadraticCurveTo(3, -40, 15, -32); ctx.lineTo(15, -29); ctx.quadraticCurveTo(3, -36, -11, -30); }, "#e8b84a", 2);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(-5, -25, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(-5, -25, 4, 0, 7); ctx.fill();
  ctx.save(); ctx.shadowColor = "#bff0ff"; ctx.shadowBlur = 14; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(4, -27); ctx.lineTo(13, -28); ctx.lineTo(12, -25.5); ctx.lineTo(5, -25); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.strokeStyle = "#140a30"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(3, -30); ctx.lineTo(14, -31.5); ctx.stroke();
  ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(6, -16); ctx.lineTo(12, -16.5); ctx.stroke();
  ctx.restore();
  // "ゴゴゴ" ameaçador atrás de quem invocou.
  ctx.save(); ctx.globalAlpha = a * .85; ctx.font = `bold ${Math.round(28 + Math.sin(time * 6) * 3)}px "Yu Gothic", "Meiryo", "MS Gothic", sans-serif`; ctx.textAlign = "center";
  for (let i = 0; i < 3; i++) { const gx = o.neck.x - d * (55 + i * 26), gy = o.head.y - 25 - i * 26 + Math.sin(time * 5 + i) * 4; ctx.fillStyle = "#2a0a4a"; ctx.fillText("ゴ", gx + 2, gy + 2); ctx.fillStyle = "#c58bff"; ctx.fillText("ゴ", gx, gy); }
  ctx.restore();
}
// Gênio: sai em espiral de fumaça da lâmpada, cresce, cruza os braços e estala os dedos ao realizar o desejo.
function drawGenie(e) {
  const o = e.owner; if (!o.alive) return;
  const t = e.t, a = clamp(Math.min(t / .3, (e.life - t) / .35), 0, 1), grow = easeOut(Math.min(1, t / .45));
  const gx = e.gx ?? o.neck.x, gy = (e.gy ?? o.head.y - 100) - Math.sin(time * 3) * 5, S = 1.3 * (.3 + .7 * grow), d = o.facing || 1;
  ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 16; i++) {
    const k = i / 15, x = lerp(o.rh.x, gx, k) + Math.sin(time * 6 + k * 9) * 16 * (1 - k), y = lerp(o.rh.y, gy + 42 * S, k), r = (5 + k * 17) * (S / 1.3);
    ctx.fillStyle = `rgba(${90 + k * 40},${185 + k * 30},255,${.45 + k * .3})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  }
  const P = (dx, dy) => ({ x: gx + dx * S * d, y: gy + dy * S });
  const skin = ctx.createLinearGradient(gx, gy - 50 * S, gx, gy + 40 * S); skin.addColorStop(0, "#9ae6ff"); skin.addColorStop(1, "#2a7ad8");
  const body = [P(-25, -14), P(25, -14), P(16, 22), P(6, 46), P(-6, 46), P(-16, 22)];
  ctx.beginPath(); body.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.stroke(); ctx.fillStyle = skin; ctx.fill();
  ctx.fillStyle = "#c0302a"; for (const sd of [-1, 1]) { const p1 = P(sd * 25, -14), p2 = P(sd * 9, -14), p3 = P(sd * 11, 18), p4 = P(sd * 16, 22); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill(); }
  ctx.strokeStyle = "#1a5aa0"; ctx.lineWidth = 1.6; for (const sd of [-1, 1]) { const c = P(sd * 5, -4); ctx.beginPath(); ctx.arc(c.x, c.y, 5 * S, .3, Math.PI - .3); ctx.stroke(); }
  const w1 = P(-16, 19), w2 = P(16, 19); ctx.fillStyle = "#e8b84a"; ctx.fillRect(Math.min(w1.x, w2.x), w1.y - 3 * S, Math.abs(w2.x - w1.x), 6 * S);
  const arm = (from, to) => {
    ctx.lineCap = "round"; ctx.strokeStyle = OUT; ctx.lineWidth = 13 * S; ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    ctx.strokeStyle = "#6ac4f4"; ctx.lineWidth = 9 * S; ctx.stroke();
    ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(lerp(from.x, to.x, .78), lerp(from.y, to.y, .78), 5.5 * S, 0, 7); ctx.fill();
  };
  const sh1 = P(22, -10), sh2 = P(-22, -10);
  if (e.done) {
    const up = P(38, -50); arm(sh1, up); arm(sh2, P(-32, 12));
    ctx.globalCompositeOperation = "lighter"; glowDot(up.x, up.y, 36 * S, "#ffffffcc", "#ffd84a88"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#fff"; for (let i = 0; i < 6; i++) { const an = time * 8 + i * 1.05; ctx.fillRect(up.x + Math.cos(an) * 20 * S - 1.5, up.y + Math.sin(an) * 20 * S - 1.5, 3, 3); }
  } else { arm(sh1, P(-9, 4)); arm(sh2, P(9, 4)); }
  const hd = P(0, -32);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hd.x, hd.y, 15.5 * S, 0, 7); ctx.fill(); ctx.fillStyle = "#8adcff"; ctx.beginPath(); ctx.arc(hd.x, hd.y, 13 * S, 0, 7); ctx.fill();
  const ch = P(5, -20); ctx.fillStyle = "#14285a"; ctx.beginPath(); ctx.moveTo(ch.x - 4 * S, ch.y - 2 * S); ctx.lineTo(ch.x + 4 * S, ch.y - 2 * S); ctx.lineTo(ch.x + d * 1 * S, ch.y + 8 * S); ctx.fill();
  ctx.fillStyle = "#fff"; for (const ex of [1, 8]) { const q = P(ex, -34); ctx.beginPath(); ctx.ellipse(q.x, q.y, 2.6 * S, 3.4 * S, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = OUT; for (const ex of [2, 9]) { const q = P(ex, -34); ctx.beginPath(); ctx.arc(q.x, q.y, 1.4 * S, 0, 7); ctx.fill(); }
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.6 * S; for (const ex of [1, 8]) { const q = P(ex, -39); ctx.beginPath(); ctx.moveTo(q.x - 3 * S, q.y + d); ctx.lineTo(q.x + 3 * S, q.y - d); ctx.stroke(); }
  const mo = P(5, -27); ctx.beginPath(); ctx.arc(mo.x, mo.y, 4.5 * S, .2, Math.PI - .2); ctx.stroke();
  const ear = P(-11, -28); ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc(ear.x, ear.y + 4 * S, 3 * S, 0, 7); ctx.stroke();
  const tb = P(0, -42);
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(tb.x, tb.y + 2 * S, 17 * S, 12 * S, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = "#7a3ab0"; ctx.beginPath(); ctx.ellipse(tb.x, tb.y + 2 * S, 15 * S, 10 * S, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#9a5ad0"; ctx.lineWidth = 2 * S; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(tb.x, tb.y + 2 * S, 15 * S, (4 + i * 2.5) * S, 0, Math.PI, 0); ctx.stroke(); }
  const j = P(3, -42);
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.quadraticCurveTo(j.x + d * 8 * S, j.y - 16 * S, j.x - d * 3 * S, j.y - 24 * S); ctx.stroke();
  ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(j.x, j.y, 4.5 * S, 0, 7); ctx.fill(); ctx.fillStyle = "#ff3a5a"; ctx.beginPath(); ctx.arc(j.x, j.y, 2.8 * S, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = "lighter"; glowDot(gx, gy, 95 * S, "#8fe3ff33", "#5ac8ff11");
  ctx.restore();
  if (rnd() < .6) particles.push({ x: gx + rnd(-30, 30), y: gy + rnd(-40, 40), vx: rnd(-20, 20), vy: rnd(-40, 0), life: .5, max: .5, color: pick(["#ffffff", "#8fe3ff", "#ffd84a"]), size: rnd(1.5, 3), g: 0, glow: true });
}
// Bloco de gelo cristalino em volta de quem está congelado.
function drawIce(f) {
  const s = f.sc, pts = [f.head, f.neck, f.pelvis, f.lh, f.rh, f.lf, f.rf, f.le, f.re, f.lk, f.rk];
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const pad = 18 * s, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + pad, ry = (y1 - y0) / 2 + pad, sd = f.iceSeed || 1, n = 11;
  const grow = clamp((time - (f.frozenAt || 0)) / .15, .2, 1), vs = [];
  for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2 + .2, j = (.86 + (Math.sin(sd * 3.7 + i * 2.3) * .5 + .5) * .2) * grow; vs.push([cx + Math.cos(an) * rx * j, cy + Math.sin(an) * ry * j]); }
  ctx.save(); ctx.globalAlpha = .9;
  ctx.beginPath(); vs.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry); g.addColorStop(0, "rgba(235,252,255,.62)"); g.addColorStop(.5, "rgba(150,220,250,.38)"); g.addColorStop(1, "rgba(60,150,220,.55)");
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(40,110,170,.85)"; ctx.lineWidth = 3.5; ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.38)"; ctx.lineWidth = 1.2; ctx.beginPath();
  for (let i = 0; i < n; i += 2) { const [x, y] = vs[i], [x2, y2] = vs[(i + 4) % n]; ctx.moveTo(x, y); ctx.lineTo(lerp(x, cx, .55), lerp(y, cy, .55)); ctx.lineTo(lerp(x2, cx, .4), lerp(y2, cy, .4)); }
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.beginPath(); ctx.ellipse(cx - rx * .45, cy - ry * .5, rx * .12, ry * .3, .5, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(cx - rx * .22, cy - ry * .64, rx * .06, ry * .14, .5, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(210,245,255,.85)";
  for (let i = 0; i < 4; i++) { const x = cx - rx * .55 + i * rx * .37, y = cy + ry * .86 * grow; ctx.beginPath(); ctx.moveTo(x - 5 * s, y - 4); ctx.lineTo(x, y + (9 + (i % 2) * 7) * s); ctx.lineTo(x + 5 * s, y - 4); ctx.fill(); }
  ctx.restore();
  if (rnd() < .2) particles.push({ x: cx + rnd(-rx, rx), y: cy + rnd(-ry, ry), vx: 0, vy: -15, life: .5, max: .5, color: "#ffffff", size: rnd(2, 3.5), g: 0, star: true });
}
// Lentidão, paixão, teia, pressa e bolha.
function drawStatus(f, hd) {
  if (!f.alive) return;
  const s = f.sc;
  if (f.slowT > 0) {
    const gy = Math.max(f.lf.y, f.rf.y) + 4;
    ctx.save(); ctx.strokeStyle = "rgba(122,184,255,.75)"; ctx.lineWidth = 2.5;
    for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(f.pelvis.x, gy, (22 + i * 9) * s, (5 + i * 2) * s, 0, time * 3 + i, time * 3 + i + 4.5); ctx.stroke(); }
    ctx.restore();
  }
  if (f.charmT > 0) for (let i = 0; i < 3; i++) { const a2 = time * 3 + i * 2.1; drawHeart(ctx, hd.x + Math.cos(a2) * 22 * s, hd.y - 30 * s + Math.sin(a2 * 2) * 5, 6 * s, "#ff4a8a"); }
  if (f.webT > 0) {
    ctx.save(); ctx.globalAlpha = Math.min(1, f.webT); ctx.strokeStyle = "#f6f6f6"; ctx.lineWidth = 1.6;
    const pts = [f.head, f.neck, f.pelvis, f.lh, f.rh, f.lk, f.rk, f.lf, f.rf];
    ctx.beginPath(); for (let i = 0; i < pts.length; i++) for (let j = i + 2; j < pts.length; j += 3) { ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); } ctx.stroke(); ctx.restore();
  }
  if (f.hasteT > 0 && Math.abs(f.pelvis.vx) > 120) {
    const d = -Math.sign(f.pelvis.vx); ctx.save(); ctx.strokeStyle = "rgba(255,233,90,.7)"; ctx.lineWidth = 2.5;
    for (let i = 0; i < 4; i++) { const y = f.neck.y + i * 18 * s, x = f.pelvis.x + d * 20 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + d * (30 + (i % 2) * 20) * s, y); ctx.stroke(); }
    ctx.restore();
  }
  if (f.trapT > 0 && f.trapKind === "bubble") {
    const cx = f.neck.x, cy = (f.head.y + f.pelvis.y) / 2 + 10 * s, r = (62 + Math.sin(time * 7) * 3) * s;
    const g = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,.25)"); g.addColorStop(.75, "rgba(160,220,255,.15)"); g.addColorStop(1, "rgba(255,140,240,.45)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(210,245,255,.85)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.beginPath(); ctx.ellipse(cx - r * .45, cy - r * .45, r * .2, r * .09, -.7, 0, 7); ctx.fill();
  }
}
// Ovelha fofinha (Varinha da Ovelha), com a fitinha na cor do jogador.
function drawSheep(f) {
  const s = f.sc, x = f.pelvis.x, y = f.pelvis.y + 16 * s, d = f.facing || 1, bob = Math.abs(Math.sin(f.walk * 2)) * 3;
  ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 5 * s; ctx.lineCap = "round";
  for (const lx of [-14, -5, 6, 15]) { ctx.beginPath(); ctx.moveTo(x + lx * s, y); ctx.lineTo(x + lx * s + Math.sin(f.walk * 3 + lx) * 3, y + 26 * s); ctx.stroke(); }
  const wool = [[-14, -4, 13], [0, -11, 14], [14, -4, 13], [-6, 5, 12], [8, 5, 12], [0, -2, 14]];
  ctx.fillStyle = OUT; for (const [dx, dy, r] of wool) { ctx.beginPath(); ctx.arc(x + dx * s, y - bob + dy * s, (r + 2.5) * s, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#f6f3ea"; for (const [dx, dy, r] of wool) { ctx.beginPath(); ctx.arc(x + dx * s, y - bob + dy * s, r * s, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(x - 4 * s, y - bob - 14 * s, 6 * s, 0, 7); ctx.fill();
  const hx = x + d * 24 * s, hy = y - bob - 10 * s;
  ctx.fillStyle = "#2a2a2a"; ctx.beginPath(); ctx.ellipse(hx, hy, 10 * s, 8 * s, d * .3, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx - d * 7 * s, hy - 5 * s, 6 * s, 2.6 * s, -d * .5, 0, 7); ctx.fill();
  ctx.fillStyle = "#f6f3ea"; ctx.beginPath(); ctx.arc(hx - d * 2 * s, hy - 7 * s, 4.5 * s, 0, 7); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(hx + d * 4 * s, hy - 2 * s, 2.2 * s, 0, 7); ctx.fill(); ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(hx + d * 4.6 * s, hy - 2 * s, 1.1 * s, 0, 7); ctx.fill();
  ctx.fillStyle = f.color; ctx.beginPath(); ctx.moveTo(x + d * 12 * s, y - bob - 6 * s); ctx.lineTo(x + d * 6 * s, y - bob - 12 * s); ctx.lineTo(x + d * 6 * s, y - bob); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + d * 12 * s, y - bob - 6 * s); ctx.lineTo(x + d * 18 * s, y - bob - 12 * s); ctx.lineTo(x + d * 18 * s, y - bob); ctx.fill();
}
// Ratinho elétrico que sai da bola de captura.
// ───────────────────────── Bichinhos da bola de captura ─────────────────────────
// Desenhados olhando pra direita, com o chão em y = 0 (o espelho vira pro outro lado).
function pkEll(x, y, rx, ry, rot, light, dark) {
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(x, y, rx + 2, ry + 2, rot, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(x - rx * .35, y - ry * .45, Math.min(rx, ry) * .1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, light); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill();
}
function pkEye(x, y, r, blink, iris) {
  if (blink) { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x - r, y); ctx.quadraticCurveTo(x, y + r * .7, x + r, y); ctx.stroke(); return; }
  ctx.fillStyle = "#14100c"; ctx.beginPath(); ctx.ellipse(x, y, r * .85, r * 1.15, 0, 0, 7); ctx.fill();
  if (iris) { ctx.fillStyle = iris; ctx.beginPath(); ctx.ellipse(x, y + r * .4, r * .55, r * .55, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + r * .2, y - r * .45, r * .4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * .25, y + r * .5, r * .16, 0, 7); ctx.fill();
}
// Orelha em forma de folha; a ponta (a partir de tipK) fica com outra cor.
function pkEar(bx, by, tx, ty, w, light, dark, tipCol, tipK) {
  const dx = tx - bx, dy = ty - by, l = hyp(dx, dy), nx = -dy / l, ny = dx / l, mx = bx + dx * .5, my = by + dy * .5;
  ctx.beginPath(); ctx.moveTo(bx + nx * w, by + ny * w); ctx.quadraticCurveTo(mx + nx * w * 1.3, my + ny * w * 1.3, tx, ty);
  ctx.quadraticCurveTo(mx - nx * w * 1.3, my - ny * w * 1.3, bx - nx * w, by - ny * w); ctx.closePath();
  ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.save(); ctx.clip();
  ctx.fillStyle = tipCol; ctx.fillRect(Math.min(bx, tx) - 40, Math.min(by, ty) - 40, Math.abs(dx) + 80, Math.abs(dy) + 80);
  const cx = bx + dx * tipK, cy = by + dy * tipK, g = ctx.createLinearGradient(bx, by, cx, cy); g.addColorStop(0, dark); g.addColorStop(1, light);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx + nx * 60, cy + ny * 60); ctx.lineTo(cx - nx * 60, cy - ny * 60); ctx.lineTo(bx - nx * 60 - dx, by - ny * 60 - dy); ctx.lineTo(bx + nx * 60 - dx, by + ny * 60 - dy); ctx.fill();
  ctx.restore();
}
function pkFlame(x, y, h, w, c) {
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - h);
  ctx.quadraticCurveTo(x + w * 1.2, y - h * .35, x + w, y - w * .2); ctx.arc(x, y - w * .2, w, 0, Math.PI); ctx.quadraticCurveTo(x - w * 1.2, y - h * .35, x, y - h); ctx.fill();
}
function drawPikachu(e, blink) {
  // Rabo em raio (com a base marrom).
  const tp = [[-12, -14], [-24, -22], [-18, -30], [-32, -42], [-24, -46], [-38, -62], [-14, -47], [-20, -40], [-8, -30], [-12, -24]];
  ctx.beginPath(); tp.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = OUT; ctx.stroke();
  let g = ctx.createLinearGradient(-10, -18, -36, -60); g.addColorStop(0, "#e8b020"); g.addColorStop(1, "#fff38a");
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = "#9a6028"; ctx.beginPath(); ctx.arc(-12, -19, 7.5, 0, 7); ctx.fill(); ctx.restore();
  pkEll(-6, -2.5, 7, 3.5, 0, "#f0c040", "#c89018");
  pkEll(0, -18, 14, 16, 0, "#fff38a", "#e8a818");
  ctx.strokeStyle = "#9a6028"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  for (const y of [-26, -20]) { ctx.beginPath(); ctx.moveTo(-13, y); ctx.quadraticCurveTo(-9, y - 2, -6, y + 1); ctx.stroke(); }
  pkEll(9, -2.5, 7, 3.5, 0, "#fff38a", "#e0a818");
  pkEll(11, -21, 4, 6, .6, "#fff38a", "#e8b020");
  pkEar(-3, -50, -17, -82, 6, "#fff38a", "#eab020", "#1a1612", .62);
  pkEar(10, -52, 22, -83, 6, "#fff38a", "#eab020", "#1a1612", .62);
  pkEll(4, -41, 17, 14.5, 0, "#fff6a0", "#eab020");
  pkEye(0, -45, 3.3, blink); pkEye(12, -45, 3.5, blink);
  ctx.fillStyle = "#1a1612"; ctx.beginPath(); ctx.arc(8, -41, 1.2, 0, 7); ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(6, -38.5, 2, .2, Math.PI - .2); ctx.stroke(); ctx.beginPath(); ctx.arc(10, -38.5, 2, .2, Math.PI - .2); ctx.stroke();
  for (const [x, y, r] of [[-6, -37, 4.5], [17.5, -36, 3.6]]) {
    g = ctx.createRadialGradient(x - 1, y - 1, .5, x, y, r); g.addColorStop(0, "#ff8a7a"); g.addColorStop(1, "#d8282a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * .85, 0, 0, 7); ctx.fill();
  }
  if (e.zapFx > 0 || rnd() < .08) {
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#fff6a0"; ctx.lineWidth = 1.8;
    for (const [x, y] of [[-6, -37], [17.5, -36]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rnd(-10, 10), y + rnd(-10, 10)); ctx.lineTo(x + rnd(-16, 16), y + rnd(-16, 16)); ctx.stroke(); }
    ctx.restore();
  }
}
function drawCharmander(e, blink) {
  // Rabo curvado com a chama na ponta.
  ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.quadraticCurveTo(-30, -10, -31, -32);
  ctx.strokeStyle = OUT; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = "#f08838"; ctx.lineWidth = 6.5; ctx.stroke();
  const fl = 1 + Math.sin(time * 23 + e.blink) * .13 + (e.zapFx > 0 ? .35 : 0);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(-31, -40, 22 * fl, "#ffd84a88", "#ff6a1a33"); ctx.restore();
  pkFlame(-31, -33, 22 * fl, 7 * fl, "#ff4a1a"); pkFlame(-31, -33, 16 * fl, 5 * fl, "#ffa020"); pkFlame(-31, -33, 9 * fl, 3 * fl, "#fff27a");
  pkEll(-5, -6, 6, 7, 0, "#f89850", "#d0601a");
  pkEll(0, -20, 13, 15, 0, "#ffb070", "#e86818");
  let g = ctx.createRadialGradient(4, -20, 1, 5, -17, 11); g.addColorStop(0, "#fff6c8"); g.addColorStop(1, "#f0d080");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(5, -16, 7.5, 10.5, 0, 0, 7); ctx.fill();
  pkEll(7, -6, 6, 7, 0, "#ffb070", "#e06818");
  ctx.fillStyle = "#fff"; for (const [x, y] of [[12, -2], [13, -5]]) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill(); }
  pkEll(12, -25, 4, 6.5, .5, "#ffb070", "#e86818");
  // Cabeça com focinho: contorno dos dois antes de pintar, pra não ficar risco no meio.
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(4, -44, 18, 16.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, -40, 11, 9.5, 0, 0, 7); ctx.fill();
  g = ctx.createRadialGradient(-2, -52, 2, 6, -43, 22); g.addColorStop(0, "#ffc890"); g.addColorStop(1, "#e86818");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(4, -44, 16, 14.5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(15, -40, 9, 7.5, 0, 0, 7); ctx.fill();
  pkEye(6, -48, 4.2, blink, "#2a7a9a"); pkEye(17, -47, 3.7, blink, "#2a7a9a");
  ctx.fillStyle = "#4a2010"; ctx.beginPath(); ctx.arc(22, -42, 1, 0, 7); ctx.fill();
  if (e.zapFx > 0) { ctx.fillStyle = "#5a1a10"; ctx.beginPath(); ctx.ellipse(20, -36, 4, 3, 0, 0, 7); ctx.fill(); }
  else { ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, -37); ctx.quadraticCurveTo(17, -34, 22, -37.5); ctx.stroke(); }
}
function drawSquirtle(e, blink) {
  if (e.shellT > 0) {
    // Escondido no casco, girando.
    ctx.save(); ctx.translate(0, -15); ctx.rotate(e.spin || 0);
    pkEll(0, 0, 17, 15, 0, "#e8a058", "#8a4a1a");
    ctx.strokeStyle = "#f8e0a0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 14.5, 12.5, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = "#6a3a12"; ctx.lineWidth = 1.6;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 11); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = "#bff0ff99"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-22 - i * 6, -24 + i * 9); ctx.lineTo(-40 - i * 8, -24 + i * 9); ctx.stroke(); }
    return;
  }
  pkEll(-16, -13, 8, 7.5, 0, "#b8eeff", "#3a9ad8");
  ctx.strokeStyle = "#2a7ab8"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(-16, -13, 4, .3, 5); ctx.stroke();
  pkEll(-5, -22, 13.5, 16.5, -.1, "#e8a058", "#8a4a1a");
  ctx.strokeStyle = "#f8e0a0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-5, -22, 12, 15, -.1, -1.3, 1.5); ctx.stroke();
  pkEll(-3, -5, 5.5, 6, 0, "#b8eeff", "#3a9ad8");
  pkEll(5, -21, 10, 13.5, 0, "#fff3b0", "#e0b850");
  ctx.save(); ctx.beginPath(); ctx.ellipse(5, -21, 10, 13.5, 0, 0, 7); ctx.clip();
  ctx.strokeStyle = "#c09040"; ctx.lineWidth = 1.4; for (const y of [-27, -21, -15]) { ctx.beginPath(); ctx.moveTo(-6, y); ctx.lineTo(16, y + 1); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(5, -35); ctx.lineTo(5, -8); ctx.stroke(); ctx.restore();
  pkEll(9, -5, 5.5, 6, 0, "#b8eeff", "#3a9ad8");
  pkEll(13, -26, 4.5, 6.5, .5, "#b8eeff", "#3a9ad8");
  pkEll(7, -44, 16, 14, 0, "#c0f0ff", "#3a9ad8");
  pkEye(9, -47, 4.3, blink, "#8a3a2a"); pkEye(19, -46, 3.7, blink, "#8a3a2a");
  if (e.zapFx > 0) { ctx.fillStyle = "#3a1a20"; ctx.beginPath(); ctx.ellipse(20, -37, 3.5, 3, 0, 0, 7); ctx.fill(); }
  else { ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, -38); ctx.quadraticCurveTo(17, -35, 22, -38); ctx.stroke(); }
}
function drawBulbasaur(e, blink) {
  // Quatro patas, corpo verde-água com manchas e o bulbo nas costas.
  const L = "#9af0c8", D = "#2f9a78";
  pkEll(-14, -6, 5.5, 7, 0, "#7ad8b0", "#24806a"); pkEll(8, -6, 5.5, 7, 0, "#7ad8b0", "#24806a");
  pkEll(-2, -17, 19, 12, 0, L, D);
  ctx.fillStyle = "#24806a"; for (const [x, y, rx] of [[-12, -18, 3.5], [-4, -12, 2.6], [4, -20, 2.4]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .75, 0, 0, 7); ctx.fill(); }
  // Bulbo com gomos e uma folhinha no topo.
  const sway = Math.sin(time * 3 + e.blink) * .06;
  ctx.save(); ctx.translate(-8, -27); ctx.rotate(sway);
  pkEll(0, -6, 14, 12.5, -.15, "#9af07a", "#2a8a3a");
  ctx.strokeStyle = "#1f6a2a"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  for (const k of [-.55, 0, .55]) { ctx.beginPath(); ctx.moveTo(k * 4, -18); ctx.quadraticCurveTo(k * 18, -6, k * 9, 6); ctx.stroke(); }
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(1, -20, 3.5, 6, .5, 0, 7); ctx.fill(); ctx.fillStyle = "#7ad85a"; ctx.beginPath(); ctx.ellipse(1, -20, 2.2, 4.6, .5, 0, 7); ctx.fill();
  ctx.restore();
  // Cabeça com orelhinhas.
  for (const [bx, tx] of [[5, 2], [16, 20]]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(bx - 5, -36); ctx.lineTo(tx, -45); ctx.lineTo(bx + 5, -36); ctx.fill(); ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(bx - 3, -36); ctx.lineTo(tx, -42.5); ctx.lineTo(bx + 3, -36); ctx.fill(); }
  pkEll(12, -27, 15, 12, 0, "#b0ffe0", D);
  ctx.fillStyle = "#24806a"; ctx.beginPath(); ctx.ellipse(8, -35, 3, 2, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(14, -36.5, 2, 1.5, 0, 0, 7); ctx.fill();
  pkEye(11, -29, 4, blink, "#c83a3a"); pkEye(21, -28, 3.4, blink, "#c83a3a");
  if (e.zapFx > 0) { ctx.fillStyle = "#5a1a20"; ctx.beginPath(); ctx.ellipse(19, -20, 5, 3, 0, 0, Math.PI); ctx.fill(); }
  else { ctx.strokeStyle = OUT; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(12, -21); ctx.quadraticCurveTo(19, -17, 25, -21.5); ctx.stroke(); }
  pkEll(-10, -5, 5.5, 7, 0, L, D); pkEll(13, -5, 5.5, 7, 0, L, D);
  ctx.fillStyle = "#fff"; for (const x of [16, 18]) { ctx.beginPath(); ctx.arc(x, -1, 1.1, 0, 7); ctx.fill(); }
}
function drawPika(e) {
  const t = e.t, appear = t < .45 ? t / .45 : 1, leave = t > e.life - .3 ? clamp((e.life - t) / .3, 0, 1) : 1;
  const pop = appear < 1 ? Math.max(0, 1 + 2.2 * Math.pow(appear - 1, 3) + 1.2 * Math.pow(appear - 1, 2)) : 1;
  const S = Math.max(.02, 1.4 * pop * leave), d = e.dir, bob = e.shellT > 0 ? 0 : Math.abs(Math.sin(e.hop)) * 6;
  ctx.save(); ctx.globalCompositeOperation = "source-over";
  // Bola aberta no chão enquanto ele sai.
  if (t < .8) {
    const bx = e.x - d * 30, by = e.y - 9, k = clamp((.8 - t) / .3, 0, 1);
    ctx.globalAlpha = k;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#f6f6f6"; ctx.beginPath(); ctx.arc(bx, by, 8.5, 0, Math.PI); ctx.fill();
    ctx.save(); ctx.translate(bx - d * 9, by); ctx.rotate(-d * 1.1); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(d * 9, 0, 10, Math.PI, 0); ctx.fill(); ctx.fillStyle = "#e83a3a"; ctx.beginPath(); ctx.arc(d * 9, 0, 8.5, Math.PI, 0); ctx.fill(); ctx.restore();
    if (t < .45) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - appear; glowDot(bx, by - 6, 40, "#ffffff", "#ff8a8a66"); ctx.globalCompositeOperation = "source-over"; }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(e.x, e.y, 22 * S, 5 * S, 0, 0, 7); ctx.fill();
  if (e.zapFx > 0 && e.kind === "pika") { ctx.globalCompositeOperation = "lighter"; glowDot(e.x, e.y - 30 * S, 60 * S, "#fff6b0cc", "#ffe95a55"); ctx.globalCompositeOperation = "source-over"; }
  ctx.translate(e.x, e.y - bob); ctx.scale(d * S, S);
  const blink = e.blink < 0;
  if (e.kind === "char") drawCharmander(e, blink); else if (e.kind === "squirt") drawSquirtle(e, blink); else if (e.kind === "bulba") drawBulbasaur(e, blink); else drawPikachu(e, blink);
  ctx.restore();
  // Brilho branco de quando sai da bola / volta pra ela.
  if (appear < 1 || leave < 1) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = appear < 1 ? 1 - appear : 1 - leave; glowDot(e.x, e.y - 30, 55, "#ffffff", "#ff6a6a55"); ctx.restore(); }
}

// Sombra no chão embaixo de cada lutador (menor e mais clara quanto mais alto ele está).
function drawGroundShadow(f) {
  const x = f.pelvis.x, gy = surfaceBelow(x, Math.max(f.lf.y, f.rf.y) - 6, false), h = Math.max(0, gy - Math.max(f.lf.y, f.rf.y));
  const k = clamp(1 - h / 420, .15, 1), s = f.sc;
  ctx.fillStyle = `rgba(0,0,0,${.32 * k})`; ctx.beginPath(); ctx.ellipse(x, gy + 2, 30 * s * (.5 + k * .5), 7 * s * (.5 + k * .5), 0, 0, 7); ctx.fill();
}
// ───────────────────────── Especial: aura e cena ─────────────────────────
// Mira da Bomba Gigante: pontinhos mostrando o arco e o tamanho da explosão onde ela cai.
// Mira de arremesso: pontinhos no caminho e a área da explosão onde a bomba vai parar.
function drawThrowAim(x, y, vx, vy, land, R, dot = 5) {
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const py = y; vy += 900 * .035; x = clamp(x + vx * .035, WALL_L + 10, WALL_R - 10); y += vy * .035;
    const gy = surfaceBelow(x, py - 1, false);
    if (vy >= 0 && y >= gy - land) { y = gy; break; }
    if (i % 2 === 0) { ctx.fillStyle = `rgba(255,255,255,${.9 - i * .01})`; ctx.beginPath(); ctx.arc(x, y, dot, 0, 7); ctx.fill(); }
  }
  ctx.strokeStyle = "#ff5a3a"; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -time * 40;
  ctx.beginPath(); ctx.ellipse(x, y - 4, R, Math.max(14, R * .14), 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = "#ff5a3a1c"; ctx.fill();
  ctx.restore();
}
function drawMegaAim(f) {
  const m = megaAim(f), R = { normal: 185, terra: 170, ar: 200, buraco: 120, energia: 175 }[BOMB_TYPES[f.bombT || 0].id] * 2.3;
  drawThrowAim(f.neck.x, f.head.y - 75, Math.cos(m.ang) * m.sp, Math.sin(m.ang) * m.sp, 55, R);
}
// Bomba normal: enquanto segura o ATACAR mostra a barra de força e o arco até onde a bomba vai cair.
function drawBombAim(f) {
  const inp = f.pl.input, pw = inp.powHeld ? bombPower(inp) : .45, a = f.aim, sx = Math.cos(a) >= 0 ? 1 : -1;
  const sp = 220 + 640 * pw, ang = a - .3 * sx, R = { normal: 185, terra: 170, ar: 200, buraco: 120, energia: 175 }[BOMB_TYPES[f.bombT || 0].id];
  drawThrowAim(f.rh.x + Math.cos(a) * 24, f.rh.y + Math.sin(a) * 24, Math.cos(ang) * sp, Math.sin(ang) * sp, 16, R, 4);
  if (!inp.powHeld) return;
  // Barra de força em cima da cabeça (verde → amarelo → vermelho).
  const x = f.head.x, y = f.head.y - 100 * f.sc, w = 120;
  ctx.save();
  ctx.fillStyle = OUT; roundRect(ctx, x - w / 2 - 4, y - 4, w + 8, 22, 11); ctx.fill();
  ctx.fillStyle = "#2a1a14"; roundRect(ctx, x - w / 2, y, w, 14, 7); ctx.fill();
  const gp = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); gp.addColorStop(0, "#5aff6a"); gp.addColorStop(.55, "#ffe95a"); gp.addColorStop(1, "#ff3a2a");
  ctx.save(); roundRect(ctx, x - w / 2, y, w, 14, 7); ctx.clip(); ctx.fillStyle = gp; ctx.fillRect(x - w / 2, y, w * pw, 14); ctx.fillStyle = "#ffffff55"; ctx.fillRect(x - w / 2, y + 2, w * pw, 3); ctx.restore();
  ctx.fillStyle = "#fff"; ctx.fillRect(x - w / 2 + w * pw - 1.5, y - 3, 3, 20);
  textShadow(`💣 FORÇA ${Math.round(pw * 100)}%`, x, y - 10, "#f3e6c8", "bold 17px Georgia");
  ctx.restore();
}
function drawSpAura(f) {
  const s = f.sc, pulse = .75 + Math.sin(time * 9) * .25;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 7; i++) {
    const ph = time * 8 + i * 1.4, bx = f.pelvis.x + (i - 3) * 9 * s, by = f.pelvis.y + 46 * s, h = (115 + Math.sin(ph) * 25) * s;
    const g = ctx.createLinearGradient(0, by, 0, by - h); g.addColorStop(0, f.color + "00"); g.addColorStop(.35, f.color + "70"); g.addColorStop(1, f.color + "00");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 12 * s, by); ctx.quadraticCurveTo(bx + Math.sin(ph) * 10, by - h * .6, bx + Math.sin(ph * 1.3) * 8, by - h); ctx.quadraticCurveTo(bx + 4, by - h * .5, bx + 12 * s, by); ctx.fill();
  }
  glowDot(f.neck.x, f.neck.y + 15 * s, 78 * s * pulse, f.color + "40", f.color + "00");
  ctx.restore();
}
// Cena curta do especial: o jogo congela, faixa diagonal com o personagem grande e o nome do golpe.
function drawCutin() {
  const c = cutin, t = c.t, f = c.f, col = f.color;
  const k = easeOut(Math.min(1, t / .18)), out = t > c.dur - .16 ? (t - (c.dur - .16)) / .16 : 0, a = clamp(1 - out, 0, 1);
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${.55 * a})`; ctx.fillRect(0, 0, W, H);
  const y0 = 290, h = 290, slide = (1 - k) * W * 1.1 - out * W * 1.1;
  ctx.translate(slide, 0); ctx.globalAlpha = a;
  ctx.beginPath(); ctx.moveTo(-50, y0 + 70); ctx.lineTo(W + 50, y0 - 50); ctx.lineTo(W + 50, y0 + h - 50); ctx.lineTo(-50, y0 + h + 70); ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, lookShade(col, -.7)); g.addColorStop(.45, lookShade(col, -.15)); g.addColorStop(1, lookShade(col, -.7));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  for (let i = 0; i < 28; i++) {
    const yy = y0 - 50 + ((i * 59) % (h + 120)), xx = (((i * 211 - t * 2600) % (W + 500)) + W + 500) % (W + 500) - 250;
    ctx.fillStyle = i % 3 ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.45)"; ctx.fillRect(xx, yy, 160 + (i % 4) * 70, i % 3 ? 2 : 4);
  }
  ctx.globalCompositeOperation = "lighter"; glowDot(330, y0 + 110, 260, col + "88", col + "00"); ctx.globalCompositeOperation = "source-over";
  drawLookPreview(ctx, { color: col, hat: f.hat, outfit: f.outfit }, 330, y0 + 268, 3.2, t * 4);
  ctx.restore();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-50, y0 + 70); ctx.lineTo(W + 50, y0 - 50); ctx.moveTo(-50, y0 + h + 70); ctx.lineTo(W + 50, y0 + h - 50); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-50, y0 + 82); ctx.lineTo(W + 50, y0 - 38); ctx.moveTo(-50, y0 + h + 58); ctx.lineTo(W + 50, y0 + h - 62); ctx.stroke();
  const tx = W * .63, ty = y0 + 135, pop = 1 + Math.max(0, .25 - t) * 1.6;
  ctx.save(); ctx.translate(tx, ty); ctx.scale(pop, pop); ctx.rotate(-.07);
  textShadow("★ ESPECIAL ★", 0, -62, "#ffe9a0", "bold 30px Georgia");
  ctx.font = "bold 70px Georgia"; ctx.textAlign = "center"; ctx.lineJoin = "round";
  ctx.lineWidth = 12; ctx.strokeStyle = "#000"; ctx.strokeText(c.name.toUpperCase(), 0, 10, 860);
  ctx.fillStyle = "#ffffff"; ctx.fillText(c.name.toUpperCase(), 0, 10, 860);
  textShadow(`${f.pl.name} · ${f.w.name}`, 0, 62, "#ffe9a0", "600 28px Georgia");
  ctx.restore();
  ctx.restore();
  if (t < .09) { ctx.fillStyle = `rgba(255,255,255,${1 - t / .09})`; ctx.fillRect(0, 0, W, H); }
}

// ───────────────────────── Kit de Construção: desenhos ─────────────────────────
function drawTNT(c, x, y, s) {
  c.fillStyle = OUT; c.fillRect(x - 2, y - 2, s + 4, s + 4);
  c.fillStyle = "#d8322a"; c.fillRect(x, y, s, s);
  c.fillStyle = "#b8221a"; for (let i = 0; i < 4; i++) c.fillRect(x + i * s / 4 + s / 8 - s * .03, y, s * .06, s);
  c.fillStyle = "#f4f0e8"; c.fillRect(x, y + s * .34, s, s * .32);
  c.fillStyle = "#1a1a1a"; c.font = `bold ${Math.round(s * .26)}px Arial`; c.textAlign = "center"; c.fillText("TNT", x + s / 2, y + s * .59);
  c.fillStyle = "#6a6a6a"; c.fillRect(x + s * .42, y - s * .12, s * .16, s * .14);
}
function drawMinecart(c, x, y, s, wheel = 0) {
  // (x, y) = centro do carrinho; s = largura
  const w = s, h = s * .55;
  c.fillStyle = OUT; c.beginPath(); c.moveTo(x - w / 2 - 2, y - h / 2 - 2); c.lineTo(x + w / 2 + 2, y - h / 2 - 2); c.lineTo(x + w * .38 + 2, y + h / 2 + 2); c.lineTo(x - w * .38 - 2, y + h / 2 + 2); c.closePath(); c.fill();
  const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, "#b8c0c8"); g.addColorStop(1, "#5a6068");
  c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, y - h / 2); c.lineTo(x + w / 2, y - h / 2); c.lineTo(x + w * .38, y + h / 2); c.lineTo(x - w * .38, y + h / 2); c.closePath(); c.fill();
  c.fillStyle = "#3a3f46"; c.fillRect(x - w / 2, y - h / 2, w, h * .16);
  c.strokeStyle = "#7a8088"; c.lineWidth = 1.5; for (const k of [-.2, .2]) { c.beginPath(); c.moveTo(x + k * w, y - h * .3); c.lineTo(x + k * w * .8, y + h * .45); c.stroke(); }
  for (const k of [-.27, .27]) {
    const wx = x + k * w, wy = y + h / 2 + s * .04, r = s * .13;
    c.fillStyle = OUT; c.beginPath(); c.arc(wx, wy, r + 1.5, 0, 7); c.fill(); c.fillStyle = "#4a4f56"; c.beginPath(); c.arc(wx, wy, r, 0, 7); c.fill();
    c.strokeStyle = "#9aa3ab"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(wx + Math.cos(wheel) * r, wy + Math.sin(wheel) * r); c.lineTo(wx - Math.cos(wheel) * r, wy - Math.sin(wheel) * r); c.stroke();
  }
}
// Fantasma do bloco/TNT onde vai ser colocado (só pra quem está jogando).
function drawMcGhost(f) {
  const it = MC_ITEMS[f.mcT || 0].id; if (it === "carrinho") return;
  const c = mcCell(f);
  ctx.save(); ctx.globalAlpha = .35 + Math.sin(time * 6) * .1;
  if (it === "tnt") drawTNT(ctx, c.x, c.y, 50); else drawGrassBlock(ctx, c.x, c.y, 50);
  ctx.globalAlpha = .9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -time * 20; ctx.strokeRect(c.x, c.y, 50, 50); ctx.setLineDash([]);
  ctx.restore();
}

// ───────────────────────── Corrida da Morte: cenário ─────────────────────────
const rhash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
function drawDeadTree(x, base, s) {
  ctx.strokeStyle = "#160610"; ctx.lineCap = "round";
  ctx.lineWidth = 10 * s; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + 6 * s, base - 150 * s); ctx.stroke();
  ctx.lineWidth = 5 * s;
  for (const [y, dx, dy] of [[-90, -50, -40], [-120, 45, -35], [-145, -25, -45], [-60, 40, -25]]) { ctx.beginPath(); ctx.moveTo(x + 3 * s, base + y * s); ctx.lineTo(x + dx * s, base + (y + dy) * s); ctx.stroke(); }
}
// Morros em parallax (off = quanto o cenário já andou nessa camada).
function raceHills(off, base, amp, col, f1, f2, top = FLOOR) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, top);
  for (let x = 0; x <= W; x += 20) { const wx = x + off; ctx.lineTo(x, base + Math.sin(wx * f1) * amp + Math.sin(wx * f2 + 1.7) * amp * .45); }
  ctx.lineTo(W, top); ctx.fill();
}
// Repete um enfeite a cada "sp" pixels numa camada de parallax.
function raceEach(off, sp, fn) { for (let i = -1; i < W / sp + 2; i++) { const n = Math.floor(off / sp) + i; fn(n * sp - off + rhash(n) * sp * .35, n); } }
function raceSky(c0, c1, c2) { const g = ctx.createLinearGradient(0, 0, 0, FLOOR); g.addColorStop(0, c0); g.addColorStop(.55, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
function raceMoon(x, y, r, col, glow) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(x, y, r * 3.2, glow, "#00000000"); ctx.restore();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = "#00000018"; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .2, r * .2, 0, 7); ctx.arc(x + r * .35, y + r * .3, r * .14, 0, 7); ctx.fill();
}
const RACE_PAINT = {
  cemiterio(d) {
    raceSky("#12061a", "#4a1030", "#d8582a");
    raceMoon(1200, 170, 64, "#ffc8a0", "#ff8a6a55");
    raceHills(d * .12, 520, 70, "#2a0c22", .0035, .009);
    // Cerca de ferro ao longe.
    ctx.fillStyle = "#1e0818"; const fo = d * .3;
    for (let x = -(fo % 26); x < W; x += 26) { ctx.fillRect(x, 600, 4, 90); ctx.beginPath(); ctx.moveTo(x - 3, 602); ctx.lineTo(x + 2, 590); ctx.lineTo(x + 7, 602); ctx.fill(); }
    ctx.fillRect(0, 618, W, 4); ctx.fillRect(0, 668, W, 4);
    raceHills(d * .3, 650, 30, "#3a1226", .006, .017);
    raceEach(d * .55, 330, (x, n) => drawDeadTree(x, FLOOR - 10 + rhash(n + 7) * 20, .7 + rhash(n + 3) * .5));
    // Névoa rasteira.
    const fg = ctx.createLinearGradient(0, FLOOR - 120, 0, FLOOR); fg.addColorStop(0, "rgba(200,170,220,0)"); fg.addColorStop(1, "rgba(200,170,220,.22)");
    ctx.fillStyle = fg; ctx.fillRect(0, FLOOR - 120, W, 120);
    ctx.fillStyle = "#24140f"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#4a2c1c"; ctx.fillRect(0, FLOOR, W, 9);
    for (let x = -(d % 80); x < W; x += 80) { ctx.fillStyle = "#1a0e0a"; ctx.fillRect(x, FLOOR + 12, 3, 90); }
    raceEach(d, 520, (x, n) => {
      if (rhash(n + 5) < .5) { ctx.fillStyle = "#3a3440"; ctx.beginPath(); ctx.moveTo(x - 14, FLOOR); ctx.lineTo(x - 14, FLOOR - 30); ctx.arc(x, FLOOR - 30, 14, Math.PI, 0); ctx.lineTo(x + 14, FLOOR); ctx.fill(); ctx.fillStyle = "#24202a"; ctx.fillRect(x - 2, FLOOR - 36, 4, 18); ctx.fillRect(x - 7, FLOOR - 31, 14, 4); }
      else { ctx.fillStyle = "#2e2834"; ctx.fillRect(x - 3, FLOOR - 46, 6, 46); ctx.fillRect(x - 13, FLOOR - 36, 26, 6); }
    });
  },
  floresta(d) {
    raceSky("#030d10", "#0b2a2a", "#2a5a46");
    raceMoon(300, 150, 52, "#e8fff0", "#9affd044");
    // Pinheiros ao longe e mais perto.
    const pines = (off, sp, base, h, col) => { ctx.fillStyle = col; raceEach(off, sp, (x, n) => { const hh = h * (.7 + rhash(n + 2) * .6); ctx.beginPath(); ctx.moveTo(x - hh * .28, base); ctx.lineTo(x, base - hh); ctx.lineTo(x + hh * .28, base); ctx.fill(); }); ctx.fillRect(0, base - 2, W, FLOOR - base + 2); };
    pines(d * .1, 60, 600, 190, "#0c2622"); pines(d * .25, 85, 680, 230, "#081a18");
    // Vagalumes.
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) { const x = ((i * 173 - d * .45) % W + W) % W, y = 380 + (i * 97 % 330) + Math.sin(time * 1.6 + i) * 18, a = .5 + Math.sin(time * 3 + i * 2) * .5; glowDot(x, y, 10, `rgba(220,255,120,${a})`, "#96ff5000"); }
    ctx.restore();
    // Árvores retorcidas na frente, com cipós.
    raceEach(d * .6, 420, (x, n) => {
      const s = .9 + rhash(n + 4) * .5; ctx.strokeStyle = "#040d0c"; ctx.lineCap = "round";
      ctx.lineWidth = 22 * s; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.quadraticCurveTo(x + 30 * s, FLOOR - 160 * s, x - 10 * s, FLOOR - 320 * s); ctx.stroke();
      ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(x + 8 * s, FLOOR - 220 * s); ctx.quadraticCurveTo(x + 80 * s, FLOOR - 270 * s, x + 130 * s, FLOOR - 250 * s); ctx.stroke();
      ctx.strokeStyle = "#0c2a1c"; ctx.lineWidth = 3; for (let j = 0; j < 3; j++) { const vx = x + (40 + j * 35) * s, vy = FLOOR - (255 - j * 6) * s; ctx.beginPath(); ctx.moveTo(vx, vy); ctx.quadraticCurveTo(vx + 6, vy + 50, vx + Math.sin(time + j + n) * 8, vy + 90 + j * 20); ctx.stroke(); }
    });
    const fg = ctx.createLinearGradient(0, FLOOR - 140, 0, FLOOR); fg.addColorStop(0, "rgba(140,220,180,0)"); fg.addColorStop(1, "rgba(140,220,180,.18)");
    ctx.fillStyle = fg; ctx.fillRect(0, FLOOR - 140, W, 140);
    ctx.fillStyle = "#0e1c14"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#2a5a3a"; ctx.fillRect(0, FLOOR, W, 8);
    ctx.fillStyle = "#3a7a4a"; for (let x = -(d % 14); x < W; x += 14) { ctx.beginPath(); ctx.moveTo(x, FLOOR + 2); ctx.lineTo(x + 4, FLOOR - 8 - (Math.floor((x + d) / 14) % 3) * 3); ctx.lineTo(x + 8, FLOOR + 2); ctx.fill(); }
    // Cogumelos brilhando no chão.
    raceEach(d, 380, (x, n) => { if (rhash(n + 9) < .6) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(x, FLOOR - 10, 26, "#5affd855", "#5affd800"); ctx.restore(); ctx.fillStyle = "#d8f0e0"; ctx.fillRect(x - 2, FLOOR - 10, 4, 10); ctx.fillStyle = "#5affd8"; ctx.beginPath(); ctx.ellipse(x, FLOOR - 11, 9, 6, 0, Math.PI, 0); ctx.fill(); } });
  },
  vulcao(d) {
    raceSky("#1a0402", "#5a1206", "#ff6a1a");
    // Vulcão ao longe soltando lava e fumaça.
    raceEach(d * .06, 1900, (x) => {
      ctx.fillStyle = "#2a0804"; ctx.beginPath(); ctx.moveTo(x - 420, 640); ctx.lineTo(x - 70, 300); ctx.lineTo(x + 70, 300); ctx.lineTo(x + 420, 640); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(x, 300, 150, "#ff8a2a88", "#ff3a0a00");
      ctx.strokeStyle = "#ff7a1acc"; ctx.lineWidth = 6; ctx.lineCap = "round";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * 30, 305); ctx.quadraticCurveTo(x + s * 90, 420, x + s * 140 + Math.sin(time + s) * 6, 560); ctx.stroke(); }
      ctx.restore();
      for (let i = 0; i < 6; i++) { const k = (time * .12 + i / 6) % 1; ctx.fillStyle = `rgba(40,20,20,${.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * 30 + k * 120, 290 - k * 260, 30 + k * 70, 0, 7); ctx.fill(); }
    });
    raceHills(d * .2, 600, 55, "#2a0a06", .005, .013);
    // Pilares de basalto com rachaduras brilhando.
    raceEach(d * .5, 300, (x, n) => {
      const h = 120 + rhash(n + 1) * 160, w = 36 + rhash(n + 2) * 30;
      ctx.fillStyle = "#1a0604"; ctx.beginPath(); ctx.moveTo(x - w / 2, FLOOR); ctx.lineTo(x - w / 2 + 6, FLOOR - h); ctx.lineTo(x + w / 2 - 4, FLOOR - h - 14); ctx.lineTo(x + w / 2, FLOOR); ctx.fill();
      ctx.strokeStyle = "#ff6a1a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, FLOOR - h * .8); ctx.lineTo(x + 3, FLOOR - h * .55); ctx.lineTo(x - 2, FLOOR - h * .3); ctx.stroke();
    });
    // Cinzas e brasas no ar.
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 30; i++) { const x = ((i * 211 - d * .7 - time * 30) % W + W) % W, y = ((i * 137 - time * (40 + i % 5 * 12)) % FLOOR + FLOOR) % FLOOR; ctx.fillStyle = i % 3 ? "rgba(255,140,40,.7)" : "rgba(255,220,120,.8)"; ctx.fillRect(x, y, 2.5, 2.5); }
    ctx.restore();
    const hg = ctx.createLinearGradient(0, FLOOR - 160, 0, FLOOR); hg.addColorStop(0, "rgba(255,90,20,0)"); hg.addColorStop(1, "rgba(255,90,20,.22)");
    ctx.fillStyle = hg; ctx.fillRect(0, FLOOR - 160, W, 160);
    ctx.fillStyle = "#1a0e0c"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#3a1a10"; ctx.fillRect(0, FLOOR, W, 8);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(255,110,30,${.55 + Math.sin(time * 3) * .15})`; ctx.lineWidth = 2.5;
    raceEach(d, 140, (x, n) => { ctx.beginPath(); ctx.moveTo(x, FLOOR + 10); ctx.lineTo(x + 20, FLOOR + 30 + rhash(n) * 20); ctx.lineTo(x + 8, FLOOR + 60); ctx.lineTo(x + 30, FLOOR + 90); ctx.stroke(); });
    ctx.restore();
  },
  castelo(d) {
    raceSky("#04040c", "#14143a", "#3a2a5a");
    raceMoon(1250, 140, 70, "#f4f4ff", "#9aaaff44");
    // Torres do castelo ao longe com janelas acesas.
    raceEach(d * .1, 260, (x, n) => {
      const h = 220 + rhash(n + 3) * 180, w = 70 + rhash(n + 1) * 40, top = 640 - h;
      ctx.fillStyle = "#0e0e22"; ctx.fillRect(x - w / 2, top, w, h + 20);
      ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, top); ctx.lineTo(x, top - 80 - rhash(n) * 40); ctx.lineTo(x + w / 2 + 8, top); ctx.fill();
      ctx.fillStyle = `rgba(255,210,120,${.6 + Math.sin(time * 2 + n) * .2})`; for (let j = 0; j < 3; j++) if (rhash(n + j * 7) < .6) ctx.fillRect(x - 6 + (j - 1) * 18, top + 40 + j * 46, 8, 14);
    });
    // Muralha com ameias.
    ctx.fillStyle = "#16162c"; ctx.fillRect(0, 610, W, FLOOR - 610);
    const wo = d * .3; for (let x = -(wo % 50); x < W; x += 50) ctx.fillRect(x, 588, 28, 24);
    // Arcos de pedra com tochas na frente.
    raceEach(d * .65, 460, (x) => {
      ctx.fillStyle = "#0a0a16"; ctx.fillRect(x - 26, FLOOR - 330, 52, 330); ctx.fillRect(x - 36, FLOOR - 345, 72, 24);
      ctx.fillStyle = "#7a1020"; ctx.beginPath(); ctx.moveTo(x - 20, FLOOR - 320); ctx.lineTo(x + 20, FLOOR - 320); ctx.lineTo(x + 20, FLOOR - 200); ctx.lineTo(x, FLOOR - 215); ctx.lineTo(x - 20, FLOOR - 200); ctx.fill();
      ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(x, FLOOR - 270, 7, 0, 7); ctx.fill();
      for (const s of [-1, 1]) {
        const tx = x + s * 40, ty = FLOOR - 230; ctx.fillStyle = "#3a2a1a"; ctx.fillRect(tx - 3, ty, 6, 26);
        ctx.save(); ctx.globalCompositeOperation = "lighter"; const fl = 1 + Math.sin(time * 17 + x) * .15; glowDot(tx, ty - 6, 60 * fl, "#ffb04a55", "#ff6a1a00"); glowDot(tx, ty - 8, 11 * fl, "#fff2b0", "#ff7a1acc"); ctx.restore();
      }
    });
    // Piso de pedra e tapete vermelho.
    ctx.fillStyle = "#24243a"; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.strokeStyle = "#16162a"; ctx.lineWidth = 2;
    for (let x = -(d % 70); x < W; x += 70) { ctx.beginPath(); ctx.moveTo(x, FLOOR + 14); ctx.lineTo(x, FLOOR + 50); ctx.moveTo(x + 35, FLOOR + 50); ctx.lineTo(x + 35, FLOOR + 90); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, FLOOR + 50); ctx.lineTo(W, FLOOR + 50); ctx.stroke();
    ctx.fillStyle = "#8a1020"; ctx.fillRect(0, FLOOR, W, 12); ctx.fillStyle = "#e8b84a"; ctx.fillRect(0, FLOOR + 12, W, 2);
  },
};
// Plataformas no estilo de cada zona.
function drawRacePlat(p, z) {
  const id = RACE_ZONES[z].id;
  ctx.fillStyle = OUT; roundRect(ctx, p.x - 2, p.y - 2, p.w + 4, 22, 6); ctx.fill();
  const cols = p.rock || id === "vulcao" ? ["#5a3a30", "#2a1610"] : id === "floresta" ? ["#7a5a3a", "#4a3020"] : id === "castelo" ? ["#7a7a96", "#3a3a52"] : ["#8a7a8a", "#4a404c"];
  const gg = ctx.createLinearGradient(0, p.y, 0, p.y + 18); gg.addColorStop(0, cols[0]); gg.addColorStop(1, cols[1]);
  ctx.fillStyle = gg; roundRect(ctx, p.x, p.y, p.w, 18, 5); ctx.fill();
  ctx.fillStyle = "#ffffff22"; ctx.fillRect(p.x + 6, p.y + 2, p.w - 12, 3);
  if (id === "floresta" && !p.rock) { ctx.fillStyle = "#3a8a4a"; ctx.fillRect(p.x + 2, p.y - 2, p.w - 4, 5); ctx.strokeStyle = "#2a1a10"; ctx.lineWidth = 1.5; for (let x = p.x + 25; x < p.x + p.w; x += 30) { ctx.beginPath(); ctx.arc(x, p.y + 9, 5, 0, 7); ctx.stroke(); } }
  else if (p.rock || id === "vulcao") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ff6a1aaa"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + 12, p.y + 10); ctx.lineTo(p.x + p.w * .4, p.y + 6); ctx.lineTo(p.x + p.w * .7, p.y + 12); ctx.stroke(); ctx.restore(); }
  else if (id === "castelo") { ctx.strokeStyle = "#5a5a6a"; ctx.lineWidth = 3; for (const x of [p.x + 12, p.x + p.w - 12]) { ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, 0); ctx.stroke(); } ctx.setLineDash([]); }
}
// Foice da Morte (cabo + lâmina), cabo centrado na origem.
function drawScythe(s) {
  ctx.save(); ctx.scale(s, s);
  ctx.strokeStyle = OUT; ctx.lineWidth = 11; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 150); ctx.lineTo(0, -170); ctx.stroke();
  ctx.strokeStyle = "#4a3020"; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-4, -170); ctx.quadraticCurveTo(110, -200, 160, -110); ctx.quadraticCurveTo(100, -160, -4, -145); ctx.closePath(); ctx.fill();
  const gs = ctx.createLinearGradient(0, -190, 150, -110); gs.addColorStop(0, "#e8eef4"); gs.addColorStop(1, "#7a8490");
  ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(2, -166); ctx.quadraticCurveTo(105, -193, 150, -116); ctx.quadraticCurveTo(98, -156, 2, -150); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawRaceObstacle(o, d) {
  if (o.x < -400 || o.x > W + 400) return;
  if (o.type === "spikes") {
    for (let i = 0; i < o.w / 18; i++) { const x = o.x + i * 18; ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + 9, FLOOR - 26); ctx.lineTo(x + 18, FLOOR); ctx.fill(); ctx.fillStyle = "#b8c0c8"; ctx.beginPath(); ctx.moveTo(x + 3, FLOOR); ctx.lineTo(x + 9, FLOOR - 21); ctx.lineTo(x + 15, FLOOR); ctx.fill(); ctx.fillStyle = "#8a1a1a"; ctx.beginPath(); ctx.moveTo(x + 7, FLOOR - 15); ctx.lineTo(x + 9, FLOOR - 21); ctx.lineTo(x + 11, FLOOR - 15); ctx.fill(); }
  } else if (o.type === "crate") {
    const n = Math.round(o.h / 55), hh = o.h / n;
    for (let j = 0; j < n; j++) {
      const y = FLOOR - o.h + j * hh;
      ctx.fillStyle = OUT; ctx.fillRect(o.x - 2, y - 2, o.w + 4, hh + 4);
      if (o.zone === "castelo") { ctx.fillStyle = "#5a5a6e"; ctx.fillRect(o.x, y, o.w, hh); ctx.strokeStyle = "#3a3a4a"; ctx.lineWidth = 3; ctx.strokeRect(o.x + 2, y + 2, o.w - 4, hh - 4); ctx.beginPath(); ctx.moveTo(o.x, y + hh / 2); ctx.lineTo(o.x + o.w, y + hh / 2); ctx.stroke(); }
      else { ctx.fillStyle = o.zone === "floresta" ? "#8a6a3a" : "#a8743a"; ctx.fillRect(o.x, y, o.w, hh); ctx.strokeStyle = "#6a4420"; ctx.lineWidth = 4; ctx.strokeRect(o.x + 3, y + 3, o.w - 6, hh - 6); ctx.beginPath(); ctx.moveTo(o.x + 5, y + 5); ctx.lineTo(o.x + o.w - 5, y + hh - 5); ctx.stroke(); }
    }
    if (o.zone === "floresta") { ctx.fillStyle = "#3a8a4a"; ctx.fillRect(o.x - 2, FLOOR - o.h - 4, o.w + 4, 6); }
  } else if (o.type === "boulder") {
    const y = FLOOR - o.r;
    ctx.save(); ctx.translate(o.x, y); ctx.rotate(o.rot);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, o.r + 3, 0, 7); ctx.fill();
    const gb = ctx.createRadialGradient(-10, -12, 4, 0, 0, o.r); gb.addColorStop(0, o.zone === "floresta" ? "#8a9a7a" : "#a8988a"); gb.addColorStop(1, "#4a4038");
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(0, 0, o.r, 0, 7); ctx.fill();
    ctx.strokeStyle = "#3a302a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-o.r * .6, -5); ctx.lineTo(0, 4); ctx.lineTo(o.r * .5, -12); ctx.stroke();
    if (o.zone === "floresta") { ctx.fillStyle = "#3a7a3a"; ctx.beginPath(); ctx.arc(-8, -o.r + 8, 9, 0, 7); ctx.arc(6, -o.r + 6, 7, 0, 7); ctx.fill(); }
    ctx.restore();
    if (o.active && rnd() < .3) dust(o.x + o.r * .6, FLOOR, 1, "#8a7a6a");
  } else if (o.type === "boost") {
    ctx.fillStyle = "#1a3a3a"; roundRect(ctx, o.x, FLOOR - 6, o.w, 8, 4); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) { const ph = (time * 3 + i / 3) % 1, x = o.x + 15 + ph * (o.w - 30); ctx.fillStyle = `rgba(90,255,216,${1 - ph})`; ctx.beginPath(); ctx.moveTo(x, FLOOR - 16); ctx.lineTo(x + 14, FLOOR - 6); ctx.lineTo(x, FLOOR + 4); ctx.lineTo(x + 5, FLOOR - 6); ctx.fill(); }
    glowDot(o.x + o.w / 2, FLOOR - 4, 60, "#5affd833", "#5affd800"); ctx.restore();
  } else if (o.type === "spring") {
    // Mola: base de metal, espiral e almofada vermelha (amassa quando alguém pula).
    const top = FLOOR - 34 + o.squash * 18, cx = o.x + o.w / 2;
    ctx.fillStyle = OUT; roundRect(ctx, o.x - 2, FLOOR - 10, o.w + 4, 12, 4); ctx.fill(); ctx.fillStyle = "#7a828c"; roundRect(ctx, o.x, FLOOR - 8, o.w, 8, 3); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 6; i++) ctx.lineTo(cx + (i % 2 ? 16 : -16), lerp(FLOOR - 8, top + 6, i / 6)); ctx.stroke();
    ctx.strokeStyle = "#dfe5ea"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = OUT; roundRect(ctx, o.x - 4, top - 4, o.w + 8, 14, 6); ctx.fill();
    const gp = ctx.createLinearGradient(0, top - 3, 0, top + 9); gp.addColorStop(0, "#ff8a6a"); gp.addColorStop(1, "#c0202e"); ctx.fillStyle = gp; roundRect(ctx, o.x - 2, top - 2, o.w + 4, 10, 5); ctx.fill();
    ctx.fillStyle = "#ffd84a"; ctx.font = "bold 18px Georgia"; ctx.textAlign = "center"; ctx.fillText("▲", cx, top - 10 + Math.sin(time * 6) * 3);
  } else if (o.type === "hands") {
    // Mãos de zumbi saindo da terra.
    ctx.fillStyle = "#3a2418"; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, FLOOR + 2, o.w / 2 + 10, 12, 0, Math.PI, 0); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const hx = o.x + 22 + i * 42, rise = o.rise * (52 + i % 2 * 12) + (o.grab > 0 ? 10 : 0), wig = Math.sin(time * 9 + i * 2) * 4 * o.rise;
      if (rise < 3) continue;
      ctx.strokeStyle = OUT; ctx.lineWidth = 13; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(hx, FLOOR + 4); ctx.lineTo(hx + wig, FLOOR - rise); ctx.stroke();
      ctx.strokeStyle = "#7a9a6a"; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = "#5a3a2a"; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(hx, FLOOR - rise * .3); ctx.lineTo(hx + wig * .3, FLOOR - rise * .45); ctx.stroke();
      ctx.strokeStyle = "#8aaa7a"; ctx.lineWidth = 3.5;
      for (let f = 0; f < 4; f++) { const an = -Math.PI / 2 + (f - 1.5) * .35 + Math.sin(time * 8 + f) * .15; ctx.beginPath(); ctx.moveTo(hx + wig, FLOOR - rise); ctx.lineTo(hx + wig + Math.cos(an) * 14, FLOOR - rise + Math.sin(an) * 14); ctx.stroke(); }
    }
  } else if (o.type === "bats") {
    for (let i = 0; i < o.n; i++) {
      const bx = o.x + i * 44, by = o.y + Math.sin(time * 6 + i * 1.7) * 24, fl = Math.sin(time * 26 + i) * 12;
      ctx.fillStyle = "#1a0a24";
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + s * 14, by - 10 - fl, bx + s * 28, by - fl); ctx.lineTo(bx + s * 20, by + 2 - fl * .4); ctx.lineTo(bx + s * 14, by + 6); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(bx, by, 8, 10, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx - 6, by - 7); ctx.lineTo(bx - 4, by - 15); ctx.lineTo(bx - 1, by - 8); ctx.moveTo(bx + 6, by - 7); ctx.lineTo(bx + 4, by - 15); ctx.lineTo(bx + 1, by - 8); ctx.fill();
      ctx.fillStyle = "#ff3a3a"; ctx.fillRect(bx - 4, by - 3, 2.5, 2.5); ctx.fillRect(bx + 1.5, by - 3, 2.5, 2.5);
    }
  } else if (o.type === "lava") {
    // Poça de lava borbulhando.
    ctx.fillStyle = "#120806"; ctx.fillRect(o.x - 8, FLOOR - 4, o.w + 16, H - FLOOR + 4);
    const gl = ctx.createLinearGradient(0, FLOOR - 4, 0, FLOOR + 40); gl.addColorStop(0, "#ffe08a"); gl.addColorStop(.3, "#ff7a1a"); gl.addColorStop(1, "#8a1a06");
    ctx.fillStyle = gl; ctx.beginPath(); ctx.moveTo(o.x, H);
    for (let x = 0; x <= o.w; x += 10) ctx.lineTo(o.x + x, FLOOR - 2 + Math.sin(time * 4 + x * .08) * 3);
    ctx.lineTo(o.x + o.w, H); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(o.x + o.w / 2, FLOOR - 10, o.w * .7, "#ff6a1a55", "#ff3a0a00");
    for (let i = 0; i < 3; i++) { const ph = (time * .9 + i * .37 + o.ph) % 1, bx = o.x + 20 + ((i * 67 + Math.floor(time * .9 + i * .37 + o.ph) * 41) % Math.max(1, o.w - 40)); ctx.fillStyle = `rgba(255,230,140,${1 - ph})`; ctx.beginPath(); ctx.arc(bx, FLOOR - 2 - ph * 14, 3 + ph * 6, 0, 7); ctx.fill(); }
    ctx.restore();
    for (const ex of [o.x - 10, o.x + o.w - 6]) { ctx.fillStyle = "#2a1a14"; ctx.beginPath(); ctx.ellipse(ex + 8, FLOOR, 14, 9, 0, Math.PI, 0); ctx.fill(); }
    if (rnd() < .25) particles.push({ x: o.x + rnd(o.w), y: FLOOR - 4, vx: rnd(-20, 20), vy: rnd(-160, -60), life: .7, max: .7, color: pick(["#ff8a3a", "#ffd84a"]), size: rnd(2, 4), g: 200, glow: true });
  } else if (o.type === "firejet") {
    // Respiradouro de fogo: fumaça avisa, depois sobe uma coluna de fogo.
    const c = firejetPhase(o), cx = o.x + 30;
    ctx.fillStyle = OUT; roundRect(ctx, o.x - 2, FLOOR - 12, o.w + 4, 14, 4); ctx.fill();
    ctx.fillStyle = "#4a3a34"; roundRect(ctx, o.x, FLOOR - 10, o.w, 10, 3); ctx.fill();
    ctx.fillStyle = c >= 1 ? "#ff7a1a" : "#1a0e0a"; for (let i = 0; i < 4; i++) ctx.fillRect(o.x + 8 + i * 12, FLOOR - 8, 6, 6);
    if (c >= 1 && c < 1.6) {
      if (rnd() < .5) particles.push({ x: cx + rnd(-14, 14), y: FLOOR - 12, vx: rnd(-20, 20), vy: rnd(-120, -60), life: .6, max: .6, color: pick(["#5a4a44", "#7a6a64"]), size: rnd(6, 11), g: -30, puff: true });
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(cx, FLOOR - 10, 50, `rgba(255,120,40,${(c - 1) * 1.2})`, "#ff3a0a00"); ctx.restore();
    } else if (c >= 1.6) {
      const k = Math.min(1, (c - 1.6) / .12) * Math.min(1, (2.4 - c) / .15), h = 270 * k;
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (const [w, col] of [[70, "rgba(255,80,20,.35)"], [44, "rgba(255,150,40,.6)"], [20, "rgba(255,240,180,.9)"]]) {
        const gf = ctx.createLinearGradient(0, FLOOR, 0, FLOOR - h); gf.addColorStop(0, col); gf.addColorStop(1, "rgba(255,80,20,0)");
        ctx.fillStyle = gf; ctx.beginPath(); ctx.moveTo(cx - w / 2, FLOOR - 8);
        for (let y = 0; y <= h; y += 20) ctx.lineTo(cx - w / 2 * (1 - y / h * .5) + Math.sin(time * 30 + y * .1) * 6, FLOOR - 8 - y);
        for (let y = h; y >= 0; y -= 20) ctx.lineTo(cx + w / 2 * (1 - y / h * .5) + Math.sin(time * 27 + y * .12) * 6, FLOOR - 8 - y);
        ctx.fill();
      }
      ctx.restore();
    }
  } else if (o.type === "rockfall") {
    if (o.state === "warn" || o.state === "fall") {
      const k = o.state === "warn" ? 1 - o.wt / .9 : 1;
      ctx.fillStyle = `rgba(0,0,0,${.2 + k * .3})`; ctx.beginPath(); ctx.ellipse(o.x, FLOOR - 2, 20 + k * 30, 6 + k * 4, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = `rgba(255,60,40,${.6 + Math.sin(time * 20) * .3})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(o.x, FLOOR - 2, 56, 12, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      if (o.state === "warn") { ctx.fillStyle = "#ff5a3a"; ctx.font = "bold 40px Georgia"; ctx.textAlign = "center"; ctx.fillText("!", o.x, FLOOR - 40 + Math.sin(time * 14) * 4); }
    }
    if (o.state === "fall" || o.state === "done") {
      const y = o.ry;
      if (o.state === "fall") { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(255,120,40,.45)"; ctx.lineWidth = 30; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(o.x, y - 120); ctx.lineTo(o.x, y - 20); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.translate(o.x, y); ctx.rotate(o.rot); if (o.state === "done") ctx.scale(1.1, .7);
      ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, r = 40 + (i % 3) * 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill();
      ctx.fillStyle = "#5a3a30"; ctx.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, r = 35 + (i % 3) * 5; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill();
      ctx.strokeStyle = "#ff7a1a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-18, -10); ctx.lineTo(0, 4); ctx.lineTo(16, -8); ctx.stroke();
      ctx.restore();
    }
  } else if (o.type === "saw") {
    // Serra circular subindo e descendo num trilho.
    ctx.fillStyle = OUT; ctx.fillRect(o.x - 7, FLOOR - 280, 14, 280); ctx.fillStyle = "#3a3a4a"; ctx.fillRect(o.x - 4, FLOOR - 278, 8, 278);
    ctx.save(); ctx.translate(o.x, o.sy); ctx.rotate(-time * 18);
    ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 32; i++) { const r = i % 2 ? 36 : 44, an = i * Math.PI / 16; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill();
    const gs = ctx.createRadialGradient(-8, -8, 2, 0, 0, 40); gs.addColorStop(0, "#ffffff"); gs.addColorStop(.6, "#b8c0c8"); gs.addColorStop(1, "#6a7480");
    ctx.fillStyle = gs; ctx.beginPath(); for (let i = 0; i < 32; i++) { const r = i % 2 ? 33 : 41, an = i * Math.PI / 16; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.fill();
    ctx.fillStyle = "#3a3a4a"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = "#8a1a1a"; ctx.fillRect(-2, -26, 4, 14);
    ctx.restore();
    if (rnd() < .3) spark(o.x + rnd(-6, 6), o.sy + 40, "#ffd84a", 1);
  } else if (o.type === "pendulum") {
    // Lâmina pendular presa numa viga.
    ctx.fillStyle = OUT; ctx.fillRect(o.x - 60, PEND_Y - 30, 120, 22); ctx.fillStyle = "#4a3a2a"; ctx.fillRect(o.x - 58, PEND_Y - 28, 116, 18);
    ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(o.x, PEND_Y - 10); ctx.lineTo(o.bx, o.by); ctx.stroke();
    ctx.strokeStyle = "#8f9aa3"; ctx.lineWidth = 3; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
    const an = o.an || 0;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(220,230,255,.18)"; ctx.lineWidth = 50; ctx.beginPath();
    const v = Math.cos((race.t + o.ph) * 2.4), th = Math.PI / 2 - an, th2 = th + (v > 0 ? .4 : -.4) * Math.abs(v); ctx.arc(o.x, PEND_Y, PEND_L, Math.min(th, th2), Math.max(th, th2) + .001); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(o.bx, o.by); ctx.rotate(-an);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-52, -10); ctx.quadraticCurveTo(0, 50, 52, -10); ctx.lineTo(40, -18); ctx.quadraticCurveTo(0, 18, -40, -18); ctx.closePath(); ctx.fill();
    const gb = ctx.createLinearGradient(0, -18, 0, 40); gb.addColorStop(0, "#7a8490"); gb.addColorStop(1, "#f4f8ff");
    ctx.fillStyle = gb; ctx.beginPath(); ctx.moveTo(-48, -10); ctx.quadraticCurveTo(0, 44, 48, -10); ctx.lineTo(38, -15); ctx.quadraticCurveTo(0, 14, -38, -15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a3a4a"; ctx.beginPath(); ctx.arc(0, -14, 8, 0, 7); ctx.fill();
    ctx.restore();
  }
}
// Portal de entrada de cada zona (placa com o nome).
function drawZoneGate(x, Z) {
  ctx.fillStyle = OUT; ctx.fillRect(x - 6, FLOOR - 190, 12, 190);
  ctx.fillStyle = "#5a3a22"; ctx.fillRect(x - 4, FLOOR - 188, 8, 188);
  ctx.font = "bold 22px Georgia"; const w = ctx.measureText(Z.name).width + 70;
  ctx.fillStyle = OUT; roundRect(ctx, x - w / 2 - 3, FLOOR - 243, w + 6, 56, 10); ctx.fill();
  ctx.fillStyle = "#e8d8b0"; roundRect(ctx, x - w / 2, FLOOR - 240, w, 50, 8); ctx.fill();
  ctx.strokeStyle = Z.col; ctx.lineWidth = 3; roundRect(ctx, x - w / 2 + 5, FLOOR - 235, w - 10, 40, 6); ctx.stroke();
  ctx.fillStyle = "#3a2410"; ctx.textAlign = "center"; ctx.fillText(`${Z.icon} ${Z.name}`, x, FLOOR - 207);
}
function drawRaceWorld() {
  const R = race, d = R ? R.dist : 0;
  // Fundo da zona onde a câmera está, misturando com a próxima perto da divisa.
  const cx = d + W / 2, z = zoneAt(cx), nxt = RACE_ZONES[z + 1];
  RACE_PAINT[RACE_ZONES[z].id](d);
  const k = nxt ? clamp((cx - (nxt.from - 600)) / 600, 0, 1) : 0;
  if (k > 0) { ctx.save(); ctx.globalAlpha = k; RACE_PAINT[nxt.id](d); ctx.restore(); }
  if (!R) return;
  // Largada.
  const sx = 360 - d;
  if (sx > -200) {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#111" : "#eee"; ctx.fillRect(sx - 10 + i * 10, FLOOR + j * 10, 10, 10); }
    const gx0 = sx - 20, gx1 = sx + 330, gm = (gx0 + gx1) / 2;
    for (const px of [gx0, gx1]) { ctx.fillStyle = OUT; ctx.fillRect(px - 6, FLOOR - 250, 12, 250); ctx.fillStyle = "#6a4a2a"; ctx.fillRect(px - 4, FLOOR - 248, 8, 248); }
    ctx.fillStyle = OUT; ctx.fillRect(gx0, FLOOR - 262, gx1 - gx0, 8);
    ctx.fillStyle = OUT; roundRect(ctx, gm - 110, FLOOR - 296, 220, 46, 8); ctx.fill(); ctx.fillStyle = "#c0202e"; roundRect(ctx, gm - 106, FLOOR - 292, 212, 38, 6); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 26px Georgia"; ctx.textAlign = "center"; ctx.fillText("LARGADA", gm, FLOOR - 264);
  }
  // Marcos de distância a cada 100 m (1000 px).
  for (let m = 1000; m < RACE_LEN; m += 1000) {
    const x = m + 420 - d; if (x < -60 || x > W + 60) continue;
    ctx.fillStyle = "#5a3a22"; ctx.fillRect(x - 4, FLOOR - 70, 8, 70);
    ctx.fillStyle = "#e8d8b0"; roundRect(ctx, x - 34, FLOOR - 92, 68, 26, 5); ctx.fill();
    ctx.fillStyle = "#3a2410"; ctx.font = "bold 16px Georgia"; ctx.textAlign = "center"; ctx.fillText(`${m / 10} m`, x, FLOOR - 73);
  }
  RACE_ZONES.forEach((Z, i) => { const x = Z.from - d + 200; if (i > 0 && x > -200 && x < W + 200) drawZoneGate(x, Z); });
  for (const p of PLATFORMS) if (p.race && !p.crate && p.x < W + 50 && p.x + p.w > -50) drawRacePlat(p, zoneAt(p.x + d));
  for (const o of R.obs) drawRaceObstacle(o, d);
  // Orbes de alma.
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const ob of R.orbs) {
    // Alma azulada: chama com rabinho balançando pra cima.
    if (ob.x < -40 || ob.x > W + 40) continue;
    const y = ob.y + Math.sin(time * 4 + ob.ph) * 6, sw = Math.sin(time * 7 + ob.ph) * 5;
    glowDot(ob.x, y, 34, "#7ad8ff55", "#7a5aff00");
    ctx.fillStyle = "rgba(140,220,255,.85)"; ctx.beginPath(); ctx.moveTo(ob.x - 11, y); ctx.quadraticCurveTo(ob.x - 8, y - 16, ob.x + sw, y - 30); ctx.quadraticCurveTo(ob.x + 8, y - 14, ob.x + 11, y); ctx.arc(ob.x, y, 11, 0, Math.PI); ctx.fill();
    glowDot(ob.x, y + 1, 8, "#ffffff", "#bfeaffcc");
  }
  ctx.restore();
  // Chegada: arco com faixa xadrez e bandeiras.
  const fxl = R.finishW - d;
  if (fxl < W + 300) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = (i + j) % 2 ? "#111" : "#eee"; ctx.fillRect(fxl - 20 + i * 10, FLOOR + j * 10, 10, 10); }
    for (const px of [fxl - 170, fxl + 170]) {
      ctx.fillStyle = OUT; ctx.fillRect(px - 16, FLOOR - 330, 32, 330);
      const gp = ctx.createLinearGradient(px - 14, 0, px + 14, 0); gp.addColorStop(0, "#c8c0b0"); gp.addColorStop(1, "#7a7068");
      ctx.fillStyle = gp; ctx.fillRect(px - 13, FLOOR - 327, 26, 327);
      ctx.fillStyle = "#c0202e"; ctx.beginPath(); ctx.moveTo(px, FLOOR - 420); ctx.lineTo(px + 70 + Math.sin(time * 6 + px) * 8, FLOOR - 400); ctx.lineTo(px, FLOOR - 380); ctx.fill();
      ctx.fillStyle = OUT; ctx.fillRect(px - 3, FLOOR - 425, 6, 100);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(px, FLOOR - 340, 40, `rgba(255,216,74,${.5 + Math.sin(time * 8 + px) * .3})`, "#ffd84a00"); ctx.restore();
    }
    ctx.fillStyle = OUT; ctx.fillRect(fxl - 190, FLOOR - 362, 380, 52);
    for (let i = 0; i < 19; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? "#111" : "#fff"; ctx.fillRect(fxl - 186 + i * 19.6, FLOOR - 358 + j * 22, 19.6, 22); }
    ctx.fillStyle = OUT; roundRect(ctx, fxl - 95, FLOOR - 400, 190, 40, 8); ctx.fill(); ctx.fillStyle = "#ffd84a"; roundRect(ctx, fxl - 91, FLOOR - 396, 182, 32, 6); ctx.fill();
    ctx.fillStyle = "#3a2410"; ctx.font = "bold 24px Georgia"; ctx.textAlign = "center"; ctx.fillText("CHEGADA", fxl, FLOOR - 372);
  }
}
// A Morte: névoa escura à esquerda e o ceifador com a foice.
function drawDeath() {
  if (!race) return;
  const R = race, x = R.deathX, bob = Math.sin(time * 2.4) * 10, y = FLOOR - 250 + bob, thrown = fx.some(e => e.type === "deathscythe" && e.t > e.warn - .2);
  const g = ctx.createLinearGradient(0, 0, x + 160, 0); g.addColorStop(0, "rgba(6,2,10,.97)"); g.addColorStop(.7, "rgba(16,4,26,.75)"); g.addColorStop(1, "rgba(16,4,26,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, x + 160, H);
  ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(x, y + 40, 230, R.final ? "#ff2a5a33" : "#6a2fa033", "#6a2fa000");
  // Almas girando em volta.
  for (let i = 0; i < 4; i++) { const an = time * 1.6 + i * Math.PI / 2, sx2 = x + Math.cos(an) * 120, sy2 = y + 40 + Math.sin(an) * 70; glowDot(sx2, sy2, 16, "#c8b0ffaa", "#6a2fa000"); }
  ctx.restore();
  // Foice atrás (some quando foi arremessada; balança ao atacar).
  if (!thrown) { ctx.save(); ctx.translate(x + 40, y + 60); ctx.rotate(-.5 + Math.sin(time * 3.2) * .35 + (R.swingT > 0 ? Math.sin(R.swingT * 10) * .8 : 0)); drawScythe(1); ctx.restore(); }
  // Manto esfarrapado.
  ctx.fillStyle = "#0e0614"; ctx.beginPath(); ctx.moveTo(x - 40, y - 80);
  ctx.quadraticCurveTo(x, y - 150, x + 45, y - 80); ctx.lineTo(x + 70, y + 160);
  for (let i = 0; i <= 8; i++) ctx.lineTo(x + 70 - i * 18, y + 160 + (i % 2 ? 30 : 0) + Math.sin(time * 7 + i) * 6);
  ctx.lineTo(x - 90, y + 120); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#2a1640"; ctx.lineWidth = 3; ctx.stroke();
  // Capuz e caveira.
  ctx.fillStyle = "#1a0c26"; ctx.beginPath(); ctx.ellipse(x + 5, y - 70, 46, 54, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.ellipse(x + 14, y - 62, 30, 38, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#d8d0c0"; ctx.beginPath(); ctx.ellipse(x + 16, y - 64, 19, 23, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.ellipse(x + 10, y - 68, 6, 7, 0, 0, 7); ctx.ellipse(x + 24, y - 68, 6, 7, 0, 0, 7); ctx.fill();
  ctx.save(); ctx.shadowColor = "#ff2a2a"; ctx.shadowBlur = 14 + R.danger * 16; ctx.fillStyle = "#ff3a3a"; ctx.beginPath(); ctx.arc(x + 10, y - 68, 2.6 + R.danger * 1.5, 0, 7); ctx.arc(x + 24, y - 68, 2.6 + R.danger * 1.5, 0, 7); ctx.fill(); ctx.restore();
  ctx.fillStyle = "#050208"; ctx.fillRect(x + 9, y - 52, 16, 3); for (let i = 0; i < 4; i++) ctx.fillRect(x + 10 + i * 4, y - 55, 1.5, 8);
  // Mão ossuda.
  ctx.strokeStyle = "#d8d0c0"; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x + 40, y + 20); ctx.lineTo(x + 52, y + (thrown ? 0 : 50)); ctx.stroke();
  if (rnd() < .5) particles.push({ x: x + rnd(-80, 60), y: y + rnd(-60, 180), vx: rnd(-80, -20), vy: rnd(-40, 20), life: .8, max: .8, color: pick(["#1a0a2a", "#3a1a5a"]), size: rnd(8, 16), g: 0, puff: true });
}
// Colocação em cima da cabeça de cada corredor.
function drawRaceTags() {
  if (!race || phase !== "fight") return;
  const run = fighters.filter(f => f.alive && !f.finished).sort((a, b) => b.pelvis.x - a.pelvis.x), done = race.order.length;
  run.forEach((f, i) => {
    const n = done + i + 1, x = f.head.x, y = f.head.y - 46 * f.sc;
    ctx.fillStyle = OUT; roundRect(ctx, x - 20, y - 14, 40, 24, 12); ctx.fill();
    ctx.fillStyle = n === 1 ? "#ffd84a" : f.color; roundRect(ctx, x - 18, y - 12, 36, 20, 10); ctx.fill();
    ctx.fillStyle = "#1a1008"; ctx.font = "bold 15px Georgia"; ctx.textAlign = "center"; ctx.fillText(`${n}º`, x, y + 4);
  });
}
// Barra de progresso no topo: zonas, cada jogador, a Morte e a chegada. E os avisos grandes.
function drawRaceHUD() {
  const R = race; if (!R) return;
  // Bordas vermelhas pulsando quando alguém está quase sendo pego.
  if (R.danger > .05 && phase === "fight") {
    const a = R.danger * (.45 + Math.sin(time * 9) * .15), gv = ctx.createLinearGradient(0, 0, 420, 0);
    gv.addColorStop(0, `rgba(160,0,30,${a})`); gv.addColorStop(1, "rgba(160,0,30,0)"); ctx.fillStyle = gv; ctx.fillRect(0, 0, 420, H);
  }
  const x0 = 380, x1 = W - 380, y = 68, span = R.finishW - 420, pos = (wx) => x0 + clamp((wx - 420) / span, 0, 1) * (x1 - x0);
  ctx.fillStyle = "#000a"; roundRect(ctx, x0 - 44, y - 18, x1 - x0 + 88, 36, 18); ctx.fill();
  RACE_ZONES.forEach((Z, i) => {
    const a = pos(Math.max(420, Z.from)), b = pos(RACE_ZONES[i + 1] ? RACE_ZONES[i + 1].from : R.finishW);
    ctx.fillStyle = Z.col + (i === R.zone ? "cc" : "55"); ctx.fillRect(a, y - 4, b - a - 2, 8);
    ctx.font = "15px Georgia"; ctx.textAlign = "center"; ctx.fillText(Z.icon, a + 10, y - 9);
  });
  ctx.font = "20px Georgia"; ctx.textAlign = "center"; ctx.fillText("🏁", x1 + 22, y + 7);
  const dx = pos(R.deathX + R.dist); ctx.fillStyle = "#ff3a3acc"; ctx.fillRect(x0, y - 2, Math.max(0, dx - x0), 4); ctx.fillText("💀", dx, y + 7);
  for (const f of fighters) { if (!f.alive && !f.finished) continue; const px = pos(f.pelvis.x + R.dist); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(px, y, 9, 0, 7); ctx.fill(); ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(px, y, 7, 0, 7); ctx.fill(); }
  const lead = fighters.filter(f => f.alive && !f.finished).reduce((m, f) => Math.max(m, f.pelvis.x + R.dist), 0);
  if (lead) textShadow(`${RACE_ZONES[R.zone].icon} ${RACE_ZONES[R.zone].name} · faltam ${Math.max(0, Math.round((R.finishW - lead) / 10))} m`, W / 2, y + 42, "#f3e6c8", "600 18px Georgia");
  // Aviso grande de zona nova / reta final.
  const B = R.banner;
  if (B && B.t < 2.8) {
    const kin = easeOut(Math.min(1, B.t / .35)), kout = B.t > 2.3 ? (B.t - 2.3) / .5 : 0, cy = 250;
    ctx.save(); ctx.globalAlpha = 1 - kout;
    ctx.fillStyle = "rgba(0,0,0,.55)"; ctx.fillRect(0, cy - 62, W, 110);
    ctx.fillStyle = B.col; ctx.fillRect(W / 2 - 360 * kin, cy - 62, 720 * kin, 3); ctx.fillRect(W / 2 - 360 * kin, cy + 45, 720 * kin, 3);
    ctx.translate(W / 2 + (1 - kin) * 300, cy);
    textShadow(B.sub, 0, -26, B.col, "600 22px Georgia");
    textShadow(B.text, 0, 26, "#f3e6c8", "bold 54px Georgia");
    ctx.restore();
  }
}

// ── Paredes das arenas: pintadas uma vez por arena (lado esquerdo e direito) seguindo o perfil da colisão.
const WALL_PAL = {
  stone: ["#6a5a4a", "#3a2e24", "#9a8a72"], marble: ["#d8d0c0", "#8a8272", "#ffffff"], sandstone: ["#c8a070", "#7a5a32", "#f0d098"],
  tree: ["#5a3a22", "#2a1a0e", "#8a6a42"], mushroom: ["#e8dcc8", "#9a8a70", "#ffffff"], ice: ["#a8d8f0", "#4a7aa8", "#ffffff"],
  basalt: ["#3a2a28", "#140a08", "#6a4a3a"], crystal: ["#4a3a7a", "#1a1238", "#c58bff"], mine: ["#6a5242", "#2a1e16", "#9a8068"],
  rock: ["#7a7068", "#3a342e", "#aaa098"], moon: ["#8a8a92", "#3a3a42", "#c8c8d0"], alien: ["#5a2a6a", "#200a2a", "#9a5ab8"],
  coral: ["#2a5a6a", "#0a2a34", "#5ab8c8"], metal: ["#5a6070", "#262a32", "#9aa2b2"], building: ["#3a3448", "#14101e", "#6a6080"],
  hull: ["#6a4426", "#2a180a", "#9a6a3a"], plank: ["#8a5a32", "#3a2210", "#b88050"], curtain: ["#8a1020", "#3a0408", "#d84050"],
  shelf: ["#4a2c18", "#1e100a", "#7a4c2a"], candy: ["#f4e8f0", "#c87aa8", "#ffffff"],
};
const wallArt = new Map();
const WALL_X0 = -260, WALL_X1 = 90, WALL_Q = 1.5;
// len: comprimento da parede (as de cima e de baixo usam uma bem comprida, deitada).
function wallCanvas(a, side, len = ARENA_H + 220 - WALL_TOP) {
  const key = a.id + side + "|" + len;
  let cvw = wallArt.get(key);
  if (cvw) return cvw;
  if (wallArt.size > 6) wallArt.clear();
  const W2 = arenaWalls(a), prof = side ? W2.R : W2.L, st = W2.style, P = WALL_PAL[st] || WALL_PAL.rock, R = seeded(a.id.length * 97 + side * 13 + 5);
  const y0 = WALL_TOP, y1 = WALL_TOP + len, w = WALL_X1 - WALL_X0, h = len;
  const q = len > 2000 ? 1 : WALL_Q;
  cvw = document.createElement("canvas"); cvw.width = Math.ceil(w * q); cvw.height = Math.ceil(h * q);
  const c = cvw.getContext("2d"); c.scale(q, q); c.translate(-WALL_X0, -y0);
  const path = () => { c.beginPath(); c.moveTo(WALL_X0, y0); c.lineTo(prof[0], y0); c.lineTo(prof[0], y1); c.lineTo(WALL_X0, y1); c.closePath(); };
  // Sombra suave caindo pra dentro da arena.

  // Corpo da parede: mais claro perto da arena, escuro pra fora.
  path(); let g = c.createLinearGradient(WALL_X0, 0, 30, 0); g.addColorStop(0, P[1]); g.addColorStop(.75, P[0]); g.addColorStop(1, P[0]);
  c.fillStyle = g; c.fill();
  c.save(); path(); c.clip();
  const L = (x1, yy1, x2, yy2, col, wd = 2) => { c.strokeStyle = col; c.lineWidth = wd; c.beginPath(); c.moveTo(x1, yy1); c.lineTo(x2, yy2); c.stroke(); };
  if (st === "stone" || st === "marble" || st === "sandstone") {
    for (let y = y0, r = 0; y < y1; y += 34, r++) {
      L(WALL_X0, y, 60, y, P[1] + "cc", 3);
      for (let x = WALL_X0 + (r % 2) * 40; x < 60; x += 80) { L(x, y, x, y + 34, P[1] + "cc", 3); c.fillStyle = `rgba(255,255,255,${R() * .08})`; c.fillRect(x + 3, y + 3, 74, 28); }
    }
    if (a.id === "cemiterio" || a.id === "masmorra") { c.fillStyle = "#3a6a3a88"; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(R() * 60 - 20, y0 + R() * h, 6 + R() * 12, 0, 7); c.fill(); } }
  } else if (st === "tree" || st === "mushroom") {
    for (let i = 0; i < 16; i++) { const x = WALL_X0 + 40 + i * 18 + R() * 8; c.strokeStyle = P[1] + "aa"; c.lineWidth = 2 + R() * 2; c.beginPath(); for (let y = y0; y < y1; y += 30) c.lineTo(x + Math.sin(y * .02 + i) * 5, y); c.stroke(); }
    for (let i = 0; i < 6; i++) { const ky = y0 + 200 + R() * (h - 400), kx = -60 + R() * 70; c.fillStyle = P[1]; c.beginPath(); c.ellipse(kx, ky, 9, 14, 0, 0, 7); c.fill(); c.strokeStyle = P[2] + "88"; c.lineWidth = 2; c.stroke(); }
    if (st === "tree") { c.fillStyle = "#3a7a3a"; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(-40 + R() * 80, y0 + R() * 500, 10 + R() * 18, 0, 7); c.fill(); } }
    else { c.strokeStyle = "#c8b8a0"; c.lineWidth = 3; for (let y = y0 + 40; y < y1; y += 120) { c.beginPath(); c.moveTo(WALL_X0, y); c.quadraticCurveTo(-60, y + 14, 40, y); c.stroke(); } }
  } else if (st === "metal" || st === "building") {
    for (let y = y0; y < y1; y += 170) {
      L(WALL_X0, y, 60, y, P[1], 4);
      c.fillStyle = P[2] + "55"; for (const x of [-200, -120, -40]) for (const yy of [y + 14, y + 156]) { c.beginPath(); c.arc(x, yy, 3.5, 0, 7); c.fill(); }
      if (st === "building") { for (let x = -230; x < -20; x += 46) for (let yy = y + 20; yy < y + 150; yy += 44) { c.fillStyle = R() < .55 ? "#ffd86a" : "#2a2438"; c.fillRect(x, yy, 22, 26); } }
      else { c.fillStyle = ["#5affd8", "#ff5a6a", "#ffd84a"][Math.floor(R() * 3)]; c.fillRect(-60, y + 80, 18, 6); }
    }
    if (len < 2000) c.fillStyle = "#e8c83a"; if (len < 2000) for (let y = ARENA_FLOOR - 60; y < ARENA_FLOOR; y += 20) { c.beginPath(); c.moveTo(WALL_X0, y); c.lineTo(60, y + 30); c.lineTo(60, y + 40); c.lineTo(WALL_X0, y + 10); c.fill(); }
  } else if (st === "hull" || st === "plank" || st === "shelf") {
    if (st === "hull") for (let y = y0; y < y1; y += 26) { L(WALL_X0, y, 60, y + 4, P[1], 3); c.fillStyle = P[1]; c.beginPath(); c.arc(-30, y + 13, 2.5, 0, 7); c.fill(); }
    else if (st === "plank") for (let x = WALL_X0; x < 60; x += 30) { L(x, y0, x, y1, P[1], 3); c.fillStyle = P[1]; for (let y = y0 + 40; y < y1; y += 160) { c.beginPath(); c.arc(x + 15, y, 2.5, 0, 7); c.fill(); } }
    else for (let y = y0; y < y1; y += 74) {
      let bx = WALL_X0 + 10;
      while (bx < 30) { const bw = 9 + R() * 12, bh = 44 + R() * 22; c.fillStyle = ["#8a2a2a", "#2a4a8a", "#2a6a3a", "#8a6a2a", "#5a2a6a"][Math.floor(R() * 5)]; c.fillRect(bx, y + 62 - bh, bw, bh); bx += bw + 1; }
      c.fillStyle = "#2a160c"; c.fillRect(WALL_X0, y + 62, 300, 12);
    }
  } else if (st === "curtain") {
    for (let x = WALL_X0; x < 60; x += 34) { g = c.createLinearGradient(x, 0, x + 34, 0); g.addColorStop(0, P[1]); g.addColorStop(.5, P[2]); g.addColorStop(1, P[1]); c.fillStyle = g; c.fillRect(x, y0, 34, h); }
    if (len < 2000) { c.fillStyle = "#e8b84a"; c.fillRect(WALL_X0, ARENA_FLOOR - 30, 320, 6); }
  } else if (st === "candy") {
    for (let k = -40; k < 60; k++) { c.fillStyle = k % 2 ? "#e83a5a" : "#ffffff"; c.beginPath(); c.moveTo(WALL_X0, y0 + k * 60); c.lineTo(80, y0 + k * 60 + 120); c.lineTo(80, y0 + k * 60 + 150); c.lineTo(WALL_X0, y0 + k * 60 + 30); c.fill(); }
  } else {
    // Rocha (e variações): rachaduras, pedras e detalhes de cada tipo.
    for (let i = 0; i < 70; i++) { const x = WALL_X0 + R() * 300, y = y0 + R() * h, s = 12 + R() * 30; c.fillStyle = R() < .5 ? P[1] + "66" : P[2] + "33"; c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * .9, y - s * .2); c.lineTo(x + s * .5, y + s * .8); c.lineTo(x - s * .7, y + s * .6); c.lineTo(x - s, y - s * .3); c.fill(); }
    for (let i = 0; i < 14; i++) { let x = WALL_X0 + 40 + R() * 240, y = y0 + R() * h; c.strokeStyle = P[1]; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - .5) * 30; y += 20 + R() * 20; c.lineTo(x, y); } c.stroke(); }
    if (st === "basalt") { c.strokeStyle = "#ff6a1a"; c.lineWidth = 2.5; c.shadowColor = "#ff6a1a"; c.shadowBlur = 8; for (let i = 0; i < 8; i++) { let x = -80 + R() * 80, y = y0 + 200 + R() * (h - 300); c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - .5) * 24; y += 18 + R() * 14; c.lineTo(x, y); } c.stroke(); } c.shadowBlur = 0; }
    if (st === "crystal" || st === "ice" || st === "alien" || st === "coral") {
      const cc = st === "crystal" ? ["#c58bff", "#7ad8ff"] : st === "ice" ? ["#ffffff", "#bff0ff"] : st === "alien" ? ["#5affd8", "#ff6fb5"] : ["#ff8ab0", "#ffd84a"];
      for (let i = 0; i < 12; i++) { const y = y0 + 150 + R() * (h - 300), x = -10 + R() * 20, s = 10 + R() * 18; c.fillStyle = cc[i % 2] + "cc"; c.beginPath(); c.moveTo(x - s * .4, y); c.lineTo(x + s * 1.2, y - s * .6); c.lineTo(x - s * .2, y - s * 1.3); c.closePath(); c.fill(); }
    }
    if (st === "mine") { c.fillStyle = "#6a4a2a"; c.fillRect(-60, y0, 26, h); c.fillStyle = "#4a3018"; for (let y = y0 + 100; y < y1; y += 260) c.fillRect(-90, y, 120, 20); }
  }
  // Parede puxando pras cores do cenário (e mais escura, pra não confundir com o fundo).
  const amb = a.haze ? `rgb(${a.haze.join(",")})` : arenaEdgeCols(a)[0];
  path(); c.globalCompositeOperation = "color"; c.globalAlpha = .45; c.fillStyle = amb; c.fill(); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  path(); c.fillStyle = "rgba(0,0,0,.34)"; c.fill();
  c.restore();
  // Moldura da parede: faixa reta e clara na face de dentro (é aqui que fica a colisão).
  const fx0 = prof[0];
  c.fillStyle = "#0a0705"; c.fillRect(fx0 - 22, y0, 22, h);
  const acc = GRADE[a.id] || P[2];
  g = c.createLinearGradient(fx0 - 18, 0, fx0, 0); g.addColorStop(0, acc); g.addColorStop(.5, "#ffffff"); g.addColorStop(1, acc);
  c.fillStyle = g; c.fillRect(fx0 - 17, y0, 13, h);
  c.fillStyle = "#0a0705"; for (let y = y0 + 20; y < y1; y += 60) c.fillRect(fx0 - 17, y, 13, 4);
  c.fillStyle = "#00000088"; c.fillRect(fx0 - 3, y0, 3, h);
  wallArt.set(key, cvw);
  return cvw;
}
function drawArenaWalls(X = 0) {
  const LONG = 3600, Lx = -X + WALL_FACE, Rx = W + X - WALL_FACE, T = frameTop, B = H - WALL_FACE, M = 1400, ww = WALL_X1 - WALL_X0;
  const lw = wallCanvas(arena, 0, LONG), rw = wallCanvas(arena, 1, LONG), ys = T - 900; // as paredes começam bem acima do teto
  const piece = (poly, draw) => { ctx.save(); ctx.beginPath(); ctx.moveTo(poly[0], poly[1]); for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]); ctx.closePath(); ctx.clip(); draw(); ctx.restore(); };
  // Em cima e embaixo: a parede deitada.
  piece([Lx - M, T - M, Rx + M, T - M, Rx, T, Lx, T], () => { ctx.transform(0, 1, 1, 0, Lx - 300 - WALL_TOP, T - WALL_FACE); ctx.drawImage(lw, WALL_X0, WALL_TOP, ww, LONG); });
  piece([Lx, B, Rx, B, Rx + M, B + M, Lx - M, B + M], () => { ctx.transform(0, -1, 1, 0, Lx - 300 - WALL_TOP, B + WALL_FACE); ctx.drawImage(lw, WALL_X0, WALL_TOP, ww, LONG); });
  // Laterais.
  piece([Lx - M, T - M, Lx, T, Lx, B, Lx - M, B + M], () => { ctx.translate(-X, ys - WALL_TOP); ctx.drawImage(lw, WALL_X0, WALL_TOP, ww, LONG); });
  piece([Rx + M, T - M, Rx, T, Rx, B, Rx + M, B + M], () => { ctx.translate(W + X, ys - WALL_TOP); ctx.scale(-1, 1); ctx.drawImage(rw, WALL_X0, WALL_TOP, ww, LONG); });
  // Sombra suave das paredes caindo pra dentro da arena.
  ctx.save(); ctx.beginPath(); ctx.rect(Lx, T, Rx - Lx, B - T); ctx.clip();
  for (const [x0, y0, x1, y1, rx, ry, rw2, rh] of [[Lx, 0, Lx + 34, 0, Lx, T, 34, B - T], [Rx, 0, Rx - 34, 0, Rx - 34, T, 34, B - T], [0, T, 0, T + 30, Lx, T, Rx - Lx, 30], [0, B, 0, B - 30, Lx, B - 30, Rx - Lx, 30]]) {
    const gs = ctx.createLinearGradient(x0, y0, x1, y1); gs.addColorStop(0, "rgba(0,0,0,.45)"); gs.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = gs; ctx.fillRect(rx, ry, rw2, rh);
  }
  ctx.restore();
}
// Rachadura onde alguém bateu com força na parede.
function drawWallCrack(e, k) {
  ctx.save(); ctx.globalAlpha = Math.min(1, k * 3); ctx.translate(e.x, e.y); ctx.scale(e.side > 0 ? -1 : 1, 1);
  ctx.strokeStyle = "#0a0604"; ctx.lineWidth = 3; ctx.lineCap = "round";
  const R = seeded(e.seed);
  for (let i = 0; i < 6; i++) { let x = 0, y = 0, a = Math.PI - 1.2 + i * .45; ctx.beginPath(); ctx.moveTo(0, 0); for (let j = 0; j < 3; j++) { x += Math.cos(a) * (14 + R() * 12); y += Math.sin(a) * (14 + R() * 12); a += (R() - .5) * .8; ctx.lineTo(x, y); } ctx.stroke(); }
  ctx.restore();
}

// ── Buraco negro "de verdade": lente gravitacional (o cenário em volta se deforma), sombra preta,
// anel de fótons e disco de acreção que a gravidade dobra por cima e por baixo (como nas fotos e no cinema).
const holeBuf = document.createElement("canvas"), holeCtx = holeBuf.getContext("2d");
function holeRadius(e) {
  const grow = easeOut(Math.min(1, e.t / 1.1)), end = e.t > e.life - .3 ? Math.max(0, (e.life - e.t) / .3) : 1;
  return 80 * (e.big || 1) * grow * end;
}
function drawRealHoles() { for (const e of fx) if (e.type === "realhole" && e.t >= 0) drawRealHole(e); }
function drawRealHole(e) {
  const E = holeRadius(e); if (E < 3) return;
  const m = ctx.getTransform(), X = m.a * e.x + m.e, Y = m.d * e.y + m.f, Ed = E * m.a, R = Math.ceil(Ed * 3.6), S = R * 2;
  // 1) Lente: copia o que já está na tela em volta e redesenha em anéis, cada um ampliado (r / r_fonte).
  if (holeBuf.width !== S) { holeBuf.width = S; holeBuf.height = S; }
  holeCtx.clearRect(0, 0, S, S); holeCtx.drawImage(cv, X - R, Y - R, S, S, 0, 0, S, S);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const N = 28;
  for (let i = N - 1; i >= 0; i--) {
    const r1 = R * (i + 1) / N, r0 = R * i / N, r = (r0 + r1) / 2;
    let rs = r - Ed * Ed / r; if (Math.abs(rs) < 4) rs = rs < 0 ? -4 : 4;
    const s = clamp(r / rs, -12, 12);
    ctx.save(); ctx.beginPath(); ctx.arc(X, Y, r1, 0, 7); if (r0 > .5) ctx.arc(X, Y, r0, 0, 7, true); ctx.clip();
    ctx.translate(X, Y); ctx.scale(s, s); ctx.drawImage(holeBuf, -R, -R); ctx.restore();
  }
  ctx.restore();
  // 2) Disco, sombra e anel (no espaço do mundo).
  const x = e.x, y = e.y, sh = E * .62, spin = time * 90;
  const disk = (a0, a1, rx0, rx1, ryK, alpha) => {
    for (let k = 0; k < 9; k++) {
      const rx = rx0 + (rx1 - rx0) * k / 8, hot = 1 - k / 8;
      const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
      g.addColorStop(0, `rgba(255,${200 + hot * 55},${150 + hot * 100},${alpha * (.35 + hot * .65)})`);
      g.addColorStop(.5, `rgba(255,${150 + hot * 60},${60 + hot * 60},${alpha * (.25 + hot * .5)})`);
      g.addColorStop(1, `rgba(${200 - hot * 20},${60 + hot * 40},20,${alpha * (.12 + hot * .25)})`);
      ctx.strokeStyle = g; ctx.lineWidth = sh * .2;
      ctx.setLineDash(k % 3 === 1 ? [sh * .5, sh * .25] : []); ctx.lineDashOffset = -spin * (1.6 - k * .12);
      ctx.beginPath(); ctx.ellipse(x, y, rx, rx * ryK, 0, a0, a1); ctx.stroke();
    }
    ctx.setLineDash([]);
  };
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  glowDot(x, y, sh * 5, "#ffb06a30", "#ff6a1a00");
  disk(Math.PI, Math.PI * 2, sh * 1.45, sh * 3.1, .2, .9);          // parte de trás do disco
  disk(Math.PI, Math.PI * 2, sh * 1.12, sh * 1.75, .92, .8);        // a parte de trás "dobrada" por cima da sombra
  disk(0, Math.PI, sh * 1.08, sh * 1.3, .9, .45);                   // e a imagem fraca por baixo
  ctx.restore();
  ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, sh, 0, 7); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,240,210,.9)"; ctx.lineWidth = Math.max(1.5, sh * .05); ctx.beginPath(); ctx.arc(x, y, sh * 1.03, 0, 7); ctx.stroke();
  disk(0, Math.PI, sh * 1.45, sh * 3.1, .2, 1);                     // frente do disco, passando na frente da sombra
  ctx.restore();
  // Matéria caindo em espiral.
  if (rnd() < .9) { const a = rnd(7), rr = sh * rnd(2.5, 4); particles.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr * .3, vx: -Math.sin(a) * rr * 2.2 - Math.cos(a) * rr * 1.2, vy: (Math.cos(a) * rr * 2.2 - Math.sin(a) * rr * 1.2) * .3, life: .45, max: .45, color: pick(["#ffd8a0", "#ffffff", "#ff8a3a"]), size: rnd(2, 4), g: 0, glow: true }); }
}

// ───────────────────────── Poderes das armas e Mega Buster (desenho) ─────────────────────────
function drawSkillProj(pr, a) {
  const k = pr.kind;
  if (k === "cutter") {
    // Tesoura giratória.
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * 1.4);
    for (const s of [-1, 1]) {
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-2, s * 2); ctx.lineTo(24, s * 11); ctx.lineTo(23, s * 15); ctx.lineTo(-3, s * 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e8eef4"; ctx.beginPath(); ctx.moveTo(0, s * 3); ctx.lineTo(22, s * 11.5); ctx.lineTo(21, s * 13.5); ctx.lineTo(-1, s * 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-9, s * 7, 5, 0, 7); ctx.stroke(); ctx.strokeStyle = "#e83a3a"; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.fillStyle = "#5a6068"; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
  } else if (k === "gutsblock" || k === "rockfrag") {
    const r = k === "gutsblock" ? 22 : 8;
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * (k === "gutsblock" ? .4 : 1));
    ctx.fillStyle = OUT; ctx.fillRect(-r - 2, -r - 2, r * 2 + 4, r * 2 + 4);
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, "#d8b88a"); g.addColorStop(1, "#7a5a3a");
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    if (k === "gutsblock") {
      ctx.strokeStyle = "#5a4028"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r, -4); ctx.lineTo(-6, -2); ctx.lineTo(0, -10); ctx.moveTo(-6, -2); ctx.lineTo(-2, 10); ctx.lineTo(r, 6); ctx.stroke();
      ctx.fillStyle = "#ffffff33"; ctx.fillRect(-r + 3, -r + 3, r * 2 - 6, 5);
    }
  } else if (k === "iceslash") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 26, "#ffffffaa", "#5ac8ff44"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-8, -15); ctx.lineTo(-3, 0); ctx.lineTo(-8, 15); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(-8, 0, 15, 0); g.addColorStop(0, "#5ac8ff"); g.addColorStop(1, "#ffffff");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -11.5); ctx.lineTo(-1.5, 0); ctx.lineTo(-6, 11.5); ctx.closePath(); ctx.fill();
  } else if (k === "hyperbomb") {
    ctx.translate(pr.x, pr.y);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 11); g.addColorStop(0, "#8ae89a"); g.addColorStop(1, "#1a6a3a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.rotate(pr.rot); ctx.fillStyle = "#e8e0a0"; ctx.fillRect(-10, -2, 20, 4);
    ctx.strokeStyle = "#5a4a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(4, -15, 2, -18); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; glowDot(2, -18, 6 + rnd(3), "#ffffff", "#ffb33acc");
  } else if (k === "firestorm") {
    ctx.globalCompositeOperation = "lighter";
    glowDot(pr.x, pr.y, 26, "#fff6c0", "#ff6a1acc");
    for (let i = 0; i < 3; i++) glowDot(pr.x - Math.cos(a) * (10 + i * 9) + rnd(-3, 3), pr.y - Math.sin(a) * (10 + i * 9) + rnd(-3, 3), 14 - i * 3, "#ffd84a", "#ff3a1a88");
  } else if (k === "thunder") {
    ctx.globalCompositeOperation = "lighter"; ctx.translate(pr.x, pr.y); ctx.rotate(a);
    for (const [w, c] of [[12, "#fff27a44"], [6, "#fff27aaa"], [2.5, "#ffffff"]]) {
      ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(-46, 0);
      for (let i = 1; i < 6; i++) ctx.lineTo(-46 + i * 9, (i % 2 ? -7 : 7) + rnd(-2, 2)); ctx.lineTo(8, 0); ctx.stroke();
    }
  } else if (k === "terrabeam") {
    // Lâmina da Terra: meia-lua verde de energia com faíscas (como no Terraria).
    const big = pr.big || 1;
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.scale(big, big); ctx.globalCompositeOperation = "lighter";
    glowDot(-6, 0, 44, "#5aff6a40", "#5aff6a00");
    for (const [r0, c, th] of [[36, "rgba(40,200,60,.32)", 10], [31, "rgba(90,240,80,.5)", 8], [27, "rgba(150,255,110,.55)", 5.5], [24, "rgba(225,255,200,.75)", 2.2]]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-10, 0, r0, -1.15, 1.15); ctx.arc(-10 - th, 0, r0 - th * .55, 1.05, -1.05, true); ctx.closePath(); ctx.fill();
    }
    // Rastro: duas meias-luas mais fracas atrás.
    for (let i = 1; i <= 2; i++) { ctx.fillStyle = `rgba(90,230,100,${.22 / i})`; ctx.beginPath(); ctx.arc(-10 - i * 16, 0, 30 - i * 3, -1.05, 1.05); ctx.arc(-22 - i * 16, 0, 26 - i * 3, .95, -.95, true); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "#ffffff"; for (const [x, y, r] of [[18, -18, 3], [22, 10, 2.4], [8, 26, 2]]) { ctx.beginPath(); ctx.moveTo(x, y - r * 2); ctx.lineTo(x + r * .5, y); ctx.lineTo(x, y + r * 2); ctx.lineTo(x - r * .5, y); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x - r * 2, y); ctx.lineTo(x, y + r * .5); ctx.lineTo(x + r * 2, y); ctx.lineTo(x, y - r * .5); ctx.closePath(); ctx.fill(); }
    if (rnd() < .9) particles.push({ x: pr.x + rnd(-14, 14) * big, y: pr.y + rnd(-22, 22) * big, vx: rnd(-50, 50), vy: rnd(-50, 50), life: .35, max: .35, color: pick(["#7dff6a", "#ffe95a", "#ffffff"]), size: rnd(2, 4), g: 0, glow: true });
  } else if (k === "construct") {
    // Construto do Lanterna: punho, martelo ou serra de luz verde sólida, com rastro.
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.globalCompositeOperation = "lighter";
    const shape = () => {
      ctx.beginPath();
      if (pr.form === 1) { ctx.roundRect(-4, -28, 30, 56, 6); ctx.roundRect(-46, -5, 44, 10, 3); }
      else if (pr.form === 2) { for (let i = 0; i < 24; i++) { const r = i % 2 ? 19 : 27, an = i * Math.PI / 12 + time * 18; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); }
      else { ctx.ellipse(8, 0, 21, 18, 0, 0, 7); ctx.moveTo(-6, -11); ctx.roundRect(-30, -11, 26, 22, 4); }
    };
    // Rastro de cópias mais fracas.
    for (let i = 3; i >= 1; i--) { ctx.save(); ctx.translate(-i * 16, 0); ctx.globalAlpha = .18 / i; shape(); ctx.fillStyle = "#5aff6a"; ctx.fill(); ctx.restore(); }
    glowDot(0, 0, 48, "#7dff6a44", "#2aff4a00");
    shape(); ctx.fillStyle = "rgba(80,255,100,.32)"; ctx.fill();
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(90,255,110,.45)"; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = "#d8ffc8"; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = "#b8ff9a"; ctx.lineWidth = 2;
    if (pr.form === 1) { for (const x of [4, 18]) { ctx.beginPath(); ctx.moveTo(x, -24); ctx.lineTo(x, 24); ctx.stroke(); } }
    else if (pr.form === 2) { ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke(); }
    else { for (const y of [-9, -2, 5]) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(26, y + 1); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(0, -14); ctx.quadraticCurveTo(-4, -4, 4, 4); ctx.stroke(); }
    // Símbolo da lanterna no meio.
    const ex = pr.form === 1 ? 11 : pr.form === 2 ? 0 : -17;
    ctx.save(); ctx.translate(ex, 0); ctx.rotate(-a); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.fillRect(-6, -9, 12, 2); ctx.fillRect(-6, 7, 12, 2); ctx.restore();
    if (rnd() < .6) particles.push({ x: pr.x + rnd(-20, 20), y: pr.y + rnd(-20, 20), vx: rnd(-40, 40), vy: rnd(-40, 40), life: .35, max: .35, color: pick(["#7dff6a", "#c8ffb8"]), size: rnd(2, 3.5), g: 0, glow: true });
  } else if (k === "goldlasso") {
    // Laço dourado trançado girando no ar, ligado à mão.
    const o = pr.owner;
    const braid = (draw) => { for (const [w, c, dash] of [[6, "#5a3406", null], [3.8, "#f2b82a", null], [1.6, "#fff0a0", [4, 4]]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineDashOffset = -time * 60; ctx.beginPath(); draw(); ctx.stroke(); } ctx.setLineDash([]); };
    if (o && o.alive) {
      const mx = (o.rh.x + pr.x) / 2, my = Math.min(o.rh.y, pr.y) - 30;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ffd84a33"; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.quadraticCurveTo(mx, my, pr.x, pr.y); ctx.stroke(); ctx.restore();
      braid(() => { ctx.moveTo(o.rh.x, o.rh.y); ctx.quadraticCurveTo(mx, my, pr.x, pr.y); });
    }
    ctx.translate(pr.x, pr.y); ctx.rotate(time * 14);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 34, "#ffe27a66", "#ffd84a00"); ctx.restore();
    braid(() => ctx.ellipse(0, 0, 21, 13, 0, 0, 7));
    if (rnd() < .7) particles.push({ x: pr.x + rnd(-18, 18), y: pr.y + rnd(-12, 12), vx: rnd(-30, 30), vy: rnd(-60, 0), life: .4, max: .4, color: pick(["#ffe27a", "#ffffff"]), size: rnd(1.5, 3), g: 0, glow: true });
  } else if (k === "windslash") {
    // Meia-lua de vento cortante.
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.scale(pr.big || 1, pr.big || 1); ctx.globalCompositeOperation = "lighter";
    for (const [r0, al] of [[34, .25], [30, .55], [27, .9]]) {
      ctx.fillStyle = `rgba(220,245,255,${al})`; ctx.beginPath(); ctx.arc(-12, 0, r0, -1.15, 1.15); ctx.arc(-24, 0, r0 - 4, 1.0, -1.0, true); ctx.closePath(); ctx.fill();
    }
  } else if (k === "boomaxe") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * (Math.cos(pr.dir) >= 0 ? 1 : -1)); ctx.translate(-WEAPONS.machado.L * .55, 0);
    drawWeaponSprite(ctx, "machado", WEAPONS.machado.L, 1, { icon: true });
  } else if (k === "saberdisc") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * 1.2); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = pr.color + "33"; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(0, 0, 40, 0, 7); ctx.stroke();
    for (const [w, c] of [[14, pr.color + "66"], [7, pr.color], [3, "#ffffff"]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-42, 0); ctx.lineTo(42, 0); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = OUT; ctx.fillRect(-10, -4, 20, 8); ctx.fillStyle = "#9aa3ab"; ctx.fillRect(-8, -2.5, 16, 5);
  } else if (k === "firework") {
    const cols = ["#ff4ad8", "#ffd84a", "#5ac8ff", "#7dff6a", "#ff6a3a"], c = cols[(pr.hue || 0) % 5];
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-4, 0); ctx.stroke();
    ctx.fillStyle = OUT; ctx.fillRect(-8, -5, 14, 10); ctx.fillStyle = c; ctx.fillRect(-6.5, -3.5, 11, 7);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(14, 0); ctx.lineTo(6, 5); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(6, -3.5); ctx.lineTo(12, 0); ctx.lineTo(6, 3.5); ctx.fill();
    ctx.globalCompositeOperation = "lighter"; glowDot(-10, 0, 9 + rnd(4), "#ffffff", c + "aa");
    if (rnd() < .7) particles.push({ x: pr.x, y: pr.y, vx: rnd(-50, 50), vy: rnd(-50, 50), life: .3, max: .3, color: pick([c, "#ffffff"]), size: rnd(1.5, 3), g: 150, glow: true });
  } else if (k === "wreck") {
    // Corrente do mangual até a bola.
    const o = pr.owner;
    if (o && o.alive) { ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.lineTo(pr.x, pr.y); ctx.stroke(); ctx.strokeStyle = "#9aa3ab"; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]); }
    ctx.translate(pr.x, pr.y); ctx.rotate(time * 6); ctx.scale(pr.big || 1, pr.big || 1);
    ctx.fillStyle = OUT; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(an - .25) * 15, Math.sin(an - .25) * 15); ctx.lineTo(Math.cos(an) * 26, Math.sin(an) * 26); ctx.lineTo(Math.cos(an + .25) * 15, Math.sin(an + .25) * 15); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 18); g.addColorStop(0, "#c3cad0"); g.addColorStop(1, "#3a4048");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
  } else if (k === "tidal") {
    // Maremoto: onda que quebra pra frente com espuma.
    const d = Math.sign(pr.vx) || 1; ctx.translate(pr.x, pr.y + 30); ctx.scale(d, 1);
    const g = ctx.createLinearGradient(0, -90, 0, 10); g.addColorStop(0, "#bff0ff"); g.addColorStop(.5, "#3a9ad8"); g.addColorStop(1, "#1a4a8a");
    ctx.globalAlpha = .9; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-90, 10); ctx.quadraticCurveTo(-50, -20, -10, -70); ctx.quadraticCurveTo(20, -100, 40, -80);
    ctx.quadraticCurveTo(20, -78, 18, -60); ctx.quadraticCurveTo(30, -30, 50, 10); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(18 + i * 4 + Math.sin(time * 20 + i) * 3, -82 + i * 4, 6 - i * .6, 0, 7); ctx.fill(); }
    if (rnd() < .8) particles.push({ x: pr.x + rnd(-40, 40), y: pr.y - rnd(0, 60), vx: rnd(-60, 60), vy: rnd(-200, -60), life: .4, max: .4, color: pick(["#ffffff", "#bff0ff"]), size: rnd(2, 4), g: 600 });
  } else if (k === "rocketfist" && pr.glove) {
    // Luva de boxe gigante na mola.
    const o = pr.owner;
    if (o && o.alive) { ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 4; ctx.beginPath(); const n = 14; for (let i = 0; i <= n; i++) { const t = i / n; ctx.lineTo(lerp(o.rh.x, pr.x, t) + (i % 2 ? 8 : -8) * Math.sin(a + Math.PI / 2), lerp(o.rh.y, pr.y, t) + (i % 2 ? 8 : -8) * Math.cos(a)); } ctx.stroke(); }
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.scale(pr.big || 1, pr.big || 1);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(2, 0, 17, 14, 0, 0, 7); ctx.fill(); ctx.fillRect(-16, -9, 12, 18);
    const gg = ctx.createRadialGradient(-2, -5, 2, 2, 0, 16); gg.addColorStop(0, "#ff8a7a"); gg.addColorStop(1, "#b81a1a");
    ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(2, 0, 15, 12, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#f4f0e8"; ctx.fillRect(-14, -7, 9, 14);
    ctx.fillStyle = "#ffffff66"; ctx.beginPath(); ctx.ellipse(0, -6, 7, 3, 0, 0, 7); ctx.fill();
  } else if (k === "rocketfist") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.scale(pr.big || 1, pr.big || 1);
    ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 3; i++) glowDot(-20 - i * 10 + rnd(-3, 3), rnd(-3, 3), 13 - i * 3, "#fff6c0", "#ff7a1acc"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(2, 0, 14, 0, 7); ctx.fill(); ctx.fillRect(-16, -9, 18, 18);
    const g = ctx.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, "#e8f4ff"); g.addColorStop(1, "#5a6a80");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(2, 0, 11.5, 0, 7); ctx.fill(); ctx.fillRect(-14, -7, 16, 14);
    ctx.fillStyle = "#5affd8"; ctx.fillRect(-10, -7, 3, 14);
    ctx.strokeStyle = "#3a4458"; ctx.lineWidth = 1.5; for (const y of [-5, 0, 5]) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(12, y); ctx.stroke(); }
  } else if (k === "tnt") {
    const blink = pr.fuse < 1.2 && Math.sin(time * 26) > 0;
    drawTNT(ctx, pr.x - 24, pr.y - 24, 48);
    if (blink) { ctx.fillStyle = "#ffffffaa"; ctx.fillRect(pr.x - 24, pr.y - 24, 48, 48); }
    if (rnd() < .5) particles.push({ x: pr.x, y: pr.y - 30, vx: rnd(-20, 20), vy: rnd(-80, -30), life: .4, max: .4, color: pick(["#ffd84a", "#ffffff", "#888"]), size: rnd(2, 4), g: 0, glow: true });
  } else if (k === "minecart") {
    drawMinecart(ctx, pr.x, pr.y, 64, pr.wheel || 0);
  } else if (k === "megabomb") {
    const T = BOMB_TYPES[pr.btype || 0], blink = pr.fuse < .8 && Math.sin(time * 40) > 0;
    ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 110, T.glow + "44", T.glow + "00"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(pr.x, pr.y + 4, 58, 0, 7); ctx.fill();
    drawClassicBomb(ctx, pr.x, pr.y + 4, 55, true, pr.btype || 0);
    if (blink) { ctx.globalCompositeOperation = "lighter"; glowDot(pr.x, pr.y, 90, "#ff4a2acc", "#ff3a1a44"); }
  } else if (k === "leaf") {
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * 1.5);
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, 7); ctx.fill();
    const g = ctx.createLinearGradient(0, -5, 0, 5); g.addColorStop(0, "#b8ff8a"); g.addColorStop(1, "#3a9a3a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 10.5, 4.5, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "#2a6a2a"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
  } else if (k === "water") {
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.fillStyle = "#1a5a9acc"; ctx.beginPath(); ctx.ellipse(0, 0, 14, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7ad8ffdd"; ctx.beginPath(); ctx.ellipse(1, -1, 11, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffffcc"; ctx.beginPath(); ctx.ellipse(4, -3, 4, 2, 0, 0, 7); ctx.fill();
  } else if (k === "bfg") {
    // BFG: bola de plasma verde enorme com raios em volta.
    const b = pr.big || 1, r = 24 * b, ph = time * 10;
    ctx.globalCompositeOperation = "lighter";
    glowDot(pr.x, pr.y, r * 3.2, "#7dff5a55", "#2aff2a00");
    ctx.strokeStyle = "rgba(170,255,140,.8)"; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const an = ph * .7 + i * 1.05, l = r * (1.6 + Math.sin(ph + i) * .4); ctx.beginPath(); ctx.moveTo(pr.x, pr.y); for (let j = 1; j <= 4; j++) ctx.lineTo(pr.x + Math.cos(an + rnd(-.3, .3)) * l * j / 4, pr.y + Math.sin(an + rnd(-.3, .3)) * l * j / 4); ctx.stroke(); }
    const g = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, r); g.addColorStop(0, "#ffffff"); g.addColorStop(.35, "#c8ffa0"); g.addColorStop(.75, "#4aff3a"); g.addColorStop(1, "rgba(30,200,30,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pr.x, pr.y, r, 0, 7); ctx.fill();
    if (rnd() < .9) particles.push({ x: pr.x + rnd(-r, r), y: pr.y + rnd(-r, r), vx: rnd(-80, 80), vy: rnd(-80, 80), life: .35, max: .35, color: pick(["#7dff5a", "#e8ffd0"]), size: rnd(2, 5), g: 0, glow: true });
  } else if (k === "swordbeam") {
    // Raio da Espada Mestra: a silhueta da espada em luz azul-clara.
    ctx.translate(pr.x, pr.y); ctx.rotate(a); ctx.globalCompositeOperation = "lighter";
    glowDot(0, 0, 40, "#bfe8ff55", "#5ab8ff00");
    for (const [w, c] of [[9, "rgba(120,200,255,.35)"], [5, "rgba(190,235,255,.75)"], [2, "rgba(255,255,255,1)"]]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-30, -w * .7); ctx.lineTo(14, -w * .7); ctx.lineTo(26 + w, 0); ctx.lineTo(14, w * .7); ctx.lineTo(-30, w * .7); ctx.closePath(); ctx.fill();
      ctx.fillRect(-34, -w * 1.8, 4, w * 3.6);
    }
    if (rnd() < .7) particles.push({ x: pr.x, y: pr.y, vx: rnd(-30, 30), vy: rnd(-30, 30), life: .3, max: .3, color: pick(["#bfe8ff", "#ffffff"]), size: rnd(2, 3), g: 0, glow: true });
  } else if (k === "portal") {
    // Tiro da Arma de Portal: bolinha de energia azul ou laranja com rastro.
    const c = PORTAL_COL[pr.pc || 0];
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = c[1] + "88"; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - Math.cos(a) * 50, pr.y - Math.sin(a) * 50); ctx.stroke();
    glowDot(pr.x, pr.y, 22, "#ffffff", c[1] + "cc");
  } else if (k === "voidorb") {
    // Orbe do vazio: buraco negro pequeno com anel roxo girando.
    ctx.translate(pr.x, pr.y);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 40, "#9a4aff66", "#5a1aff00"); ctx.restore();
    ctx.save(); ctx.rotate(time * 6); ctx.strokeStyle = "#d8a8ff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, 7); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "#050208"; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = "#b06cff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke();
    if (rnd() < .8) { const an = rnd(7), r = rnd(30, 60); particles.push({ x: pr.x + Math.cos(an) * r, y: pr.y + Math.sin(an) * r, vx: -Math.cos(an) * r * 4, vy: -Math.sin(an) * r * 4, life: .25, max: .25, color: pick(["#b06cff", "#ffffff"]), size: rnd(1.5, 3), g: 0, glow: true }); }
  } else if (k === "leviathan") {
    // Machado Leviatã girando no ar, soltando gelo.
    ctx.translate(pr.x, pr.y); ctx.rotate(pr.rot * (Math.cos(pr.dir) >= 0 ? 1 : -1)); ctx.translate(-WEAPONS.machadoLeviata.L * .6, 0);
    drawWeaponSprite(ctx, "machadoLeviata", WEAPONS.machadoLeviata.L, 1, { icon: true });
    if (rnd() < .6) particles.push({ x: pr.x + rnd(-20, 20), y: pr.y + rnd(-20, 20), vx: rnd(-40, 40), vy: rnd(-40, 40), life: .4, max: .4, color: pick(["#bff0ff", "#ffffff"]), size: rnd(2, 4), g: 200, star: true });
  } else if (k === "feather") {
    // Pena negra da Asa Única.
    ctx.translate(pr.x, pr.y); ctx.rotate(a);
    ctx.fillStyle = "#0a0a12"; ctx.beginPath(); ctx.moveTo(16, 0); ctx.quadraticCurveTo(2, -9, -16, -2); ctx.lineTo(-20, 0); ctx.lineTo(-16, 2); ctx.quadraticCurveTo(2, 9, 16, 0); ctx.fill();
    ctx.strokeStyle = "#5a5a7a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(14, 0); ctx.stroke();
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 18, "#8a8aff44", "#4a4aff00");
  } else return false;
  return true;
}
// Tiro do Mega Buster: "limão" amarelo; carregado vira uma bola de energia com cauda.
function drawBusterShot(pr, a) {
  const L = pr.charge || 0;
  ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(a);
  if (!L) {
    ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 16, "#fff6c0aa", "#ffe95a22"); ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#b8860b"; ctx.beginPath(); ctx.ellipse(0, 0, 9.5, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffe95a"; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.ellipse(2, -1.6, 3.6, 2, 0, 0, 7); ctx.fill();
  } else {
    const R = L === 2 ? 27 : 15, c = CHARGE_COLOR[L];
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(-R * 3.4, 0, 0, 0); g.addColorStop(0, c + "00"); g.addColorStop(1, c + "cc");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-R * 3.4, 0); ctx.quadraticCurveTo(-R, -R * 1.05, 0, -R * .85); ctx.lineTo(0, R * .85); ctx.quadraticCurveTo(-R, R * 1.05, -R * 3.4, 0); ctx.fill();
    glowDot(0, 0, R * 1.6, "#ffffffcc", c + "88");
    ctx.lineCap = "round"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-R * .15, 0, R, -1.1, 1.1); ctx.stroke();
    if (L === 2) { ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-R * .55, 0, R * 1.3 + Math.sin(time * 40) * 2.5, -1.15, 1.15); ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(R * .1, 0, R * .55, R * .45, 0, 0, 7); ctx.fill();
    if (rnd() < .9) particles.push({ x: pr.x, y: pr.y, vx: -pr.vx * .15 + rnd(-60, 60), vy: -pr.vy * .15 + rnd(-60, 60), life: .3, max: .3, color: pick([c, "#ffffff"]), size: rnd(2, 4) + L, g: 0, glow: true });
  }
  ctx.restore();
}
// Carregando o Mega Buster: brilho na boca do canhão e o corpo piscando com a carga cheia.
function drawBusterCharge(f, g, t) {
  const s = f.sc, lvl = f.charge >= CHARGE_FULL ? 2 : f.charge >= CHARGE_L1 ? 1 : 0, c = lvl ? CHARGE_COLOR[lvl] : "#ffffff";
  const a = Math.atan2(t.y - g.y, t.x - g.x), mx = t.x + Math.cos(a) * 7 * s, my = t.y + Math.sin(a) * 7 * s;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const pulse = .75 + Math.sin(time * (lvl === 2 ? 40 : 22)) * .25;
  glowDot(mx, my, (9 + lvl * 9 + f.charge * 4) * s * pulse, "#ffffff", c + "aa");
  ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) { const r = (15 + lvl * 8) * s, st = time * (10 + lvl * 6) + i * 2.1; ctx.beginPath(); ctx.arc(mx, my, r, st, st + 1.1); ctx.stroke(); }
  if (lvl === 2 && Math.sin(time * 30) > 0) glowDot(f.neck.x, f.neck.y + 18 * s, 70 * s, c + "40", c + "00");
  ctx.restore();
}
function drawSkillFx(e, layer, k) {
  ctx.save();
  if (layer === "back") {
    if (e.type === "arrowrain") {
      ctx.globalAlpha = Math.min(1, k * 2); ctx.strokeStyle = "#ff4a3a"; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -time * 40;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 3, 120, 14, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ff4a3a33"; ctx.fill();
    } else if (e.type === "oil") {
      const a = clamp((e.life - e.t) / 1, 0, 1) * Math.min(1, e.t * 8);
      ctx.globalAlpha = a * .9; ctx.fillStyle = "#14141c"; ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, 38, 7, 0, 0, 7); ctx.fill();
      const g = ctx.createLinearGradient(e.x - 30, 0, e.x + 30, 0); g.addColorStop(0, "#8a4aff55"); g.addColorStop(.5, "#4affb055"); g.addColorStop(1, "#ffd84a55");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x + Math.sin(e.seed) * 8, e.y - 2.5, 18, 2.5, 0, 0, 7); ctx.fill();
    }
  } else {
    const o = e.owner;
    if (e.type === "spinslash" && o) {
      const p = e.t / e.life, cx = o.neck.x, cy = o.neck.y + 10, st = -Math.PI / 2 + p * Math.PI * 4 * e.dir;
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (const [w, al] of [[20, .2], [9, .5], [3, 1]]) { ctx.globalAlpha = al * k; ctx.strokeStyle = e.color; ctx.lineWidth = w; ctx.beginPath(); if (e.dir > 0) ctx.arc(cx, cy, e.r, st - 2.4, st); else ctx.arc(cx, cy, e.r, st, st + 2.4); ctx.stroke(); }
    } else if (e.type === "slashx") {
      const g = Math.min(1, e.t / .08);
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (const [w, c] of [[12, e.color + "55"], [4, "#ffffff"]]) { ctx.globalAlpha = k; ctx.strokeStyle = c; ctx.lineWidth = w; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(e.x - e.r * g, e.y - s * e.r * g); ctx.lineTo(e.x + e.r * g, e.y + s * e.r * g); ctx.stroke(); } }
    } else if (e.type === "stab") {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k; ctx.lineCap = "round";
      for (const [w, c] of [[8, e.color + "66"], [2.5, "#ffffff"]]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(e.x - e.dir * 34, e.y); ctx.lineTo(e.x + e.dir * 30, e.y); ctx.stroke(); }
    } else if (e.type === "whirl" && o) {
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      const fade = Math.min(1, k * 4, e.t * 6);
      for (let j = 0; j < 5; j++) {
        const y = o.neck.y - 25 * o.sc + j * 24 * o.sc, rx = (55 + j * 12) * o.sc * (e.big ? 1.6 : 1), st = time * 16 + j * 1.3;
        ctx.globalAlpha = .55 * fade; ctx.strokeStyle = j % 2 ? "#cfe0ff" : "#ffffff"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(o.neck.x, y, rx, rx * .28, 0, st, st + 3.6); ctx.stroke();
      }
      ctx.globalAlpha = .25 * fade; ctx.strokeStyle = "#c3cad0"; ctx.lineWidth = 16; ctx.beginPath(); ctx.ellipse(o.neck.x, o.neck.y + 20 * o.sc, 95 * o.sc, 40 * o.sc, 0, 0, 7); ctx.stroke();
    } else if (e.type === "sweeparc" && o) {
      const p = Math.min(1, e.t / (e.life * .6)), cx = o.neck.x, cy = o.neck.y + 15;
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      const a0 = e.dir > 0 ? -1.4 : Math.PI + 1.4, a1 = a0 + e.dir * 2.8 * p;
      for (const [w, al] of [[26, .2], [12, .45], [4, 1]]) { ctx.globalAlpha = al * k; ctx.strokeStyle = e.color; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, e.r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke(); }
    } else if (e.type === "reap" && o) {
      const p = e.t / e.life, cx = o.neck.x, cy = o.neck.y + 10, st = p * Math.PI * 3 * e.dir;
      ctx.lineCap = "round";
      ctx.globalAlpha = .55 * k; ctx.strokeStyle = "#0a2a1a"; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(cx, cy, e.r, st - 1.8, st + 1.8); ctx.stroke();
      ctx.globalCompositeOperation = "lighter";
      for (const [w, al] of [[12, .35], [4, 1]]) { ctx.globalAlpha = al * k; ctx.strokeStyle = "#7dff9a"; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, e.r, st - 1.8, st + 1.8); ctx.stroke(); }
    } else if (e.type === "lasso" && o) {
      const v = e.target, mx = (o.rh.x + v.neck.x) / 2, my = Math.min(o.rh.y, v.neck.y) - 40;
      ctx.lineCap = "round"; ctx.globalAlpha = Math.min(1, k * 3);
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(o.rh.x, o.rh.y); ctx.quadraticCurveTo(mx, my, v.neck.x, v.neck.y + 18 * v.sc); ctx.stroke();
      const rope = e.gold ? "#ffd84a" : "#c8a060";
      if (e.gold) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ffd84a55"; ctx.lineWidth = 12; ctx.stroke(); ctx.restore(); }
      ctx.strokeStyle = rope; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(v.neck.x, v.neck.y + 22 * v.sc, 18 * v.sc, 7 * v.sc, 0, 0, 7); ctx.stroke(); ctx.strokeStyle = rope; ctx.lineWidth = 3; ctx.stroke();
    } else if (e.type === "fireshield" && o) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k * 3);
      for (let i = 0; i < 6; i++) { const an = time * 9 + i * Math.PI / 3; glowDot(o.neck.x + Math.cos(an) * 70 * o.sc, o.neck.y + 22 * o.sc + Math.sin(an) * 70 * o.sc, 17, "#fff6c0", "#ff5a1acc"); }
    } else if (e.type === "mmclock") {
      const r = 60 + (e.t / e.life) * 140;
      ctx.globalAlpha = k; ctx.strokeStyle = "#f0c8ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.stroke();
      ctx.fillStyle = "#8a3ac822"; ctx.fill();
      ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(e.x + Math.cos(an) * r * .85, e.y + Math.sin(an) * r * .85); ctx.lineTo(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r); ctx.stroke(); }
      ctx.lineCap = "round"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(-e.t * 3) * r * .55, e.y + Math.sin(-e.t * 3) * r * .55); ctx.stroke();
      ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(-e.t * 9) * r * .8, e.y + Math.sin(-e.t * 9) * r * .8); ctx.stroke();
    } else if (e.type === "phoenixfx" && o) {
      // Asas de fogo abertas enquanto sobe.
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k * 2);
      const cx = o.neck.x, cy = o.neck.y + 10, flap = Math.sin(e.t * 22) * .25;
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {
        const an = -Math.PI / 2 + s * (1.0 + i * .28 + flap), len = (90 - i * 10) * o.sc;
        glowDot(cx + Math.cos(an) * len * .55, cy + Math.sin(an) * len * .55, 22 - i * 2, "#fff6c0", "#ff5a1aaa");
        ctx.strokeStyle = i % 2 ? "#ffd84a" : "#ff7a1a"; ctx.lineWidth = 6 - i; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(an - s * .3) * len * .6, cy + Math.sin(an - s * .3) * len * .6, cx + Math.cos(an) * len, cy + Math.sin(an) * len); ctx.stroke();
      }
    } else if (e.type === "forcewave") {
      // Ondas da Força: arcos transparentes se abrindo pra frente.
      ctx.lineCap = "round";
      for (let i = 0; i < 4; i++) {
        const r = 40 + (e.t / e.life) * 330 - i * 45; if (r < 20) continue;
        ctx.globalAlpha = k * (.6 - i * .12); ctx.strokeStyle = i % 2 ? "#bfe8ff" : "#ffffff"; ctx.lineWidth = 5 - i;
        ctx.beginPath(); if (e.dir > 0) ctx.arc(e.x, e.y, r, -.8, .8); else ctx.arc(e.x, e.y, r, Math.PI - .8, Math.PI + .8); ctx.stroke();
      }
    } else if (e.type === "bladering" && o) {
      ctx.globalAlpha = Math.min(1, k * 5);
      for (let i = 0; i < 4; i++) {
        const an = time * 9 + i * Math.PI / 2, bx = o.neck.x + Math.cos(an) * 85 * o.sc, by = o.neck.y + 20 + Math.sin(an) * 85 * o.sc;
        ctx.save(); ctx.translate(bx, by);
        if (e.fire) { ctx.rotate(an + Math.PI / 2); drawChaosBlade(ctx, 1.1); ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 26, "#ffd84a88", "#ff3a1a00"); }
        else drawChakram(ctx, 13, time * 20);
        ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ffe9a055"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(o.neck.x, o.neck.y + 20, 85 * o.sc, an - .5, an); ctx.stroke(); ctx.restore();
      }
    } else if (e.type === "blizzard") {
      ctx.globalAlpha = Math.min(1, k * 4, e.t * 4) * .35;
      const g = ctx.createRadialGradient(e.x, e.y, 20, e.x, e.y, 190); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "rgba(191,240,255,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y, 190, 175, 0, 0, 7); ctx.fill();
      ctx.globalAlpha = Math.min(1, k * 4, e.t * 4) * .6; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { const st = time * 3 + i * 2; ctx.beginPath(); ctx.ellipse(e.x, e.y, 150 - i * 30, 55 - i * 10, 0, st, st + 2.2); ctx.stroke(); }
    } else if (e.type === "gravslam" && !e.done) {
      ctx.globalCompositeOperation = "lighter";
      for (const c of e.targets) if (c.alive) {
        ctx.globalAlpha = .7; ctx.strokeStyle = "#c58bff"; ctx.lineWidth = 3;
        for (let i = 0; i < 2; i++) { const r = (40 + i * 18) * c.sc + Math.sin(time * 12 + i) * 4; ctx.beginPath(); ctx.ellipse(c.neck.x, c.neck.y + 25 * c.sc, r, r * .4, 0, 0, 7); ctx.stroke(); }
        glowDot(c.neck.x, c.neck.y + 20 * c.sc, 60 * c.sc, "#c58bff44", "#6a3aff00");
      }
    } else if (e.type === "iaido") {
      // Rastro do corte instantâneo.
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (const [w, c] of [[16, "#ff5a7a44"], [6, "#ff9ab0cc"], [2, "#ffffff"]]) { ctx.globalAlpha = k; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(e.x1, e.y); ctx.lineTo(e.x2, e.y); ctx.stroke(); }
    } else if (e.type === "giantbomb" && o && o.alive && o.sk && o.sk.id === "megabomb") {
      // Bomba crescendo acima da cabeça antes de ser arremessada.
      const g = easeOut(Math.min(1, o.sk.t / .7)), r = 14 + 46 * g, x = o.neck.x, y = o.head.y - 18 - r;
      ctx.globalCompositeOperation = "lighter"; glowDot(x, y, r * 2, BOMB_TYPES[e.btype].glow + "55", "#00000000"); ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y + 3, r + 3, 0, 7); ctx.fill();
      drawClassicBomb(ctx, x, y + 3, r, true, e.btype);
      if (rnd() < .5) particles.push({ x: x + r * .7, y: y - r * 1.9, vx: rnd(-60, 60), vy: rnd(-120, -30), life: .3, max: .3, color: pick(["#ffd84a", "#ffffff"]), size: rnd(2, 4), g: 0, glow: true });
    } else if (e.type === "nova2") {
      const g = easeOut(e.t / .3), r = e.r * g;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = k;
      glowDot(e.x, e.y, r, e.color + "aa", e.color + "00");
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 8 * k; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.stroke();
      ctx.strokeStyle = e.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, r * .7, 0, 7); ctx.stroke();
    } else if (e.type === "giantsword") {
      // Espada (ou punho de pedra) gigante caindo do céu.
      const fall = Math.min(1, e.t / .55), y = lerp(-420, e.y, fall * fall), fade = e.t > e.life - .3 ? (e.life - e.t) / .3 : 1;
      ctx.globalAlpha = clamp(fade, 0, 1);
      if (e.t < .55) { ctx.strokeStyle = "rgba(255,80,60,.6)"; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.ellipse(e.x, e.y - 3, 110, 16, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      ctx.save(); ctx.translate(e.x, y);
      if (e.style === "pan") {
        // Frigideira gigante caindo.
        ctx.fillStyle = OUT; ctx.fillRect(-16, -440, 32, 250);
        ctx.fillStyle = "#26262c"; ctx.fillRect(-12, -436, 24, 246);
        const gp = ctx.createLinearGradient(-110, 0, 110, 0); gp.addColorStop(0, "#1a1a1e"); gp.addColorStop(.4, "#6a6a74"); gp.addColorStop(1, "#1a1a1e");
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -100, 118, 104, 0, 0, 7); ctx.fill();
        ctx.fillStyle = gp; ctx.beginPath(); ctx.ellipse(0, -100, 112, 98, 0, 0, 7); ctx.fill();
        const gi = ctx.createRadialGradient(-30, -130, 10, 0, -100, 92); gi.addColorStop(0, "#5a5a64"); gi.addColorStop(1, "#141418");
        ctx.fillStyle = gi; ctx.beginPath(); ctx.ellipse(0, -100, 92, 80, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffffff22"; ctx.beginPath(); ctx.ellipse(-35, -135, 28, 12, -.5, 0, 7); ctx.fill();
      } else if (e.style === "lantern") {
        // Martelo gigante de luz verde.
        ctx.globalCompositeOperation = "lighter"; glowDot(0, -120, 220, "#7dff6a44", "#7dff6a00");
        ctx.beginPath(); ctx.roundRect(-96, -116, 192, 116, 14); ctx.roundRect(-16, -340, 32, 226, 8);
        ctx.fillStyle = "rgba(90,255,110,.3)"; ctx.fill();
        ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(90,255,110,.45)"; ctx.lineWidth = 16; ctx.stroke();
        ctx.strokeStyle = "#d8ffc8"; ctx.lineWidth = 5; ctx.stroke();
        ctx.strokeStyle = "#b8ff9a"; ctx.lineWidth = 3; for (const x of [-60, 60]) { ctx.beginPath(); ctx.moveTo(x, -106); ctx.lineTo(x, -10); ctx.stroke(); }
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -58, 24, 0, 7); ctx.stroke(); ctx.fillStyle = "#ffffff"; ctx.fillRect(-30, -96, 60, 7); ctx.fillRect(-30, -27, 60, 7);
        ctx.globalCompositeOperation = "source-over";
      } else if (e.style === "fist") {
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(0, -60, 72, 78, 0, 0, 7); ctx.fill(); ctx.fillRect(-46, -230, 92, 170);
        const gf = ctx.createLinearGradient(-70, 0, 70, 0); gf.addColorStop(0, "#b0a090"); gf.addColorStop(1, "#5a4a3a");
        ctx.fillStyle = gf; ctx.beginPath(); ctx.ellipse(0, -60, 66, 72, 0, 0, 7); ctx.fill(); ctx.fillRect(-40, -230, 80, 170);
        ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 4; for (const x of [-30, -8, 14, 36]) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, -55); ctx.stroke(); }
        ctx.fillStyle = "#7dff9a55"; ctx.beginPath(); ctx.arc(-20, -120, 9, 0, 7); ctx.arc(22, -150, 7, 0, 7); ctx.fill();
      } else {
        ctx.globalCompositeOperation = "lighter"; glowDot(0, -200, 170, "#bff0ff55", "#bff0ff00"); ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(-30, -40); ctx.lineTo(-30, -330); ctx.lineTo(30, -330); ctx.lineTo(30, -40); ctx.closePath(); ctx.fill();
        const gs = ctx.createLinearGradient(-26, 0, 26, 0); gs.addColorStop(0, "#9aa8b8"); gs.addColorStop(.5, "#ffffff"); gs.addColorStop(1, "#7a889a");
        ctx.fillStyle = gs; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-25, -40); ctx.lineTo(-25, -325); ctx.lineTo(25, -325); ctx.lineTo(25, -40); ctx.closePath(); ctx.fill();
        ctx.fillStyle = OUT; ctx.fillRect(-80, -350, 160, 28); ctx.fillStyle = "#e8b84a"; ctx.fillRect(-76, -346, 152, 20);
        ctx.fillStyle = "#5a3a1a"; ctx.fillRect(-14, -450, 28, 100); ctx.fillStyle = "#e8b84a"; ctx.beginPath(); ctx.arc(0, -458, 18, 0, 7); ctx.fill();
        ctx.fillStyle = "#5ac8ff"; ctx.beginPath(); ctx.arc(0, -336, 9, 0, 7); ctx.fill();
      }
      ctx.restore();
    } else if (e.type === "toyhammer" && o) {
      // Martelo de brinquedo gigante descendo em arco.
      const sw = Math.min(1, e.t / .45), ang = (-2.2 + sw * sw * 2.4) * e.dir, px = o.neck.x, py = o.neck.y + 10;
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.scale(e.dir, 1);
      ctx.fillStyle = OUT; ctx.fillRect(-10, -260, 20, 260); ctx.fillStyle = "#ffd84a"; ctx.fillRect(-7, -258, 14, 256);
      ctx.fillStyle = OUT; roundRect(ctx, -90, -340, 180, 100, 30); ctx.fill();
      ctx.fillStyle = "#e83a5a"; roundRect(ctx, -86, -336, 172, 92, 26); ctx.fill();
      ctx.fillStyle = "#5ac8ff"; roundRect(ctx, -86, -336, 30, 92, 12); ctx.fill(); roundRect(ctx, 56, -336, 30, 92, 12); ctx.fill();
      ctx.fillStyle = "#ffffff55"; roundRect(ctx, -60, -330, 120, 18, 9); ctx.fill();
      ctx.restore();
    } else if (e.type === "stormcloud" && e.x !== undefined) {
      ctx.globalAlpha = Math.min(1, k * 4, e.t * 4) * .9;
      for (const [dx, dy, r] of [[-60, 10, 40], [-20, -10, 55], [30, 0, 48], [70, 14, 36]]) { ctx.fillStyle = "#3a3a4a"; ctx.beginPath(); ctx.arc(e.x + dx, e.y + dy, r, 0, 7); ctx.fill(); }
      for (const [dx, dy, r] of [[-30, -18, 30], [20, -20, 32]]) { ctx.fillStyle = "#5a5a6a"; ctx.beginPath(); ctx.arc(e.x + dx, e.y + dy, r, 0, 7); ctx.fill(); }
    } else if (e.type === "wallcrack") { drawWallCrack(e, k);
    } else if (e.type === "portal") {
      // Portal: elipse brilhando no chão, na parede ou no teto.
      const c = PORTAL_COL[e.c], op = easeOut(Math.min(1, e.t / .2)) * clamp((e.life - e.t) / .5, 0, 1), vert = e.ny === 0;
      const rx = (vert ? 12 : 46) * op, ry = (vert ? 52 : 12) * op;
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 70 * op + 1, c[1] + "66", c[1] + "00");
      ctx.fillStyle = "#06080e"; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.fill();
      for (const [w2, col] of [[9, c[1] + "88"], [4, c[0]], [1.5, "#ffffff"]]) { ctx.strokeStyle = col; ctx.lineWidth = w2; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 7); ctx.stroke(); }
      ctx.strokeStyle = c[0] + "99"; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const st = time * 5 + i * 2.1; ctx.beginPath(); ctx.ellipse(0, 0, rx * .7, ry * .7, 0, st, st + 1.4); ctx.stroke(); }
      ctx.restore();
      if (rnd() < .4) particles.push({ x: e.x + rnd(-rx, rx), y: e.y + rnd(-ry, ry), vx: e.nx * 60 + rnd(-20, 20), vy: e.ny * 60 + rnd(-20, 20), life: .5, max: .5, color: c[0], size: rnd(1.5, 3), g: 0, glow: true });
    } else if (e.type === "portalfx") {
      const c = PORTAL_COL[e.c], op = Math.sin(Math.min(1, e.t / e.life) * Math.PI);
      ctx.globalCompositeOperation = "lighter"; glowDot(e.x, e.y, 80 * op + 1, c[1] + "88", c[1] + "00");
      ctx.strokeStyle = c[0]; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(e.x, e.y, 50 * op + 1, 14 * op + 1, 0, 0, 7); ctx.stroke();
    } else if (e.type === "lightpillar") {
      // Coluna de luz: aviso dourado no chão e depois o feixe descendo do céu.
      if (e.t < 0) {
        if (e.t > -.45) { ctx.strokeStyle = `rgba(255,226,122,${.5 + Math.sin(time * 20) * .3})`; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.ellipse(e.x, e.y - 3, 70, 13, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      } else {
        const p = e.t / e.life, w2 = 70 * (1 - p * .6), al = 1 - p;
        ctx.globalCompositeOperation = "lighter";
        for (const [ww, c] of [[1, `rgba(255,220,120,${.35 * al})`], [.6, `rgba(255,240,180,${.6 * al})`], [.25, `rgba(255,255,255,${al})`]]) {
          const gr = ctx.createLinearGradient(0, 0, 0, e.y); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(.3, c); gr.addColorStop(1, c);
          ctx.fillStyle = gr; ctx.fillRect(e.x - w2 * ww, 0, w2 * ww * 2, e.y);
        }
        glowDot(e.x, e.y - 10, 110 * al + 1, "#fff6c0aa", "#ffd84a00");
      }
    } else if (e.type === "triforce" && o) {
      // Triforce dourada girando acima da cabeça.
      const op = Math.min(1, e.t * 4, (e.life - e.t) * 3), cx = o.neck.x, cy = o.head.y - 130, R = 70;
      ctx.globalAlpha = clamp(op, 0, 1); ctx.translate(cx, cy + Math.sin(time * 4) * 8); ctx.rotate(Math.sin(time * 2) * .08); ctx.scale(.6 + easeOut(Math.min(1, e.t * 3)) * .4, .6 + easeOut(Math.min(1, e.t * 3)) * .4);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(0, 0, 140, "#ffe27a66", "#ffd84a00"); ctx.restore();
      const tri = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * .9, y + s * .55); ctx.lineTo(x - s * .9, y + s * .55); ctx.closePath(); };
      for (const [x, y] of [[0, -R * .5], [-R * .45, R * .28], [R * .45, R * .28]]) {
        tri(x, y, R * .5); ctx.fillStyle = "#3a2a08"; ctx.fill();
        tri(x, y, R * .44); const gt = ctx.createLinearGradient(0, y - R * .5, 0, y + R * .3); gt.addColorStop(0, "#fff6c0"); gt.addColorStop(1, "#e8a82a"); ctx.fillStyle = gt; ctx.fill();
      }
    } else if (e.type === "trinity" && e.t > -.25 && o) {
      // Trinity Limit: estrelas de luz se formando nos 3 cantos.
      const tg = foesOf(o, 1400), c0 = tg.length ? tg[e.idx % tg.length] : null;
      const x = e.x ?? (c0 ? c0.neck.x : o.neck.x + Math.cos(e.ang) * 150), y = e.y ?? (c0 ? c0.neck.y + 10 : o.neck.y + 20 + Math.sin(e.ang) * 150), p = e.t < 0 ? (e.t + .25) / .25 : 1 - e.t / e.life;
      ctx.globalCompositeOperation = "lighter"; glowDot(x, y, 60 * p + 1, "#fff6c0cc", "#ffd84a00");
      ctx.strokeStyle = `rgba(255,236,150,${p})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.neck.x, o.neck.y + 20); ctx.lineTo(x, y); ctx.stroke();
    } else if (e.type === "creeper" && e.t > 0) {
      // Creeper: bloco verde que pisca branco e incha antes de explodir.
      const sw = e.t > .8 ? 1 + (e.t - .8) * .5 + Math.sin(e.t * 40) * .03 : 1, flash = e.t > .7 && Math.floor(e.t * 10) % 2 === 0, rise = Math.min(1, e.t / .25);
      if (e.t < 1.25) {
        ctx.translate(e.x, e.y); ctx.scale(sw, sw);
        const p = 6, col = (c) => flash ? "#ffffff" : c;
        ctx.fillStyle = col("#3a8a2a"); ctx.fillRect(-12, -84 * rise, 24, 60 * rise); // corpo
        ctx.fillStyle = col("#4aa83a"); ctx.fillRect(-15, -108 * rise, 30, 30); // cabeça
        ctx.fillStyle = col("#2a6a1a"); for (const [x, y] of [[-12, -100], [6, -104], [-4, -90], [8, -86], [-14, -60], [4, -50]]) ctx.fillRect(x, y * rise, p, p);
        ctx.fillStyle = flash ? "#ffffff" : "#0e1a0a"; ctx.fillRect(-10, -100 * rise, 7, 7); ctx.fillRect(3, -100 * rise, 7, 7); ctx.fillRect(-3, -93 * rise, 6, 9); ctx.fillRect(-7, -87 * rise, 4, 6); ctx.fillRect(3, -87 * rise, 4, 6);
        ctx.fillStyle = col("#3a8a2a"); ctx.fillRect(-14, -24, 10, 24); ctx.fillRect(4, -24, 10, 24);
      }
    } else if (e.type === "gravcone") {
      // Arma da Gravidade: onda de energia laranja em cone (ou azul na Super Gravidade).
      const p = e.t / e.life, R = (e.big ? 420 : 280) * (e.pull ? 1 - p * .7 : .3 + p * .7), col = e.big ? "90,180,255" : "255,160,60";
      ctx.globalCompositeOperation = "lighter"; ctx.translate(e.x, e.y); ctx.rotate(e.ang);
      for (let i = 0; i < 3; i++) { const rr = R * (1 - i * .22); ctx.strokeStyle = `rgba(${col},${(1 - p) * (.7 - i * .18)})`; ctx.lineWidth = 6 - i * 1.5; ctx.beginPath(); ctx.arc(0, 0, rr, -.55, .55); ctx.stroke(); }
      const gc = ctx.createRadialGradient(0, 0, 5, 0, 0, R); gc.addColorStop(0, `rgba(${col},${.35 * (1 - p)})`); gc.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gc; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -.55, .55); ctx.closePath(); ctx.fill();
    } else if (e.type === "mcsweep") {
      // Partícula de varredura do Minecraft: meia-lua branca.
      const p = e.t / e.life; ctx.globalAlpha = 1 - p; ctx.translate(e.x, e.y); ctx.scale(e.dir, 1);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 10 * (1 - p) + 2; ctx.lineCap = "butt";
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-30, 0, 70, -1 + i * .4, -.75 + i * .4); ctx.stroke(); }
    } else if (e.type === "blackwing" && o && o.alive) {
      // Asa Única: asa negra aberta nas costas.
      const op = Math.min(1, e.t * 3, (e.life - e.t) * 3), bx = o.neck.x - o.facing * 10, by = o.neck.y + 5, fl = Math.sin(e.t * 6) * .12;
      ctx.globalAlpha = clamp(op, 0, 1);
      for (let i = 0; i < 9; i++) {
        const an = -Math.PI / 2 - o.facing * (.2 + i * .17 + fl), len = (150 - Math.abs(i - 3) * 14) * o.sc;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(an);
        ctx.fillStyle = i % 2 ? "#0a0a12" : "#1a1a2a"; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(len * .6, -16, len, 0); ctx.quadraticCurveTo(len * .6, 14, 0, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    } else if (e.type === "deathscythe") {
      // Foice da Morte: aviso vermelho e depois ela voa girando.
      if (e.t < e.warn) {
        const a = .4 + Math.sin(time * 24) * .3;
        ctx.strokeStyle = `rgba(255,40,60,${a})`; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(W, e.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#ff3a4a"; ctx.font = "bold 46px Georgia"; ctx.textAlign = "center"; ctx.fillText("!", e.x + 140, e.y + 16);
      } else {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(197,139,255,.3)"; ctx.lineWidth = 40; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(e.x - 160, e.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(time * 16); ctx.translate(0, 10); drawScythe(.45); ctx.restore();
      }
    } else if (e.type === "racefirework" && e.t > 0) {
      const p = e.t / e.life, r = easeOut(Math.min(1, p * 1.6)) * 130;
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 - p;
      for (let i = 0; i < 18; i++) { const an = i * Math.PI / 9; glowDot(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r + p * p * 60, 7, "#ffffff", e.col); }
      glowDot(e.x, e.y, Math.max(1, 40 * (1 - p)), e.col, "#00000000");
    } else if (e.type === "terragiant" && o && o.alive && o.sk && o.sk.id === "terrastorm") {
      // Lâmina da Terra gigante: aparece em cima da cabeça, corta 4 vezes e sobe pra cravar no chão.
      const k = o.sk, fc = o.facing, grow = easeOut(Math.min(1, k.t / .45)), S = 1.2 + 2.2 * grow;
      let local = -Math.PI / 2 + Math.sin(time * 3) * .08, from = null;
      const i = TERRA_SLASHES.findLastIndex(v => k.t >= v);
      if (i >= 0 && k.t < 1.62) {
        const p = easeOut(clamp((k.t - TERRA_SLASHES[i]) / .14, 0, 1)), down = i % 2 === 0;
        const a0 = down ? -2.4 : .9, a1 = down ? .9 : -2.4;
        local = lerp(a0, a1, p); if (p < 1) from = a0;
      } else if (k.t >= 1.62) local = -Math.PI / 2 - .3;
      const ang = fc > 0 ? local : Math.PI - local, px = k.t < .45 ? o.neck.x : o.rh.x, py = k.t < .45 ? o.head.y - 50 : o.rh.y;
      ctx.globalAlpha = clamp(Math.min(e.t * 4, (e.life - e.t) * 6), 0, 1);
      if (from !== null) {
        // Rastro do corte em arco.
        const fa = fc > 0 ? from : Math.PI - from, R = 74 * S;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
        for (const [w, c] of [[60, "rgba(90,255,100,.18)"], [30, "rgba(150,255,130,.45)"], [8, "rgba(240,255,230,.9)"]]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(px, py, R * .82, Math.min(fa, ang), Math.max(fa, ang)); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(ang); ctx.scale(S, S);
      ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(40, 0, 70, `rgba(110,255,90,${.4 + Math.sin(time * 14) * .1})`, "#5aff6a00"); ctx.restore();
      drawWeaponShape(ctx, "laminaTerra", 74, 1, {});
      ctx.restore();
    } else if (e.type === "terraslam") {
      // Lâmina gigante cravada no chão, rachaduras verdes brilhando.
      const k = clamp(Math.min(e.t * 8, (e.life - e.t) / .35), 0, 1), drop = easeOut(Math.min(1, e.t / .1));
      ctx.globalAlpha = k;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const an = Math.PI + (i + .5) * Math.PI / 7, len = 90 + (i * 37 % 60) * 1.4;
        ctx.strokeStyle = "rgba(125,255,106,.75)"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(an) * len * .5, e.y + 6 + (i % 2 ? 4 : -2)); ctx.lineTo(e.x - Math.cos(an) * len * .02 + Math.cos(an) * len, e.y + 3); ctx.stroke();
      }
      glowDot(e.x, e.y - 80, 160, "#7dff6a55", "#7dff6a00");
      ctx.restore();
      ctx.save(); ctx.translate(e.x, e.y - 260 * (1 - drop) - 5); ctx.rotate(Math.PI / 2); ctx.scale(3.2, 3.2); ctx.translate(-74, 0);
      drawWeaponShape(ctx, "laminaTerra", 74, 1, {});
      ctx.restore();
    } else if (e.type === "bracelets" && o) {
      // Braceletes da Mulher-Maravilha brilhando (rebatem tiros).
      ctx.globalCompositeOperation = "lighter";
      // Escudo dourado girando na frente e os braceletes prateados brilhando nos pulsos.
      const cx = o.neck.x + o.facing * 34 * o.sc, cy = o.neck.y + 18 * o.sc, R = 62 * o.sc;
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) { const st = time * 7 + i * 2.1; ctx.strokeStyle = `rgba(255,216,74,${.55 - i * .12})`; ctx.lineWidth = 7 - i * 2; ctx.beginPath(); ctx.arc(cx, cy, R + i * 9, st, st + 1.3); ctx.stroke(); }
      glowDot(cx, cy, R * 1.1, "#ffe27a22", "#ffd84a00");
      ctx.globalCompositeOperation = "source-over";
      for (const h of [o.rh, o.lh]) {
        const an = Math.atan2(h.y - o.neck.y, h.x - o.neck.x);
        ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(h.x, h.y, 26 + Math.sin(time * 20) * 4, "#fff6c0cc", "#ffd84a00"); ctx.restore();
        ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(an);
        ctx.fillStyle = OUT; ctx.fillRect(-12, -8, 14, 16);
        const gb = ctx.createLinearGradient(0, -7, 0, 7); gb.addColorStop(0, "#ffffff"); gb.addColorStop(.5, "#c8d2dc"); gb.addColorStop(1, "#6a7480");
        ctx.fillStyle = gb; ctx.fillRect(-10.5, -6.5, 11, 13);
        ctx.fillStyle = "#e8b84a"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 1.6 : 3.6, a2 = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(-5 + Math.cos(a2) * r, Math.sin(a2) * r); } ctx.fill();
        ctx.restore();
      }
    } else if (e.type === "concert" && o) {
      // Concerto da Miku: holofotes e caixas de som.
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k * 4, e.t * 4);
      for (let i = 0; i < 4; i++) {
        const sx = 200 + i * 400, sw = Math.sin(time * 2 + i) * 160, col = i % 2 ? "rgba(57,197,187,.16)" : "rgba(255,111,181,.16)";
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx - 20, 0); ctx.lineTo(sx + 20, 0); ctx.lineTo(sx + sw + 140, FLOOR); ctx.lineTo(sx + sw - 140, FLOOR); ctx.fill();
      }
      glowDot(o.neck.x, o.neck.y, 160, "#39c5bb44", "#39c5bb00");
    } else if (e.type === "gust") {
      // Bomba de ar: anéis de vento se abrindo.
      ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        const r = (60 + i * 50) + (e.t / e.life) * 260, st = time * 10 + i * 2;
        ctx.globalAlpha = k * (.7 - i * .15); ctx.strokeStyle = i % 2 ? "#bff0ff" : "#ffffff"; ctx.lineWidth = 6 - i * 1.5;
        for (const off of [0, Math.PI]) { ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * .55, 0, st + off, st + off + 1.9); ctx.stroke(); }
      }
    } else if (e.type === "vinewhip") {
      // Chicote de cipó: dois cipós estalando até o alvo.
      const g = Math.min(1, e.t / .12);
      ctx.globalAlpha = Math.min(1, k * 3); ctx.lineCap = "round";
      for (const s of [-1, 1]) {
        const mx = (e.x1 + e.x2) / 2, my = Math.min(e.y1, e.y2) - 50 - s * 20, x2 = lerp(e.x1, e.x2, g), y2 = lerp(e.y1, e.y2, g);
        ctx.beginPath(); ctx.moveTo(e.x1, e.y1); ctx.quadraticCurveTo(mx, my, x2, y2);
        ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = "#4ab84a"; ctx.lineWidth = 4; ctx.stroke();
      }
    } else if (e.type === "oilboard" && o && o.alive) {
      const x = o.pelvis.x, y = Math.max(o.lf.y, o.rf.y) + 6 * o.sc, d = Math.cos(o.aim) >= 0 ? 1 : -1;
      ctx.globalAlpha = Math.min(1, k * 4);
      ctx.fillStyle = "#14141c"; ctx.beginPath(); ctx.moveTo(x - d * 50, y - 26); ctx.quadraticCurveTo(x - d * 40, y - 4, x - d * 10, y - 2); ctx.lineTo(x + d * 42, y - 2); ctx.quadraticCurveTo(x + d * 50, y + 6, x + d * 30, y + 8); ctx.lineTo(x - d * 46, y + 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#d8d0a0aa"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - d * 44, y - 18); ctx.quadraticCurveTo(x - d * 34, y - 5, x - d * 6, y - 4); ctx.lineTo(x + d * 36, y - 4); ctx.stroke();
      for (let i = 0; i < 2; i++) particles.push({ x: x - d * rnd(30, 50), y: y + rnd(-10, 6), vx: -d * rnd(80, 200), vy: rnd(-200, -60), life: .4, max: .4, color: pick(["#14141c", "#2a2a3a", "#d8d0a0"]), size: rnd(2, 4), g: 700 });
    }
  }
  ctx.restore();
}
// Mochila a jato nas costas (com fogo quando está impulsionando).
function drawJetpack(f) {
  const s = f.sc, fx = Math.cos(f.aim) >= 0 ? 1 : -1, x = f.neck.x - fx * 11 * s, y = f.neck.y + 4 * s;
  for (const dx of [-5, 5]) {
    const tx = x + dx * s * .8;
    if (f.jetT > 0 || f.holdOn) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(tx, y + 36 * s, (14 + rnd(6)) * s, "#fff6c0", "#ff7a1acc"); ctx.restore(); }
    if (f.holdOn) {
      const len = (46 + rnd(18)) * s, gj = ctx.createLinearGradient(0, y + 26 * s, 0, y + 26 * s + len); gj.addColorStop(0, "#ffffff"); gj.addColorStop(.3, "#ffd84a"); gj.addColorStop(.7, "#ff6a1a"); gj.addColorStop(1, "rgba(255,40,10,0)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = gj; ctx.beginPath(); ctx.moveTo(tx - 4 * s, y + 26 * s); ctx.lineTo(tx + rnd(-3, 3) * s, y + 26 * s + len); ctx.lineTo(tx + 4 * s, y + 26 * s); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = OUT; ctx.fillRect(tx - 5 * s, y - 2 * s, 10 * s, 30 * s);
    ctx.fillStyle = "#c3cad0"; ctx.fillRect(tx - 3.5 * s, y, 7 * s, 26 * s); ctx.fillStyle = "#e84a2a"; ctx.fillRect(tx - 3.5 * s, y + 6 * s, 7 * s, 4 * s);
    ctx.fillStyle = "#4a5260"; ctx.beginPath(); ctx.moveTo(tx - 4 * s, y + 26 * s); ctx.lineTo(tx + 4 * s, y + 26 * s); ctx.lineTo(tx + 5.5 * s, y + 32 * s); ctx.lineTo(tx - 5.5 * s, y + 32 * s); ctx.fill();
  }
}
// Plataformas temporárias do Bloco Mágico (piscam antes de sumir).
function drawTempBlocks() {
  for (const p of PLATFORMS) {
    if (!p.temp || (p.life < 1.2 && Math.sin(time * 25) > 0)) continue;
    drawGrassBlock(ctx, p.x, p.y, p.w || 60);
    if (!p.block) continue;
    // Rachaduras conforme o bloco apanha (estilo Minecraft) e piscada branca no golpe.
    const dmg = 1 - p.hp / BLOCK_HP;
    if (dmg > .05) {
      ctx.strokeStyle = "rgba(20,10,5,.75)"; ctx.lineWidth = 2;
      const cr = [[25, 25, 8, 6], [25, 25, 44, 14], [25, 25, 14, 44], [25, 25, 40, 40], [25, 25, 4, 30], [25, 25, 34, 2]];
      for (let i = 0; i < Math.ceil(dmg * cr.length); i++) { const [x1, y1, x2, y2] = cr[i]; ctx.beginPath(); ctx.moveTo(p.x + x1, p.y + y1); ctx.lineTo(p.x + (x1 + x2) / 2 + 4, p.y + (y1 + y2) / 2 - 3); ctx.lineTo(p.x + x2, p.y + y2); ctx.stroke(); }
    }
    if (p.hitT > 0) { ctx.fillStyle = `rgba(255,255,255,${p.hitT * 3})`; ctx.fillRect(p.x, p.y, p.w, 50); }
  }
}
// Guarda-chuva aberto acima da cabeça enquanto plana.
function drawOpenUmbrella(f) {
  const s = f.sc, hx = f.rh.x, hy = f.rh.y, tx = hx, ty = f.head.y - 48 * s, w = 46 * s;
  ctx.strokeStyle = OUT; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
  ctx.strokeStyle = "#5c656c"; ctx.lineWidth = 2.5 * s; ctx.stroke();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(tx, ty + 4 * s, w + 3 * s, 30 * s, 0, Math.PI, 0); ctx.fill();
  for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? "#ffd84a" : "#2a6ad8"; ctx.beginPath(); ctx.moveTo(tx, ty - 26 * s); ctx.ellipse(tx, ty + 4 * s, w, 27 * s, 0, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = "#ffffff44"; ctx.beginPath(); ctx.ellipse(tx - w * .35, ty - 12 * s, w * .2, 6 * s, -.4, 0, 7); ctx.fill();
  ctx.fillStyle = "#c3cad0"; ctx.beginPath(); ctx.arc(tx, ty - 28 * s, 3 * s, 0, 7); ctx.fill();
}
function drawBomb() {
  if (!bomb || !bomb.holder || !bomb.holder.alive) return;
  const h = bomb.holder, s = h.sc, urgent = bomb.t < 5, beat = urgent ? Math.sin(time * (bomb.t < 2 ? 40 : 22)) : Math.sin(time * 6);
  const x = h.head.x, y = h.head.y - 46 * s - (h.hat === "chapeu" || h.hat === "cartola" ? 16 : 0), r = 15 * s * (1 + Math.max(0, beat) * (urgent ? .15 : .05));
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  glowDot(h.pelvis.x, h.pelvis.y - 20, 90 * s, urgent ? "#ff3a1a44" : "#ff6a4a22", "#ff3a1a11");
  if (urgent && beat > 0) glowDot(x, y, r * 3, "#ff4a2acc", "#ff3a1a44");
  ctx.restore();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, 7); ctx.fill();
  ctx.fillStyle = urgent && beat > 0 ? "#5a1410" : "#22252c"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(x - r * .35, y - r * .35, r * .3, 0, 7); ctx.fill();
  ctx.fillStyle = "#5c656c"; ctx.fillRect(x - 4 * s, y - r - 5 * s, 8 * s, 6 * s);
  // Pavio que vai encurtando, com faísca na ponta.
  const fl = (6 + 12 * clamp(bomb.t / bomb.max, 0, 1)) * s, fx2 = x + fl * .6, fy = y - r - 5 * s - fl;
  ctx.strokeStyle = "#c9a86a"; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(x, y - r - 5 * s); ctx.quadraticCurveTo(x + fl * .1, fy + fl * .3, fx2, fy); ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(fx2, fy, (8 + rnd(4)) * s, "#ffffff", "#ffb34acc"); ctx.restore();
  if (rnd() < .7) particles.push({ x: fx2, y: fy, vx: rnd(-90, 90), vy: rnd(-140, 20), life: .25, max: .25, color: pick(["#ffd84a", "#ff7a1a", "#fff"]), size: rnd(1.5, 3), g: 400, glow: true });
  if (urgent) textShadow(String(Math.max(1, Math.ceil(bomb.t))), x, y - r - 30 * s, "#ff6a4a", `bold ${Math.round(30 * s)}px Georgia`);
}
function drawZombieHUD() {
  if (!zw) return;
  const left = zombiesLeft(), w = 420, x = W / 2 - w / 2;
  ctx.fillStyle = "#000a"; roundRect(ctx, x, 12, w, 54, 14); ctx.fill();
  ctx.strokeStyle = "#9adf6a66"; ctx.lineWidth = 2; roundRect(ctx, x, 12, w, 54, 14); ctx.stroke();
  textShadow(`ONDA ${zw.wave}`, W / 2, 48, "#9adf6a", "bold 30px Georgia");
  ctx.font = "16px Georgia"; ctx.fillStyle = "#c9b896"; ctx.textAlign = "left";
  ctx.fillText(zw.breakT > 0 ? `próxima em ${Math.ceil(zw.breakT)}s` : `🧟 ${left} restantes`, x + 16, 45);
  ctx.textAlign = "right"; ctx.fillText(`Recorde: onda ${Math.max(zRecord, 0)}`, x + w - 16, 45);
  // Jogadores com o número de zumbis derrubados.
  const list = [...players.values()].filter(p => p.connected && (p.team === "heroi"));
  ctx.font = "600 15px Georgia";
  const items = list.map(p => ({ p, w: ctx.measureText(p.name).width + 66 }));
  let xx = W / 2 - (items.reduce((a, i) => a + i.w + 8, 0) - 8) / 2;
  for (const { p, w: iw } of items) {
    const f = fighters.find(f => f.id === p.id), dead = !f || !f.alive;
    ctx.globalAlpha = dead ? .5 : 1;
    ctx.fillStyle = "#0009"; roundRect(ctx, xx, 74, iw, 26, 13); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(xx + 13, 87, 5, 0, 7); ctx.fill();
    ctx.fillStyle = "#f3e6c8"; ctx.textAlign = "left"; ctx.fillText(p.name, xx + 23, 92);
    ctx.fillStyle = "#9adf6a"; ctx.textAlign = "right"; ctx.fillText(`☠${p.kills || 0}`, xx + iw - 10, 92);
    xx += iw + 8;
  }
  ctx.globalAlpha = 1;
}
// Tela de Personagens: todo mundo grande, lado a lado, num palco com holofote.
function drawLooks() {
  const k = easeOut(phaseT / .4);
  ctx.fillStyle = `rgba(10,7,5,${.8 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = k;
  textShadow("Escolham seus personagens", W / 2, 72, "#e8b84a", "bold 44px Georgia");
  ctx.font = "20px Georgia"; ctx.fillStyle = "#c9b896"; ctx.textAlign = "left"; ctx.fillText("Cor, roupa e chapéu no celular", 34, 72);
  ctx.textAlign = "right"; ctx.fillStyle = looksT < 10 ? "#ff8a6a" : "#f3e6c8"; ctx.fillText(`${Math.ceil(Math.max(0, looksT))}s`, W - 34, 72);
  const list = [...players.values()].filter(p => p.connected), n = Math.max(1, list.length);
  const slot = Math.min(330, (W - 60) / n), kk = Math.min(3.3, slot / 64), floor = H - 175;
  list.forEach((p, i) => {
    const cx = W / 2 + (i - (n - 1) / 2) * slot, a = easeOut((phaseT - .1 - i * .07) / .35);
    ctx.globalAlpha = k * a;
    // Holofote na cor do jogador.
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const cone = ctx.createLinearGradient(0, 100, 0, floor);
    cone.addColorStop(0, p.color + "00"); cone.addColorStop(1, p.color + "30");
    ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(cx - 18, 100); ctx.lineTo(cx + 18, 100); ctx.lineTo(cx + slot * .42, floor); ctx.lineTo(cx - slot * .42, floor); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.beginPath(); ctx.ellipse(cx, floor + 2, 34 * kk, 7 * kk, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = p.color + "88"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, floor + 2, 40 * kk, 9 * kk, 0, 0, 7); ctx.stroke();
    drawLookPreview(ctx, p, cx - 4 * kk, floor - 44 * kk + (1 - a) * 80, kk, time + i * .7);
    textShadow(p.name, cx, floor + 48, p.color, `bold ${slot < 200 ? 20 : 26}px Georgia`);
    ctx.font = `${slot < 200 ? 12 : 15}px Georgia`; ctx.fillStyle = "#a8977a"; ctx.textAlign = "center";
    ctx.fillText(`${lookName(LOOK_OUTFITS, p.outfit)} · ${lookName(LOOK_HATS, p.hat)}`, cx, floor + 72, slot - 10);
    const ready = p.kind === "bot" || p.lookReady;
    ctx.globalAlpha = k * a * (ready ? 1 : .55 + Math.sin(time * 4 + i) * .35);
    textShadow(p.kind === "bot" ? "IA" : ready ? "✓ PRONTO" : "escolhendo…", cx, floor + 100, ready ? "#7dff9a" : "#f3e6c8", "bold 18px Georgia");
  });
  ctx.globalAlpha = k;
  const waiting = humans().filter(p => !p.lookReady).map(p => p.name);
  textShadow(!list.length ? "Ninguém entrou ainda" : waiting.length ? `Esperando: ${waiting.join(", ")} (toque em PRONTO)` : "Todos prontos!", W / 2, H - 22, waiting.length ? "#f3e6c8" : "#7dff9a", "22px Georgia");
  ctx.globalAlpha = 1;
}
function drawToast() {
  const t = toastMsg || Events.toast; if (!t) return;
  const a = Math.min(1, t.t / .2, (3.2 - t.t) / .4), s = 1 + (1 - easeOut(t.t / .25)) * .3;
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(W / 2, 128); ctx.scale(s, s);
  ctx.font = "bold 30px Georgia"; const w = ctx.measureText(t.text).width + 70;
  ctx.fillStyle = "rgba(10,6,4,.75)"; roundRect(ctx, -w / 2, -30, w, 46, 23); ctx.fill();
  ctx.strokeStyle = t.color; ctx.lineWidth = 2; roundRect(ctx, -w / 2, -30, w, 46, 23); ctx.stroke();
  ctx.textAlign = "center"; ctx.fillStyle = t.color; ctx.fillText("⚠ " + t.text, 0, 3);
  ctx.restore();
}
// ── Painel de baixo estilo Smash Bros: retrato de cada lutador, vida em número grande e a porcentagem da ultimate.
const hexShade = (hex, amt) => { const n = parseInt(hex.slice(1, 7), 16), f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)))); return "#" + [n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, "0")).join(""); };
const SMASH_FONT = "'Arial Black', Impact, 'Segoe UI Black', sans-serif";
function hpColor(r) { return r > .6 ? "#ffffff" : r > .35 ? "#ffe95a" : r > .15 ? "#ff9a3a" : "#ff3a3a"; }
function drawSmashPortrait(f, x, y, r) {
  ctx.save();
  // Fundo do retrato na cor do jogador.
  const g = ctx.createRadialGradient(x - r * .3, y - r * .4, 2, x, y, r); g.addColorStop(0, hexShade(f.color, .45)); g.addColorStop(1, hexShade(f.color, -.45));
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill();
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.clip();
  // Cabeça e ombros do boneco.
  const s = r / 22, hx = x, hy = y + 2 * s;
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(hx, y + r * 1.05, r * .62, r * .5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = f.color; ctx.beginPath(); ctx.ellipse(hx, y + r * 1.07, r * .55, r * .44, 0, 0, 7); ctx.fill();
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx, hy, 15.5 * s, 0, 7); ctx.fill();
  ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(hx, hy, 13 * s, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.beginPath(); ctx.arc(hx - 4 * s, hy - 5 * s, 5 * s, 0, 7); ctx.fill();
  if (f.alive) {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(hx + 5 * s, hy - 1 * s, 4 * s, 5 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(hx + 6.5 * s, hy - 1 * s, 2.2 * s, 0, 7); ctx.fill();
  } else { ctx.strokeStyle = OUT; ctx.lineWidth = 2 * s; for (const k of [-1, 1]) { const ex = hx + k * 5 * s; ctx.beginPath(); ctx.moveTo(ex - 3 * s, hy - 4 * s); ctx.lineTo(ex + 3 * s, hy + 2 * s); ctx.moveTo(ex + 3 * s, hy - 4 * s); ctx.lineTo(ex - 3 * s, hy + 2 * s); ctx.stroke(); } }
  ctx.save(); ctx.translate(hx, hy); ctx.scale(s, s); drawHatShape(ctx, f.hat, f.color, time); ctx.restore();
  // Brilho de vidro por cima.
  const gl = ctx.createLinearGradient(0, y - r, 0, y); gl.addColorStop(0, "rgba(255,255,255,.28)"); gl.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r);
  ctx.restore();
}
function drawSmashHUD() {
  if (!(phase === "fight" || phase === "intro" || phase === "between") || (mode === "corrida" && race)) return;
  const list = fighters.filter(f => !f.boss && !f.minion && !f.zombie && !f.ally && !f.clone && f.pl);
  if (!list.length) return;
  const n = list.length, gap = 14, cw = Math.min(250, (W - 60 - (n - 1) * gap) / n), ch = 96, y = H - ch - 10;
  const x0 = (W - (n * cw + (n - 1) * gap)) / 2, pr = Math.min(34, cw * .16);
  const appear = phase === "intro" ? easeOut(clamp((phaseT - .3) / .5, 0, 1)) : 1;
  list.forEach((f, i) => {
    const x = x0 + i * (cw + gap), yy = y + (1 - appear) * 140, col = f.color, dead = !f.alive;
    const maxHp = f.maxHp || MAX_HP, hp = Math.max(0, Math.ceil(f.hp)), ratio = clamp(f.hp / maxHp, 0, 1);
    // Quando toma dano: o número treme e pisca vermelho.
    if (f.hudHp === undefined) f.hudHp = f.hp;
    if (f.hp < f.hudHp - .5) { f.hudShake = .35; f.hudHit = time; }
    f.hudHp = f.hp; f.hudShake = Math.max(0, (f.hudShake || 0) - 1 / 60);
    const sh = f.hudShake > 0 ? f.hudShake * 18 : 0, sx = rnd(-sh, sh), sy = rnd(-sh, sh);
    ctx.save(); ctx.globalAlpha = appear * (dead ? .55 : 1);
    // Cartão inclinado (estilo Smash) na cor do jogador.
    const sk = 14;
    const path = () => { ctx.beginPath(); ctx.moveTo(x + sk, yy); ctx.lineTo(x + cw, yy); ctx.lineTo(x + cw - sk, yy + ch); ctx.lineTo(x, yy + ch); ctx.closePath(); };
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4;
    let g = ctx.createLinearGradient(x, yy, x + cw, yy + ch); g.addColorStop(0, hexShade(col, -.25) + "ee"); g.addColorStop(.55, "#1a120ccc"); g.addColorStop(1, "#0e0a08dd");
    path(); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); path(); ctx.clip();
    // Listras diagonais suaves e brilho no topo.
    ctx.fillStyle = "rgba(255,255,255,.04)"; for (let k = -2; k < 12; k++) { ctx.beginPath(); ctx.moveTo(x + k * 30, yy + ch); ctx.lineTo(x + k * 30 + 14, yy + ch); ctx.lineTo(x + k * 30 + 14 + ch * .5, yy); ctx.lineTo(x + k * 30 + ch * .5, yy); ctx.fill(); }
    const gl = ctx.createLinearGradient(0, yy, 0, yy + 30); gl.addColorStop(0, "rgba(255,255,255,.18)"); gl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = gl; ctx.fillRect(x, yy, cw, 30);
    if (f.hudHit && time - f.hudHit < .25) { ctx.fillStyle = `rgba(255,40,40,${.35 * (1 - (time - f.hudHit) / .25)})`; ctx.fillRect(x, yy, cw, ch); }
    ctx.restore();
    path(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x + sk, yy); ctx.lineTo(x + cw, yy); ctx.lineTo(x + cw - 1.5, yy + 5); ctx.lineTo(x + sk - 1, yy + 5); ctx.fill();
    // Anel da ultimate em volta do retrato.
    const px = x + sk + pr + 6, py = yy + ch / 2 + 2, spv = clamp((f.sp || 0) / 100, 0, 1), full = spv >= 1;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#00000099"; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(px, py, pr + 8, 0, 7); ctx.stroke();
    if (spv > 0) {
      ctx.save();
      if (full) { ctx.shadowColor = "#ffd84a"; ctx.shadowBlur = 14 + Math.sin(time * 8) * 6; }
      const ug = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr); ug.addColorStop(0, full ? "#fff6c0" : hexShade(col, .4)); ug.addColorStop(1, full ? "#ffb02a" : col);
      ctx.strokeStyle = ug; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(px, py, pr + 8, -Math.PI / 2, -Math.PI / 2 + spv * Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    drawSmashPortrait(f, px, py, pr);
    // Nome.
    const tx = px + pr + 16;
    ctx.textAlign = "left"; ctx.font = `bold 14px Georgia`; ctx.fillStyle = "#000a"; ctx.fillText(f.pl.name, tx + 1, yy + 22, cw - (tx - x) - 14);
    ctx.fillStyle = "#f6ead0"; ctx.fillText(f.pl.name, tx, yy + 21, cw - (tx - x) - 14);
    // Vida em número grande (inclinado, com contorno grosso).
    const big = Math.min(46, cw * .2);
    ctx.save(); ctx.translate(tx + sx, yy + 64 + sy); ctx.transform(1, 0, -.12, 1, 0, 0);
    ctx.font = `900 ${big}px ${SMASH_FONT}`; ctx.lineJoin = "round";
    const num = dead ? "" : String(hp);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.strokeText(num, 0, 0);
    const ng = ctx.createLinearGradient(0, -big * .8, 0, 0); ng.addColorStop(0, "#ffffff"); ng.addColorStop(.5, dead ? "#ff5a5a" : hpColor(ratio)); ng.addColorStop(1, dead ? "#a01a1a" : hexShade(hpColor(ratio), -.25));
    ctx.fillStyle = ng; ctx.fillText(num, 0, 0);
    const nw = ctx.measureText(num).width;
    if (!dead) { ctx.font = `900 ${Math.round(big * .36)}px ${SMASH_FONT}`; ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.strokeText("HP", nw + 4, 0); ctx.fillStyle = "#d8c8a8"; ctx.fillText("HP", nw + 4, 0); }
    ctx.restore();
    // Barrinha de vida.
    const bx = tx, bw = cw - (tx - x) - 26, by = yy + 72;
    ctx.fillStyle = "#000a"; roundRect(ctx, bx, by, bw, 7, 3.5); ctx.fill();
    f.hudBar = f.hudBar === undefined ? ratio : lerp(f.hudBar, ratio, .06);
    ctx.fillStyle = "#ffffffaa"; roundRect(ctx, bx, by, bw * f.hudBar, 7, 3.5); ctx.fill();
    ctx.fillStyle = hpColor(ratio); roundRect(ctx, bx, by, bw * ratio, 7, 3.5); ctx.fill();
    // Porcentagem da ultimate.
    ctx.font = `900 13px ${SMASH_FONT}`; ctx.textAlign = "left";
    if (full && !dead) { const pz = .5 + Math.sin(time * 9) * .5; ctx.fillStyle = `rgba(255,${200 + pz * 55},${60 + pz * 120},1)`; ctx.fillText("ULT PRONTA!", bx, yy + 91); }
    else { ctx.fillStyle = "#a8977a"; ctx.fillText("ULT", bx, yy + 91); ctx.fillStyle = full ? "#ffd84a" : hexShade(col, .35); ctx.fillText(`${Math.floor(spv * 100)}%`, bx + 34, yy + 91); }
    // Arma atual no canto.
    if (!dead && f.wtype && f.wtype !== "punhos") { ctx.globalAlpha = appear * .9; drawWeaponIcon(ctx, f.wtype, x + cw - 30, yy + 28, 34); ctx.globalAlpha = appear; }
    // Vitórias (bolinhas).
    if (f.pl.score !== undefined && !teamMode()) for (let k = 0; k < WIN_SCORE; k++) { ctx.fillStyle = k < f.pl.score ? "#ffd84a" : "#ffffff22"; ctx.beginPath(); ctx.arc(x + cw - 22 - k * 11, yy + ch - 12, 3.8, 0, 7); ctx.fill(); }
    if (dead) {
      // Carimbo de KO.
      ctx.save(); ctx.translate(x + cw / 2 + 20, yy + ch / 2); ctx.rotate(-.18); ctx.globalAlpha = .85 * appear;
      ctx.strokeStyle = "#ff3a3a"; ctx.lineWidth = 3; roundRect(ctx, -46, -18, 92, 36, 6); ctx.stroke();
      ctx.fillStyle = "#ff3a3a"; ctx.font = `900 24px ${SMASH_FONT}`; ctx.textAlign = "center"; ctx.fillText("K.O.", 0, 9);
      ctx.restore();
    }
    ctx.restore();
  });
}
function drawHUD() {
  if (mode === "chefe") drawBossBar();
  if (mode === "zumbi") drawZombieHUD();
  if (mode === "corrida") drawRaceHUD();
  drawToast();
  drawSmashHUD();
  const list = teamMode() ? [] : [...players.values()].filter(p => p.connected || fighters.some(f => f.id === p.id));
  ctx.font = "600 17px Georgia";
  const items = list.map(p => ({ p, w: ctx.measureText(p.name).width + 36 + WIN_SCORE * 12 }));
  let x = W / 2 - (items.reduce((s, i) => s + i.w + 8, 0) - 8) / 2;
  for (const { p, w } of items) {
    ctx.fillStyle = "#0009"; roundRect(ctx, x, 14, w, 30, 15); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x + 15, 29, 6, 0, 7); ctx.fill();
    ctx.fillStyle = "#f3e6c8"; ctx.textAlign = "left"; ctx.fillText(p.name, x + 27, 35);
    for (let i = 0; i < WIN_SCORE; i++) { ctx.fillStyle = i < p.score ? "#e8b84a" : "#fff3"; ctx.beginPath(); ctx.arc(x + w - 12 - (WIN_SCORE - 1 - i) * 12, 29, 4, 0, 7); ctx.fill(); }
    x += w + 8;
  }
  if (phase === "fight" && phaseT < .9) {
    const s = 1 + (1 - easeOut(phaseT / .25)) * .6; ctx.save(); ctx.translate(W / 2, 330); ctx.scale(s, s); ctx.globalAlpha = clamp((.9 - phaseT) / .3, 0, 1);
    textShadow(mode === "corrida" ? "CORRAM!" : "LUTEM!", 0, 0, "#e8b84a", "bold 110px Georgia"); ctx.restore();
  }
  if (phase === "between") {
    const k = easeOut(phaseT / .4), wcol = lastWinner ? lastWinner.color : "#f3e6c8";
    ctx.fillStyle = `rgba(0,0,0,${.45 * k})`; ctx.fillRect(0, 250, W, 130);
    ctx.fillStyle = wcol; ctx.fillRect(W / 2 - 220 * k, 250, 440 * k, 3); ctx.fillRect(W / 2 - 220 * k, 377, 440 * k, 3);
    ctx.globalAlpha = k; textShadow(banner, W / 2, 330, "#f3e6c8", "bold 58px Georgia"); ctx.globalAlpha = 1;
  }
}
function drawIntro() {
  const t = phaseT, inK = easeOut(t / .45), outK = t > 1.05 ? easeOut((t - 1.05) / .35) : 0;
  const cx = W / 2 + (1 - inK) * -900 + outK * 900;
  ctx.save(); ctx.globalAlpha = 1 - outK;
  ctx.fillStyle = "rgba(10,7,5,.75)"; roundRect(ctx, cx - 380, 230, 760, 170, 14); ctx.fill();
  ctx.strokeStyle = "#e8b84a88"; ctx.lineWidth = 2; roundRect(ctx, cx - 372, 238, 744, 154, 10); ctx.stroke();
  const B = mode === "chefe" ? BOSSES[bossStage] : null;
  const RC = mode === "corrida";
  const head = B ? `CHEFÃO ${bossStage + 1} DE ${BOSSES.length} · ${arena.name}` : mode === "bomba" ? `💣 BOMBA · RODADA ${round}` : mode === "zumbi" ? `🧟 SOBREVIVÊNCIA · ${arena.name}` : RC ? `💀 CORRIDA DA MORTE · RODADA ${round}` : `RODADA ${round}`;
  const sub = B ? B.sub : mode === "bomba" ? "Bata em alguém para passar a bomba!" : mode === "zumbi" ? `Aguentem as hordas · recorde: onda ${zRecord}` : RC ? `${RACE_ZONES.map(z => z.icon).join(" → ")} 🏁 · ${RACE_LEN / 10} m até a chegada` : arena.sub;
  textShadow(head, cx, 282, B ? "#ff8a6a" : mode === "zumbi" ? "#9adf6a" : RC ? "#c58bff" : "#e8b84a", "600 22px Georgia");
  textShadow(B ? B.name : mode === "zumbi" ? "Hordas de Zumbis" : RC ? "Fuja da Morte!" : arena.name, cx, 340, "#f3e6c8", "bold 52px Georgia");
  textShadow(sub, cx, 375, "#c9b896", "italic 20px Georgia");
  ctx.restore();
  const n = t >= 2.1 ? 1 : t >= 1.6 ? 2 : t >= 1.1 ? 3 : 0;
  if (n) {
    const since = t - [0, 2.1, 1.6, 1.1][n], s = 1.6 - easeOut(since / .2) * .6;
    ctx.save(); ctx.translate(W / 2, 360); ctx.scale(s, s); ctx.globalAlpha = clamp(1 - (since - .3) / .2, 0, 1);
    textShadow(String(n), 0, 40, "#f3e6c8", "bold 150px Georgia"); ctx.restore();
  }
}
// Seleção: páginas de 20 cartas grandes (5×4), abas de categoria e painel com a escolha de cada jogador.
// As páginas passam sozinhas; quem usa o teclado leva a página junto com o cursor, e quando alguém escolhe
// uma arma no celular a TV mostra a página dela por uns segundos.
const GAP = 14, SEL_COLS = 5, SEL_ROWS = 4, SEL_PER = SEL_COLS * SEL_ROWS, SEL_X = 30, SEL_Y = 158, SEL_W = 1214, SIDE_X = 1268;
const selCols = () => selAll ? 10 : SEL_COLS;
const CAT_COL = { "Lâminas": "#c8d4e0", "Pesadas": "#e0a868", "Longas": "#8fe0c8", "Distância": "#ffd84a", "Cajados": "#c58bff", "Livros": "#ff8af0",
  "Sabres": "#4ab8ff", "Energia": "#ff8a3a", "Música": "#ff7ac8", "Místicas": "#b48cff", "Especiais": "#ff5a7a", "Plantas": "#7dff6a",
  "Heróis": "#ff5a5a", "Brinquedos": "#ffd84a", "Jogos": "#39d5c8", "Lendárias": "#ffb04a", "Relíquias": "#ffd84a" };
const catCol = (c) => CAT_COL[c] || "#e8b84a";
let selPage = 0, selPageAt = 0, selHoldUntil = 0, selPrevPage = 0, selAll = false, selAllAt = 0;
const selHits = []; // áreas clicáveis da tela de escolha (desenhadas a cada quadro)
function selNav(d) { selAll = false; setSelPage(selPage + d, 15); sfx.nav(); }
const selSeen = new Map();
function setSelPage(p, hold) {
  const pages = Math.ceil(choiceList().length / SEL_PER);
  p = ((p % pages) + pages) % pages;
  if (p !== selPage) { selPrevPage = selPage; selPage = p; selPageAt = time; }
  if (hold) selHoldUntil = time + hold;
}
function selectPaging() {
  const list = choiceList(), pages = Math.ceil(list.length / SEL_PER);
  // Teclado: a página acompanha o cursor.
  for (const p of players.values()) if (p.kind === "kb" && !p.ready && p.cursor != null && Math.floor(p.cursor / SEL_PER) !== selPage && p.lastCur !== p.cursor) setSelPage(Math.floor(p.cursor / SEL_PER), 6);
  for (const p of players.values()) p.lastCur = p.cursor;
  // Alguém escolheu no celular: mostra a página da arma.
  for (const p of players.values()) {
    if (p.kind === "bot") continue;
    if (p.choice && selSeen.get(p.id) !== p.choice) { const i = list.indexOf(p.choice); if (i >= 0) setSelPage(Math.floor(i / SEL_PER), 4); }
    selSeen.set(p.id, p.choice);
  }
  if (!selAll && time > selHoldUntil && time - selPageAt > 6 && pages > 1) setSelPage(selPage + 1);
}
function drawStatPips(x, y, label, n, col) {
  ctx.fillStyle = "#9a8a6e"; ctx.font = "600 11px Georgia"; ctx.textAlign = "left"; ctx.fillText(label, x, y + 7);
  for (let q = 0; q < 5; q++) { ctx.fillStyle = q < n ? col : "#ffffff18"; roundRect(ctx, x + 14 + q * 9, y, 7, 8, 2); ctx.fill(); }
}
function drawWeaponCard(id, i, cx, cy, cw, ch, al) {
  const w = WEAPONS[id], col = w.relic ? "#ffd84a" : catCol(w.cat);
  const chosenBy = [...players.values()].filter(p => p.choice === id && (p.connected || p.kind === "bot"));
  const hot = chosenBy.length > 0, cursorOn = [...players.values()].filter(p => p.kind === "kb" && p.cursor === i && !p.ready);
  ctx.save(); ctx.globalAlpha = al;
  if (hot) { ctx.save(); ctx.globalCompositeOperation = "lighter"; glowDot(cx + cw / 2, cy + ch / 2, cw * .75, chosenBy[0].color + "55", chosenBy[0].color + "00"); ctx.restore(); }
  // Fundo: cartão escuro com a cor da categoria em cima.
  let g = ctx.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, hot ? "#3e2c1c" : "#2a2018"); g.addColorStop(1, hot ? "#22180f" : "#16110c");
  ctx.fillStyle = g; roundRect(ctx, cx, cy, cw, ch, 14); ctx.fill();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, 14); ctx.clip();
  g = ctx.createRadialGradient(cx + cw / 2, cy + 56, 6, cx + cw / 2, cy + 56, cw * .55); g.addColorStop(0, col + "40"); g.addColorStop(1, col + "00");
  ctx.fillStyle = g; ctx.fillRect(cx, cy, cw, ch);
  ctx.fillStyle = col + "cc"; ctx.fillRect(cx, cy, cw, 4);
  ctx.restore();
  ctx.strokeStyle = hot ? chosenBy[0].color : w.relic ? "#ffd84aaa" : "#4a382a"; ctx.lineWidth = hot ? 4 : 1.5; roundRect(ctx, cx, cy, cw, ch, 14); ctx.stroke();
  // Ícone grande (respira de leve quando escolhido).
  const bob = hot ? Math.sin(time * 4) * 3 : 0;
  drawWeaponIcon(ctx, id, cx + cw / 2, cy + 52 + bob, 80);
  // Nome, categoria e atributos.
  ctx.textAlign = "center"; ctx.font = "bold 19px Georgia"; ctx.fillStyle = w.relic ? "#ffd84a" : "#f6ead0";
  ctx.fillText(w.name, cx + cw / 2, cy + ch - 46, cw - 14);
  ctx.font = "italic 12px Georgia"; ctx.fillStyle = col; ctx.fillText(w.relic ? "★ Relíquia" : w.cat, cx + cw / 2, cy + ch - 30);
  const pc = w.energy || w.muzzle ? "#5ac8ff" : "#e8b84a", px0 = cx + cw / 2 - 98;
  [["D", 0], ["V", 1], ["A", 2]].forEach(([lb, j]) => drawStatPips(px0 + j * 68, cy + ch - 20, lb, w.s[j], pc));
  // Quem escolheu.
  chosenBy.forEach((p, q) => {
    const bx = cx + cw - 18 - q * 26, by = cy + 20;
    ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(bx, by, 13, 0, 7); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(bx, by, 11, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 12px Georgia"; ctx.textAlign = "center"; ctx.fillText(p.kind === "bot" ? "IA" : p.name[0].toUpperCase(), bx, by + 4);
  });
  for (const p of cursorOn) { ctx.setLineDash([10, 7]); ctx.lineDashOffset = -time * 30; ctx.strokeStyle = p.color; ctx.lineWidth = 3.5; roundRect(ctx, cx - 5, cy - 5, cw + 10, ch + 10, 17); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}
function drawMiniCard(id, i, cx, cy, cw, ch, al) {
  const w = WEAPONS[id], col = w.relic ? "#ffd84a" : catCol(w.cat);
  const chosenBy = [...players.values()].filter(p => p.choice === id && (p.connected || p.kind === "bot"));
  const hot = chosenBy.length > 0, cursorOn = [...players.values()].some(p => p.kind === "kb" && p.cursor === i && !p.ready);
  ctx.save(); ctx.globalAlpha = al;
  const g = ctx.createLinearGradient(0, cy, 0, cy + ch); g.addColorStop(0, hot ? "#3e2c1c" : "#2a2018"); g.addColorStop(1, hot ? "#22180f" : "#16110c");
  ctx.fillStyle = g; roundRect(ctx, cx, cy, cw, ch, 9); ctx.fill();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, 9); ctx.clip();
  const gl = ctx.createRadialGradient(cx + ch * .5, cy + ch / 2, 2, cx + ch * .5, cy + ch / 2, ch * .8); gl.addColorStop(0, col + "38"); gl.addColorStop(1, col + "00");
  ctx.fillStyle = gl; ctx.fillRect(cx, cy, cw, ch); ctx.fillStyle = col + "cc"; ctx.fillRect(cx, cy, 3, ch);
  ctx.restore();
  ctx.strokeStyle = hot ? chosenBy[0].color : cursorOn ? "#ffffff" : "#4a382a"; ctx.lineWidth = hot || cursorOn ? 3 : 1.2; roundRect(ctx, cx, cy, cw, ch, 9); ctx.stroke();
  drawWeaponIcon(ctx, id, cx + ch * .5 + 2, cy + ch / 2, ch * .78);
  // Nome em até duas linhas.
  ctx.font = "bold 11.5px Georgia"; ctx.fillStyle = w.relic ? "#ffd84a" : "#f6ead0"; ctx.textAlign = "left";
  const tx = cx + ch + 2, tw = cw - ch - 6, words = w.name.split(" "), lines = [""];
  for (const wd of words) { const tryL = (lines[lines.length - 1] + " " + wd).trim(); if (ctx.measureText(tryL).width > tw && lines[lines.length - 1]) lines.push(wd); else lines[lines.length - 1] = tryL; }
  const ls = lines.slice(0, 3); ls.forEach((l, j) => ctx.fillText(l, tx, cy + ch / 2 + (j - (ls.length - 1) / 2) * 12 + 4, tw));
  chosenBy.forEach((p, q) => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(cx + cw - 8 - q * 13, cy + 8, 6, 0, 7); ctx.fill(); });
  ctx.restore();
}
function drawSelect() {
  selHits.length = 0;
  selectPaging();
  const k = easeOut(phaseT / .4), list = choiceList(), pages = Math.ceil(list.length / SEL_PER);
  const cw = Math.floor((SEL_W - (SEL_COLS - 1) * GAP) / SEL_COLS), ch = Math.floor((H - SEL_Y - 70 - (SEL_ROWS - 1) * GAP) / SEL_ROWS);
  ctx.fillStyle = `rgba(10,7,5,${.86 * k})`; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = k;
  textShadow(mode === "chefe" ? "Escolham as armas para o chefão" : mode === "zumbi" ? "Escolham as armas contra os zumbis" : "Escolham suas armas", W / 2, 58, "#e8b84a", "bold 42px Georgia");
  ctx.font = "19px Georgia"; ctx.fillStyle = "#c9b896"; ctx.textAlign = "left"; ctx.fillText(`📱 Toque numa arma no celular · ${list.length} armas`, 34, 62);
  // Relógio da escolha.
  const tl = Math.ceil(Math.max(0, selT)), urgent = selT < 10;
  ctx.fillStyle = urgent ? "#5a1a10" : "#2a2018"; roundRect(ctx, W - 132, 30, 98, 44, 22); ctx.fill();
  ctx.strokeStyle = urgent ? "#ff8a6a" : "#e8b84a88"; ctx.lineWidth = 2; ctx.stroke();
  textShadow(`⏱ ${tl}s`, W - 83, 61, urgent ? "#ff8a6a" : "#f3e6c8", "bold 22px Georgia");
  // Abas de categoria: as da página atual acesas; clicar não precisa (as páginas passam sozinhas).
  const onPage = new Set((selAll ? list : list.slice(selPage * SEL_PER, selPage * SEL_PER + SEL_PER)).map(id => WEAPONS[id].relic ? "Relíquias" : WEAPONS[id].cat));
  const cats = [...new Set(list.map(id => WEAPONS[id].relic ? "Relíquias" : WEAPONS[id].cat))];
  ctx.font = "600 14px Georgia";
  const tw = cats.map(c => ctx.measureText(c).width + 20), total = tw.reduce((s, v) => s + v + 5, -5), ts = Math.min(1, SEL_W / total);
  ctx.save(); ctx.translate(SEL_X + SEL_W / 2, 0); ctx.scale(ts, 1); ctx.translate(-total / 2, 0);
  let tx = 0;
  cats.forEach((c, j) => {
    const on = onPage.has(c), col = catCol(c);
    ctx.fillStyle = on ? col + "33" : "#ffffff08"; roundRect(ctx, tx, 98, tw[j], 30, 15); ctx.fill();
    ctx.strokeStyle = on ? col : "#ffffff18"; ctx.lineWidth = on ? 2 : 1; ctx.stroke();
    ctx.fillStyle = on ? "#fff4dc" : "#8a7a62"; ctx.textAlign = "center"; ctx.fillText(c, tx + tw[j] / 2, 118);
    { const x0 = SEL_X + SEL_W / 2 + (tx - total / 2) * ts; selHits.push({ x: x0, y: 98, w: tw[j] * ts, h: 30, fn: () => { selAll = false; setSelPage(Math.floor(list.findIndex(id => (WEAPONS[id].relic ? "Relíquias" : WEAPONS[id].cat) === c) / SEL_PER), 15); sfx.nav(); } }); }
    tx += tw[j] + 5;
  });
  ctx.restore();
  // Cartas da página (entram deslizando quando a página troca).
  const sw = easeOut(Math.min(1, (time - selPageAt) / .45)), dir = selPage >= selPrevPage ? 1 : -1;
  if (selAll) {
    // Todas as armas de uma vez, em cartas menores no mesmo estilo.
    const AC = 10, AR = Math.ceil(list.length / AC), ag = 6;
    const acw = (SEL_W - (AC - 1) * ag) / AC, ach = Math.min(70, (H - SEL_Y - 74 - (AR - 1) * ag) / AR);
    list.forEach((id, i) => {
      const cx = SEL_X + (i % AC) * (acw + ag), cy = SEL_Y + Math.floor(i / AC) * (ach + ag), appear = easeOut(clamp((time - selAllAt) * 4 - i * .01, 0, 1));
      drawMiniCard(id, i, cx, cy, acw, ach, k * appear);
    });
  } else list.forEach((id, i) => {
    if (Math.floor(i / SEL_PER) !== selPage) return;
    const j = i % SEL_PER, col = j % SEL_COLS, row = Math.floor(j / SEL_COLS);
    const appear = easeOut(clamp((phaseT - .15 - j * .02) / .3, 0, 1)), d = clamp(sw * 1.4 - j * .015, 0, 1);
    const cx = SEL_X + col * (cw + GAP) + (1 - d) * 90 * dir, cy = SEL_Y + row * (ch + GAP) + (1 - appear) * 24;
    drawWeaponCard(id, i, cx, cy, cw, ch, k * appear * (.2 + d * .8));
  });
  // Páginas: bolinhas e barra do tempo até a próxima.
  const py = H - 40, pw = 30;
  for (let p = 0; p < pages; p++) {
    const x = SEL_X + SEL_W / 2 + (p - (pages - 1) / 2) * pw, on = !selAll && p === selPage;
    ctx.fillStyle = on ? "#e8b84a" : "#ffffff30"; ctx.beginPath(); ctx.arc(x, py, on ? 7 : 5, 0, 7); ctx.fill();
    selHits.push({ x: x - 13, y: py - 13, w: 26, h: 26, fn: () => { selAll = false; setSelPage(p, 15); sfx.nav(); } });
  }
  // Setas pra passar a página (mouse, rodinha, Q/E ou ←/→ no teclado).
  const dotsW = pages * pw / 2 + 40;
  for (const [d, ch2] of [[-1, "◀"], [1, "▶"]]) {
    const ax = SEL_X + SEL_W / 2 + d * dotsW;
    ctx.fillStyle = "#2a2018"; ctx.beginPath(); ctx.arc(ax, py, 17, 0, 7); ctx.fill(); ctx.strokeStyle = "#e8b84a88"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e8b84a"; ctx.font = "bold 15px Georgia"; ctx.textAlign = "center"; ctx.fillText(ch2, ax + d, py + 5);
    selHits.push({ x: ax - 20, y: py - 20, w: 40, h: 40, fn: () => selNav(d) });
  }
  // Botão "ver todas".
  const bx = SEL_X + SEL_W - 190, bw2 = 190, by = py - 18;
  ctx.fillStyle = selAll ? "#e8b84a" : "#2a2018"; roundRect(ctx, bx, by, bw2, 36, 18); ctx.fill(); ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = selAll ? "#1a1008" : "#f3e6c8"; ctx.font = "bold 15px Georgia"; ctx.textAlign = "center"; ctx.fillText(selAll ? "▤ Voltar às páginas" : "▦ Ver todas (Tab)", bx + bw2 / 2, by + 23);
  selHits.push({ x: bx, y: by, w: bw2, h: 36, fn: () => { selAll = !selAll; selAllAt = time; selHoldUntil = time + 15; sfx.nav(); } });
  if (!selAll && time > selHoldUntil && pages > 1) { const q = clamp((time - selPageAt) / 6, 0, 1); ctx.fillStyle = "#e8b84a55"; roundRect(ctx, SEL_X + SEL_W / 2 - 80, py + 14, 160 * q, 4, 2); ctx.fill(); }
  textShadow(selAll ? `todas as ${list.length} armas` : `página ${selPage + 1} de ${pages}`, SEL_X + SEL_W / 2, py - 14, "#a8977a", "14px Georgia");
  drawSelectPlayers();
  ctx.globalAlpha = 1;
}
// Painel da direita: cada jogador, a arma escolhida e se já está pronto.
function drawSelectPlayers() {
  const list = [...players.values()].filter(p => p.connected || p.kind === "bot"), x = SIDE_X, w = W - SIDE_X - 30;
  ctx.fillStyle = "#1a130ecc"; roundRect(ctx, x, 98, w, H - 98 - 70, 16); ctx.fill();
  ctx.strokeStyle = "#e8b84a44"; ctx.lineWidth = 1.5; ctx.stroke();
  textShadow("JOGADORES", x + w / 2, 128, "#e8b84a", "bold 17px Georgia");
  const rowH = Math.min(92, (H - 98 - 70 - 60) / Math.max(1, list.length));
  list.forEach((p, i) => {
    const y = 146 + i * rowH, h = rowH - 8, wid = p.choice && WEAPONS[p.choice];
    ctx.fillStyle = p.ready || p.kind === "bot" ? "#2e2418" : "#221a12"; roundRect(ctx, x + 10, y, w - 20, h, 12); ctx.fill();
    ctx.fillStyle = p.color; roundRect(ctx, x + 10, y, 6, h, 3); ctx.fill();
    if (wid) drawWeaponIcon(ctx, p.choice, x + 52, y + h / 2, Math.min(56, h - 10));
    else { ctx.fillStyle = "#ffffff12"; ctx.beginPath(); ctx.arc(x + 52, y + h / 2, Math.min(24, h / 2 - 6), 0, 7); ctx.fill(); ctx.fillStyle = "#8a7a62"; ctx.font = "bold 22px Georgia"; ctx.textAlign = "center"; ctx.fillText("?", x + 52, y + h / 2 + 8); }
    ctx.textAlign = "left"; ctx.font = "bold 17px Georgia"; ctx.fillStyle = p.color; ctx.fillText(p.kind === "bot" ? `${p.name}` : p.name, x + 88, y + h / 2 - 6, w - 130);
    ctx.font = "13px Georgia"; ctx.fillStyle = wid ? "#f3e6c8" : "#8a7a62"; ctx.fillText(wid ? wid.name : "escolhendo…", x + 88, y + h / 2 + 14, w - 130);
    if (p.ready || p.kind === "bot") { ctx.fillStyle = "#7dff9a"; ctx.font = "bold 20px Georgia"; ctx.textAlign = "right"; ctx.fillText("✓", x + w - 20, y + h / 2 + 7); }
  });
  const waiting = humans().filter(p => !p.ready).map(p => p.name);
  textShadow(waiting.length ? `Esperando: ${waiting.join(", ")}` : "Todos prontos!", x + w / 2, H - 88, waiting.length ? "#f3e6c8" : "#7dff9a", "16px Georgia");
}
function drawOver() {
  const k = easeOut(phaseT / .6), wp = lastWinner;
  ctx.fillStyle = `rgba(8,6,4,${.7 * k})`; ctx.fillRect(0, 0, W, H);
  if (rnd() < .5) particles.push({ x: rnd(W), y: -10, vx: rnd(-60, 60), vy: rnd(120, 260), life: 4, max: 4, color: pick(["#e8b84a", "#f3e6c8", wp ? wp.color : "#fff", "#ff6fb5", "#7ad8ff"]), size: rnd(6), g: 40, confetti: true });
  ctx.globalAlpha = k;
  const s = .7 + easeOut(phaseT / .5) * .3; ctx.save(); ctx.translate(W / 2, 250); ctx.scale(s, s);
  if (mode === "zumbi") {
    textShadow(zNewRecord ? "NOVO RECORDE!" : "OS ZUMBIS VENCERAM", 0, -50, zNewRecord ? "#e8b84a" : "#9adf6a", "600 28px Georgia");
    textShadow(`Onda ${zw ? zw.wave : 1}`, 0, 30, "#f3e6c8", "bold 96px Georgia");
  } else if (mode === "chefe") {
    textShadow("VITÓRIA", 0, -50, "#e8b84a", "600 28px Georgia");
    textShadow("Os heróis venceram!", 0, 30, "#f3e6c8", "bold 78px Georgia");
  } else {
    textShadow("CAMPEÃO", 0, -50, "#e8b84a", "600 28px Georgia");
    textShadow(wp ? wp.name : "", 0, 30, wp ? wp.color : "#fff", "bold 96px Georgia");
  }
  ctx.restore();
  const list = [...players.values()].filter(p => p.connected || p.kind === "bot").sort((a, b) => mode === "zumbi" ? (b.kills || 0) - (a.kills || 0) : b.score - a.score);
  list.forEach((p, i) => {
    const y = 380 + i * 46, a = easeOut((phaseT - .4 - i * .08) / .3);
    ctx.globalAlpha = k * a;
    ctx.fillStyle = "#0008"; roundRect(ctx, W / 2 - 230, y - 26, 460, 38, 10); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(W / 2 - 205, y - 7, 8, 0, 7); ctx.fill();
    ctx.font = "600 21px Georgia"; ctx.textAlign = "left"; ctx.fillStyle = "#f3e6c8"; ctx.fillText(`${i + 1}. ${p.name}`, W / 2 - 185, y);
    if (mode === "zumbi") { ctx.textAlign = "right"; ctx.fillStyle = "#9adf6a"; ctx.fillText(`☠ ${p.kills || 0} zumbis`, W / 2 + 215, y); }
    else if (mode !== "chefe") for (let q = 0; q < WIN_SCORE; q++) { ctx.fillStyle = q < p.score ? "#e8b84a" : "#fff3"; ctx.beginPath(); ctx.arc(W / 2 + 120 + q * 20, y - 7, 6, 0, 7); ctx.fill(); }
  });
  ctx.globalAlpha = k * (.6 + Math.sin(time * 3) * .3);
  textShadow("Aperte COMEÇAR para jogar de novo · Esc volta ao menu", W / 2, H - 50, "#f3e6c8", "20px Georgia");
  ctx.globalAlpha = 1;
}

const cam = { x: W / 2, y: H / 2, z: 1 };
const CAM_FAR = .86;
const WALL_VIS = 26; // quanto das paredes aparece na beira da tela
const HUD_H = 134; // espaço do painel de baixo: fica por cima do terreno, abaixo da linha do chão
const frameZoom = () => Math.min(W / (W + 2 * arenaExt - 2 * WALL_FACE + 2 * WALL_VIS), H / (FLOOR + HUD_H - frameTop + WALL_VIS));
const frameCenterY = () => (frameTop - WALL_VIS + FLOOR + HUD_H) / 2;
// Cor média do topo e da base do cenário (pra continuar o céu e o chão fora da arena).
function arenaEdgeCols(a) {
  if (!a.edgeCols) {
    const d = arenaBlur(a).getContext("2d").getImageData(0, 0, 96, 54).data, avg = (row) => { let r = 0, g = 0, b = 0; for (let x = 0; x < 96; x++) { const i = (row * 96 + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; } return `rgb(${r / 96 | 0},${g / 96 | 0},${b / 96 | 0})`; };
    a.edgeCols = [avg(0), avg(53)];
  }
  return a.edgeCols;
}
// Fundo além das bordas da arena: a própria arena bem desfocada e escura.
const blurCache = new Map();
function arenaBlur(a) {
  let b = blurCache.get(a.id);
  if (!b) { b = document.createElement("canvas"); b.width = 96; b.height = 54; const bc = b.getContext("2d"); bc.drawImage(arenaCanvas(a), 0, 0, 96, 54); blurCache.set(a.id, b); if (blurCache.size > 8) blurCache.delete(blurCache.keys().next().value); }
  return b;
}
const GRADE = { biblioteca: "#ffc890", aurora: "#80ffd0", faroeste: "#ffa060", estacao: "#90b8ff", parque: "#ff90d0", cogumelos: "#b080ff", fabrica: "#ffa060", selva: "#a0e0a0", mina: "#ffc070", alien: "#ff80d0", templo: "#ffa0b0", cidade: "#a070ff", laboratorio: "#70ffd0", pantano: "#90c070", praia: "#ffe0a0", cristais: "#80a0ff", teatro: "#ff8080", doces: "#ffb0e0", lua: "#c0c8ff", oceano: "#60b0ff", castelo: "#ffb070", floresta: "#70ffb0", masmorra: "#7090ff", neve: "#a8d4ff", vulcao: "#ff6a30", deserto: "#ffd080", porto: "#6a90ff", cemiterio: "#8a9ad0", ceu: "#c080ff", coliseu: "#ffe0a0" };
function updateCam(real) {
  let tx = W / 2, ty = H / 2, tz = 1;
  if (cutin) { tz = 1.7; tx = cutin.f.neck.x; ty = cutin.f.neck.y + 10; real *= 3; }
  else if (mode === "corrida" && race) { /* corrida: tela inteira */ }
  else if (phase === "fight" || phase === "intro" || phase === "between") {
    const live = fighters.filter(f => f.alive && !(f.minion && f.ally));
    if (live.length) {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const f of live) { x0 = Math.min(x0, f.pelvis.x); x1 = Math.max(x1, f.pelvis.x); y0 = Math.min(y0, f.head.y); y1 = Math.max(y1, f.pelvis.y + 50 * f.sc); }
      // Câmera mais aberta: aproxima só um pouquinho quando todos estão juntos.
      // Câmera afastada: mostra a arena inteira (e um pouco além) o tempo todo.
      tz = frameZoom(); tx = W / 2; ty = frameCenterY();
    }
  }
  const hw = W / 2 / tz, hh = H / 2 / tz;
  if (tz >= 1) { tx = clamp(tx, hw - arenaExt, W + arenaExt - hw); ty = clamp(ty, hh + Math.min(0, frameTop), H - hh); } else { tx = W / 2; ty = frameCenterY(); }
  const k = Math.min(1, real * 2.5);
  cam.z += (tz - cam.z) * k; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  const hw2 = W / 2 / cam.z, hh2 = H / 2 / cam.z;
  if (cam.z >= 1) { cam.x = clamp(cam.x, hw2 - arenaExt, W + arenaExt - hw2); cam.y = clamp(cam.y, hh2, H - hh2); }
  else { const m = clamp((1 - cam.z) * 25, 0, 1); cam.x = lerp(cam.x, W / 2, m); cam.y = lerp(cam.y, frameCenterY(), m); }
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cv.width, cv.height);
  const sx = shake ? rnd(-shake, shake) : 0, sy = shake ? rnd(-shake, shake) : 0;
  const z = scale * cam.z;
  ctx.setTransform(z, 0, 0, z, offX + (W / 2 - cam.x * cam.z + sx) * scale, offY + (H / 2 - cam.y * cam.z + sy) * scale);
  const racing = mode === "corrida" && race && phase !== "lobby" && phase !== "select" && phase !== "looks";
  if (cam.z < .999 && !racing) {
    // Além das bordas: arena desfocada e escurecida, pra não ficar preto.
    const vw = W / cam.z, vh = H / cam.z;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(arenaBlur(arena), cam.x - vw / 2 - 40, cam.y - vh / 2 - 40, vw + 80, vh + 80);
    ctx.fillStyle = "rgba(6,4,3,.62)"; ctx.fillRect(cam.x - vw / 2 - 40, cam.y - vh / 2 - 40, vw + 80, vh + 80);
  }
  const X = racing ? 0 : arenaExt;
  if (cam.z < .999 && !racing) {
    // Céu e chão continuam pra fora da arena com a cor média de cada um.
    const [top, bot] = arenaEdgeCols(arena);
    ctx.fillStyle = top; ctx.fillRect(-X - 400, -1600, W + 2 * X + 800, 1602);
    const gt = ctx.createLinearGradient(0, H, 0, H + 500); gt.addColorStop(0, bot); gt.addColorStop(1, "#050307");
    ctx.fillStyle = gt; ctx.fillRect(-X - 400, H - 1, W + 2 * X + 800, 900);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(-X, 0, W + 2 * X, H); ctx.clip();
  if (racing) drawRaceWorld();
  else {
    const ac = arenaCanvas(arena);
    ctx.drawImage(ac, 0, 0, W, H);
    if (X) for (const s of [0, 1]) {
      // Parte estendida: as bordas do cenário espelhadas (continua sem emenda).
      const q = ac.width / W; ctx.save(); ctx.translate(s ? 2 * W : 0, 0); ctx.scale(-1, 1);
      ctx.drawImage(ac, s ? (W - X) * q : 0, 0, X * q, ac.height, s ? W - X : 0, 0, X, H);
      if (arena.platCv) ctx.drawImage(arena.platCv, s ? (W - X) * q : 0, 0, X * q, arena.platCv.height, s ? W - X : 0, 0, X, H);
      ctx.restore();
    }
    if (arena.anim) arena.anim(ctx, time); drawArenaMood(ctx, arena, time); if (arena.platCv) ctx.drawImage(arena.platCv, 0, 0, W, H); drawAmbient(ctx, ambient, time);
    ctx.restore(); drawArenaWalls(X); ctx.save(); ctx.beginPath(); ctx.rect(-X + WALL_FACE, frameTop, W + 2 * X - 2 * WALL_FACE, H - WALL_FACE - frameTop); ctx.clip();
  }
  if (phase !== "lobby" && phase !== "select" && phase !== "looks") {
    Events.drawBack(ctx); drawBossLayer(ctx);
    for (const e of fx) drawFx(e, "back");
    drawTempBlocks();
    for (const p of pickups) drawPickup(p);
    for (const f of fighters) if (!f.alive) drawFighter(f);
    for (const f of fighters) drawGroundShadow(f);
    for (const f of fighters) if (f.alive && f.sp >= 100) drawSpAura(f);
    for (const f of fighters) if (f.alive) {
      if (f.cloakT > 0) {
        // Camuflado: só um contorno tremido aparece quando ele se mexe.
        const mv = clamp(hyp(f.pelvis.vx, f.pelvis.vy) / 600, 0, 1);
        ctx.save(); ctx.globalAlpha = .04 + mv * .08 + (f.cloakT < 1 ? (1 - f.cloakT) * .4 : 0); ctx.translate(Math.sin(time * 40) * 2 * mv, 0); drawFighter(f); ctx.restore();
      } else drawFighter(f);
    }
    for (const f of fighters) if (f.alive && !f.bot && phase === "fight" && hasMc(f)) drawMcGhost(f);
    for (const f of fighters) if (f.alive && !f.bot && f.sk && f.sk.id === "megabomb" && f.sk.t > .3) drawMegaAim(f);
    for (const f of fighters) if (f.alive && !f.bot && f.w.hold && f.fuel < .999) {
      const x = f.head.x, y = f.head.y - 74 * f.sc, w2 = 70, low = f.overheat > 0;
      ctx.fillStyle = OUT; roundRect(ctx, x - w2 / 2 - 3, y - 3, w2 + 6, 13, 6); ctx.fill();
      ctx.fillStyle = low ? (Math.floor(time * 8) % 2 ? "#ff3a2a" : "#5a1a10") : f.fuel < .3 ? "#ff7a2a" : "#ffd84a"; roundRect(ctx, x - w2 / 2, y, Math.max(4, w2 * f.fuel), 7, 3.5); ctx.fill();
    }
    for (const f of fighters) if (f.alive && !f.bot && !f.sk && hasBombTypes(f) && (f.pl.input.powHeld || (f.pl.input.aiming && hyp(f.pl.input.ax, f.pl.input.ay) > .2))) drawBombAim(f);
    drawBomb();
    for (const pr of projectiles) drawProjectile(pr);
    Events.drawFront(ctx);
    for (const e of fx) drawFx(e, "front");
    drawParticles();
    drawBossWarnings(ctx);
    drawRealHoles();
    if (racing) { drawDeath(); drawRaceTags(); }
  }
  if (!racing && arena.fg) ctx.drawImage(arena.fg, 0, 0, W, H); // plantas e pedras em primeiro plano
  if (arena.front && !racing) arena.front(ctx, time);
  ctx.restore();
  if (cam.z < .999 && !racing) {
    // Moldura da arena: deixa claro onde fica a borda do mapa.
    // (as bordas de cima e de baixo agora são paredes, desenhadas junto com as laterais)
  }
  // Daqui pra baixo: tela fixa (sem zoom) — correção de cor, vinheta e interface.
  ctx.setTransform(scale, 0, 0, scale, offX, offY);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (GRADE[arena.id]) { ctx.globalCompositeOperation = "soft-light"; ctx.globalAlpha = .28; ctx.fillStyle = GRADE[arena.id]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${arena.vignette})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (flashScreen > 0) { ctx.fillStyle = `rgba(255,250,220,${flashScreen * 3})`; ctx.fillRect(0, 0, W, H); }
  if (phase === "intro") drawIntro();
  else if (phase === "looks") drawLooks();
  else if (phase === "select") { drawSelect(); drawParticles(); }
  else if (phase === "over") { drawOver(); drawParticles(); }
  else if (phase !== "lobby") drawHUD();
  if (cutin) drawCutin();
  ctx.restore();
}
// Cortina de transição (num canvas por cima de tudo, inclusive do menu).
function drawTop() {
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, topCv.width, topCv.height);
  if (!trans) return;
  const t = trans.t, cover = t < .4 ? ease(t / .4) : 1 - ease((t - .4) / .4);
  const w = topCv.width / 2 * cover, h = topCv.height;
  tctx.fillStyle = "#120c09"; tctx.fillRect(0, 0, w, h); tctx.fillRect(topCv.width - w, 0, w, h);
  tctx.fillStyle = "#e8b84a"; tctx.fillRect(w - 3, 0, 3, h); tctx.fillRect(topCv.width - w, 0, 3, h);
  if (cover > .9) { tctx.font = `bold ${Math.round(48 * scale)}px Georgia`; tctx.textAlign = "center"; tctx.fillStyle = `rgba(232,184,74,${(cover - .9) * 10})`; tctx.fillText("⚔", topCv.width / 2, h / 2 + 16 * scale); }
}
function updateTrans(real) {
  if (!trans) return;
  trans.t += real;
  if (trans.t >= .4 && !trans.done) { trans.done = true; trans.mid(); sfx.whooshOut(); }
  if (trans.t >= .8) trans = null;
}

// ───────────────────────── Loop principal ─────────────────────────
let last = performance.now(), acc = 0, lastBeat = 0, lobbyCycle = 0;
// Um erro num quadro nunca pode parar o jogo: registra e segue pro próximo.
function frame(now) {
  try { frameBody(now); }
  catch (err) { console.error(err); try { ctx.reset?.(); } catch {} }
  requestAnimationFrame(frame);
}
// Trilha de cada momento: menu, luta (muda com a arena), chefão, zumbis e corrida.
function musicFor() {
  if (phase === "over") return null; // no fim toca só a fanfarra
  if (phase === "lobby" || phase === "looks" || phase === "select") return "menu";
  if (mode === "chefe") return "chefe";
  if (mode === "zumbi") return "zumbi";
  if (mode === "corrida") return race && race.final ? "chefe" : "corrida";
  return ["luta1", "luta2", "luta3", "luta4", "luta5", "luta6"][arenaIdx % 6];
}
function frameBody(now) {
  let real = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; // nunca volta no tempo
  Sound.music.set(musicFor()); Sound.music.duck(cutin ? .3 : phase === "between" ? .55 : 1);
  readKeyboard();
  updateTrans(real);
  updateCam(real);
  if (cutin) {
    // Cena do especial: o jogo fica parado até ela acabar.
    cutin.t += real;
    if (cutin.t >= cutin.dur || phase !== "fight") { const c = cutin; cutin = null; runSpecial(c); }
  } else if (hitstop > 0) hitstop -= real;
  else {
    if (slowmo > 0) { slowmo -= real; real *= .3; }
    acc += real;
    while (acc >= DT) { acc -= DT; try { step(DT); } catch (err) { console.error(err); } }
  }
  // Contagem 3-2-1 e gongo da luta.
  const beat = phase === "intro" ? (phaseT >= 2.1 ? 1 : phaseT >= 1.6 ? 2 : phaseT >= 1.1 ? 3 : 0) : phase === "fight" ? -1 : 0;
  if (beat !== lastBeat) { if (beat > 0) sfx.beep(false); if (beat === -1 && lastBeat === 1) sfx.gong(); lastBeat = beat; }
  // No menu com arena aleatória, o fundo vai passando pelas arenas.
  if (phase === "lobby" && arenaChoice === "random") { lobbyCycle += real; if (lobbyCycle > 7) { lobbyCycle = 0; setArena((arenaIdx + 1) % ARENAS.length); refreshLobby(); } }
  shake = Math.max(0, shake - real * 60); flashScreen = Math.max(0, flashScreen - real);
  draw(); drawTop();
}

// ───────────────────────── Rede (celulares) ─────────────────────────
let ws = null, replaced = false, fresh = 1, roomCode = "";
// Online: a tela guarda o código da sala pra voltar pra ela se recarregar ou a internet cair.
try { roomCode = sessionStorage.getItem("duelo_sala") || ""; } catch {}
function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}/ws/screen?fresh=${fresh}&room=${encodeURIComponent(roomCode)}`);
  fresh = 0;
  ws.onmessage = (e) => onPad(JSON.parse(e.data));
  ws.onclose = () => { if (!replaced) setTimeout(connect, 1000); };
}
function send(m) { const p = players.get(m.to); if (ws && ws.readyState === 1 && p && p.kind === "pad") ws.send(JSON.stringify(m)); }
function onPad(m) {
  if (m.type === "room") { roomCode = m.code; try { sessionStorage.setItem("duelo_sala", m.code); } catch {} showPadUrl(); return; }
  if (m.type === "full") { replaced = true; const el = document.getElementById("replaced"); el.textContent = "O servidor está cheio agora. Tente de novo em alguns minutos."; el.style.display = "flex"; return; }
  if (m.type === "replaced") { replaced = true; document.getElementById("replaced").style.display = "flex"; return; }
  if (m.type === "join") { const p = addPlayer(m.id, m.name, "pad"); spawnLate(p); return; }
  const p = players.get(m.id); if (!p) return;
  if (m.type === "leave") {
    Object.assign(p.input, { jx: 0, jy: 0, aiming: false, charging: false });
    if (phase === "lobby" || phase === "select") players.delete(m.id); else p.connected = false;
    refreshLobby();
  } else if (m.type === "joy") { p.input.jx = m.x; p.input.jy = m.y; p.input.joyT = time; }
  else if (m.type === "charge") p.input.charging = !!m.on;
  else if (m.type === "hold") p.input.fireHeld = !!m.on;
  else if (m.type === "pow") { p.input.powHeld = !!m.on; if (m.on) p.input.powStart = performance.now(); }
  else if (m.type === "grab") { p.input.grabHeld = !!m.on; if (m.on) p.input.grab = true; }
  else if (m.type === "dash") { p.input.dashHeld = !!m.on; if (m.on) p.input.dash = true; }
  else if (m.type === "mcT") { const f = fighters.find(f => f.id === p.id); if (f && phase === "fight" && hasMc(f)) mcSet(f, +m.p || 0); }
  else if (m.type === "bombT") { const f = fighters.find(f => f.id === p.id); if (f && phase === "fight" && hasBombTypes(f)) bombSet(f, +m.p || 0); }
  else if (m.type === "mmPow") { const f = fighters.find(f => f.id === p.id); if (f && phase === "fight") mmSet(f, +m.p || 0); }
  else if (m.type === "look") setLook(p, m);
  else if (m.type === "lookReady" && phase === "looks") { p.lookReady = !p.lookReady; sfx.confirm(); }
  else if (m.type === "aim") { p.input.aiming = !!m.on; p.input.ax = +m.x || 0; p.input.ay = +m.y || 0; }
  else if (m.type === "btn" && m.down) {
    // Se veio com mira (arrastou o botão), dispara pra lá.
    const aim = m.ax !== undefined && hyp(m.ax, m.ay) > .2 ? Math.atan2(m.ay, m.ax) : null;
    if (m.b === "atk") {
      p.input.atk = true; p.input.atkAim = aim; p.input.atkMag = aim != null ? Math.min(1, hyp(m.ax, m.ay)) : null;
      if (p.input.powHeld) { p.input.atkPow = bombPower(p.input); p.input.powHeld = false; }
    }
    if (m.b === "sp") p.input.sp = true;
    if (m.b === "mag") { p.input.mag = true; p.input.magAim = aim; }
  }
  else if (m.type === "start") startMatch();
  else if (m.type === "mode") setMode(m.m);
  else if (m.type === "arena") shiftArena(m.d > 0 ? 1 : -1);
  else if (m.type === "choose" && phase === "select" && choiceList().includes(m.w)) { p.choice = m.w; p.ready = true; p.cursor = choiceList().indexOf(m.w); sfx.confirm(); }
}
const arenaLabel = () => arenaChoice === "random" ? "Aleatória" : ARENAS[arenaChoice].name;
setInterval(() => {
  for (const p of players.values()) {
    if (p.kind !== "pad") continue;
    const f = fighters.find(f => f.id === p.id);
    let weapon = f ? WEAPONS[f.wtype].name : (p.choice && mode === "escolha" ? WEAPONS[p.choice].name : "-");
    if (f && f.mmEn) weapon = `Mega Buster · ${MM_POWERS[f.mmPow].name}`;
    if (f && hasBombTypes(f)) weapon = BOMB_TYPES[f.bombT].name;
    if (f && hasMc(f)) weapon = `Kit · ${MC_ITEMS[f.mcT || 0].name}`;
    const skill = f && f.alive && hasSkill(f) ? { n: f.w.skill, cd: +clamp(f.skillCd / SKILLS[f.wtype].cd, 0, 1).toFixed(2) } : null;
    if (f && f.w.ammo) weapon += ` (${f.ammo}/${f.w.ammo})`;
    if (f && f.w.clip) weapon += f.clipT > 0 ? " (recarregando)" : ` (${f.clip}/${f.w.clip})`;
    send({ to: p.id, type: "you", color: p.color, hp: f ? f.hp : MAX_HP, maxHp: MAX_HP, score: p.score, weapon,
           magic: f && f.magic ? `${MAGIC[f.magic].name} ×${f.uses}` : "",
           phase, mode, arena: arenaLabel(), choice: p.choice, ready: p.ready, lookReady: !!p.lookReady, timeLeft: Math.ceil(Math.max(0, phase === "looks" ? looksT : selT)),
           alive: f ? f.alive : true, banner, ranged: !!f && RANGED.has(f.w.kind), relics: relicsUnlocked, hat: p.hat, outfit: p.outfit,
           taken: [...players.values()].filter(o => o !== p && o.connected).map(o => o.color), chargeable: !!f && !!f.w.charge && !f.mmPow, canThrow: !!f && f.alive && f.wtype !== "punhos" && !f.magic && !skill && !f.mmEn && !hasBombTypes(f) && !hasMc(f), sp: f ? Math.floor(f.sp || 0) : 0, grabbing: !!(f && f.grabbing),
           mc: f && f.alive && hasMc(f) ? { p: f.mcT || 0 } : null,
           skill, mm: f && f.alive && f.mmEn ? { p: f.mmPow, en: f.mmEn.map(v => Math.floor(v)) } : null,
           bomb: f && f.alive && hasBombTypes(f) ? { p: f.bombT } : null, pow: !!f && f.alive && hasBombTypes(f), hold: !!f && f.alive && !!f.w.hold, fuel: f && f.w.hold ? +(f.fuel ?? 1).toFixed(2) : null });
  }
}, 120);

// ───────────────────────── Menu (lobby) ─────────────────────────
const $ = (id) => document.getElementById(id);
const avatars = new Map();
function avatar(p) {
  const key = `${p.color}|${p.hat}|${p.outfit}`;
  if (!avatars.has(key)) {
    const c = document.createElement("canvas"); c.width = 64; c.height = 84;
    drawLookPreview(c.getContext("2d"), p, 30, 50, .62);
    avatars.set(key, c.toDataURL());
  }
  return avatars.get(key);
}
function refreshLobby() {
  if (!$("botn")) return;
  $("botn").textContent = botCount;
  document.querySelectorAll("[data-m]").forEach(el => el.classList.toggle("sel", el.dataset.m === mode));
  $("arenaName").textContent = arenaLabel();
  $("arenaSub").textContent = arenaChoice === "random" ? "Uma arena diferente a cada rodada" : ARENAS[arenaChoice].sub;
  const src = arenaThumb(arenaChoice === "random" ? arena : ARENAS[arenaChoice]);
  if ($("arenaThumb").getAttribute("src") !== src) $("arenaThumb").src = src;
  $("arenaThumb").classList.toggle("dice", arenaChoice === "random");
  const list = [...players.values()].filter(p => p.connected);
  $("plist").innerHTML = list.map(p =>
    `<span class="chip ${p.kind === "bot" ? "bot" : ""}"><img src="${avatar(p)}" alt="">${p.name.replace(/[<>&"]/g, "")}</span>`).join("") || '<span class="empty">Ninguém entrou ainda</span>';
}
$("startBtn").onclick = () => startMatch();
function toggleMusic() {
  const on = Sound.music.toggle(); Sound.unlock();
  $("musicBtn").textContent = on ? "🎵 Música: ligada" : "🔇 Música: desligada"; showToast(on ? "♪ Música ligada" : "Música desligada", "#c58bff");
}
$("musicBtn").textContent = Sound.music.on ? "🎵 Música: ligada" : "🔇 Música: desligada";
$("musicBtn").onclick = (e) => { e.stopPropagation(); toggleMusic(); };
document.querySelectorAll("[data-m]").forEach(el => el.onclick = () => setMode(el.dataset.m));
$("arenaPrev").onclick = () => shiftArena(-1);
$("arenaNext").onclick = () => shiftArena(1);
$("botMinus").onclick = () => shiftBots(-1);
$("botPlus").onclick = () => shiftBots(1);
// Endereço do controle e QR code. Online, vão com o código da sala.
let padInfo = null;
function showPadUrl() {
  if (!padInfo) return;
  const online = padInfo.online, url = online ? (roomCode ? `${padInfo.pad_url}?sala=${roomCode}` : "") : padInfo.pad_url;
  if (online) {
    $("url").innerHTML = roomCode ? `${padInfo.pad_url.replace(/^https?:\/\//, "")}<br>Sala <b style="font-size:1.6em;letter-spacing:.12em">${roomCode}</b>` : "criando sala…";
    document.querySelector(".join .steps").innerHTML = "Aponte a câmera para o código, ou abra o endereço<br>e digite o número da sala (funciona até no 4G)";
  } else $("url").textContent = url.replace("http://", "");
  if (!url) return;
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); $("qr").innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); }
  catch { $("qr").textContent = "Sem internet para o QR: digite o endereço abaixo"; }
}
fetch("/info").then(r => r.json()).then(i => { padInfo = i; showPadUrl(); }).catch(() => {});

// ───────────────────────── Teclado ─────────────────────────
// Apertar qualquer tecla de um dos esquemas já coloca esse jogador no jogo.
const keys = new Set();
const KB = [
  { id: "kb1", name: "Teclado 1", l: "KeyA", r: "KeyD", u: "KeyW", d: "KeyS", atk: "KeyF", mag: "KeyG", grab: "KeyH", dash: "ShiftLeft", sp: "KeyR" },
  { id: "kb2", name: "Teclado 2", l: "ArrowLeft", r: "ArrowRight", u: "ArrowUp", d: "ArrowDown", atk: "KeyK", mag: "KeyL", grab: "KeyJ", dash: "ShiftRight", sp: "KeyI" },
];
addEventListener("keydown", (e) => {
  if (keys.has(e.code)) return; keys.add(e.code);
  if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
  for (const k of KB) {
    if (![k.l, k.r, k.u, k.d, k.atk, k.mag, k.grab, k.dash, k.sp].includes(e.code)) continue;
    let p = players.get(k.id);
    const fresh = !p || !p.connected;
    if (fresh) { p = addPlayer(k.id, k.name, "kb"); spawnLate(p); }
    if (phase === "select") {
      const st = { [k.l]: -1, [k.r]: 1, [k.u]: -selCols(), [k.d]: selCols() }[e.code];
      const n = choiceList().length;
      if (st) { p.cursor = (p.cursor + st + n) % n; sfx.nav(); }
      if (e.code === k.atk) { p.choice = choiceList()[p.cursor]; p.ready = true; sfx.confirm(); }
    } else {
      if (phase === "looks" && !fresh) {
        if (e.code === k.u) cycleLook(p, "color");
        if (e.code === k.d) cycleLook(p, "outfit");
        if (e.code === k.mag) cycleLook(p, "hat");
        if (e.code === k.atk) { p.lookReady = !p.lookReady; sfx.confirm(); }
        continue;
      }
      const f = fighters.find(x => x.id === k.id);
      if (e.code === k.atk && f && f.alive && f.w.hold) p.input.fireHeld = true;
      else if (e.code === k.atk) { if (f && f.alive && hasBombTypes(f)) { p.input.powHeld = true; p.input.powStart = performance.now(); } else if (f && f.w.charge) p.input.charging = true; else p.input.atk = true; }
      if (e.code === k.mag) p.input.mag = true;
      if (e.code === k.grab) p.input.grab = true;
      if (e.code === k.dash) p.input.dash = true;
      if (e.code === k.sp) p.input.sp = true;
    }
  }
  if (e.code === "Enter") startMatch();
  if (e.code === "Escape" && phase !== "lobby") { sfx.back(); goLobby(); }
  if (e.code === "Digit1" || e.code === "Numpad1") setMode("aleatorio");
  if (e.code === "Digit2" || e.code === "Numpad2") setMode("escolha");
  if (e.code === "Digit3" || e.code === "Numpad3") setMode("chefe");
  if (e.code === "Digit4" || e.code === "Numpad4") setMode("bomba");
  if (e.code === "Digit5" || e.code === "Numpad5") setMode("zumbi");
  if (e.code === "Digit6" || e.code === "Numpad6") setMode("corrida");
  if (e.code === "KeyM") toggleMusic();
  if (phase === "select" && (e.code === "KeyQ" || e.code === "PageUp")) selNav(-1);
  if (phase === "select" && (e.code === "KeyE" || e.code === "PageDown")) selNav(1);
  if (phase === "select" && e.code === "Tab") { e.preventDefault(); selAll = !selAll; selAllAt = time; selHoldUntil = time + 15; sfx.nav(); }
  if (e.code === "KeyQ") shiftArena(-1);
  if (e.code === "KeyE") shiftArena(1);
  if (["+", "="].includes(e.key) || ["Equal", "NumpadAdd"].includes(e.code)) shiftBots(1);
  if (["-", "_"].includes(e.key) || ["Minus", "NumpadSubtract"].includes(e.code)) shiftBots(-1);
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  for (const k of KB) if (e.code === k.atk) {
    const p = players.get(k.id); if (!p) continue;
    p.input.fireHeld = false;
    if (p.input.powHeld) { p.input.atkPow = bombPower(p.input); p.input.powHeld = false; p.input.atk = true; }
    else if (p.input.charging) { p.input.charging = false; p.input.atk = true; }
  }
});
addEventListener("blur", () => keys.clear());
function readKeyboard() {
  for (const k of KB) {
    const p = players.get(k.id); if (!p) continue;
    const x = (keys.has(k.r) ? 1 : 0) - (keys.has(k.l) ? 1 : 0), y = (keys.has(k.d) ? 1 : 0) - (keys.has(k.u) ? 1 : 0);
    const l = hyp(x, y) || 1; p.input.jx = x / l; p.input.jy = y / l;
    p.input.grabHeld = keys.has(k.grab); p.input.dashHeld = keys.has(k.dash);
  }
}

// ───────────────────────── Início ─────────────────────────
setArena(0);
refreshLobby();
connect();
requestAnimationFrame(frame);
