/**
 * MonsoonRoute - Emergency Assistance Interactive Controller
 * Handles 112 SOS call, quick services directory modal, 24x7 helplines,
 * interactive emergency facilities map, and roadside assistance.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. EMERGENCY SERVICES DIRECTORY DATA
     ========================================================================== */
  const SERVICES_DATA = {
    hospitals: {
      title: 'Nearby Hospitals',
      sub: 'Emergency trauma and monsoon medical response in Delhi',
      icon: '🏥',
      items: [
        { name: 'AIIMS Delhi Trauma Centre', address: 'Ansari Nagar, Ring Road, New Delhi', phone: '011-26588500', dist: '2.4 km away', tag: '24/7 Level 1 Trauma' },
        { name: 'Safdarjung Hospital Emergency', address: 'Opp. AIIMS, Ring Road, South Delhi', phone: '011-26165060', dist: '2.8 km away', tag: 'Emergency Ward Ready' },
        { name: 'Dr. Ram Manohar Lohia (RML) Hospital', address: 'Baba Kharak Singh Marg, Connaught Place', phone: '011-23365525', dist: '1.2 km away', tag: 'Central Delhi Emergency' },
        { name: 'Lok Nayak Hospital (LNJP)', address: 'Jawaharlal Nehru Marg, Delhi Gate', phone: '011-23233000', dist: '3.1 km away', tag: '24/7 Multi-Speciality' }
      ]
    },
    police: {
      title: 'Police Stations',
      sub: 'Delhi Police flood control and station emergency desks',
      icon: '🛡️',
      items: [
        { name: 'Connaught Place Police Station', address: 'Parliament Street, New Delhi', phone: '011-23361100', dist: '0.8 km away', tag: 'Central Control' },
        { name: 'Kashmiri Gate Police Station', address: 'Ring Road, Near ISBT, North Delhi', phone: '011-23861212', dist: '4.2 km away', tag: 'Flood Response Team' },
        { name: 'Tilak Marg Police Station', address: 'India Gate C-Hexagon Circle', phone: '011-23381600', dist: '1.5 km away', tag: '24/7 Patrol Unit' },
        { name: 'Hauz Khas Police Station', address: 'Outer Ring Road, South Delhi', phone: '011-26561100', dist: '5.6 km away', tag: 'South Delhi Division' }
      ]
    },
    'emergency-rescue': {
      title: 'Emergency Services (Fire & Rescue)',
      sub: 'Delhi Fire Service and NDRF flood rescue squads',
      icon: '🚒',
      items: [
        { name: 'Delhi Fire Service HQ & Central Station', address: 'Connaught Circus, Barakhamba, New Delhi', phone: '101', dist: '0.9 km away', tag: 'Emergency Water Rescue' },
        { name: 'Centralized Accident & Trauma Services (CATS)', address: 'Delhi Ambulance Control, Vikas Minar', phone: '102', dist: '1.1 km away', tag: 'Ambulance Dispatch' },
        { name: 'NDRF 8th Battalion Flood Relief Unit', address: 'Regional Response Centre, Nizamuddin Base', phone: '011-24363260', dist: '3.5 km away', tag: 'Submerged Vehicle Rescue' }
      ]
    },
    fuel: {
      title: '24×7 Fuel Stations',
      sub: 'Unflooded accessible fuel pumps and EV fast chargers',
      icon: '⛽',
      items: [
        { name: 'Indian Oil Auto Care Centre (24x7)', address: 'Janpath, Connaught Place Outer Circle', phone: '011-23321550', dist: '0.6 km away', tag: 'Power Generator Active' },
        { name: 'HP Fuel Station & Quick Charge', address: 'Barakhamba Road, Near Metro Gate 3', phone: '011-23412000', dist: '0.9 km away', tag: 'Dry Elevated Forecourt' },
        { name: 'Bharat Petroleum Station', address: 'Ashoka Road, Near Patel Chowk', phone: '011-23719000', dist: '1.4 km away', tag: 'Open All Night' }
      ]
    },
    shelters: {
      title: 'Safe Relief Shelters',
      sub: 'Elevated shelters with power, clean drinking water & first-aid',
      icon: '🏠',
      items: [
        { name: 'DMRC Elevated Relief Center', address: 'Shivaji Stadium Metro Complex, Concourse Level', phone: '011-23417910', dist: '0.7 km away', tag: 'Capacity: 500 People' },
        { name: 'Delhi Disaster Management Authority Relief Camp', address: 'Mandi House Cultural Center, Copernicus Marg', phone: '011-23782000', dist: '1.3 km away', tag: 'Medical Aid & Meals' },
        { name: 'NDMC Civil Defence Monsoon Center', address: 'Gole Market Community Center, Central Delhi', phone: '011-23363000', dist: '1.8 km away', tag: 'Warm Shelter & Beds' }
      ]
    },
    tow: {
      title: 'Tow & Roadside Help (RSA)',
      sub: 'Heavy crane and winch recovery for flooded vehicles',
      icon: '🚚',
      items: [
        { name: 'Delhi Traffic Police Winch & Heavy Crane', address: 'Ring Road & Minto Road Depot', phone: '1095', dist: '1.4 km away', tag: 'Official Police Tow' },
        { name: 'Monsoon 24x7 Submerged Car Recovery RSA', address: 'Central Delhi Quick Recovery Network', phone: '9811299880', dist: '2.1 km away', tag: 'Flatbed & Underlift' },
        { name: 'Universal Roadside Assistance (All Brands)', address: 'Pan-Delhi Monsoon Response Fleet', phone: '18001021800', dist: '2.5 km away', tag: 'Towing & Battery Jump' }
      ]
    }
  };

  /* ==========================================================================
     2. DOM ELEMENTS
     ========================================================================== */
  const sosCallBtn = document.getElementById('sos-call-btn');
  const serviceTiles = document.querySelectorAll('.service-tile');
  const helplineBtns = document.querySelectorAll('.helpline-btn');
  const modal = document.getElementById('services-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalIcon = document.getElementById('modal-category-icon');
  const modalTitle = document.getElementById('modal-service-title');
  const modalSub = document.getElementById('modal-service-sub');
  const modalList = document.getElementById('modal-directory-list');
  const toast = document.getElementById('emergency-toast');
  const backBtn = document.getElementById('emergency-back-btn');
  const locateBtn = document.getElementById('map-locate-btn');

  // Sidebar elements
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openMenuBtn = document.getElementById('mobile-nav-toggle');
  const closeMenuBtn = document.getElementById('sidebar-close-btn');

  let map;

  /* ==========================================================================
     3. SOS HELPLINE HANDLER
     ========================================================================== */
  sosCallBtn?.addEventListener('click', (e) => {
    showToast('🚨 Connecting to Emergency Helpline 112... Stay calm and state your location.');
  });

  /* ==========================================================================
     4. HELPLINE DIRECTORY CALL HANDLERS
     ========================================================================== */
  helplineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const number = btn.querySelector('span:last-child')?.textContent || 'Helpline';
      showToast(`📞 Dialing ${number}... Help is on the way.`);
    });
  });

  /* ==========================================================================
     5. QUICK ACCESS SERVICES MODAL
     ========================================================================== */
  serviceTiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const serviceKey = tile.getAttribute('data-service');
      const data = SERVICES_DATA[serviceKey];
      if (!data) return;

      if (modalIcon) modalIcon.textContent = data.icon;
      if (modalTitle) modalTitle.textContent = data.title;
      if (modalSub) modalSub.textContent = data.sub;

      if (modalList) {
        modalList.innerHTML = '';
        data.items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'dir-item';
          row.innerHTML = `
            <div class="dir-item-left">
              <h4>${item.name}</h4>
              <p>${item.address}</p>
              <div style="display:flex;gap:6px;align-items:center;">
                <span class="dir-item-dist">${item.dist}</span>
                <span style="font-size:0.62rem;color:#059669;font-weight:700;background:#ecfdf5;padding:2px 6px;border-radius:4px;">${item.tag}</span>
              </div>
            </div>
            <a href="tel:${item.phone.replace(/[^0-9]/g, '')}" class="dir-call-btn">
              <span>📞</span>
              <span>Call</span>
            </a>
          `;
          row.querySelector('.dir-call-btn').addEventListener('click', () => {
            showToast(`Calling ${item.name} (${item.phone})...`);
          });
          modalList.appendChild(row);
        });
      }

      if (modal) modal.hidden = false;
    });
  });

  const closeModal = () => {
    if (modal) modal.hidden = true;
  };

  modalCloseBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  /* ==========================================================================
     6. INTERACTIVE EMERGENCY MAP (LEAFLET)
     ========================================================================== */
  function initEmergencyMap() {
    const mapEl = document.getElementById('emergency-map-leaflet');
    if (!mapEl || typeof L === 'undefined') return;

    // Center on Central Delhi (Connaught Place / Raj Ghat corridor)
    const centerLat = 28.6320;
    const centerLng = 77.2280;

    map = L.map('emergency-map-leaflet', {
      center: [centerLat, centerLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Voyager tiles
    const voyagerTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    });
    voyagerTiles.addTo(map);

    // Fallback to OSM
    voyagerTiles.on('tileerror', () => {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    });

    // Helper for custom facility pins
    const createPin = (iconChar, bgColor, pulseColor) => L.divIcon({
      className: 'emergency-custom-pin',
      html: `
        <div style="width:28px;height:28px;border-radius:50%;background:${bgColor};color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:12px;border:2.5px solid #ffffff;box-shadow:0 3px 8px ${pulseColor};font-weight:bold;">
          ${iconChar}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    // 1. Hospital Pin (Red Cross)
    L.marker([28.638, 77.214], { icon: createPin('➕', '#ef4444', 'rgba(239,68,68,0.4)') })
      .addTo(map)
      .bindPopup('<b>RML Hospital Emergency</b><br>011-23365525');

    // 2. Police Pin (Blue Shield)
    L.marker([28.625, 77.218], { icon: createPin('🛡️', '#0877ee', 'rgba(8,119,238,0.4)') })
      .addTo(map)
      .bindPopup('<b>Connaught Place Police Station</b><br>011-23361100');

    // 3. Shelter Pin (Green House)
    L.marker([28.631, 77.242], { icon: createPin('🏠', '#10b981', 'rgba(16,185,129,0.4)') })
      .addTo(map)
      .bindPopup('<b>DMRC Relief Shelter</b><br>Capacity: 500 People');

    // 4. Ambulance / Rescue Pin (Red Van)
    L.marker([28.622, 77.239], { icon: createPin('🚑', '#dc2626', 'rgba(220,38,38,0.4)') })
      .addTo(map)
      .bindPopup('<b>CATS Ambulance Unit #4</b><br>Dial 102');

    // 5. User Current Location (Blue Pulsing Target)
    const userPin = L.divIcon({
      className: 'user-pulse-pin',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="width:16px;height:16px;border-radius:50%;background:#0877ee;border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(8,119,238,0.35);"></div>
        </div>
      `,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    L.marker([centerLat, centerLng], { icon: userPin })
      .addTo(map)
      .bindPopup('<b>Your Current Location</b><br>Central Delhi (Safe Zone)');

    // Add main roads traffic overlay
    L.polyline([
      [28.648, 77.228],
      [28.638, 77.223],
      [28.632, 77.219],
      [28.620, 77.212]
    ], {
      color: '#f59e0b',
      weight: 4,
      opacity: 0.8
    }).addTo(map);
  }

  // Locate Me Button
  locateBtn?.addEventListener('click', () => {
    showToast('Locating emergency facilities near your position...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          map?.flyTo([lat, lng], 14);
          showToast('Updated map to your live coordinates.');
        },
        () => {
          map?.flyTo([28.6320, 77.2280], 14);
          showToast('Centered on Central Delhi Emergency Zone.');
        },
        { timeout: 3500 }
      );
    } else {
      map?.flyTo([28.6320, 77.2280], 14);
    }
  });

  /* ==========================================================================
     7. TOAST NOTIFICATION & BACK BUTTON
     ========================================================================= */
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 3200);
  }

  backBtn?.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '../Dashboard/index.html';
    }
  });

  /* ==========================================================================
     8. MOBILE SIDEBAR TOGGLE
     ========================================================================= */
  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  };

  openMenuBtn?.addEventListener('click', () => {
    sidebar?.classList.add('open');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  closeMenuBtn?.addEventListener('click', closeSidebar);
  overlay?.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebar();
      closeModal();
    }
  });

  // Init Map
  initEmergencyMap();

});
