(function () {
  // Optional tracking config:
  // window.AHH_ANALYTICS_CONFIG = {
  //   ga4MeasurementId: "G-XXXXXXXXXX",
  //   googleAdsId: "AW-XXXXXXXXXX",
  //   googleAdsQuoteConversionLabel: "QUOTE_LABEL",
  //   googleAdsContactConversionLabel: "CONTACT_LABEL"
  // };
  const configFromWindow = window.AHH_ANALYTICS_CONFIG || {};
  const analyticsConfig = {
    ga4MeasurementId: configFromWindow.ga4MeasurementId || "",
    googleAdsId: configFromWindow.googleAdsId || "",
    googleAdsQuoteConversionLabel: configFromWindow.googleAdsQuoteConversionLabel || "",
    googleAdsContactConversionLabel: configFromWindow.googleAdsContactConversionLabel || ""
  };

  const looksLikeGa4Id = (value) => /^G-[A-Z0-9]+$/i.test((value || "").trim());
  const looksLikeAdsId = (value) => /^AW-[0-9]+$/i.test((value || "").trim());
  const looksLikeLabel = (value) => {
    const clean = (value || "").trim();
    return !!clean && !/replace|xxxx|your/i.test(clean);
  };

  const hasGa4 = looksLikeGa4Id(analyticsConfig.ga4MeasurementId);
  const hasAds = looksLikeAdsId(analyticsConfig.googleAdsId);

  window.ahhAnalytics = {
    config: analyticsConfig,
    hasGa4,
    hasAds,
    looksLikeLabel
  };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.ahhTrackEvent = function ahhTrackEvent(eventName, params) {
    if (!eventName) return;
    window.gtag("event", eventName, params || {});
  };

  window.ahhTrackLeadConversion = function ahhTrackLeadConversion(payload) {
    const details = payload || {};
    const leadType = details.leadType || "quote";
    const formType = details.formType || "unknown";

    window.ahhTrackEvent("generate_lead", {
      lead_type: leadType,
      form_type: formType,
      page_location: window.location.href,
      page_path: window.location.pathname
    });

    if (!hasAds) return;

    const conversionLabel =
      leadType === "contact"
        ? analyticsConfig.googleAdsContactConversionLabel
        : analyticsConfig.googleAdsQuoteConversionLabel;

    if (!looksLikeLabel(conversionLabel)) return;

    window.gtag("event", "conversion", {
      send_to: `${analyticsConfig.googleAdsId}/${conversionLabel}`,
      value: 1.0,
      currency: "USD"
    });
  };

  if (!hasGa4 && !hasAds) return;

  const existingLoader = document.querySelector("script[data-ahh-gtag]");
  if (!existingLoader) {
    const script = document.createElement("script");
    script.async = true;
    script.dataset.ahhGtag = "1";
    const loaderId = hasGa4 ? analyticsConfig.ga4MeasurementId : analyticsConfig.googleAdsId;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(loaderId)}`;
    document.head.appendChild(script);
  }

  window.gtag("js", new Date());
  if (hasGa4) {
    window.gtag("config", analyticsConfig.ga4MeasurementId, {
      send_page_view: true,
      anonymize_ip: true
    });
  }
  if (hasAds) {
    window.gtag("config", analyticsConfig.googleAdsId);
  }
})();

(function () {
  const path = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".nav-links a, .nav-link").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    if (href === path || (href === "/index.html" && (path === "/" || path === ""))) {
      a.classList.add("active");
      a.classList.add("is-active");
    }
  });
})();

(function () {
  const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"];
  const STORAGE_PREFIX = "ahh_attr_";
  const params = new URLSearchParams(window.location.search);

  let storage = null;
  try {
    storage = window.localStorage;
  } catch (_error) {
    storage = null;
  }

  if (!storage) return;

  ATTR_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) storage.setItem(`${STORAGE_PREFIX}${key}`, value);
  });

  if (!storage.getItem(`${STORAGE_PREFIX}landing_page`)) {
    storage.setItem(`${STORAGE_PREFIX}landing_page`, window.location.href);
  }

  if (document.referrer && !storage.getItem(`${STORAGE_PREFIX}referrer_url`)) {
    storage.setItem(`${STORAGE_PREFIX}referrer_url`, document.referrer);
  }

  const passthrough = new URLSearchParams();
  ATTR_KEYS.forEach((key) => {
    const value = storage.getItem(`${STORAGE_PREFIX}${key}`);
    if (value) passthrough.set(key, value);
  });
  const landingPage = storage.getItem(`${STORAGE_PREFIX}landing_page`);
  const referrer = storage.getItem(`${STORAGE_PREFIX}referrer_url`);
  if (landingPage) passthrough.set("landing_page", landingPage);
  if (referrer) passthrough.set("referrer_url", referrer);

  document.querySelectorAll("a[href^='quote.html']").forEach((link) => {
    if (!passthrough.toString()) return;
    const href = link.getAttribute("href");
    if (!href) return;
    const url = new URL(href, window.location.origin);
    passthrough.forEach((value, key) => {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    });
    const newHref = `${url.pathname.split("/").pop()}${url.search ? `?${url.searchParams.toString()}` : ""}${url.hash || ""}`;
    link.setAttribute("href", newHref);
  });

  const quoteStepForms = document.querySelectorAll("form[action='quote.html'][method='get']");
  quoteStepForms.forEach((form) => {
    const ensureHidden = (name, value) => {
      if (!value) return;
      let field = form.querySelector(`input[type='hidden'][name='${name}']`);
      if (!field) {
        field = document.createElement("input");
        field.type = "hidden";
        field.name = name;
        form.appendChild(field);
      }
      field.value = value;
    };

    ATTR_KEYS.forEach((key) => {
      ensureHidden(key, storage.getItem(`${STORAGE_PREFIX}${key}`) || "");
    });
    ensureHidden("landing_page", landingPage || window.location.href);
    ensureHidden("referrer_url", referrer || document.referrer || "");
  });
})();

(function () {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const compactViewport = window.matchMedia("(max-width: 1024px)").matches;
  const revealTargets = [
    ".soft-card",
    ".review-card",
    ".promo-panel",
    ".trust-pill",
    ".media-frame",
    ".floating-panel",
    ".home-feature-media",
    ".editorial-media",
    ".quick-contact-item"
  ];

  const revealElements = new Set();
  revealTargets.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => revealElements.add(el));
  });

  revealElements.forEach((el) => {
    el.classList.add("reveal-on-scroll");
    if (prefersReducedMotion) el.classList.add("is-visible");
  });

  if (!prefersReducedMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    revealElements.forEach((el) => observer.observe(el));
  }

  document.querySelectorAll("img[loading='lazy']").forEach((img) => {
    if (img.complete) {
      img.classList.add("is-loaded");
      return;
    }
    img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
  });

  const buttons = document.querySelectorAll(".button-solid");
  if (!coarsePointer) {
    buttons.forEach((button) => {
      button.style.setProperty("--cursor-x", "50%");
      button.style.setProperty("--cursor-y", "50%");
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        button.style.setProperty("--cursor-x", `${Math.max(0, Math.min(100, x))}%`);
        button.style.setProperty("--cursor-y", `${Math.max(0, Math.min(100, y))}%`);
      });
      button.addEventListener("pointerleave", () => {
        button.style.setProperty("--cursor-x", "50%");
        button.style.setProperty("--cursor-y", "50%");
      });
    });
  }

  if (prefersReducedMotion || coarsePointer || compactViewport) return;

  const parallaxBlocks = Array.from(
    document.querySelectorAll(".home-hero-media, .page-hero .media-frame, .home-feature-media")
  );

  parallaxBlocks.forEach((block) => {
    block.classList.add("parallax-surface");
    const target = block.querySelector("img");
    if (!target) return;

    block.addEventListener("pointermove", (event) => {
      const rect = block.getBoundingClientRect();
      const ratioX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const tiltX = Math.max(-7, Math.min(7, ratioX * 7));
      block.style.setProperty("--parallax-x", `${tiltX.toFixed(2)}px`);
    });

    block.addEventListener("pointerleave", () => {
      block.style.setProperty("--parallax-x", "0px");
    });
  });

  let framePending = false;
  const updateParallaxFromScroll = () => {
    framePending = false;
    const viewportCenter = window.innerHeight * 0.5;
    parallaxBlocks.forEach((block) => {
      const rect = block.getBoundingClientRect();
      const elementCenter = rect.top + rect.height * 0.5;
      const delta = (elementCenter - viewportCenter) / window.innerHeight;
      const y = Math.max(-12, Math.min(12, delta * -14));
      block.style.setProperty("--parallax-y", `${y.toFixed(2)}px`);
    });
  };

  const queueParallax = () => {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(updateParallaxFromScroll);
  };

  queueParallax();
  window.addEventListener("scroll", queueParallax, { passive: true });
  window.addEventListener("resize", queueParallax);
})();

(function () {
  const quoteForms = Array.from(document.querySelectorAll("[data-quote-form]"));
  if (!quoteForms.length) return;

  const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid", "msclkid"];
  const STORAGE_PREFIX = "ahh_attr_";
  const params = new URLSearchParams(window.location.search);
  const submitted = params.get("submitted") === "1";
  const submittedForm = params.get("form");
  const getParam = (key) => params.get(key)?.trim() || "";

  let storage = null;
  try {
    storage = window.localStorage;
  } catch (_error) {
    storage = null;
  }

  const getAttributionValue = (key) => {
    const fromParam = getParam(key);
    if (fromParam) return fromParam;
    return storage?.getItem(`${STORAGE_PREFIX}${key}`) || "";
  };

  const setInputValue = (id, value) => {
    if (!value) return;
    const input = document.getElementById(id);
    if (!input || input.value) return;
    input.value = value;
  };

  const setSelectValue = (id, value) => {
    if (!value) return;
    const select = document.getElementById(id);
    if (!select) return;
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const match = Array.from(select.options).find((option) => {
      const optionKey = option.value.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return optionKey === normalized || optionKey.includes(normalized) || normalized.includes(optionKey);
    });
    if (match) select.value = match.value;
  };

  const incomingName = getParam("name");
  const incomingZip = getParam("zip");
  const incomingService = getParam("service_type");
  const incomingTiming = getParam("preferred_timing");
  const incomingContact = getParam("contact");
  const incomingArea = getParam("area");

  if (incomingName) {
    setInputValue("quick-name", incomingName);
    const parts = incomingName.split(/\s+/);
    if (parts.length) setInputValue("first-name", parts[0]);
    if (parts.length > 1) setInputValue("last-name", parts.slice(1).join(" "));
  }
  setInputValue("quick-zip", incomingZip);
  setInputValue("zip-code", incomingZip);
  setSelectValue("quick-service-type", incomingService);
  setSelectValue("service-type", incomingService);
  setSelectValue("quick-preferred-timing", incomingTiming);

  if (incomingContact) {
    const looksLikeEmail = incomingContact.includes("@");
    if (looksLikeEmail) {
      setInputValue("quick-email", incomingContact);
      setInputValue("email", incomingContact);
    } else {
      setInputValue("phone", incomingContact);
    }
    setInputValue("quick-contact-note", incomingContact);
  }

  setInputValue("quick-area", incomingArea);
  setInputValue("detailed-area", incomingArea);

  quoteForms.forEach((quoteForm) => {
    const statusBox = quoteForm.querySelector("[data-form-status]");
    const submitButton = quoteForm.querySelector("button[type='submit']");
    const submitLabel = submitButton?.getAttribute("data-submit-label") || "Send";
    const mode = quoteForm.getAttribute("data-quote-form-mode") || "quote";
    const isMatchingForm = !submittedForm || submittedForm === mode;

    const setStatus = (message, type) => {
      if (!statusBox) return;
      statusBox.classList.remove("hidden", "is-success", "is-error");
      if (type === "error") statusBox.classList.add("is-error");
      if (type === "success") statusBox.classList.add("is-success");
      statusBox.textContent = message;
    };

    quoteForm.querySelectorAll("[data-attribution-field]").forEach((field) => {
      const key = field.getAttribute("data-attribution-field");
      if (!key) return;
      if (key === "landing_page") {
        field.value = getAttributionValue("landing_page") || window.location.href;
        return;
      }
      if (key === "referrer_url") {
        field.value = getAttributionValue("referrer_url") || document.referrer || "";
        return;
      }
      if (key === "submission_page") {
        field.value = window.location.href;
        return;
      }
      if (ATTR_KEYS.includes(key)) {
        field.value = getAttributionValue(key);
      }
    });

    if (submitted && statusBox && isMatchingForm) {
      setStatus("Thanks, your quote request was sent. We will follow up as soon as possible.", "success");
    }

    quoteForm.addEventListener("submit", (event) => {
      quoteForm.classList.add("ahh-validated");

      quoteForm.querySelectorAll("input, select, textarea").forEach((field) => {
        if (typeof field.checkValidity !== "function") return;
        if (field.checkValidity()) {
          field.removeAttribute("aria-invalid");
        } else {
          field.setAttribute("aria-invalid", "true");
        }
      });

      if (!quoteForm.checkValidity()) {
        setStatus("Please review the highlighted fields and try again.", "error");
        return;
      }

      if (!submitButton) return;

      window.ahhTrackEvent("quote_submit_attempt", {
        lead_type: "quote",
        form_type: mode,
        page_path: window.location.pathname
      });

      try {
        window.sessionStorage.setItem(
          "ahh_pending_lead",
          JSON.stringify({ leadType: "quote", formType: mode, timestamp: Date.now() })
        );
      } catch (_error) {
        // no-op
      }

      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Sending...";
      window.setTimeout(() => {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.textContent = submitLabel;
      }, 9000);
    });

    quoteForm.querySelectorAll("input, select, textarea").forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true" && field.checkValidity()) {
          field.removeAttribute("aria-invalid");
        }
      });
    });
  });

  if (submitted && window.history?.replaceState) {
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
})();

(function () {
  const isThankYouPage = /\/thank-you\.html$/i.test(window.location.pathname);
  if (!isThankYouPage) return;

  const params = new URLSearchParams(window.location.search);
  const leadType = (params.get("lead") || "quote").toLowerCase();
  const formType = (params.get("form") || "unknown").toLowerCase();
  const dedupeKey = `ahh_conversion_sent_${leadType}_${formType}_${window.location.search}`;

  const title = document.querySelector("[data-thank-you-title]");
  const message = document.querySelector("[data-thank-you-message]");
  const subline = document.querySelector("[data-thank-you-subline]");

  if (title && leadType === "contact") {
    title.textContent = "Thanks for Reaching Out";
  }

  if (message && leadType === "quote") {
    message.textContent = "Your quote request is in. We will review your details and follow up shortly.";
  }

  if (subline && formType === "quick") {
    subline.textContent = "Quick quote requests are usually reviewed within a few business hours.";
  }

  try {
    if (window.sessionStorage.getItem(dedupeKey)) return;
    window.sessionStorage.setItem(dedupeKey, "1");
  } catch (_error) {
    // no-op
  }

  window.ahhTrackLeadConversion({ leadType, formType });
  window.ahhTrackEvent("thank_you_view", {
    lead_type: leadType,
    form_type: formType,
    page_path: window.location.pathname
  });
})();

(function () {
  const contactLinks = document.querySelectorAll("a[href^='tel:'], a[href^='mailto:']");
  if (!contactLinks.length) return;

  contactLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const type = href.startsWith("tel:") ? "phone" : "email";
    link.addEventListener("click", () => {
      window.ahhTrackEvent("contact_click", {
        contact_type: type,
        page_path: window.location.pathname,
        destination: href
      });
    });
  });
})();
