// Client-side search over /search-index.json. Every term in the query must match.
(() => {
    const input = document.getElementById("search-input");
    const status = document.getElementById("search-status");
    const results = document.getElementById("search-results");
    if (!input || !status || !results) {
        return;
    }

    const escapeHtml = (value) =>
        value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const highlight = (text, terms) => {
        let html = escapeHtml(text);
        if (terms.length === 0) {
            return html;
        }
        const pattern = new RegExp(`(${terms.map((t) => escapeRegExp(escapeHtml(t))).join("|")})`, "gi");
        return html.replace(pattern, "<mark>$1</mark>");
    };

    let posts = [];

    const render = () => {
        const query = input.value.trim();
        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

        const matches = posts.filter((post) => terms.every((term) => post.haystack.includes(term)));

        if (terms.length === 0) {
            status.textContent = `Showing all ${posts.length} articles.`;
        } else if (matches.length === 0) {
            status.textContent = `No articles match \u201c${query}\u201d.`;
        } else {
            status.textContent = `${matches.length} ${matches.length === 1 ? "article matches" : "articles match"} \u201c${query}\u201d.`;
        }

        results.innerHTML = matches
            .map(
                (post) => `
                <li class="search-result" style="--cat: ${escapeHtml(post.color)}">
                  <a href="${escapeHtml(post.url)}">
                    <span class="chip chip-sm">${escapeHtml(post.category)}</span>
                    <h2>${highlight(post.title, terms)}</h2>
                    <p>${highlight(post.summary, terms)}</p>
                    <span class="meta">${escapeHtml(post.author)} &middot; ${escapeHtml(post.date)}</span>
                  </a>
                </li>`
            )
            .join("");

        const url = new URL(window.location.href);
        if (query) {
            url.searchParams.set("q", query);
        } else {
            url.searchParams.delete("q");
        }
        history.replaceState(null, "", url);
    };

    input.value = new URLSearchParams(window.location.search).get("q") ?? "";
    status.textContent = "Loading articles\u2026";

    fetch("/search-index.json")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then((index) => {
            posts = index.map((post) => ({
                ...post,
                haystack: [post.title, post.summary, post.category, post.author, ...post.tags].join(" ").toLowerCase(),
            }));
            render();
            input.addEventListener("input", render);
        })
        .catch(() => {
            status.textContent = "Search is unavailable right now. Try the archive instead.";
        });

    if (!input.value) {
        input.focus();
    }
})();
