/* ==========================================================================
   midi. — maison.js
   Animations spécifiques à la page « La Maison ». Dépend de gsap,
   ScrollTrigger et window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    const reduceMotion = window.MIDI && window.MIDI.reduceMotion;

    document.addEventListener("DOMContentLoaded", () => {
        /* Même logique que sur l'accueil : toutes les animations de la page
           sont regroupées dans un context() pour pouvoir être nettoyées
           proprement (revert() global) sans cibler chaque trigger un par un. */
        const pageCtx = gsap.context(() => {
            initHeroEntrance();
            initFondatriceReveal();
            initFrise();
            initValeursReveal();
            initAtelierParallax();
            initMosaiqueReveal();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    });

    /* ---------------------------------- 1. Hero — zoom arrière lent au chargement ---------------------------------- */

    function initHeroEntrance() {
        const hero = document.querySelector("[data-mh-hero]");
        const media = document.querySelector("[data-mh-hero-media]");
        if (!hero) return;

        const reveals = hero.querySelectorAll("[data-mh-reveal]");
        gsap.set(media, { scale: 1.32, willChange: "transform" });
        gsap.set(reveals, { autoAlpha: 0, y: 22 });

        gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } })
            .to(media, { scale: 1.1, duration: 2.2, ease: "power2.out", onComplete: () => gsap.set(media, { willChange: "auto" }) }, 0)
            .to(reveals, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 0.3);
    }

    /* ---------------------------------- 2. Fondatrice — portrait en biais + texte en profondeur ---------------------------------- */
    /* Le portrait se révèle par un rideau diagonal (clip-path polygon), distinct
       du masque circulaire et du rideau droit déjà utilisés sur l'accueil. Le
       bloc de texte entre depuis le côté avec une légère rotation Y, comme s'il
       pivotait pour se présenter face au lecteur. */

    function initFondatriceReveal() {
        const portrait = document.querySelector("[data-fondatrice-portrait]");
        const text = document.querySelector("[data-fondatrice-text]");
        if (!portrait) return;

        gsap.set(portrait, { clipPath: "polygon(0 0, 0 0, 0 100%, 0 100%)", willChange: "clip-path" });
        if (text) gsap.set(text, { autoAlpha: 0, x: 60, rotateY: -18, transformPerspective: 1000, willChange: "transform, opacity" });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: portrait,
                start: "top 78%",
                end: "top 30%",
                scrub: 1,
                onLeave: () => {
                    gsap.set(portrait, { willChange: "auto" });
                    if (text) gsap.set(text, { willChange: "auto" });
                },
            },
        });

        tl.to(portrait, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", ease: "power2.out" }, 0);
        if (text) tl.to(text, { autoAlpha: 1, x: 0, rotateY: 0, ease: "power2.out" }, 0.15);
    }

    /* ---------------------------------- 3. Frise — pin + scroll horizontal, ligne dessinée + cartes qui se redressent ---------------------------------- */
    /* Même principe de pin horizontal que la galerie de l'accueil, mais deux
       signatures propres à cette page : une ligne SVG dont le tracé se dessine
       (stroke-dashoffset) sur l'avancement du scroll, et chaque carte qui se
       redresse en 3D depuis une position couchée (rotateX 70° → 0°) comme une
       page qu'on relève.
       Expérience volontairement identique sur PC, tablette et smartphone —
       même pin, même ligne qui se dessine, même redressement 3D des cartes —
       pour rester cohérent avec la galerie de l'accueil. */

    function initFrise() {
        const pin = document.querySelector("[data-frise-pin]");
        const track = document.querySelector("[data-frise-track]");
        const lineEl = document.querySelector("[data-frise-line] line");
        if (!pin || !track) return;

        const items = gsap.utils.toArray("[data-frise-item]", track);
        const cards = items.map((item) => item.querySelector(".frise__card"));

        gsap.set(cards, { rotateX: 70, autoAlpha: 0, transformOrigin: "50% 100%", willChange: "transform, opacity" });

        const lineLength = 2200;
        if (lineEl) gsap.set(lineEl, { strokeDasharray: lineLength, strokeDashoffset: lineLength });

        const getDistance = () => track.scrollWidth - pin.clientWidth + window.innerWidth * 0.08;

        const horizontalTween = gsap.to(track, {
            x: () => -getDistance(),
            ease: "none",
            scrollTrigger: {
                id: "frise-pin",
                trigger: pin,
                start: "top top",
                end: () => `+=${getDistance() + window.innerHeight * 0.5}`,
                scrub: 1,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    if (lineEl) gsap.set(lineEl, { strokeDashoffset: lineLength * (1 - self.progress) });
                },
            },
        });

        items.forEach((item, i) => {
            gsap.to(cards[i], {
                rotateX: 0,
                autoAlpha: 1,
                ease: "power2.out",
                onComplete: () => gsap.set(cards[i], { willChange: "auto" }),
                scrollTrigger: {
                    trigger: item,
                    containerAnimation: horizontalTween,
                    start: "left 85%",
                    end: "left 45%",
                    scrub: true,
                },
            });
        });
    }

    /* ---------------------------------- 4. Valeurs — bascule 3D en entrée ---------------------------------- */

    function initValeursReveal() {
        const items = gsap.utils.toArray("[data-valeur]");
        if (!items.length) return;

        items.forEach((item, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            gsap.set(item, { rotateY: 28 * dir, autoAlpha: 0, transformPerspective: 1000 });
        });

        ScrollTrigger.batch(items, {
            start: "top 85%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    rotateY: 0,
                    autoAlpha: 1,
                    duration: 0.9,
                    ease: "power3.out",
                    stagger: 0.12,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- 5. Atelier — parallax simple ---------------------------------- */

    function initAtelierParallax() {
        const media = document.querySelector("[data-atelier-media] img");
        const section = document.querySelector("[data-atelier]");
        if (!media || !section) return;

        gsap.set(media, { willChange: "transform" });

        gsap.fromTo(
            media,
            { yPercent: -10 },
            {
                yPercent: 5,
                ease: "none",
                scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1,
                },
            }
        );
    }

    /* ---------------------------------- 6. Mosaïque — relief 3D alterné ---------------------------------- */

    function initMosaiqueReveal() {
        const items = gsap.utils.toArray("[data-mosaique-item]");
        if (!items.length) return;

        items.forEach((item, i) => {
            const alt = i % 2 === 0;
            gsap.set(item, {
                autoAlpha: 0,
                y: 40,
                rotateX: alt ? 18 : -18,
                transformPerspective: 900,
                transformOrigin: "50% 100%",
            });
        });

        ScrollTrigger.batch(items, {
            start: "top 88%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    autoAlpha: 1,
                    y: 0,
                    rotateX: 0,
                    duration: 1,
                    ease: "power3.out",
                    stagger: 0.1,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }
})();