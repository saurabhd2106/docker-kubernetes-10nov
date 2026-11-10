package com.training.blog;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Pattern;

/**
 * Loads the blog from {@code content/} on the classpath.
 *
 * <p>Posts are listed in {@code content/index.txt} because a JAR cannot be listed reliably like a
 * directory. Each post starts with a front matter block between {@code ---} lines.
 */
final class ContentLoader {

    private static final String ROOT = "content/";
    private static final int WORDS_PER_MINUTE = 220;
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]+>");

    record Document(String source, Map<String, String> meta, String body) {

        String require(String key) {
            String value = meta.get(key);
            if (value == null || value.isBlank()) {
                throw new IllegalStateException(source + ": missing front matter field '" + key + "'");
            }
            return value;
        }
    }

    private ContentLoader() {
    }

    static Site load() throws IOException {
        Map<String, Category> categories = loadCategories();
        Map<String, Author> authors = loadAuthors();

        List<Post> posts = new ArrayList<>();
        for (String slug : readLines(ROOT + "index.txt")) {
            posts.add(loadPost(slug, categories, authors));
        }
        posts.sort(Comparator.comparing(Post::date).reversed().thenComparing(Post::title));

        return new Site(List.copyOf(posts), categories, authors, parse(ROOT + "pages/about.html"));
    }

    private static Post loadPost(String slug, Map<String, Category> categories, Map<String, Author> authors)
            throws IOException {
        Document doc = parse(ROOT + "posts/" + slug + ".html");

        Category category = categories.get(doc.require("category"));
        if (category == null) {
            throw new IllegalStateException(doc.source() + ": unknown category '" + doc.require("category") + "'");
        }
        Author author = authors.get(doc.require("author"));
        if (author == null) {
            throw new IllegalStateException(doc.source() + ": unknown author '" + doc.require("author") + "'");
        }
        LocalDate date;
        try {
            date = LocalDate.parse(doc.require("date"));
        } catch (DateTimeParseException e) {
            throw new IllegalStateException(doc.source() + ": date must look like 2026-10-14", e);
        }
        List<String> tags = Arrays.stream(doc.meta().getOrDefault("tags", "").split(","))
                .map(String::strip)
                .filter(tag -> !tag.isEmpty())
                .toList();

        return new Post(slug, doc.require("title"), date, category, tags, author,
                doc.require("cover"), doc.require("summary"), doc.body(), readingMinutes(doc.body()));
    }

    private static Map<String, Category> loadCategories() throws IOException {
        Properties props = loadProperties(ROOT + "categories.properties");
        Map<String, Category> categories = new LinkedHashMap<>();
        for (String slug : list(props, "order")) {
            categories.put(slug, new Category(slug,
                    required(props, slug + ".name"),
                    required(props, slug + ".description"),
                    required(props, slug + ".color")));
        }
        return categories;
    }

    private static Map<String, Author> loadAuthors() throws IOException {
        Properties props = loadProperties(ROOT + "authors.properties");
        Map<String, Author> authors = new LinkedHashMap<>();
        for (String id : list(props, "order")) {
            authors.put(id, new Author(id,
                    required(props, id + ".name"),
                    required(props, id + ".role"),
                    required(props, id + ".bio"),
                    required(props, id + ".color")));
        }
        return authors;
    }

    static Document parse(String resource) throws IOException {
        String text = read(resource).replace("\r\n", "\n");
        if (!text.startsWith("---\n")) {
            throw new IllegalStateException(resource + ": must start with a '---' front matter line");
        }
        int end = text.indexOf("\n---\n", 3);
        if (end < 0) {
            throw new IllegalStateException(resource + ": front matter is not closed with '---'");
        }

        Map<String, String> meta = new LinkedHashMap<>();
        for (String line : text.substring(4, end).split("\n")) {
            int colon = line.indexOf(':');
            if (line.isBlank() || colon < 0) {
                continue;
            }
            meta.put(line.substring(0, colon).strip(), line.substring(colon + 1).strip());
        }
        return new Document(resource, meta, text.substring(end + 5).strip());
    }

    private static int readingMinutes(String html) {
        String text = HTML_TAG.matcher(html).replaceAll(" ").strip();
        int words = text.isEmpty() ? 0 : text.split("\\s+").length;
        return Math.max(1, (int) Math.ceil(words / (double) WORDS_PER_MINUTE));
    }

    private static List<String> readLines(String resource) throws IOException {
        return read(resource).lines()
                .map(String::strip)
                .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                .toList();
    }

    private static Properties loadProperties(String resource) throws IOException {
        Properties props = new Properties();
        try (Reader reader = new InputStreamReader(open(resource), StandardCharsets.UTF_8)) {
            props.load(reader);
        }
        return props;
    }

    private static List<String> list(Properties props, String key) {
        return Arrays.stream(required(props, key).split(",")).map(String::strip).toList();
    }

    private static String required(Properties props, String key) {
        String value = props.getProperty(key);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Missing property '" + key + "'");
        }
        return value.strip();
    }

    private static String read(String resource) throws IOException {
        try (InputStream in = open(resource)) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static InputStream open(String resource) {
        InputStream in = ContentLoader.class.getClassLoader().getResourceAsStream(resource);
        if (in == null) {
            throw new IllegalStateException("Missing content file: " + resource);
        }
        return in;
    }
}
