/**
 * MonsoonRoute - Profile & Preferences Interactive Controller
 * Handles account information editing, avatar updates, notification toggles,
 * app preferences, privacy actions, and modal flows.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     1. DEFAULT STATE & LOCALSTORAGE MANAGER
     ========================================================================== */
  const DEFAULT_PROFILE = {
    fullName: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    phone: '+91 98765 43210',
    location: 'New Delhi, Delhi',
    bio: 'Exploring smarter and safer routes during the monsoon.',
    memberSince: '22 July 2024',
    avatarImg: '', // base64 or empty for letter 'A'
    routesCount: 12,
    reportsCount: 8,
    alertsCount: 5,
    daysCount: 24,
    waterloggingAlerts: true,
    highRiskAlerts: true,
    routeRecs: true,
    emergencyAlerts: true,
    defaultView: 'map',
    defaultLocation: 'delhi',
    distanceUnit: 'km'
  };

  let profileState = { ...DEFAULT_PROFILE };

  try {
    const saved = localStorage.getItem('monsoonroute_user_profile');
    if (saved) {
      profileState = { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not load profile from localStorage', e);
  }

  function saveProfileState() {
    try {
      localStorage.setItem('monsoonroute_user_profile', JSON.stringify(profileState));
    } catch (e) {
      console.warn('Could not save profile to localStorage', e);
    }
  }

  /* ==========================================================================
     2. DOM ELEMENTS
     ========================================================================== */
  // Top bar elements
  const topUserName = document.getElementById('top-user-name');
  const topAvatarCircle = document.getElementById('top-avatar-circle');
  const topSearchInput = document.getElementById('top-search-input');
  const topSearchBtn = document.getElementById('top-search-btn');
  const topSettingsBtn = document.getElementById('top-settings-btn');
  const topBellBtn = document.getElementById('top-bell-btn');
  const topUserPill = document.getElementById('top-user-dropdown-btn');

  // Hero card elements
  const userAvatarWrap = document.getElementById('user-avatar-wrap');
  const profileAvatarDisplay = document.getElementById('profile-avatar-display');
  const avatarCameraBtn = document.getElementById('avatar-camera-btn');
  const avatarRemoveBadgeBtn = document.getElementById('avatar-remove-badge-btn');
  const avatarFileInput = document.getElementById('avatar-file-input');
  const avatarOptionsPopover = document.getElementById('avatar-options-popover');
  const avatarPopoverUploadBtn = document.getElementById('avatar-popover-upload-btn');
  const avatarPopoverRemoveBtn = document.getElementById('avatar-popover-remove-btn');
  const cardUserName = document.getElementById('card-user-name');
  const cardUserEmail = document.getElementById('card-user-email');
  const cardUserPhone = document.getElementById('card-user-phone');
  const cardUserLocation = document.getElementById('card-user-location');
  const userBioText = document.getElementById('user-bio-text');
  const bioEditBtn = document.getElementById('bio-edit-btn');
  const statRoutes = document.getElementById('stat-routes');
  const statReports = document.getElementById('stat-reports');
  const statAlerts = document.getElementById('stat-alerts');
  const statDays = document.getElementById('stat-days');

  // Account card elements
  const valFullname = document.getElementById('val-fullname');
  const valEmail = document.getElementById('val-email');
  const valPhone = document.getElementById('val-phone');
  const valLocation = document.getElementById('val-location');
  const valMemberSince = document.getElementById('val-member-since');
  const editAccountBtn = document.getElementById('edit-account-btn');

  // Toggles
  const toggleWaterlogging = document.getElementById('toggle-waterlogging');
  const toggleHighRisk = document.getElementById('toggle-high-risk');
  const toggleRouteRecs = document.getElementById('toggle-route-recs');
  const toggleEmergency = document.getElementById('toggle-emergency');

  // Preferences selects
  const prefDefaultView = document.getElementById('pref-default-view');
  const prefDefaultLocation = document.getElementById('pref-default-location');
  const prefDistanceUnit = document.getElementById('pref-distance-unit');

  // Privacy buttons
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');

  // Modals
  const editModal = document.getElementById('edit-profile-modal');
  const editModalForm = document.getElementById('edit-profile-form');
  const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
  const editModalCancelBtn = document.getElementById('edit-modal-cancel-btn');
  const editFullname = document.getElementById('edit-fullname');
  const editEmail = document.getElementById('edit-email');
  const editPhone = document.getElementById('edit-phone');
  const editLocation = document.getElementById('edit-location');
  const editBio = document.getElementById('edit-bio');

  const clearModal = document.getElementById('clear-history-modal');
  const clearModalCloseBtn = document.getElementById('clear-modal-close-btn');
  const clearModalCancelBtn = document.getElementById('clear-modal-cancel-btn');
  const confirmClearBtn = document.getElementById('confirm-clear-btn');

  const deleteModal = document.getElementById('delete-modal');
  const deleteModalCloseBtn = document.getElementById('delete-modal-close-btn');
  const deleteModalCancelBtn = document.getElementById('delete-modal-cancel-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  const infoModal = document.getElementById('info-modal');
  const infoModalTitle = document.getElementById('info-modal-title');
  const infoModalBody = document.getElementById('info-modal-body');
  const infoModalCloseBtn = document.getElementById('info-modal-close-btn');
  const infoModalOkBtn = document.getElementById('info-modal-ok-btn');

  // About links
  const linkTerms = document.getElementById('link-terms');
  const linkPrivacy = document.getElementById('link-privacy');
  const linkHelp = document.getElementById('link-help');

  // Toast
  const toast = document.getElementById('profile-toast');

  // Sidebar elements
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const openMenuBtn = document.getElementById('mobile-nav-toggle');
  const closeMenuBtn = document.getElementById('sidebar-close-btn');

  /* ==========================================================================
     3. RENDER PROFILE STATE TO DOM
     ========================================================================== */
  function updateUI() {
    // Names & Contacts
    if (topUserName) topUserName.textContent = profileState.fullName;
    if (cardUserName) cardUserName.textContent = profileState.fullName;
    if (valFullname) valFullname.textContent = profileState.fullName;

    if (cardUserEmail) cardUserEmail.textContent = profileState.email;
    if (valEmail) valEmail.textContent = profileState.email;

    if (cardUserPhone) cardUserPhone.textContent = profileState.phone;
    if (valPhone) valPhone.textContent = profileState.phone;

    if (cardUserLocation) cardUserLocation.textContent = profileState.location;
    if (valLocation) valLocation.textContent = profileState.location;

    if (userBioText) userBioText.textContent = profileState.bio;
    if (valMemberSince) valMemberSince.textContent = profileState.memberSince;

    // Avatar (letter or custom photo)
    const initial = (profileState.fullName.trim()[0] || 'A').toUpperCase();
    if (profileState.avatarImg) {
      if (profileAvatarDisplay) {
        profileAvatarDisplay.innerHTML = `<img src="${profileState.avatarImg}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
      if (topAvatarCircle) {
        topAvatarCircle.innerHTML = `<img src="${profileState.avatarImg}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
      if (avatarRemoveBadgeBtn) avatarRemoveBadgeBtn.hidden = false;
    } else {
      if (profileAvatarDisplay) profileAvatarDisplay.textContent = initial;
      if (topAvatarCircle) topAvatarCircle.textContent = initial;
      if (avatarRemoveBadgeBtn) avatarRemoveBadgeBtn.hidden = true;
    }

    // Stats
    if (statRoutes) statRoutes.textContent = profileState.routesCount;
    if (statReports) statReports.textContent = profileState.reportsCount;
    if (statAlerts) statAlerts.textContent = profileState.alertsCount;
    if (statDays) statDays.textContent = profileState.daysCount;

    // Toggles
    if (toggleWaterlogging) toggleWaterlogging.checked = profileState.waterloggingAlerts;
    if (toggleHighRisk) toggleHighRisk.checked = profileState.highRiskAlerts;
    if (toggleRouteRecs) toggleRouteRecs.checked = profileState.routeRecs;
    if (toggleEmergency) toggleEmergency.checked = profileState.emergencyAlerts;

    // Selects
    if (prefDefaultView) prefDefaultView.value = profileState.defaultView;
    if (prefDefaultLocation) prefDefaultLocation.value = profileState.defaultLocation;
    if (prefDistanceUnit) prefDistanceUnit.value = profileState.distanceUnit;
  }

  updateUI();

  /* ==========================================================================
     4. EDIT PROFILE MODAL FLOW
     ========================================================================== */
  function openEditModal() {
    if (editFullname) editFullname.value = profileState.fullName;
    if (editEmail) editEmail.value = profileState.email;
    if (editPhone) editPhone.value = profileState.phone;
    if (editLocation) editLocation.value = profileState.location;
    if (editBio) editBio.value = profileState.bio;

    if (editModal) editModal.hidden = false;
  }

  function closeEditModal() {
    if (editModal) editModal.hidden = true;
  }

  editAccountBtn?.addEventListener('click', openEditModal);
  bioEditBtn?.addEventListener('click', openEditModal);
  topUserPill?.addEventListener('click', openEditModal);

  editModalCloseBtn?.addEventListener('click', closeEditModal);
  editModalCancelBtn?.addEventListener('click', closeEditModal);

  editModalForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    profileState.fullName = editFullname?.value.trim() || profileState.fullName;
    profileState.email = editEmail?.value.trim() || profileState.email;
    profileState.phone = editPhone?.value.trim() || profileState.phone;
    profileState.location = editLocation?.value.trim() || profileState.location;
    profileState.bio = editBio?.value.trim() || profileState.bio;

    saveProfileState();
    updateUI();
    closeEditModal();
    showToast('Account information updated successfully.');
  });

  /* ==========================================================================
     5. AVATAR PHOTO & REMOVAL HANDLERS
     ========================================================================== */
  function toggleAvatarPopover() {
    if (!avatarOptionsPopover) return;
    const isHidden = avatarOptionsPopover.hidden;
    avatarOptionsPopover.hidden = !isHidden;
    if (profileAvatarDisplay) {
      profileAvatarDisplay.setAttribute('aria-expanded', String(!isHidden));
    }
  }

  function closeAvatarPopover() {
    if (avatarOptionsPopover) {
      avatarOptionsPopover.hidden = true;
      profileAvatarDisplay?.setAttribute('aria-expanded', 'false');
    }
  }

  // Toggle options on clicking profile photo or camera button
  profileAvatarDisplay?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAvatarPopover();
  });

  profileAvatarDisplay?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAvatarPopover();
    }
  });

  avatarCameraBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAvatarPopover();
  });

  // Close popover when clicking outside or pressing Escape
  document.addEventListener('click', (e) => {
    if (userAvatarWrap && !userAvatarWrap.contains(e.target)) {
      closeAvatarPopover();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAvatarPopover();
    }
  });

  // Upload photo button from popover
  avatarPopoverUploadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAvatarPopover();
    avatarFileInput?.click();
  });

  // Remove photo handler
  function handleRemoveAvatar() {
    if (!profileState.avatarImg) {
      showToast('Profile photo is already using default letter avatar.');
      closeAvatarPopover();
      return;
    }
    profileState.avatarImg = '';
    saveProfileState();
    updateUI();
    closeAvatarPopover();
    showToast('Profile photo removed.');
  }

  avatarPopoverRemoveBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleRemoveAvatar();
  });

  avatarRemoveBadgeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    handleRemoveAvatar();
  });

  avatarFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      showToast('Image size exceeds 4 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      profileState.avatarImg = event.target.result;
      saveProfileState();
      updateUI();
      closeAvatarPopover();
      showToast('Profile photo updated.');
    };
    reader.readAsDataURL(file);
    avatarFileInput.value = '';
  });

  /* ==========================================================================
     6. NOTIFICATION SWITCHES
     ========================================================================== */
  toggleWaterlogging?.addEventListener('change', () => {
    profileState.waterloggingAlerts = toggleWaterlogging.checked;
    saveProfileState();
    showToast(`Waterlogging Alerts turned ${toggleWaterlogging.checked ? 'ON' : 'OFF'}.`);
  });

  toggleHighRisk?.addEventListener('change', () => {
    profileState.highRiskAlerts = toggleHighRisk.checked;
    saveProfileState();
    showToast(`High-Risk Area Alerts turned ${toggleHighRisk.checked ? 'ON' : 'OFF'}.`);
  });

  toggleRouteRecs?.addEventListener('change', () => {
    profileState.routeRecs = toggleRouteRecs.checked;
    saveProfileState();
    showToast(`Route Recommendations turned ${toggleRouteRecs.checked ? 'ON' : 'OFF'}.`);
  });

  toggleEmergency?.addEventListener('change', () => {
    profileState.emergencyAlerts = toggleEmergency.checked;
    saveProfileState();
    showToast(`Emergency Weather Alerts turned ${toggleEmergency.checked ? 'ON' : 'OFF'}.`);
  });

  /* ==========================================================================
     7. APP PREFERENCES SELECTORS
     ========================================================================== */
  prefDefaultView?.addEventListener('change', () => {
    profileState.defaultView = prefDefaultView.value;
    saveProfileState();
    showToast(`Default opening view set to "${prefDefaultView.options[prefDefaultView.selectedIndex].text}".`);
  });

  prefDefaultLocation?.addEventListener('change', () => {
    profileState.defaultLocation = prefDefaultLocation.value;
    saveProfileState();
    showToast(`Default starting location set to "${prefDefaultLocation.options[prefDefaultLocation.selectedIndex].text}".`);
  });

  prefDistanceUnit?.addEventListener('change', () => {
    profileState.distanceUnit = prefDistanceUnit.value;
    saveProfileState();
    showToast(`Distance measurement set to "${prefDistanceUnit.options[prefDistanceUnit.selectedIndex].text}".`);
  });

  /* ==========================================================================
     8. DATA & PRIVACY ACTIONS
     ========================================================================== */
  clearHistoryBtn?.addEventListener('click', () => {
    if (clearModal) clearModal.hidden = false;
  });

  clearModalCloseBtn?.addEventListener('click', () => { if (clearModal) clearModal.hidden = true; });
  clearModalCancelBtn?.addEventListener('click', () => { if (clearModal) clearModal.hidden = true; });

  confirmClearBtn?.addEventListener('click', () => {
    localStorage.removeItem('monsoonroute_recent_searches');
    profileState.routesCount = 0;
    saveProfileState();
    updateUI();
    if (clearModal) clearModal.hidden = true;
    showToast('Search and route history cleared successfully.');
  });

  deleteAccountBtn?.addEventListener('click', () => {
    if (deleteModal) deleteModal.hidden = false;
  });

  deleteModalCloseBtn?.addEventListener('click', () => { if (deleteModal) deleteModal.hidden = true; });
  deleteModalCancelBtn?.addEventListener('click', () => { if (deleteModal) deleteModal.hidden = true; });

  confirmDeleteBtn?.addEventListener('click', () => {
    localStorage.removeItem('monsoonroute_user_profile');
    localStorage.removeItem('monsoonroute_recent_searches');
    if (deleteModal) deleteModal.hidden = true;
    showToast('Account data deleted. Redirecting...');
    setTimeout(() => {
      window.location.href = '../Dashboard/index.html';
    }, 1200);
  });

  /* ==========================================================================
     9. ABOUT & LEGAL DOCUMENTATION MODALS
     ========================================================================== */
  function openInfoModal(title, contentHtml) {
    if (infoModalTitle) infoModalTitle.textContent = title;
    if (infoModalBody) infoModalBody.innerHTML = contentHtml;
    if (infoModal) infoModal.hidden = false;
  }

  linkTerms?.addEventListener('click', (e) => {
    e.preventDefault();
    openInfoModal('Terms of Service', `
      <p><strong>1. Service Overview:</strong> MonsoonRoute provides real-time community waterlogging telemetry, AI flood risk avoidance, and emergency helpline routing across Delhi NCR.</p>
      <br>
      <p><strong>2. User Contributions:</strong> Reports submitted to MonsoonRoute are verified against live sensor depths and municipal agency feeds (PWD, DDA, Traffic Police).</p>
      <br>
      <p><strong>3. Liability:</strong> During extreme rainfall events, always obey on-ground Delhi Traffic Police barricades and NDRF instructions.</p>
    `);
  });

  linkPrivacy?.addEventListener('click', (e) => {
    e.preventDefault();
    openInfoModal('Privacy Policy', `
      <p><strong>1. Data Encryption:</strong> Your precise GPS location is processed locally in your browser for route calculation and is never sold to third parties.</p>
      <br>
      <p><strong>2. Anonymous Reporting:</strong> Incident reports submitted to the live risk map protect user privacy and do not display phone numbers or personal identifiers.</p>
      <br>
      <p><strong>3. Storage:</strong> All account preferences and saved routes are stored securely in local browser storage.</p>
    `);
  });

  linkHelp?.addEventListener('click', (e) => {
    e.preventDefault();
    openInfoModal('Help & Support', `
      <p><strong>24×7 Monsoon Support Helpline:</strong> +91 11-2336-0000</p>
      <p><strong>Support Email:</strong> support@monsoonroute.delhi.gov.in</p>
      <br>
      <p><strong>Emergency Direct Numbers:</strong></p>
      <ul>
        <li>Delhi Traffic Police: 1095</li>
        <li>Universal Emergency: 112</li>
        <li>NDRF Flood Rescue: 011-24363260</li>
      </ul>
    `);
  });

  infoModalCloseBtn?.addEventListener('click', () => { if (infoModal) infoModal.hidden = true; });
  infoModalOkBtn?.addEventListener('click', () => { if (infoModal) infoModal.hidden = true; });

  // Close modals on backdrop click
  [editModal, clearModal, deleteModal, infoModal].forEach(modal => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });

  /* ==========================================================================
     10. TOP BAR ACTIONS
     ========================================================================== */
  const executeSearch = () => {
    const q = topSearchInput?.value.trim();
    if (!q) {
      showToast('Please type a location to search.');
      topSearchInput?.focus();
      return;
    }
    window.location.href = `../Map/index.html?search=${encodeURIComponent(q)}`;
  };

  topSearchBtn?.addEventListener('click', executeSearch);
  topSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') executeSearch();
  });

  topSettingsBtn?.addEventListener('click', () => {
    document.querySelector('.app-prefs-card')?.scrollIntoView({ behavior: 'smooth' });
    showToast('Navigated to App Preferences.');
  });

  topBellBtn?.addEventListener('click', () => {
    showToast('You have 5 unread alerts: Minto Bridge waterlogging alert active.');
  });

  /* ==========================================================================
     11. TOAST NOTIFICATION UTILITY
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

  /* ==========================================================================
     12. MOBILE SIDEBAR TOGGLE
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
      if (editModal) editModal.hidden = true;
      if (clearModal) clearModal.hidden = true;
      if (deleteModal) deleteModal.hidden = true;
      if (infoModal) infoModal.hidden = true;
    }
  });

});
