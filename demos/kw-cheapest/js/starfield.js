(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'starfield-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // Insert right after the nebula backdrop so stars paint on top of it,
  // but before the grain/scanline/vignette layers (both z-index: 0, so
  // DOM order decides who wins; those other layers use z-index: 1 and
  // always win regardless of order).
  const backdrop = document.querySelector('.cosmic-backdrop');
  if (backdrop && backdrop.parentNode) {
    backdrop.after(canvas);
  } else {
    document.body.prepend(canvas);
  }

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stars = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generateStars();
  }

  function generateStars() {
    const count = Math.min(220, Math.floor((window.innerWidth * window.innerHeight) / 8000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.3,
      baseAlpha: Math.random() * 0.45 + 0.3,
      twinkleSpeed: Math.random() * 0.0012 + 0.0004,
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * 0.008 + 0.003,
    }));
  }

  function drawStatic() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.globalAlpha = s.baseAlpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      const alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.phase) * 0.3;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      s.y -= s.drift;
      if (s.y < 0) s.y = window.innerHeight;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();

  if (reduceMotion) {
    drawStatic();
  } else {
    requestAnimationFrame(draw);
  }
})();
