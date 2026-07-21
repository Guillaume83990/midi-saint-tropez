/* ==========================================================================
   midi. — adresses.js
   Deux fiches lieu : rideau (clip-path) sur la photo, et une épingle qui
   tombe en 3D depuis le haut et rebondit légèrement à l'arrivée sur
   l'adresse — signature propre à cette page. Dépend de gsap,
   ScrollTrigger et window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    document.addEventListener("DOMContentLoaded", () => {
        const pageCtx = gsap.context(() => {
            initHeroReveal();
            initCards();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    });

    /* ---------------------------------- 1. Hero — fondu simple au chargement ---------------------------------- */

    function initHeroReveal() {
        const reveals = document.querySelectorAll("#na-hero [data-reveal]");
        if (!reveals.length) return;

        gsap.set(reveals, { autoAlpha: 0, y: 16 });
        gsap.to(reveals, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.1 });
    }

    /* ---------------------------------- 2. Fiches lieu — rideau + épingle qui tombe ---------------------------------- */
    /* La photo se découvre par un rideau vertical (clip-path), pendant que
       l'épingle du nom du lieu tombe depuis le haut en 3D (rotateX + y) et
       rebondit légèrement à l'arrivée, comme si elle se plantait sur une
       carte. Le reste du texte suit en cascade. */

    function initCards() {
        const cards = gsap.utils.toArray("[data-na-card]");
        if (!cards.length) return;

        cards.forEach((card) => {
            const media = card.querySelector("[data-na-card-media] img");
            const pinRow = card.querySelector("[data-na-pin-row]");
            const pin = card.querySelector("[data-na-pin]");
            const name = card.querySelector(".na-card__name");
            const rest = card.querySelectorAll(".na-card__address, .na-card__hours, .na-card__text, .na-card__contact, .na-card__info > a");

            gsap.set(media, { clipPath: "inset(0 0 0 100%)", willChange: "clip-path" });
            gsap.set(pinRow, { transformPerspective: 700 });
            gsap.set(pin, { y: -50, rotateX: -90, autoAlpha: 0, willChange: "transform, opacity" });
            gsap.set(name, { autoAlpha: 0, x: -10 });
            gsap.set(rest, { autoAlpha: 0, y: 14 });

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    start: "top 78%",
                    once: true,
                },
            });

            tl.to(media, { clipPath: "inset(0 0 0 0%)", duration: 1, ease: "power4.out", onComplete: () => gsap.set(media, { willChange: "auto" }) }, 0)
                .to(pin, { y: 0, rotateX: 0, autoAlpha: 1, duration: 0.7, ease: "bounce.out", onComplete: () => gsap.set(pin, { willChange: "auto" }) }, 0.3)
                .to(name, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.45)
                .to(rest, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" }, 0.6);
        });
    }
})();