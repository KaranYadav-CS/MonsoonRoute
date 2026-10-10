/**
 * MonsoonRoute - Report Waterlogging Interactive Controller
 * Handles issue selection, drag-and-drop photo upload, interactive Leaflet location picker,
 * live character count, and report submission modal.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. DELHI LANDMARK COORDINATES FOR REVERSE LOOKUP
     ========================================================================== */
  const DELHI_HOTSPOTS = [
    { name: 'Minto Bridge Underpass, CP', lat: 28.6380, lng: 77.2230 },
    { name: 'Connaught Place Outer Circle', lat: 28.6328, lng: 77.2197 },
    { name: 'ITO Underpass, Vikas Minar', lat: 28.6289, lng: 77.2405 },
    { name: 'Kashmiri Gate ISBT, Ring Road', lat: 28.6675, lng: 77.2284 },
    { name: 'AIIMS Delhi / Ring Road Flyover', lat: 28.5672, lng: 77.2100 },
    { name: 'Rajouri Garden Ring Road', lat: 28.6415, lng: 77.1209 },
    { name: 'Mathura Road, Ashram Underpass', lat: 28.5714, lng: 77.2589 },
    { name: 'Dhaula Kuan Junction Flyover', lat: 28.5921, lng: 77.1614 },
    { name: 'Saket District Centre, Press Enclave', lat: 28.5245, lng: 77.2066 },
    { name: 'Rohini Sector 10 Underpass', lat: 28.7166, lng: 77.1147 },
    { name: 'Laxmi Nagar Vikas Marg', lat: 28.6304, lng: 77.2773 },
    { name: 'Akshardham NH-24 Crossing', lat: 28.6127, lng: 77.2773 }
  ];

  /* ==========================================================================
     2. DOM ELEMENTS
     ========================================================================== */
  const issueCards = document.querySelectorAll('.issue-card');
  const descriptionInput = document.getElementById('report-description');
  const charCounter = document.getElementById('char-counter');
  const waterLevelSelect = document.getElementById('water-level-select');
  const incidentTimeSelect = document.getElementById('incident-time-select');
  const submitBtn = document.getElementById('submit-report-btn');

  // Photo elements
  const dropzone = document.getElementById('photo-dropzone');
  const fileInput = document.getElementById('photo-file-input');
  const thumbnailsRow = document.getElementById('photo-thumbnails-row');
  const addMorePhotosBtn = document.getElementById('photo-add-more-btn');

  // Location elements
  const locationInput = document.getElementById('report-location-input');
  const gpsBtn = document.getElementById('location-gps-btn');
  const chooseOnMapBtn = document.getElementById('choose-on-map-btn');

  // Modal & Toast
  const successModal = document.getElementById('success-modal');
  const modalCloseResetBtn = document.getElementById('modal-close-reset-btn');
  const modalReportId = document.getElementById('modal-report-id');
  const modalReportIssue = document.getElementById('modal-report-issue');
  const modalReportLoc = document.getElementById('modal-report-loc');
  const toast = document.getElementById('report-toast');
  const backBtn = document.getElementById('report-back-btn');

  // Sidebar elements
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openMenuBtn = document.getElementById('mobile-nav-toggle');
  const closeMenuBtn = document.getElementById('sidebar-close-btn');

  let currentSelectedIssue = 'heavy-waterlogging';
  let currentSelectedIssueTitle = 'Heavy waterlogging';
  let reportPhotos = [];
  let map, currentMarker;

  /* ==========================================================================
     3. STEP 1: ISSUE TYPE SELECTION
     ========================================================================== */
  issueCards.forEach(card => {
    const selectCard = () => {
      issueCards.forEach(c => {
        c.classList.remove('is-selected');
        c.setAttribute('aria-checked', 'false');
      });

      card.classList.add('is-selected');
      card.setAttribute('aria-checked', 'true');
      currentSelectedIssue = card.getAttribute('data-issue');
      
      const titleEl = card.querySelector('.issue-text h3');
      currentSelectedIssueTitle = titleEl ? titleEl.textContent.trim() : 'Waterlogging';

      // Smart auto-suggestion for water level
      if (waterLevelSelect && !waterLevelSelect.value) {
        if (currentSelectedIssue === 'heavy-waterlogging') {
          waterLevelSelect.value = 'knee';
        } else if (currentSelectedIssue === 'road-blocked') {
          waterLevelSelect.value = 'waist';
        } else if (currentSelectedIssue === 'minor-waterlogging') {
          waterLevelSelect.value = 'ankle';
        }
      }
    };

    card.addEventListener('click', selectCard);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectCard();
      }
    });
  });

  /* ==========================================================================
     4. STEP 2: PHOTO UPLOAD & THUMBNAILS MANAGEMENT
     ========================================================================== */
  // Click dropzone or + button to open file dialog
  dropzone?.addEventListener('click', () => fileInput?.click());
  addMorePhotosBtn?.addEventListener('click', () => fileInput?.click());

  // Drag and Drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('is-dragover');
    });
  });

  dropzone?.addEventListener('drop', (e) => {
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
    // reset input so same file can be selected again
    fileInput.value = '';
  });

  function handleFiles(files) {
    const maxFiles = 6;
    const currentCount = thumbnailsRow.querySelectorAll('.photo-thumb-item').length;

    if (currentCount >= maxFiles) {
      showToast('Maximum 6 photos allowed per report.');
      return;
    }

    files.forEach(file => {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload valid image files (JPG, PNG, WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast(`File "${file.name}" exceeds the 5 MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        addThumbnail(e.target.result, file.name);
      };
      reader.readAsDataURL(file);
    });
  }

  function addThumbnail(imgSrc, altText = 'Report photo') {
    const thumbItem = document.createElement('div');
    thumbItem.className = 'photo-thumb-item';
    thumbItem.innerHTML = `
      <img src="${imgSrc}" alt="${altText}" class="thumb-img">
      <button type="button" class="thumb-delete-btn" aria-label="Remove photo" title="Remove">✕</button>
    `;

    // Delete handler
    thumbItem.querySelector('.thumb-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      thumbItem.style.transform = 'scale(0.8)';
      thumbItem.style.opacity = '0';
      setTimeout(() => {
        thumbItem.remove();
        showToast('Photo removed.');
      }, 150);
    });

    // Insert before the (+) add button
    if (addMorePhotosBtn) {
      thumbnailsRow.insertBefore(thumbItem, addMorePhotosBtn);
    } else {
      thumbnailsRow.appendChild(thumbItem);
    }

    showToast('Photo uploaded successfully.');
  }

  // Attach delete handlers for initial 3 preview thumbnails
  document.querySelectorAll('.thumb-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.photo-thumb-item');
      if (parent) {
        parent.style.transform = 'scale(0.8)';
        parent.style.opacity = '0';
        setTimeout(() => {
          parent.remove();
          showToast('Photo removed.');
        }, 150);
      }
    });
  });

  /* ==========================================================================
     5. ADDITIONAL DETAILS & CHAR COUNTER
     ========================================================================== */
  descriptionInput?.addEventListener('input', () => {
    const len = descriptionInput.value.length;
    if (charCounter) {
      charCounter.textContent = `${len}/300`;
      charCounter.classList.toggle('is-near-limit', len > 260);
    }
  });

  /* ==========================================================================
     6. SELECT LOCATION & LEAFLET MAP
     ========================================================================== */
  function initReportMap() {
    const mapEl = document.getElementById('report-map-leaflet');
    if (!mapEl || typeof L === 'undefined') return;

    // Center on Delhi (Minto Bridge / Central Delhi)
    const initialLat = 28.6340;
    const initialLng = 77.2210;

    map = L.map('report-map-leaflet', {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // CartoDB Voyager tiles (crisp, clean road hierarchy)
    const voyagerTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    });
    voyagerTiles.addTo(map);

    // Fallback to OSM if cartocdn is unreachable
    voyagerTiles.on('tileerror', () => {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    });

    // Custom Blue Pin Marker
    const pinIcon = L.divIcon({
      className: 'report-map-custom-pin',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          <div style="width:34px;height:34px;border-radius:50%;background:#0877ee;border:3px solid #ffffff;box-shadow:0 4px 12px rgba(8,119,238,0.45);display:flex;align-items:center;justify-content:center;color:#ffffff;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </div>
          <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:10px;height:10px;background:#0877ee;transform:rotate(45deg);border-right:3px solid #fff;border-bottom:3px solid #fff;"></div>
        </div>
      `,
      iconSize: [34, 40],
      iconAnchor: [17, 38]
    });

    currentMarker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: true
    }).addTo(map);

    // Marker drag end
    currentMarker.on('dragend', () => {
      const pos = currentMarker.getLatLng();
      updateLocationFromCoords(pos.lat, pos.lng);
    });

    // Map click to move marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      currentMarker.setLatLng([lat, lng]);
      updateLocationFromCoords(lat, lng);
    });

    // Add small subtle traffic flow indicators
    const sampleRoad = L.polyline([
      [28.644, 77.218],
      [28.638, 77.223],
      [28.632, 77.220]
    ], {
      color: '#ef4444',
      weight: 5,
      opacity: 0.85
    }).addTo(map);
  }

  function findNearestLandmark(lat, lng) {
    let nearest = DELHI_HOTSPOTS[0];
    let minDistance = Infinity;

    DELHI_HOTSPOTS.forEach(spot => {
      const dLat = spot.lat - lat;
      const dLng = spot.lng - lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = spot;
      }
    });

    return nearest.name;
  }

  function updateLocationFromCoords(lat, lng) {
    const landmarkName = findNearestLandmark(lat, lng);
    if (locationInput) {
      locationInput.value = landmarkName;
      showToast(`Location set: ${landmarkName}`);
    }
  }

  // GPS Locate Button Handler
  gpsBtn?.addEventListener('click', () => {
    gpsBtn.classList.add('is-locating');
    showToast('Locating your position in Delhi...');

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          gpsBtn.classList.remove('is-locating');
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // If within Delhi NCR bounds
          if (lat > 28.3 && lat < 28.9 && lng > 76.8 && lng < 77.6) {
            map?.flyTo([lat, lng], 15);
            currentMarker?.setLatLng([lat, lng]);
            updateLocationFromCoords(lat, lng);
          } else {
            // Graceful fallback to Connaught Place
            fallbackDelhiGps();
          }
        },
        () => {
          gpsBtn.classList.remove('is-locating');
          fallbackDelhiGps();
        },
        { timeout: 4000 }
      );
    } else {
      gpsBtn.classList.remove('is-locating');
      fallbackDelhiGps();
    }
  });

  function fallbackDelhiGps() {
    const lat = 28.6328;
    const lng = 77.2197;
    map?.flyTo([lat, lng], 15);
    currentMarker?.setLatLng([lat, lng]);
    if (locationInput) {
      locationInput.value = 'Current Location (Connaught Place, Central Delhi)';
    }
    showToast('Location detected: Connaught Place, Central Delhi');
  }

  // Choose on map button handler
  chooseOnMapBtn?.addEventListener('click', () => {
    map?.zoomIn();
    showToast('Click anywhere on the map to pin waterlogging.');
  });

  /* ==========================================================================
     7. REPORT SUBMISSION & CONFIRMATION MODAL
     ========================================================================== */
  submitBtn?.addEventListener('click', () => {
    const locationVal = locationInput ? locationInput.value.trim() : '';

    if (!locationVal) {
      showToast('Please specify an incident location.');
      locationInput?.focus();
      return;
    }

    // Set loading state
    submitBtn.classList.add('is-loading');
    const originalText = submitBtn.querySelector('.submit-btn-text').textContent;
    submitBtn.querySelector('.submit-btn-text').textContent = 'Submitting report...';

    setTimeout(() => {
      submitBtn.classList.remove('is-loading');
      submitBtn.querySelector('.submit-btn-text').textContent = originalText;

      // Populate Success Modal
      const randomId = `#DEL-${Math.floor(1000 + Math.random() * 9000)}`;
      if (modalReportId) modalReportId.textContent = randomId;
      if (modalReportIssue) modalReportIssue.textContent = currentSelectedIssueTitle;
      if (modalReportLoc) modalReportLoc.textContent = locationVal;

      // Open Modal
      if (successModal) {
        successModal.hidden = false;
      }
    }, 600);
  });

  // Modal Close & Reset
  modalCloseResetBtn?.addEventListener('click', () => {
    if (successModal) successModal.hidden = true;

    // Reset Form
    if (descriptionInput) descriptionInput.value = '';
    if (charCounter) charCounter.textContent = '0/300';
    if (waterLevelSelect) waterLevelSelect.value = '';
    if (incidentTimeSelect) incidentTimeSelect.value = 'now';
    if (locationInput) locationInput.value = 'Current Location';

    // Reset to first issue card
    issueCards[0]?.click();

    showToast('Ready for new report.');
  });

  // Close modal when clicking backdrop
  successModal?.addEventListener('click', (e) => {
    if (e.target === successModal) {
      successModal.hidden = true;
    }
  });

  /* ==========================================================================
     8. TOAST NOTIFICATION & BACK BUTTON
     ========================================================================== */
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
     9. MOBILE SIDEBAR TOGGLE
     ========================================================================== */
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
      if (successModal && !successModal.hidden) successModal.hidden = true;
    }
  });

  // Initialize Map
  initReportMap();

});
