/* ==========================================================================
   midi. — global.js
   Smooth scroll (Lenis + GSAP ticker), header, menu overlay,
   utilitaire de reveal générique partagé par toutes les pages.
   ========================================================================== */

(() => {
    "use strict";

    gsap.registerPlugin(ScrollTrigger);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    /* ---------------------------------- Smooth scroll ---------------------------------- */

    const lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: !reduceMotion,
        syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.defaults({ markers: false });

    /* Empêche ScrollTrigger de recalculer (et donc de faire sauter les pins)
       quand seule la hauteur de la fenêtre change sur mobile — typiquement
       quand la barre d'adresse se rétracte ou réapparaît au scroll. */
    ScrollTrigger.config({ ignoreMobileResize: true });

    /* normalizeScroll() lisse le geste tactile sur iOS/Android (rubber-banding,
       adresse bar qui rétrécit) mais peut interférer avec le scroll natif sur
       desktop : on ne l'active donc que sur les appareils réellement tactiles. */
    if (isTouchDevice) {
        ScrollTrigger.normalizeScroll(true);
    }

    /* Tout ce qui suit crée des animations/ScrollTriggers GSAP : on les regroupe
       dans un context() pour pouvoir les nettoyer proprement (ex. navigation
       interne, tests, ou un futur montage/démontage dynamique) sans avoir à
       lister chaque trigger manuellement. */
    const globalCtx = gsap.context(() => {

        /* ---------------------------------- Header ---------------------------------- */

        const header = document.querySelector("[data-header]");
        const HEADER_HIDE_THRESHOLD = 160;
        let lastScroll = 0;

        if (header) {
            lenis.on("scroll", (e) => {
                const y = e.scroll;
                header.setAttribute("data-header-solid", y > 40 ? "true" : "false");
                header.setAttribute(
                    "data-header-hidden",
                    y > lastScroll && y > HEADER_HIDE_THRESHOLD ? "true" : "false"
                );
                lastScroll = y;
            });
        }

        /* ---------------------------------- Menu overlay ---------------------------------- */

        const menuToggle = document.querySelector("[data-menu-toggle]");
        const siteNav = document.querySelector("[data-site-nav]");
        let navOpen = false;

        if (menuToggle && siteNav) {
            const navItems = siteNav.querySelectorAll(".site-nav__item a");
            const navFoot = siteNav.querySelector(".site-nav__foot");

            gsap.set(siteNav, { autoAlpha: 0 });
            gsap.set(navItems, { yPercent: 130 });
            gsap.set(navFoot, { autoAlpha: 0, y: 12 });

            const navTl = gsap.timeline({ paused: true })
                .set(siteNav, { visibility: "visible" })
                .to(siteNav, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0)
                .to(navItems, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.07 }, 0.08)
                .to(navFoot, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.35);

            const closeNav = () => {
                navOpen = false;
                menuToggle.setAttribute("aria-expanded", "false");
                siteNav.setAttribute("aria-hidden", "true");
                lenis.start();
                navTl.timeScale(1.4).reverse();
            };

            menuToggle.addEventListener("click", () => {
                navOpen = !navOpen;
                menuToggle.setAttribute("aria-expanded", String(navOpen));
                siteNav.setAttribute("aria-hidden", String(!navOpen));

                if (navOpen) {
                    lenis.stop();
                    navTl.timeScale(1).play();
                } else {
                    closeNav();
                }
            });

            siteNav.querySelectorAll("a").forEach((link) => {
                link.addEventListener("click", closeNav);
            });
        }

        /* ---------------------------------- Reveal générique ---------------------------------- */
        /* Utilisé par toutes les sections marquées [data-reveal]. Ne jamais masquer
           ces éléments par défaut en CSS : gsap.set() les place au premier rendu,
           juste avant l'animation, pour rester utilisables sans JS/robots. */

        const initReveals = () => {
            const groups = gsap.utils.toArray("[data-reveal]");
            if (!groups.length) return;

            ScrollTrigger.batch(groups, {
                start: "top 85%",
                onEnter: (batch) => {
                    gsap.set(batch, { autoAlpha: 0, y: 28, willChange: "transform, opacity" });
                    gsap.to(batch, {
                        autoAlpha: 1,
                        y: 0,
                        duration: 1,
                        ease: "power3.out",
                        stagger: 0.08,
                        onComplete: () => gsap.set(batch, { willChange: "auto" }),
                    });
                },
                once: true,
            });
        };

        document.addEventListener("DOMContentLoaded", initReveals);

    }, document.body);

    /* Nettoyage propre : si la page est déchargée ou remplacée (bfcache,
       navigation interne future en SPA), on tue triggers et smooth scroll
       pour éviter listeners et rAF fantômes. */
    window.addEventListener("pagehide", () => {
        globalCtx.revert();
        lenis.destroy();
    });

    /* ---------------------------------- Bannière cookies ---------------------------------- */
    /* Injectée en JS plutôt que codée en dur dans chaque page HTML : ce
       fichier est déjà chargé sur les 26 pages du site (FR + EN), donc un
       seul endroit à maintenir. Bilingue dès le départ — global.js tourne
       sur les deux langues, un texte figé en français serait apparu tel
       quel sur les pages EN (même piège que cart.js et produit.js plus tôt,
       autant l'éviter d'emblée). Le choix de la personne est mémorisé en
       localStorage : la bannière ne réapparaît plus une fois tranchée,
       sur aucune page. */

    function initCookieBanner() {
        const STORAGE_KEY = "midi_cookie_consent";
        let consent = null;
        try {
            consent = localStorage.getItem(STORAGE_KEY);
        } catch (e) {
            /* localStorage indisponible : on affiche la bannière à chaque visite
               plutôt que de bloquer sur une erreur — dégradation raisonnable. */
        }
        if (consent) return;

        const lang = document.documentElement.lang === "en" ? "en" : "fr";
        const STRINGS = {
            fr: {
                text: "Ce site utilise des cookies pour mesurer sa fréquentation et améliorer votre navigation.",
                accept: "Tout accepter",
                decline: "Refuser",
            },
            en: {
                text: "This site uses cookies to measure traffic and improve your browsing experience.",
                accept: "Accept All",
                decline: "Decline",
            },
        };
        const T = STRINGS[lang];

        const banner = document.createElement("div");
        banner.className = "cookie-banner";
        banner.setAttribute("data-cookie-banner", "");
        banner.setAttribute("role", "dialog");
        banner.setAttribute("aria-label", "Cookies");
        banner.innerHTML = `
      <p class="cookie-banner__text">${T.text}</p>
      <div class="cookie-banner__actions">
        <button type="button" class="cookie-banner__decline" data-cookie-decline>${T.decline}</button>
        <button type="button" class="cookie-banner__accept" data-cookie-accept>${T.accept}</button>
      </div>
    `;
        document.body.appendChild(banner);

        gsap.set(banner, { autoAlpha: 0, y: 16 });
        gsap.to(banner, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.8 });

        const dismiss = (value) => {
            try {
                localStorage.setItem(STORAGE_KEY, value);
            } catch (e) {
                /* rien à faire de plus si le stockage échoue : la bannière
                   réapparaîtra à la prochaine visite, ce qui reste acceptable. */
            }
            gsap.to(banner, {
                autoAlpha: 0,
                y: 16,
                duration: 0.4,
                ease: "power2.in",
                onComplete: () => banner.remove(),
            });
        };

        banner.querySelector("[data-cookie-accept]").addEventListener("click", () => dismiss("accepted"));
        banner.querySelector("[data-cookie-decline]").addEventListener("click", () => dismiss("declined"));
    }

    document.addEventListener("DOMContentLoaded", initCookieBanner);

    window.MIDI = window.MIDI || {};
    window.MIDI.lenis = lenis;
    window.MIDI.reduceMotion = reduceMotion;
    window.MIDI.isTouchDevice = isTouchDevice;
})();