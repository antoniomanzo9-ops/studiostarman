/* ═══════════════════════════════════════════════════════
   DESCENT ENGINE — Creative Disaster
   Spatial navigation through rooms. Particles shift
   with each passage. BIF emotional palette drives color.
   ═══════════════════════════════════════════════════════ */

(function initDescent() {
  'use strict';

  const container = document.getElementById('theDescent');
  if (!container) return;

  const canvas = document.getElementById('descentCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  const rooms = container.querySelectorAll('.descent-room');
  const dots = container.querySelectorAll('.descent-dot');
  const prevBtn = document.getElementById('descentPrev');
  const nextBtn = document.getElementById('descentNext');
  const humanBtn = document.getElementById('descentHuman');
  const agentBtn = document.getElementById('descentAgent');

  const TOTAL = rooms.length;
  let current = 0;
  let transitioning = false;
  rooms.forEach(room => {
    room.style.willChange = 'transform, opacity';
  });

  // ── BIF Palette — one per room ──
  const roomPalettes = [
    { bg: '#020202', primary: '#1A237E', secondary: '#0D1147', particle: '#1A237E' },   // Notte — the beginning
    { bg: '#0A0808', primary: '#A80000', secondary: '#3A0000',  particle: '#A80000' },   // Fuoco — Orpheus
    { bg: '#020202', primary: '#FF1744', secondary: '#4A0010',  particle: '#FF1744' },   // Pericolo — he looks back
    { bg: '#050508', primary: '#AA00FF', secondary: '#2A0044',  particle: '#AA00FF' },   // Intuizione — photographs, machines
    { bg: '#020202', primary: '#00D4AA', secondary: '#003D32',  particle: '#00D4AA' },   // Calma — the threshold
  ];

  // ── Particle System ──
  const particles = [];
  const PARTICLE_COUNT = prefersReducedMotion ? 0 : 120;
  let mouseX = 0, mouseY = 0;

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = (Math.random() - 0.5) * 0.3 - 0.15; // slight upward drift
      this.opacity = Math.random() * 0.5 + 0.1;
      this.life = Math.random() * 200 + 100;
      this.maxLife = this.life;
      this.drift = Math.random() * Math.PI * 2;
      this.driftSpeed = Math.random() * 0.008 + 0.002;
    }

    update(palette) {
      this.drift += this.driftSpeed;
      this.x += this.speedX + Math.sin(this.drift) * 0.3;
      this.y += this.speedY + Math.cos(this.drift) * 0.15;

      // Mouse influence — subtle repulsion
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (!coarsePointer && dist > 0 && dist < 150) {
        const force = (150 - dist) / 150 * 0.5;
        this.x += (dx / dist) * force;
        this.y += (dy / dist) * force;
      }

      this.life--;
      if (this.life <= 0 || this.x < -20 || this.x > canvas.width + 20 || this.y < -20 || this.y > canvas.height + 20) {
        this.reset();
      }
    }

    draw(palette) {
      const fadeIn = Math.min(1, (this.maxLife - this.life) / 20);
      const fadeOut = Math.min(1, this.life / 30);
      const alpha = this.opacity * fadeIn * fadeOut;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = palette.particle + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // Glow for larger particles
      if (this.size > 1.5) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = palette.particle + Math.round(alpha * 40).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }
  }

  // ── Connection Lines ──
  function drawConnections(palette) {
    const maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.08;
          ctx.strokeStyle = palette.particle + Math.round(alpha * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  // ── Radial Gradient Background ──
  function drawBackground(palette, time) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Breathing radial gradient — like the BIF orb
    const breathe = Math.sin(time * 0.001) * 0.3 + 0.7;
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.5, canvas.height * 0.5, 0,
      canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.5 * breathe
    );
    gradient.addColorStop(0, palette.secondary + '30');
    gradient.addColorStop(0.5, palette.secondary + '10');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Second ambient pulse — off-center
    const shift = Math.sin(time * 0.0006) * canvas.width * 0.15;
    const g2 = ctx.createRadialGradient(
      canvas.width * 0.3 + shift, canvas.height * 0.6, 0,
      canvas.width * 0.3 + shift, canvas.height * 0.6, canvas.width * 0.3
    );
    g2.addColorStop(0, palette.primary + '08');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Resize ──
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Init Particles ──
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  // ── Mouse tracking ──
  if (!coarsePointer) {
    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
  }

  // ── Animation Loop ──
  let running = !prefersReducedMotion;
  function animate(time) {
    if (!running) return;
    const palette = roomPalettes[current] || roomPalettes[0];

    drawBackground(palette, time);

    particles.forEach(p => {
      p.update(palette);
      p.draw(palette);
    });

    if (particles.length) {
      drawConnections(palette);
    }

    requestAnimationFrame(animate);
  }
  if (running) {
    requestAnimationFrame(animate);
  } else {
    drawBackground(roomPalettes[current] || roomPalettes[0], 0);
  }

  // ── Room Transition ──
  function goToRoom(index, direction) {
    if (transitioning || index < 0 || index >= TOTAL || index === current) return;
    transitioning = true;

    const exitClass = direction === 'forward' ? 'exit-up' : 'exit-down';
    const oldRoom = rooms[current];
    const newRoom = rooms[index];

    // Exit current
    oldRoom.classList.remove('active');
    oldRoom.classList.add(exitClass);

    // Enter new
    setTimeout(() => {
      oldRoom.classList.remove(exitClass);
      newRoom.classList.add('active');

      // Update dots
      dots.forEach((d, i) => d.classList.toggle('active', i === index));

      current = index;
      transitioning = false;
    }, 300);
  }

  // ── Navigation ──
  function goForward() { goToRoom(current + 1, 'forward'); }
  function goBack() { goToRoom(current - 1, 'backward'); }

  if (nextBtn) nextBtn.addEventListener('click', goForward);
  if (prevBtn) prevBtn.addEventListener('click', goBack);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (container.classList.contains('gone')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      goForward();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goBack();
    }
  });

  // Scroll / wheel navigation
  let scrollCooldown = false;
  container.addEventListener('wheel', e => {
    if (scrollCooldown) return;
    scrollCooldown = true;
    setTimeout(() => { scrollCooldown = false; }, 800);

    if (e.deltaY > 0) goForward();
    else goBack();
  }, { passive: true });

  // Touch swipe
  let touchStartY = 0;
  container.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  container.addEventListener('touchend', e => {
    const dy = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) {
      dy > 0 ? goForward() : goBack();
    }
  }, { passive: true });

  // Click on room 0 advances (first room prompt)
  rooms[0].addEventListener('click', e => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    goForward();
  });

  // ── Gate Buttons — enter the site ──
  function enterSite(mode) {
    // Store choice
    try { sessionStorage.setItem('cd-mode', mode); } catch(e) {}

    // Fade out descent
    container.classList.add('fade-out');
    running = false;

    setTimeout(() => {
      container.classList.add('gone');
      document.body.classList.remove('locked');

      // Show nav
      const nav = document.getElementById('mainNav');
      if (nav) {
        nav.style.opacity = '1';
        nav.style.pointerEvents = 'auto';
      }

      // Skip the old awakening if it exists
      const awakening = document.getElementById('awakening');
      if (awakening) {
        awakening.classList.add('gone');
        try { sessionStorage.setItem('cd-awakened', '1'); } catch(e) {}
      }

      // Reveal void hero
      if (typeof revealVoid === 'function') revealVoid();

      // Trigger reveals
      document.querySelectorAll('.rv').forEach(el => {
        const obs = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('vis'); obs.unobserve(entry.target); }
          });
        }, { threshold: 0.1 });
        obs.observe(el);
      });

    }, 1400);
  }

  if (humanBtn) humanBtn.addEventListener('click', () => enterSite('human'));
  if (agentBtn) agentBtn.addEventListener('click', () => enterSite('agent'));

  // ── Skip if already visited ──
  try {
    if (sessionStorage.getItem('cd-mode')) {
      container.classList.add('gone');
      running = false;
    }
  } catch(e) {}

})();
