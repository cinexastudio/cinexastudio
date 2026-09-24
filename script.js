// ============================================================
// CINEXA STUDIO — interactions v4 (optimised)
// Fixes: nav scroll state, mobile video touch, lightbox aria,
// stat counter animation, passive listeners, memory leaks
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     PAGE LOAD FADE-IN
     ============================================================ */
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));

  /* ============================================================
     SCROLL REVEAL (fade + rise on viewport entry)
     ============================================================ */
  const revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && revealTargets.length) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    revealTargets.forEach(el => revealIO.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  /* ============================================================
     HOME LINKS — smooth scroll to top
     ============================================================ */
  document.querySelectorAll('a[href="#top"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ============================================================
     NAV — mobile toggle + scroll darken
     ============================================================ */
  const navToggle = document.getElementById('navToggle');
  const nav       = document.querySelector('.nav');

  if (navToggle && nav) {
    // Mobile open/close
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('menu-open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
    });

    // Close on link click
    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      });
    });

    // Close mobile nav on outside click / Escape
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('menu-open') && !nav.contains(e.target)) {
        nav.classList.remove('menu-open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('menu-open')) {
        nav.classList.remove('menu-open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
        navToggle.focus();
      }
    });
  }

  // Scroll darken: add .is-scrolled after 40px
  if (nav) {
    const onNavScroll = () => {
      nav.classList.toggle('is-scrolled', window.scrollY > 40);
    };
    onNavScroll(); // run once on load
    window.addEventListener('scroll', onNavScroll, { passive: true });
  }

  /* ============================================================
     HERO STAT COUNTER ANIMATION
     ============================================================ */
  const statNums = document.querySelectorAll('.hero-stat-num[data-count]');
  if (statNums.length && 'IntersectionObserver' in window) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateCount = (el, target) => {
      if (prefersReducedMotion) return; // keep static text, skip animation
      const suffix = el.textContent.replace(/\d+/, '').trim(); // '+' or '+'
      const duration = 1200;
      const start = performance.now();
      const step = (now) => {
        const elapsed = Math.min(now - start, duration);
        const progress = elapsed / duration;
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = (target < 10 ? String(current).padStart(2, '0') : current) + suffix;
        if (elapsed < duration) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        animateCount(el, target);
        counterIO.unobserve(el);
      });
    }, { threshold: 0.5 });

    statNums.forEach(el => counterIO.observe(el));
  }

  /* ============================================================
     VIDEO CARD — fallback helper
     ============================================================ */
  function attachVideoFallback(video) {
    const skeleton = video.nextElementSibling;
    const fallback = skeleton && skeleton.nextElementSibling;
    if (!fallback || !fallback.matches('.card-fallback')) return;

    let resolved = false;

    const hideSkeleton = () => {
      if (skeleton && skeleton.matches('.card-skeleton')) {
        skeleton.classList.add('is-hidden');
      }
    };
    const showFallback = () => {
      if (resolved) return;
      resolved = true;
      hideSkeleton();
      fallback.classList.add('is-visible');
    };
    const hideFallback = () => {
      resolved = true;
      hideSkeleton();
    };

    // If a poster exists, clear the skeleton as soon as it decodes
    if (video.poster) {
      const img = new Image();
      img.onload = hideSkeleton;
      img.onerror = () => {};
      img.src = video.poster;
    }

    video.addEventListener('error', showFallback, { once: true });
    video.addEventListener('loadeddata', hideFallback, { once: true });
    video.addEventListener('loadstart', () => {
      // Only show fallback if readyState is still 0 after a generous delay —
      // slow mobile connections can take time; don't flash red too early.
      setTimeout(() => {
        if (!resolved && video.readyState === 0) showFallback();
      }, 5000);
    }, { once: true });
  }

  /* ============================================================
     LIGHTBOX
     ============================================================ */
  const lightbox        = document.getElementById('lightbox');
  const lightboxVideo   = document.getElementById('lightboxVideo');
  const lightboxClose   = document.getElementById('lightboxClose');
  const lightboxFallback = document.getElementById('lightboxFallback');
  let lastFocusedEl     = null;

  function openLightbox(src) {
    if (!src || !lightbox) return;
    lastFocusedEl = document.activeElement;
    lightboxFallback.classList.remove('is-visible');
    lightboxVideo.style.display = '';
    lightboxVideo.src = src;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    lightboxVideo.addEventListener('error', () => {
      lightboxVideo.style.display = 'none';
      lightboxFallback.classList.add('is-visible');
    }, { once: true });

    // Try unmuted first (user just clicked, so this is a real gesture);
    // if the browser still blocks it, fall back to a muted play so the
    // video isn't left frozen with no feedback.
    lightboxVideo.muted = false;
    lightboxVideo.play().catch(() => {
      lightboxVideo.muted = true;
      lightboxVideo.play().catch(() => {});
    });
    // Delay focus so screen-readers announce the dialog first
    requestAnimationFrame(() => lightboxClose.focus());
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
    lightboxVideo.load();
    if (lastFocusedEl) {
      lastFocusedEl.focus();
      lastFocusedEl = null;
    }
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('open')) return;

    if (e.key === 'Escape') {
      closeLightbox();
      return;
    }

    // Trap focus within lightbox (close button ↔ video controls)
    if (e.key === 'Tab') {
      const focusable = [lightboxClose, lightboxVideo].filter(el => el);
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      const focused = document.activeElement;

      if (e.shiftKey) {
        if (focused === first || !lightbox.contains(focused)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (focused === last || !lightbox.contains(focused)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  /* ============================================================
     WORK GRID — lazy video load + hover play + lightbox click
     ============================================================ */
  const cards = document.querySelectorAll('.work-card');
  const isTouchDevice = window.matchMedia('(hover: none)').matches;

  // Lazy load observer: load video src only as card approaches viewport
  const lazyIO = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const card  = entry.target;
          const video = card.querySelector('video');
          const src   = card.getAttribute('data-video');
          if (video && src && !video.src) {
            video.src = src;
            video.preload = 'metadata';
            attachVideoFallback(video);
          }
          lazyIO.unobserve(card);
        });
      }, { rootMargin: '300px 0px' }) // load a bit earlier on slow connections
    : null;

  cards.forEach(card => {
    const video    = card.querySelector('video');
    const src      = card.getAttribute('data-video');
    const isAuto   = card.getAttribute('data-autoplay') === 'true';
    const muteBtn  = card.querySelector('.mute-btn');

    /* ---- featured / autoplay card ---- */
    if (isAuto && video && src) {
      video.preload = 'metadata';
      video.src = src;
      attachVideoFallback(video);

      let autoplayStarted = false;
      const tryAutoplay = () => {
        if (autoplayStarted) return;
        video.play().then(() => {
          autoplayStarted = true;
          cleanup();
        }).catch(() => {});
      };

      const cleanup = () => {
        video.removeEventListener('canplay', tryAutoplay);
        ['click', 'touchstart', 'keydown'].forEach(evt => {
          document.removeEventListener(evt, tryAutoplay);
        });
      };

      // Don't call play() before the browser has any data — wait for canplay
      // (or a fallback user gesture) instead of firing an immediate, near-
      // guaranteed-to-reject play() call on page load.
      video.addEventListener('canplay', tryAutoplay, { once: true });
      ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, tryAutoplay, { passive: true, once: true });
      });

    /* ---- lazy non-autoplay cards ---- */
    } else if (lazyIO) {
      lazyIO.observe(card);
    } else if (video && src) {
      video.src = src;
      attachVideoFallback(video);
    }

    /* ---- hover play/pause (desktop only) ---- */
    if (!isAuto && !isTouchDevice) {
      let leaveTimer = null;

      card.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimer);
        if (video && video.src) video.play().catch(() => {});
      });

      card.addEventListener('mouseleave', () => {
        if (!video) return;
        leaveTimer = setTimeout(() => {
          video.pause();
          video.currentTime = 0;
        }, 350);
      });
    }

    /* ---- touch: tap-to-play on mobile (first tap plays, second opens lightbox) ---- */
    if (!isAuto && isTouchDevice && video) {
      let tapped = false;
      card.addEventListener('touchend', (e) => {
        // Ignore taps on the mute button itself
        if (muteBtn && (e.target === muteBtn || muteBtn.contains(e.target))) return;
        if (!tapped) {
          tapped = true;
          if (video.src) video.play().catch(() => {});
          // Reset tapped state after a window so a second quick tap opens lightbox
          setTimeout(() => { tapped = false; }, 1200);
          e.preventDefault();
          return;
        }
        openLightbox(src);
      }, { passive: false });
    }

    /* ---- mute toggle button ---- */
    if (muteBtn && video) {
      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        const unmuted = !video.muted;
        card.classList.toggle('is-unmuted', unmuted);
        muteBtn.setAttribute('aria-pressed', String(unmuted));
        muteBtn.setAttribute('aria-label', unmuted ? 'Mute video' : 'Unmute video');
        trackEvent('mute_toggle', { muted: !unmuted });
      });
      muteBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      });
    }

    /* ---- click opens lightbox (desktop) ---- */
    card.addEventListener('click', (e) => {
      if (muteBtn && (e.target === muteBtn || muteBtn.contains(e.target))) return;
      if (isTouchDevice) return; // touch handled above
      openLightbox(src);
    });

    /* ---- keyboard: Enter / Space opens lightbox ---- */
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(src);
      }
    });
  });

  /* ============================================================
     WORK FILTER — show/hide cards by category
     ============================================================ */
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      filterBtns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      cards.forEach(card => {
        const matches = filter === 'all' || card.getAttribute('data-category') === filter;
        card.classList.toggle('is-hidden', !matches);
      });

      trackEvent('filter_click', { filter_value: filter });
    });
  });

  /* ============================================================
     ENQUIRY FORM (NueForm embed)
     ============================================================ */
  const enquiryFrame  = document.getElementById('enquiryFormIframe');
  const enquiryLoader = document.getElementById('enquiryFormLoader');
  const enquiryWrap   = document.getElementById('enquiryFormWrap');
  const formHint      = document.getElementById('formHint');

  if (enquiryFrame && enquiryLoader) {
    let enquiryLoaded = false;

    const hideLoader = () => {
      enquiryLoaded = true;
      enquiryLoader.classList.add('is-hidden');
    };

    enquiryFrame.addEventListener('load', () => {
      hideLoader();
      trackEvent('enquiry_form_loaded', { form_provider: 'nueform' });
    });

    // Fallback: show direct link if iframe hasn't loaded in 8s
    setTimeout(() => {
      if (!enquiryLoaded && formHint) {
        formHint.innerHTML =
          'Form not loading? <a href="https://nueform.io/f/W8zEcZDJsB" target="_blank" rel="noopener noreferrer">Open it directly</a> or <a href="https://wa.me/919325616077" target="_blank" rel="noopener noreferrer">message on WhatsApp</a>.';
      }
    }, 8000);

    // Track when the form scrolls into view
    if (enquiryWrap && 'IntersectionObserver' in window) {
      const fIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackEvent('enquiry_form_view', { form_provider: 'nueform' });
            fIO.disconnect();
          }
        });
      }, { threshold: 0.3 });
      fIO.observe(enquiryWrap);
    }
  }

  /* ============================================================
     GA4 EVENT HELPER
     ============================================================ */
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params || {});
    }
  }

  /* ============================================================
     CTA BUTTON TRACKING
     ============================================================ */
  document.querySelectorAll('a.hero-cta, a.nav-cta').forEach(btn => {
    const label = btn.textContent.trim();
    btn.addEventListener('click', () => {
      if (label.toLowerCase().includes('view work')) {
        trackEvent('view_work_click', { location: 'hero' });
      } else if (label.toLowerCase().includes('start')) {
        trackEvent('start_project_click', {
          location: btn.classList.contains('nav-cta') ? 'nav' : 'hero'
        });
      } else if (label.toLowerCase().includes('book')) {
        trackEvent('book_a_call_click', { location: 'hero', destination: 'calendly' });
      }
    });
  });

  /* WhatsApp FAB tracking */
  document.querySelectorAll('.whatsapp-fab').forEach(btn => {
    btn.addEventListener('click', () => {
      trackEvent('whatsapp_click', { location: 'floating_button' });
    });
  });

  /* ============================================================
     COPY TO CLIPBOARD — email & phone links
     ============================================================ */
  const copyToast = document.getElementById('copyToast');
  let toastTimer  = null;

  function showCopyToast(msg) {
    if (!copyToast) return;
    copyToast.textContent = msg;
    copyToast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => copyToast.classList.remove('is-visible'), 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers / iOS Safari
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
      const href    = link.getAttribute('href');
      const value   = href.replace(/^mailto:|^tel:/, '');
      const isEmail = href.startsWith('mailto:');
      copyText(value)
        .then(() => showCopyToast(isEmail ? '✓ Email copied' : '✓ Number copied'))
        .catch(() => {});
      trackEvent(isEmail ? 'email_click' : 'phone_click', { value });
    });
  });

  /* ============================================================
     SCROLL-SPY — highlight active nav link
     ============================================================ */
  const spyIds = ['hero', 'work', 'studio', 'about', 'testimonials', 'faq', 'contact'];
  const spySections = spyIds.map(id => document.getElementById(id)).filter(Boolean);
  const spyLinkMap  = new Map();

  document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').replace('#', '');
    const targetId = id === 'top' ? 'hero' : id;
    if (!spyLinkMap.has(targetId)) spyLinkMap.set(targetId, []);
    spyLinkMap.get(targetId).push(link);
  });

  function setActiveLink(sectionId) {
    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.remove('is-active-link');
      a.removeAttribute('aria-current');
    });
    const links = spyLinkMap.get(sectionId);
    if (links) {
      links.forEach(a => {
        a.classList.add('is-active-link');
        a.setAttribute('aria-current', 'true');
      });
    }
  }

  if ('IntersectionObserver' in window && spySections.length) {
    const spyIO = new IntersectionObserver((entries) => {
      const visible = entries.filter(en => en.isIntersecting);
      if (visible.length) {
        visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveLink(visible[0].target.id);
      }
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
    spySections.forEach(sec => spyIO.observe(sec));
  }

  /* ============================================================
     BACK-TO-TOP BUTTON
     ============================================================ */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    const toggleBTT = () => {
      backToTop.classList.toggle('is-visible', window.scrollY > 500);
    };
    toggleBTT();
    window.addEventListener('scroll', toggleBTT, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      trackEvent('back_to_top_click', {});
    });
  }

  /* ============================================================
     SCROLL PROGRESS BAR (thin red line at top)
     ============================================================ */
  const progressBar = document.createElement('div');
  progressBar.setAttribute('aria-hidden', 'true');
  progressBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    width: 0%;
    background: #FF3B1F;
    z-index: 9999;
    pointer-events: none;
    transform: translateZ(0);
    transition: width .1s linear;
  `;
  document.body.appendChild(progressBar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct.toFixed(1) + '%';
  }, { passive: true });

});
