/* ==========================================================================
   midi. — produit.js
   Fiche produit : entrée premium (rideau + chiffre fantôme), galerie à
   vignettes avec fondu croisé, tilt 3D à la souris, accordéon animé en JS
   (fiable, mesure de hauteur réelle), sélecteur de taille, panier avec
   annulation, reveal 3D des cartes "vous aimerez aussi". Dépend de gsap,
   ScrollTrigger et window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    const reduceMotion = window.MIDI && window.MIDI.reduceMotion;
    const isTouchDevice = window.MIDI && window.MIDI.isTouchDevice;

    /* Même principe que dans panier.js : ce script est partagé par les
       versions FR et EN de chaque fiche, donc le texte qu'il génère
       dynamiquement (taille sélectionnée, confirmation d'ajout, message
       Stripe non configuré) doit suivre la langue de la page plutôt que
       rester figé en français. */
    const LANG = document.documentElement.lang === "en" ? "en" : "fr";
    const STRINGS = {
        fr: {
            sizeSelected: (s) => `Taille ${s} sélectionnée`,
            added: "Ajoutée au panier",
            quickBuyNotConfigured: 'Lien de paiement Stripe pas encore configuré pour cette pièce — voir server-example/PAYMENT-LINKS.md.',
            sizePrefix: "taille",
        },
        en: {
            sizeSelected: (s) => `Size ${s} selected`,
            added: "Added to cart",
            quickBuyNotConfigured: 'Stripe payment link not yet configured for this piece — see server-example/PAYMENT-LINKS.md.',
            sizePrefix: "size",
        },
    };
    const T = STRINGS[LANG];

    document.addEventListener("DOMContentLoaded", () => {
        const pageCtx = gsap.context(() => {
            initEntrance();
            initGalleryTilt();
            initAlsoReveal();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();

        initSizeSelector();
        initAccordion();
        initAddToCart();
        initGalleryThumbs();
        initQuickBuy();
    });

    /* ---------------------------------- 1. Entrée — rideau sur la photo, chiffre fantôme, info en cascade ---------------------------------- */
    /* La photo se découvre par un rideau (clip-path) tandis qu'elle recule
       très légèrement en profondeur, le chiffre fantôme derrière elle
       apparaît en fondu, puis les blocs d'info et les vignettes s'enchaînent
       — une entrée courte mais avec la même densité 3D que le reste du site,
       pas une simple apparition en fondu. */

    function initEntrance() {
        const frame = document.querySelector("[data-pf-gallery-frame]");
        const ghost = document.querySelector(".pf-gallery__ghost");
        const thumbs = document.querySelectorAll(".pf-thumb");
        const reveals = document.querySelectorAll("[data-pf-reveal]");
        if (!frame) return;

        gsap.set(frame, { transformPerspective: 1200, clipPath: "inset(0 0 0 100%)", scale: 1.04, willChange: "clip-path, transform" });
        gsap.set(ghost, { autoAlpha: 0, x: -12 });
        gsap.set(thumbs, { autoAlpha: 0, y: 14 });
        gsap.set(reveals, { autoAlpha: 0, y: 16 });

        gsap.timeline({ delay: 0.1, defaults: { ease: "power3.out" } })
            .to(frame, { clipPath: "inset(0 0 0 0%)", scale: 1, duration: 1, ease: "power4.out", onComplete: () => gsap.set(frame, { willChange: "auto" }) }, 0)
            .to(ghost, { autoAlpha: 1, x: 0, duration: 0.7 }, 0.35)
            .to(thumbs, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.55)
            .to(reveals, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.07 }, 0.3);
    }

    /* ---------------------------------- 2. Galerie — tilt 3D à la souris ---------------------------------- */

    function initGalleryTilt() {
        const frame = document.querySelector("[data-pf-gallery-frame]");
        const stage = document.querySelector("[data-pf-gallery-stage]");
        if (!frame || !stage || reduceMotion || isTouchDevice) return;

        const quickRotateY = gsap.quickTo(frame, "rotateY", { duration: 0.6, ease: "power3.out" });
        const quickRotateX = gsap.quickTo(frame, "rotateX", { duration: 0.6, ease: "power3.out" });

        stage.addEventListener("mousemove", (e) => {
            const rect = frame.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width - 0.5;
            const relY = (e.clientY - rect.top) / rect.height - 0.5;
            quickRotateY(relX * 10);
            quickRotateX(-relY * 10);
        }, { passive: true });

        stage.addEventListener("mouseleave", () => {
            quickRotateY(0);
            quickRotateX(0);
        }, { passive: true });
    }

    /* ---------------------------------- 3. Vignettes — fondu croisé de l'image principale ---------------------------------- */

    function initGalleryThumbs() {
        const frame = document.querySelector("[data-pf-gallery-frame]");
        const mainImg = document.querySelector("[data-pf-main-img]");
        const mainSource = document.querySelector("[data-pf-main-source]");
        const thumbs = document.querySelectorAll("[data-pf-thumb]");
        if (!frame || !mainImg || !thumbs.length) return;

        thumbs.forEach((thumb) => {
            thumb.addEventListener("click", () => {
                if (thumb.getAttribute("aria-current") === "true") return;
                thumbs.forEach((t) => t.setAttribute("aria-current", "false"));
                thumb.setAttribute("aria-current", "true");

                gsap.to(frame, {
                    autoAlpha: 0,
                    duration: 0.18,
                    ease: "power1.in",
                    onComplete: () => {
                        if (mainSource) mainSource.srcset = thumb.dataset.webp;
                        mainImg.src = thumb.dataset.jpg;
                        mainImg.alt = thumb.dataset.alt;
                        gsap.to(frame, { autoAlpha: 1, duration: 0.35, ease: "power2.out" });
                    },
                });
            });
        });
    }

    /* ---------------------------------- 4. Vous aimerez aussi — reveal 3D ---------------------------------- */

    function initAlsoReveal() {
        const items = gsap.utils.toArray("[data-pf-also-item]");
        if (!items.length) return;

        gsap.set(items, { rotateY: 20, autoAlpha: 0, transformPerspective: 1000, transformOrigin: "50% 50%" });

        ScrollTrigger.batch(items, {
            start: "top 88%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    rotateY: 0,
                    autoAlpha: 1,
                    duration: 0.8,
                    ease: "power3.out",
                    stagger: 0.1,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- Sélecteur de taille ---------------------------------- */

    function initSizeSelector() {
        const sizes = document.querySelectorAll("[data-pf-size]");
        const hint = document.querySelector("[data-pf-size-hint]");
        const addBtn = document.querySelector("[data-pf-add]");
        const quickBuy = document.querySelector("[data-pf-quick-buy]");
        if (!sizes.length) return;

        sizes.forEach((btn) => btn.setAttribute("aria-pressed", "false"));

        sizes.forEach((btn) => {
            btn.addEventListener("click", () => {
                sizes.forEach((b) => b.setAttribute("aria-pressed", "false"));
                btn.setAttribute("aria-pressed", "true");
                if (hint) hint.textContent = T.sizeSelected(btn.textContent);
                if (addBtn) addBtn.disabled = false;
                if (quickBuy) quickBuy.setAttribute("aria-disabled", "false");
            });
        });
    }

    /* ---------------------------------- Accordéon — hauteur mesurée puis animée ---------------------------------- */
    /* On force temporairement height:auto pour lire la hauteur réelle du
       contenu (offsetHeight), puis on anime depuis/vers cette valeur — fiable
       sur tous les navigateurs, contrairement à l'interpolation CSS de
       grid-template-rows qui n'est pas supportée partout. */

    function initAccordion() {
        const triggers = document.querySelectorAll("[data-pf-accordion-trigger]");

        triggers.forEach((trigger) => {
            const panel = trigger.nextElementSibling;
            if (!panel) return;
            gsap.set(panel, { height: 0, overflow: "hidden" });

            trigger.addEventListener("click", () => {
                const expanded = trigger.getAttribute("aria-expanded") === "true";

                if (expanded) {
                    trigger.setAttribute("aria-expanded", "false");
                    gsap.to(panel, { height: 0, duration: 0.35, ease: "power2.inOut" });
                } else {
                    trigger.setAttribute("aria-expanded", "true");
                    gsap.set(panel, { height: "auto" });
                    const target = panel.offsetHeight;
                    gsap.fromTo(panel, { height: 0 }, { height: target, duration: 0.35, ease: "power2.inOut", onComplete: () => gsap.set(panel, { height: "auto" }) });
                }
            });
        });
    }

    /* ---------------------------------- Ajouter au panier + Annuler ---------------------------------- */
    /* Le clic ajoute réellement l'article au panier partagé (window.MIDI.cart,
       défini dans cart.js, persistant en localStorage) — plus un simple
       compteur cosmétique qui se perdait en changeant de page. Le bouton
       "Annuler" retire l'article ajouté si le clic était une erreur. */

    function initAddToCart() {
        const addBtn = document.querySelector("[data-pf-add]");
        const cancelBtn = document.querySelector("[data-pf-cancel]");
        if (!addBtn || !window.MIDI || !window.MIDI.cart) return;

        const original = addBtn.textContent;
        const slug = addBtn.dataset.productSlug;
        const name = addBtn.dataset.productName;
        const price = parseFloat(addBtn.dataset.productPrice);
        const image = addBtn.dataset.productImage;
        let hideTimer = null;
        let lastSize = null;

        const resetCancel = () => {
            if (cancelBtn) cancelBtn.hidden = true;
            clearTimeout(hideTimer);
        };

        addBtn.addEventListener("click", () => {
            if (addBtn.disabled) return;
            const sizeBtn = document.querySelector('[data-pf-size][aria-pressed="true"]');
            const size = sizeBtn ? sizeBtn.textContent.trim() : null;
            if (!size) return;

            lastSize = size;
            window.MIDI.cart.addItem({ slug, name, price, size, image });
            addBtn.textContent = T.added;

            if (cancelBtn) {
                cancelBtn.hidden = false;
                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    resetCancel();
                    addBtn.textContent = original;
                }, 6000);
            }
        });

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                if (lastSize) window.MIDI.cart.removeItem(slug, lastSize);
                addBtn.textContent = original;
                resetCancel();
            });
        }
    }

    /* ---------------------------------- Achat rapide — Stripe Payment Link ---------------------------------- */
    /* Alternative sans aucun backend au panier + create-checkout-session :
       un Stripe Payment Link se crée en 2 minutes dans le dashboard Stripe
       (aucun code), et fonctionne dès aujourd'hui — contrairement au panier
       multi-produits, un Payment Link représente UN produit à prix fixe,
       donc adapté à un "acheter maintenant" mais pas à un panier mixte.
       La taille choisie est transmise en client_reference_id : elle apparaît
       dans le dashboard Stripe au moment de préparer la commande, même sans
       configurer de champ personnalisé côté Stripe. */

    function initQuickBuy() {
        const quickBuy = document.querySelector("[data-pf-quick-buy]");
        if (!quickBuy) return;

        quickBuy.addEventListener("click", (e) => {
            e.preventDefault();
            if (quickBuy.getAttribute("aria-disabled") === "true") return;

            const link = quickBuy.dataset.paymentLink;
            if (!link || link.includes("REMPLACER")) {
                quickBuy.insertAdjacentHTML(
                    "afterend",
                    `<p class="pf-quick-buy-note">${T.quickBuyNotConfigured}</p>`
                );
                quickBuy.remove();
                return;
            }

            const sizeBtn = document.querySelector('[data-pf-size][aria-pressed="true"]');
            const size = sizeBtn ? sizeBtn.textContent.trim() : "";

            const url = new URL(link);
            if (size) url.searchParams.set("client_reference_id", `${T.sizePrefix}-${size}`);
            window.location.href = url.toString();
        });
    }
})();