/* ==========================================================================
   midi. — index.js
   Animations spécifiques à la page d'accueil : entrée hero 3D,
   galerie pin + scroll horizontal avec rotation 3D des silhouettes,
   citation en parallax/tilt 3D. Dépend de gsap, ScrollTrigger et
   window.MIDI (défini dans global.js).
   ========================================================================== */

(() => {
    "use strict";

    const reduceMotion = window.MIDI && window.MIDI.reduceMotion;

    document.addEventListener("DOMContentLoaded", () => {
        /* Toutes les animations de la page sont créées à l'intérieur de ce
           context() : il permet un revert() global (navigation, tests) sans
           avoir à cibler chaque trigger un par un. */
        const pageCtx = gsap.context(() => {
            initHeroIntro();
            initEditorialReveal();
            initGallery();
            initMatieresParallax();
            initQuoteTilt();
            initChiffresFlip();
            initMaisonWipe();
            initSignaturePin();
        }, document.body);

        window.addEventListener("pagehide", () => pageCtx.revert());

        window.addEventListener("load", () => {
            ScrollTrigger.refresh();
            document.body.classList.remove("is-loading");
        });

        const yearEl = document.querySelector("[data-year]");
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    });

    /* ---------------------------------- 0-1. Hero + Intro — plongée immersive 3D, pin unique ---------------------------------- */
    /* L'intro et le hero partagent désormais le même pin et la même timeline
       scrubbée : il n'existe plus de section "intro" séparée dans le flux du
       document (c'était la cause du trou noir signalé — le hero ne devenait
       visible qu'une fois tout le spacer du pin consommé, laissant un vide
       entre les deux). Ici, .intro est une couche absolute DANS .hero
       : le hero est déjà posé en dessous, prêt, pendant que l'intro joue
       par-dessus.
       Au chargement (hors scroll) : la photo plein cadre s'affiche, le
       wordmark apparaît doucement — aucun écran noir.
       Au scroll : un unique ScrollTrigger pinné sur .hero anime tout en même
       temps — la photo d'intro recule en profondeur (scale + translateZ) et
       se resserre (clip-path, effet fenêtre/hublot) jusqu'à disparaître,
       pendant que le titre et le sous-texte du hero se révèlent en
       synchronisation dans la même timeline. Le pin se relâche exactement
       quand le hero atteint son état final : le scroll vertical prend le
       relais au pixel près, sans coupure.
       Sur préférence "mouvement réduit", l'intro est retirée et le hero
       s'affiche directement dans son état final, sans pin ni scroll-jacking. */

    function initHeroIntro() {
        const hero = document.querySelector("[data-hero]");
        if (!hero) return;

        const intro = hero.querySelector("[data-intro]");
        const heroMedia = hero.querySelector("[data-hero-media]");
        const heroReveals = hero.querySelectorAll("[data-hero-reveal]");
        const titleLines = hero.querySelectorAll(".hero__title-line");

        if (!intro || reduceMotion) {
            if (intro) intro.style.display = "none";
            gsap.set(heroMedia, { rotateX: 0, scale: 1, opacity: 1 });
            gsap.set(titleLines, { yPercent: 0, opacity: 1 });
            gsap.set(heroReveals, { autoAlpha: 1, y: 0 });
            return;
        }

        const media = intro.querySelector("[data-intro-media]");
        const wordmark = intro.querySelector("[data-intro-wordmark]");
        const cue = intro.querySelector("[data-intro-cue]");

        gsap.set(heroMedia, { transformPerspective: 1400, rotateX: -10, scale: 1.06, opacity: 1, willChange: "transform" });
        gsap.set(titleLines, { yPercent: 115, opacity: 1 });
        gsap.set(heroReveals, { autoAlpha: 0, y: 18 });
        gsap.set(media, { transformPerspective: 1600, scale: 1, z: 0, clipPath: "inset(0% round 0px)", opacity: 1, willChange: "transform, clip-path, opacity" });
        gsap.set(wordmark, { autoAlpha: 0, y: 10 });

        /* Phase de chargement, indépendante du scroll : le wordmark apparaît
           doucement sur la photo — c'est le premier geste, avant même qu'on
           touche à la molette. */
        gsap.timeline({ delay: 0.15 }).to(wordmark, { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" });

        /* Phase de scroll : un seul pin, une seule timeline pour l'intro ET
           le hero — c'est ce qui garantit la synchronisation "au pixel près"
           demandée, plutôt que deux mécanismes indépendants qui pourraient
           diverger. */
        gsap.timeline({
            scrollTrigger: {
                id: "hero-intro-pin",
                trigger: hero,
                start: "top top",
                end: "+=130%",
                scrub: 0.7,
                pin: true,
                anticipatePin: 1,
                pinSpacing: true,
                onLeave: () => gsap.set(intro, { pointerEvents: "none" }),
                onEnterBack: () => gsap.set(intro, { pointerEvents: "auto" }),
            },
        })
            .to(cue, { autoAlpha: 0, duration: 0.15 }, 0)
            .to(wordmark, { autoAlpha: 0, duration: 0.15 }, 0)
            .to(media, {
                scale: 0.55,
                z: -650,
                clipPath: "inset(10% round 28px)",
                opacity: 0,
                ease: "power2.inOut",
                duration: 0.85,
                onComplete: () => gsap.set(media, { willChange: "auto" }),
            }, 0.05)
            .to(heroMedia, {
                rotateX: 0,
                scale: 1,
                ease: "power2.out",
                duration: 0.85,
                onComplete: () => gsap.set(heroMedia, { willChange: "auto" }),
            }, 0.05)
            .to(titleLines, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: "power3.out" }, 0.35)
            .to(heroReveals, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" }, 0.5);
    }

    /* ---------------------------------- 2. Galerie — pin + scroll horizontal + rotation 3D ---------------------------------- */
    /* Le bloc .gallery__pin est épinglé le temps que .gallery__track parcoure
       sa largeur en horizontal. Chaque .look-card reçoit son propre ScrollTrigger,
       ancré sur ce tween horizontal (containerAnimation), et pivote en 3D
       (rotateY) selon sa position par rapport au centre de l'écran : elle entre
       de profil, se présente de face au centre, ressort de profil inverse — comme
       une planche de mode qui se retourne sous la lumière.
       Expérience volontairement identique sur PC, tablette et smartphone (même
       pin, même scroll horizontal, même rotation 3D) : à noter que c'est un
       choix assumé plutôt qu'un défaut — un pin horizontal coûte davantage en
       FPS/batterie qu'un scroll natif sur les appareils d'entrée de gamme. Si
       des retours terrain montrent un souci de fluidité sur mobile bas de
       gamme, la bascule vers un fallback plus léger sur ce seul point reste
       simple à réintroduire. */

    function initGallery() {
        const pin = document.querySelector("[data-gallery-pin]");
        const track = document.querySelector("[data-gallery-track]");
        if (!pin || !track) return;

        const cards = gsap.utils.toArray("[data-look-card]", track);
        gsap.set(track.parentElement, { transformStyle: "preserve-3d" });

        const getDistance = () =>
            track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(track).paddingRight || 0) + window.innerWidth * 0.05;

        const horizontalTween = gsap.to(track, {
            x: () => -getDistance(),
            ease: "none",
            scrollTrigger: {
                id: "gallery-pin",
                trigger: pin,
                start: "top top",
                end: () => `+=${getDistance() + window.innerHeight * 0.6}`,
                scrub: 1,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
            },
        });

        cards.forEach((card) => {
            const frame = card.querySelector(".look-card__frame");
            const glare = card.querySelector("[data-look-glare]");
            const ghost = card.querySelector("[data-look-ghost]");

            /* Seul le cadre (l'image) pivote en 3D. La légende (.look-card__caption)
               n'est jamais transformée : un texte lu à travers une perspective
               rotateY devient flou et illisible dès qu'il s'éloigne du centre de
               l'écran — elle reste donc parfaitement lisible tout au long du
               scroll horizontal, quelle que soit la position de la carte. */
            gsap.set(frame, { transformPerspective: 1600, willChange: "transform" });

            gsap.timeline({
                scrollTrigger: {
                    trigger: card,
                    containerAnimation: horizontalTween,
                    start: "left 90%",
                    end: "right 10%",
                    scrub: true,
                },
            })
                .fromTo(
                    frame,
                    { rotateY: 34, scale: 0.88, z: -90 },
                    { rotateY: 0, scale: 1, z: 0, ease: "power1.out", duration: 0.5 }
                )
                .to(frame, { rotateY: -34, scale: 0.88, z: -90, ease: "power1.in", duration: 0.5 });

            if (glare) {
                gsap.fromTo(
                    glare,
                    { xPercent: -120 },
                    {
                        xPercent: 120,
                        ease: "none",
                        scrollTrigger: {
                            trigger: card,
                            containerAnimation: horizontalTween,
                            start: "left 85%",
                            end: "right 15%",
                            scrub: true,
                        },
                    }
                );
            }

            if (ghost) {
                gsap.fromTo(
                    ghost,
                    { xPercent: 40, rotateZ: 8, opacity: 0.06 },
                    {
                        xPercent: -40,
                        rotateZ: -8,
                        opacity: 0.16,
                        ease: "none",
                        scrollTrigger: {
                            trigger: card,
                            containerAnimation: horizontalTween,
                            start: "left 130%",
                            end: "right -30%",
                            scrub: true,
                        },
                    }
                );
            }
        });
    }

    /* ---------------------------------- 3. Citation — tilt 3D scroll + souris ---------------------------------- */
    /* Le plan image de la citation s'incline sur l'axe X au fil du scroll,
       comme un tirage posé en biais sous une vitrine. Le mouvement de la
       souris ajoute une légère rotation Y indépendante, combinée en continu
       via quickTo pour rester fluide sans relancer de nouveaux tweens. */

    function initQuoteTilt() {
        const section = document.querySelector("[data-quote]");
        const media = document.querySelector("[data-quote-media]");
        const text = document.querySelector("[data-quote-text]");
        if (!section || !media) return;

        gsap.set(media, { transformPerspective: 1200, rotateX: 6, willChange: "transform" });

        gsap.to(media, {
            rotateX: -6,
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
            },
        });

        if (text) {
            gsap.to(text, {
                yPercent: 14,
                ease: "none",
                scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1.4,
                },
            });
        }

        /* Le tilt piloté par la souris n'a de sens qu'avec un pointeur fin :
           on l'exclut des appareils tactiles (économie de listeners + de
           calculs inutiles sur mobile) et du mode mouvement réduit. */
        const isTouchDevice = window.MIDI && window.MIDI.isTouchDevice;
        if (!reduceMotion && !isTouchDevice && window.matchMedia("(min-width: 900px)").matches) {
            const quickRotateY = gsap.quickTo(media, "rotateY", { duration: 0.7, ease: "power3.out" });

            section.addEventListener("mousemove", (e) => {
                const rect = section.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width - 0.5;
                quickRotateY(relX * 14);
            }, { passive: true });

            section.addEventListener("mouseleave", () => quickRotateY(0), { passive: true });
        }
    }

    /* ---------------------------------- 4. Éditorial — reveal par masque circulaire + profondeur ---------------------------------- */
    /* L'image est cachée derrière un masque circulaire qui s'ouvre au scroll
       (clip-path), tandis qu'un léger flou se dissipe pour simuler une mise
       au point — l'image "arrive" depuis le flou plutôt que de simplement
       apparaître. La légende suit, tirée depuis la profondeur (translateZ). */

    function initEditorialReveal() {
        const section = document.querySelector("[data-editorial]");
        const mask = document.querySelector("[data-editorial-mask]");
        const caption = document.querySelector("[data-editorial-caption]");
        if (!section || !mask) return;

        const img = mask.querySelector("img");

        gsap.set(mask, { clipPath: "circle(18% at 50% 50%)", willChange: "clip-path" });
        gsap.set(img, { filter: "blur(14px)", scale: 1.2, willChange: "transform, filter" });
        if (caption) gsap.set(caption, { autoAlpha: 0, z: -260, transformPerspective: 1000 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top 75%",
                end: "bottom 55%",
                scrub: 1,
            },
        });

        tl.to(mask, { clipPath: "circle(75% at 50% 50%)", ease: "power2.out" }, 0)
            .to(img, { filter: "blur(0px)", scale: 1.05, ease: "power2.out" }, 0);

        if (caption) {
            tl.to(caption, { autoAlpha: 1, z: 0, ease: "power2.out" }, 0.35);
        }
    }

    /* ---------------------------------- 5. Matières — diorama 3D en trois plans ---------------------------------- */
    /* Trois images sont posées à des profondeurs distinctes (translateZ) dans
       un même conteneur en perspective, puis se déplacent chacune à sa propre
       vitesse pendant le scroll : le plan avant va plus vite que le plan
       arrière, ce qui crée un vrai relief plutôt qu'un parallax plat. */

    function initMatieresParallax() {
        const scene = document.querySelector("[data-matieres-scene]");
        if (!scene) return;

        const depths = { back: { z: -160, speed: 40 }, mid: { z: 0, speed: -60 }, front: { z: 140, speed: 90 } };

        Object.entries(depths).forEach(([key, d]) => {
            const layer = scene.querySelector(`[data-matieres-layer="${key}"]`);
            if (!layer) return;

            gsap.set(layer, { z: d.z, transformPerspective: 1400, willChange: "transform" });

            gsap.fromTo(
                layer,
                { yPercent: -d.speed / 2 },
                {
                    yPercent: d.speed / 2,
                    ease: "none",
                    scrollTrigger: {
                        trigger: scene,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 1,
                    },
                }
            );
        });
    }

    /* ---------------------------------- 6. Ateliers en chiffres — flip 3D ---------------------------------- */
    /* Chaque nombre bascule sur l'axe X comme un chiffre de compteur mécanique,
       depuis 90° (à plat, invisible) jusqu'à 0°, en léger décalage entre les
       trois statistiques. */

    function initChiffresFlip() {
        const nums = gsap.utils.toArray("[data-stat-num]");
        if (!nums.length) return;

        gsap.set(nums, { transformPerspective: 800, rotateX: 90, autoAlpha: 0, transformOrigin: "50% 100%" });

        ScrollTrigger.batch(nums, {
            start: "top 88%",
            onEnter: (batch) => {
                gsap.set(batch, { willChange: "transform, opacity" });
                gsap.to(batch, {
                    rotateX: 0,
                    autoAlpha: 1,
                    duration: 0.9,
                    ease: "back.out(1.6)",
                    stagger: 0.15,
                    onComplete: () => gsap.set(batch, { willChange: "auto" }),
                });
            },
            once: true,
        });
    }

    /* ---------------------------------- 7. Maison — rideau d'ouverture (clip-path) ---------------------------------- */

    function initMaisonWipe() {
        const media = document.querySelector("[data-maison-media]");
        if (!media) return;

        gsap.set(media, { clipPath: "inset(0 0 0 100%)", willChange: "clip-path" });

        gsap.to(media, {
            clipPath: "inset(0 0 0 0%)",
            duration: 1.3,
            ease: "power4.out",
            onComplete: () => gsap.set(media, { willChange: "auto" }),
            scrollTrigger: {
                trigger: media,
                start: "top 82%",
                once: true,
            },
        });
    }

    /* ---------------------------------- 8. Signature — clôture pinnée, effet caméra ---------------------------------- */
    /* Court pin (indépendant de celui de la galerie) pendant lequel l'image
       recule légèrement en profondeur, un reflet balaie la scène et le texte
       se resserre pour son entrée — un dernier geste, bref et appuyé, avant
       le formulaire du Cercle. */

    function initSignaturePin() {
        const pin = document.querySelector("[data-signature-pin]");
        const media = document.querySelector("[data-signature-media]");
        const glare = document.querySelector("[data-signature-glare]");
        const title = document.querySelector("[data-signature-title]");
        if (!pin) return;

        gsap.set(media, { scale: 1.25, transformPerspective: 1000, willChange: "transform" });
        gsap.set(title, { scale: 0.85, autoAlpha: 0, letterSpacing: "0.06em", willChange: "transform, opacity" });

        gsap.timeline({
            scrollTrigger: {
                trigger: pin,
                start: "top top",
                end: "+=90%",
                scrub: 1,
                pin: true,
                anticipatePin: 1,
            },
        })
            .to(media, { scale: 1, ease: "none" }, 0)
            .to(title, { scale: 1, autoAlpha: 1, letterSpacing: "0em", ease: "power2.out", duration: 0.6 }, 0.15)
            .fromTo(glare, { xPercent: -140 }, { xPercent: 140, ease: "none", duration: 0.7 }, 0.2);
    }
})();