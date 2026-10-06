// Eventos de arena: perigos que mudam a luta no meio da rodada.
//   erupcao    (Vulcão)       — treme, explode, a lava sobe em 2 etapas e caem meteoros
//   avalanche  (Pico Nevado)  — bolas de neve gigantes rolam pelo chão; pule!
//   tempestade (Porto)        — raios caem do céu onde o círculo amarelo avisar
// Todos avisam antes (som, tremor, marca no chão) pra dar tempo de reagir.
"use strict";
const Events = (() => {
  let ev = null;
  const LAVA_OFF = FLOOR + 60;

  function reset(a) {
    ev = a && a.event ? { kind: a.event, t: 0, stage: 0, lavaY: LAVA_OFF, lavaTarget: LAVA_OFF, timer: 8, side: 1, warnT: 0,
                          balls: [], marks: [], dark: 0, toast: null } : null;
  }
  function toast(text, color = "#ffb35a") { ev.toast = { text, color, t: 0 }; }

  // ── Atualização ──
  function update(dt) {
    if (!ev) return;
    ev.t += dt;
    if (ev.toast) { ev.toast.t += dt; if (ev.toast.t > 3.2) ev.toast = null; }
    if (ev.kind === "erupcao") updateEruption(dt);
    else if (ev.kind === "avalanche") updateAvalanche(dt);
    else if (ev.kind === "tempestade") updateStorm(dt);
  }

  function updateEruption(dt) {
    if (ev.stage === 0 && ev.t > 12) { ev.stage = 1; toast("O vulcão vai entrar em erupção! Subam!"); sfx.rumble(); }
    if (ev.stage === 1) {
      shake = Math.max(shake, 2 + (ev.t - 12) * 1.2);
      if (rnd() < .3) particles.push({ x: 800 + rnd(-40, 40), y: 250, vx: rnd(-20, 20), vy: rnd(-90, -50), life: 2, max: 2, color: "#3a2a2a", size: rnd(14, 26), g: -10, puff: true });
      if (ev.t > 16) {
        ev.stage = 2; ev.lavaTarget = 560; ev.timer = 2;
        toast("ERUPÇÃO!", "#ff5a2a"); sfx.boom(); sfx.rumble(); flashScreen = .22; shake = 28;
        for (let i = 0; i < 60; i++) particles.push({ x: 800 + rnd(-30, 30), y: 255, vx: rnd(-420, 420), vy: rnd(-1100, -500), life: 1.6, max: 1.6, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a"]), size: rnd(5, 11), g: 1000, glow: true });
      }
    }
    if (ev.stage >= 2) {
      // Fonte de lava saindo da cratera.
      for (let i = 0; i < 3; i++) particles.push({ x: 800 + rnd(-25, 25), y: 258, vx: rnd(-260, 260), vy: rnd(-780, -420), life: 1.4, max: 1.4, color: pick(["#ff7a1a", "#ffd84a", "#ff3a1a", "#ff5a1a"]), size: rnd(3, 8), g: 950, glow: true });
      if (rnd() < .25) particles.push({ x: 800 + rnd(-40, 40), y: 240, vx: rnd(-30, 30), vy: rnd(-120, -70), life: 3, max: 3, color: "#2a1a1a", size: rnd(20, 34), g: -15, puff: true });
      if (ev.stage === 2 && ev.t > 46) { ev.stage = 3; ev.lavaTarget = 430; toast("A lava está subindo mais!", "#ff5a2a"); sfx.rumble(); shake = 14; }
      ev.timer -= dt;
      if (ev.timer <= 0) { ev.timer = rnd(1.1, 2.2); markMeteor(); }
    }
    // A lava sobe devagar até a altura da etapa atual.
    if (ev.lavaY > ev.lavaTarget) ev.lavaY = Math.max(ev.lavaTarget, ev.lavaY - 15 * dt);
    if (ev.lavaY < FLOOR + 10) {
      if (rnd() < .5) particles.push({ x: rnd(WALL_L, WALL_R), y: ev.lavaY - 4, vx: rnd(-20, 20), vy: rnd(-160, -60), life: .6, max: .6, color: pick(["#ffd84a", "#ff7a1a"]), size: rnd(2, 4), g: 400, glow: true });
      for (const f of fighters) {
        if (!f.alive || f.lavaCd > 0) continue;
        const foot = Math.max(f.lf.y, f.rf.y, f.pelvis.y + 40 * f.sc);
        if (foot > ev.lavaY - 2) {
          f.lavaCd = .5;
          hurt(f, 8, 0, -1, 360, null, { env: true, stun: .05, snd: "fire", x: f.pelvis.x, y: ev.lavaY });
          for (let i = 0; i < 10; i++) particles.push({ x: f.pelvis.x + rnd(-20, 20), y: ev.lavaY, vx: rnd(-120, 120), vy: rnd(-320, -120), life: .5, max: .5, color: pick(["#ff7a1a", "#ffd84a"]), size: rnd(3, 7), g: 600, glow: true });
        }
      }
    }
    for (const m of ev.marks) { m.t += dt; if (m.t >= m.life && !m.done) { m.done = true; const sx = m.x + rnd(-260, 260); addProj("meteor", sx, -40, Math.atan2(m.y + 20, m.x - sx), 950, null); } }
    ev.marks = ev.marks.filter(m => !m.done || m.t < m.life + .1);
  }
  function markMeteor() {
    const alive = fighters.filter(f => f.alive);
    const x = alive.length && rnd() < .7 ? clamp(pick(alive).pelvis.x + rnd(-90, 90), WALL_L + 40, WALL_R - 40) : rnd(WALL_L + 40, WALL_R - 40);
    ev.marks.push({ x, y: surfaceBelow(x, 0, false), t: 0, life: 1.1, r: 80, color: "#ff5a2a" });
  }

  function updateAvalanche(dt) {
    ev.timer -= dt;
    if (ev.warnT > 0) {
      ev.warnT -= dt; shake = Math.max(shake, 3);
      if (ev.warnT <= 0) ev.balls.push({ x: ev.side > 0 ? WALL_L - 70 : WALL_R + 70, vx: ev.side * 700, r: 50, rot: 0, hits: new Set() });
    } else if (ev.timer <= 0) {
      ev.timer = rnd(8, 12); ev.side = rnd() < .5 ? 1 : -1; ev.warnT = 1.2;
      toast("Avalanche!", "#bfe8ff"); sfx.rumble();
    }
    for (const b of ev.balls) {
      b.x += b.vx * dt; b.rot += b.vx / b.r * dt; b.r = Math.min(64, b.r + 6 * dt);
      const y = FLOOR - b.r;
      if (rnd() < .9) particles.push({ x: b.x - Math.sign(b.vx) * b.r * .6, y: FLOOR - rnd(4, 30), vx: -b.vx * rnd(.1, .3), vy: rnd(-160, -40), life: .7, max: .7, color: "#ffffff", size: rnd(3, 7), g: 500, puff: true });
      for (const f of fighters) {
        if (!f.alive || b.hits.has(f.id)) continue;
        if (touches(f, b.x, y, b.x, y, b.r)) { b.hits.add(f.id); hurt(f, 15, Math.sign(b.vx), -.8, 880, null, { env: true, stun: .45, snd: "blunt" }); dust(f.pelvis.x, FLOOR, 12, "#ffffff"); }
      }
    }
    ev.balls = ev.balls.filter(b => b.x > -200 && b.x < W + 200);
  }

  function updateStorm(dt) {
    ev.dark = Math.min(.38, ev.t / 10 * .38);
    if (ev.t > 8) {
      ev.timer -= dt;
      if (ev.timer <= 0) {
        ev.timer = rnd(2.2, 3.8);
        const alive = fighters.filter(f => f.alive);
        const x = alive.length && rnd() < .7 ? clamp(pick(alive).pelvis.x + rnd(-60, 60), WALL_L + 40, WALL_R - 40) : rnd(WALL_L + 40, WALL_R - 40);
        ev.marks.push({ x, y: surfaceBelow(x, 0, false), t: 0, life: 1.15, r: 75, color: "#ffe95a" });
        if (ev.t < 9) toast("Tempestade! Fujam dos círculos!", "#ffe95a");
      }
    }
    for (const m of ev.marks) {
      m.t += dt;
      if (m.t >= m.life && !m.done) {
        m.done = true;
        fx.push({ type: "lightning", x1: m.x + rnd(-60, 60), y1: -20, x2: m.x, y2: m.y, t: 0, life: .35 });
        sfx.thunder(); flashScreen = .18; shake = Math.max(shake, 12); spark(m.x, m.y, "#ffe95a", 20); ring(m.x, m.y, "#ffe95a", 90);
        for (const f of fighters) if (f.alive && Math.abs(f.pelvis.x - m.x) < m.r && f.pelvis.y > m.y - 170 && f.pelvis.y < m.y + 10)
          hurt(f, 16, Math.sign(f.pelvis.x - m.x) || 1, -1.2, 420, null, { env: true, stun: .6, snd: "magicHit" });
      }
    }
    ev.marks = ev.marks.filter(m => !m.done || m.t < m.life + .1);
  }

  // ── IA: o que um bot deve fazer pra sobreviver ao perigo ──
  function botGoal(f) {
    if (!ev) return null;
    // Fugir de marcas no chão (meteoro, raio).
    for (const m of ev.marks) if (!m.done && Math.abs(f.pelvis.x - m.x) < m.r + 20 && Math.abs(f.pelvis.y + 47 * f.sc - m.y) < 120) return { jx: Math.sign(f.pelvis.x - m.x) || 1 };
    if (ev.kind === "avalanche") {
      for (const b of ev.balls) { const dx = f.pelvis.x - b.x; if (Math.sign(dx) === Math.sign(b.vx) && Math.abs(dx) < 260 && f.pelvis.y > FLOOR - 140) return { jump: true }; }
      if (ev.warnT > 0 && f.pelvis.y > FLOOR - 140) return { jump: rnd() < .5 };
    }
    if (ev.kind === "erupcao" && ev.stage >= 1) {
      // Subir pra uma plataforma que a lava não vai alcançar.
      const target = ev.stage >= 2 ? ev.lavaTarget : 560;
      const feet = f.pelvis.y + 47 * f.sc;
      if (feet < target - 25) return null;
      let best = null, bestCost = 1e9;
      for (const p of PLATFORMS) {
        if (p.y > target - 25) continue;
        const cx = p.x + p.w / 2, cost = Math.abs(cx - f.pelvis.x) + Math.max(0, feet - p.y) * .5 + (p.y < feet - 380 ? 600 : 0);
        if (cost < bestCost) { bestCost = cost; best = p; }
      }
      if (!best) return null;
      const cx = best.x + best.w / 2, under = f.pelvis.x > best.x - 40 && f.pelvis.x < best.x + best.w + 40;
      return { jx: Math.abs(cx - f.pelvis.x) > 30 ? Math.sign(cx - f.pelvis.x) : 0, jump: under || Math.abs(cx - f.pelvis.x) < best.w / 2 + 90 };
    }
    return null;
  }

  // ── Desenho ──
  function drawBack(c) {
    if (!ev) return;
    if (ev.kind === "erupcao" && ev.stage >= 1) {
      const k = ev.stage === 1 ? (ev.t - 12) / 4 : 1, pulse = .6 + Math.sin(time * 9) * .2;
      const g = c.createRadialGradient(800, 262, 5, 800, 262, 260 * (.5 + k * .5));
      g.addColorStop(0, `rgba(255,200,90,${.7 * k * pulse})`); g.addColorStop(.4, `rgba(255,90,20,${.35 * k})`); g.addColorStop(1, "rgba(255,60,10,0)");
      c.save(); c.globalCompositeOperation = "lighter"; c.fillStyle = g; c.beginPath(); c.arc(800, 262, 260, 0, 7); c.fill();
      if (ev.stage >= 2) {
        // Rios de lava escorrendo pelas encostas.
        c.strokeStyle = `rgba(255,120,30,${.7 + Math.sin(time * 6) * .2})`; c.lineWidth = 6; c.shadowColor = "#ff5a1a"; c.shadowBlur = 20;
        for (const [ex, wob] of [[560, 1], [1040, -1], [700, .5], [900, -.6]]) { c.beginPath(); c.moveTo(800, 265); c.bezierCurveTo(800 + (ex - 800) * .3, 380 + Math.sin(time * 2) * 8 * wob, ex - 40 * wob, 560, ex, 720); c.stroke(); }
        c.shadowBlur = 0;
      }
      c.restore();
    }
    for (const m of ev.marks) if (!m.done) drawMark(c, m);
    if (ev.kind === "avalanche" && ev.warnT > 0) {
      const x = ev.side > 0 ? 80 : W - 80, a = .5 + Math.sin(time * 18) * .5;
      c.save(); c.globalAlpha = a; c.fillStyle = "#bfe8ff"; c.font = "bold 64px Georgia"; c.textAlign = "center";
      c.fillText(ev.side > 0 ? "➜" : "⬅", x, FLOOR - 40); c.font = "bold 22px Georgia"; c.fillText("AVALANCHE", x + ev.side * 40, FLOOR - 110); c.restore();
    }
  }
  function drawMark(c, m) {
    const k = m.t / m.life, pulse = .5 + Math.sin(time * (10 + k * 20)) * .5;
    c.save();
    c.strokeStyle = m.color; c.globalAlpha = .4 + pulse * .5; c.lineWidth = 3 + k * 3;
    c.beginPath(); c.ellipse(m.x, m.y, m.r, m.r * .22, 0, 0, 7); c.stroke();
    c.fillStyle = m.color; c.globalAlpha = .12 + k * .25; c.beginPath(); c.ellipse(m.x, m.y, m.r * k, m.r * .22 * k, 0, 0, 7); c.fill();
    c.globalAlpha = .25 + k * .3; c.setLineDash([10, 10]); c.lineWidth = 2; c.beginPath(); c.moveTo(m.x, 0); c.lineTo(m.x, m.y); c.stroke(); c.setLineDash([]);
    c.restore();
  }
  function drawFront(c) {
    if (!ev) return;
    if (ev.kind === "erupcao" && ev.lavaY < FLOOR + 50) {
      const y0 = ev.lavaY;
      // Brilho de calor acima da lava.
      const hg = c.createLinearGradient(0, y0 - 90, 0, y0);
      hg.addColorStop(0, "rgba(255,90,20,0)"); hg.addColorStop(1, "rgba(255,110,30,.35)");
      c.fillStyle = hg; c.fillRect(0, y0 - 90, W, 90);
      // Superfície ondulando.
      const g = c.createLinearGradient(0, y0, 0, H);
      g.addColorStop(0, "#ffd84a"); g.addColorStop(.06, "#ff7a1a"); g.addColorStop(.35, "#c8320f"); g.addColorStop(1, "#3a0a05");
      c.fillStyle = g; c.beginPath(); c.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) c.lineTo(x, y0 + Math.sin(x * .02 + time * 2.4) * 5 + Math.sin(x * .007 - time * 1.3) * 4);
      c.lineTo(W, H); c.fill();
      // Crosta escura boiando.
      c.fillStyle = "rgba(60,15,8,.55)";
      for (let i = 0; i < 9; i++) { const x = (i * 211 + time * (18 + i * 3)) % (W + 200) - 100; c.beginPath(); c.ellipse(x, y0 + 18 + (i % 3) * 22, 50 + (i % 4) * 14, 6, 0, 0, 7); c.fill(); }
      c.save(); c.globalCompositeOperation = "lighter"; c.strokeStyle = "rgba(255,240,160,.7)"; c.lineWidth = 2; c.beginPath();
      for (let x = 0; x <= W; x += 16) c.lineTo(x, y0 + Math.sin(x * .02 + time * 2.4) * 5 + Math.sin(x * .007 - time * 1.3) * 4);
      c.stroke(); c.restore();
    }
    if (ev.kind === "avalanche") for (const b of ev.balls) {
      const y = FLOOR - b.r;
      c.save(); c.translate(b.x, y);
      c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(0, b.r - 2, b.r, 8, 0, 0, 7); c.fill();
      const g = c.createRadialGradient(-b.r * .35, -b.r * .35, 4, 0, 0, b.r); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#b8d4ec");
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, b.r, 0, 7); c.fill();
      c.rotate(b.rot); c.strokeStyle = "rgba(140,170,200,.6)"; c.lineWidth = 3;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(0, 0, b.r * (.35 + i * .15), i, i + 1.6); c.stroke(); }
      c.fillStyle = "#6a5a4a"; c.fillRect(b.r * .3, -4, 12, 6); c.fillRect(-b.r * .5, b.r * .2, 9, 9);
      c.restore();
    }
    if (ev.kind === "tempestade") {
      c.fillStyle = `rgba(10,15,30,${ev.dark})`; c.fillRect(0, 0, W, H);
      c.strokeStyle = `rgba(180,200,255,${.15 + ev.dark * .6})`; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 140; i++) { const x = (i * 137.5 + time * 260) % (W + 200) - 100, y = (i * 89.3 + time * 1100) % (H + 60) - 30; c.moveTo(x, y); c.lineTo(x - 8, y + 26); }
      c.stroke();
    }
  }

  return {
    reset, update, drawBack, drawFront, botGoal,
    get toast() { return ev && ev.toast; },
    get active() { return !!ev; },
    get lavaY() { return ev ? ev.lavaY : LAVA_OFF; },
  };
})();
