package com.training.blog;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** Renders every page of the site once, at startup, into HTML strings keyed by URL path. */
final class SiteRenderer {

    private static final String SITE_NAME = "The Build Log";
    private static final String TAGLINE = "Field notes on Java, cloud, and shipping software.";
    private static final DateTimeFormatter LONG_DATE = DateTimeFormatter.ofPattern("MMMM d, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter SHORT_DATE = DateTimeFormatter.ofPattern("MMM d", Locale.ENGLISH);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH);
    private static final int RELATED_POSTS = 3;
    private static final int HOME_LATEST_POSTS = 6;

    private final Site site;
    private final String layout;
    private final String serverInfoHtml;

    SiteRenderer(Site site, String serverInfoHtml) throws IOException {
        this.site = site;
        this.serverInfoHtml = serverInfoHtml;
        try (InputStream in = SiteRenderer.class.getClassLoader().getResourceAsStream("templates/layout.html")) {
            if (in == null) {
                throw new IllegalStateException("Missing templates/layout.html");
            }
            this.layout = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    Map<String, String> renderPages() {
        Map<String, String> pages = new LinkedHashMap<>();
        pages.put("/", home());
        pages.put("/about", about());
        pages.put("/archive", archive());
        pages.put("/search", search());
        pages.put("/search-index.json", searchIndex());
        for (Post post : site.posts()) {
            pages.put(post.url(), post(post));
        }
        for (Category category : site.categories().values()) {
            pages.put(category.url(), category(category));
        }
        for (Author author : site.authors().values()) {
            pages.put(author.url(), author(author));
        }
        return pages;
    }

    String renderNotFound() {
        String content = """
                <section class="container narrow page-head not-found">
                  <p class="eyebrow">Error 404</p>
                  <h1>This page took a different branch</h1>
                  <p class="lede">The page you asked for is not part of this build. Try the search, or start from the latest articles.</p>
                  <form class="search-form" action="/search" role="search">
                    <label class="visually-hidden" for="nf-q">Search articles</label>
                    <input id="nf-q" type="search" name="q" placeholder="Search articles">
                  </form>
                  <p><a class="text-link" href="/">&larr; Back to the home page</a></p>
                </section>
                """;
        return page("Page not found", "The requested page does not exist.", null, content);
    }

    // ---- Pages ----

    private String home() {
        Post featured = site.posts().getFirst();
        List<Post> latest = site.posts().subList(1, Math.min(site.posts().size(), 1 + HOME_LATEST_POSTS));

        StringBuilder html = new StringBuilder();
        html.append("""
                <section class="container intro">
                  <p class="eyebrow">%s</p>
                  <h1>%s</h1>
                  <p class="lede">Long-form articles from engineers who run production systems: what worked, what broke, and what we would do again.</p>
                  <div class="chips">%s</div>
                </section>
                """.formatted(SITE_NAME, escape(TAGLINE), categoryChips()));

        html.append("<section class=\"container\">").append(featuredCard(featured)).append("</section>");

        html.append("""
                <section class="container section">
                  <div class="section-head">
                    <h2>Latest articles</h2>
                    <a class="text-link" href="/archive">Browse the archive &rarr;</a>
                  </div>
                  %s
                </section>
                """.formatted(cardGrid(latest)));

        html.append("""
                <section class="container section">
                  <div class="section-head"><h2>Browse by topic</h2></div>
                  <div class="topic-grid">%s</div>
                </section>
                """.formatted(site.categories().values().stream().map(this::topicCard).collect(Collectors.joining())));

        html.append("""
                <section class="container section">
                  <div class="section-head"><h2>The authors</h2></div>
                  <div class="author-grid">%s</div>
                </section>
                """.formatted(site.authors().values().stream().map(this::authorCard).collect(Collectors.joining())));

        return page(null, TAGLINE, "/", html.toString());
    }

    private String post(Post post) {
        Category category = post.category();
        Author author = post.author();

        String tags = post.tags().stream()
                .map(tag -> "<li><a href=\"/search?q=%s\">#%s</a></li>"
                        .formatted(escape(urlEncode(tag)), escape(tag)))
                .collect(Collectors.joining());

        String content = """
                <article class="post" style="--cat: %s">
                  <header class="container narrow post-header">
                    %s
                    <h1>%s</h1>
                    <p class="dek">%s</p>
                    <div class="byline">
                      %s
                      <div>
                        <a class="byline-name" href="%s">%s</a>
                        <span class="meta">%s &middot; %d min read</span>
                      </div>
                    </div>
                  </header>
                  <figure class="container post-cover">
                    <img src="%s" alt="" width="1200" height="630">
                  </figure>
                  <div class="container narrow prose">
                %s
                  </div>
                  <footer class="container narrow post-footer">
                    <ul class="tags" aria-label="Tags">%s</ul>
                    <aside class="author-box">
                      %s
                      <div>
                        <p class="author-box-label">Written by</p>
                        <h2><a href="%s">%s</a></h2>
                        <p class="author-role">%s</p>
                        <p>%s</p>
                      </div>
                    </aside>
                  </footer>
                </article>
                """.formatted(
                category.color(),
                chip(category),
                escape(post.title()),
                escape(post.summary()),
                avatar(author, "avatar"),
                author.url(), escape(author.name()),
                post.date().format(LONG_DATE), post.readingMinutes(),
                escape(post.cover()),
                post.body(),
                tags,
                avatar(author, "avatar avatar-lg"),
                author.url(), escape(author.name()),
                escape(author.role()),
                escape(author.bio()));

        List<Post> related = related(post);
        if (!related.isEmpty()) {
            content += """
                    <section class="container section related">
                      <div class="section-head"><h2>Keep reading</h2></div>
                      %s
                    </section>
                    """.formatted(cardGrid(related));
        }
        return page(post.title(), post.summary(), category.url(), content);
    }

    private String category(Category category) {
        List<Post> posts = site.postsIn(category);
        String content = """
                <section class="container page-head topic-head" style="--cat: %s">
                  <p class="eyebrow">Topic</p>
                  <h1>%s</h1>
                  <p class="lede">%s</p>
                  <p class="meta">%s</p>
                </section>
                <section class="container section">%s</section>
                """.formatted(category.color(), escape(category.name()), escape(category.description()),
                countLabel(posts.size()), cardGrid(posts));
        return page(category.name(), category.description(), category.url(), content);
    }

    private String author(Author author) {
        List<Post> posts = site.postsBy(author);
        String content = """
                <section class="container page-head author-head">
                  %s
                  <div>
                    <p class="eyebrow">%s</p>
                    <h1>%s</h1>
                    <p class="lede">%s</p>
                    <p class="meta">%s</p>
                  </div>
                </section>
                <section class="container section">%s</section>
                """.formatted(avatar(author, "avatar avatar-xl"), escape(author.role()), escape(author.name()),
                escape(author.bio()), countLabel(posts.size()), cardGrid(posts));
        return page(author.name(), author.bio(), null, content);
    }

    private String archive() {
        Map<YearMonth, List<Post>> byMonth = site.posts().stream()
                .collect(Collectors.groupingBy(post -> YearMonth.from(post.date()), LinkedHashMap::new,
                        Collectors.toList()));

        StringBuilder months = new StringBuilder();
        byMonth.forEach((month, posts) -> {
            months.append("<section class=\"archive-month\"><h2>")
                    .append(month.format(MONTH))
                    .append("</h2><ol class=\"archive-list\">");
            for (Post post : posts) {
                months.append("""
                        <li style="--cat: %s">
                          <time datetime="%s">%s</time>
                          <a href="%s">%s</a>
                          <span class="chip chip-sm">%s</span>
                        </li>
                        """.formatted(post.category().color(), post.date(), post.date().format(SHORT_DATE),
                        post.url(), escape(post.title()), escape(post.category().name())));
            }
            months.append("</ol></section>");
        });

        String content = """
                <section class="container narrow page-head">
                  <p class="eyebrow">Archive</p>
                  <h1>Every article, newest first</h1>
                  <p class="meta">%s</p>
                </section>
                <div class="container narrow archive">%s</div>
                """.formatted(countLabel(site.posts().size()), months);
        return page("Archive", "Every article on " + SITE_NAME + ", newest first.", "/archive", content);
    }

    private String search() {
        String content = """
                <section class="container narrow page-head">
                  <p class="eyebrow">Search</p>
                  <h1>Find an article</h1>
                  <form class="search-form" action="/search" role="search">
                    <label class="visually-hidden" for="search-input">Search articles</label>
                    <input id="search-input" type="search" name="q" placeholder="Try &ldquo;virtual threads&rdquo; or &ldquo;retries&rdquo;" autocomplete="off">
                  </form>
                  <p id="search-status" class="meta" aria-live="polite"></p>
                </section>
                <section class="container narrow">
                  <ol id="search-results" class="search-results"></ol>
                  <noscript><p>Search needs JavaScript. You can browse the <a href="/archive">archive</a> instead.</p></noscript>
                </section>
                <script src="/js/search.js" defer></script>
                """;
        return page("Search", "Search every article on " + SITE_NAME + ".", "/search", content);
    }

    private String about() {
        ContentLoader.Document about = site.about();
        String content = """
                <section class="container narrow page-head">
                  <p class="eyebrow">About</p>
                  <h1>%s</h1>
                  <p class="lede">%s</p>
                </section>
                <div class="container narrow prose">
                %s
                </div>
                """.formatted(escape(about.require("title")), escape(about.require("summary")), about.body());
        return page("About", about.require("summary"), "/about", content);
    }

    private String searchIndex() {
        return site.posts().stream()
                .map(post -> """
                        {"title":%s,"url":%s,"summary":%s,"category":%s,"color":%s,"tags":[%s],"author":%s,"date":%s}"""
                        .formatted(json(post.title()), json(post.url()), json(post.summary()),
                                json(post.category().name()), json(post.category().color()),
                                post.tags().stream().map(SiteRenderer::json).collect(Collectors.joining(",")),
                                json(post.author().name()), json(post.date().format(LONG_DATE))))
                .collect(Collectors.joining(",\n", "[\n", "\n]\n"));
    }

    // ---- Building blocks ----

    private String page(String title, String description, String activeNav, String content) {
        String fullTitle = title == null ? SITE_NAME + " | " + TAGLINE : title + " | " + SITE_NAME;
        return layout
                .replace("{{title}}", escape(fullTitle))
                .replace("{{description}}", escape(description))
                .replace("{{nav}}", nav(activeNav))
                .replace("{{serverInfo}}", serverInfoHtml)
                .replace("{{content}}", content);
    }

    private String nav(String activeNav) {
        StringBuilder html = new StringBuilder();
        for (Category category : site.categories().values()) {
            html.append(navLink(category.url(), category.name(), activeNav));
        }
        html.append(navLink("/archive", "Archive", activeNav));
        html.append(navLink("/about", "About", activeNav));
        return html.toString();
    }

    private static String navLink(String href, String label, String activeNav) {
        String current = href.equals(activeNav) ? " aria-current=\"page\"" : "";
        return "<a href=\"%s\"%s>%s</a>".formatted(href, current, escape(label));
    }

    private String featuredCard(Post post) {
        return """
                <article class="featured" style="--cat: %s">
                  <a class="featured-cover" href="%s" tabindex="-1" aria-hidden="true">
                    <img src="%s" alt="" width="1200" height="630">
                  </a>
                  <div class="featured-body">
                    <p class="eyebrow">Featured &middot; %s</p>
                    <h2><a href="%s">%s</a></h2>
                    <p class="featured-summary">%s</p>
                    %s
                  </div>
                </article>
                """.formatted(post.category().color(), post.url(), escape(post.cover()),
                escape(post.category().name()), post.url(), escape(post.title()), escape(post.summary()),
                byline(post));
    }

    private String cardGrid(List<Post> posts) {
        if (posts.isEmpty()) {
            return "<p class=\"meta\">No articles yet.</p>";
        }
        return posts.stream().map(this::card).collect(Collectors.joining("", "<div class=\"card-grid\">", "</div>"));
    }

    private String card(Post post) {
        return """
                <article class="card" style="--cat: %s">
                  <a class="card-cover" href="%s" tabindex="-1" aria-hidden="true">
                    <img src="%s" alt="" width="1200" height="630" loading="lazy">
                  </a>
                  <div class="card-body">
                    %s
                    <h3><a href="%s">%s</a></h3>
                    <p>%s</p>
                    %s
                  </div>
                </article>
                """.formatted(post.category().color(), post.url(), escape(post.cover()), chip(post.category()),
                post.url(), escape(post.title()), escape(post.summary()), byline(post));
    }

    private String byline(Post post) {
        return """
                <div class="byline byline-sm">
                  %s
                  <div>
                    <a class="byline-name" href="%s">%s</a>
                    <span class="meta"><time datetime="%s">%s</time> &middot; %d min read</span>
                  </div>
                </div>
                """.formatted(avatar(post.author(), "avatar avatar-sm"), post.author().url(),
                escape(post.author().name()), post.date(), post.date().format(LONG_DATE), post.readingMinutes());
    }

    private String topicCard(Category category) {
        return """
                <a class="topic-card" href="%s" style="--cat: %s">
                  <span class="topic-name">%s</span>
                  <span class="topic-description">%s</span>
                  <span class="meta">%s</span>
                </a>
                """.formatted(category.url(), category.color(), escape(category.name()),
                escape(category.description()), countLabel(site.postsIn(category).size()));
    }

    private String authorCard(Author author) {
        return """
                <a class="author-card" href="%s">
                  %s
                  <span class="author-card-name">%s</span>
                  <span class="author-role">%s</span>
                  <span class="meta">%s</span>
                </a>
                """.formatted(author.url(), avatar(author, "avatar avatar-lg"), escape(author.name()),
                escape(author.role()), countLabel(site.postsBy(author).size()));
    }

    private String categoryChips() {
        return site.categories().values().stream()
                .map(category -> "<a class=\"chip\" href=\"%s\" style=\"--cat: %s\">%s <span>%d</span></a>"
                        .formatted(category.url(), category.color(), escape(category.name()),
                                site.postsIn(category).size()))
                .collect(Collectors.joining());
    }

    private static String chip(Category category) {
        return "<a class=\"chip\" href=\"%s\" style=\"--cat: %s\">%s</a>"
                .formatted(category.url(), category.color(), escape(category.name()));
    }

    private static String avatar(Author author, String cssClass) {
        return "<span class=\"%s\" style=\"--avatar: %s\" aria-hidden=\"true\">%s</span>"
                .formatted(cssClass, author.color(), escape(author.initials()));
    }

    /** Up to three posts: same category first, then the most shared tags, then the newest. */
    private List<Post> related(Post post) {
        return site.posts().stream()
                .filter(other -> !other.equals(post))
                .sorted(Comparator
                        .comparingInt((Post other) -> other.category().equals(post.category()) ? 0 : 1)
                        .thenComparing(Comparator.comparingLong((Post other) ->
                                other.tags().stream().filter(post.tags()::contains).count()).reversed())
                        .thenComparing(Post::date, Comparator.<LocalDate>reverseOrder()))
                .limit(RELATED_POSTS)
                .toList();
    }

    private static String countLabel(int count) {
        return count == 1 ? "1 article" : count + " articles";
    }

    static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String json(String value) {
        StringBuilder out = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                case '<' -> out.append("\\u003c");
                default -> {
                    if (c < 0x20) {
                        out.append("\\u%04x".formatted((int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.append('"').toString();
    }
}
