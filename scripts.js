/**
 * Site-wide interactions:
 * - Mobile navigation toggle
 * - Scroll-based reveals
 * - Hero slideshow + subtle tilt effect
 * - Dynamic year stamp in the footer
 */
(function(){
  const ready = (fn) => (
    document.readyState !== "loading"
      ? fn()
      : document.addEventListener("DOMContentLoaded", fn)
  );

  ready(() => {
    initNav();
    initReveal();
    initHeroSlideshow();
    initHeroTilt();
    stampYear();
  });

  function initNav(){
    const toggle = document.querySelector("[data-nav-toggle]");
    const menu = document.querySelector("[data-nav-menu]");
    if (!toggle || !menu) return;

    const overlay = document.querySelector("[data-nav-overlay]");
    const body = document.body;
    const MEDIA_BREAKPOINT = "(min-width: 821px)";

    const open = () => {
      body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    };
    const close = (focusBack = false) => {
      if (!body.classList.contains("nav-open")) return;
      body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      if (focusBack) toggle.focus();
    };

    toggle.addEventListener("click", () => {
      body.classList.contains("nav-open") ? close() : open();
    });

    overlay?.addEventListener("click", () => close());

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => close());
    });

    window.addEventListener("resize", () => {
      if (window.matchMedia(MEDIA_BREAKPOINT).matches) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close(true);
    });
  }

  function initReveal(){
    const revealEls = document.querySelectorAll(".reveal,[data-animate]");
    if (!revealEls.length) return;

    if (!("IntersectionObserver" in window)){
      revealEls.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18 });

    revealEls.forEach((el) => observer.observe(el));
  }

  function initHeroSlideshow(){
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    document.querySelectorAll("[data-hero-slideshow]").forEach((hero) => {
      const slides = hero.querySelectorAll(".slide");
      if (slides.length < 2) return;

      let index = 0;
      const speed = Number(hero.dataset.heroSlideshow) || 3200;
      let timer = null;
      slides[index].classList.add("active");

      const next = () => {
        slides[index].classList.remove("active");
        index = (index + 1) % slides.length;
        slides[index].classList.add("active");
      };
      const start = () => {
        if (timer) return;
        timer = setInterval(next, speed);
      };
      const stop = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
      };

      start();

      const resumeOnVisibility = () => (document.hidden ? stop() : start());
      document.addEventListener("visibilitychange", resumeOnVisibility);

      if (window.matchMedia("(pointer:fine)").matches){
        hero.addEventListener("mouseenter", stop);
        hero.addEventListener("mouseleave", start);
      }
    });
  }

  function initHeroTilt(){
    const hero = document.querySelector(".hero");
    if (!hero) return;
    if (!window.matchMedia("(pointer:fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const setTilt = (event) => {
      const rect = hero.getBoundingClientRect();
      const ratioX = (event.clientX - rect.left) / rect.width - 0.5;
      const ratioY = (event.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty("--tiltX", `${ratioX * 28}px`);
      hero.style.setProperty("--tiltY", `${ratioY * 20}px`);
    };

    hero.addEventListener("pointermove", setTilt);
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--tiltX", "0px");
      hero.style.setProperty("--tiltY", "0px");
    });
  }

  function stampYear(){
    const year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = year;
    });
  }
})();
