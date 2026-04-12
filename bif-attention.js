/**
 * BIF — Empathic Attention Tracker
 * Creative Disaster — Decision Infrastructure Design
 *
 * Tracks user behavior through scroll velocity, dwell time, cursor movement, and interaction.
 * Outputs emotional state via cursor color. No cookies, no persistence, pure session state.
 *
 * States: pace, calma, notte, fuoco, intuizione, pericolo, calore
 */

const BIF = (() => {
  // State constants
  const STATES = {
    PACE: { name: 'pace', color: '#0A0A0A', bpm: 5 },
    CALMA: { name: 'calma', color: '#00D4AA', bpm: 10 },
    NOTTE: { name: 'notte', color: '#1A237E', bpm: 5 },
    FUOCO: { name: 'fuoco', color: '#FF6D00', bpm: 27 },
    INTUIZIONE: { name: 'intuizione', color: '#AA00FF', bpm: 18 },
    PERICOLO: { name: 'pericolo', color: '#FF1744', bpm: 50 },
    CALORE: { name: 'calore', color: '#FFB300', bpm: 11 }
  };

  // Private state
  let state = STATES.CALMA;
  let lastY = 0;
  let lastScrollTime = Date.now();
  let scrollVelocity = 0;
  let sectionDwell = {};
  let currentSection = null;
  let cursorX = 0;
  let cursorY = 0;
  let isHovering = false;
  let hoverStartTime = 0;
  let isClicking = false;
  let lastStateChangeTime = Date.now();
  let breathing = false;

  /**
   * Determine BIF state based on behavior metrics
   */
  const computeState = () => {
    const now = Date.now();
    const timeSinceScroll = now - lastScrollTime;
    const atTopEdge = window.scrollY < 100;
    const nearMouse = cursorY < 150;
    const exitingZone = atTopEdge && nearMouse && cursorY > 0;

    // Pericolo: user exiting (rapid movement to top/tab area)
    if (exitingZone && scrollVelocity > 5) {
      return STATES.PERICOLO;
    }

    // Calore: currently clicking/interacting
    if (isClicking) {
      return STATES.CALORE;
    }

    // Intuizione: hovering over something specific for >1 sec
    if (isHovering && (now - hoverStartTime > 1000)) {
      return STATES.INTUIZIONE;
    }

    // Fuoco: fast scroll (velocity > 5px per frame)
    if (scrollVelocity > 5 && timeSinceScroll < 500) {
      return STATES.FUOCO;
    }

    // Notte: slow contemplative scroll (velocity < 1, no activity for >3 sec)
    if (scrollVelocity < 1 && timeSinceScroll > 3000) {
      return STATES.NOTTE;
    }

    // Pace: completely still (no scroll, no movement for >5 sec)
    if (scrollVelocity === 0 && timeSinceScroll > 5000 && !isHovering) {
      return STATES.PACE;
    }

    // Calma: default engaged browsing
    return STATES.CALMA;
  };

  /**
   * Get section from scroll position
   */
  const getSectionAtScroll = () => {
    const sections = document.querySelectorAll(
      'section, [data-section], main > *, .gallery, [role="region"]'
    );
    let current = null;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2 && rect.bottom > 0) {
        current = section.id || section.getAttribute('data-section') || section.className;
      }
    });

    return current;
  };

  /**
   * Update dwell time tracking
   */
  const updateDwellTime = () => {
    const section = getSectionAtScroll();
    if (section !== currentSection) {
      currentSection = section;
    }

    if (currentSection) {
      sectionDwell[currentSection] = (sectionDwell[currentSection] || 0) + 0.5; // 500ms increment
    }
  };

  /**
   * Scroll listener — compute velocity
   */
  const onScroll = () => {
    const now = Date.now();
    const deltaY = window.scrollY - lastY;
    const deltaTime = now - lastScrollTime;

    scrollVelocity = deltaTime > 0 ? Math.abs(deltaY) / (deltaTime / 100) : 0;

    lastY = window.scrollY;
    lastScrollTime = now;
    updateDwellTime();
  };

  /**
   * Mouse move listener — track cursor position and hover
   */
  const onMouseMove = (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;

    // Check if hovering over interactive element
    const target = e.target;
    const isInteractive = target.matches(
      'a, button, input, [role="button"], [data-interactive]'
    );

    if (isInteractive && !isHovering) {
      isHovering = true;
      hoverStartTime = Date.now();
    } else if (!isInteractive) {
      isHovering = false;
    }
  };

  /**
   * Click listener
   */
  const onMouseDown = () => {
    isClicking = true;
  };

  const onMouseUp = () => {
    isClicking = false;
  };

  /**
   * Update cursor color and breathing state
   */
  const updateCursor = () => {
    const newState = computeState();

    if (newState.name !== state.name) {
      state = newState;
      lastStateChangeTime = Date.now();

      // Dispatch state change event
      document.dispatchEvent(
        new CustomEvent('bif-state-change', {
          detail: { state: state.name, color: state.color, bpm: state.bpm }
        })
      );
    }

    // Update cursor color via cd-core if available, otherwise via inline
    const cursor = document.getElementById('bif-cursor');
    if (cursor) {
      cursor.style.setProperty('--bif-color', state.color);
    }

    // Breathing: pulse when dwelling >5 sec in current section
    const dwellInCurrent = sectionDwell[currentSection] || 0;
    breathing = dwellInCurrent > 5;

    if (breathing) {
      document.documentElement.style.setProperty('--bif-breathing', 'pulse');
    } else {
      document.documentElement.style.setProperty('--bif-breathing', 'none');
    }
  };

  /**
   * Main update loop (500ms)
   */
  const updateLoop = setInterval(() => {
    updateCursor();
  }, 500);

  /**
   * Decay scroll velocity
   */
  const velocityDecay = setInterval(() => {
    const now = Date.now();
    if (now - lastScrollTime > 1000) {
      scrollVelocity *= 0.8; // Gradual decay
    }
  }, 200);

  /**
   * Initialize listeners
   */
  const init = () => {
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseup', onMouseUp, { passive: true });
  };

  /**
   * Cleanup
   */
  const destroy = () => {
    clearInterval(updateLoop);
    clearInterval(velocityDecay);
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mouseup', onMouseUp);
  };

  // Public API
  return {
    /**
     * Get current BIF state
     * @returns {string} Current state name
     */
    getState: () => state.name,

    /**
     * Get current color
     * @returns {string} Hex color value
     */
    getColor: () => state.color,

    /**
     * Get BPM of current state
     * @returns {number} Beats per minute
     */
    getBpm: () => state.bpm,

    /**
     * Get attention map (time spent per section)
     * @returns {Object} { sectionId: timeInSeconds, ... }
     */
    getAttentionMap: () => {
      const map = {};
      Object.entries(sectionDwell).forEach(([section, time]) => {
        map[section] = Math.round(time);
      });
      return map;
    },

    /**
     * Get full state object
     * @returns {Object} { name, color, bpm, breathing, sectionDwell }
     */
    getFullState: () => ({
      state: state.name,
      color: state.color,
      bpm: state.bpm,
      breathing,
      section: currentSection,
      velocity: Math.round(scrollVelocity),
      attention: this.getAttentionMap()
    }),

    /**
     * Initialize BIF
     */
    init,

    /**
     * Destroy BIF (cleanup listeners)
     */
    destroy,

    // Internal state exposure for debugging (dev only)
    __debug: () => ({
      scrollVelocity,
      cursorX,
      cursorY,
      isHovering,
      isClicking,
      currentSection,
      sectionDwell
    })
  };
})();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => BIF.init());
} else {
  BIF.init();
}
