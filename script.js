// ============================================================
// CINEXA STUDIO — interactions
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- page load fade-in ---------------- */
  requestAnimationFrame(() => document.body.classList.add('is-loaded'));

  /* ---------------- scroll reveal (fade + rise on entry) ---------------- */
  const revealTargets = document.querySelectorAll('.reveal, .reveal-stagger');
  if ('IntersectionObserver' in window && revealTargets.length) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });
    revealTargets.forEach(el => revealIO.observe(el));
  } else {
    // No IntersectionObserver support: show content immediately, no reveal animation.
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------------- home button: force scroll to top ---------------- */
  document.querySelectorAll('a[href="#top"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------------- mobile nav ---------------- */
  const navToggle = document.getElementById('navToggle');
  const nav = document.querySelector('.nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('menu-open');
      navToggle.classList.toggle('open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
    });
    nav.querySelectorAll('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('menu-open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- media fallback helper ---------------- */
  function attachVideoFallback(video) {
    const fallback = video.nextElementSibling;
    if (!fallback || !fallback.matches('.card-fallback')) return;

    let resolved = false;
    const showFallback = () => {
      if (resolved) return;
      resolved = true;
      fallback.classList.add('is-visible');
    };
    const hideFallback = () => {
      resolved = true;
      fallback.classList.remove('is-visible');
    };

    video.addEventListener('error', showFallback, { once: true });
    video.addEventListener('loadeddata', hideFallback, { once: true });
    video.addEventListener('loadstart', () => {
      setTimeout(() => {
        if (!resolved && video.readyState === 0) showFallback();
      }, 1200);
    }, { once: true });
  }

  /* ---------------- lightbox ---------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxVideo = document.getElementById('lightboxVideo');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxFallback = document.getElementById('lightboxFallback');
  let lastFocusedEl = null;

  function openLightbox(src) {
    if (!src) return;
    lastFocusedEl = document.activeElement;
    lightboxFallback.classList.remove('is-visible');
    lightboxVideo.style.display = '';
    lightboxVideo.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxVideo.muted = false;

    lightboxVideo.addEventListener('error', () => {
      lightboxVideo.style.display = 'none';
      lightboxFallback.classList.add('is-visible');
    }, { once: true });

    lightboxVideo.play().catch(() => {/* file missing, or autoplay-with-sound blocked — ignore */});
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lightboxVideo.pause();
    lightboxVideo.removeAttribute('src');
    lightboxVideo.load();
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key === 'Tab') {
      // Cycle focus between the two focusable elements in the lightbox
      // (close button and the video's native controls) instead of always
      // snapping back to close — otherwise the video controls (play,
      // seek, volume) are unreachable by keyboard.
      const focused = document.activeElement;
      if (e.shiftKey) {
        if (focused === lightboxClose) {
          e.preventDefault();
          lightboxVideo.focus();
        }
      } else {
        if (focused === lightboxVideo || !lightbox.contains(focused)) {
          e.preventDefault();
          lightboxClose.focus();
        }
      }
    }
  });

  /* ---------------- work grid: lazy-loaded preview + click lightbox ---------------- */
  const cards = document.querySelectorAll('.work-card');

  const lazyIO = ('IntersectionObserver' in window)
    ? new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const card = entry.target;
          const video = card.querySelector('video');
          const src = card.getAttribute('data-video');
          if (video && src && !video.src) {
            video.src = src;
            video.preload = 'metadata';
            attachVideoFallback(video);
          }
          lazyIO.unobserve(card);
        });
      }, { rootMargin: '600px 0px' })
    : null;

  cards.forEach(card => {
    const video = card.querySelector('video');
    const src = card.getAttribute('data-video');
    const isAutoplay = card.getAttribute('data-autoplay') === 'true';
    const muteBtn = card.querySelector('.mute-btn');

    if (isAutoplay && video && src) {
      // Featured card: load immediately (not lazy) and loop continuously, muted.
      video.preload = 'auto';
      video.src = src;
      attachVideoFallback(video);

      // Autoplay can be blocked before user interaction on some browsers.
      // Keep retrying (not just once) on the next few interaction signals,
      // and also retry once the browser reports enough data is buffered —
      // a previous failed attempt may have been due to the file not being
      // ready yet, not just an autoplay-policy block.
      let autoplayStarted = false;
      const retryEvents = ['click', 'touchstart', 'scroll', 'keydown'];
      const tryAutoplay = () => {
        if (autoplayStarted) return;
        video.play().then(() => {
          autoplayStarted = true;
          video.removeEventListener('canplay', tryAutoplay);
          retryEvents.forEach(evt => document.removeEventListener(evt, tryAutoplay));
        }).catch(() => {});
      };
      tryAutoplay();
      video.addEventListener('canplay', tryAutoplay);
      retryEvents.forEach(evt => document.addEventListener(evt, tryAutoplay, { passive: true }));
    } else if (lazyIO) {
      lazyIO.observe(card);
    } else if (video && src) {
      video.src = src;
      attachVideoFallback(video);
    }

    if (!isAutoplay) {
      // Track a pending "settle" timer so rapid mouse in/out (common while
      // scrolling past a grid of cards) doesn't restart the video from 0
      // every time — that re-triggers buffering and looks like stutter.
      let leaveTimer = null;

      card.addEventListener('mouseenter', () => {
        clearTimeout(leaveTimer);
        if (video && video.src) video.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        if (!video) return;
        // Wait slightly before pausing/resetting: if the user re-enters
        // within this window (e.g. scrolling past several cards), we skip
        // the reset entirely and the video just keeps playing smoothly.
        leaveTimer = setTimeout(() => {
          video.pause();
          video.currentTime = 0;
        }, 400);
      });
    }

    /* ---- mute/unmute toggle, top-corner button on every card ---- */
    if (muteBtn && video) {
      muteBtn.addEventListener('click', (e) => {
        // Stop this from bubbling up to the card's own click handler,
        // which would otherwise open the lightbox at the same time.
        e.stopPropagation();
        video.muted = !video.muted;
        const isUnmuted = !video.muted;
        card.classList.toggle('is-unmuted', isUnmuted);
        muteBtn.setAttribute('aria-pressed', String(isUnmuted));
        muteBtn.setAttribute('aria-label', isUnmuted ? 'Mute video' : 'Unmute video');
      });
      // Prevent the card's Enter/Space "open lightbox" handler from also
      // firing when the mute button itself is activated via keyboard.
      muteBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
        }
      });
    }

    card.addEventListener('click', (e) => {
      if (muteBtn && (e.target === muteBtn || muteBtn.contains(e.target))) return;
      openLightbox(src);
    });
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return; // ignore keys from focused child controls (e.g. mute button)
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(src);
      }
    });
  });

  /* ---------------- work filter ---------------- */
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
    });
  });

  /* ---------------- about image fallback ----------------
     Handled entirely via the inline onerror attribute on the
     <img> itself (tries jpg/jpeg/png/webp, then reveals the
     .about-fallback initials). No JS needed here. */

  /* ---------------- enquiry form (NueForm embed) ----------------
     Hides the loader once the iframe finishes loading, tracks a
     GA4 event when the enquiry form comes into view, and swaps
     in a clear fallback message if the embed takes too long or
     fails (ad-blockers / slow networks / offline). */
  const enquiryFrame = document.getElementById('enquiryFormIframe');
  const enquiryLoader = document.getElementById('enquiryFormLoader');
  const enquiryWrap = document.getElementById('enquiryFormWrap');
  const formHint = document.getElementById('formHint');

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

    // Fallback: if the iframe hasn't fired 'load' within 8s
    // (blocked, offline, slow network), tell the user clearly
    // and point them to the direct link / WhatsApp instead.
    window.setTimeout(() => {
      if (!enquiryLoaded && formHint) {
        formHint.innerHTML =
          'Form is taking a while to load — <a href="https://nueform.io/f/W8zEcZDJsB" target="_blank" rel="noopener">open it directly here</a> or message us on WhatsApp.';
      }
    }, 8000);

    // Track the enquiry form entering the viewport (once).
    if (enquiryWrap && 'IntersectionObserver' in window) {
      const enquiryObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackEvent('enquiry_form_view', { form_provider: 'nueform' });
            enquiryObserver.disconnect();
          }
        });
      }, { threshold: 0.4 });
      enquiryObserver.observe(enquiryWrap);
    }
  }

  /* ============================================================
     GA4 BUTTON-CLICK TRACKING
     View Work / Start a Project / Book a Call
     ============================================================ */
  function trackEvent(eventName, params) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, params || {});
    }
  }

  document.querySelectorAll('a.hero-cta, a.nav-cta').forEach(btn => {
    const label = btn.textContent.trim();
    btn.addEventListener('click', () => {
      if (label === 'View Work') {
        trackEvent('view_work_click', { button_label: label, location: 'hero' });
      } else if (label === 'Start a Project' || label === 'Start a project') {
        trackEvent('start_project_click', { button_label: label, location: btn.classList.contains('nav-cta') ? 'nav' : 'hero' });
      } else if (label === 'Book a Call') {
        trackEvent('book_a_call_click', { button_label: label, location: 'hero', destination: 'calendly' });
      }
    });
  });

  /* ---------------- WhatsApp click tracking ---------------- */
  document.querySelectorAll('.whatsapp-fab').forEach(btn => {
    btn.addEventListener('click', () => {
      trackEvent('whatsapp_click', { location: 'floating_button' });
    });
  });

  /* ============================================================
     COPY-TO-CLIPBOARD — email & phone number
     ============================================================ */
  const copyToast = document.getElementById('copyToast');
  let toastTimer = null;

  function showCopyToast(message) {
    if (!copyToast) return;
    copyToast.textContent = message;
    copyToast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      copyToast.classList.remove('is-visible');
    }, 2000);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // fallback for older browsers
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    try { document.execCommand('copy'); } catch (err) { /* ignore */ }
    document.body.removeChild(temp);
    return Promise.resolve();
  }

  document.querySelectorAll('a[href^="mailto:"], a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      const value = href.replace(/^mailto:|^tel:/, '');
      const isEmail = href.startsWith('mailto:');

      // Copy silently in the background; still allow default mail/dial app to open.
      copyText(value).then(() => {
        showCopyToast(isEmail ? 'Email copied!' : 'Number copied!');
      }).catch(() => { /* clipboard blocked — default mailto/tel action still works */ });

      trackEvent(isEmail ? 'email_click' : 'phone_click', { value });
    });
  });

  /* ============================================================
     SCROLL-SPY — highlight active nav link on scroll
     ============================================================ */
  const spySections = ['hero', 'work', 'studio', 'about', 'contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const spyLinkMap = new Map();
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    const id = link.getAttribute('href').replace('#', '');
    // "#top" maps to the hero section visually
    const targetId = (id === 'top') ? 'hero' : id;
    if (!spyLinkMap.has(targetId)) spyLinkMap.set(targetId, []);
    spyLinkMap.get(targetId).push(link);
  });

  function setActiveLink(sectionId) {
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('is-active-link'));
    const links = spyLinkMap.get(sectionId);
    if (links) links.forEach(a => a.classList.add('is-active-link'));
  }

  if ('IntersectionObserver' in window && spySections.length) {
    const spyIO = new IntersectionObserver((entries) => {
      // pick the entry closest to the top of viewport that's currently intersecting
      const visible = entries.filter(en => en.isIntersecting);
      if (visible.length > 0) {
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
    const toggleBackToTop = () => {
      backToTop.classList.toggle('is-visible', window.scrollY > 500);
    };
    toggleBackToTop();
    window.addEventListener('scroll', toggleBackToTop, { passive: true });

    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      trackEvent('back_to_top_click', {});
    });
  }

});
