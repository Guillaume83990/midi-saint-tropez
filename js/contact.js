/* ==========================================================================
   midi. — contact.js
   Animations de la page Contact. Volontairement légères : aucun pin,
   aucun scroll-jacking — la page se veut rapide à parcourir et à utiliser.
   Dépend de gsap, ScrollTrigger et window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const pageCtx = gsap.context(() => {
            initSplitEntrance();
            initGalleryReveal();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        initFormFeedback();
    });

    /* ---------------------------------- 1. Entrée — rideau sur l'image, coordonnées en 3D ---------------------------------- */
    /* Tout se joue au chargement, pas au scroll : la page tient sur un écran,
       la chorégraphie doit donc être immédiate plutôt que différée à un geste
       de scroll qui n'arrivera pas forcément. L'image se découvre par un
       rideau (clip-path), puis les quatre blocs de coordonnées basculent en
       3D l'un après l'autre — signature courte, propre à cette page. */

    function initSplitEntrance() {
        const split = document.querySelector("[data-ct-split]");
        if (!split) return;

        const media = split.querySelector("[data-ct-media] img");
        const reveals = split.querySelectorAll("[data-ct-reveal]");
        const infoItems = split.querySelectorAll("[data-ct-info-item]");

        gsap.set(media, { clipPath: "inset(0 100% 0 0)", willChange: "clip-path" });
        gsap.set(reveals, { autoAlpha: 0, y: 16 });
        gsap.set(infoItems, { rotateX: -70, autoAlpha: 0, transformOrigin: "50% 100%" });

        gsap.timeline({ delay: 0.1, defaults: { ease: "power3.out" } })
            .to(media, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "power4.out", onComplete: () => gsap.set(media, { willChange: "auto" }) }, 0)
            .to(reveals, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.1 }, 0.25)
            .to(infoItems, { rotateX: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08 }, 0.5);
    }

    /* ---------------------------------- 2. Galerie — fondu + échelle rapide, sans pin ---------------------------------- */

    function initGalleryReveal() {
        const items = gsap.utils.toArray("[data-ct-gallery-item]");
        if (!items.length) return;

        gsap.set(items, { autoAlpha: 0, y: 24, scale: 0.96 });

        ScrollTrigger.batch(items, {
            start: "top 90%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    ease: "power3.out",
                    stagger: 0.08,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- Formulaire — retour visuel simple ---------------------------------- */

    function initFormFeedback() {
        const form = document.querySelector(".ct-form");
        if (!form) return;

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const submit = form.querySelector(".ct-form__submit");
            if (!submit) return;
            const original = submit.textContent;
            submit.textContent = "Message envoyé";
            submit.disabled = true;
            setTimeout(() => {
                submit.textContent = original;
                submit.disabled = false;
                form.reset();
            }, 3200);
        });
    }
})();