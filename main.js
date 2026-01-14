import { auth, db } from "./firebase-config.js";
import { sendWelcomeEmail } from "./mail.js";
import { sendOtpEmail } from "./otp-mail.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
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
  const PROVINCE_LOCK = "Western Cape";
  let currentOtp = null;
  let currentOtpEmail = null;
  let otpExpiresAt = null;
  let emailVerified = false;

  function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  const getOtpInputs = () => Array.from(document.querySelectorAll("[data-otp-input]"));

  function clearOtpInputs() {
    const inputs = getOtpInputs();
    inputs.forEach((input) => {
      input.value = "";
    });
    inputs[0]?.focus();
  }

  function readOtpValue() {
    return getOtpInputs()
      .map((input) => (input.value || "").trim())
      .join("");
  }

  const resetOtpState = () => {
    currentOtp = null;
    currentOtpEmail = null;
    otpExpiresAt = null;
    emailVerified = false;
    clearOtpInputs();
  };

  async function sendVerificationCode(email, name = "") {
    if (!email) throw new Error("Email is required to send verification.");
    const otp = generateOtp();
    currentOtp = otp;
    currentOtpEmail = email.toLowerCase();
    otpExpiresAt = Date.now() + 10 * 60 * 1000;
    emailVerified = false;
    clearOtpInputs();
    await sendOtpEmail(currentOtpEmail, name, otp);
  }

  function validateOtpEntry(email) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const code = readOtpValue();

    if (!currentOtp || !currentOtpEmail || !otpExpiresAt) {
      return { valid: false, message: "Please tap Create Account to request a new verification code." };
    }
    if (!normalizedEmail || normalizedEmail !== currentOtpEmail) {
      return { valid: false, message: "The email does not match the verification request." };
    }
    if (Date.now() > otpExpiresAt) {
      return { valid: false, message: "The verification code has expired. Tap Create Account again to resend." };
    }
    if (code.length !== 6) {
      return { valid: false, message: "Please enter the 6-digit verification code." };
    }
    if (code !== currentOtp) {
      return { valid: false, message: "The verification code is incorrect." };
    }

    return { valid: true, code };
  }

  ready(() => {
    initNav();
    initAuthModal();
    initOtpInputs();
    initReveal();
    initHeroSlideshow();
    initHeroTilt();
    initInventoryEmptyState();
    stampYear();
  });

  function initOtpInputs() {
    const inputs = getOtpInputs();
    inputs.forEach((input, index) => {
      input.addEventListener("input", (event) => {
        const value = event.target.value.replace(/\D/g, "").slice(0, 1);
        event.target.value = value;
        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });
      input.addEventListener("paste", (event) => {
        const paste = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, inputs.length);
        if (!paste) return;
        event.preventDefault();
        paste.split("").forEach((digit, idx) => {
          if (inputs[idx]) {
            inputs[idx].value = digit;
          }
        });
        inputs[Math.min(paste.length, inputs.length) - 1]?.focus();
      });
    });
  }

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
        <span class="header-login__caret" aria-hidden="true"></span>
      `;
      actions.appendChild(trigger);
      const accountMenu = document.createElement("div");
      accountMenu.className = "account-menu";
      accountMenu.setAttribute("hidden", "true");
      accountMenu.innerHTML = `
        <button type="button" class="account-menu__item" data-account-menu="account">My Account</button>
        <button type="button" class="account-menu__item" data-account-menu="logout">Log out</button>
      `;
      actions.appendChild(accountMenu);
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
            <h3 id="authModalTitle" data-auth-header-title>Access Revival</h3>
            <p class="auth-modal__intro" data-auth-header-intro>Sign in or create an account to manage bookings.</p>
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
                <button type="button" class="auth-google" data-auth-google="login" hidden>
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
                      <input type="text" id="register-name" name="register-name" autocomplete="name" placeholder="Your name" required>
                    </label>
                    <label>
                      <span>Email</span>
                      <input type="email" id="register-email" name="register-email" autocomplete="email" placeholder="you@example.com" required>
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
                        <input type="text" name="register-province" autocomplete="address-level1" placeholder="Western Cape" value="Western Cape" readonly aria-readonly="true">
                      </label>
                      <label>
                        <span>Postal Code</span>
                        <input type="text" name="register-postal" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="7708" required>
                      </label>
                    </div>
                  </div>
                </div>
                <button type="button" class="auth-google" data-auth-google="register" hidden>
                  <span class="auth-google__icon" aria-hidden="true">
                    <img src="/assets/Google_%22G%22_logo.svg.png" alt="">
                  </span>
                  <span>Continue with Google</span>
                </button>
                <button type="submit" class="btn" data-auth-submit="register">Create Account</button>
              </form>
            </div>
          </div>
          <div class="auth-verify" data-auth-verify hidden>
            <div class="auth-verify__header">
              <h4>Verify your email</h4>
              <p>We sent a 6-digit code to <strong data-verify-email>you@example.com</strong>. Enter it to finish creating your account.</p>
            </div>
            <div class="otp-inputs" data-otp-inputs>
              <input type="text" id="otp-input-1" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 1">
              <input type="text" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 2">
              <input type="text" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 3">
              <input type="text" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 4">
              <input type="text" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 5">
              <input type="text" inputmode="numeric" pattern="\\d*" maxlength="1" class="otp-input" data-otp-input aria-label="Verification code digit 6">
            </div>
            <div class="auth-feedback" data-auth-feedback="verify" role="status" aria-live="polite"></div>
            <div class="auth-verify__actions">
              <button type="button" class="btn outline" data-verify-back>Back</button>
              <button type="button" class="btn" id="verify-otp-button" data-verify-submit>Verify & Create Account</button>
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
                      <input type="text" name="profile-province" autocomplete="address-level1" placeholder="Western Cape" value="Western Cape" readonly aria-readonly="true">
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
          <div class="auth-account" data-auth-account hidden>
            <div class="auth-account__header">
              <div class="auth-account__title">
                <div class="auth-account__avatar" aria-hidden="true" data-auth-account-initial>R</div>
                <div class="auth-account__text">
                  <h4 data-auth-account-name>Account details</h4>
                  <p class="auth-account__meta" data-auth-member-since></p>
                </div>
              </div>
              <button type="button" class="auth-account__edit" data-auth-account-edit>Edit details</button>
            </div>
              <div class="auth-account__stats" data-auth-account-stats>
                <div class="auth-account__stat">
                  <p>Primary Email</p>
                  <strong data-auth-account-email title="you@example.com">you@example.com</strong>
                </div>
                <div class="auth-account__stat">
                  <p>Phone</p>
                  <strong data-auth-account-phone title="+27 62 495 2909">+27 62 495 2909</strong>
                </div>
                <div class="auth-account__stat">
                  <p>Address</p>
                  <strong data-auth-account-address title="Street, suburb, city, province">Street, suburb, city, province</strong>
                </div>
              </div>
              <div class="auth-feedback" data-auth-feedback="account" role="status" aria-live="polite"></div>
              <div class="auth-account__form" data-auth-account-form-wrap hidden>
                <form class="auth-form" data-auth-account-form>
                  <div class="auth-form__row">
                    <div class="auth-form__column">
                      <label>
                        <span>Name</span>
                        <input type="text" name="account-name" autocomplete="name" placeholder="Your name" disabled>
                      </label>
                      <label>
                        <span>Email</span>
                        <input type="email" name="account-email" autocomplete="email" placeholder="you@example.com" required>
                      </label>
                      <label>
                        <span>Phone</span>
                        <input type="tel" name="account-phone" autocomplete="tel" placeholder="+27 62 495 2909" required>
                      </label>
                    </div>
                    <div class="auth-form__address">
                      <p class="auth-form__address-title">Address</p>
                      <div class="auth-form__address-grid">
                        <label class="full">
                          <span>Street Address</span>
                          <input type="text" name="account-street" autocomplete="street-address" placeholder="123 Main Rd" required>
                        </label>
                        <label>
                          <span>Suburb</span>
                          <input type="text" name="account-suburb" autocomplete="address-level3" placeholder="Claremont" required>
                        </label>
                        <label>
                          <span>City</span>
                          <input type="text" name="account-city" autocomplete="address-level2" placeholder="Cape Town" required>
                        </label>
                        <label>
                          <span>Province</span>
                          <input type="text" name="account-province" autocomplete="address-level1" placeholder="Western Cape" value="Western Cape" readonly aria-readonly="true">
                        </label>
                        <label>
                          <span>Postal Code</span>
                          <input type="text" name="account-postal" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4,6}" placeholder="7708" required>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div class="auth-account__actions">
                  <button type="button" class="btn outline" data-auth-account-cancel>Cancel</button>
                  <button type="submit" class="btn" data-auth-account-save>Save changes</button>
                </div>
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
    const authTabs = modal.querySelector(".auth-tabs");
    const panelsWrap = modal.querySelector(".auth-panels");
    const tabs = modal.querySelectorAll("[data-auth-tab]");
    const panels = modal.querySelectorAll("[data-auth-panel]");
    const headerTitle = modal.querySelector("[data-auth-header-title]");
    const headerIntro = modal.querySelector("[data-auth-header-intro]");
    const authTrigger = document.querySelector("[data-auth-open]");
    const authTriggerLabel = authTrigger?.querySelector(".header-login__label");
    const loginForm = modal.querySelector("[data-auth-form=\"login\"]");
    const registerForm = modal.querySelector("[data-auth-form=\"register\"]");
    const loginFeedback = modal.querySelector("[data-auth-feedback=\"login\"]");
      const registerFeedback = modal.querySelector("[data-auth-feedback=\"register\"]");
    const verifySection = modal.querySelector("[data-auth-verify]");
    const verifyEmailLabel = modal.querySelector("[data-verify-email]");
    const verifyFeedback = modal.querySelector("[data-auth-feedback=\"verify\"]");
    const verifyBackButton = modal.querySelector("[data-verify-back]");
    const verifySubmitButton = modal.querySelector("[data-verify-submit]");
    const googleButtons = modal.querySelectorAll("[data-auth-google]");
    const completeProfileSection = modal.querySelector("[data-auth-profile]");
    const profileForm = completeProfileSection?.querySelector("[data-auth-profile-form]");
    const profileSaveButton = completeProfileSection?.querySelector("[data-auth-profile-save]");
    const profileFeedback = completeProfileSection?.querySelector("[data-auth-feedback=\"profile\"]");
    let accountMenu = document.querySelector(".account-menu");
    if (!accountMenu && nav) {
      const actions = nav.querySelector(".nav-actions");
      if (actions) {
        accountMenu = document.createElement("div");
        accountMenu.className = "account-menu";
        accountMenu.setAttribute("hidden", "true");
        accountMenu.innerHTML = `
          <button type="button" class="account-menu__item" data-account-menu="account">My Account</button>
          <button type="button" class="account-menu__item" data-account-menu="logout">Log out</button>
        `;
        actions.appendChild(accountMenu);
      }
    }
    const accountSection = modal.querySelector("[data-auth-account]");
    const accountForm = accountSection?.querySelector("[data-auth-account-form]");
    const accountFormWrap = accountSection?.querySelector("[data-auth-account-form-wrap]");
    const accountSaveButton = accountSection?.querySelector("[data-auth-account-save]");
    const accountFeedback = modal.querySelector("[data-auth-feedback=\"account\"]");
    const memberSinceLabel = modal.querySelector("[data-auth-member-since]");
    const accountNameLabel = modal.querySelector("[data-auth-account-name]");
    const accountEmailLabel = modal.querySelector("[data-auth-account-email]");
    const accountPhoneLabel = modal.querySelector("[data-auth-account-phone]");
    const accountAddressLabel = modal.querySelector("[data-auth-account-address]");
    const accountInitial = modal.querySelector("[data-auth-account-initial]");
    const accountStats = modal.querySelector("[data-auth-account-stats]");
    const accountEditButton = modal.querySelector("[data-auth-account-edit]");
    const accountCancelButton = modal.querySelector("[data-auth-account-cancel]");
    const body = document.body;
    let pendingProfileCompletion = null;
    let pendingRegistration = null;

    const HEADER_COPY = {
      default: {
        title: "Access Revival",
        intro: "Sign in or create an account to manage bookings."
      },
      verify: {
        title: "Verify your email",
        intro: "Enter the 6-digit code we just sent to continue."
      },
      account: {
        title: "My Account",
        intro: ""
      }
    };

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

    const setHeaderMode = (mode = "default") => {
      const copy = HEADER_COPY[mode] || HEADER_COPY.default;
      modal.classList.toggle("auth-modal--account", mode === "account");
      if (headerTitle) headerTitle.textContent = copy.title;
      if (headerIntro) headerIntro.textContent = copy.intro;
      if (mode !== "account" && accountNameLabel) {
        accountNameLabel.textContent = "Account details";
      }
    };

    const setAccountEditing = (editing) => {
      accountSection?.classList.toggle("is-editing", editing);
      if (accountFormWrap) accountFormWrap.hidden = !editing;
      if (accountStats) accountStats.hidden = editing;
      if (accountEditButton) accountEditButton.hidden = editing;
      if (accountCancelButton) accountCancelButton.hidden = !editing;
      if (editing) {
        accountForm?.querySelector("[name=\"account-email\"]")?.focus({ preventScroll: true });
      }
    };

    const showVerifyStep = (email) => {
      if (!verifySection) return;
      setHeaderMode("verify");
      authTabs?.setAttribute("hidden", "true");
      panelsWrap?.setAttribute("hidden", "true");
      verifySection.hidden = false;
      verifySection.classList.add("is-active");
      if (verifyEmailLabel) verifyEmailLabel.textContent = email || "";
      clearOtpInputs();
      verifySection.querySelector("[data-otp-input]")?.focus({ preventScroll: true });
    };

    const resetVerifyStep = () => {
      if (!verifySection) return;
      verifySection.classList.remove("is-active");
      verifySection.hidden = true;
      setFeedback(verifyFeedback, "");
      authTabs?.removeAttribute("hidden");
      panelsWrap?.removeAttribute("hidden");
      setHeaderMode("default");
      clearOtpInputs();
    };

    setTab("login");
    setHeaderMode("default");
    setAccountEditing(false);

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

    const resetAccountSection = () => {
      if (!accountSection) return;
      accountSection.classList.remove("is-active");
      accountSection.hidden = true;
      accountForm?.reset?.();
      setFeedback(accountFeedback, "");
      if (memberSinceLabel) {
        memberSinceLabel.textContent = "";
      }
      authTabs?.removeAttribute("hidden");
      panelsWrap?.removeAttribute("hidden");
      setHeaderMode("default");
      setAccountEditing(false);
    };

    const open = () => {
      resetProfileStep();
      resetAccountSection();
      resetVerifyStep();
      resetOtpState();
      pendingRegistration = null;
      const shouldShowAccount = Boolean(currentUserProfile);
      if (shouldShowAccount) {
        showAccountSection(currentUserProfile);
      } else {
        setTab("login");
        setHeaderMode("default");
      }
      modal.setAttribute("data-open", "true");
      modal.setAttribute("aria-hidden", "false");
      body.classList.add("modal-open");
      if (shouldShowAccount) {
        accountForm?.querySelector("input:not([disabled])")?.focus({ preventScroll: true });
      } else {
        tabs[0]?.focus({ preventScroll: true });
      }
    };
    const close = () => {
      if (modal.getAttribute("data-open") !== "true") return;
      resetProfileStep();
      resetAccountSection();
      resetVerifyStep();
      resetOtpState();
      pendingRegistration = null;
      modal.setAttribute("data-open", "false");
      modal.setAttribute("aria-hidden", "true");
      body.classList.remove("modal-open");
    };

    const setMenuExpanded = (expanded) => {
      authTrigger?.setAttribute("aria-expanded", String(expanded));
    };

    const closeAccountMenu = () => {
      if (!accountMenu) return;
      accountMenu.setAttribute("hidden", "true");
      accountMenu.setAttribute("data-open", "false");
      setMenuExpanded(false);
    };
    const toggleAccountMenu = () => {
      if (!accountMenu) return;
      const isOpen = accountMenu.getAttribute("data-open") === "true";
      accountMenu.hidden = isOpen;
      accountMenu.setAttribute("data-open", isOpen ? "false" : "true");
      setMenuExpanded(!isOpen);
    };

    openers.forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        if (trigger.dataset.authState === "logged-in") {
          toggleAccountMenu();
          return;
        }
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
    document.addEventListener("click", (event) => {
      if (!accountMenu) return;
      if (event.target === accountMenu || accountMenu.contains(event.target)) return;
      if (event.target === authTrigger || authTrigger?.contains(event.target)) return;
      closeAccountMenu();
    });

    const defaultSubmitLabels = {
      login: "Login",
      register: "Create Account"
    };

    const setAuthButtonLabel = (label, isLoggedIn = false) => {
      if (!authTrigger) return;
      const firstName = (label || "").split(" ")[0] || "Login";
      if (authTriggerLabel) {
        authTriggerLabel.textContent = isLoggedIn ? `Hi, ${firstName}` : (label || "Login");
      }
      authTrigger.setAttribute("data-auth-state", isLoggedIn ? "logged-in" : "logged-out");
      authTrigger.classList.toggle("header-login--greeting", isLoggedIn);
      if (isLoggedIn) {
        authTrigger.removeAttribute("aria-label");
        authTrigger.removeAttribute("data-auth-open");
        authTrigger.setAttribute("aria-expanded", String(accountMenu?.getAttribute("data-open") === "true"));
      } else {
        authTrigger.setAttribute("aria-label", "Open login modal");
        authTrigger.setAttribute("data-auth-open", "true");
        authTrigger.setAttribute("aria-expanded", "false");
      }
      if (accountMenu) {
        accountMenu.hidden = !isLoggedIn;
      }
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

    const toggleAccountSubmitting = (isSubmitting) => {
      if (!accountSaveButton) return;
      accountSaveButton.disabled = isSubmitting;
      accountSaveButton.textContent = isSubmitting ? "Saving..." : "Save changes";
    };

    const toggleVerifySubmitting = (isSubmitting) => {
      if (!verifySubmitButton) return;
      verifySubmitButton.disabled = isSubmitting;
      verifySubmitButton.textContent = isSubmitting ? "Verifying..." : "Verify & Create Account";
    };

    const formatMemberSince = (value) => {
      if (!value) return "";
      try {
        const date = value.toDate ? value.toDate() : (value instanceof Date ? value : new Date(value));
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      } catch (error) {
        console.warn("Could not format createdAt", error);
        return "";
      }
    };

    const showAccountSection = (profile = {}) => {
      if (!accountSection) return;
      setHeaderMode("account");
      setAccountEditing(false);
      authTabs?.setAttribute("hidden", "true");
      panelsWrap?.setAttribute("hidden", "true");
      accountSection.hidden = false;
      accountSection.classList.add("is-active");
      const nameInput = accountForm?.querySelector("[name=\"account-name\"]");
      const emailInput = accountForm?.querySelector("[name=\"account-email\"]");
      const phoneInput = accountForm?.querySelector("[name=\"account-phone\"]");
      const streetInput = accountForm?.querySelector("[name=\"account-street\"]");
      const suburbInput = accountForm?.querySelector("[name=\"account-suburb\"]");
      const cityInput = accountForm?.querySelector("[name=\"account-city\"]");
      const provinceInput = accountForm?.querySelector("[name=\"account-province\"]");
      const postalInput = accountForm?.querySelector("[name=\"account-postal\"]");
      if (nameInput) nameInput.value = profile.name || "";
      if (emailInput) emailInput.value = profile.email || "";
      if (phoneInput) phoneInput.value = profile.phone || "";
      if (streetInput) streetInput.value = profile.street || "";
      if (suburbInput) suburbInput.value = profile.suburb || "";
      if (cityInput) cityInput.value = profile.city || "";
      if (provinceInput) provinceInput.value = profile.province || PROVINCE_LOCK;
      if (postalInput) postalInput.value = profile.postalCode || "";
      const addressValue = composeAddress({
        street: profile.street,
        suburb: profile.suburb,
        city: profile.city,
        province: profile.province,
        postalCode: profile.postalCode,
        fallbackAddress: profile.address
      }) || "Add your address";
      const nameValue = profile.name || "My account";
      const emailValue = profile.email || "Add your email";
      const phoneValue = profile.phone || "Add your phone";
      if (accountNameLabel) accountNameLabel.textContent = nameValue;
      if (accountEmailLabel) {
        accountEmailLabel.textContent = emailValue;
        accountEmailLabel.setAttribute("title", emailValue);
      }
      if (accountPhoneLabel) {
        accountPhoneLabel.textContent = phoneValue;
        accountPhoneLabel.setAttribute("title", phoneValue);
      }
      if (accountAddressLabel) {
        accountAddressLabel.textContent = addressValue;
        accountAddressLabel.setAttribute("title", addressValue);
      }
      if (accountInitial) {
        const source = (profile.name || profile.email || "R").trim();
        accountInitial.textContent = (source[0] || "R").toUpperCase();
      }
      if (memberSinceLabel) {
        const since = formatMemberSince(profile.createdAt);
        memberSinceLabel.textContent = since ? `Member since ${since}` : "";
      }
      setFeedback(accountFeedback, "");
    };

    const showCompleteProfileForm = (initialValues = {}) => {
      if (!completeProfileSection) return;
      const {
        name = "",
        phone = "",
        street = "",
        suburb = "",
        city = "",
        province = PROVINCE_LOCK,
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
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/operation-not-allowed": "Email/password sign-in is not enabled. Please enable it in Firebase Auth settings."
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
        setAuthButtonLabel(profile.name || "My Account", true);
      } else {
        setAuthButtonLabel("Login", false);
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
        province: PROVINCE_LOCK,
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
            province: data.province || PROVINCE_LOCK,
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
      const formData = new FormData(registerForm);
      const name = (formData.get("register-name") || "").trim();
      const registerEmail = (formData.get("register-email") || "").trim();
      const password = (formData.get("register-password") || "").trim();
      const phone = (formData.get("register-phone") || "").trim();
      const street = (formData.get("register-street") || "").trim();
      const suburb = (formData.get("register-suburb") || "").trim();
      const city = (formData.get("register-city") || "").trim();
      const province = PROVINCE_LOCK;
      const postalCode = (formData.get("register-postal") || "").trim();

      const validateRegisterInputs = () => {
        const lettersSpacesHyphens = /^[A-Za-z][A-Za-z\s-]{1,}$/;
        if (!name || !lettersSpacesHyphens.test(name)) {
          return "Please enter your name using letters, spaces, or hyphens only.";
        }
        if (!registerEmail) {
          return "Email is required.";
        }
        if (!password || password.length < 6) {
          return "Password must be at least 6 characters.";
        }
        const phoneDigits = phone.replace(/\D/g, "");
        if (phoneDigits.length !== 10) {
          return "Phone number must be 10 digits.";
        }
        if (!street || street.length < 5 || !/[A-Za-z]/.test(street) || !/\d/.test(street)) {
          return "Street address should include a number and street name.";
        }
        if (!suburb || !lettersSpacesHyphens.test(suburb)) {
          return "Suburb should use letters, spaces, or hyphens.";
        }
        if (!city || !lettersSpacesHyphens.test(city)) {
          return "City should use letters, spaces, or hyphens.";
        }
        if (!postalCode || !/^\d{4,6}$/.test(postalCode)) {
          return "Postal code must be 4-6 digits.";
        }
        return "";
      };

        const validationMessage = validateRegisterInputs();
      if (validationMessage) {
        setFeedback(registerFeedback, validationMessage, "error");
        return;
      }

      const email = registerEmail.toLowerCase();
      pendingRegistration = {
        name,
        email,
        password,
        phone,
        street,
        suburb,
        city,
        province,
        postalCode
      };

      toggleSubmitting(registerForm, true, "register");

      try {
        await sendVerificationCode(email, name);
        showVerifyStep(email);
        setFeedback(registerFeedback, "");
        setFeedback(verifyFeedback, "We sent a verification code to your email.", "success");
      } catch (error) {
        console.error("Error sending verification code:", error);
        setFeedback(registerFeedback, "We couldn't send the verification code. Please try again.", "error");
        pendingRegistration = null;
      } finally {
        toggleSubmitting(registerForm, false, "register");
      }
    };

    const handleVerifyOtp = async (event) => {
      event.preventDefault?.();
      if (!pendingRegistration) {
        resetVerifyStep();
        setTab("register");
        setFeedback(registerFeedback, "Please fill in your details and tap Create Account to get a code.", "error");
        return;
      }

      const otpCheck = validateOtpEntry(pendingRegistration.email);
      if (!otpCheck.valid) {
        setFeedback(verifyFeedback, otpCheck.message, "error");
        return;
      }

      emailVerified = true;
      toggleVerifySubmitting(true);

      try {
        const { password, ...profileFields } = pendingRegistration;
        const payload = buildUserDoc(profileFields);
        const { user } = await createUserWithEmailAndPassword(auth, profileFields.email, password);
        await setDoc(doc(db, "users", user.uid), payload);
        applyProfile({ uid: user.uid, ...payload });
        try {
          await sendWelcomeEmail(profileFields.email, profileFields.name);
        } catch (emailError) {
          console.error("Welcome email send failed:", emailError);
        }
        setFeedback(verifyFeedback, "Email verified. Signing you in...", "success");
        close();
        window.location.href = "/";
      } catch (error) {
        console.error("Verify & create account error:", error);
        if (error?.code === "auth/email-already-in-use") {
          try {
            const { email, password } = pendingRegistration || {};
            const { user } = await signInWithEmailAndPassword(auth, email, password);
            const { profile } = await fetchOrCreateUserProfile(user, email);
            applyProfile(profile);
            setFeedback(verifyFeedback, "Account already exists. Signing you in...", "success");
            close();
            window.location.href = "/";
            return;
          } catch (signInError) {
            console.error("Sign-in after email-already-in-use failed:", signInError);
            setFeedback(verifyFeedback, friendlyAuthError(signInError), "error");
          }
        } else {
          setFeedback(verifyFeedback, friendlyAuthError(error), "error");
        }
      } finally {
        toggleVerifySubmitting(false);
        resetOtpState();
        pendingRegistration = null;
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
    verifySubmitButton?.addEventListener("click", handleVerifyOtp);
    verifyBackButton?.addEventListener("click", () => {
      pendingRegistration = null;
      resetOtpState();
      resetVerifyStep();
      setTab("register");
      registerForm?.querySelector("[name=\"register-name\"]")?.focus({ preventScroll: true });
    });

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
      const province = PROVINCE_LOCK;
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

    const handleAccountSave = async (event) => {
      event.preventDefault();
      if (!accountForm) return;
      const user = auth.currentUser;
      const formData = new FormData(accountForm);
      const email = (formData.get("account-email") || "").trim();
      const phone = (formData.get("account-phone") || "").trim();
      const street = (formData.get("account-street") || "").trim();
      const suburb = (formData.get("account-suburb") || "").trim();
      const city = (formData.get("account-city") || "").trim();
      const province = PROVINCE_LOCK;
      const postalCode = (formData.get("account-postal") || "").trim();
      const address = composeAddress({ street, suburb, city, province, postalCode });
      setFeedback(accountFeedback, "");

      if (!user) {
        setFeedback(accountFeedback, "Please sign in again to update your profile.", "error");
        return;
      }
      if (!email || !phone || !street || !suburb || !city || !province || !postalCode) {
        setFeedback(accountFeedback, "Email, phone, and full address details are required.", "error");
        return;
      }

      toggleAccountSubmitting(true);
      try {
        await updateDoc(doc(db, "users", user.uid), {
          email,
          phone,
          street,
          suburb,
          city,
          province,
          postalCode,
          address
        });
        const updatedProfile = {
          ...(currentUserProfile || {}),
          uid: user.uid,
          email,
          phone,
          street,
          suburb,
          city,
          province,
          postalCode,
          address
        };
        applyProfile(updatedProfile);
        showAccountSection(updatedProfile);
        setFeedback(accountFeedback, "Profile updated.", "success");
      } catch (error) {
        console.error("Account update error:", error);
        setFeedback(accountFeedback, "Could not save changes. Please try again.", "error");
      } finally {
        toggleAccountSubmitting(false);
      }
    };

    googleButtons.forEach((button) => {
      button.addEventListener("click", handleGoogleSignIn);
    });

    profileForm?.addEventListener("submit", handleProfileSave);
    accountForm?.addEventListener("submit", handleAccountSave);

    accountEditButton?.addEventListener("click", () => {
      setAccountEditing(true);
    });
    accountCancelButton?.addEventListener("click", () => {
      setAccountEditing(false);
      if (currentUserProfile) {
        showAccountSection(currentUserProfile);
      }
    });

    const accountMenuButtons = accountMenu?.querySelectorAll("[data-account-menu]");
    accountMenuButtons?.forEach((btn) => {
      const action = btn.dataset.accountMenu;
      if (action === "account") {
        btn.addEventListener("click", () => {
          closeAccountMenu();
          open();
        });
      }
      if (action === "logout") {
        btn.addEventListener("click", async () => {
          closeAccountMenu();
          try {
            await signOut(auth);
            applyProfile(null);
          } catch (error) {
            console.error("Logout failed", error);
          }
        });
      }
    });

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
