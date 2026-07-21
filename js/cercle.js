/* ==========================================================================
   midi. — cercle.js
   Animations spécifiques à la page « Le Cercle ». Dépend de gsap,
   ScrollTrigger et window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    const reduceMotion = window.MIDI && window.MIDI.reduceMotion;

    document.addEventListener("DOMContentLoaded", () => {
        const pageCtx = gsap.context(() => {
            initHeroEntrance();
            initBenefitsReveal();
            initInviteSeal();
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

    /* ---------------------------------- 1. Hero — zoom arrière lent au chargement ---------------------------------- */

    function initHeroEntrance() {
        const hero = document.querySelector("[data-lc-hero]");
        const media = document.querySelector("[data-lc-hero-media]");
        if (!hero) return;

        const reveals = hero.querySelectorAll("[data-lc-reveal]");
        gsap.set(media, { scale: 1.3, willChange: "transform" });
        gsap.set(reveals, { autoAlpha: 0, y: 22 });

        gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } })
            .to(media, { scale: 1.1, duration: 2.2, ease: "power2.out", onComplete: () => gsap.set(media, { willChange: "auto" }) }, 0)
            .to(reveals, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.3);
    }

    /* ---------------------------------- 2. Bénéfices — présentation 3D séquentielle ---------------------------------- */
    /* Chaque carte se redresse sur l'axe X (et non Y comme sur la page Maison,
       pour une signature propre à cette page), l'une après l'autre de gauche
       à droite — comme trois cartons qu'on distribue sur une table. */

    function initBenefitsReveal() {
        const items = gsap.utils.toArray("[data-lc-benefit]");
        if (!items.length) return;

        gsap.set(items, { rotateX: -55, y: 30, autoAlpha: 0, transformOrigin: "50% 0%", transformPerspective: 1000 });

        ScrollTrigger.batch(items, {
            start: "top 85%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    rotateX: 0,
                    y: 0,
                    autoAlpha: 1,
                    duration: 0.9,
                    ease: "power3.out",
                    stagger: 0.15,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- 3. L'Invitation — enveloppe 3D, pin court ---------------------------------- */
    /* Le rabat de l'enveloppe pivote en 3D autour de son bord supérieur
       (rotateX 0 → -175°, comme une porte qui bascule vers l'arrière), le
       cachet de cire s'efface au moment où le rabat se décolle, et la carte
       glisse hors de l'enveloppe pour se présenter face à la lectrice. Court
       pin, scrubbé sur le scroll : réversible si on remonte. */

    function initInviteSeal() {
        const pin = document.querySelector("[data-lc-invite-pin]");
        const envelope = document.querySelector("[data-lc-invite-envelope]");
        const flap = document.querySelector("[data-lc-invite-flap]");
        const seal = document.querySelector("[data-lc-invite-seal]");
        const card = document.querySelector("[data-lc-invite-card]");
        const eyebrow = document.querySelector("[data-lc-invite-eyebrow]");
        if (!pin || !envelope) return;

        gsap.set(envelope, { transformPerspective: 1800 });
        gsap.set(flap, { rotateX: 0, willChange: "transform" });
        gsap.set(seal, { autoAlpha: 1, scale: 1, willChange: "transform, opacity" });
        gsap.set(card, { autoAlpha: 0, y: 30, scale: 0.9, willChange: "transform, opacity" });
        gsap.set(eyebrow, { autoAlpha: 0, y: 12 });

        gsap.timeline({
            scrollTrigger: {
                id: "invite-pin",
                trigger: pin,
                start: "top top",
                end: "+=110%",
                scrub: 0.7,
                pin: true,
                anticipatePin: 1,
                onLeave: () => {
                    gsap.set([flap, seal, card], { willChange: "auto" });
                },
            },
        })
            .to(eyebrow, { autoAlpha: 1, y: 0, ease: "power2.out", duration: 0.2 }, 0)
            .to(seal, { autoAlpha: 0, scale: 0.4, ease: "power1.in", duration: 0.25 }, 0.1)
            .to(flap, { rotateX: -175, ease: "power2.inOut", duration: 0.6 }, 0.2)
            .to(card, { autoAlpha: 1, y: 0, scale: 1, ease: "power2.out", duration: 0.5 }, 0.5);
    }

    /* ---------------------------------- Formulaire — retour visuel simple ---------------------------------- */
    /* Pas d'appel réseau réel sur cette maquette : au submit, le bouton confirme
       visuellement l'inscription plutôt que de recharger la page. */

    function initFormFeedback() {
        const form = document.querySelector(".lc-form__form");
        if (!form) return;

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const submit = form.querySelector(".lc-form__submit");
            if (!submit) return;
            const original = submit.textContent;
            submit.textContent = "Bienvenue dans le Cercle";
            submit.disabled = true;
            setTimeout(() => {
                submit.textContent = original;
                submit.disabled = false;
                form.reset();
            }, 3200);
        });
    }
})();