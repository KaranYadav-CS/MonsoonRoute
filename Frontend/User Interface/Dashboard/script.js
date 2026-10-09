/* ==========================================================================
   MonsoonRoute - Dashboard Script
   Handles: Map init, navigation, modals, search autocomplete, toasts, counters
   ========================================================================== */

'use strict';

/* ==========================================================================
   1. UTILITY FUNCTIONS
   ========================================================================== */

/**
 * Show a toast notification
 */
function showToast(icon, title, msg, duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" aria-label="Dismiss">✕</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => removeToast(toast));
  container.appendChild(toast);

  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.classList.add('fadeout');
  setTimeout(() => toast.remove(), 300);
}

/**
 * Open a modal by ID
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus first focusable element
  const focusable = modal.querySelector('button, input, textarea, select, [tabindex]');
  if (focusable) setTimeout(() => focusable.focus(), 50);

  // Close on overlay backdrop click
  modal.addEventListener('click', function onOverlayClick(e) {
    if (e.target === modal) {
      closeModal(id);
      modal.removeEventListener('click', onOverlayClick);
    }
  });
}

/**
 * Close a modal by ID
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ==========================================================================
   2. SIDEBAR MOBILE TOGGLE
   ========================================================================== */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openBtn = document.getElementById('mobile-nav-toggle');
  const closeBtn = document.getElementById('sidebar-close-btn');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // ESC key closes sidebar
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSidebar();
  });
}

/* ==========================================================================
   3. NAVIGATION LINKS (Highlight Active)
   ========================================================================== */
function initNavLinks() {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function () {
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');

      // Close sidebar on mobile after nav
      if (window.innerWidth < 900) {
        setTimeout(() => {
          document.getElementById('sidebar')?.classList.remove('open');
          document.getElementById('sidebar-overlay')?.classList.remove('active');
          document.body.style.overflow = '';
        }, 150);
      }
    });
  });
}

/* ==========================================================================
   4. NOTIFICATION DROPDOWN TOGGLE
   ========================================================================== */
function initNotifications() {
  const btn = document.getElementById('notification-btn');
  const dropdown = document.getElementById('notification-dropdown');
  const markReadBtn = document.getElementById('mark-notifications-read');

  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display !== 'none';
    // Close profile dropdown if open
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.style.display = 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  dropdown.addEventListener('click', e => e.stopPropagation());

  if (markReadBtn) {
    markReadBtn.addEventListener('click', () => {
      const unread = dropdown.querySelectorAll('.notification-item.unread');
      unread.forEach(item => item.classList.remove('unread'));
      const badge = document.querySelector('.notification-badge');
      if (badge) badge.style.display = 'none';
      const countBadge = dropdown.querySelector('.badge-count');
      if (countBadge) countBadge.textContent = 'All read';
      showToast('✅', 'Alerts cleared', 'All monsoon alerts marked as read.');
    });
  }
}

/* ==========================================================================
   5. PROFILE DROPDOWN TOGGLE
   ========================================================================== */
function initProfileDropdown() {
  const btn = document.getElementById('user-profile-btn');
  const dropdown = document.getElementById('profile-dropdown');

  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.style.display !== 'none';
    // Close notification dropdown if open
    const notifDropdown = document.getElementById('notification-dropdown');
    if (notifDropdown) notifDropdown.style.display = 'none';
    dropdown.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
  });

  dropdown.addEventListener('click', e => e.stopPropagation());
}

/* ==========================================================================
   6. SEARCH AUTOCOMPLETE
   ========================================================================== */
function initSearch() {
  const suggestions = [
    { dest: 'Connaught Place, Delhi', label: 'Connaught Place — Safe Route Available', icon: '📍' },
    { dest: 'ITO, Delhi', label: 'ITO Ring Road — High Risk (35 min delay)', icon: '⚠️' },
    { dest: 'Minto Bridge, Delhi', label: 'Minto Bridge Underpass — Road Closed', icon: '⛔' },
    { dest: 'Noida Sector 18', label: 'Noida Sector 18 — Moderate via DND', icon: '📍' },
    { dest: 'IGI Airport T3, Delhi', label: 'IGI Airport T3 — Expressway Clear', icon: '📍' },
    { dest: 'Lajpat Nagar, Delhi', label: 'Lajpat Nagar — Slow movement', icon: '⚠️' },
    { dest: 'Nehru Place, Delhi', label: 'Nehru Place — Normal Traffic', icon: '📍' },
    { dest: 'Rohini Sector 9', label: 'Rohini Sector 9 — Puddles on main road', icon: '⚠️' },
  ];

  function setupSearchInput(inputId, autocompleteId) {
    const input = document.getElementById(inputId);
    const autocomplete = document.getElementById(autocompleteId);
    if (!input) return;

    // Show autocomplete on focus if text
    input.addEventListener('focus', () => {
      if (input.value.trim().length > 0) showAutoComplete(input, autocomplete, suggestions);
    });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 1) {
        if (autocomplete) autocomplete.style.display = 'none';
        return;
      }
      showAutoComplete(input, autocomplete, suggestions.filter(s =>
        s.dest.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
      ));
    });

    // Click on autocomplete items
    if (autocomplete) {
      autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', () => {
          input.value = item.dataset.dest || '';
          autocomplete.style.display = 'none';
          navigateToRoutes(input.value);
        });
      });
    }

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && autocomplete && !autocomplete.contains(e.target)) {
        if (autocomplete) autocomplete.style.display = 'none';
      }
    });
  }

  function showAutoComplete(input, autocomplete, items) {
    if (!autocomplete) return;
    if (items.length === 0) { autocomplete.style.display = 'none'; return; }
    autocomplete.innerHTML = items.slice(0, 5).map(s => `
      <div class="autocomplete-item" data-dest="${s.dest}">
        <span class="ac-icon">${s.icon}</span>
        <div class="ac-text">
          <strong>${s.dest.split(',')[0]}</strong>
          <span>${s.label}</span>
        </div>
      </div>
    `).join('');
    autocomplete.style.display = 'block';
    autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.dest;
        autocomplete.style.display = 'none';
        navigateToRoutes(input.value);
      });
    });
  }

  function navigateToRoutes(destination) {
    const params = new URLSearchParams({ destination });
    window.location.href = `../Routes/index.html?${params.toString()}`;
  }

  setupSearchInput('top-search-input', 'search-autocomplete');

  window.navigateToRoutes = navigateToRoutes;
}

// Expose global handler for form submits
window.handleSearch = function(inputId) {
  const input = document.getElementById(inputId);
  const dest = input ? input.value.trim() : '';
  if (!dest) { showToast('⚠️', 'Enter destination', 'Please type a destination to find safe routes.'); return; }
  const params = new URLSearchParams({ destination: dest });
  window.location.href = `../Routes/index.html?${params.toString()}`;
};

/* ==========================================================================
   7. INTERACTIVE MAP (Leaflet)
   ========================================================================== */
function initDelhiMap() {
  const mapEl = document.getElementById('delhi-live-map');
  if (!mapEl) return;

  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    mapEl.innerHTML = `
      <div class="map-loading-placeholder">
        <div class="map-loading-spinner"></div>
        <span>Loading Map…</span>
      </div>
    `;
    return;
  }

  // Delhi coordinates center
  const DELHI_CENTER = [28.6139, 77.2090];

  const map = L.map('delhi-live-map', {
    center: DELHI_CENTER,
    zoom: 11,
    zoomControl: false,
    attributionControl: true,
  });

  mapEl.setAttribute('aria-busy', 'true');

  // Tile layer - OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  // Add zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.whenReady(() => mapEl.setAttribute('aria-busy', 'false'));

  // -----------------------------------------------------------------------
  // Custom marker icon factory
  // -----------------------------------------------------------------------
  function makeIcon(color, size = 14) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:${size}px; height:${size}px;
        background:${color}; border-radius:50%;
        border: 2.5px solid rgba(255,255,255,0.9);
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  function makeTriangleIcon(color) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:0; height:0;
        border-left:9px solid transparent;
        border-right:9px solid transparent;
        border-bottom:16px solid ${color};
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
      "></div>`,
      iconSize: [18, 16],
      iconAnchor: [9, 8],
    });
  }

  function makePulseIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:18px; height:18px;
        background: #3B82F6;
        border-radius:50%;
        border: 3px solid rgba(59,130,246,0.35);
        box-shadow: 0 0 0 6px rgba(59,130,246,0.2);
        animation: none;
      "></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  // -----------------------------------------------------------------------
  // DATA: Waterlogged Points
  // -----------------------------------------------------------------------
  const waterloggedPoints = [
    { latlng: [28.6382, 77.2271], name: 'Minto Bridge Underpass', depth: '3.8 ft', status: 'closed' },
    { latlng: [28.6280, 77.2420], name: 'ITO Ring Road', depth: '1.5 ft', status: 'waterlogged' },
    { latlng: [28.5672, 77.2100], name: 'Lajpat Nagar Flyover', depth: '0.8 ft', status: 'moderate' },
    { latlng: [28.5355, 77.2510], name: 'Okhla Phase 1 Underpass', depth: '1.4 ft', status: 'waterlogged' },
    { latlng: [28.6080, 77.0300], name: 'Najafgarh Drain Area', depth: '1.1 ft', status: 'moderate' },
    { latlng: [28.6700, 77.1200], name: 'Paschim Vihar Crossing', depth: '0.6 ft', status: 'moderate' },
    { latlng: [28.6500, 77.3200], name: 'Shahdara Bridge', depth: '0.9 ft', status: 'waterlogged' },
    { latlng: [28.5800, 77.0600], name: 'Dwarka Sector 10', depth: '0.5 ft', status: 'moderate' },
  ];

  const colorMap = {
    closed: '#1E293B',
    waterlogged: '#EF4444',
    moderate: '#EAB308',
    safe: '#22C55E',
  };

  waterloggedPoints.forEach(pt => {
    const marker = L.marker(pt.latlng, { icon: makeTriangleIcon(colorMap[pt.status]) })
      .addTo(map)
      .bindPopup(`
        <div style="font-family: Inter, sans-serif; font-size: 13px; min-width: 160px;">
          <strong style="color:#0F172A;">${pt.name}</strong><br>
          <span style="color:#64748B;">Water Depth: <strong>${pt.depth}</strong></span><br>
          <span style="color:${colorMap[pt.status]}; font-weight:700; text-transform:capitalize;">${pt.status.toUpperCase()}</span>
        </div>
      `, { maxWidth: 200 });
  });

  // -----------------------------------------------------------------------
  // DATA: Safe Route Polylines
  // -----------------------------------------------------------------------
  const safeRoutes = [
    // Safe Route 1: Connaught Place → Lajpat Nagar via Ring Road Elevated
    [
      [28.6330, 77.2197], // CP
      [28.6200, 77.2100],
      [28.6050, 77.2090],
      [28.5850, 77.2100],
      [28.5672, 77.2100], // LN
    ],
    // Safe Route 2: Noida
    [
      [28.6139, 77.2090], // Delhi centre
      [28.6050, 77.2900],
      [28.5700, 77.3200], // Noida
    ],
  ];

  safeRoutes.forEach(route => {
    L.polyline(route, { color: '#22C55E', weight: 4, opacity: 0.85, dashArray: null }).addTo(map);
  });

  // Closed road line
  const closedRoute = [
    [28.6450, 77.2200],
    [28.6382, 77.2271], // Minto
    [28.6300, 77.2300],
  ];
  L.polyline(closedRoute, { color: '#EF4444', weight: 4, opacity: 0.9, dashArray: '8 6' }).addTo(map);

  // Moderate route
  const moderateRoute = [
    [28.6280, 77.2420], // ITO
    [28.6150, 77.2500],
    [28.5900, 77.2510],
    [28.5672, 77.2100],
  ];
  L.polyline(moderateRoute, { color: '#EAB308', weight: 3.5, opacity: 0.85, dashArray: '6 4' }).addTo(map);

  // -----------------------------------------------------------------------
  // User location (simulated at Janakpuri area for variety)
  // -----------------------------------------------------------------------
  const userLoc = [28.6200, 77.0900];
  L.marker(userLoc, { icon: makePulseIcon() })
    .addTo(map)
    .bindPopup('<strong>Your Location</strong><br>Janakpuri, Delhi')
    .openPopup();

  // -----------------------------------------------------------------------
  // Map Controls
  // -----------------------------------------------------------------------
  const recenterBtn = document.getElementById('recenter-map-btn');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      map.flyTo(userLoc, 13, { duration: 1.2 });
      showToast('📍', 'Recentered', 'Map recentered to your location.');
    });
  }

  let currentLayer = 0;
  const tileStyles = [
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
  ];

  const toggleLayerBtn = document.getElementById('toggle-layer-btn');
  let currentTile = null;
  if (toggleLayerBtn) {
    toggleLayerBtn.addEventListener('click', () => {
      currentLayer = (currentLayer + 1) % 2;
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      L.tileLayer(tileStyles[currentLayer], { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      showToast('🗺️', 'Layer Changed', currentLayer === 1 ? 'Switched to Dark Mode Map' : 'Switched to Default Map');
    });
  }

  // Legend filter (show/hide by category)
  const legendItems = document.querySelectorAll('.legend-item');
  legendItems.forEach(item => {
    item.addEventListener('click', () => {
      item.style.opacity = item.style.opacity === '0.35' ? '1' : '0.35';
    });
  });

  return map;
}

/* ==========================================================================
   8. STAT CARD ANIMATED COUNTERS
   ========================================================================== */
function animateCounter(id, target, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;

  const duration = 1200;
  const start = performance.now();
  const startVal = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const current = Math.floor(startVal + (target - startVal) * eased);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initCounters() {
  // Use Intersection Observer to trigger on scroll into view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter('stat-waterlog-val', 23);
        animateCounter('stat-rainfall-val', 78, ' mm');
        animateCounter('stat-closed-val', 12);
        animateCounter('stat-routes-val', 6);
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const metricsGrid = document.querySelector('.metrics-grid');
  if (metricsGrid) observer.observe(metricsGrid);
}

/* ==========================================================================
   9. RISK AREA ROW EXPAND / COLLAPSE
   ========================================================================== */
function initRiskRows() {
  const rows = document.querySelectorAll('.risk-item-row');
  rows.forEach(row => {
    const expanded = row.querySelector('.risk-item-expanded');
    const chevron = row.querySelector('.chevron-row-icon');

    function toggle() {
      const isOpen = expanded && expanded.style.display !== 'none';
      if (expanded) {
        expanded.style.display = isOpen ? 'none' : 'block';
        row.setAttribute('aria-expanded', String(!isOpen));
      }
      if (chevron) {
        chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
        chevron.style.transition = 'transform 0.2s ease';
      }
    }

    row.addEventListener('click', toggle);
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/* ==========================================================================
   10. MODAL TRIGGERS & CLOSERS
   ========================================================================== */
function initModals() {
  // Report Waterlogged Area
  const reportActionCard = document.getElementById('action-card-report-area');
  const navReport = document.getElementById('nav-report');
  const closeReportModal = document.getElementById('close-report-modal');
  const cancelReportBtn = document.getElementById('cancel-report-btn');
  const waterlogReportForm = document.getElementById('waterlog-report-form');

  [reportActionCard, navReport].forEach(el => {
    if (el) el.addEventListener('click', () => openModal('report-modal'));
  });
  if (closeReportModal) closeReportModal.addEventListener('click', () => closeModal('report-modal'));
  if (cancelReportBtn) cancelReportBtn.addEventListener('click', () => closeModal('report-modal'));

  if (waterlogReportForm) {
    waterlogReportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const loc = document.getElementById('report-location-input').value.trim();
      const depth = waterlogReportForm.querySelector('input[name="water-depth"]:checked')?.value || 'ankle';
      if (!loc) {
        showToast('❗', 'Location required', 'Please enter the waterlogged location or landmark.');
        return;
      }
      closeModal('report-modal');
      waterlogReportForm.reset();
      showToast('✅', 'Report Submitted!', `Waterlogging at "${loc}" reported. Thank you for helping commuters!`);
    });
  }

  // Emergency Modal
  const emergencyCard = document.getElementById('action-card-emergency');
  const navEmergency = document.getElementById('nav-emergency');
  const closeEmergencyModal = document.getElementById('close-emergency-modal');
  const closeEmergencyFooter = document.getElementById('close-emergency-footer-btn');

  [emergencyCard, navEmergency].forEach(el => {
    if (el) el.addEventListener('click', () => openModal('emergency-modal'));
  });
  if (closeEmergencyModal) closeEmergencyModal.addEventListener('click', () => closeModal('emergency-modal'));
  if (closeEmergencyFooter) closeEmergencyFooter.addEventListener('click', () => closeModal('emergency-modal'));

  // AI Route Recommendation Modal
  const aiRecCard = document.getElementById('ai-rec-card');
  const closeAiModal = document.getElementById('close-ai-modal');
  const closeAiFooter = document.getElementById('close-ai-footer-btn');
  const startAiNav = document.getElementById('start-ai-nav-btn');

  if (aiRecCard) aiRecCard.addEventListener('click', () => {
    window.location.href = '../Routes/index.html';
  });
  if (aiRecCard) aiRecCard.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.location.href = '../Routes/index.html';
  });
  if (closeAiModal) closeAiModal.addEventListener('click', () => closeModal('ai-route-modal'));
  if (closeAiFooter) closeAiFooter.addEventListener('click', () => closeModal('ai-route-modal'));
  if (startAiNav) startAiNav.addEventListener('click', () => {
    closeModal('ai-route-modal');
    showToast('🛡️', 'Safe Navigation Started', 'Taking you via Ring Road Flyover. Avoid Minto Bridge.');
  });

  // Upgrade Modal
  const promoBtn = document.getElementById('promo-upgrade-btn');
  const closeUpgradeModal = document.getElementById('close-upgrade-modal');
  const closeUpgradeFooter = document.getElementById('close-upgrade-footer-btn');

  if (promoBtn) promoBtn.addEventListener('click', () => openModal('upgrade-modal'));
  if (closeUpgradeModal) closeUpgradeModal.addEventListener('click', () => closeModal('upgrade-modal'));
  if (closeUpgradeFooter) closeUpgradeFooter.addEventListener('click', () => closeModal('upgrade-modal'));

  // Live Reports Feed Modal
  const reportsCard = document.getElementById('action-card-reports');
  const closeReportsModal = document.getElementById('close-reports-modal');
  const closeReportsFooter = document.getElementById('close-reports-footer-btn');
  const openReportFromFeed = document.getElementById('open-report-from-feed-btn');

  if (reportsCard) reportsCard.addEventListener('click', () => openModal('live-reports-modal'));
  if (closeReportsModal) closeReportsModal.addEventListener('click', () => closeModal('live-reports-modal'));
  if (closeReportsFooter) closeReportsFooter.addEventListener('click', () => closeModal('live-reports-modal'));
  if (openReportFromFeed) openReportFromFeed.addEventListener('click', () => {
    closeModal('live-reports-modal');
    openModal('report-modal');
  });

  // Filter waterlogged stat card → scroll to map
  const filterBtn = document.getElementById('filter-waterlogged-btn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      const mapSection = document.getElementById('map-section');
      if (mapSection) mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('🗺️', 'Map Updated', 'Showing all 23 waterlogged locations on the map.');
    });
  }

  // View All Risk button
  const viewAllRisk = document.getElementById('view-all-risk-btn');
  if (viewAllRisk) {
    viewAllRisk.addEventListener('click', () => {
      showToast('⚠️', 'All Risk Areas', 'Showing all 23 high-risk Delhi areas. Filter by zone in Map tab.');
    });
  }

  // Weather Pill
  const weatherPill = document.getElementById('weather-pill-btn');
  if (weatherPill) {
    weatherPill.addEventListener('click', () => {
      showToast('🌧️', 'IMD Delhi Weather', '26°C, Heavy Rain expected until 8 PM. Yellow alert active for South Delhi.', 5000);
    });
    weatherPill.addEventListener('keydown', e => {
      if (e.key === 'Enter') weatherPill.click();
    });
  }

  // Stat cards (click to show info)
  const statCards = {
    'stat-card-waterlogged': () => showToast('💧', '23 Waterlogged Locations', 'Hotspots: Minto Bridge, ITO, Pul Bangash, Azadpur, Naraina.', 5000),
    'stat-card-rainfall': () => showToast('🌧️', '78mm Rainfall Today', 'Highest since 2019 monsoon. Drain overflow risk in low-lying areas.', 5000),
    'stat-card-closed': () => showToast('🚫', '12 Roads Closed', 'Barricades placed at Minto Bridge, DND Noida Link, Patel Rd Underpass.', 5000),
    'stat-card-saferoutes': () => { window.location.href = '../Routes/index.html'; },
  };

  Object.entries(statCards).forEach(([id, handler]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', handler);
      el.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
    }
  });

  // Close all modals on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['report-modal', 'emergency-modal', 'ai-route-modal', 'upgrade-modal', 'live-reports-modal']
        .forEach(id => closeModal(id));
    }
  });
}

/* ==========================================================================
   11. LIVE DATA SIMULATION (Ticker)
   ========================================================================== */
function initLiveTicker() {
  const alerts = [
    { icon: '🔴', title: 'New: Azadpur Sabzi Mandi', msg: 'Waterlogging reported. 1.2 ft depth, diversion via GT Karnal Road.' },
    { icon: '🟡', title: 'Update: ITO Junction', msg: 'Water level dropping. Down to 0.9 ft from 1.5 ft. Pumps active.' },
    { icon: '🟢', title: 'Cleared: Saket Underpass', msg: 'Water fully drained. Road reopened for all vehicles.' },
    { icon: '🔴', title: 'Alert: Kanjhawala Road', msg: 'Flash flood warning. Avoid route until further notice.' },
    { icon: '⛈️', title: 'IMD Doppler Alert', msg: 'Heavy rain band approaching South Delhi. Expect 15mm/hour next 2 hours.' },
  ];

  let alertIndex = 0;

  function showNextAlert() {
    const alert = alerts[alertIndex % alerts.length];
    showToast(alert.icon, alert.title, alert.msg, 5000);
    alertIndex++;
  }

  // Show first alert after 4s, then every 30s
  setTimeout(() => {
    showNextAlert();
    setInterval(showNextAlert, 30000);
  }, 4000);
}

/* ==========================================================================
   12. REAL-TIME COUNTER UPDATES (Simulation)
   ========================================================================== */
function initRealtimeUpdates() {
  const waterlogEl = document.getElementById('stat-waterlog-val');
  const closedEl = document.getElementById('stat-closed-val');

  setInterval(() => {
    if (!waterlogEl || !closedEl) return;
    const current = parseInt(waterlogEl.textContent) || 23;
    const delta = Math.random() > 0.5 ? 1 : -1;
    const newVal = Math.max(15, Math.min(35, current + delta));
    waterlogEl.textContent = String(newVal);
    waterlogEl.style.transition = 'color 0.3s ease';
    waterlogEl.style.color = newVal > current ? '#EF4444' : '#16A34A';
    setTimeout(() => { waterlogEl.style.color = ''; }, 800);
  }, 45000);
}

/* ==========================================================================
   13. INITIALIZATION
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  initSidebar();
  initNavLinks();
  initNotifications();
  initProfileDropdown();
  initSearch();
  initCounters();
  initRiskRows();
  initModals();

  // Init map with a small delay to let CSS paint
  setTimeout(() => {
    try {
      initDelhiMap();
    } catch (err) {
      console.warn('Map init failed:', err);
      const mapEl = document.getElementById('delhi-live-map');
      if (mapEl) {
        mapEl.innerHTML = `
          <div class="map-loading-placeholder">
            <span style="font-size:2.5rem;">🗺️</span>
            <span>Interactive map requires internet connection</span>
          </div>
        `;
      }
    }
  }, 200);

  initLiveTicker();
  initRealtimeUpdates();

  // Greeting toast on load
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  setTimeout(() => {
    showToast('👋', `${greeting}, Aarav!`, 'Live monsoon data for Delhi-NCR loaded. Stay safe!', 5000);
  }, 800);
});
