// server-example/api/create-checkout-session.js
//
// Exemple d'endpoint serveur pour créer une session de paiement Stripe.
// Format compatible Vercel (Serverless Functions) tel quel ; adaptable en
// quelques lignes pour Netlify Functions ou un petit serveur Express.
//
// ⚠️ CE FICHIER NE PEUT PAS TOURNER SUR UN HÉBERGEMENT 100 % STATIQUE
// (GitHub Pages, Cloudflare Pages en mode statique, etc.) : il lui faut
// une exécution serveur (Vercel, Netlify, un VPS avec Node...) car il
// utilise la clé secrète Stripe, qui ne doit JAMAIS être exposée dans le
// code envoyé au navigateur.
//
// Installation :
//   npm install stripe
// Variable d'environnement à définir sur l'hébergeur (jamais dans le code) :
//   STRIPE_SECRET_KEY=sk_live_... (ou sk_test_... en développement)

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Méthode non autorisée." });
    }

    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Panier vide." });
        }

        // price_data (tarification à la volée) plutôt que des Price ID
        // pré-créés dans le dashboard Stripe : plus simple à faire évoluer
        // tant que le catalogue midi. n'est pas géré directement dans Stripe.
        const line_items = items.map((item) => ({
            price_data: {
                currency: "eur",
                product_data: {
                    name: `${item.name} — Taille ${item.size}`,
                    images: item.image ? [`${absoluteOrigin(req)}/${item.image}`] : undefined,
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.qty,
        }));

        const origin = absoluteOrigin(req);

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items,
            shipping_address_collection: { allowed_countries: ["FR", "BE", "CH", "LU", "MC"] },
            success_url: `${origin}/panier.html?success=1`,
            cancel_url: `${origin}/panier.html?canceled=1`,
        });

        return res.status(200).json({ id: session.id });
    } catch (err) {
        console.error("Stripe checkout session error:", err);
        return res.status(500).json({ error: "Impossible de créer la session de paiement." });
    }
}

function absoluteOrigin(req) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    return `${proto}://${req.headers.host}`;
}