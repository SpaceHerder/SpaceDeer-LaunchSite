/* ═══════════════════════════════════════════════════════════
   BOREALTRACK — Interaction Controller
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {

    // Simple, premium fade-up animations (Vercel/Apple style)
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      gsap.utils.toArray('.fade-up').forEach(elem => {
        let delay = 0;
        if (elem.classList.contains('delay-1')) delay = 0.15;
        if (elem.classList.contains('delay-2')) delay = 0.3;

        gsap.fromTo(elem,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: delay,
            ease: "power2.out",
            scrollTrigger: {
              trigger: elem,
              start: "top 90%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    }

    // Header Navigation Smooth Scroll
    const navBtns = document.querySelectorAll('.nav-glass a, .nav-contact, .btn-primary, .btn-secondary');

    navBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = btn.getAttribute('href');

        // Only prevent default and smooth scroll if it's an internal anchor
        if (targetId && targetId.startsWith('#')) {
          e.preventDefault();
          const targetEl = document.querySelector(targetId);

          if (targetEl) {
            const offsetTop = targetEl.getBoundingClientRect().top + window.pageYOffset;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
          }
        }
      });
    });

    // Header backdrop: transparent over the hero, opaque once the page moves
    const header = document.querySelector('.site-header');

    // Update Active Nav State on Scroll
    window.addEventListener('scroll', () => {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 40);

      let current = '';
      const sections = document.querySelectorAll('main, section');

      sections.forEach(section => {
        if (window.pageYOffset >= section.offsetTop - 150) {
          current = section.getAttribute('id');
        }
      });

      document.querySelectorAll('.nav-glass a').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('href') === `#${current}`) {
          btn.classList.add('active');
        }
      });
    });

    // Theme Switcher Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const getSavedTheme = () => localStorage.getItem('spaceherder-theme') || localStorage.getItem('spaceherd-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    
    const setTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('spaceherder-theme', theme);
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    };

    // Initialize saved or preferred theme
    setTheme(getSavedTheme());

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
      });
    }
  });
})();