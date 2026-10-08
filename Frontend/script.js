/**
 * FloodRoute - Interactive Navigation & Map Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('is-active');
    });

    // Close menu when clicking link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('is-active');
      });
    });
  }

  // Active Navbar Link on Scroll
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const navbarWrapper = document.querySelector('.navbar-wrapper');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    if (navbarWrapper) {
      if (scrollY > 50) {
        navbarWrapper.classList.add('scrolled');
      } else {
        navbarWrapper.classList.remove('scrolled');
      }
    }

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Location Swap Functionality
  const swapBtn = document.getElementById('swap-locations-btn');
  const originInput = document.getElementById('origin-input');
  const destInput = document.getElementById('destination-input');

  if (swapBtn && originInput && destInput) {
    swapBtn.addEventListener('click', () => {
      const temp = originInput.value;
      originInput.value = destInput.value;
      destInput.value = temp;

      // Visual feedback
      swapBtn.style.transform = 'translateY(-50%) rotate(180deg) scale(1.15)';
      setTimeout(() => {
        swapBtn.style.transform = 'translateY(-50%) rotate(0deg) scale(1)';
      }, 300);
    });
  }

  // Departure Time Selector
  const timePills = document.querySelectorAll('.time-pill');
  let selectedTime = 'now';

  timePills.forEach(pill => {
    pill.addEventListener('click', () => {
      timePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedTime = pill.dataset.time;
      updateRouteCalculation();
    });
  });

  // Route Preference Selector
  const prefTabs = document.querySelectorAll('.pref-tab');
  let selectedPref = 'balanced';

  prefTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      prefTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedPref = tab.dataset.pref;
      updateRouteCalculation();
    });
  });

  // Route Elements
  const safeRouteSvg = document.getElementById('svg-route-safe');
  const fastRouteSvg = document.getElementById('svg-route-fast');
  const badgeSafe = document.getElementById('badge-safe-route');
  const badgeHighRisk = document.getElementById('badge-high-risk');
  const statEta = document.getElementById('stat-eta');
  const statRisk = document.getElementById('stat-risk');

  function updateRouteCalculation() {
    let eta = '34 min';
    let risk = 'Low (0.12)';
    let isRiskSafe = true;

    if (selectedPref === 'safer') {
      eta = '38 min';
      risk = 'Very Low (0.05)';
      isRiskSafe = true;

      if (safeRouteSvg) {
        safeRouteSvg.style.strokeWidth = '8';
        safeRouteSvg.style.opacity = '1';
      }
      if (fastRouteSvg) {
        fastRouteSvg.style.strokeWidth = '3';
        fastRouteSvg.style.opacity = '0.35';
      }
      if (badgeSafe) badgeSafe.style.display = 'flex';
      if (badgeHighRisk) badgeHighRisk.style.opacity = '0.4';

    } else if (selectedPref === 'faster') {
      eta = '24 min';
      risk = 'High (0.84)';
      isRiskSafe = false;

      if (safeRouteSvg) {
        safeRouteSvg.style.strokeWidth = '3';
        safeRouteSvg.style.opacity = '0.35';
      }
      if (fastRouteSvg) {
        fastRouteSvg.style.strokeWidth = '8';
        fastRouteSvg.style.opacity = '1';
      }
      if (badgeSafe) badgeSafe.style.opacity = '0.4';
      if (badgeHighRisk) {
        badgeHighRisk.style.display = 'flex';
        badgeHighRisk.style.opacity = '1';
      }

    } else { // balanced
      eta = '34 min';
      risk = 'Low (0.18)';
      isRiskSafe = true;

      if (safeRouteSvg) {
        safeRouteSvg.style.strokeWidth = '6';
        safeRouteSvg.style.opacity = '0.95';
      }
      if (fastRouteSvg) {
        fastRouteSvg.style.strokeWidth = '5';
        fastRouteSvg.style.opacity = '0.85';
      }
      if (badgeSafe) {
        badgeSafe.style.display = 'flex';
        badgeSafe.style.opacity = '1';
      }
      if (badgeHighRisk) {
        badgeHighRisk.style.display = 'flex';
        badgeHighRisk.style.opacity = '1';
      }
    }

    // Departure time adjust
    if (selectedTime === '30') {
      eta = (parseInt(eta) + 4) + ' min';
    } else if (selectedTime === '60') {
      eta = (parseInt(eta) + 9) + ' min';
    }

    if (statEta) statEta.textContent = eta;
    if (statRisk) {
      statRisk.textContent = risk;
      statRisk.className = 'stat-val ' + (isRiskSafe ? 'val-safe' : 'val-high');
    }
  }

  // Find Route Button Animation
  const findRouteBtn = document.getElementById('find-route-btn');
  if (findRouteBtn) {
    findRouteBtn.addEventListener('click', () => {
      findRouteBtn.innerHTML = `Calculating... <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/></svg>`;
      setTimeout(() => {
        findRouteBtn.innerHTML = `Find Route <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;
        updateRouteCalculation();

        // Subtle map pulse effect
        const backdrop = document.getElementById('map-backdrop');
        if (backdrop) {
          backdrop.style.transform = 'scale(1.04)';
          setTimeout(() => { backdrop.style.transform = 'scale(1)'; }, 400);
        }
      }, 500);
    });
  }

  // Map Zoom Controls
  const zoomInBtn = document.getElementById('map-zoom-in');
  const zoomOutBtn = document.getElementById('map-zoom-out');
  const mapBackdrop = document.getElementById('map-backdrop');
  let currentZoom = 1;

  if (zoomInBtn && zoomOutBtn && mapBackdrop) {
    zoomInBtn.addEventListener('click', () => {
      if (currentZoom < 1.4) {
        currentZoom += 0.15;
        mapBackdrop.style.transform = `scale(${currentZoom})`;
      }
    });

    zoomOutBtn.addEventListener('click', () => {
      if (currentZoom > 0.9) {
        currentZoom -= 0.15;
        mapBackdrop.style.transform = `scale(${currentZoom})`;
      }
    });
  }

  // Demo Simulation Modal
  const watchDemoBtn = document.getElementById('watch-demo-btn');
  const demoModal = document.getElementById('demo-modal');
  const modalClose = document.getElementById('modal-close');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const simPlayPause = document.getElementById('sim-play-pause');
  const simProgressFill = document.getElementById('sim-progress-fill');
  const simTime = document.getElementById('sim-time');

  let simInterval = null;
  let simSeconds = 45;
  let isSimPlaying = true;

  function openDemoModal() {
    if (demoModal) {
      demoModal.classList.add('is-open');
      demoModal.setAttribute('aria-hidden', 'false');
      startSimulationTimer();
    }
  }

  function closeDemoModal() {
    if (demoModal) {
      demoModal.classList.remove('is-open');
      demoModal.setAttribute('aria-hidden', 'true');
      clearInterval(simInterval);
    }
  }

  function startSimulationTimer() {
    clearInterval(simInterval);
    simInterval = setInterval(() => {
      if (isSimPlaying) {
        simSeconds++;
        if (simSeconds > 80) simSeconds = 0;
        const total = 80;
        const pct = (simSeconds / total) * 100;
        if (simProgressFill) simProgressFill.style.width = pct + '%';
        if (simTime) {
          const m = String(Math.floor(simSeconds / 60)).padStart(2, '0');
          const s = String(simSeconds % 60).padStart(2, '0');
          simTime.textContent = `${m}:${s} / 01:20`;
        }
      }
    }, 1000);
  }

  if (watchDemoBtn) {
    watchDemoBtn.addEventListener('click', openDemoModal);
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeDemoModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeDemoModal);
  }

  if (simPlayPause) {
    simPlayPause.addEventListener('click', () => {
      isSimPlaying = !isSimPlaying;
      simPlayPause.textContent = isSimPlaying ? '❚❚ Pause Simulation' : '▶ Resume Simulation';
    });
  }

  // Learn More scroll or toast
  const learnMoreBtn = document.getElementById('cta-learn-more');
  if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', () => {
      const target = document.getElementById('how-it-works');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
});
