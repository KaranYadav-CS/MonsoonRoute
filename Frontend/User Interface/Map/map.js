/**
 * MonsoonRoute - Delhi Live Risk Map
 * Interactive traffic intelligence, risk markers, routing and hotspot monitoring.
 */

'use strict';

// 1. CONSTANTS & LOCATIONS
const DELHI_CENTER = [28.6250, 77.2180];
const DEFAULT_ZOOM = 12;

// Delhi High-Risk Incident Database
const INCIDENTS_DATA = {
  'minto-bridge': {
    id: 'minto-bridge',
    coords: [28.6328, 77.2230],
    title: 'Minto Bridge',
    badge: 'Severe Waterlogging',
    badgeClass: 'badge-red',
    waterLevel: '45 cm',
    updated: '8 min ago',
    location: 'Ring Road, Near ISBT',
    image: 'assets/minto_bridge_flood.webp',
    color: '#EF4444',
    symbol: '!',
    riskLevel: 'high'
  },
  'ito': {
    id: 'ito',
    coords: [28.6280, 77.2450],
    title: 'ITO Underpass',
    badge: 'Waterlogging',
    badgeClass: 'badge-red',
    waterLevel: '32 cm',
    updated: '12 min ago',
    location: 'Vikas Marg Junction, ITO',
    image: 'assets/minto_bridge_flood.webp',
    color: '#EF4444',
    symbol: '!',
    riskLevel: 'high'
  },
  'rajouri': {
    id: 'rajouri',
    coords: [28.6470, 77.1850],
    title: 'Rajouri Garden',
    badge: 'Slow Movement',
    badgeClass: 'badge-amber',
    waterLevel: '18 cm',
    updated: '15 min ago',
    location: 'Ring Road, Near Metro Pillar 384',
    image: 'assets/minto_bridge_flood.webp',
    color: '#F59E0B',
    symbol: '!',
    riskLevel: 'moderate'
  },
  'kashmiri-gate': {
    id: 'kashmiri-gate',
    coords: [28.6670, 77.2300],
    title: 'Kashmiri Gate',
    badge: 'Waterlogging',
    badgeClass: 'badge-red',
    waterLevel: '28 cm',
    updated: '10 min ago',
    location: 'Near ISBT Underpass & Ring Rd',
    image: 'assets/minto_bridge_flood.webp',
    color: '#EF4444',
    symbol: '!',
    riskLevel: 'high'
  },
  'mathura-road': {
    id: 'mathura-road',
    coords: [28.5880, 77.2480],
    title: 'Mathura Road',
    badge: 'Road Closed',
    badgeClass: 'badge-gray',
    waterLevel: 'Submerged',
    updated: '18 min ago',
    location: 'Near Nizamuddin Underpass',
    image: 'assets/minto_bridge_flood.webp',
    color: '#1F2937',
    symbol: '—',
    riskLevel: 'closed'
  }
};

// 2. INITIALIZE LEAFLET MAP
const map = L.map('delhi-map', {
  center: DELHI_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: false,
  minZoom: 10,
  maxZoom: 18
});

// CartoDB Voyager Basemap (light, crisp, detailed matching reference image)
const voyagerTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(map);

// Fallback to OSM if needed
voyagerTiles.on('tileerror', () => {
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
});

// 3. DRAW REALISTIC TRAFFIC POLYLINES ON THE MAP
// Safe Routes (Green: #10B981)
const safeRoutesCoords = [
  // Outer Ring Road West / North stretch
  [
    [28.7050, 77.1250], [28.6980, 77.1450], [28.6820, 77.1650],
    [28.6550, 77.1550], [28.6380, 77.1400], [28.6180, 77.1350],
    [28.5850, 77.1450], [28.5600, 77.1600]
  ],
  // Ring Road South to Saket / Greater Kailash
  [
    [28.5700, 77.1950], [28.5650, 77.2100], [28.5550, 77.2350],
    [28.5400, 77.2450], [28.5300, 77.2550]
  ],
  // Airport Express corridor
  [
    [28.6250, 77.2180], [28.6050, 77.1900], [28.5800, 77.1600],
    [28.5600, 77.1250], [28.5562, 77.0980]
  ]
];

safeRoutesCoords.forEach(coords => {
  L.polyline(coords, {
    color: '#10B981',
    weight: 6,
    opacity: 0.88,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);
});

// Slow / Moderate Traffic Routes (Yellow/Amber: #F59E0B)
const moderateRoutesCoords = [
  // Karol Bagh to Connaught Place
  [
    [28.6520, 77.1800], [28.6470, 77.1950], [28.6400, 77.2080], [28.6320, 77.2180]
  ],
  // Laxmi Nagar / Vikas Marg crossing Yamuna
  [
    [28.6300, 77.2750], [28.6310, 77.2600], [28.6290, 77.2480]
  ],
  // South Delhi / Greater Kailash connecting road
  [
    [28.5550, 77.2350], [28.5450, 77.2250], [28.5350, 77.2180]
  ]
];

moderateRoutesCoords.forEach(coords => {
  L.polyline(coords, {
    color: '#F59E0B',
    weight: 6,
    opacity: 0.9,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);
});

// Heavy Waterlogged Routes (Red: #EF4444)
const waterloggedRoutesCoords = [
  // Minto Bridge area & Deen Dayal Upadhyaya Marg
  [
    [28.6380, 77.2200], [28.6328, 77.2230], [28.6280, 77.2270]
  ],
  // Old Delhi / Kashmiri Gate approach
  [
    [28.6720, 77.2250], [28.6670, 77.2300], [28.6590, 77.2380]
  ]
];

waterloggedRoutesCoords.forEach(coords => {
  L.polyline(coords, {
    color: '#EF4444',
    weight: 7,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(map);
});

// Road Closed Section (Black with red accents: #1F2937)
const roadClosedCoords = [
  [28.5950, 77.2450], [28.5880, 77.2480], [28.5800, 77.2520]
];

L.polyline(roadClosedCoords, {
  color: '#1F2937',
  weight: 7,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round'
}).addTo(map);

// 4. MAP RISK MARKERS & CALLOUTS
const markerInstances = {};

function createRiskMarker(incident) {
  const isMinto = incident.id === 'minto-bridge';
  
  const markerHtml = isMinto ? `
    <div class="minto-pulse-wrap">
      <div class="minto-pulse-ring"></div>
      <div class="marker-pin-circle marker-red">!</div>
    </div>
  ` : `
    <div class="marker-pin-circle ${incident.color === '#EF4444' ? 'marker-red' : incident.color === '#F59E0B' ? 'marker-amber' : 'marker-black'}">
      ${incident.symbol}
    </div>
  `;

  const icon = L.divIcon({
    className: 'map-risk-marker',
    html: markerHtml,
    iconSize: isMinto ? [28, 28] : [26, 26],
    iconAnchor: isMinto ? [14, 14] : [13, 13]
  });

  const marker = L.marker(incident.coords, { icon: icon }).addTo(map);

  // Popup Callout (matches reference image for Minto Bridge)
  const popupContent = `
    <div class="map-callout-bubble">
      <div class="callout-header">
        <span style="font-size:1.1rem">⚠️</span>
        <strong>${incident.title}</strong>
      </div>
      <span class="callout-badge">${incident.badge}</span>
    </div>
  `;

  marker.bindPopup(popupContent, {
    offset: [0, -14],
    closeButton: false,
    autoClose: false,
    closeOnClick: false
  });

  if (isMinto) {
    marker.openPopup();
  }

  marker.on('click', () => {
    selectIncident(incident.id);
  });

  markerInstances[incident.id] = marker;
}

// Add markers for all incidents
Object.values(INCIDENTS_DATA).forEach(createRiskMarker);

// Add Indira Gandhi International Airport Marker
const airportIcon = L.divIcon({
  className: 'airport-label-marker',
  html: `
    <div class="airport-badge-box">
      <span>✈️</span>
      <span>Indira Gandhi International Airport</span>
    </div>
  `,
  iconSize: [210, 24],
  iconAnchor: [105, 12]
});
L.marker([28.5562, 77.0980], { icon: airportIcon }).addTo(map);

// 5. SELECT & UPDATE INCIDENT DETAIL CARD
function selectIncident(incidentId) {
  const data = INCIDENTS_DATA[incidentId];
  if (!data) return;

  // Update Incident Card details
  const titleEl = document.getElementById('incident-title');
  const badgeEl = document.getElementById('incident-badge');
  const waterLevelEl = document.getElementById('incident-water-level');
  const updatedEl = document.getElementById('incident-updated');
  const locationEl = document.getElementById('incident-location');

  if (titleEl) titleEl.textContent = data.title;
  if (badgeEl) {
    badgeEl.textContent = data.badge;
    badgeEl.className = 'incident-risk-pill ' + (data.riskLevel === 'moderate' ? 'badge-amber' : data.riskLevel === 'closed' ? 'badge-gray' : '');
  }
  if (waterLevelEl) waterLevelEl.textContent = data.waterLevel;
  if (updatedEl) updatedEl.textContent = data.updated;
  if (locationEl) locationEl.textContent = data.location;

  // Update Active Row in High Risk List
  document.querySelectorAll('.mini-risk-row').forEach(row => {
    row.classList.toggle('active-row', row.dataset.loc === incidentId);
  });

  // Pan Map
  map.flyTo(data.coords, 14, { duration: 1 });

  // Open marker popup
  if (markerInstances[incidentId]) {
    markerInstances[incidentId].openPopup();
  }
}

// 6. EVENT LISTENERS & CONTROLS

// Click on rows in "High Risk Areas" list
document.querySelectorAll('.mini-risk-row').forEach(row => {
  row.addEventListener('click', () => {
    const locId = row.dataset.loc;
    selectIncident(locId);
  });
});

// Click on Route items
document.querySelectorAll('.rec-route-item').forEach(item => {
  item.addEventListener('click', () => {
    const route = item.dataset.route;
    if (route === 'airport') {
      map.fitBounds([
        [28.6250, 77.2180],
        [28.5562, 77.0980]
      ], { padding: [60, 60] });
    } else if (route === 'noida') {
      map.fitBounds([
        [28.6250, 77.2180],
        [28.5700, 77.3200]
      ], { padding: [60, 60] });
    }
  });
});

// Zoom Controls
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const locateMapBtn = document.getElementById('locate-map');

if (zoomInBtn) zoomInBtn.addEventListener('click', () => map.zoomIn());
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => map.zoomOut());
if (locateMapBtn) {
  locateMapBtn.addEventListener('click', () => {
    map.flyTo(DELHI_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    if (markerInstances['minto-bridge']) markerInstances['minto-bridge'].openPopup();
  });
}

// Search Form
const searchForm = document.getElementById('map-search-form');
const searchInput = document.getElementById('map-search-input');

if (searchForm && searchInput) {
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    // Search through incidents
    const found = Object.values(INCIDENTS_DATA).find(item => 
      item.title.toLowerCase().includes(query) || item.location.toLowerCase().includes(query)
    );

    if (found) {
      selectIncident(found.id);
    } else if (query.includes('airport')) {
      map.flyTo([28.5562, 77.0980], 14, { duration: 1 });
    } else if (query.includes('noida')) {
      map.flyTo([28.5700, 77.3200], 13, { duration: 1 });
    } else if (query.includes('connaught') || query.includes('cp')) {
      map.flyTo([28.6328, 77.2197], 14, { duration: 1 });
    } else {
      map.flyTo(DELHI_CENTER, 13, { duration: 1 });
    }
  });
}

// Plan a Route Button
const planRouteBtn = document.getElementById('plan-route-btn');
if (planRouteBtn) {
  planRouteBtn.addEventListener('click', () => {
    window.location.href = '../Routes/index.html';
  });
}

// Recommended Route Items navigation
document.querySelectorAll('.rec-route-item').forEach(item => {
  item.addEventListener('click', () => {
    const routeType = item.getAttribute('data-route');
    if (routeType === 'airport') {
      window.location.href = '../Routes/index.html?from=Connaught+Place&to=IGI+Airport';
    } else if (routeType === 'noida') {
      window.location.href = '../Routes/index.html?from=Noida&to=Connaught+Place';
    } else {
      window.location.href = '../Routes/index.html';
    }
  });
});

// Avoid this route button
const avoidBtn = document.getElementById('incident-avoid-btn');
if (avoidBtn) {
  avoidBtn.addEventListener('click', () => {
    window.location.href = '../Routes/index.html?from=Connaught+Place&to=Kashmiri+Gate';
  });
}

// Mobile Sidebar Toggle
const mobileNavToggle = document.getElementById('mobile-nav-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

if (mobileNavToggle && sidebar && sidebarOverlay) {
  const openSidebar = () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };
  const closeSidebar = () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  mobileNavToggle.addEventListener('click', openSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebar);
}
