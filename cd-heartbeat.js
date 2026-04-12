/* ═══════════════════════════════════════════════════════════════
   CREATIVE DISASTER — Heartbeat Engine v1.0
   ═══════════════════════════════════════════════════════════════
   Il battito dello studio. Ogni componente si sincronizza a questo.

   Rubato da: Linear (rigore), Active Theory (physics),
   Krea (reattività), V0 (streaming feel).

   Usage:
     <script src="cd-heartbeat.js"></script>
     CDHeartbeat.subscribe('myComponent', (beat) => {
       // beat.phase: 0-1 (sine wave position in cycle)
       // beat.bpm: current BPM
       // beat.state: 'pace'|'calma'|'notte'|'fuoco'|'intuizione'|'pericolo'|'calore'
       // beat.color: hex color of current state
       // beat.intensity: 0-1 (how "alive" the system is)
       // beat.pulse: 0-1 (sharp pulse on each beat)
     });
     CDHeartbeat.setState('fuoco'); // manual override
   ═══════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── BIF Emotional States ──
  const STATES = {
    pace:        { color: '#0A0A0A', bpm: 5,  intensity: 0.05 },
    calma:       { color: '#00D4AA', bpm: 10, intensity: 0.3  },
    notte:       { color: '#1A237E', bpm: 5,  intensity: 0.15 },
    fuoco:       { color: '#FF6D00', bpm: 27, intensity: 0.7  },
    intuizione:  { color: '#AA00FF', bpm: 18, intensity: 0.5  },
    pericolo:    { color: '#FF1744', bpm: 50, intensity: 1.0  },
    calore:      { color: '#FFB300', bpm: 11, intensity: 0.4  },
  };

  // ── Time-of-day awareness ──
  function getTimeState() {
    const h = new Date().getHours();
    if (h >= 0 && h < 6)   return 'notte';
    if (h >= 6 && h < 9)   return 'calore';
    if (h >= 9 && h < 17)  return 'calma';
    if (h >= 17 && h < 20) return 'fuoco';
    if (h >= 20 && h < 23) return 'intuizione';
    return 'notte';
  }

  // ── Core engine ──
  let currentState = getTimeState();
  let targetBPM = STATES[currentState].bpm;
  let currentBPM = targetBPM;
  let phase = 0;
  let lastTime = performance.now();
  let subscribers = {};
  let mouseVelocity = 0;
  let scrollVelocity = 0;
  let lastScrollY = 0;
  let interactionBoost = 0;

  // ── Mouse velocity tracking ──
  let prevMX = 0, prevMY = 0;
  document.addEventListener('mousemove', (e) => {
    const dx = e.clientX - prevMX;
    const dy = e.clientY - prevMY;
    mouseVelocity = Math.sqrt(dx * dx + dy * dy);
    prevMX = e.clientX;
    prevMY = e.clientY;
    // Interaction boosts the heartbeat temporarily
    interactionBoost = Math.min(interactionBoost + mouseVelocity * 0.002, 0.5);
  });

  // ── Scroll velocity tracking ──
  window.addEventListener('scroll', () => {
    scrollVelocity = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    interactionBoost = Math.min(interactionBoost + scrollVelocity * 0.001, 0.4);
  });

  // ── Click pulse ──
  document.addEventListener('click', () => {
    interactionBoost = Math.min(interactionBoost + 0.3, 0.8);
  });

  // ── Main loop ──
  function tick(now) {
    const dt = (now - lastTime) / 1000; // seconds
    lastTime = now;

    // Decay interaction boost
    interactionBoost *= 0.95;
    if (interactionBoost < 0.001) interactionBoost = 0;

    // Smooth BPM transition
    const effectiveBPM = targetBPM + (interactionBoost * 20);
    currentBPM += (effectiveBPM - currentBPM) * 0.03;

    // Phase advances based on BPM
    // BPM = beats per minute, so frequency = BPM / 60 Hz
    const freq = currentBPM / 60;
    phase += freq * dt;
    if (phase > 1) phase -= 1;

    // Compute beat data
    const sinePhase = Math.sin(phase * Math.PI * 2) * 0.5 + 0.5; // 0-1
    const pulse = Math.pow(Math.max(0, Math.sin(phase * Math.PI * 2)), 8); // sharp pulse
    const stateData = STATES[currentState];

    const beat = {
      phase: sinePhase,
      rawPhase: phase,
      bpm: currentBPM,
      state: currentState,
      color: stateData.color,
      intensity: stateData.intensity + interactionBoost,
      pulse: pulse,
      dt: dt,
      mouseVelocity: mouseVelocity,
      scrollVelocity: scrollVelocity,
    };

    // Dispatch to all subscribers
    for (const key in subscribers) {
      try { subscribers[key](beat); } catch(e) {}
    }

    // Set CSS custom properties on :root for pure-CSS consumers
    document.documentElement.style.setProperty('--heartbeat-phase', sinePhase.toFixed(4));
    document.documentElement.style.setProperty('--heartbeat-pulse', pulse.toFixed(4));
    document.documentElement.style.setProperty('--heartbeat-bpm', currentBPM.toFixed(1));
    document.documentElement.style.setProperty('--heartbeat-color', stateData.color);
    document.documentElement.style.setProperty('--heartbeat-intensity', (stateData.intensity + interactionBoost).toFixed(3));

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // Update time-based state every 5 minutes
  setInterval(() => {
    const timeState = getTimeState();
    if (currentState === timeState || manualOverride) return;
    currentState = timeState;
    targetBPM = STATES[currentState].bpm;
  }, 300000);

  let manualOverride = false;

  // ── Public API ──
  window.CDHeartbeat = {
    subscribe: function(name, fn) {
      subscribers[name] = fn;
    },
    unsubscribe: function(name) {
      delete subscribers[name];
    },
    setState: function(state) {
      if (STATES[state]) {
        currentState = state;
        targetBPM = STATES[state].bpm;
        manualOverride = true;
        // Reset override after 30s
        setTimeout(() => { manualOverride = false; }, 30000);
      }
    },
    getState: function() {
      return {
        state: currentState,
        bpm: currentBPM,
        color: STATES[currentState].color,
        intensity: STATES[currentState].intensity,
        phase: phase,
      };
    },
    boost: function(amount) {
      interactionBoost = Math.min(interactionBoost + (amount || 0.3), 1.0);
    },
    STATES: STATES,
  };

})();
