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
    initAuthModal();
    initReveal();
    initHeroSlideshow();
    initHeroTilt();
    initInventoryEmptyState();
    stampYear();
  });

  function initNav(){
    const toggle = document.querySelector("[data-nav-toggle]");
    const menu = document.querySelector("[data-nav-menu]");
    if (!toggle || !menu) return;

    const overlay = document.querySelector("[data-nav-overlay]");
    const body = document.body;
    const MEDIA_BREAKPOINT = "(min-width: 821px)";
    const dropdownManager = initNavDropdowns(menu, MEDIA_BREAKPOINT);

    const open = () => {
      body.classList.add("nav-open");
      toggle.setAttribute("aria-expanded", "true");
    };
    const close = (focusBack = false) => {
      if (!body.classList.contains("nav-open")) return;
      body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
      dropdownManager?.closeAll();
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

  function initAuthModal(){
    const nav = document.querySelector("header .nav");
    if (nav && !nav.querySelector("[data-auth-open]")){
      const actions = document.createElement("div");
      actions.className = "nav-actions";
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "header-login";
      trigger.setAttribute("data-auth-open", "true");
      trigger.setAttribute("aria-label", "Open login modal");
      trigger.innerHTML = `
        <span class="header-login__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M9.5 6.5a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zm-1 0a5.5 5.5 0 1111 0 5.5 5.5 0 01-11 0zm1.83 7a5.64 5.64 0 00-1.72.28C6.99 14.35 6 15.57 6 17v2h16v-2c0-1.43-.99-2.65-2.61-3.22a5.64 5.64 0 00-1.72-.28H10.33z"/>
          </svg>
        </span>
        <span class="header-login__label">Login</span>
      `;
      actions.appendChild(trigger);
      nav.appendChild(actions);
    }

    let modal = document.querySelector("[data-auth-modal]");
    if (!modal){
      modal = document.createElement("div");
      modal.className = "auth-modal";
      modal.setAttribute("data-auth-modal", "true");
      modal.setAttribute("aria-hidden", "true");
      modal.innerHTML = `
        <div class="auth-modal__overlay" data-auth-close></div>
        <div class="auth-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
          <button type="button" class="auth-modal__close" aria-label="Close login modal" data-auth-close>&times;</button>
          <div class="auth-modal__header">
            <p class="pill">Account</p>
            <h3 id="authModalTitle">Access Revival</h3>
            <p class="auth-modal__intro">Sign in or create an account to manage bookings. This is a placeholder only.</p>
          </div>
          <div class="auth-tabs" role="tablist" aria-label="Authentication">
            <button class="auth-tab is-active" type="button" role="tab" aria-selected="true" data-auth-tab="login">Login</button>
            <button class="auth-tab" type="button" role="tab" aria-selected="false" data-auth-tab="register">Register</button>
          </div>
          <div class="auth-panels">
            <div class="auth-panel is-active" role="tabpanel" data-auth-panel="login">
              <form class="auth-form">
                <label>
                  <span>Email</span>
                  <input type="email" name="login-email" autocomplete="email" placeholder="you@example.com" required>
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" name="login-password" autocomplete="current-password" placeholder="••••••••" required>
                </label>
                <button type="button" class="auth-google">
                  <span class="auth-google__icon" aria-hidden="true">
                    <img src="/assets/Google_%22G%22_logo.svg.png" alt="">
                  </span>
                  <span>Continue with Google</span>
                </button>
                <button type="submit" class="btn">Login</button>
              </form>
            </div>
            <div class="auth-panel" role="tabpanel" data-auth-panel="register">
              <form class="auth-form">
                <div class="auth-form__row">
                  <div class="auth-form__column">
                    <label>
                      <span>Name</span>
                      <input type="text" name="register-name" autocomplete="name" placeholder="Your name" required>
                    </label>
                    <label>
                      <span>Email</span>
                      <input type="email" name="register-email" autocomplete="email" placeholder="you@example.com" required>
                    </label>
                    <label>
                      <span>Password</span>
                      <input type="password" name="register-password" autocomplete="new-password" placeholder="Create a password" required>
                    </label>
                  </div>
                  <div class="auth-form__address">
                    <p class="auth-form__address-title">Address</p>
                    <div class="auth-form__address-grid">
                      <label class="full">
                        <span>Street Address</span>
                        <input type="text" name="register-street" autocomplete="street-address" placeholder="123 Main Rd" required>
                      </label>
                      <label>
                        <span>Suburb</span>
                        <input type="text" name="register-suburb" autocomplete="address-level3" placeholder="Claremont" required>
                      </label>
                      <label>
                        <span>City</span>
                        <input type="text" name="register-city" autocomplete="address-level2" placeholder="Cape Town" required>
                      </label>
                      <label>
                        <span>Province</span>
                        <input type="text" name="register-province" autocomplete="address-level1" placeholder="Western Cape" required>
                      </label>
                      <label>
                        <span>Postal Code</span>
                        <input type="text" name="register-postal" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="7708" required>
                      </label>
                    </div>
                  </div>
                </div>
                <button type="button" class="auth-google">
                  <span class="auth-google__icon" aria-hidden="true">
                    <img src="/assets/Google_%22G%22_logo.svg.png" alt="">
                  </span>
                  <span>Continue with Google</span>
                </button>
                <button type="submit" class="btn">Create Account</button>
              </form>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const openers = document.querySelectorAll("[data-auth-open]");
    const dialog = modal.querySelector(".auth-modal__dialog");
    const overlay = modal.querySelector(".auth-modal__overlay");
    const closers = modal.querySelectorAll("[data-auth-close]");
    const tabs = modal.querySelectorAll("[data-auth-tab]");
    const panels = modal.querySelectorAll("[data-auth-panel]");
    const body = document.body;

    const setTab = (name) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.authTab === name;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.setAttribute("tabindex", isActive ? "0" : "-1");
      });
      panels.forEach((panel) => {
        const isActive = panel.dataset.authPanel === name;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    };
    setTab("login");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setTab(tab.dataset.authTab));
    });

    const open = () => {
      modal.setAttribute("data-open", "true");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("modal-open");
      tabs[0]?.focus({ preventScroll: true });
    };
    const close = () => {
      if (modal.getAttribute("data-open") !== "true") return;
      modal.setAttribute("data-open", "false");
      modal.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
    };

    openers.forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        open();
      });
    });

    closers.forEach((btn) => btn.addEventListener("click", close));
    overlay?.addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });

    modal.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", (event) => event.preventDefault());
    });

    dialog?.addEventListener("click", (event) => event.stopPropagation());
  }

  function initInventoryEmptyState(){
    document.querySelectorAll(".inventory-grid").forEach((grid) => {
      if (grid.dataset.forceEmpty === "true"){
        grid.removeAttribute("data-has-cars");
        return;
      }
      const cards = grid.querySelectorAll(".inventory-card");
      if (cards.length){
        grid.setAttribute("data-has-cars", "true");
      } else {
        grid.removeAttribute("data-has-cars");
      }
    });
  }

  function initNavDropdowns(menu, breakpointQuery){
    const dropdowns = Array.from(menu.querySelectorAll("[data-nav-dropdown]"));
    if (!dropdowns.length) return null;

    const closeAll = () => {
      dropdowns.forEach((dropdown) => {
        dropdown.setAttribute("data-open", "false");
        const toggle = dropdown.querySelector("[data-nav-dropdown-toggle]");
        toggle?.setAttribute("aria-expanded", "false");
      });
    };

    dropdowns.forEach((dropdown) => {
      const toggle = dropdown.querySelector("[data-nav-dropdown-toggle]");
      if (!toggle) return;

      const setExpanded = (value) => {
        toggle.setAttribute("aria-expanded", String(value));
      };

      toggle.addEventListener("click", (event) => {
        if (window.matchMedia(breakpointQuery).matches) return;
        event.preventDefault();
        const isOpen = dropdown.getAttribute("data-open") === "true";
        dropdown.setAttribute("data-open", String(!isOpen));
        setExpanded(!isOpen);
      });

      dropdown.addEventListener("mouseenter", () => {
        if (!window.matchMedia(breakpointQuery).matches) return;
        setExpanded(true);
      });
      dropdown.addEventListener("mouseleave", () => {
        if (!window.matchMedia(breakpointQuery).matches) return;
        setExpanded(false);
      });
      dropdown.addEventListener("focusin", () => {
        if (!window.matchMedia(breakpointQuery).matches) return;
        setExpanded(true);
      });
      dropdown.addEventListener("focusout", (event) => {
        if (!window.matchMedia(breakpointQuery).matches) return;
        if (!dropdown.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      });
    });

    return { closeAll };
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
