/* ═══════════════════════════════════════════════════════════
   SPACEHERDER — Arctic Pastoral Background v4
   Natural agriculture feel: rolling tundra, grazing reindeer and sheep,
   gentle snowfall, aurora, warm earthy palette
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  let canvas, ctx;
  let W, H;
  let time = 0;

  const stars = [];
  const snowflakes = [];
  const herds = [];       // individual animals
  const herdGroups = [];  // the bands they travel in

  /* ─── INIT ─── */
  function init() {
    canvas = document.getElementById('agri-reindeer-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    // Fewer particles on a phone, where the fill cost actually matters
    const small = W < 768;

    // Stars — warm tinted
    for (let i = 0; i < (small ? 45 : 90); i++) {
      stars.push({
        x: Math.random(),
        y: Math.random() * 0.45,
        r: Math.random() * 1.3 + 0.4,
        base: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 2 + 0.8
      });
    }

    // Gentle snowfall
    for (let i = 0; i < (small ? 30 : 70); i++) {
      snowflakes.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0002,
        vy: Math.random() * 0.0003 + 0.00008,
        r: Math.random() * 2.2 + 0.6,
        alpha: Math.random() * 0.4 + 0.15,
        drift: Math.random() * Math.PI * 2
      });
    }

    buildHerds();
    loop();
  }

  /* ─── RESIZE ─── */
  let resizeTimer = null;
  let lastW = 0, lastH = 0;

  function resize() {
    // Measure the container rather than window.innerHeight. On a phone the URL
    // bar slides away as you scroll, which changes innerHeight and fires resize
    // repeatedly mid-scroll — reallocating the canvas and teleporting every
    // herd. The container is sized in vh, which does not move with the URL bar.
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (w === lastW && h === lastH) return;

    const widthChanged = w !== lastW;
    lastW = w;
    lastH = h;
    W = w;
    H = h;

    // Phones commonly report devicePixelRatio 3. Capping lower cuts the number
    // of pixels filled per frame by more than half, which is what makes this
    // scene expensive while scrolling, at no visible cost for shapes this soft.
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 2);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Herds are laid out across the width, so only a width change needs them
    // rebuilt. Height-only changes leave the bands where they are.
    if (widthChanged) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(buildHerds, 150);
    }
  }

  /* ─── HERDS ─── */
  /* A band is a single-species group. Reindeer travel with reindeer, sheep with
     sheep. The band owns the position and decides when to walk or stop; members
     hold a fixed offset from it, so a herd stays a herd instead of drifting into
     an evenly spaced line. */
  function buildHerds() {
    herds.length = 0;
    herdGroups.length = 0;

    // ridge, species, count, scale, speed (px/frame), where it starts across the width
    addBand(0, 'deer',  5, 0.44, 0.09, 0.08);
    addBand(0, 'sheep', 5, 0.46, 0.07, 0.58);
    addBand(1, 'deer',  6, 0.72, 0.13, 0.02);
    addBand(1, 'sheep', 6, 0.74, 0.10, 0.42);
    addBand(1, 'deer',  4, 0.70, 0.11, 0.80);
    addBand(2, 'deer',  5, 1.15, 0.20, 0.24);
    addBand(2, 'sheep', 5, 1.02, 0.16, 0.82);
  }

  function addBand(ridge, kind, count, scale, speed, startFrac) {
    const band = {
      ridge,
      kind,
      speed,
      // Spaced deliberately so no ridge sits empty while a band walks off-screen
      x: (startFrac + Math.random() * 0.06) * (W || 1920),
      grazing: Math.random() < 0.4,
      grazeT: Math.random() * 600 + 300
    };
    herdGroups.push(band);

    // Sheep flock tightly; reindeer string out more
    const spread = (kind === 'sheep' ? 34 : 58) * scale * (1 + count * 0.16);

    for (let i = 0; i < count; i++) {
      herds.push({
        kind,
        ridge,
        band,
        // Clustered rather than uniform: squaring a signed random pulls most
        // members toward the middle of the band and leaves a few stragglers.
        offset: (function () {
          const r = Math.random() * 2 - 1;
          return r * Math.abs(r) * spread;
        })(),
        scale: scale * (0.88 + Math.random() * 0.28),
        walk: Math.random() * Math.PI * 2,
        grazing: false,
        headT: Math.random() * 260 + 90
      });
    }
  }

  /* ─── HERD MOTION ─── */
  function updateHerds() {
    herdGroups.forEach(b => {
      b.grazeT--;
      if (b.grazeT <= 0) {
        b.grazing = !b.grazing;
        // Long grazing stops, longer walks — the whole band moves together
        b.grazeT = b.grazing ? 420 + Math.random() * 600 : 900 + Math.random() * 900;
      }

      if (!b.grazing) b.x += b.speed;
      if (b.x > W + 260) b.x = -260;
    });

    herds.forEach(d => {
      if (!d.band.grazing) {
        // Stride rate scales with speed and inversely with size
        const gait = (d.kind === 'sheep' ? 0.16 : 0.11) * d.band.speed / d.scale;
        d.walk += gait;
        d.grazing = false;
      } else {
        // Standing still: heads go up and down independently
        d.headT--;
        if (d.headT <= 0) {
          d.grazing = !d.grazing;
          d.headT = d.grazing ? 150 + Math.random() * 320 : 90 + Math.random() * 200;
        }
      }
    });
  }

  /* ─── TERRAIN ─── */
  function ridgeY(x, ridge) {
    if (ridge === 0) return H * 0.52 + Math.sin(x * 0.0015 + 0.6) * 35 + Math.cos(x * 0.003) * 18;
    if (ridge === 1) return H * 0.70 + Math.sin(x * 0.0018 + 2.2) * 45 + Math.sin(x * 0.004) * 22;
    return H * 0.87 + Math.sin(x * 0.0012 - 0.9) * 30 + Math.cos(x * 0.0028) * 18;
  }

  /* ─── STATIC GEOMETRY CACHE ─── */
  /* The sky gradient, the mountain silhouette, the three ridge fills and the
     grass roots only change when the canvas size or the theme changes. Rebuilding
     all of that from scratch on every frame was most of the per-frame cost, and
     it is why the scene struggled to keep up on a phone. */
  let cache = null;

  function mountainY(x) {
    return H * 0.44
      + Math.sin(x * 0.001 + 1.2) * 60
      + Math.cos(x * 0.003 + 0.5) * 30
      + Math.sin(x * 0.007) * 12;
  }

  function buildCache(light) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    if (light) {
      sky.addColorStop(0, '#A8BCCE');
      sky.addColorStop(0.35, '#BACCDC');
      sky.addColorStop(0.7, '#C8D6E5');
      sky.addColorStop(1, '#C8D6E5');
    } else {
      sky.addColorStop(0, '#0a0e14');
      sky.addColorStop(0.25, '#0f1820');
      sky.addColorStop(0.45, '#162030');
      sky.addColorStop(0.6, '#1a2a28');
      sky.addColorStop(1, '#1a2b24');
    }

    // Mountain silhouette and its snow caps
    const mountain = new Path2D();
    mountain.moveTo(0, H);
    for (let x = -5; x <= W + 5; x += 8) mountain.lineTo(x, mountainY(x));
    mountain.lineTo(W + 5, H);
    mountain.closePath();

    const caps = new Path2D();
    for (let x = -5; x <= W + 5; x += 8) {
      if (x === -5) caps.moveTo(x, mountainY(x));
      else caps.lineTo(x, mountainY(x));
    }
    for (let x = W + 5; x >= -5; x -= 8) {
      caps.lineTo(x, mountainY(x) - 6 - Math.max(0, Math.sin(x * 0.005)) * 8);
    }
    caps.closePath();

    const mountainGrad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.6);
    if (light) {
      mountainGrad.addColorStop(0, '#6A8AA5');
      mountainGrad.addColorStop(1, '#8FA8BF');
    } else {
      mountainGrad.addColorStop(0, '#141f1c');
      mountainGrad.addColorStop(1, '#0f1a16');
    }

    // Ridge fills
    const palette = light
      ? [['#8FA8BF', '#7A96AE'], ['#A8BCCE', '#8FA8BF'], ['#BACCDC', '#A8BCCE']]
      : [['#1a2b24', '#12201a'], ['#1e3328', '#152a1f'], ['#243d2e', '#1a3024']];

    const hills = [];
    const hillGrads = [];
    for (let r = 0; r < 3; r++) {
      const path = new Path2D();
      path.moveTo(0, H);
      for (let x = -5; x <= W + 5; x += 8) path.lineTo(x, ridgeY(x, r));
      path.lineTo(W + 5, H);
      path.closePath();
      hills.push(path);

      const g = ctx.createLinearGradient(0, H * 0.4, 0, H);
      g.addColorStop(0, palette[r][0]);
      g.addColorStop(1, palette[r][1]);
      hillGrads.push(g);
    }

    // Grass roots. Only the sway stays live, and that is a couple of sines.
    const grass = [];
    for (let r = 0; r < 3; r++) {
      const base = r === 2 ? 6 : r === 1 ? 10 : 16;
      const spacing = W < 768 ? base * 1.8 : base;
      const count = Math.floor(W / spacing);
      const blades = [];
      for (let i = 0; i < count; i++) {
        const bx = i * spacing + Math.sin(i * 3.7) * 3;
        const by = ridgeY(bx, r);
        if (by > H) continue;
        blades.push({
          bx, by,
          h: (r === 2 ? 8 : r === 1 ? 5 : 3) + Math.sin(i * 2.3) * 2
        });
      }
      grass.push(blades);
    }

    cache = { light, w: W, h: H, sky, mountain, caps, mountainGrad, hills, hillGrads, grass };
  }

  /* ─── LOOP ─── */
  function isLightMode() {
    return document.documentElement.getAttribute('data-theme') === 'light';
  }

  function loop() {
    requestAnimationFrame(loop);

    // Every section below the hero has an opaque background, so once the hero is
    // scrolled past there is nothing to see. Skipping the frame entirely is the
    // difference between a smooth scroll and a stuttering one on a phone.
    if (document.hidden || window.scrollY > H + 100) return;

    time += 1 / 60;
    ctx.clearRect(0, 0, W, H);
    const light = isLightMode();

    if (!cache || cache.light !== light || cache.w !== W || cache.h !== H) {
      buildCache(light);
    }

    updateHerds();

    drawSky();
    if (!light) {
      drawAurora();
      drawStars();
    } else {
      drawSunGlow();
    }
    // Satellite pass
    drawSatelliteOrbit(light);

    // Distant mountains
    drawMountains(light);

    // Layer 0 — far pasture
    drawHillFill(0);
    drawGrassTexture(0, light);
    drawHerd(0, light);

    // Gentle mist between layers
    drawMist(H * 0.58, light ? 0.15 : 0.08, light);

    // Layer 1 — mid pasture
    drawHillFill(1);
    drawGrassTexture(1, light);
    drawHerd(1, light);

    drawMist(H * 0.72, light ? 0.12 : 0.06, light);

    // Layer 2 — foreground
    drawHillFill(2);
    drawGrassTexture(2, light);
    drawHerd(2, light);

    drawSnowfall(light);
  }

  /* ─── SKY ─── */
  function drawSky() {
    ctx.fillStyle = cache.sky;
    ctx.fillRect(0, 0, W, H);
  }

  /* ─── SATELLITE PASS ─── */
  function drawSatelliteOrbit(light) {
    ctx.save();

    // Clip to sky area only — satellite never goes below the horizon
    ctx.beginPath();
    ctx.rect(0, 0, W, H * 0.52);
    ctx.clip();

    // Flight path: a shallow arc across the sky. The satellite travels from one
    // edge to the other and re-enters on the opposite side — it never loops back
    // over the herd.
    const margin = 60;                 // off-screen lead-in / lead-out
    const span   = W + margin * 2;     // total travel distance per pass
    const baseY  = H * 0.16;           // altitude at the screen edges
    const arc    = H * 0.05;           // how much higher it rides mid-sky

    // Height for a given x — matches at both edges so the wrap is seamless
    function pathY(x) {
      const t = Math.max(0, Math.min(1, x / (W || 1)));
      return baseY - Math.sin(t * Math.PI) * arc;
    }

    // Satellite x (slow pass, ~28 sec edge to edge)
    const satX = ((time * (span / 28)) % span) - margin;
    const satY = pathY(satX);

    // ── Flight path (faint dashed line across the sky) ──
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = -margin + (i / 120) * span;
      if (i === 0) ctx.moveTo(x, pathY(x));
      else ctx.lineTo(x, pathY(x));
    }
    ctx.strokeStyle = light ? 'rgba(20, 70, 120, 0.12)' : 'rgba(56, 189, 248, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 10]);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Glowing trail (fades out behind the satellite, cut off at the edge) ──
    const trailLen   = W * 0.22;
    const trailSteps = 50;
    const trailRGB   = light ? '3, 105, 161' : '56, 189, 248';
    const trailMax   = light ? 0.22 : 0.38;

    for (let i = 0; i < trailSteps - 1; i++) {
      const frac0 = i / trailSteps;
      const frac1 = (i + 1) / trailSteps;
      const x0 = satX - trailLen + trailLen * frac0;
      const x1 = satX - trailLen + trailLen * frac1;
      // Don't draw trail that would have come from before the entry point
      if (x1 < -margin) continue;
      ctx.beginPath();
      ctx.moveTo(x0, pathY(x0));
      ctx.lineTo(x1, pathY(x1));
      ctx.strokeStyle = `rgba(${trailRGB}, ${frac1 * trailMax})`;
      ctx.lineWidth = 1.5 + frac1;
      ctx.stroke();
    }

    // ── Satellite body ──
    const sx = satX, sy = satY;

    // Signal beam (cone pointing toward tundra below)
    const beamLen = Math.min(H * 0.38, 160);
    const beamGrad = ctx.createLinearGradient(sx, sy, sx, sy + beamLen);
    const beamRGB = light ? '3, 105, 161' : '56, 189, 248';
    beamGrad.addColorStop(0, `rgba(${beamRGB}, 0.18)`);
    beamGrad.addColorStop(1, `rgba(${beamRGB}, 0)`);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - 22, sy + beamLen);
    ctx.lineTo(sx + 22, sy + beamLen);
    ctx.closePath();
    ctx.fillStyle = beamGrad;
    ctx.fill();

    // Glow halo around satellite
    const haloRGB = light ? '3, 105, 161' : '56, 189, 248';
    const halo = ctx.createRadialGradient(sx, sy, 2, sx, sy, 16);
    halo.addColorStop(0, `rgba(${haloRGB}, 0.4)`);
    halo.addColorStop(1, `rgba(${haloRGB}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(sx, sy);

    // Solar panels
    const panelFill = light ? '#1E3A5F' : '#0EA5E9';
    const panelLine = light ? '#0F172A' : '#0369A1';
    [-1, 1].forEach(side => {
      const px = side === -1 ? -18 : 8;
      ctx.fillStyle = panelFill;
      ctx.fillRect(px, -3, 10, 6);
      // Panel cell lines
      ctx.fillStyle = panelLine;
      ctx.fillRect(px,     -3, 2, 6);
      ctx.fillRect(px + 4, -3, 2, 6);
    });

    // Body
    ctx.fillStyle = light ? '#334155' : '#94A3B8';
    ctx.beginPath();
    ctx.roundRect(-5, -4, 10, 8, 2);
    ctx.fill();
    ctx.fillStyle = light ? '#64748B' : '#E2E8F0';
    ctx.fillRect(-2, -4, 2, 8); // highlight stripe

    // Antenna + tip dot
    ctx.strokeStyle = light ? '#475569' : '#94A3B8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -11);
    ctx.stroke();
    ctx.fillStyle = light ? `rgba(3, 105, 161, 1)` : `rgba(56, 189, 248, 1)`;
    ctx.beginPath();
    ctx.arc(0, -12, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  /* ─── SUN GLOW (Light mode) ─── */
  function drawSunGlow() {
    ctx.save();
    const g = ctx.createRadialGradient(W * 0.75, H * 0.25, 10, W * 0.75, H * 0.25, 300);
    g.addColorStop(0, 'rgba(254, 243, 199, 0.45)');
    g.addColorStop(0.4, 'rgba(224, 242, 254, 0.2)');
    g.addColorStop(1, 'rgba(240, 249, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ─── AURORA — soft organic ribbons ─── */
  function drawAurora() {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Soft green ribbon
    ctx.beginPath();
    ctx.moveTo(0, H * 0.4);
    for (let x = 0; x <= W; x += 20) {
      const y = H * 0.18 + Math.sin(x * 0.0022 + time * 0.5) * 45 + Math.cos(x * 0.004 - time * 0.3) * 30;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const g1 = ctx.createLinearGradient(0, 0, 0, H * 0.42);
    g1.addColorStop(0, 'rgba(120, 220, 160, 0)');
    g1.addColorStop(0.35, 'rgba(100, 200, 140, 0.14)');
    g1.addColorStop(0.6, 'rgba(80, 180, 120, 0.08)');
    g1.addColorStop(1, 'rgba(60, 160, 100, 0)');
    ctx.fillStyle = g1;
    ctx.fill();

    // Faint warm purple undertone
    ctx.beginPath();
    ctx.moveTo(0, H * 0.38);
    for (let x = 0; x <= W; x += 30) {
      const y = H * 0.22 + Math.cos(x * 0.002 - time * 0.4) * 55 + Math.sin(x * 0.0035 + time * 0.25) * 25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const g2 = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    g2.addColorStop(0, 'rgba(140, 120, 200, 0)');
    g2.addColorStop(0.4, 'rgba(120, 100, 180, 0.08)');
    g2.addColorStop(1, 'rgba(100, 80, 160, 0)');
    ctx.fillStyle = g2;
    ctx.fill();

    ctx.restore();
  }

  /* ─── STARS ─── */
  function drawStars() {
    stars.forEach(s => {
      const a = s.base + Math.sin(time * s.speed + s.x * 30) * 0.2;
      ctx.fillStyle = `rgba(230, 235, 255, ${Math.max(0.1, Math.min(0.85, a))})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /* ─── DISTANT MOUNTAINS ─── */
  function drawMountains(light) {
    ctx.fillStyle = cache.mountainGrad;
    ctx.fill(cache.mountain);
    ctx.fillStyle = light ? 'rgba(255, 255, 255, 0.7)' : 'rgba(200, 210, 220, 0.08)';
    ctx.fill(cache.caps);
  }

  /* ─── HILL / PASTURE FILL ─── */
  function drawHillFill(ridge) {
    ctx.fillStyle = cache.hillGrads[ridge];
    ctx.fill(cache.hills[ridge]);
  }

  /* ─── GRASS TEXTURE — subtle organic lines ─── */
  function drawGrassTexture(ridge, light) {
    const blades = cache.grass[ridge];
    const alpha = ridge === 2 ? 0.18 : ridge === 1 ? 0.12 : 0.07;

    ctx.lineWidth = 0.6;
    ctx.strokeStyle = light ? `rgba(71, 85, 105, ${alpha * 1.2})` : `rgba(90, 140, 100, ${alpha})`;

    // One path for the whole layer instead of a stroke call per blade
    ctx.beginPath();
    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const sway = Math.sin(time * 1.5 + b.bx * 0.01) * 2;
      ctx.moveTo(b.bx, b.by);
      ctx.quadraticCurveTo(b.bx + sway, b.by - b.h * 0.6, b.bx + sway * 1.5, b.by - b.h);
    }
    ctx.stroke();
  }

  /* ─── MIST / FOG LAYERS ─── */
  function drawMist(baseY, alpha, light) {
    ctx.save();
    const drift = Math.sin(time * 0.3) * 20;
    const g = ctx.createLinearGradient(0, baseY - 30, 0, baseY + 40);
    const color = light ? '255, 255, 255' : '180, 200, 190';
    g.addColorStop(0, `rgba(${color}, 0)`);
    g.addColorStop(0.5, `rgba(${color}, ${alpha})`);
    g.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(drift - 30, baseY - 30, W + 60, 70);
    ctx.restore();
  }

  /* ─── HERD ─── */
  function drawHerd(ridge, light) {
    // Back to front so animals further along the slope overlap correctly
    const layer = herds
      .filter(d => d.ridge === ridge)
      .sort((a, b) => (a.band.x + a.offset) - (b.band.x + b.offset));

    layer.forEach(d => {
      const x = d.band.x + d.offset;
      const y = ridgeY(x, d.ridge);

      if (d.kind === 'sheep') {
        drawSheep(x, y, d, ridge, light);
      } else {
        drawDeer(x, y, d, ridge, light);
      }
    });
  }

  /* ─── NATURAL REINDEER SILHOUETTE ─── */
  function drawDeer(x, y, d, ridge, light) {
    ctx.save();
    ctx.translate(x, y);
    const s = d.scale;
    ctx.scale(s, s);

    const walk = d.grazing ? 0 : d.walk;
    const bW = 34, hipY = -30;
    const leg = 22;

    // Quadruped gait
    const fl = Math.sin(walk) * 0.4;
    const fr = Math.sin(walk + Math.PI) * 0.4;
    const bl = Math.sin(walk + Math.PI * 0.55) * 0.36;
    const br = Math.sin(walk + Math.PI * 1.55) * 0.36;

    // Colors — per layer depth & theme
    let bodyColor, darkColor, lightColor, antlerColor;
    if (light) {
      if (ridge === 0) {
        bodyColor = '#475569'; darkColor = '#334155'; lightColor = '#64748B'; antlerColor = '#1E293B';
      } else if (ridge === 1) {
        bodyColor = '#334155'; darkColor = '#1E293B'; lightColor = '#475569'; antlerColor = '#0F172A';
      } else {
        bodyColor = '#1E293B'; darkColor = '#0F172A'; lightColor = '#334155'; antlerColor = '#020617';
      }
    } else {
      if (ridge === 0) {
        bodyColor = '#2a3d32'; darkColor = '#1f2e26'; lightColor = '#354a3c'; antlerColor = '#4a6050';
      } else if (ridge === 1) {
        bodyColor = '#3a5244'; darkColor = '#2d4237'; lightColor = '#4a6454'; antlerColor = '#6a8a70';
      } else {
        bodyColor = '#4a6455'; darkColor = '#3a5446'; lightColor = '#5a7666'; antlerColor = '#8aaa8a';
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- Far legs (darker) ---
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 3.5;
    drawLeg(-bW * 0.35, hipY + 5, br, leg);
    drawLeg(bW * 0.3, hipY + 5, fr, leg);

    // --- Body ---
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    // Start at rump top
    ctx.moveTo(-bW * 0.45, hipY);
    // Back profile: slight dip then up to shoulder hump
    ctx.quadraticCurveTo(-bW * 0.1, hipY + 4, bW * 0.35, hipY - 4);
    // Front chest down to belly
    ctx.quadraticCurveTo(bW * 0.45, hipY + 10, bW * 0.15, hipY + 14);
    // Belly profile
    ctx.quadraticCurveTo(-bW * 0.1, hipY + 15, -bW * 0.4, hipY + 10);
    // Back of hind leg to rump
    ctx.quadraticCurveTo(-bW * 0.52, hipY + 5, -bW * 0.45, hipY);
    ctx.closePath();
    ctx.fill();

    // Light belly
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(0, hipY + 10, bW * 0.25, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Tail ---
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-bW * 0.45, hipY + 1);
    ctx.quadraticCurveTo(-bW * 0.55, hipY + 2, -bW * 0.52, hipY + 6 + Math.sin(time * 2.5) * 2);
    ctx.stroke();

    // --- Neck & Head ---
    const nkX = bW * 0.3, nkY = hipY - 2;
    // Lower head position, more forward like a real grazing/walking deer
    const hdX = d.grazing ? bW * 0.6 : bW * 0.65;
    const hdY = d.grazing ? hipY + 18 : hipY - 12;

    // Thick neck
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(nkX, nkY);
    ctx.quadraticCurveTo(nkX + 5, (nkY + hdY) / 2 + 3, hdX - 2, hdY + 2);
    ctx.stroke();

    // Elongated Head
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(hdX, hdY, 8.5, 4.5, d.grazing ? 0.4 : 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Lighter muzzle
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.ellipse(hdX + 6, hdY + (d.grazing ? 2 : 1), 3.5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hdX - 2, hdY - 1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Ears (pointing back slightly)
    ctx.strokeStyle = bodyColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hdX - 4, hdY - 3);
    ctx.lineTo(hdX - 10, hdY - 6);
    ctx.moveTo(hdX - 2, hdY - 3.5);
    ctx.lineTo(hdX - 6, hdY - 8);
    ctx.stroke();

    // --- Antlers ---
    ctx.strokeStyle = antlerColor;
    ctx.lineWidth = 1.8;
    const ax = hdX - 3, ay = hdY - 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax - 8, ay - 12, ax - 2, ay - 24);
    ctx.quadraticCurveTo(ax + 4, ay - 32, ax + 14, ay - 34);
    
    // Back tines
    ctx.moveTo(ax - 4, ay - 16);
    ctx.lineTo(ax - 10, ay - 18);
    
    ctx.moveTo(ax - 1, ay - 23);
    ctx.lineTo(ax - 4, ay - 28);
    
    // Top tines
    ctx.moveTo(ax + 5, ay - 28);
    ctx.lineTo(ax + 10, ay - 32);
    
    // Brow tine
    ctx.moveTo(ax, ay - 2);
    ctx.quadraticCurveTo(ax + 8, ay - 4, ax + 12, ay - 2);
    ctx.moveTo(ax + 6, ay - 3);
    ctx.lineTo(ax + 8, ay - 8);
    ctx.stroke();

    // --- Near legs (lighter) ---
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 3.5;
    drawLeg(-bW * 0.35, hipY + 5, bl, leg);
    drawLeg(bW * 0.3, hipY + 5, fl, leg);

    // Hooves
    [
      { a: fl, hx: bW * 0.3 },
      { a: bl, hx: -bW * 0.35 }
    ].forEach(h => {
      const kx = h.hx + Math.sin(h.a) * leg * 0.5;
      const ky = hipY + 5 + Math.cos(h.a) * leg * 0.5;
      const fa = h.a - Math.max(0, h.a) * 0.5;
      const fx = kx + Math.sin(fa) * leg * 0.5;
      const fy = ky + Math.cos(fa) * leg * 0.5;
      ctx.fillStyle = darkColor;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  /* ─── WOOLLY SHEEP SILHOUETTE ─── */
  function drawSheep(x, y, d, ridge, light) {
    ctx.save();
    ctx.translate(x, y);
    const s = d.scale * 0.72;   // sheep stand shorter than the reindeer
    ctx.scale(s, s);

    const walk = d.grazing ? 0 : d.walk;
    const bW = 26, backY = -20;
    const leg = 13;

    // Quadruped gait — shorter, quicker stride than a reindeer
    const fl = Math.sin(walk) * 0.3;
    const fr = Math.sin(walk + Math.PI) * 0.3;
    const bl = Math.sin(walk + Math.PI * 0.55) * 0.27;
    const br = Math.sin(walk + Math.PI * 1.55) * 0.27;

    // Colors — per layer depth & theme
    let woolColor, woolShade, faceColor;
    if (light) {
      if (ridge === 0) {
        woolColor = '#7C8CA0'; woolShade = '#64748B'; faceColor = '#334155';
      } else if (ridge === 1) {
        woolColor = '#5A6B80'; woolShade = '#475569'; faceColor = '#1E293B';
      } else {
        woolColor = '#44546A'; woolShade = '#334155'; faceColor = '#0F172A';
      }
    } else {
      if (ridge === 0) {
        woolColor = '#3c5044'; woolShade = '#2c3d34'; faceColor = '#1f2e26';
      } else if (ridge === 1) {
        woolColor = '#56705e'; woolShade = '#42594b'; faceColor = '#2d4237';
      } else {
        woolColor = '#708c78'; woolShade = '#587062'; faceColor = '#3a5446';
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // --- Far legs (darker) ---
    ctx.strokeStyle = faceColor;
    ctx.lineWidth = 2.6;
    drawLeg(-bW * 0.28, backY + 8, br, leg);
    drawLeg(bW * 0.26, backY + 8, fr, leg);

    // --- Woolly body: base ellipse plus fluff bumps around the top edge ---
    ctx.fillStyle = woolColor;
    ctx.beginPath();
    ctx.ellipse(0, backY + 6, bW * 0.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const fluff = [
      [-11, -3, 5], [-6, -6, 5.5], [0, -7, 5.5], [6, -6, 5.5],
      [11, -3, 5], [12, 2, 4.5], [-12, 2, 4.5]
    ];
    fluff.forEach(f => {
      ctx.beginPath();
      ctx.arc(f[0], backY + 6 + f[1], f[2], 0, Math.PI * 2);
      ctx.fill();
    });

    // Shaded underside
    ctx.fillStyle = woolShade;
    ctx.beginPath();
    ctx.ellipse(0, backY + 11, bW * 0.38, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Short tail tuft ---
    ctx.fillStyle = woolColor;
    ctx.beginPath();
    ctx.arc(-bW * 0.52, backY + 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // --- Head & neck (dark face, no antlers) ---
    const hdX = d.grazing ? bW * 0.52 : bW * 0.56;
    const hdY = d.grazing ? backY + 17 : backY + 1;

    ctx.strokeStyle = faceColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bW * 0.32, backY + 4);
    ctx.lineTo(hdX - 1, hdY);
    ctx.stroke();

    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.ellipse(hdX, hdY, 5.5, 3.6, d.grazing ? 0.9 : 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Woolly forehead tuft
    ctx.fillStyle = woolColor;
    ctx.beginPath();
    ctx.arc(hdX - 3.5, hdY - 2.5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hdX + 0.5, hdY - 0.8, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Drooping ears
    ctx.strokeStyle = faceColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hdX - 3, hdY - 1);
    ctx.quadraticCurveTo(hdX - 7, hdY + 1, hdX - 8, hdY + 4);
    ctx.stroke();

    // --- Near legs (lighter) ---
    ctx.strokeStyle = woolShade;
    ctx.lineWidth = 2.6;
    drawLeg(-bW * 0.28, backY + 8, bl, leg);
    drawLeg(bW * 0.26, backY + 8, fl, leg);

    ctx.restore();
  }

  function drawLeg(hx, hy, angle, len) {
    const kx = hx + Math.sin(angle) * len * 0.5;
    const ky = hy + Math.cos(angle) * len * 0.5;
    const fa = angle - Math.max(0, angle) * 0.5;
    const fx = kx + Math.sin(fa) * len * 0.5;
    const fy = ky + Math.cos(fa) * len * 0.5;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, fy);
    ctx.stroke();
  }

  /* ─── SNOWFALL ─── */
  function drawSnowfall(light) {
    snowflakes.forEach(s => {
      s.x += s.vx + Math.sin(time * 0.8 + s.drift) * 0.00015;
      s.y += s.vy;

      if (s.y > 1.02) { s.y = -0.02; s.x = Math.random(); }
      if (s.x < -0.02) s.x = 1.02;
      if (s.x > 1.02) s.x = -0.02;

      ctx.fillStyle = light ? `rgba(100, 116, 139, ${s.alpha * 0.6})` : `rgba(220, 230, 240, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
