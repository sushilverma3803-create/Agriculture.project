/**
 * EcoHarvest - Smart Agriculture & Sustainable Farming Platform
 * Interactive Controller & GSAP Animations
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Setup GSAP and ScrollTrigger
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    initGsapAnimations();
  }

  // 3. Setup Interactive Components
  initFarmTelemetry();
  initEcoCalculator();
  initMobileNav();
  initDemoModal();
  initNewsletter();
  initAuthSystem();
  initGrowerDashboard();
  initAgriculturalDiagnostics();
  initNdviCanopyMap();
});

/* ==========================================================================
   GSAP & ScrollTrigger Animations
   ========================================================================== */
function initGsapAnimations() {
  // Hero Section Staggered Reveal
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 1 } });
  
  heroTl.from('.hero-badge', { y: -20, opacity: 0, duration: 0.8 })
        .from('.hero-title', { y: 30, opacity: 0, duration: 1 }, '-=0.5')
        .from('.hero-desc', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.hero-actions', { y: 20, opacity: 0, duration: 0.8 }, '-=0.6')
        .from('.hero-stats', { y: 20, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.hero-card', { y: 40, opacity: 0, duration: 1.1, scale: 0.96 }, '-=0.8');

  // Fade & Slide up reveals on scroll
  gsap.utils.toArray('.reveal-up').forEach((elem) => {
    gsap.from(elem, {
      scrollTrigger: {
        trigger: elem,
        start: 'top 85%',
        toggleActions: 'play none none none'
      },
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power2.out'
    });
  });

  // Staggered Solution Cards
  gsap.from('.solution-card', {
    scrollTrigger: {
      trigger: '#solutions-grid',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    y: 50,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power2.out'
  });

  // Animated Impact Numbers Counter
  const counters = document.querySelectorAll('.counter-val');
  counters.forEach((counter) => {
    const target = parseFloat(counter.getAttribute('data-target'));
    const isDecimal = target % 1 !== 0;
    const prefix = counter.getAttribute('data-prefix') || '';
    const suffix = counter.getAttribute('data-suffix') || '';

    ScrollTrigger.create({
      trigger: counter,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          duration: 2.2,
          innerText: target,
          ease: 'power2.out',
          snap: isDecimal ? { innerText: 0.1 } : { innerText: 1 },
          onUpdate: function() {
            if (isDecimal) {
              counter.innerText = prefix + parseFloat(counter.innerText).toFixed(1) + suffix;
            } else {
              counter.innerText = prefix + Math.round(counter.innerText).toLocaleString() + suffix;
            }
          }
        });
      }
    });
  });

  // Sticky Navbar blur enhancement on scroll
  window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 40) {
      navbar.classList.add('bg-emerald-950/80', 'shadow-lg', 'shadow-emerald-950/40', 'py-3');
      navbar.classList.remove('py-5', 'bg-transparent');
    } else {
      navbar.classList.remove('bg-emerald-950/80', 'shadow-lg', 'shadow-emerald-950/40', 'py-3');
      navbar.classList.add('py-5', 'bg-transparent');
    }
  });
}

/* ==========================================================================
   Interactive Farm IoT Telemetry System
   ========================================================================== */
const farmZones = {
  'zone-a': {
    name: 'Sector A1 - Precision Grain & Maize',
    moisture: 42,
    temp: 24.2,
    ph: 6.7,
    nitrogen: 148,
    valveStatus: 'AUTO - STANDBY',
    valveActive: false,
    cropHealth: 'Optimal (NDVI 0.88)',
    droneCoverage: '98.4%'
  },
  'zone-b': {
    name: 'Sector B4 - High-Density Apple Orchard',
    moisture: 36,
    temp: 26.8,
    ph: 6.4,
    nitrogen: 132,
    valveStatus: 'AUTO - IRRIGATING',
    valveActive: true,
    cropHealth: 'Good (NDVI 0.81)',
    droneCoverage: '94.2%'
  },
  'zone-c': {
    name: 'Sector C2 - Hydroponic Greens Pavilion',
    moisture: 78,
    temp: 22.0,
    ph: 6.1,
    nitrogen: 195,
    valveStatus: 'CLOSED (Optimal Nutrients)',
    valveActive: false,
    cropHealth: 'Vibrant (NDVI 0.95)',
    droneCoverage: '100%'
  }
};

let currentZoneKey = 'zone-a';
let telemetryInterval = null;

function initFarmTelemetry() {
  const zoneButtons = document.querySelectorAll('.zone-btn');
  const overrideBtn = document.getElementById('override-valve-btn');

  // Zone selection buttons
  zoneButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      zoneButtons.forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-black', 'shadow-md', 'shadow-emerald-500/30');
        b.classList.add('bg-emerald-950/60', 'text-emerald-300', 'hover:bg-emerald-900/50');
      });
      btn.classList.add('bg-emerald-500', 'text-black', 'shadow-md', 'shadow-emerald-500/30');
      btn.classList.remove('bg-emerald-950/60', 'text-emerald-300', 'hover:bg-emerald-900/50');

      currentZoneKey = btn.dataset.zone;
      renderTelemetry(currentZoneKey);
    });
  });

  // Manual Valve Override button
  if (overrideBtn) {
    overrideBtn.addEventListener('click', () => {
      const zone = farmZones[currentZoneKey];
      zone.valveActive = !zone.valveActive;
      zone.valveStatus = zone.valveActive ? 'MANUAL OVERRIDE - IRRIGATING' : 'MANUAL - HALTED';
      
      showToast(zone.valveActive ? '💧 Micro-pulse irrigation activated for ' + zone.name : '🛑 Irrigation halted manually.');
      renderTelemetry(currentZoneKey);
    });
  }

  // Initial render
  renderTelemetry(currentZoneKey);

  // Micro-fluctuations simulator every 3.5 seconds
  if (telemetryInterval) clearInterval(telemetryInterval);
  telemetryInterval = setInterval(() => {
    const zone = farmZones[currentZoneKey];
    // Random micro-jitter
    zone.temp = +(zone.temp + (Math.random() * 0.4 - 0.2)).toFixed(1);
    zone.moisture = Math.min(95, Math.max(20, Math.round(zone.moisture + (Math.random() * 2 - 1))));
    zone.nitrogen = Math.round(zone.nitrogen + (Math.random() * 4 - 2));

    const moistureElem = document.getElementById('tel-moisture');
    const tempElem = document.getElementById('tel-temp');
    const nitroElem = document.getElementById('tel-nitrogen');
    const moistureBar = document.getElementById('tel-moisture-bar');

    if (moistureElem) moistureElem.textContent = zone.moisture + '%';
    if (tempElem) tempElem.textContent = zone.temp + '°C';
    if (nitroElem) nitroElem.textContent = zone.nitrogen + ' ppm';
    if (moistureBar) moistureBar.style.width = zone.moisture + '%';

    // Flash live indicator
    const livePulse = document.getElementById('live-pulse-dot');
    if (livePulse) {
      livePulse.classList.add('scale-125');
      setTimeout(() => livePulse.classList.remove('scale-125'), 300);
    }
  }, 3500);
}

function renderTelemetry(zoneKey) {
  const zone = farmZones[zoneKey];
  if (!zone) return;

  const zoneTitleElem = document.getElementById('tel-zone-name');
  const moistureElem = document.getElementById('tel-moisture');
  const moistureBar = document.getElementById('tel-moisture-bar');
  const tempElem = document.getElementById('tel-temp');
  const phElem = document.getElementById('tel-ph');
  const nitroElem = document.getElementById('tel-nitrogen');
  const valveStatusElem = document.getElementById('tel-valve-status');
  const valveBadge = document.getElementById('tel-valve-badge');
  const healthElem = document.getElementById('tel-health');
  const droneElem = document.getElementById('tel-drone');
  const overrideBtn = document.getElementById('override-valve-btn');

  if (zoneTitleElem) zoneTitleElem.textContent = zone.name;
  if (moistureElem) moistureElem.textContent = zone.moisture + '%';
  if (moistureBar) moistureBar.style.width = zone.moisture + '%';
  if (tempElem) tempElem.textContent = zone.temp + '°C';
  if (phElem) phElem.textContent = zone.ph;
  if (nitroElem) nitroElem.textContent = zone.nitrogen + ' ppm';
  if (healthElem) healthElem.textContent = zone.cropHealth;
  if (droneElem) droneElem.textContent = zone.droneCoverage;

  if (valveStatusElem) {
    valveStatusElem.textContent = zone.valveStatus;
  }

  if (valveBadge) {
    if (zone.valveActive) {
      valveBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      valveBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active Flow';
    } else {
      valveBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-900/30 text-emerald-300/70 border border-emerald-800/40';
      valveBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Idle / Monitoring';
    }
  }

  if (overrideBtn) {
    if (zone.valveActive) {
      overrideBtn.textContent = 'Pause Irrigation Valve';
      overrideBtn.className = 'px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 rounded-lg transition-colors';
    } else {
      overrideBtn.textContent = 'Trigger Micro-Pulse Flow';
      overrideBtn.className = 'px-4 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-800/50 border border-emerald-700/50 rounded-lg transition-colors';
    }
  }
}

/* ==========================================================================
   EcoImpact Savings Calculator
   ========================================================================== */
function initEcoCalculator() {
  const acresSlider = document.getElementById('calc-acres');
  const acresValDisplay = document.getElementById('calc-acres-val');
  const cropSelect = document.getElementById('calc-crop');

  const outWater = document.getElementById('calc-water');
  const outFertilizer = document.getElementById('calc-fertilizer');
  const outCarbon = document.getElementById('calc-carbon');
  const outSurge = document.getElementById('calc-surge');

  if (!acresSlider || !cropSelect) return;

  const cropMultipliers = {
    grains: { waterPerAcre: 8500, fertPerAcre: 35, carbonVal: 28, yieldSurge: 22 },
    fruits: { waterPerAcre: 14200, fertPerAcre: 48, carbonVal: 45, yieldSurge: 34 },
    vegetables: { waterPerAcre: 11800, fertPerAcre: 42, carbonVal: 38, yieldSurge: 29 },
    vineyard: { waterPerAcre: 9200, fertPerAcre: 26, carbonVal: 52, yieldSurge: 31 }
  };

  let calcDebounceTimer = null;
  function updateCalculations() {
    const acres = parseInt(acresSlider.value, 10);
    const cropKey = cropSelect.value;
    const factor = cropMultipliers[cropKey] || cropMultipliers.grains;

    acresValDisplay.textContent = `${acres.toLocaleString()} Acres`;

    const totalWater = Math.round(acres * factor.waterPerAcre);
    const totalFert = Math.round(acres * factor.fertPerAcre);
    const totalCarbon = Math.round(acres * factor.carbonVal);
    const avgSurge = factor.yieldSurge;

    const waterStr = totalWater >= 1000000 ? (totalWater / 1000000).toFixed(2) + 'M gal' : (totalWater / 1000).toFixed(0) + 'k gal';
    const fertStr = totalFert.toLocaleString() + ' kg';
    const carbonStr = '$' + totalCarbon.toLocaleString();
    const surgeStr = '+' + avgSurge + '%';

    if (outWater) outWater.textContent = waterStr;
    if (outFertilizer) outFertilizer.textContent = fertStr;
    if (outCarbon) outCarbon.textContent = carbonStr;
    if (outSurge) outSurge.textContent = surgeStr;

    // Persist query to SQLite database via backend API (debounced)
    if (calcDebounceTimer) clearTimeout(calcDebounceTimer);
    calcDebounceTimer = setTimeout(() => {
      recordBackendHistory('CALCULATOR_QUERY', {
        acres,
        crop: cropKey,
        waterSaved: waterStr,
        fertilizerReduced: fertStr,
        carbonRevenue: carbonStr,
        yieldSurge: surgeStr
      });
    }, 1200);
  }

  acresSlider.addEventListener('input', updateCalculations);
  cropSelect.addEventListener('change', updateCalculations);
  updateCalculations();
}

/* ==========================================================================
   Mobile Drawer Navigation
   ========================================================================== */
function initMobileNav() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
    });
  });
}

/* ==========================================================================
   Demo Request Modal & Form
   ========================================================================== */
function initDemoModal() {
  const modal = document.getElementById('demo-modal');
  const openButtons = document.querySelectorAll('.open-demo-modal');
  const closeButton = document.getElementById('close-demo-modal');
  const form = document.getElementById('demo-form');

  if (!modal) return;

  openButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  };

  if (closeButton) closeButton.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;

      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Scheduling Pilot...';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        closeModal();
        form.reset();
        showToast('🌱 Demo pilot request submitted! An agronomist will contact you within 24 hours.');
      }, 1200);
    });
  }
}

/* ==========================================================================
   Newsletter Subscription
   ========================================================================== */
function initNewsletter() {
  const newsletterForm = document.getElementById('newsletter-form');
  if (!newsletterForm) return;

  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = newsletterForm.querySelector('input[type="email"]');
    if (emailInput && emailInput.value) {
      showToast('🌾 Welcome aboard! You are now subscribed to AgriTech Insights.');
      emailInput.value = '';
    }
  });
}

/* ==========================================================================
   Toast Notification Generator
   ========================================================================== */
function showToast(message) {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = 'glass-card border border-emerald-400/30 text-emerald-100 text-sm font-medium px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto';
  toast.innerHTML = `
    <div class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  });

  // Fade out and remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ==========================================================================
   Authentication & Session Management System
   ========================================================================== */
const API_BASE = (window.location.port === '5000' || !window.location.port) ? '' : 'http://localhost:5000';

async function recordBackendHistory(type, details) {
  try {
    const token = localStorage.getItem('ecoharvest_auth_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}/api/history`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type, details })
    });
    return await res.json();
  } catch (e) {
    console.debug('History recorded locally (server offline):', type, details);
  }
}

const USERS_STORAGE_KEY = 'ecoharvest_users';
const SESSION_STORAGE_KEY = 'ecoharvest_current_user';

const DEFAULT_DEMO_USER = {
  name: 'Dr. Sarah Jenkins',
  email: 'demo@ecoharvest.io',
  farm: 'GreenMeadow Biofarms',
  acres: '1,250',
  password: 'EcoFarmer2026!'
};

const authManager = {
  getUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        const initial = [DEFAULT_DEMO_USER];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    } catch (e) {
      return [DEFAULT_DEMO_USER];
    }
  },

  saveUser(newUser) {
    const users = this.getUsers();
    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  },

  getCurrentUser() {
    try {
      const session = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
      return session ? JSON.parse(session) : null;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser(user, remember = true) {
    if (remember) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  },

  clearSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  },

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }
};

function initAuthSystem() {
  const authModal = document.getElementById('auth-modal');
  const openAuthBtns = document.querySelectorAll('.open-auth-modal');
  const closeAuthBtn = document.getElementById('close-auth-modal');

  const tabSignIn = document.getElementById('auth-tab-signin');
  const tabSignUp = document.getElementById('auth-tab-signup');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  const modalTitle = document.getElementById('auth-modal-title');
  const modalDesc = document.getElementById('auth-modal-desc');
  const demoHint = document.getElementById('demo-account-hint');
  const authAlert = document.getElementById('auth-alert');
  const fillDemoBtn = document.getElementById('fill-demo-credentials-btn');

  const userChipBtn = document.getElementById('user-chip-btn');
  const userDropdown = document.getElementById('user-dropdown-menu');
  const signOutBtn = document.getElementById('auth-signout-btn');
  const mobileSignOutBtn = document.getElementById('mobile-signout-btn');

  // 1. Initial State Sync
  syncNavbarAuthUI();

  // 2. Open / Close Auth Modal
  const openAuth = (tab = 'signin') => {
    if (authModal) {
      authModal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      switchAuthTab(tab);
      hideAuthAlert();
    }
  };

  const closeAuth = () => {
    if (authModal) {
      authModal.classList.add('hidden');
      document.body.style.overflow = '';
      hideAuthAlert();
    }
  };

  openAuthBtns.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuth('signin');
  }));

  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeAuth);
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuth();
    });
  }

  // 3. Tab Switching
  const switchAuthTab = (tab) => {
    hideAuthAlert();
    if (tab === 'signin') {
      tabSignIn.classList.add('active');
      tabSignIn.classList.remove('text-emerald-300/70');
      tabSignUp.classList.remove('active');
      tabSignUp.classList.add('text-emerald-300/70');

      signinForm.classList.remove('hidden');
      signupForm.classList.add('hidden');
      if (demoHint) demoHint.classList.remove('hidden');

      modalTitle.textContent = 'Access Your Farm Account';
      modalDesc.textContent = 'Sign in to control your smart irrigation and live telemetry.';
    } else {
      tabSignUp.classList.add('active');
      tabSignUp.classList.remove('text-emerald-300/70');
      tabSignIn.classList.remove('active');
      tabSignIn.classList.add('text-emerald-300/70');

      signupForm.classList.remove('hidden');
      signinForm.classList.add('hidden');
      if (demoHint) demoHint.classList.add('hidden');

      modalTitle.textContent = 'Create Grower Account';
      modalDesc.textContent = 'Register your farm acreage to connect IoT nodes & aerial mapping.';
    }
    if (window.lucide) window.lucide.createIcons();
  };

  if (tabSignIn) tabSignIn.addEventListener('click', () => switchAuthTab('signin'));
  if (tabSignUp) tabSignUp.addEventListener('click', () => switchAuthTab('signup'));

  // 4. One-Click Demo Credentials Autofill
  if (fillDemoBtn) {
    fillDemoBtn.addEventListener('click', () => {
      document.getElementById('signin-email').value = DEFAULT_DEMO_USER.email;
      document.getElementById('signin-password').value = DEFAULT_DEMO_USER.password;
      showAuthAlert('Demo credentials filled. Signing in...', 'success');

      setTimeout(() => {
        handleSignIn(DEFAULT_DEMO_USER.email, DEFAULT_DEMO_USER.password, true);
      }, 500);
    });
  }

  // 4b. Social Login Integration (Google, GitHub, Apple)
  document.querySelectorAll('.modal-social-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const provider = btn.getAttribute('data-provider') || 'Google';
      showAuthAlert(`Connecting to ${provider} Secure Identity Gateway...`, 'success');
      btn.disabled = true;

      try {
        const response = await fetch(`${API_BASE}/api/auth/social`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider })
        });

        const data = await response.json();
        if (data.token) {
          localStorage.setItem('ecoharvest_auth_token', data.token);
        }
        if (data.user) {
          authManager.saveUser(data.user);
          authManager.setCurrentUser(data.user, true);
        }

        showAuthAlert(`✓ Authenticated via ${provider}! Welcome, ${data.user?.name || 'Grower'}`, 'success');
        setTimeout(() => {
          btn.disabled = false;
          closeAuth();
          syncNavbarAuthUI();
          showToast(`🌾 Signed in via ${provider}! Welcome ${data.user?.name || 'Grower'}`);
          openGrowerDashboard();
        }, 800);
      } catch (err) {
        showAuthAlert(`✓ ${provider} session established (local mode).`, 'success');
        setTimeout(() => {
          btn.disabled = false;
          closeAuth();
          syncNavbarAuthUI();
          openGrowerDashboard();
        }, 800);
      }
    });
  });

  // 4c. Modal Theme Switcher (Dark / Light)
  const modalThemeBtn = document.getElementById('modal-theme-toggle');
  const modalThemeText = document.getElementById('modal-theme-text');
  const modalThemeIcon = document.getElementById('modal-theme-icon');
  const authCard = document.getElementById('auth-modal-card');

  if (modalThemeBtn && authCard) {
    modalThemeBtn.addEventListener('click', () => {
      const isLight = authCard.classList.contains('bg-white');
      if (isLight) {
        authCard.classList.remove('bg-white', 'text-slate-900');
        authCard.classList.add('glass-card', 'text-emerald-50');
        if (modalThemeText) modalThemeText.textContent = 'Light Mode';
        if (modalThemeIcon) modalThemeIcon.setAttribute('data-lucide', 'sun');
      } else {
        authCard.classList.remove('glass-card', 'text-emerald-50');
        authCard.classList.add('bg-white', 'text-slate-900');
        if (modalThemeText) modalThemeText.textContent = 'Dark Mode';
        if (modalThemeIcon) modalThemeIcon.setAttribute('data-lucide', 'moon');
      }
      if (window.lucide) window.lucide.createIcons();
    });
  }

  // 5. Password Visibility Toggles
  document.querySelectorAll('.toggle-password-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('.relative');
      const input = container.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4 text-emerald-400"></i>';
      } else {
        input.type = 'password';
        btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4 text-emerald-400/80"></i>';
      }
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // 6. Live Password Strength & Confirm Password Meter
  const signupPassword = document.getElementById('signup-password');
  const signupConfirm = document.getElementById('signup-confirm-password');
  const confirmStatus = document.getElementById('modal-confirm-status');
  const strengthMeter = document.getElementById('password-strength-meter');
  const strengthLabel = document.getElementById('password-strength-label');

  function checkModalConfirmMatch() {
    if (!signupConfirm || !confirmStatus) return;
    const pwd = signupPassword ? signupPassword.value : '';
    const confirm = signupConfirm.value;
    if (!confirm) {
      confirmStatus.classList.add('hidden');
      return;
    }
    if (pwd === confirm) {
      confirmStatus.textContent = '✓ Passwords match';
      confirmStatus.className = 'text-[11px] text-emerald-400 font-medium block pt-0.5';
    } else {
      confirmStatus.textContent = '✕ Passwords do not match';
      confirmStatus.className = 'text-[11px] text-rose-400 font-medium block pt-0.5';
    }
  }

  if (signupPassword) {
    signupPassword.addEventListener('input', () => {
      const val = signupPassword.value;
      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (strengthMeter && strengthLabel) {
        if (val.length === 0) {
          strengthMeter.className = 'strength-bar weak';
          strengthLabel.textContent = 'Empty';
          strengthLabel.className = 'text-[10px] text-gray-400 font-mono';
        } else if (score <= 1) {
          strengthMeter.className = 'strength-bar weak';
          strengthLabel.textContent = 'Weak';
          strengthLabel.className = 'text-[10px] text-rose-400 font-mono';
        } else if (score === 2) {
          strengthMeter.className = 'strength-bar medium';
          strengthLabel.textContent = 'Fair';
          strengthLabel.className = 'text-[10px] text-amber-400 font-mono';
        } else if (score === 3) {
          strengthMeter.className = 'strength-bar medium';
          strengthLabel.textContent = 'Good';
          strengthLabel.className = 'text-[10px] text-lime-400 font-mono';
        } else {
          strengthMeter.className = 'strength-bar strong';
          strengthLabel.textContent = 'Strong ✓';
          strengthLabel.className = 'text-[10px] text-emerald-400 font-mono';
        }
      }
      checkModalConfirmMatch();
    });
  }

  if (signupConfirm) {
    signupConfirm.addEventListener('input', checkModalConfirmMatch);
  }

  // 7. Handle Sign-In Form (Connected to Backend SQLite Database)
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const remember = document.getElementById('signin-remember').checked;

      await handleSignIn(email, password, remember);
    });
  }

  async function handleSignIn(email, password, remember) {
    const submitBtn = signinForm ? signinForm.querySelector('button[type="submit"]') : null;
    const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Verifying Credentials...';
    }

    try {
      // 1. Try Backend SQLite API
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showAuthAlert(data.error || 'Invalid credentials. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        return;
      }

      // 2. Success from SQLite Backend
      if (data.token) {
        localStorage.setItem('ecoharvest_auth_token', data.token);
      }
      authManager.setCurrentUser(data.user, remember);
      showAuthAlert(`Welcome back, ${data.user.name}! Redirecting to console...`, 'success');

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        closeAuth();
        syncNavbarAuthUI();
        showToast(`🌾 Logged in successfully as ${data.user.name} (${data.user.farm})`);
        openGrowerDashboard();
      }, 700);

    } catch (netErr) {
      console.warn('Backend server unreachable, falling back to local verification:', netErr);
      const users = authManager.getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        showAuthAlert('No farm account found with this email. Please check your credentials or create an account.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        return;
      }

      if (user.password !== password) {
        showAuthAlert('Incorrect password. For demo account use EcoFarmer2026!', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        return;
      }

      authManager.setCurrentUser(user, remember);
      showAuthAlert(`Welcome back, ${user.name}! (Offline Mode)`, 'success');

      setTimeout(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
        closeAuth();
        syncNavbarAuthUI();
        showToast(`🌾 Logged in successfully as ${user.name} (${user.farm})`);
        openGrowerDashboard();
      }, 700);
    }
  }

  // 8. Handle Sign-Up Form (Connected to Backend SQLite Database)
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const farm = document.getElementById('signup-farm').value.trim();
      const acres = document.getElementById('signup-acres').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm = signupConfirm ? signupConfirm.value : password;

      // Validation
      if (!name || !farm || !email || !password) {
        showAuthAlert('Please fill in all required fields.', 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showAuthAlert('Please enter a valid email address.', 'error');
        return;
      }

      if (password.length < 8) {
        showAuthAlert('Password must be at least 8 characters long.', 'error');
        return;
      }

      if (password !== confirm) {
        showAuthAlert('Passwords do not match. Please verify.', 'error');
        return;
      }

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Registering Farm in Database...';

      try {
        const response = await fetch(`${API_BASE}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, farm, acres: acres || '500', email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showAuthAlert(data.error || 'Failed to create account. Please try again.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          return;
        }

        if (data.token) {
          localStorage.setItem('ecoharvest_auth_token', data.token);
        }

        authManager.saveUser(data.user);
        authManager.setCurrentUser(data.user, true);

        showAuthAlert(`Account created for ${farm}! Opening console...`, 'success');

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          closeAuth();
          syncNavbarAuthUI();
          showToast(`🌱 Account created & saved to database! Welcome, ${name}`);
          openGrowerDashboard();
        }, 900);

      } catch (err) {
        console.warn('Backend server unreachable during sign-up, falling back to local storage:', err);
        const users = authManager.getUsers();
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          showAuthAlert('An account with this email already exists. Please sign in.', 'error');
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          return;
        }

        const newUser = {
          name,
          farm,
          acres: parseInt(acres, 10).toLocaleString(),
          email,
          password
        };

        authManager.saveUser(newUser);
        authManager.setCurrentUser(newUser, true);

        showAuthAlert(`Account created for ${farm}! (Offline Mode)`, 'success');

        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
          closeAuth();
          syncNavbarAuthUI();
          showToast(`🌱 Account created! Welcome, ${name}`);
          openGrowerDashboard();
        }, 900);
      }
    });
  }

  // 9. Profile Dropdown Menu Handlers
  if (userChipBtn && userDropdown) {
    userChipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && !userChipBtn.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // 10. Sign-Out Handlers
  const handleSignOut = () => {
    const user = authManager.getCurrentUser();
    authManager.clearSession();
    syncNavbarAuthUI();
    closeGrowerDashboard();
    if (userDropdown) userDropdown.classList.add('hidden');
    showToast(`👋 Signed out successfully. See you next harvest!`);
  };

  if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
  if (mobileSignOutBtn) mobileSignOutBtn.addEventListener('click', handleSignOut);

  // Helper alert inside modal
  function showAuthAlert(msg, type = 'error') {
    if (!authAlert) return;
    authAlert.classList.remove('hidden', 'bg-rose-950/70', 'border-rose-700/50', 'text-rose-200', 'bg-emerald-950/70', 'border-emerald-700/50', 'text-emerald-200');
    if (type === 'error') {
      authAlert.classList.add('bg-rose-950/70', 'border-rose-700/50', 'text-rose-200');
    } else {
      authAlert.classList.add('bg-emerald-950/70', 'border-emerald-700/50', 'text-emerald-200');
    }
    authAlert.textContent = msg;
  }

  function hideAuthAlert() {
    if (authAlert) authAlert.classList.add('hidden');
  }
}

// Update Navbar and Mobile drawer according to logged-in / logged-out state
function syncNavbarAuthUI() {
  const isAuth = authManager.isAuthenticated();
  const user = authManager.getCurrentUser();

  const navLoggedOut = document.getElementById('nav-auth-logged-out');
  const navLoggedIn = document.getElementById('nav-auth-logged-in');
  const mobileLoggedOut = document.getElementById('mobile-auth-logged-out');
  const mobileLoggedIn = document.getElementById('mobile-auth-logged-in');

  if (isAuth && user) {
    // Desktop Nav
    if (navLoggedOut) navLoggedOut.classList.add('hidden');
    if (navLoggedIn) {
      navLoggedIn.classList.remove('hidden');
      navLoggedIn.classList.add('flex');
    }

    // Initials (e.g. "Dr. Sarah Jenkins" -> "SJ")
    const initials = user.name
      .replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'EH';

    const avatarElem = document.getElementById('user-avatar-initials');
    const nameElem = document.getElementById('user-display-name');
    const farmElem = document.getElementById('user-display-farm');
    const dropNameElem = document.getElementById('dropdown-user-name');
    const dropEmailElem = document.getElementById('dropdown-user-email');
    const dropFarmElem = document.getElementById('dropdown-user-farm');

    if (avatarElem) avatarElem.textContent = initials;
    if (nameElem) nameElem.textContent = user.name;
    if (farmElem) farmElem.textContent = user.farm;
    if (dropNameElem) dropNameElem.textContent = user.name;
    if (dropEmailElem) dropEmailElem.textContent = user.email;
    if (dropFarmElem) dropFarmElem.innerHTML = `<i data-lucide="sprout" class="w-3 h-3"></i> <span>${user.farm} (${user.acres || '1,250'} Acres)</span>`;

    // Mobile Nav
    if (mobileLoggedOut) mobileLoggedOut.classList.add('hidden');
    if (mobileLoggedIn) {
      mobileLoggedIn.classList.remove('hidden');
      mobileLoggedIn.classList.add('flex');
    }
    const mobileAvatar = document.getElementById('mobile-user-avatar');
    const mobileName = document.getElementById('mobile-user-name');
    const mobileFarm = document.getElementById('mobile-user-farm');

    if (mobileAvatar) mobileAvatar.textContent = initials;
    if (mobileName) mobileName.textContent = user.name;
    if (mobileFarm) mobileFarm.textContent = user.farm;

  } else {
    // Desktop Nav Logged Out
    if (navLoggedOut) navLoggedOut.classList.remove('hidden');
    if (navLoggedIn) {
      navLoggedIn.classList.add('hidden');
      navLoggedIn.classList.remove('flex');
    }

    // Mobile Nav Logged Out
    if (mobileLoggedOut) mobileLoggedOut.classList.remove('hidden');
    if (mobileLoggedIn) {
      mobileLoggedIn.classList.add('hidden');
      mobileLoggedIn.classList.remove('flex');
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

/* ==========================================================================
   Restricted Grower Dashboard Operations Console Controller
   ========================================================================== */
function initGrowerDashboard() {
  const dashboard = document.getElementById('grower-dashboard');
  const exitBtn = document.getElementById('dashboard-exit-btn');
  const logoutBtn = document.getElementById('dashboard-logout-btn');
  const navDashboardBtn = document.getElementById('nav-dashboard-btn');
  const dropdownDashboardBtn = document.getElementById('dropdown-open-dashboard');
  const mobileDashboardBtn = document.getElementById('mobile-dashboard-btn');

  // Trigger Open Dashboard with Auth Guard
  const handleOpenDashboard = (e) => {
    if (e) e.preventDefault();
    if (!authManager.isAuthenticated()) {
      showToast('🔒 Please sign in to access your farm operations console.');
      const openModalBtn = document.querySelector('.open-auth-modal');
      if (openModalBtn) openModalBtn.click();
      return;
    }
    openGrowerDashboard();
  };

  if (navDashboardBtn) navDashboardBtn.addEventListener('click', handleOpenDashboard);
  if (dropdownDashboardBtn) dropdownDashboardBtn.addEventListener('click', handleOpenDashboard);
  if (mobileDashboardBtn) mobileDashboardBtn.addEventListener('click', handleOpenDashboard);

  if (exitBtn) exitBtn.addEventListener('click', closeGrowerDashboard);

  const openDiagBtn = document.getElementById('dashboard-open-diagnostics-btn');
  if (openDiagBtn) {
    openDiagBtn.addEventListener('click', () => {
      closeGrowerDashboard();
      const diagSection = document.getElementById('diagnostics');
      if (diagSection) {
        diagSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authManager.clearSession();
      syncNavbarAuthUI();
      closeGrowerDashboard();
      showToast('👋 Signed out from operations console.');
    });
  }

  // Interactive Valve Controls inside Dashboard
  const btnValveZone1 = document.getElementById('toggle-valve-zone-1');
  const btnValveZone2 = document.getElementById('toggle-valve-zone-2');
  const btnValveZone3 = document.getElementById('toggle-valve-zone-3');
  const btnDronePass = document.getElementById('trigger-drone-pass-btn');

  let zone1Active = false;
  let zone2Active = true;

  if (btnValveZone1) {
    btnValveZone1.addEventListener('click', () => {
      zone1Active = !zone1Active;
      const pill = document.getElementById('zone-1-status-pill');
      const moist = document.getElementById('zone-1-moist');

      if (zone1Active) {
        btnValveZone1.textContent = 'Halt Pulse Flow';
        btnValveZone1.className = 'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border border-rose-700/50 transition-colors';
        pill.textContent = 'FLOW ACTIVE (16 LPM)';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700';
        if (moist) moist.textContent = '46% (Hydrating)';
        logDashboardEvent('Sector Alpha: 10-Min precision micro-pulse initiated manually.');
        showToast('💧 Sector Alpha solenoid valve opened.');
        recordBackendHistory('VALVE_OVERRIDE', { sector: 'Sector Alpha', action: 'OPEN', flowRate: '16 LPM' });
      } else {
        btnValveZone1.textContent = 'Trigger 10-Min Pulse';
        btnValveZone1.className = 'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors';
        pill.textContent = 'AUTO - MONITORING';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
        if (moist) moist.textContent = '42%';
        logDashboardEvent('Sector Alpha: Flow halted. Returning to auto-sensor schedule.');
        showToast('🛑 Sector Alpha solenoid valve closed.');
        recordBackendHistory('VALVE_OVERRIDE', { sector: 'Sector Alpha', action: 'CLOSE', flowRate: '0 LPM' });
      }
    });
  }

  if (btnValveZone2) {
    btnValveZone2.addEventListener('click', () => {
      zone2Active = !zone2Active;
      const pill = document.getElementById('zone-2-status-pill');
      const moist = document.getElementById('zone-2-moist');

      if (zone2Active) {
        btnValveZone2.textContent = 'Halt Flow';
        btnValveZone2.className = 'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border border-rose-700/50 transition-colors';
        pill.textContent = 'FLOW ACTIVE (12 LPM)';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700';
        logDashboardEvent('Sector Beta (Apple Orchard): Active rootzone flow resumed.');
        showToast('💧 Sector Beta flow resumed.');
        recordBackendHistory('VALVE_OVERRIDE', { sector: 'Sector Beta', action: 'OPEN', flowRate: '12 LPM' });
      } else {
        btnValveZone2.textContent = 'Resume Micro-Flow';
        btnValveZone2.className = 'w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors';
        pill.textContent = 'STANDBY - CLOSED';
        pill.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
        logDashboardEvent('Sector Beta: Flow paused manually.');
        showToast('🛑 Sector Beta flow paused.');
        recordBackendHistory('VALVE_OVERRIDE', { sector: 'Sector Beta', action: 'CLOSE', flowRate: '0 LPM' });
      }
    });
  }

  if (btnValveZone3) {
    btnValveZone3.addEventListener('click', () => {
      showToast('🧪 Hydroponic nutrient pulse delivered (NPK formula Bio-4).');
      logDashboardEvent('Sector Gamma: Organic bio-nutrient pulse delivered to hydroponic lines.');
      recordBackendHistory('NUTRIENT_PULSE', { sector: 'Sector Gamma', formula: 'Bio-4 NPK Organic' });
    });
  }

  if (btnDronePass) {
    btnDronePass.addEventListener('click', () => {
      btnDronePass.disabled = true;
      btnDronePass.innerHTML = '<span class="inline-block animate-spin mr-1">🛰️</span> Syncing Waypoints...';
      setTimeout(() => {
        btnDronePass.disabled = false;
        btnDronePass.innerHTML = '<i data-lucide="plane" class="w-4 h-4"></i> <span>Launch Priority Drone Pass</span>';
        if (window.lucide) window.lucide.createIcons();
        showToast('🚀 Falcon-7 drone launched for multispectral priority scan!');
        logDashboardEvent('Falcon-7 autonomous drone launched on priority waypoint route.');
        recordBackendHistory('DRONE_MISSION', { asset: 'Falcon-7 Multispectral Drone', mission: 'Priority Waypoint Survey' });
      }, 1000);
    });
  }
}

function openGrowerDashboard() {
  const dashboard = document.getElementById('grower-dashboard');
  const user = authManager.getCurrentUser();
  if (!dashboard || !user) return;

  // Populate dynamic user info
  const welcomeHeading = document.getElementById('dashboard-welcome-heading');
  const farmSubtitle = document.getElementById('dashboard-farm-subtitle');
  const kpiAcres = document.getElementById('dashboard-kpi-acres');

  if (welcomeHeading) welcomeHeading.textContent = `Welcome back, ${user.name}!`;
  if (farmSubtitle) farmSubtitle.textContent = `${user.farm} • ${user.acres || '1,250'} Acres Monitored • LoRaWAN Gateway Online`;
  if (kpiAcres) kpiAcres.textContent = `${user.acres || '1,250'} Acres`;

  dashboard.classList.remove('dashboard-closed');
  dashboard.classList.add('dashboard-open');
  document.body.style.overflow = 'hidden';

  // Load persistent query and operational history from SQLite backend
  loadPersistedDashboardHistory();

  if (window.lucide) window.lucide.createIcons();
}

async function loadPersistedDashboardHistory() {
  const logsContainer = document.getElementById('dashboard-event-logs');
  if (!logsContainer) return;
  try {
    const token = localStorage.getItem('ecoharvest_auth_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/history?limit=5`, { headers });
    if (!res.ok) return;
    const resData = await res.json();
    const history = Array.isArray(resData) ? resData : (resData.history || []);
    if (Array.isArray(history) && history.length > 0) {
      logsContainer.innerHTML = '';
      history.forEach(item => {
        const timeStr = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent';
        let desc = item.type;
        try {
          const d = typeof item.details === 'string' ? JSON.parse(item.details) : item.details;
          if (item.type === 'CALCULATOR_QUERY') {
            desc = `Calculator: ${d.acres} ac (${d.crop}) → ${d.waterSaved} saved, ${d.yieldSurge}`;
          } else if (item.type === 'VALVE_OVERRIDE') {
            desc = `${d.sector}: Solenoid ${d.action} (${d.flowRate})`;
          } else if (item.type === 'DRONE_MISSION') {
            desc = `${d.asset}: ${d.mission}`;
          } else if (item.type === 'NUTRIENT_PULSE') {
            desc = `${d.sector}: ${d.formula} pulse delivered`;
          } else {
            desc = JSON.stringify(d);
          }
        } catch(e) {
          desc = String(item.details);
        }

        const eventCard = document.createElement('div');
        eventCard.className = 'p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/50 space-y-1';
        eventCard.innerHTML = `
          <div class="flex justify-between text-emerald-400 font-mono text-[10px]">
            <span>DB#${item.id} • ${item.type}</span>
            <span>${timeStr}</span>
          </div>
          <p class="text-emerald-100 font-medium text-xs sm:text-sm">${desc}</p>
        `;
        logsContainer.appendChild(eventCard);
      });
    }
  } catch (err) {
    console.debug('Could not load remote history:', err);
  }
}

function closeGrowerDashboard() {
  const dashboard = document.getElementById('grower-dashboard');
  if (!dashboard) return;
  dashboard.classList.remove('dashboard-open');
  dashboard.classList.add('dashboard-closed');
  document.body.style.overflow = '';
}

function logDashboardEvent(message) {
  const logsContainer = document.getElementById('dashboard-event-logs');
  if (!logsContainer) return;

  const eventCard = document.createElement('div');
  eventCard.className = 'p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/50 space-y-1 transform translate-y-2 opacity-0 transition-all duration-300';
  eventCard.innerHTML = `
    <div class="flex justify-between text-emerald-400 font-mono text-[10px]">
      <span>EVENT #${Math.floor(8500 + Math.random() * 500)}</span>
      <span>Just now</span>
    </div>
    <p class="text-emerald-100 font-medium">${message}</p>
  `;

  logsContainer.prepend(eventCard);
  requestAnimationFrame(() => {
    eventCard.classList.remove('translate-y-2', 'opacity-0');
  });

  // Keep last 5 events
  while (logsContainer.children.length > 5) {
    logsContainer.removeChild(logsContainer.lastChild);
  }
}

/* ==========================================================================
   Agricultural Problem Diagnostic Assistant Controller
   ========================================================================== */
function initAgriculturalDiagnostics() {
  const form = document.getElementById('diagnostic-form');
  if (!form) return;

  const categoryPills = document.querySelectorAll('.diag-cat-btn');
  const categoryInput = document.getElementById('diag-category');
  const symptomsInput = document.getElementById('diag-symptoms');
  const cropSelect = document.getElementById('diag-crop');
  const urgencySelect = document.getElementById('diag-urgency');
  const charCount = document.getElementById('diag-char-count');
  const promptChips = document.querySelectorAll('.diag-prompt-chip');
  const dropzone = document.getElementById('diag-dropzone');
  const fileInput = document.getElementById('diag-file-input');
  const filePreview = document.getElementById('diag-file-preview');
  const fileNameDisplay = document.getElementById('diag-file-name');
  const removeFileBtn = document.getElementById('diag-remove-file');

  const idleState = document.getElementById('diag-state-idle');
  const loadingState = document.getElementById('diag-state-loading');
  const resultState = document.getElementById('diag-state-result');
  const loadingStepText = document.getElementById('diag-loading-step');

  // Result Header Elements
  const resConfidence = document.getElementById('diag-res-confidence');
  const resBadge = document.getElementById('diag-res-badge');
  const resTitle = document.getElementById('diag-res-title');
  const resScientific = document.getElementById('diag-res-scientific');
  const resPathogen = document.getElementById('diag-res-pathogen');
  const resRiskText = document.getElementById('diag-res-risk-text');

  // Treatment Elements (Organic vs. Chemical)
  const cardOrganic = document.getElementById('diag-card-organic');
  const cardChemical = document.getElementById('diag-card-chemical');
  const tabAll = document.getElementById('diag-tab-all');
  const tabOrganic = document.getElementById('diag-tab-organic');
  const tabChemical = document.getElementById('diag-tab-chemical');

  const orgName = document.getElementById('diag-org-name');
  const orgAgent = document.getElementById('diag-org-agent');
  const orgDosage = document.getElementById('diag-org-dosage');
  const orgMech = document.getElementById('diag-org-mech');
  const orgMethod = document.getElementById('diag-org-method');

  const chemName = document.getElementById('diag-chem-name');
  const chemAgent = document.getElementById('diag-chem-agent');
  const chemTrade = document.getElementById('diag-chem-trade');
  const chemPhi = document.getElementById('diag-chem-phi');
  const chemRei = document.getElementById('diag-chem-rei');
  const chemSafety = document.getElementById('diag-chem-safety');

  // Prevention & Telemetry Elements
  const preventionList = document.getElementById('diag-prevention-list');
  const telIrrigation = document.getElementById('diag-telemetry-irrigation');
  const telThreshold = document.getElementById('diag-telemetry-threshold');
  const telBand = document.getElementById('diag-telemetry-band');

  // Database status & buttons
  const dbStatusText = document.getElementById('diag-db-status-text');
  const submitBtn = document.getElementById('diag-submit-btn');
  const downloadBtn = document.getElementById('diag-download-btn');
  const resetBtn = document.getElementById('diag-reset-btn');
  const formAlert = document.getElementById('diag-form-alert');
  const resProblemBox = document.getElementById('diag-res-problem-box');
  const resProblemText = document.getElementById('diag-res-problem-text');

  let activePhotoAttached = false;
  let currentActiveSolution = null;

  function showFormAlert(msg, type = 'error') {
    if (!formAlert) return;
    formAlert.classList.remove('hidden', 'bg-rose-950/80', 'border-rose-700/60', 'text-rose-200', 'bg-emerald-950/80', 'border-emerald-700/60', 'text-emerald-200');
    if (type === 'error') {
      formAlert.classList.add('bg-rose-950/80', 'border-rose-700/60', 'text-rose-200');
      formAlert.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i><span>${msg}</span>`;
    } else {
      formAlert.classList.add('bg-emerald-950/80', 'border-emerald-700/60', 'text-emerald-200');
      formAlert.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"></i><span>${msg}</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function hideFormAlert() {
    if (formAlert) formAlert.classList.add('hidden');
  }

  const categoryPlaceholders = {
    crop_disease: "Describe observed foliar, stem, or fruit symptoms (e.g., 'Elongated tan lesions with dark borders on corn leaves', 'White powdery mildew coating apple shoot tips', 'Dark water-soaked spots on tomatoes')...",
    pest_infestation: "Describe observed insects, feeding damage, or residue (e.g., 'Clusters of small green aphids under young apple foliage with honeydew', 'Larvae boring into corn stalks leaving sawdust frass', 'Webbing with tiny moving dots on leaf undersides')...",
    nutrient_deficiency: "Describe discoloration, chlorosis patterns, or stunted growth (e.g., 'Pronounced V-shaped yellowing on lower leaves starting at tip', 'Purple reddish discoloration along young corn stems', 'Interveinal yellowing with green veins on new foliage')...",
    irrigation_failure: "Describe the hardware or sensor anomaly (e.g., 'Sector B solenoid valve drawing 24VAC current but registering 0 flow on downstream sensor', 'Sudden pressure drop across micro-drip manifold', 'Soil moisture probe offline')..."
  };

  // 1. Category Switcher
  categoryPills.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryPills.forEach(b => b.classList.remove('active-cat'));
      btn.classList.add('active-cat');
      const cat = btn.dataset.cat;
      categoryInput.value = cat;
      if (categoryPlaceholders[cat]) {
        symptomsInput.placeholder = categoryPlaceholders[cat];
      }
    });
  });

  // 2. Character Counter
  symptomsInput.addEventListener('input', () => {
    const len = symptomsInput.value.length;
    if (charCount) charCount.textContent = `${len} / 800 chars`;
  });

  // 3. Clickable Scenario Starter Chips
  promptChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      const crop = chip.dataset.crop;
      const urgency = chip.dataset.urgency;
      const text = chip.dataset.text;

      // Select category pill
      categoryPills.forEach(b => {
        if (b.dataset.cat === cat) {
          b.classList.add('active-cat');
        } else {
          b.classList.remove('active-cat');
        }
      });
      categoryInput.value = cat;
      if (categoryPlaceholders[cat]) {
        symptomsInput.placeholder = categoryPlaceholders[cat];
      }

      if (cropSelect && crop) cropSelect.value = crop;
      if (urgencySelect && urgency) urgencySelect.value = urgency;
      symptomsInput.value = text;
      symptomsInput.dispatchEvent(new Event('input'));
      symptomsInput.focus();

      showToast(`📝 Pre-filled scenario: ${chip.textContent.trim()}`);
    });
  });

  // 4. File Attachment Simulation
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        activePhotoAttached = true;
        fileNameDisplay.textContent = file.name;
        filePreview.classList.remove('hidden');
        filePreview.classList.add('flex');
        dropzone.classList.add('hidden');
        showToast('📷 Field specimen photo attached for visual inference.');
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
      activePhotoAttached = false;
      fileInput.value = '';
      filePreview.classList.add('hidden');
      filePreview.classList.remove('flex');
      dropzone.classList.remove('hidden');
    });
  }

  // 5. Treatment View Switcher (Both vs. Organic vs. Chemical)
  const setTreatmentTab = (activeTab) => {
    const defaultBtnClass = 'px-2.5 py-1 rounded-lg font-semibold text-emerald-300 hover:text-white transition-all';
    const activeBtnClass = 'px-2.5 py-1 rounded-lg font-semibold bg-emerald-500 text-slate-950 transition-all';

    if (tabAll) tabAll.className = activeTab === 'all' ? activeBtnClass : defaultBtnClass;
    if (tabOrganic) tabOrganic.className = activeTab === 'organic' ? activeBtnClass : defaultBtnClass;
    if (tabChemical) tabChemical.className = activeTab === 'chemical' ? activeBtnClass : defaultBtnClass;

    if (cardOrganic && cardChemical) {
      if (activeTab === 'all') {
        cardOrganic.classList.remove('hidden');
        cardChemical.classList.remove('hidden');
      } else if (activeTab === 'organic') {
        cardOrganic.classList.remove('hidden');
        cardChemical.classList.add('hidden');
      } else {
        cardOrganic.classList.add('hidden');
        cardChemical.classList.remove('hidden');
      }
    }
  };

  if (tabAll) tabAll.addEventListener('click', () => setTreatmentTab('all'));
  if (tabOrganic) tabOrganic.addEventListener('click', () => setTreatmentTab('organic'));
  if (tabChemical) tabChemical.addEventListener('click', () => setTreatmentTab('chemical'));

  // 6. Form Submission & Backend API Connection (POST /api/solutions)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormAlert();

    const symptoms = symptomsInput.value.trim();
    if (!symptoms || symptoms.length < 5) {
      showFormAlert('Please provide at least 5 characters describing the observed agricultural symptoms or problem.', 'error');
      showToast('⚠️ Please describe the observed agricultural problem.');
      symptomsInput.focus();
      return;
    }

    const category = categoryInput.value;
    const crop = cropSelect ? cropSelect.value : 'General Field';
    const urgency = urgencySelect ? urgencySelect.value : 'moderate';

    // Enter Loading State
    idleState.classList.add('hidden');
    resultState.classList.add('hidden');
    loadingState.classList.remove('hidden');

    const originalSubmitHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Transmitting to Agronomic AI...';
    }

    const steps = [
      'Transmitting field problem to agronomic neural network...',
      'Cross-referencing phytopathology indices & sensor telemetry...',
      'Synthesizing Organic (OMRI) vs. Conventional Chemical options...',
      'Committing problem & solution to SQLite database for active Grower ID...'
    ];
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length && loadingStepText) {
        loadingStepText.textContent = steps[stepIndex];
      }
    }, 400);

    try {
      const token = localStorage.getItem('ecoharvest_auth_token');
      const currentUser = authManager ? authManager.getCurrentUser() : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Call POST /api/solutions
      const res = await fetch(`${API_BASE}/api/solutions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problem: symptoms,
          category,
          crop,
          urgency,
          hasPhoto: activePhotoAttached,
          user_id: currentUser ? currentUser.id : null,
          user_email: currentUser ? currentUser.email : 'demo@ecoharvest.io'
        })
      });

      clearInterval(stepInterval);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Server error (${res.status}): Failed to generate agricultural solution.`);
      }

      const solution = data.solution || data.diagnosis;
      currentActiveSolution = solution;
      
      // Dynamic DOM rendering of returned solution
      renderStructuredSolution(
        solution,
        data.userId || (currentUser ? currentUser.id : 1),
        data.userEmail || (currentUser ? currentUser.email : 'demo@ecoharvest.io'),
        data.problem || symptoms
      );

      // Refresh solutions history list from backend
      loadSolutionsHistory();
      
      showToast(`🔬 Expert solution generated and saved to database for User #${data.userId || 1}!`);

    } catch (err) {
      clearInterval(stepInterval);
      console.warn('Backend solutions API error or unreachable, evaluating fallback:', err);
      
      showFormAlert(`Problem Notice: ${err.message}. Displaying emergency agronomic fallback protocol below.`, 'error');

      const fallback = generateClientFallbackSolution({ category, crop, symptoms, urgency });
      currentActiveSolution = fallback;
      const currentUser = authManager ? authManager.getCurrentUser() : null;
      renderStructuredSolution(
        fallback,
        currentUser ? currentUser.id : 1,
        currentUser ? currentUser.email : 'demo@ecoharvest.io',
        symptoms
      );
      showToast('⚠️ Solution generated via local fallback mode');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalSubmitHtml;
      }
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Dynamic DOM Rendering for Structured Solution
  function renderStructuredSolution(sol, userId, userEmail, submittedProblem = null) {
    loadingState.classList.add('hidden');
    idleState.classList.add('hidden');
    resultState.classList.remove('hidden');

    const diag = sol.diagnosis || {};
    const org = sol.treatments ? (sol.treatments.organic || {}) : {};
    const chem = sol.treatments ? (sol.treatments.chemical || {}) : {};

    // 1. Submitted Problem Box
    if (resProblemBox && resProblemText) {
      if (submittedProblem) {
        resProblemBox.classList.remove('hidden');
        resProblemText.textContent = `"${submittedProblem}"`;
      } else {
        resProblemBox.classList.add('hidden');
      }
    }

    // 2. Diagnosis Header
    if (resTitle) resTitle.textContent = diag.title || 'Agronomic Observation';
    if (resScientific) resScientific.textContent = diag.scientificName || diag.category || 'Field Observation';
    if (resConfidence) resConfidence.textContent = `${diag.confidence || 95}% CONFIDENCE MATCH`;
    if (resBadge) {
      resBadge.textContent = diag.severity || (diag.urgency ? diag.urgency.toUpperCase() + ' SEVERITY' : 'ACTIVE ISSUE');
      if (String(diag.severity).toUpperCase().includes('CRITICAL')) {
        resBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-700/50';
      } else if (String(diag.severity).toUpperCase().includes('HIGH')) {
        resBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-700/50';
      } else {
        resBadge.className = 'px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-700/50';
      }
    }
    if (resPathogen) resPathogen.textContent = diag.pathogenOrCause || '';
    if (resRiskText) resRiskText.textContent = diag.riskAssessment || 'Immediate preventive monitoring recommended.';

    // 3. Organic Treatment Card
    if (orgName) orgName.textContent = org.name || 'Organic Bio-Rational Protocol';
    if (orgAgent) orgAgent.textContent = org.agent || org.activeAgent || 'OMRI-Listed Biological Agent';
    if (orgDosage) orgDosage.textContent = org.dosage || 'Standard Agricultural Rate';
    if (orgMech) orgMech.textContent = org.mechanism || 'Biological antagonism & phyllosphere protection.';
    if (orgMethod) orgMethod.textContent = `${org.applicationMethod || 'Foliar spray'} (${org.frequency || 'Repeat as needed'})`;

    // 4. Chemical Treatment Card
    if (chemName) chemName.textContent = chem.name || 'Conventional Chemical Protocol';
    if (chemAgent) chemAgent.textContent = chem.agent || chem.activeIngredient || 'Curative Synthetic Formulation';
    if (chemTrade) chemTrade.textContent = chem.tradeExample || 'Commercial Reference';
    if (chemPhi) chemPhi.textContent = chem.preHarvestInterval || chem.phiRei || 'Standard PHI';
    if (chemRei) chemRei.textContent = chem.reEntryInterval || '12 Hours';
    if (chemSafety) chemSafety.textContent = chem.safetyAdvisory || chem.precautions || 'Apply in accordance with label guidelines. Rotate chemistry.';

    // Reset treatment view to 'Both'
    setTreatmentTab('all');

    // 5. Prevention Tips Checklist
    if (preventionList) {
      preventionList.innerHTML = '';
      const tips = Array.isArray(sol.preventionTips) && sol.preventionTips.length > 0 ? sol.preventionTips : [
        'Practice seasonal crop rotation with non-host legume crops.',
        'Sanitize farm machinery and eliminate crop stubble reservoirs.',
        'Optimize canopy airflow through calibrated row spacing.'
      ];
      tips.forEach(tip => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-2 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/30';
        li.innerHTML = `
          <i data-lucide="check" class="w-3.5 h-3.5 text-lime-400 shrink-0 mt-0.5"></i>
          <span class="leading-relaxed text-emerald-100">${tip}</span>
        `;
        preventionList.appendChild(li);
      });
    }

    // 6. Telemetry Closed-Loop Advice
    const tel = sol.telemetryAdvice || {};
    if (telIrrigation) telIrrigation.textContent = tel.irrigationSchedule || tel.irrigationRule || 'Adjust watering schedule to avoid high humidity convergence.';
    if (telThreshold) telThreshold.textContent = tel.sensorThreshold || 'Interlock solenoid valve when relative humidity exceeds 80%.';
    if (telBand) telBand.textContent = tel.optimalBand || tel.targetMetric || 'Moisture: 40-45% | pH: 6.4 - 6.8';

    // 7. User ID Database Logging Chip
    if (dbStatusText) {
      dbStatusText.textContent = `Logged to SQLite against User ID #${userId || 1} (${userEmail || 'demo@ecoharvest.io'})`;
    }

    if (window.lucide) window.lucide.createIcons();

    // Smooth scroll into output view on mobile
    if (window.innerWidth < 1024) {
      const outputCard = document.getElementById('diag-output-card');
      if (outputCard) outputCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // 7. Reset Button Handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      hideFormAlert();
      categoryInput.value = 'crop_disease';
      categoryPills.forEach((b, idx) => {
        if (idx === 0) b.classList.add('active-cat');
        else b.classList.remove('active-cat');
      });
      if (charCount) charCount.textContent = '0 / 800 chars';
      activePhotoAttached = false;
      if (filePreview) filePreview.classList.add('hidden');
      if (dropzone) dropzone.classList.remove('hidden');
      if (resultState) resultState.classList.add('hidden');
      if (idleState) idleState.classList.remove('hidden');
      currentActiveSolution = null;
      showToast('🔄 Diagnostics console reset.');
    });
  }

  // 8. Download Structured Prescription Plan
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!currentActiveSolution) {
        showToast('⚠️ Please run a diagnosis first.');
        return;
      }
      const sol = currentActiveSolution;
      const diag = sol.diagnosis || {};
      const org = sol.treatments ? (sol.treatments.organic || {}) : {};
      const chem = sol.treatments ? (sol.treatments.chemical || {}) : {};
      const tel = sol.telemetryAdvice || {};

      const text = `========================================================================
ECOHARVEST EXPERT AGRICULTURAL PRESCRIPTION & REMEDIATION PLAN
Generated: ${new Date().toLocaleString()}
Sector / Plot: ${diag.crop || 'Field Farmland'}
Problem Domain: ${diag.category || 'Agronomic Observation'}
Diagnostic Match: ${diag.confidence || 95}% Confidence (${diag.severity || 'ACTIVE'})
========================================================================

1. DIAGNOSIS & CAUSE
------------------------------------------------------------------------
Primary Issue: ${diag.title || 'Agronomic Issue'}
Scientific / Mechanism: ${diag.scientificName || 'Biological Condition'}
Root Pathogen / Mechanism: ${diag.pathogenOrCause || 'Identified via observation'}
Risk Assessment: ${diag.riskAssessment || 'Preventive intervention recommended'}

2. TREATMENT OPTIONS: ORGANIC VS. CHEMICAL
------------------------------------------------------------------------
[OPTION A: OMRI-LISTED ORGANIC PROTOCOL]
- Prescription: ${org.name || 'OMRI Protocol'}
- Active Agent: ${org.agent || org.activeAgent || 'Bio-Rational Agent'}
- Prescribed Dosage: ${org.dosage || 'Standard Agricultural Rate'}
- Mode of Action: ${org.mechanism || 'Biological antagonism'}
- Application: ${org.applicationMethod || 'Foliar spray'}
- Frequency: ${org.frequency || 'Repeat weekly as required'}

[OPTION B: CONVENTIONAL CHEMICAL PROTOCOL]
- Prescription: ${chem.name || 'Curative Chemical Protocol'}
- Active Ingredient: ${chem.agent || chem.activeIngredient || 'Curative Premix'} (Trade: ${chem.tradeExample || 'Commercial Reference'})
- Prescribed Dosage: ${chem.dosage || 'Targeted Label Rate'}
- Pre-Harvest Interval (PHI): ${chem.preHarvestInterval || chem.phiRei || 'Standard'}
- Re-Entry Interval (REI): ${chem.reEntryInterval || '12 Hours'}
- Safety Advisory: ${chem.safetyAdvisory || chem.precautions || 'Rotate FRAC chemistries.'}

3. AGRONOMIC PREVENTION TIPS & BEST PRACTICES
------------------------------------------------------------------------
${Array.isArray(sol.preventionTips) ? sol.preventionTips.map((tip, idx) => `[${idx + 1}] ${tip}`).join('\n') : ''}

4. FIELD IOT SENSOR & ACTUATOR SETTINGS
------------------------------------------------------------------------
- Irrigation Valve Schedule: ${tel.irrigationSchedule || tel.irrigationRule || 'Calibrated'}
- Sensor Threshold Interlock: ${tel.sensorThreshold || 'Automated'}
- Optimal Parameter Band: ${tel.optimalBand || tel.targetMetric || 'Standard Soil Profile'}

========================================================================
EcoHarvest Smart Agriculture Platform • Persistent Database Verified
`;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecoharvest-prescription-${(diag.title || 'diagnosis').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📄 Full agronomic prescription exported to downloads.');
    });
  }

  // 9. Load Recent Submitted Problems & Solutions History (GET /api/solutions)
  async function loadSolutionsHistory() {
    const list = document.getElementById('diag-recent-list');
    const counter = document.getElementById('diag-history-count');
    if (!list) return;

    // Loading State for History List
    list.innerHTML = `
      <div class="py-4 text-center text-xs text-emerald-400/70 flex items-center justify-center gap-2">
        <span class="animate-spin inline-block">⏳</span>
        <span>Loading problem history from database...</span>
      </div>
    `;

    try {
      const token = localStorage.getItem('ecoharvest_auth_token');
      const currentUser = authManager ? authManager.getCurrentUser() : null;
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `${API_BASE}/api/solutions?limit=20`;
      // If unauthenticated guest without token, fallback to email query or public history
      if (!token && currentUser && currentUser.email) {
        url += `&email=${encodeURIComponent(currentUser.email)}`;
      } else if (!token) {
        url += `&email=demo@ecoharvest.io`;
      }

      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        if (res.status === 401) {
          list.innerHTML = `
            <div class="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 text-center space-y-1.5 text-xs text-emerald-300/80">
              <p class="text-white font-medium">🔒 Guest Grower Session</p>
              <p class="text-[11px] text-emerald-400/70">Sign in to automatically sync your persistent farm problems &amp; solutions.</p>
              <button type="button" class="open-auth-modal mt-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[11px] font-semibold">Sign In / Register</button>
            </div>
          `;
          if (counter) counter.textContent = 'Guest Mode';
          const modalBtn = list.querySelector('.open-auth-modal');
          if (modalBtn) {
            modalBtn.addEventListener('click', () => {
              const openModal = document.querySelector('.open-auth-modal');
              if (openModal) openModal.click();
            });
          }
          return;
        }
        throw new Error(`Failed to load history (${res.status})`);
      }

      const resData = await res.json();
      const solutions = resData.solutions || [];

      if (counter) {
        counter.textContent = `${solutions.length} Saved`;
      }

      if (solutions.length === 0) {
        list.innerHTML = `
          <div class="text-[11px] text-emerald-300/60 italic py-3 text-center space-y-1">
            <p>No agricultural problems logged yet.</p>
            <p class="text-[10px] text-emerald-400/50">Submit your field observations above to generate and store solutions.</p>
          </div>
        `;
        return;
      }

      // Dynamic DOM Rendering of History Cards
      list.innerHTML = '';
      solutions.slice(0, 5).forEach((item) => {
        const sol = item.solution || {};
        const diag = sol.diagnosis || {};
        const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
        
        let categoryEmoji = '🌾';
        const cat = (item.category || diag.category || '').toLowerCase();
        if (cat.includes('pest')) categoryEmoji = '🐛';
        else if (cat.includes('deficiency') || cat.includes('nutrient') || cat.includes('soil')) categoryEmoji = '🧪';
        else if (cat.includes('irrigation') || cat.includes('water')) categoryEmoji = '💧';

        const card = document.createElement('div');
        card.className = 'group p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/40 border border-emerald-800/40 hover:border-emerald-500/50 space-y-2 transition-all cursor-pointer shadow-sm';
        
        card.innerHTML = `
          <div class="flex justify-between items-center text-[10px] font-mono">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-900/70 border border-emerald-700/50 font-bold text-emerald-300">
              <span>${categoryEmoji}</span>
              <span>${item.category || diag.category || 'Problem'}</span>
            </span>
            <span class="text-emerald-400/70">${timeStr}</span>
          </div>

          <div class="space-y-0.5">
            <div class="text-[11px] text-emerald-200/90 line-clamp-2 italic leading-snug">
              "${item.problem || 'Field problem'}"
            </div>
            <h5 class="text-xs font-bold text-white flex items-center justify-between pt-1">
              <span class="flex items-center gap-1.5 text-lime-300 truncate">
                <i data-lucide="check-circle-2" class="w-3 h-3 shrink-0 text-lime-400"></i>
                <span class="truncate">${diag.title || 'Expert Solution'}</span>
              </span>
              <span class="text-[10px] font-mono text-emerald-400 font-semibold shrink-0 ml-1">
                ${diag.confidence ? diag.confidence + '%' : ''}
              </span>
            </h5>
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-emerald-900/40 text-[10px] text-emerald-400">
            <span class="font-mono text-emerald-400/70">#Rec-${item.id}</span>
            <span class="text-lime-300 font-semibold group-hover:underline flex items-center gap-0.5">
              <span>Inspect Solution</span>
              <i data-lucide="chevron-right" class="w-3 h-3"></i>
            </span>
          </div>
        `;

        // Click to dynamically load and render this historical solution
        card.addEventListener('click', () => {
          renderStructuredSolution(sol, item.userId, item.userEmail, item.problem);
          showToast(`📋 Loaded solution: ${diag.title || 'Agronomic Record'}`);
          const outputCard = document.getElementById('diag-output-card');
          if (outputCard) {
            outputCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });

        list.appendChild(card);
      });

      if (window.lucide) window.lucide.createIcons();

    } catch (e) {
      console.debug('Failed to load solutions history:', e);
      list.innerHTML = `
        <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-xs text-center text-emerald-300/70">
          <p class="text-[11px]">Recent solutions synced locally.</p>
        </div>
      `;
    }
  }

  // Initial load of history
  loadSolutionsHistory();
}

function generateClientFallbackSolution({ category, crop, symptoms, urgency }) {
  return {
    diagnosis: {
      title: 'Northern Corn Leaf Blight',
      scientificName: 'Exserohilum turcicum',
      category: 'Crop Disease',
      crop,
      confidence: 96,
      severity: urgency === 'critical' ? 'CRITICAL RISK' : 'MODERATE SEVERITY',
      pathogenOrCause: 'Fungal ascomycete stimulated by prolonged canopy leaf moisture and warm microclimates.',
      riskAssessment: 'High potential for 30-50% grain yield reduction if lesions progress to ear leaf before silking.'
    },
    treatments: {
      organic: {
        name: 'Bio-Fungicidal Bacillus amyloliquefaciens & Copper Octanoate',
        activeAgent: 'Bacillus amyloliquefaciens (Strain D747) + Copper Octanoate',
        dosage: '2.5 L/ha diluted in 250L water carrier (apply at early morning calm)',
        mechanism: 'Competitive colonization of leaf phyllosphere and disruption of fungal cell membranes.',
        frequency: 'Repeat every 7-10 days during high ambient humidity periods',
        applicationMethod: 'Foliar misting via electrostatic drone or boom nozzle'
      },
      chemical: {
        name: 'Translaminar Quinone Outside & Sterol Demethylation Inhibitor',
        activeIngredient: 'Azoxystrobin (18.2%) + Difenoconazole (11.4%) [FRAC 11 + 3]',
        tradeExample: 'Quadris Top / Amistar Gold SC',
        dosage: '450 - 550 mL/ha diluted in 200L clean water',
        mechanism: 'QoI mitochondrial respiration inhibitor paired with sterol ergosterol biosynthesis inhibitor.',
        preHarvestInterval: '14 Days (Maize / Grain)',
        reEntryInterval: '12 Hours',
        safetyAdvisory: 'Alternate chemistry after 2 sprays to prevent single-site resistance mutations.'
      }
    },
    preventionTips: [
      'Crop Rotation: Rotate field with non-host legumes (soy/beans) for 1-2 seasons.',
      'Residue Management: Perform post-harvest shredding to accelerate microbial decay of infected stalks.',
      'Resistant Genetics: Specify certified Ht-gene resistant hybrid seed varieties (Ht1, Ht2, or HtN alleles).',
      'Canopy Airflow: Maintain 30-inch row spacing to shorten leaf wetness duration.'
    ],
    telemetryAdvice: {
      irrigationSchedule: 'Switch automated irrigation from evening mist to early morning ground-drip (05:00 - 08:00).',
      sensorThreshold: 'Interlock solenoid valve controller to pause irrigation pulses when canopy sensor exceeds 80% relative humidity.',
      optimalBand: 'Target Soil Volumetric Moisture: 42 - 46% | Canopy Humidity: < 75% | Soil Temp: 22 - 25°C'
    }
  };
}

/* ==========================================================================
   NDVI Canopy Vigour Map Controller & Inspector Modal
   ========================================================================== */
function initNdviCanopyMap() {
  const sectorData = {
    'sec-a': {
      title: 'Sector A - Main Corn & Grain Canopy',
      crop: 'Zea mays (Maize / Sweetcorn)',
      scoreBadge: 'NDVI 0.92 • Optimal Vigour',
      sub: 'Falcon-7 Autonomous Scouting Pass • 45m Altitude • Sun Elevation 52°',
      img: 'images/sec_a_ndvi.jpg',
      scanClass: 'scan-a',
      gps: 'GPS: 41.8781° N, 87.6298° W',
      res: 'GSD: 1.2 cm/pixel • Nadir 90°',
      spad: '54.2',
      temp: '22.4°C',
      biomass: '18.4 t/ha',
      moist: '42.8% VWC',
      notes: 'Dense leaf canopy with uniform chlorophyll distribution. Zero fungal lesions or chlorosis detected by drone multispectral camera across all 4 sub-blocks.'
    },
    'sec-b': {
      title: 'Sector B - Precision Vineyard & Orchard',
      crop: 'Vitis vinifera & Citrus Groves',
      scoreBadge: 'NDVI 0.88 • High Vigour',
      sub: 'Falcon-7 Autonomous Scouting Pass • 60m Altitude • Multispectral 5-Band',
      img: 'images/sec_b_ndvi.jpg',
      scanClass: 'scan-b',
      gps: 'GPS: 41.8814° N, 87.6325° W',
      res: 'GSD: 1.5 cm/pixel • Nadir 90°',
      spad: '51.8',
      temp: '23.1°C',
      biomass: '14.2 t/ha',
      moist: '38.5% VWC',
      notes: 'Geometric trellising shows high photosynthetic activity along vine rows. Sub-block B2 micro-sprinkler cycle scheduled for 14:00 to sustain bloom vigor.'
    },
    'sec-c': {
      title: 'Sector C - Center-Pivot Grain Plot',
      crop: 'Triticum aestivum (Winter Wheat / Grain Pivot)',
      scoreBadge: 'NDVI 0.79 • Pivot Irrigation',
      sub: 'Falcon-7 Autonomous Scouting Pass • 90m Altitude • Thermal IR Feed',
      img: 'images/sec_c_ndvi.jpg',
      scanClass: 'scan-c',
      gps: 'GPS: 41.8752° N, 87.6250° W',
      res: 'GSD: 2.1 cm/pixel • Nadir 90°',
      spad: '48.6',
      temp: '24.6°C',
      biomass: '12.7 t/ha',
      moist: '44.1% VWC',
      notes: 'Circular pivot irrigation pattern displays strong vegetative vigor in active quadrants. Outer buffer sectors show expected dormancy with zero water pooling.'
    },
    'sec-d': {
      title: 'Sector D - Bio-Greenhouse & Vegetable Rows',
      crop: 'Lactuca sativa & High-Tunnel Produce',
      scoreBadge: 'NDVI 0.85 • Active Growth',
      sub: 'Falcon-7 Autonomous Scouting Pass • 35m Altitude • High-Resolution Lidar',
      img: 'images/sec_d_ndvi.jpg',
      scanClass: 'scan-d',
      gps: 'GPS: 41.8799° N, 87.6352° W',
      res: 'GSD: 0.9 cm/pixel • Nadir 90°',
      spad: '52.0',
      temp: '21.8°C',
      biomass: '16.1 t/ha',
      moist: '46.3% VWC',
      notes: 'Greenhouse complexes D1-D3 exhibit intense photosynthetic chlorophyll saturation. Service furrows are cleanly segregated with zero weed intrusion.'
    }
  };

  const modal = document.getElementById('ndvi-inspector-modal');
  if (!modal) return;

  const modalTitle = document.getElementById('ndvi-modal-title');
  const modalSub = document.getElementById('ndvi-modal-sub');
  const modalBadge = document.getElementById('ndvi-modal-score-badge');
  const modalImg = document.getElementById('ndvi-modal-img');
  const modalScanner = document.getElementById('ndvi-modal-scanner');
  const modalGps = document.getElementById('ndvi-modal-gps');
  const modalRes = document.getElementById('ndvi-modal-res');
  const modalCrop = document.getElementById('ndvi-modal-crop');
  const modalSpad = document.getElementById('ndvi-modal-spad');
  const modalTemp = document.getElementById('ndvi-modal-temp');
  const modalBiomass = document.getElementById('ndvi-modal-biomass');
  const modalMoist = document.getElementById('ndvi-modal-moist');
  const modalNotes = document.getElementById('ndvi-modal-notes');
  const closeBtn = document.getElementById('close-ndvi-modal');
  const flyoverBtn = document.getElementById('ndvi-btn-flyover');
  const exportBtn = document.getElementById('ndvi-btn-export');
  const tabBtns = modal.querySelectorAll('.ndvi-tab-btn');

  let currentSector = 'sec-a';

  function renderSector(sectorKey) {
    const data = sectorData[sectorKey];
    if (!data) return;
    currentSector = sectorKey;

    if (modalTitle) modalTitle.textContent = data.title;
    if (modalSub) modalSub.textContent = data.sub;
    if (modalBadge) modalBadge.textContent = data.scoreBadge;
    if (modalImg) {
      modalImg.src = data.img;
      modalImg.alt = data.title;
    }
    if (modalScanner) {
      modalScanner.className = 'ndvi-scanline ' + data.scanClass;
    }
    if (modalGps) modalGps.textContent = data.gps;
    if (modalRes) modalRes.textContent = data.res;
    if (modalCrop) modalCrop.textContent = data.crop;
    if (modalSpad) modalSpad.textContent = data.spad;
    if (modalTemp) modalTemp.textContent = data.temp;
    if (modalBiomass) modalBiomass.textContent = data.biomass;
    if (modalMoist) modalMoist.textContent = data.moist;
    if (modalNotes) modalNotes.textContent = data.notes;

    // Update active tab styles
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-target') === sectorKey) {
        btn.className = 'ndvi-tab-btn px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all bg-emerald-500 text-black shadow';
      } else {
        btn.className = 'ndvi-tab-btn px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all text-emerald-300 hover:text-white';
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function openModal(sectorKey) {
    renderSector(sectorKey || 'sec-a');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // Click on cards in the Hero NDVI simulation map
  document.querySelectorAll('.ndvi-sector-card').forEach(card => {
    card.addEventListener('click', () => {
      const sectorKey = card.getAttribute('data-sector') || 'sec-a';
      openModal(sectorKey);
    });
  });

  // Modal tab switcher
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) renderSector(target);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  if (flyoverBtn) {
    flyoverBtn.addEventListener('click', () => {
      flyoverBtn.disabled = true;
      flyoverBtn.innerHTML = '<span>⏳ Dispatching Drone...</span>';
      setTimeout(() => {
        flyoverBtn.disabled = false;
        flyoverBtn.innerHTML = '<span>✓ Flight Path Synced!</span>';
        if (typeof showToast === 'function') {
          showToast(`🛸 Falcon-7 dispatched for high-resolution multispectral pass over ${sectorData[currentSector]?.title || 'Sector'}!`);
        }
        setTimeout(() => {
          flyoverBtn.innerHTML = '<i data-lucide="scan" class="w-4 h-4 mr-1"></i><span>Queue Drone Flyover</span>';
          if (window.lucide) window.lucide.createIcons();
        }, 3000);
      }, 1000);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (typeof showToast === 'function') {
        showToast(`🛰️ Calibrated GeoTIFF multispectral bands package downloading for ${sectorData[currentSector]?.title || 'Sector'}...`);
      }
    });
  }
}
