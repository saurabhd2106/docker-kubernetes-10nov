package com.training.blog;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * Serves the blog. Pages are rendered from {@code content/} once at startup and served from memory;
 * CSS, JavaScript, and images are served from {@code static/} on the classpath.
 */
public final class BlogServer {

    private static final String STATIC_ROOT = "static";
    private static final String HTML = "text/html; charset=utf-8";

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "html", HTML,
            "css", "text/css; charset=utf-8",
            "js", "text/javascript; charset=utf-8",
            "json", "application/json; charset=utf-8",
            "svg", "image/svg+xml",
            "png", "image/png",
            "ico", "image/x-icon",
            "txt", "text/plain; charset=utf-8");

    private final int port;
    private final Map<String, byte[]> pages = new HashMap<>();
    private final byte[] notFoundPage;
    private final int postCount;

    private BlogServer(int port) throws IOException {
        this.port = port;
        String serverInfoHtml = "Served by <code>%s</code> on port <code>%d</code> &middot; Java <code>%s</code>"
                .formatted(escapeHtml(hostname()), port, escapeHtml(Runtime.version().toString()));

        Site site = ContentLoader.load();
        SiteRenderer renderer = new SiteRenderer(site, serverInfoHtml);
        renderer.renderPages().forEach((path, html) -> pages.put(path, html.getBytes(StandardCharsets.UTF_8)));
        this.notFoundPage = renderer.renderNotFound().getBytes(StandardCharsets.UTF_8);
        this.postCount = site.posts().size();
    }

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        new BlogServer(port).start();
    }

    private void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/health", this::handleHealth);
        server.createContext("/", this::handleRequest);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log("Shutting down");
            server.stop(1);
        }));

        server.start();
        log("Rendered %d pages from %d posts".formatted(pages.size(), postCount));
        log("Blog listening on http://0.0.0.0:%d (Java %s, host %s)"
                .formatted(port, Runtime.version(), hostname()));
    }

    private void handleHealth(HttpExchange exchange) throws IOException {
        try (exchange) {
            send(exchange, 200, "text/plain; charset=utf-8", "ok\n".getBytes(StandardCharsets.UTF_8));
        }
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        try (exchange) {
            String method = exchange.getRequestMethod();
            if (!method.equals("GET") && !method.equals("HEAD")) {
                exchange.getResponseHeaders().set("Allow", "GET, HEAD");
                send(exchange, 405, "text/plain; charset=utf-8",
                        "Method Not Allowed\n".getBytes(StandardCharsets.UTF_8));
                return;
            }

            String path = normalize(exchange.getRequestURI().getPath());
            byte[] page = pages.get(path);
            if (page != null) {
                send(exchange, 200, contentType(path), page);
                return;
            }

            String resource = resolveAsset(path);
            byte[] asset = resource == null ? null : readResource(resource);
            if (asset == null) {
                send(exchange, 404, HTML, notFoundPage);
                return;
            }
            exchange.getResponseHeaders().set("Cache-Control", "public, max-age=300");
            send(exchange, 200, contentType(resource), asset);
        }
    }

    /** Drops trailing slashes so {@code /archive/} and {@code /archive} are the same page. */
    private static String normalize(String path) {
        if (path == null || path.isEmpty()) {
            return "/";
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    /** Maps a request path to a file under {@code static/}, or null if the path is not allowed. */
    private static String resolveAsset(String path) {
        if (path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) {
            return null;
        }
        for (String segment : path.split("/")) {
            if (segment.equals("..") || segment.equals(".")) {
                return null;
            }
        }
        String relative = path.substring(1);
        String lastSegment = relative.substring(relative.lastIndexOf('/') + 1);
        return lastSegment.contains(".") ? relative : null;
    }

    private static byte[] readResource(String relative) throws IOException {
        try (InputStream in = BlogServer.class.getClassLoader()
                .getResourceAsStream(STATIC_ROOT + "/" + relative)) {
            return in == null ? null : in.readAllBytes();
        }
    }

    private static void send(HttpExchange exchange, int status, String contentType, byte[] body)
            throws IOException {
        exchange.getResponseHeaders().set("Content-Type", contentType);
        boolean head = exchange.getRequestMethod().equals("HEAD");
        exchange.sendResponseHeaders(status, head ? -1 : body.length);
        if (!head) {
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(body);
            }
        }
        log("%s %s -> %d".formatted(exchange.getRequestMethod(), exchange.getRequestURI(), status));
    }

    private static String contentType(String path) {
        String lastSegment = path.substring(path.lastIndexOf('/') + 1);
        int dot = lastSegment.lastIndexOf('.');
        if (dot < 0) {
            return HTML;
        }
        return CONTENT_TYPES.getOrDefault(lastSegment.substring(dot + 1), "application/octet-stream");
    }

    private static String hostname() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            return System.getenv().getOrDefault("HOSTNAME", "unknown");
        }
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private static void log(String message) {
        System.out.println(Instant.now() + " " + message);
    }
}
