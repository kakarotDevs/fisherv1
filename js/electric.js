// Electric effects for Fishereas. Styles live in css/styles.css under
// "ELECTRIC EFFECTS". The power-on intro (1) and service icons (3) are CSS
// only; this file runs the current line (2), the gallery lights (5) and the
// pointer sparks (6).
(() => {
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

    const el = (tag, className) => {
        const node = document.createElement(tag);
        node.className = className;
        return node;
    };

    // 2. A hairline from the hero to the contact section. Its gradient fill and
    // glowing tip follow the scroll; each section lights as the current reaches it.
    function initCircuit() {
        const main = document.querySelector("main");
        const hero = document.querySelector(".hero");
        if (!main || !hero) return;

        const wire = el("div", "circuit");
        const fill = el("div", "circuit-fill");
        const spark = el("div", "circuit-spark");
        spark.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5l1-8z" /></svg>';
        wire.setAttribute("aria-hidden", "true");
        wire.append(fill, spark);
        main.prepend(wire);

        let height = 0;
        let queued = false;

        function shock(node) {
            node.classList.remove("is-shocked");
            void node.offsetWidth; // restart the animation if it's mid-flash
            node.classList.add("is-shocked");
            setTimeout(() => node.classList.remove("is-shocked"), 500);
        }

        function measure() {
            const mainTop = main.getBoundingClientRect().top;
            const top = hero.getBoundingClientRect().top - mainTop;
            const last = document.querySelector("#contact") || main.lastElementChild;
            const end = last.getBoundingClientRect().bottom - mainTop;
            height = Math.max(end - top, 0);
            wire.style.top = `${top}px`;
            wire.style.height = `${height}px`;
        }

        function update() {
            queued = false;
            const wireTop = wire.getBoundingClientRect().top;
            const atBottom =
                innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
            const reach = atBottom ? height : innerHeight * 0.6 - wireTop;
            const length = Math.min(Math.max(reach, 0), height);

            fill.style.transform = `scaleY(${height ? length / height : 0})`;
            spark.style.transform = `translateY(${length - 8}px)`;

            document.querySelectorAll("#services, #contact").forEach((section) => {
                const label = section.querySelector("h2");
                if (!label) return;
                const box = label.getBoundingClientRect();
                const nodeY = box.top + box.height / 2 - wireTop;
                const powered = length >= nodeY;
                // The bolt arriving at a node gives it (and itself) a quick shock.
                if (powered && !section.classList.contains("is-powered")) {
                    shock(spark);
                    shock(section);
                }
                section.classList.toggle("is-powered", powered);
            });
        }

        const queue = () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(update);
        };
        const remeasure = () => {
            measure();
            queue();
        };

        measure();
        update();
        addEventListener("scroll", queue, { passive: true });
        addEventListener("resize", remeasure);
        // Sections load in later (HTMX) and galleries open and close.
        new ResizeObserver(remeasure).observe(main);
    }

    // 6. A few sparks fly off the mouse pointer as it arrives on anything
    // clickable. Mouse only, never with reduced motion.
    function initSparkCursor() {
        if (!finePointer || reduceMotion) return;

        const targets = "a, button, .services-header, .gallery-image-wrapper";
        let current = null;

        function burst(px, py) {
            for (let i = 0; i < 6; i++) {
                const spark = el("span", "spark");
                spark.setAttribute("aria-hidden", "true");
                spark.style.setProperty("--x", `${px}px`);
                spark.style.setProperty("--y", `${py}px`);
                spark.style.setProperty("--a", `${i * 60 + Math.random() * 40}deg`);
                spark.style.setProperty("--d", `${14 + Math.random() * 10}px`);
                spark.addEventListener("animationend", () => spark.remove());
                document.body.append(spark);
            }
        }

        addEventListener(
            "pointermove",
            (e) => {
                if (e.pointerType !== "mouse") return;
                const target = e.target.closest ? e.target.closest(targets) : null;
                if (target !== current) {
                    current = target;
                    if (target) burst(e.clientX, e.clientY);
                }
            },
            { passive: true },
        );
    }

    // 5. A gallery opens as dark skeleton tiles. Once its photos have loaded,
    // the lights click on tile by tile, in random order. Closing it turns them off again.
    function initGalleryLights() {
        document.documentElement.classList.add("fx");
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        function lightUp(item, track) {
            // Each tile gets its own random switch-on time, like rooms being lit
            // at different moments. One is always near-instant so it starts promptly.
            const tiles = [...track.querySelectorAll(".gallery-image-wrapper")];
            const first = Math.floor(Math.random() * tiles.length);
            tiles.forEach((tile, i) => {
                const delay = i === first ? 0 : 60 + Math.random() * 520;
                tile.style.setProperty("--d", `${Math.round(delay)}ms`);
            });
            const images = [...track.querySelectorAll("img")];
            images.forEach((img) => (img.loading = "eager"));
            const loaded = Promise.all(
                images.map((img) =>
                    img.complete && img.naturalWidth
                        ? Promise.resolve()
                        : img.decode().catch(() => {}),
                ),
            );
            // Show the skeleton for a beat even when cached (the gallery takes
            // ~0.4s to open), and never more than 2.5s.
            Promise.race([Promise.all([loaded, wait(420)]), wait(2500)]).then(() => {
                if (item.classList.contains("active")) track.classList.add("lights-on");
            });
        }

        function sync() {
            document.querySelectorAll(".services-item").forEach((item) => {
                const track = item.querySelector(".gallery-track");
                if (!track) return;
                const open = item.classList.contains("active");
                if (!open) {
                    track.classList.remove("lights-on");
                    delete track.dataset.lighting;
                } else if (!track.dataset.lighting) {
                    track.dataset.lighting = "1";
                    lightUp(item, track);
                }
            });
        }

        // The accordion toggles .active in its own click handler; check after it.
        document.addEventListener("click", (e) => {
            if (e.target.closest && e.target.closest(".services-item")) {
                requestAnimationFrame(sync);
            }
        });
    }

    initCircuit();
    initGalleryLights();
    initSparkCursor();
})();
