/* ═══════════════════════════════════════════════════════════════
   CREATIVE DISASTER — Physics Engine v1.0
   ═══════════════════════════════════════════════════════════════
   Digital Physics. Non animazioni — simulazioni.

   Rubato da: Active Theory (fluid dynamics, WebGL distortion),
   Linear (haptic micro-feedback), Cosmos (organic motion),
   Krea (magnetic cursor), Pangram (type as material).

   Systems:
   1. Fluid Cursor — displaces particles like a physical object
   2. Magnetic Fields — elements attract/repel based on proximity
   3. Spring Physics — everything has mass, damping, and tension
   4. Haptic Feedback — micro-scale on press, ripple on click
   5. Staggered Reveals — distance-based entrance delays (Cosmos)
   6. Reactive Typography — font-variation-settings driven by state

   Usage:
     <script src="cd-heartbeat.js"></script>
     <script src="cd-physics.js"></script>
     // Auto-initializes. Scans DOM for data-physics attributes.
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ═══ GLOBAL MOUSE STATE ═══
  const mouse = { x: -1000, y: -1000, vx: 0, vy: 0, speed: 0, down: false };
  let prevMX = 0, prevMY = 0;

  document.addEventListener('mousemove', (e) => {
    mouse.vx = e.clientX - mouse.x;
    mouse.vy = e.clientY - mouse.y;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);
  });
  document.addEventListener('mousedown', () => { mouse.down = true; });
  document.addEventListener('mouseup', () => { mouse.down = false; });


  // ═══════════════════════════════════════════
  // 1. SPRING SYSTEM — Everything is a spring
  // ═══════════════════════════════════════════
  class Spring {
    constructor(value, tension, damping) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.tension = tension || 120;   // stiffness
      this.damping = damping || 14;    // friction
    }
    update(dt) {
      const force = (this.target - this.value) * this.tension;
      this.velocity += force * dt;
      this.velocity *= Math.exp(-this.damping * dt);
      this.value += this.velocity * dt;
      return this.value;
    }
    set(target) { this.target = target; }
    snap(value) { this.value = value; this.target = value; this.velocity = 0; }
  }


  // ═══════════════════════════════════════════
  // 2. FLUID CURSOR — Physics-based cursor
  // ═══════════════════════════════════════════
  function initFluidCursor() {
    const curEl = document.getElementById('cur') || document.querySelector('.cur');
    if (!curEl) return;

    const posX = new Spring(0, 180, 16);   // tight follow
    const posY = new Spring(0, 180, 16);
    const scale = new Spring(1, 200, 18);
    const glow = new Spring(0, 80, 12);

    // Hover detection
    let hovering = false;
    document.querySelectorAll('a, button, [data-hover], .product-tag, .stazione-card, .freq-card, .resident-image, .rilascio-row, .carousel-card, .agent-card, .exp-card').forEach(el => {
      el.addEventListener('mouseenter', () => { hovering = true; scale.set(3); });
      el.addEventListener('mouseleave', () => { hovering = false; scale.set(1); });
    });

    // Click haptic
    document.addEventListener('mousedown', () => {
      scale.set(0.5);
      glow.set(1);
    });
    document.addEventListener('mouseup', () => {
      scale.set(hovering ? 3 : 1);
    });

    if (window.CDHeartbeat) {
      CDHeartbeat.subscribe('fluidCursor', (beat) => {
        posX.set(mouse.x);
        posY.set(mouse.y);
        glow.target = Math.max(glow.target * 0.95, beat.pulse * 0.3);

        const dt = beat.dt;
        const x = posX.update(dt);
        const y = posY.update(dt);
        const s = scale.update(dt);
        const g = glow.update(dt);

        curEl.style.left = x + 'px';
        curEl.style.top = y + 'px';

        const size = 4 * s;
        curEl.style.width = size + 'px';
        curEl.style.height = size + 'px';

        // Glow synced to heartbeat
        const glowSize = 8 + g * 20 + beat.pulse * 6;
        const glowColor = beat.color;
        curEl.style.boxShadow = g > 0.01
          ? `0 0 ${glowSize}px ${glowColor}${Math.round(g * 40).toString(16).padStart(2,'0')}`
          : 'none';
      });
    }
  }


  // ═══════════════════════════════════════════
  // 3. MAGNETIC ELEMENTS — Attract to cursor
  // ═══════════════════════════════════════════
  function initMagneticElements() {
    const magnets = document.querySelectorAll('[data-magnetic]');
    if (!magnets.length) return;

    const springs = [];
    magnets.forEach(el => {
      springs.push({
        el: el,
        sx: new Spring(0, 100, 14),
        sy: new Spring(0, 100, 14),
        strength: parseFloat(el.dataset.magnetic) || 0.3,
      });
    });

    if (window.CDHeartbeat) {
      CDHeartbeat.subscribe('magneticElements', (beat) => {
        springs.forEach(s => {
          const rect = s.el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = mouse.x - cx;
          const dy = mouse.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.max(rect.width, rect.height) * 2;

          if (dist < radius) {
            const force = (1 - dist / radius) * s.strength;
            s.sx.set(dx * force);
            s.sy.set(dy * force);
          } else {
            s.sx.set(0);
            s.sy.set(0);
          }

          const x = s.sx.update(beat.dt);
          const y = s.sy.update(beat.dt);
          s.el.style.transform = `translate(${x}px, ${y}px)`;
        });
      });
    }
  }


  // ═══════════════════════════════════════════
  // 4. HAPTIC FEEDBACK — Press scale, click ripple
  // ═══════════════════════════════════════════
  function initHapticFeedback() {
    // Press scale (Linear-style: 0.97 on press, spring back)
    document.querySelectorAll('a, button, .product-tag, .stazione-card, .freq-card, .agent-card, .exp-card, .carousel-card, [data-haptic]').forEach(el => {
      el.style.transition = 'none'; // we control transform ourselves

      const scaleSpring = new Spring(1, 300, 20);

      el.addEventListener('mousedown', (e) => {
        scaleSpring.set(0.96);
        e.stopPropagation(); // don't double-trigger

        // Click ripple
        const rect = el.getBoundingClientRect();
        const ripple = document.createElement('div');
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ripple.style.cssText = `
          position:absolute;left:${x}px;top:${y}px;
          width:0;height:0;border-radius:50%;
          background:radial-gradient(circle,rgba(232,228,223,.06) 0%,transparent 70%);
          transform:translate(-50%,-50%);
          pointer-events:none;z-index:10;
          animation:cdRipple .6s ease-out forwards;
        `;
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      });

      el.addEventListener('mouseup', () => scaleSpring.set(1));
      el.addEventListener('mouseleave', () => scaleSpring.set(1));

      // Animate
      function updateScale() {
        const s = scaleSpring.update(0.016);
        const existing = el.style.transform.replace(/scale\([^)]+\)/, '').trim();
        el.style.transform = `${existing} scale(${s})`.trim();
        requestAnimationFrame(updateScale);
      }
      updateScale();
    });
  }


  // ═══════════════════════════════════════════
  // 5. STAGGERED REVEALS — Cosmos-style distance-based
  // ═══════════════════════════════════════════
  function initStaggeredReveals() {
    const reveals = document.querySelectorAll('.reveal:not(.show)');
    if (!reveals.length) return;

    const io = new IntersectionObserver((entries) => {
      // Collect all newly visible elements
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;

      // Sort by distance from screen center for organic stagger
      const screenCX = window.innerWidth / 2;
      const screenCY = window.innerHeight / 2;

      visible.sort((a, b) => {
        const aRect = a.boundingClientRect;
        const bRect = b.boundingClientRect;
        const aDist = Math.sqrt(
          Math.pow(aRect.left + aRect.width/2 - screenCX, 2) +
          Math.pow(aRect.top + aRect.height/2 - screenCY, 2)
        );
        const bDist = Math.sqrt(
          Math.pow(bRect.left + bRect.width/2 - screenCX, 2) +
          Math.pow(bRect.top + bRect.height/2 - screenCY, 2)
        );
        return aDist - bDist;
      });

      // Stagger: closest appears first, each subsequent +80ms
      visible.forEach((entry, i) => {
        setTimeout(() => {
          entry.target.classList.add('show');
          entry.target.style.transitionDelay = '0ms'; // reset after
        }, i * 80);
        io.unobserve(entry.target);
      });

    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    reveals.forEach(r => io.observe(r));
  }


  // ═══════════════════════════════════════════
  // 6. REACTIVE TYPOGRAPHY — Font weight breathes with heartbeat
  // ═══════════════════════════════════════════
  function initReactiveTypography() {
    const reactiveEls = document.querySelectorAll('[data-reactive-type], .resident-name, .hero h1');
    if (!reactiveEls.length || !window.CDHeartbeat) return;

    CDHeartbeat.subscribe('reactiveTypography', (beat) => {
      reactiveEls.forEach(el => {
        // Weight oscillates with heartbeat: range 180-220 (subtle)
        const baseWeight = parseInt(el.dataset.baseWeight) || 200;
        const range = beat.intensity * 40; // more intense = wider range
        const weight = baseWeight + Math.sin(beat.rawPhase * Math.PI * 2) * range;

        // Apply via font-variation-settings for sub-pixel precision
        el.style.fontVariationSettings = `"wght" ${weight.toFixed(1)}`;

        // Opacity also breathes very subtly
        const baseOpacity = parseFloat(el.dataset.baseOpacity) || parseFloat(getComputedStyle(el).opacity) || 0.05;
        const opacityRange = beat.intensity * 0.02;
        el.style.opacity = (baseOpacity + beat.pulse * opacityRange).toFixed(4);
      });
    });
  }


  // ═══════════════════════════════════════════
  // 7. SVG TURBULENCE FILTER — For BIF orb magnetic distortion
  // ═══════════════════════════════════════════
  function initTurbulenceFilter() {
    // Inject SVG filter into page
    if (document.getElementById('cd-turbulence')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;width:0;height:0;';
    svg.innerHTML = `
      <defs>
        <filter id="cd-turbulence" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence id="cd-turb-noise" type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="1" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" id="cd-turb-displace"/>
        </filter>
        <filter id="cd-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0" id="cd-glow-blur" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    `;
    document.body.appendChild(svg);

    // Animate turbulence based on cursor proximity to BIF orbs
    const orbs = document.querySelectorAll('.bif-orb, .bif-global, [data-bif-orb]');
    if (!orbs.length || !window.CDHeartbeat) return;

    const displaceEl = document.getElementById('cd-turb-displace');
    const noiseEl = document.getElementById('cd-turb-noise');
    const glowBlur = document.getElementById('cd-glow-blur');

    CDHeartbeat.subscribe('turbulenceFilter', (beat) => {
      orbs.forEach(orb => {
        const rect = orb.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = mouse.x - cx;
        const dy = mouse.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        if (dist < maxDist) {
          const proximity = 1 - (dist / maxDist);
          const displace = proximity * 12 + beat.pulse * 4;
          const freq = 0.01 + proximity * 0.02 + mouse.speed * 0.0001;

          displaceEl.setAttribute('scale', displace.toFixed(2));
          noiseEl.setAttribute('baseFrequency', freq.toFixed(4));
          glowBlur.setAttribute('stdDeviation', (proximity * 6 + beat.pulse * 3).toFixed(1));

          orb.style.filter = `url(#cd-turbulence) url(#cd-glow)`;
        } else {
          // Subtle idle distortion from heartbeat
          const idleDisplace = beat.pulse * 2;
          displaceEl.setAttribute('scale', idleDisplace.toFixed(2));
          glowBlur.setAttribute('stdDeviation', (beat.pulse * 2).toFixed(1));
          orb.style.filter = idleDisplace > 0.1 ? `url(#cd-turbulence) url(#cd-glow)` : 'none';
        }
      });
    });
  }


  // ═══════════════════════════════════════════
  // 8. RIPPLE ANIMATION (injected CSS)
  // ═══════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('cd-physics-styles')) return;
    const style = document.createElement('style');
    style.id = 'cd-physics-styles';
    style.textContent = `
      @keyframes cdRipple {
        0% { width: 0; height: 0; opacity: 1; }
        100% { width: 300px; height: 300px; opacity: 0; }
      }

      /* Reactive typography transition */
      [data-reactive-type], .resident-name, .hero h1 {
        transition: font-variation-settings .1s linear, opacity .3s ease;
        will-change: font-variation-settings;
      }

      /* Staggered reveal enhancement */
      .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 1s cubic-bezier(.16,1,.3,1), transform 1s cubic-bezier(.16,1,.3,1);
      }
      .reveal.show {
        opacity: 1;
        transform: translateY(0);
      }

      /* Magnetic elements */
      [data-magnetic] {
        transition: none;
        will-change: transform;
      }

      /* Haptic press visual */
      .cd-press {
        transform: scale(0.97) !important;
      }
    `;
    document.head.appendChild(style);
  }


  // ═══════════════════════════════════════════
  // INIT — Boot all systems
  // ═══════════════════════════════════════════
  function init() {
    injectStyles();
    initFluidCursor();
    initMagneticElements();
    // initHapticFeedback(); // Disabled: conflicts with existing CSS transitions. Enable per-page.
    initStaggeredReveals();
    initReactiveTypography();
    initTurbulenceFilter();
  }

  // Boot when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ──
  window.CDPhysics = {
    Spring: Spring,
    mouse: mouse,
    initHaptic: initHapticFeedback,
    initMagnetic: initMagneticElements,
    initReactiveType: initReactiveTypography,
  };

})();
