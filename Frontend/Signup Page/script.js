/**
 * MonsoonRoute - Refactored Client-Side Registration Logic
 * WCAG 2.2 AA Compliant, Live Password Strength/Checklist, Accessible Errors
 */

document.addEventListener('DOMContentLoaded', () => {
  // Primary Elements
  const signupForm = document.getElementById('signup-form');
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const passwordInput = document.getElementById('password');
  const termsCheckbox = document.getElementById('terms');
  const submitBtn = document.getElementById('btn-submit-account');
  const feedbackBanner = document.getElementById('form-feedback-banner');

  // Country calling code picker
  const countrySelect = document.getElementById('country-select');
  const countryDisplay = document.getElementById('country-display');

  // Password visibility toggle
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeOffIcon = togglePasswordBtn?.querySelector('.eye-off');
  const eyeOnIcon = togglePasswordBtn?.querySelector('.eye-on');

  // Password rules & strength elements
  const passwordRulesCard = document.getElementById('password-rules-card');
  const passwordAnnouncer = document.getElementById('password-announcer');
  const strengthStatus = document.getElementById('strength-status');
  const segments = [
    document.getElementById('seg-1'),
    document.getElementById('seg-2'),
    document.getElementById('seg-3'),
    document.getElementById('seg-4')
  ];

  const ruleLength = document.getElementById('rule-length');
  const ruleUppercase = document.getElementById('rule-uppercase');
  const ruleNumber = document.getElementById('rule-number');
  const ruleSpecial = document.getElementById('rule-special');

  // Inline error containers
  const fullnameError = document.getElementById('fullname-error');
  const emailError = document.getElementById('email-error');
  const phoneError = document.getElementById('phone-error');
  const passwordError = document.getElementById('password-error');
  const termsError = document.getElementById('terms-error');

  // Social auth buttons
  const googleBtn = document.getElementById('btn-google-auth');
  const appleBtn = document.getElementById('btn-apple-auth');

  // =========================================================================
  // 1. Accessible Password Visibility Toggle
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

      // Keep focus on the password field for seamless typing
      passwordInput.focus();
    });
  }

  // =========================================================================
  // 2. Dynamic Password Strength & Rules Box (Shows on Focus/Input)
  // =========================================================================
  function showPasswordRules() {
    if (passwordRulesCard) {
      passwordRulesCard.classList.add('is-visible');
      passwordRulesCard.setAttribute('aria-hidden', 'false');
    }
  }

  function hidePasswordRulesIfEmpty() {
    if (passwordRulesCard && (!passwordInput.value || passwordInput.value.length === 0)) {
      passwordRulesCard.classList.remove('is-visible');
      passwordRulesCard.setAttribute('aria-hidden', 'true');
    }
  }

  if (passwordInput) {
    passwordInput.addEventListener('focus', () => {
      showPasswordRules();
    });

    passwordInput.addEventListener('blur', () => {
      hidePasswordRulesIfEmpty();
    });

    passwordInput.addEventListener('input', () => {
      showPasswordRules();
      evaluatePassword(passwordInput.value);
      clearFieldError(passwordInput, passwordError);
    });
  }

  function updateRuleState(ruleElement, isMet, ruleName) {
    if (!ruleElement) return;
    const currentlyMet = ruleElement.classList.contains('rule-met');
    if (isMet) {
      ruleElement.classList.add('rule-met');
    } else {
      ruleElement.classList.remove('rule-met');
    }

    // Announce to screen readers when state flips
    if (currentlyMet !== isMet && passwordAnnouncer) {
      passwordAnnouncer.textContent = `${ruleName}: ${isMet ? 'Requirement fulfilled' : 'Requirement unmet'}`;
    }
  }

  function evaluatePassword(pwd) {
    const hasLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNum = /[0-9]/.test(pwd);
    const hasSpec = /[^A-Za-z0-9]/.test(pwd);

    updateRuleState(ruleLength, hasLength, 'At least 8 characters');
    updateRuleState(ruleUppercase, hasUpper, 'Uppercase letter');
    updateRuleState(ruleNumber, hasNum, 'Number');
    updateRuleState(ruleSpecial, hasSpec, 'Special character');

    // Calculate strength score (0 to 4)
    let score = 0;
    if (hasLength) score++;
    if (hasUpper) score++;
    if (hasNum) score++;
    if (hasSpec) score++;

    // Extra length bonus if ≥ 12 chars
    if (pwd.length >= 12 && score >= 3) {
      score = 4;
    }

    updateStrengthMeter(score, pwd.length);
    return hasLength && hasUpper && hasNum && hasSpec;
  }

  function updateStrengthMeter(score, pwdLength) {
    // Reset all segment styles
    segments.forEach(seg => {
      if (seg) seg.className = 'segment';
    });

    if (pwdLength === 0) {
      if (strengthStatus) {
        strengthStatus.textContent = 'Too weak';
        strengthStatus.style.color = 'var(--color-error)';
      }
      return;
    }

    if (score <= 1) {
      if (strengthStatus) {
        strengthStatus.textContent = 'Weak';
        strengthStatus.style.color = 'var(--color-error)';
      }
      if (segments[0]) segments[0].classList.add('weak');
    } else if (score === 2) {
      if (strengthStatus) {
        strengthStatus.textContent = 'Fair';
        strengthStatus.style.color = 'var(--color-warning)';
      }
      if (segments[0]) segments[0].classList.add('fair');
      if (segments[1]) segments[1].classList.add('fair');
    } else if (score === 3) {
      if (strengthStatus) {
        strengthStatus.textContent = 'Good';
        strengthStatus.style.color = 'var(--color-primary)';
      }
      if (segments[0]) segments[0].classList.add('good');
      if (segments[1]) segments[1].classList.add('good');
      if (segments[2]) segments[2].classList.add('good');
    } else {
      if (strengthStatus) {
        strengthStatus.textContent = 'Strong';
        strengthStatus.style.color = 'var(--color-success)';
      }
      segments.forEach(seg => {
        if (seg) seg.classList.add('strong');
      });
    }
  }

  // =========================================================================
  // 3. Country Code Dropdown Sync
  // =========================================================================
  if (countrySelect && countryDisplay) {
    countrySelect.addEventListener('change', () => {
      countryDisplay.textContent = countrySelect.value;
    });
  }

  // =========================================================================
  // 4. Form Validation & Error Handling
  // =========================================================================
  function showFieldError(inputElement, errorElement, message) {
    if (inputElement) {
      inputElement.setAttribute('aria-invalid', 'true');
    }
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('visible');
    }
  }

  function clearFieldError(inputElement, errorElement) {
    if (inputElement) {
      inputElement.removeAttribute('aria-invalid');
    }
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('visible');
    }
  }

  // Clear errors on user keystroke
  [fullnameInput, emailInput, phoneInput].forEach(field => {
    if (!field) return;
    field.addEventListener('input', () => {
      const errEl = document.getElementById(`${field.id}-error`);
      clearFieldError(field, errEl);
    });
  });

  if (termsCheckbox) {
    termsCheckbox.addEventListener('change', () => {
      if (termsCheckbox.checked) {
        clearFieldError(termsCheckbox, termsError);
      }
    });
  }

  // =========================================================================
  // 5. Accessible Form Submission
  // =========================================================================
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstInvalidField = null;

      // Full Name Validation
      if (!fullnameInput.value.trim()) {
        showFieldError(fullnameInput, fullnameError, 'Please enter your full name.');
        if (!firstInvalidField) firstInvalidField = fullnameInput;
      } else {
        clearFieldError(fullnameInput, fullnameError);
      }

      // Email Validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.value.trim()) {
        showFieldError(emailInput, emailError, 'Please enter your email address.');
        if (!firstInvalidField) firstInvalidField = emailInput;
      } else if (!emailPattern.test(emailInput.value.trim())) {
        showFieldError(emailInput, emailError, 'Please enter a valid email address (e.g., name@example.com).');
        if (!firstInvalidField) firstInvalidField = emailInput;
      } else {
        clearFieldError(emailInput, emailError);
      }

      // Password Validation
      const pwd = passwordInput.value;
      const isPasswordValid = evaluatePassword(pwd);
      if (!pwd) {
        showFieldError(passwordInput, passwordError, 'Please create a password.');
        showPasswordRules();
        if (!firstInvalidField) firstInvalidField = passwordInput;
      } else if (!isPasswordValid) {
        showFieldError(passwordInput, passwordError, 'Please fulfill all password requirements below.');
        showPasswordRules();
        if (!firstInvalidField) firstInvalidField = passwordInput;
      } else {
        clearFieldError(passwordInput, passwordError);
      }

      // Terms Agreement Check (Unchecked by default)
      if (termsCheckbox && !termsCheckbox.checked) {
        showFieldError(termsCheckbox, termsError, 'Please accept the Terms of Service and Privacy Policy to continue.');
        if (!firstInvalidField) firstInvalidField = termsCheckbox;
      } else if (termsError) {
        clearFieldError(termsCheckbox, termsError);
      }

      // If any field is invalid, move focus to the first invalid field
      if (firstInvalidField) {
        firstInvalidField.focus();
        return;
      }

      // Submit State: Loading Spinner & Disable Button
      submitBtn.disabled = true;
      const originalSubmitHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite;" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Creating Account...</span>
      `;

      // Simulated Registration API Call (Preserves existing client-side behavior)
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalSubmitHTML;

        // Feedback Banner
        if (feedbackBanner) {
          const firstName = fullnameInput.value.trim().split(' ')[0] || 'there';
          feedbackBanner.className = 'form-feedback-banner success';
          feedbackBanner.style.display = 'block';
          feedbackBanner.textContent = `Welcome to MonsoonRoute, ${firstName}! Your account has been created.`;
          feedbackBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Reset form
        signupForm.reset();
        evaluatePassword('');
        hidePasswordRulesIfEmpty();
        if (countryDisplay) countryDisplay.textContent = '+91';
      }, 1200);
    });
  }

  // =========================================================================
  // 6. Social Sign-Up Feedback Mock
  // =========================================================================
  [googleBtn, appleBtn].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      const provider = btn.id.includes('google') ? 'Google' : 'Apple';
      if (feedbackBanner) {
        feedbackBanner.className = 'form-feedback-banner success';
        feedbackBanner.style.display = 'block';
        feedbackBanner.textContent = `Connecting to ${provider} authentication...`;
        setTimeout(() => {
          feedbackBanner.style.display = 'none';
        }, 3000);
      }
    });
  });
});
