import { auth, db } from "./firebase-config.js";
import { sendWelcomeEmail } from "./mail.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

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
  let currentUserProfile = null;

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
            <p class="auth-modal__intro">Sign in or create an account to manage bookings.</p>
          </div>
          <div class="auth-tabs" role="tablist" aria-label="Authentication">
            <button class="auth-tab is-active" type="button" role="tab" aria-selected="true" data-auth-tab="login">Login</button>
            <button class="auth-tab" type="button" role="tab" aria-selected="false" data-auth-tab="register">Register</button>
          </div>
          <div class="auth-panels">
            <div class="auth-panel is-active" role="tabpanel" data-auth-panel="login">
              <form class="auth-form" data-auth-form="login">
                <div class="auth-feedback" data-auth-feedback="login" role="status" aria-live="polite"></div>
                <label>
                  <span>Email</span>
                  <input type="email" name="login-email" autocomplete="email" placeholder="you@example.com" required>
                </label>
                <label>
                  <span>Password</span>
                  <input type="password" name="login-password" autocomplete="current-password" placeholder="••••••••" required>
                </label>
                <button type="button" class="auth-google" data-auth-google="login">
                  <span class="auth-google__icon" aria-hidden="true">
                    <img src="/assets/Google_%22G%22_logo.svg.png" alt="">
                  </span>
                  <span>Continue with Google</span>
                </button>
                <button type="submit" class="btn" data-auth-submit="login">Login</button>
              </form>
            </div>
            <div class="auth-panel" role="tabpanel" data-auth-panel="register">
              <form class="auth-form" data-auth-form="register">
                <div class="auth-feedback" data-auth-feedback="register" role="status" aria-live="polite"></div>
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
                    <label>
                      <span>Phone</span>
                      <input type="tel" name="register-phone" autocomplete="tel" placeholder="+27 62 495 2909" required>
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
                <button type="button" class="auth-google" data-auth-google="register">
                  <span class="auth-google__icon" aria-hidden="true">
                    <img src="/assets/Google_%22G%22_logo.svg.png" alt="">
                  </span>
                  <span>Continue with Google</span>
                </button>
                <button type="submit" class="btn" data-auth-submit="register">Create Account</button>
              </form>
            </div>
          </div>
          <div class="auth-profile" data-auth-profile hidden>
            <h4>Complete your profile</h4>
            <p class="auth-profile__intro">Add a few details so we can personalise your experience.</p>
            <div class="auth-feedback" data-auth-feedback="profile" role="status" aria-live="polite"></div>
            <form class="auth-form auth-profile__form" data-auth-profile-form>
              <div class="auth-form__row">
                <div class="auth-form__column">
                  <label>
                    <span>Name</span>
                    <input type="text" name="profile-name" autocomplete="name" placeholder="Your name">
                  </label>
                  <label>
                    <span>Phone</span>
                    <input type="tel" name="profile-phone" autocomplete="tel" placeholder="+27 62 495 2909">
                  </label>
                </div>
                <div class="auth-form__address">
                  <p class="auth-form__address-title">Address</p>
                  <div class="auth-form__address-grid">
                    <label class="full">
                      <span>Street Address</span>
                      <input type="text" name="profile-street" autocomplete="street-address" placeholder="123 Main Rd" required>
                    </label>
                    <label>
                      <span>Suburb</span>
                      <input type="text" name="profile-suburb" autocomplete="address-level3" placeholder="Claremont" required>
                    </label>
                    <label>
                      <span>City</span>
                      <input type="text" name="profile-city" autocomplete="address-level2" placeholder="Cape Town" required>
                    </label>
                    <label>
                      <span>Province</span>
                      <input type="text" name="profile-province" autocomplete="address-level1" placeholder="Western Cape" required>
                    </label>
                    <label>
                      <span>Postal Code</span>
                      <input type="text" name="profile-postal" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="7708" required>
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" class="btn" data-auth-profile-save>Save profile</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const openers = document.querySelectorAll("[data-auth-open]");
    const dialog = modal.querySelector(".auth-modal__dialog");
    const overlay = modal.querySelector(".auth-modal__overlay");
    const closers = modal.querySelectorAll("[data-auth-close]");
    const authTabs = modal.querySelector(".auth-tabs");
    const panelsWrap = modal.querySelector(".auth-panels");
    const tabs = modal.querySelectorAll("[data-auth-tab]");
    const panels = modal.querySelectorAll("[data-auth-panel]");
    const authTrigger = document.querySelector("[data-auth-open]");
    const authTriggerLabel = authTrigger?.querySelector(".header-login__label");
    const loginForm = modal.querySelector("[data-auth-form=\"login\"]");
    const registerForm = modal.querySelector("[data-auth-form=\"register\"]");
    const loginFeedback = modal.querySelector("[data-auth-feedback=\"login\"]");
    const registerFeedback = modal.querySelector("[data-auth-feedback=\"register\"]");
    const googleButtons = modal.querySelectorAll("[data-auth-google]");
    const completeProfileSection = modal.querySelector("[data-auth-profile]");
    const profileForm = completeProfileSection?.querySelector("[data-auth-profile-form]");
    const profileSaveButton = completeProfileSection?.querySelector("[data-auth-profile-save]");
    const profileFeedback = completeProfileSection?.querySelector("[data-auth-feedback=\"profile\"]");
    const body = document.body;
    let pendingProfileCompletion = null;

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

    const resetProfileStep = () => {
      authTabs?.removeAttribute("hidden");
      panelsWrap?.removeAttribute("hidden");
      pendingProfileCompletion = null;
      if (completeProfileSection) {
        completeProfileSection.classList.remove("is-active");
        completeProfileSection.hidden = true;
        profileForm?.reset?.();
        if (profileFeedback) {
          profileFeedback.textContent = "";
          profileFeedback.dataset.state = "";
        }
      }
    };

    const open = () => {
      resetProfileStep();
      setTab("login");
      modal.setAttribute("data-open", "true");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("modal-open");
      tabs[0]?.focus({ preventScroll: true });
    };
    const close = () => {
      if (modal.getAttribute("data-open") !== "true") return;
      resetProfileStep();
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

    const defaultSubmitLabels = {
      login: "Login",
      register: "Create Account"
    };

    const setAuthButtonLabel = (label) => {
      if (!authTriggerLabel) return;
      authTriggerLabel.textContent = label || "Login";
    };

    const setFeedback = (target, message, tone = "") => {
      if (!target) return;
      target.textContent = message;
      target.dataset.state = tone;
    };

    const toggleSubmitting = (form, isSubmitting, type) => {
      if (!form) return;
      const submit = form.querySelector("[type=\"submit\"]");
      if (!submit) return;
      submit.disabled = isSubmitting;
      if (isSubmitting) {
        submit.textContent = "Please wait...";
      } else {
        const key = type || submit.dataset.authSubmit;
        submit.textContent = defaultSubmitLabels[key] || submit.textContent;
      }
    };

    const toggleProfileSubmitting = (isSubmitting) => {
      if (!profileSaveButton) return;
      profileSaveButton.disabled = isSubmitting;
      profileSaveButton.textContent = isSubmitting ? "Saving..." : "Save profile";
    };

    const showCompleteProfileForm = (initialValues = {}) => {
      if (!completeProfileSection) return;
      const {
        name = "",
        phone = "",
        street = "",
        suburb = "",
        city = "",
        province = "",
        postalCode = ""
      } = initialValues;
      const nameInput = completeProfileSection.querySelector("[name=\"profile-name\"]");
      const phoneInput = completeProfileSection.querySelector("[name=\"profile-phone\"]");
      const streetInput = completeProfileSection.querySelector("[name=\"profile-street\"]");
      const suburbInput = completeProfileSection.querySelector("[name=\"profile-suburb\"]");
      const cityInput = completeProfileSection.querySelector("[name=\"profile-city\"]");
      const provinceInput = completeProfileSection.querySelector("[name=\"profile-province\"]");
      const postalInput = completeProfileSection.querySelector("[name=\"profile-postal\"]");
      if (nameInput) nameInput.value = name;
      if (phoneInput) phoneInput.value = phone;
      if (streetInput) streetInput.value = street;
      if (suburbInput) suburbInput.value = suburb;
      if (cityInput) cityInput.value = city;
      if (provinceInput) provinceInput.value = province;
      if (postalInput) postalInput.value = postalCode;
      authTabs?.setAttribute("hidden", "true");
      panelsWrap?.setAttribute("hidden", "true");
      completeProfileSection.hidden = false;
      completeProfileSection.classList.add("is-active");
    };

    const friendlyAuthError = (error) => {
      const code = error?.code || "";
      const messages = {
        "auth/email-already-in-use": "That email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/invalid-credential": "Invalid login details. Please try again.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/user-not-found": "No account found with that email.",
        "auth/weak-password": "Password should be at least 6 characters."
      };
      return messages[code] || "Something went wrong. Please try again.";
    };

    const isProfileComplete = (profile) => {
      if (!profile) return false;
      const hasValue = (value) => typeof value === "string" && value.trim() !== "";
      const addressFieldsComplete = ["street", "suburb", "city", "province", "postalCode"].every((key) => (
        hasValue(profile[key])
      ));
      return hasValue(profile.name) && hasValue(profile.phone) && addressFieldsComplete;
    };

    const applyProfile = (profile) => {
      currentUserProfile = profile;
      if (profile) {
        setAuthButtonLabel(profile.name || "My Account");
      } else {
        setAuthButtonLabel("Login");
      }
    };

    const composeAddress = (parts = {}) => {
      const {
        street = "",
        suburb = "",
        city = "",
        province = "",
        postalCode = "",
        fallbackAddress = ""
      } = parts;
      const segments = [street, suburb, city, province].map((value) => value?.trim()).filter(Boolean);
      const addressCore = segments.join(", ");
      const trimmedPostal = postalCode?.trim();
      const address = trimmedPostal ? [addressCore, trimmedPostal].filter(Boolean).join(", ") : addressCore;
      return address || fallbackAddress || "";
    };

    const buildUserDoc = (overrides = {}) => {
      const base = {
        name: "",
        email: "",
        phone: "",
        street: "",
        suburb: "",
        city: "",
        province: "",
        postalCode: "",
        address: "",
        role: "customer",
        createdAt: serverTimestamp(),
        ...overrides
      };
      return {
        ...base,
        address: composeAddress({
          street: base.street,
          suburb: base.suburb,
          city: base.city,
          province: base.province,
          postalCode: base.postalCode,
          fallbackAddress: base.address
        })
      };
    };

    const fetchOrCreateUserProfile = async (user, fallbackEmail = "", overrides = {}) => {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return {
          profile: {
            uid: user.uid,
            ...data,
            province: data.province || "",
            address: composeAddress({ ...data, fallbackAddress: data.address || "" })
          },
          wasCreated: false
        };
      }
      const payload = buildUserDoc({
        name: overrides.name ?? "",
        email: user.email || fallbackEmail || "",
        phone: overrides.phone ?? "",
        street: overrides.street ?? "",
        suburb: overrides.suburb ?? "",
        city: overrides.city ?? "",
        province: overrides.province ?? "",
        postalCode: overrides.postalCode ?? "",
        address: overrides.address ?? ""
      });
      await setDoc(ref, payload);
      return { profile: { uid: user.uid, ...payload }, wasCreated: true };
    };

    const handleRegister = async (event) => {
      event.preventDefault();
      if (!registerForm) return;
      setFeedback(registerFeedback, "");
      toggleSubmitting(registerForm, true, "register");
      const formData = new FormData(registerForm);
      const name = (formData.get("register-name") || "").trim();
      const email = (formData.get("register-email") || "").trim();
      const password = (formData.get("register-password") || "").trim();
      const phone = (formData.get("register-phone") || "").trim();
      const street = (formData.get("register-street") || "").trim();
      const suburb = (formData.get("register-suburb") || "").trim();
      const city = (formData.get("register-city") || "").trim();
      const province = (formData.get("register-province") || "").trim();
      const postalCode = (formData.get("register-postal") || "").trim();

      try {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        const payload = buildUserDoc({
          name,
          email,
          phone,
          street,
          suburb,
          city,
          province,
          postalCode
        });
        await setDoc(doc(db, "users", user.uid), payload);
        applyProfile({ uid: user.uid, ...payload });
        await sendWelcomeEmail(email, name);
        setFeedback(registerFeedback, "Account created successfully.", "success");
        close();
      } catch (error) {
        setFeedback(registerFeedback, friendlyAuthError(error), "error");
      } finally {
        toggleSubmitting(registerForm, false, "register");
      }
    };

    const handleLogin = async (event) => {
      event.preventDefault();
      if (!loginForm) return;
      setFeedback(loginFeedback, "");
      toggleSubmitting(loginForm, true, "login");
      const formData = new FormData(loginForm);
      const email = (formData.get("login-email") || "").trim();
      const password = (formData.get("login-password") || "").trim();

      try {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        const { profile } = await fetchOrCreateUserProfile(user, email);
        applyProfile(profile);
        setFeedback(loginFeedback, "Welcome back!", "success");
        close();
      } catch (error) {
        setFeedback(loginFeedback, friendlyAuthError(error), "error");
      } finally {
        toggleSubmitting(loginForm, false, "login");
      }
    };

    loginForm?.addEventListener("submit", handleLogin);
    registerForm?.addEventListener("submit", handleRegister);

    const handleGoogleSignIn = async (event) => {
      event.preventDefault();
      const source = event.currentTarget?.dataset.authGoogle || "login";
      const feedback = source === "register" ? registerFeedback : loginFeedback;
      setFeedback(feedback, "");
      setFeedback(profileFeedback, "");
      try {
        const provider = new GoogleAuthProvider();
        const { user } = await signInWithPopup(auth, provider);
        if (user) {
          const { profile, wasCreated } = await fetchOrCreateUserProfile(
            user,
            "",
            { name: user.displayName || "" }
          );
          if (isProfileComplete(profile)) {
            applyProfile(profile);
            if (wasCreated) {
              await sendWelcomeEmail(profile.email || "", profile.name || "");
            }
            console.log("Google sign-in success:", user.uid, user.email);
            setFeedback(feedback, "Signed in with Google.", "success");
            close();
          } else {
            pendingProfileCompletion = profile;
            showCompleteProfileForm({
              name: profile.name || user.displayName || "",
              phone: profile.phone || "",
              street: profile.street || "",
              suburb: profile.suburb || "",
              city: profile.city || "",
              province: profile.province || "",
              postalCode: profile.postalCode || ""
            });
            console.log("Google sign-in pending profile completion:", user.uid);
            setFeedback(feedback, "Almost there—please complete your profile.", "success");
          }
        }
      } catch (error) {
        console.error("Google sign-in error:", error);
        setFeedback(feedback, friendlyAuthError(error), "error");
      }
    };

    const handleProfileSave = async (event) => {
      event.preventDefault();
      if (!profileForm) return;
      const user = auth.currentUser;
      const formData = new FormData(profileForm);
      const name = (formData.get("profile-name") || "").trim();
      const phone = (formData.get("profile-phone") || "").trim();
      const street = (formData.get("profile-street") || "").trim();
      const suburb = (formData.get("profile-suburb") || "").trim();
      const city = (formData.get("profile-city") || "").trim();
      const province = (formData.get("profile-province") || "").trim();
      const postalCode = (formData.get("profile-postal") || "").trim();
      const address = composeAddress({ street, suburb, city, province, postalCode });
      setFeedback(profileFeedback, "");

      if (!user) {
        setFeedback(profileFeedback, "Please sign in again to save your profile.", "error");
        return;
      }
      if (!name || !phone || !street || !suburb || !city || !province || !postalCode) {
        setFeedback(profileFeedback, "Name, phone, and full address details are required.", "error");
        return;
      }

      toggleProfileSubmitting(true);
      try {
        await updateDoc(doc(db, "users", user.uid), {
          name,
          phone,
          street,
          suburb,
          city,
          province,
          postalCode,
          address
        });
        const updatedProfile = {
          ...(pendingProfileCompletion || currentUserProfile || {}),
          uid: user.uid,
          name,
          phone,
          street,
          suburb,
          city,
          province,
          postalCode,
          address
        };
        pendingProfileCompletion = null;
        applyProfile(updatedProfile);
        close();
      } catch (error) {
        console.error("Profile save error:", error);
        setFeedback(profileFeedback, "Could not save your profile. Please try again.", "error");
      } finally {
        toggleProfileSubmitting(false);
      }
    };

    googleButtons.forEach((button) => {
      button.addEventListener("click", handleGoogleSignIn);
    });

    profileForm?.addEventListener("submit", handleProfileSave);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        applyProfile(null);
        return;
      }
      if (pendingProfileCompletion && pendingProfileCompletion.uid === user.uid) {
        return;
      }
      try {
        const { profile } = await fetchOrCreateUserProfile(user);
        applyProfile(profile);
      } catch (error) {
        setFeedback(loginFeedback, "Could not load your account. Please try again.", "error");
      }
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
