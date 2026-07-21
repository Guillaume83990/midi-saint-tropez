/* ==========================================================================
   midi. — panier.js
   Rendu du panier (depuis window.MIDI.cart, cart.js), quantités, retrait
   d'articles, et amorce du paiement Stripe.

   Point important, à lire avant de brancher un vrai paiement :
   Stripe exige que la session de paiement soit créée CÔTÉ SERVEUR, avec
   la clé secrète — cette clé ne doit jamais apparaître dans du code
   navigateur, ce qui exclut par nature un site 100 % statique. Le code
   ci-dessous appelle un endpoint /api/create-checkout-session qui n'existe
   pas encore dans ce projet : un exemple prêt à l'emploi est fourni à
   côté (dossier server-example/) pour Vercel/Netlify Functions. Tant que
   cet endpoint n'est pas déployé, le bouton affiche une explication claire
   plutôt que de simuler un faux succès.
   ========================================================================== */

(() => {
    "use strict";

    const CHECKOUT_ENDPOINT = "/api/create-checkout-session";
    const STRIPE_PUBLISHABLE_KEY = "pk_test_REMPLACER_PAR_TA_CLE_PUBLIQUE";

    /* Le HTML est traduit page par page, mais ce script est partagé par
       toutes les pages (FR et EN) : le texte qu'il génère dynamiquement
       (lignes du panier, prix, messages de paiement) doit donc suivre la
       langue de la page plutôt que d'être figé en français. On la détecte
       une fois via l'attribut lang de <html>, déjà correct sur chaque page
       (lang="fr" ou lang="en"). */
    const LANG = document.documentElement.lang === "en" ? "en" : "fr";
    const LOCALE = LANG === "en" ? "en-GB" : "fr-FR";

    const STRINGS = {
        fr: {
            size: (s) => `Taille ${s}`,
            qtyDecrease: "Diminuer la quantité",
            qtyIncrease: "Augmenter la quantité",
            remove: "Retirer",
            checkoutIdle: "Procéder au paiement",
            checkoutLoading: "Connexion à Stripe…",
            checkoutNote: "Le paiement Stripe nécessite un petit serveur (clé secrète Stripe, jamais exposée dans le navigateur) — voir server-example/ pour un endpoint prêt à déployer sur Vercel ou Netlify Functions.",
            price: (amount) => `${amount.toLocaleString(LOCALE)} €`,
        },
        en: {
            size: (s) => `Size ${s}`,
            qtyDecrease: "Decrease quantity",
            qtyIncrease: "Increase quantity",
            remove: "Remove",
            checkoutIdle: "Proceed to Payment",
            checkoutLoading: "Connecting to Stripe…",
            checkoutNote: "Stripe checkout requires a small server (Stripe secret key, never exposed in the browser) — see server-example/ for a ready-to-deploy endpoint for Vercel or Netlify Functions.",
            price: (amount) => `€${amount.toLocaleString(LOCALE)}`,
        },
    };
    const T = STRINGS[LANG];

    let showingSuccess = false;

    document.addEventListener("DOMContentLoaded", () => {
        initReveal();
        showingSuccess = handleRedirectState();
        render();

        document.addEventListener("midi:cart-updated", render);

        const checkoutBtn = document.querySelector("[data-pn-checkout]");
        if (checkoutBtn) checkoutBtn.addEventListener("click", startCheckout);
    });

    /* ---------------------------------- Entrée — fondu simple au chargement ---------------------------------- */
    /* Page utilitaire, comme Contact : pas de pin, une entrée rapide. */

    function initReveal() {
        const reveals = document.querySelectorAll("[data-pn-reveal]");
        if (!reveals.length || !window.gsap) return;
        gsap.set(reveals, { autoAlpha: 0, y: 14 });
        gsap.to(reveals, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.08, delay: 0.1 });
    }

    /* ---------------------------------- Rendu ---------------------------------- */

    function render() {
        if (showingSuccess) return;

        const items = window.MIDI && window.MIDI.cart ? window.MIDI.cart.read() : [];
        const itemsEl = document.querySelector("[data-pn-items]");
        const layoutEl = document.querySelector("[data-pn-layout]");
        const emptyEl = document.querySelector("[data-pn-empty]");
        const subtotalEl = document.querySelector("[data-pn-subtotal]");
        const totalEl = document.querySelector("[data-pn-total]");
        if (!itemsEl) return;

        if (!items.length) {
            if (layoutEl) layoutEl.hidden = true;
            if (emptyEl) emptyEl.hidden = false;
            return;
        }

        if (layoutEl) layoutEl.hidden = false;
        if (emptyEl) emptyEl.hidden = true;

        itemsEl.innerHTML = items.map(itemTemplate).join("");

        const total = window.MIDI.cart.getTotal();
        const formatted = formatPrice(total);
        if (subtotalEl) subtotalEl.textContent = formatted;
        if (totalEl) totalEl.textContent = formatted;

        const renderedItems = itemsEl.querySelectorAll("[data-pn-item]");
        if (window.gsap) {
            gsap.set(renderedItems, { autoAlpha: 0, y: 10 });
            gsap.to(renderedItems, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.05 });
        }
        renderedItems.forEach(bindItem);
    }

    function itemTemplate(item) {
        return `
      <article class="pn-item" data-pn-item data-slug="${item.slug}" data-size="${item.size}">
        <img class="pn-item__img" src="${item.image}" alt="${item.name}" loading="lazy" decoding="async">
        <div class="pn-item__info">
          <p class="pn-item__name">${item.name}</p>
          <p class="pn-item__size">${T.size(item.size)}</p>
          <div class="pn-item__qty">
            <button class="pn-item__qty-btn" type="button" data-pn-qty="-1" aria-label="${T.qtyDecrease}">−</button>
            <span class="pn-item__qty-value">${item.qty}</span>
            <button class="pn-item__qty-btn" type="button" data-pn-qty="1" aria-label="${T.qtyIncrease}">+</button>
          </div>
        </div>
        <div class="pn-item__aside">
          <p class="pn-item__price">${formatPrice(item.price * item.qty)}</p>
          <button class="pn-item__remove" type="button" data-pn-remove>${T.remove}</button>
        </div>
      </article>
    `;
    }

    function bindItem(el) {
        const slug = el.dataset.slug;
        const size = el.dataset.size;

        el.querySelectorAll("[data-pn-qty]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const current = window.MIDI.cart.read().find((i) => i.slug === slug && i.size === size);
                if (!current) return;
                const delta = parseInt(btn.dataset.pnQty, 10);
                window.MIDI.cart.updateQty(slug, size, current.qty + delta);
            });
        });

        const removeBtn = el.querySelector("[data-pn-remove]");
        if (removeBtn) {
            removeBtn.addEventListener("click", () => window.MIDI.cart.removeItem(slug, size));
        }
    }

    function formatPrice(amount) {
        return T.price(amount);
    }

    /* ---------------------------------- Paiement ---------------------------------- */

    async function startCheckout() {
        const note = document.querySelector("[data-pn-checkout-note]");
        const btn = document.querySelector("[data-pn-checkout]");
        const items = window.MIDI && window.MIDI.cart ? window.MIDI.cart.read() : [];
        if (!items.length) return;

        btn.disabled = true;
        btn.textContent = T.checkoutLoading;
        if (note) note.hidden = true;

        try {
            const response = await fetch(CHECKOUT_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            });

            if (!response.ok) throw new Error("endpoint indisponible");

            const { id } = await response.json();
            const stripe = window.Stripe ? window.Stripe(STRIPE_PUBLISHABLE_KEY) : null;
            if (!stripe) throw new Error("Stripe.js non chargé");

            const { error } = await stripe.redirectToCheckout({ sessionId: id });
            if (error) throw error;
        } catch (err) {
            /* C'est le chemin attendu tant qu'aucun serveur n'est déployé : pas
               d'erreur brute en console pour la personne qui teste le site, une
               explication honnête à la place. */
            btn.textContent = T.checkoutIdle;
            btn.disabled = false;
            if (note) {
                note.hidden = false;
                note.textContent = T.checkoutNote;
            }
        }
    }

    /* ---------------------------------- Retour depuis Stripe ---------------------------------- */
    /* success_url / cancel_url (voir server-example/) redirigent ici avec un
       paramètre : on affiche l'état correspondant, et on vide le panier
       uniquement en cas de succès réel. */

    function handleRedirectState() {
        const params = new URLSearchParams(window.location.search);
        const successEl = document.querySelector("[data-pn-success]");
        const layoutEl = document.querySelector("[data-pn-layout]");
        const emptyEl = document.querySelector("[data-pn-empty]");

        if (params.get("success") === "1") {
            if (window.MIDI && window.MIDI.cart) window.MIDI.cart.clear();
            if (successEl) successEl.hidden = false;
            if (layoutEl) layoutEl.hidden = true;
            if (emptyEl) emptyEl.hidden = true;
            return true;
        }

        return false;
    }
})();