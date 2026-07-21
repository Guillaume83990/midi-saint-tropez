/* ==========================================================================
   midi. — cart.js
   Panier partagé par toutes les pages : persistance réelle en
   localStorage (pas juste un compteur en mémoire qui se perd au
   changement de page), API commune (addItem/removeItem/updateQty),
   et mise à jour automatique du badge "Panier (N)" du header partout.
   Chargé juste après global.js sur toutes les pages.
   ========================================================================== */

(() => {
    "use strict";

    const STORAGE_KEY = "midi_cart";

    const read = () => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const items = raw ? JSON.parse(raw) : [];
            return Array.isArray(items) ? items : [];
        } catch (e) {
            return [];
        }
    };

    const write = (items) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            /* localStorage indisponible (navigation privée stricte, quota) :
               le panier reste fonctionnel pour la session en cours, seule la
               persistance entre pages est perdue. */
        }
        updateHeaderBadge(items);
        document.dispatchEvent(new CustomEvent("midi:cart-updated", { detail: { items } }));
    };

    const updateHeaderBadge = (items) => {
        const badge = document.querySelector(".header-link--cart span");
        if (!badge) return;
        const count = items.reduce((sum, item) => sum + item.qty, 0);
        badge.textContent = `(${count})`;
    };

    /* Un même produit dans deux tailles différentes = deux lignes distinctes,
       comme sur n'importe quel site marchand. */
    const findIndex = (items, slug, size) =>
        items.findIndex((item) => item.slug === slug && item.size === size);

    const addItem = ({ slug, name, price, size, image }) => {
        const items = read();
        const i = findIndex(items, slug, size);
        if (i > -1) {
            items[i].qty += 1;
        } else {
            items.push({ slug, name, price, size, image, qty: 1 });
        }
        write(items);
        return items;
    };

    const removeItem = (slug, size) => {
        const items = read().filter((item) => !(item.slug === slug && item.size === size));
        write(items);
        return items;
    };

    const updateQty = (slug, size, qty) => {
        const items = read();
        const i = findIndex(items, slug, size);
        if (i > -1) {
            if (qty < 1) {
                items.splice(i, 1);
            } else {
                items[i].qty = qty;
            }
        }
        write(items);
        return items;
    };

    const clear = () => {
        write([]);
    };

    const getTotal = () => read().reduce((sum, item) => sum + item.price * item.qty, 0);
    const getCount = () => read().reduce((sum, item) => sum + item.qty, 0);

    document.addEventListener("DOMContentLoaded", () => {
        updateHeaderBadge(read());
    });

    window.MIDI = window.MIDI || {};
    window.MIDI.cart = { read, addItem, removeItem, updateQty, clear, getTotal, getCount };
})();