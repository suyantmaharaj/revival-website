/**
 * Site-wide interactions
 * - Mobile navigation toggle with overlay + escape handling.
 */
(function () {
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  const overlay = document.querySelector('[data-nav-overlay]');
  if (!toggle || !menu) return;

  const body = document.body;
  const MEDIA_BREAKPOINT = '(min-width: 821px)';

  function openNav() {
    body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeNav(setFocus = false) {
    if (!body.classList.contains('nav-open')) return;
    body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (setFocus) toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (body.classList.contains('nav-open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  overlay?.addEventListener('click', () => closeNav());

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeNav());
  });

  window.addEventListener('resize', () => {
    if (window.matchMedia(MEDIA_BREAKPOINT).matches) {
      closeNav();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav(true);
    }
  });
})();

