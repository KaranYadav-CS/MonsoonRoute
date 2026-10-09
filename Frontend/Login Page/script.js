/**
 * MonsoonRoute - Login Page Interactive Logic
 * Accessible validation, password toggle, social auth mock, and forgot password dialog
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const feedbackBanner = document.getElementById('form-feedback-banner');
  const loginSubmitBtn = document.getElementById('btn-login-submit');

  // Password Visibility Toggle
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeOffIcon = togglePasswordBtn?.querySelector('.eye-off');
  const eyeOnIcon = togglePasswordBtn?.querySelector('.eye-on');

  // Social Auth Buttons
  const googleBtn = document.getElementById('btn-google-login');
  const appleBtn = document.getElementById('btn-apple-login');

  // Forgot Password Dialog Elements
  const forgotPasswordLink = document.getElementById('link-forgot-password');
  const forgotPasswordDialog = document.getElementById('forgot-password-dialog');
  const closeDialogBtn = document.getElementById('btn-close-dialog');
  const cancelResetBtn = document.getElementById('btn-cancel-reset');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const resetEmailInput = document.getElementById('reset-email');
  const resetEmailError = document.getElementById('reset-email-error');

  // =========================================================================
  // 1. Password Visibility Toggle
  // =========================================================================
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isCurrentlyPassword = passwordInput.getAttribute('type') === 'password';
      const newType = isCurrentlyPassword ? 'text' : 'password';
      
      passwordInput.setAttribute('type', newType);
      togglePasswordBtn.setAttribute('aria-pressed', isCurrentlyPassword ? 'true' : 'false');
      togglePasswordBtn.setAttribute('aria-label', isCurrentlyPassword ? 'Hide password' : 'Show password');

      if (eyeOffIcon && eyeOnIcon) {
        eyeOffIcon.style.display = isCurrentlyPassword ? 'none' : 'block';
        eyeOnIcon.style.display = isCurrentlyPassword ? 'block' : 'none';
      }

      passwordInput.focus();
    });
  }

  // =========================================================================
  // 2. Feedback Helpers
  // =========================================================================
  function showFeedback(message, type = 'error') {
    if (!feedbackBanner) return;
    feedbackBanner.className = `form-feedback-banner is-${type}`;
    feedbackBanner.textContent = message;
    feedbackBanner.style.display = 'block';
  }

  function clearFeedback() {
    if (!feedbackBanner) return;
    feedbackBanner.style.display = 'none';
    feedbackBanner.textContent = '';
  }

  function setError(input, errorElement, message) {
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('is-visible');
    }
  }

  function clearError(input, errorElement) {
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('is-visible');
    }
  }

  // Real-time input clearing
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      clearError(emailInput, emailError);
      clearFeedback();
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      clearError(passwordInput, passwordError);
      clearFeedback();
    });
  }

  // =========================================================================
  // 3. Email & Password Validation
  // =========================================================================
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // =========================================================================
  // 4. Form Submission
  // =========================================================================
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFeedback();

      const emailVal = emailInput.value.trim();
      const passwordVal = passwordInput.value;

      let isValid = true;

      // Validate Email
      if (!emailVal) {
        setError(emailInput, emailError, 'Please enter your email address.');
        isValid = false;
      } else if (!validateEmail(emailVal)) {
        setError(emailInput, emailError, 'Please enter a valid email address (e.g. you@example.com).');
        isValid = false;
      } else {
        clearError(emailInput, emailError);
      }

      // Validate Password
      if (!passwordVal) {
        setError(passwordInput, passwordError, 'Please enter your password.');
        isValid = false;
      } else if (passwordVal.length < 6) {
        setError(passwordInput, passwordError, 'Password must be at least 6 characters long.');
        isValid = false;
      } else {
        clearError(passwordInput, passwordError);
      }

      if (!isValid) {
        // Focus first invalid field
        const firstInvalid = loginForm.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Simulate Authentication / Login
      loginSubmitBtn.disabled = true;
      const originalText = loginSubmitBtn.innerHTML;
      loginSubmitBtn.innerHTML = '<span class="btn-text">Logging in...</span>';

      setTimeout(() => {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.innerHTML = originalText;
        showFeedback('Login successful! Redirecting to MonsoonRoute dashboard...', 'success');
        
        // In a full app or demo, redirect to landing page or dashboard
        setTimeout(() => {
          window.location.href = '../Landing Page/index.html';
        }, 1200);
      }, 900);
    });
  }

  // =========================================================================
  // 5. Social Auth Handlers
  // =========================================================================
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      showFeedback('Connecting to Google Sign-In...', 'success');
      setTimeout(() => {
        window.location.href = '../Landing Page/index.html';
      }, 1000);
    });
  }

  if (appleBtn) {
    appleBtn.addEventListener('click', () => {
      showFeedback('Connecting to Apple ID...', 'success');
      setTimeout(() => {
        window.location.href = '../Landing Page/index.html';
      }, 1000);
    });
  }

  // =========================================================================
  // 6. Forgot Password Dialog Logic
  // =========================================================================
  if (forgotPasswordLink && forgotPasswordDialog) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof forgotPasswordDialog.showModal === 'function') {
        forgotPasswordDialog.showModal();
        if (emailInput && emailInput.value.trim() && resetEmailInput) {
          resetEmailInput.value = emailInput.value.trim();
        }
        if (resetEmailInput) resetEmailInput.focus();
      } else {
        const email = prompt('Enter your email address to reset your password:', emailInput?.value || '');
        if (email) {
          showFeedback(`Password reset link sent to ${email}`, 'success');
        }
      }
    });
  }

  function closeDialog() {
    if (forgotPasswordDialog && typeof forgotPasswordDialog.close === 'function') {
      forgotPasswordDialog.close();
    }
  }

  if (closeDialogBtn) closeDialogBtn.addEventListener('click', closeDialog);
  if (cancelResetBtn) cancelResetBtn.addEventListener('click', closeDialog);

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const resetVal = resetEmailInput.value.trim();
      if (!resetVal || !validateEmail(resetVal)) {
        if (resetEmailError) {
          resetEmailError.textContent = 'Please enter a valid email address.';
          resetEmailError.classList.add('is-visible');
        }
        resetEmailInput.focus();
        return;
      }
      closeDialog();
      showFeedback(`Password reset link has been sent to ${resetVal}`, 'success');
    });
  }
});
