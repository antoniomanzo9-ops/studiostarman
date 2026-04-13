/* ═══════════════════════════════════════════════════════
   CREATIVE DISASTER — Core Runtime v2
   CD Disc Cursor, Sound, BIF Orb, Grain, Transitions.
   Shared across all pages.
   ═══════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ══════════════════════════════════════════
  // CD DISC CURSOR — The identity in motion
  // ══════════════════════════════════════════
  const curEl = document.querySelector('.cur');
  const ringEl = document.querySelector('.cur-ring');

  if (curEl) {
    let mx = 0, my = 0, cx = 0, cy = 0, rx = 0, ry = 0;
    let prevMx = 0, prevMy = 0;
    let velocity = 0;
    let rotation = 0;
    let isHovering = false;

    // BIF emotional state colors for the disc
    const bifColors = [
      '#0A0A0A',  // pace
      '#00D4AA',  // calma
      '#1A237E',  // notte
      '#FF6D00',  // fuoco
      '#AA00FF',  // intuizione
      '#FF1744',  // pericolo
      '#FFB300',  // calore
    ];

    // Build the conic gradient
    const stops = bifColors.map((c, i) => {
      const pct = (i / bifColors.length) * 100;
      const pctNext = ((i + 1) / bifColors.length) * 100;
      return `${c} ${pct}%, ${c} ${pctNext}%`;
    }).join(', ');

    // Style the cursor as a CD disc
    curEl.style.cssText = `
      position: fixed;
      width: 24px; height: 24px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 10000;
      transform: translate(-50%, -50%);
      transition: width .4s cubic-bezier(.16,1,.3,1), height .4s cubic-bezier(.16,1,.3,1), opacity .3s;
      background: conic-gradient(${stops});
      mix-blend-mode: difference;
    `;

    // Add center hole (the CD hole)
    const hole = document.createElement('div');
    hole.style.cssText = `
      position: absolute;
      top: 50%; left: 50%;
      width: 6px; height: 6px;
      background: #020202;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
    `;
    curEl.appendChild(hole);

    // Ring keeps its style but gets slightly larger
    if (ringEl) {
      ringEl.style.cssText = `
        position: fixed;
        width: 48px; height: 48px;
        border: 1px solid rgba(168, 0, 0, .12);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        transition: width .6s cubic-bezier(.16,1,.3,1), height .6s cubic-bezier(.16,1,.3,1), opacity .4s;
        opacity: .3;
      `;
    }

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    });

    function tick() {
      // Smooth follow
      cx += (mx - cx) * .15;
      cy += (my - cy) * .15;
      rx += (mx - rx) * .06;
      ry += (my - ry) * .06;

      // Velocity for rotation speed
      const dx = mx - prevMx;
      const dy = my - prevMy;
      velocity = Math.sqrt(dx * dx + dy * dy);
      velocity = Math.min(velocity, 80);
      prevMx = mx;
      prevMy = my;

      // Rotation: faster with movement, slow idle spin
      const rotSpeed = 0.5 + (velocity * 0.4);
      rotation += rotSpeed;

      // Apply transforms
      curEl.style.left = cx + 'px';
      curEl.style.top = cy + 'px';
      curEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

      if (ringEl) {
        ringEl.style.left = rx + 'px';
        ringEl.style.top = ry + 'px';
      }

      // Hover state: expand disc
      if (isHovering) {
        curEl.style.width = '56px';
        curEl.style.height = '56px';
        hole.style.width = '12px';
        hole.style.height = '12px';
        if (ringEl) {
          ringEl.style.width = '80px';
          ringEl.style.height = '80px';
          ringEl.style.opacity = '.08';
        }
      } else {
        curEl.style.width = '24px';
        curEl.style.height = '24px';
        hole.style.width = '6px';
        hole.style.height = '6px';
        if (ringEl) {
          ringEl.style.width = '48px';
          ringEl.style.height = '48px';
          ringEl.style.opacity = '.3';
        }
      }

      requestAnimationFrame(tick);
    }
    tick();

    // Hover detection for interactive elements
    document.querySelectorAll('a, button, [data-hover]').forEach(el => {
      el.addEventListener('mouseenter', () => { isHovering = true; });
      el.addEventListener('mouseleave', () => { isHovering = false; });
    });

    // BIF page cyan override
    if (document.body.dataset.cursor === 'cyan') {
      const cyanStops = bifColors.map((c, i) => {
        const pct = (i / bifColors.length) * 100;
        const pctNext = ((i + 1) / bifColors.length) * 100;
        return `${c} ${pct}%, ${c} ${pctNext}%`;
      }).join(', ');
      // Keep the disc but shift ring color
      if (ringEl) {
        ringEl.style.borderColor = 'rgba(0, 212, 170, .12)';
      }
    }
  }


  // ══════════════════════════════════════════
  // SOUND ENGINE — Pentatonic clicks
  // ══════════════════════════════════════════
  let audioCtx = null;
  const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 D E G A C5
  let noteIndex = 0;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function playNote() {
    if (!audioCtx) return;
    const freq = pentatonic[noteIndex % pentatonic.length];
    noteIndex++;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.6);
  }

  // Click handler — plays sound + flash effect on cursor
  document.addEventListener('click', () => {
    initAudio();
    playNote();

    // Visual flash on cursor
    if (curEl) {
      curEl.style.boxShadow = '0 0 20px rgba(232, 228, 223, .4)';
      setTimeout(() => {
        curEl.style.boxShadow = 'none';
      }, 150);
    }
  });


  // ══════════════════════════════════════════
  // GRAIN — SVG noise overlay
  // ══════════════════════════════════════════
  const grain = document.querySelector('.grain');
  if (grain && !grain.querySelector('svg')) {
    grain.innerHTML = `<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <filter id="cd-grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="4" stitchTiles="stitch"/></filter>
      <rect width="100%" height="100%" filter="url(#cd-grain)" opacity=".5"/>
    </svg>`;
  }


  // ══════════════════════════════════════════
  // PAGE TRANSITION — Cinematic entry
  // ══════════════════════════════════════════
  const curtain = document.createElement('div');
  curtain.className = 'page-curtain';
  document.body.appendChild(curtain);
  curtain.addEventListener('animationend', () => curtain.remove());

  // Intercept internal links for exit transition
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
    e.preventDefault();
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity .3s ease';
    setTimeout(() => { window.location.href = href }, 300);
  });

  // Mobile navigation
  document.querySelectorAll('.nav').forEach(nav => {
    const toggle = nav.querySelector('.nav-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
      });
    });
  });


  // ══════════════════════════════════════════
  // BIF GLOBAL ORB — Time-aware, breathing
  // ══════════════════════════════════════════
  if (!document.querySelector('.bif-global') && !document.querySelector('#bif-orb') && !document.querySelector('#bifOrb')) {
    const orb = document.createElement('div');
    orb.className = 'bif-global';
    document.body.appendChild(orb);

    // Time-of-day awareness — BIF knows what hour it is
    function getTimeState() {
      const h = new Date().getHours();
      if (h >= 0 && h < 6) return { color: '#1A237E', glow: '#0D1147', bpm: 4 };   // notte
      if (h >= 6 && h < 9) return { color: '#FFB300', glow: '#4A3400', bpm: 10 };   // calore — morning
      if (h >= 9 && h < 18) return { color: '#00D4AA', glow: '#003D32', bpm: 8 };   // calma — working
      if (h >= 18 && h < 21) return { color: '#FF6D00', glow: '#4A2000', bpm: 14 }; // fuoco — evening
      return { color: '#AA00FF', glow: '#2A0044', bpm: 6 };                          // intuizione — late
    }

    function updateOrbTime() {
      const state = getTimeState();
      orb.style.backgroundColor = state.color;
      orb.style.boxShadow = `0 0 20px ${state.glow}`;
      // BPM to animation duration: 60/bpm = seconds per beat
      const breathDuration = 60 / state.bpm;
      orb.style.animationDuration = breathDuration + 's';
    }

    updateOrbTime();
    // Update every 10 minutes
    setInterval(updateOrbTime, 600000);
  }


  // ══════════════════════════════════════════
  // SCANLINES — Inject CRT overlay
  // ══════════════════════════════════════════
  if (!document.querySelector('.scanlines')) {
    const scan = document.createElement('div');
    scan.className = 'scanlines';
    document.body.appendChild(scan);
  }


  // ══════════════════════════════════════════
  // AG-UI — The interface reacts to state
  // Chromatic aberration on hero titles,
  // phosphor glow on system elements,
  // VHS flicker on scroll speed
  // ══════════════════════════════════════════

  // Apply chromatic aberration to display headings
  document.querySelectorAll('h1, h2.chr-ab, .hero h1, .pillar-title').forEach(el => {
    el.classList.add('chr-ab');
  });

  // Parallax on pillar images
  const pillarImgs = document.querySelectorAll('.pillar-img img');
  if (pillarImgs.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          pillarImgs.forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            const visible = rect.top < window.innerHeight && rect.bottom > 0;
            if (visible) {
              const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
              const shift = (progress - 0.5) * 40; // -20 to +20px
              img.style.transform = `scale(1.05) translateY(${shift}px)`;
            }
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // Nav scroll behavior — shrink + backdrop blur
  const nav = document.querySelector('.nav');
  if (nav) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      if (scrollY > 100) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
      lastScroll = scrollY;
    });
  }

  // Decision Log timeline entries — stagger reveal
  const dlogEntries = document.querySelectorAll('.dlog-entry');
  if (dlogEntries.length) {
    const dlogObs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('vis'), i * 120);
          dlogObs.unobserve(e.target);
        }
      });
    }, { threshold: .2 });
    dlogEntries.forEach(el => dlogObs.observe(el));
  }

})();
