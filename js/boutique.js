/* ==========================================================================
   midi. — boutique.js
   Reveal 3D de la grille produits, filtres Jour/Soir animés (fondu, pas de
   simple display:none brutal). Dépend de gsap, ScrollTrigger et
   window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const pageCtx = gsap.context(() => {
            initIntroReveal();
            initGridReveal();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        initFilters();
    });

    /* ---------------------------------- 1. Intro — fondu simple au chargement ---------------------------------- */

    function initIntroReveal() {
        const reveals = document.querySelectorAll("[data-bq-reveal]");
        if (!reveals.length) return;

        gsap.set(reveals, { autoAlpha: 0, y: 16 });
        gsap.to(reveals, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.08, delay: 0.1 });
    }

    /* ---------------------------------- 2. Grille — reveal 3D en cascade ---------------------------------- */

    function initGridReveal() {
        const cards = gsap.utils.toArray("[data-bq-card]");
        if (!cards.length) return;

        gsap.set(cards, { autoAlpha: 0, y: 36, rotateX: -12, transformPerspective: 1200, transformOrigin: "50% 100%" });

        ScrollTrigger.batch(cards, {
            start: "top 90%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    autoAlpha: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 0.85,
                    ease: "power3.out",
                    stagger: 0.08,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- Filtres Jour / Soir ---------------------------------- */
    /* Un fondu rapide accompagne le tri plutôt qu'un display:none instantané —
       le grid CSS reflow (colonnes qui se resserrent) se fait pendant que les
       cartes masquées sont déjà invisibles, donc sans à-coup visuel. */

    function initFilters() {
        const filters = document.querySelectorAll("[data-bq-filter]");
        const cards = document.querySelectorAll("[data-bq-card]");
        const empty = document.querySelector("[data-bq-empty]");
        if (!filters.length || !cards.length) return;

        filters.forEach((btn) => {
            btn.addEventListener("click", () => {
                const target = btn.dataset.bqFilter;
                if (btn.getAttribute("aria-pressed") === "true") return;

                filters.forEach((b) => b.setAttribute("aria-pressed", "false"));
                btn.setAttribute("aria-pressed", "true");

                const toHide = [];
                const toShow = [];

                cards.forEach((card) => {
                    const match = target === "all" || card.dataset.bqCategory === target;
                    if (match) toShow.push(card);
                    else toHide.push(card);
                });

                const tl = gsap.timeline();

                if (toHide.length) {
                    tl.to(toHide, {
                        autoAlpha: 0,
                        scale: 0.94,
                        duration: 0.25,
                        ease: "power1.in",
                        onComplete: () => toHide.forEach((c) => { c.style.display = "none"; }),
                    });
                }

                tl.add(() => {
                    toShow.forEach((c) => { c.style.display = ""; });
                    gsap.fromTo(toShow, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: "power2.out", stagger: 0.05 });
                    if (empty) empty.hidden = toShow.length > 0;
                }, toHide.length ? "-=0.05" : 0);
            });
        });
    }
})();