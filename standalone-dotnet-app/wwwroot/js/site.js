(() => {
    const root = document.documentElement;

    const toggle = document.querySelector(".theme-toggle");
    if (toggle) {
        const sync = () => toggle.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
        toggle.addEventListener("click", () => {
            root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
            try {
                localStorage.setItem("theme", root.dataset.theme);
            } catch {
                // Private browsing can block storage; the toggle still works for this page.
            }
            sync();
        });
        sync();
    }

    const bar = document.querySelector(".progress span");
    const article = document.querySelector(".post-body");
    if (bar && article) {
        const update = () => {
            const rect = article.getBoundingClientRect();
            const scrollable = rect.height - window.innerHeight;
            const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 1;
            bar.style.transform = `scaleX(${progress})`;
        };
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        update();
    }
})();
