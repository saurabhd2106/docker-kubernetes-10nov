# The Build Log: a standalone Java blog

An engineering blog about Java, cloud, DevOps, and architecture, written in plain Java 27 and used to demonstrate
deploying an application with Docker. It uses no framework and no database. Articles are HTML files bundled inside
one executable JAR. At startup the server renders every page into memory and serves it with the JDK's built-in HTTP server.

| Path | What it returns |
| --- | --- |
| `/` | Home: featured article, latest articles, topics, authors |
| `/posts/<slug>` | An article with cover image, author, reading time, tags, and related articles |
| `/category/<slug>` | Articles in one topic (`java`, `cloud`, `devops`, `architecture`) |
| `/authors/<id>` | An author's bio and articles (`priya`, `marcus`, `elena`) |
| `/archive` | Every article grouped by month |
| `/search?q=...` | Client-side search over `/search-index.json` |
| `/about` | About the blog |
| `/health` | `ok` with status 200 (used by the health check) |

Every page footer shows the hostname, port, and Java version, so separate containers are easy to tell apart.

## Project layout

```
standalone-java-app/
├── Dockerfile                        multi-stage build: JDK + Maven -> JRE
├── pom.xml                           Java 27, builds target/blog.jar
├── mvnw, .mvn/                       Maven Wrapper (no Maven install needed)
└── src/main/
    ├── java/com/training/blog/
    │   ├── BlogServer.java           HTTP server, routing, /health
    │   ├── ContentLoader.java        reads content/ and parses front matter
    │   ├── SiteRenderer.java         builds every page from the layout template
    │   ├── Post, Author, Category, Site   content records
    │   └── HealthCheck.java          used by the Docker HEALTHCHECK
    └── resources/
        ├── content/
        │   ├── index.txt             list of post slugs
        │   ├── posts/*.html          articles: front matter + HTML body
        │   ├── pages/about.html
        │   ├── authors.properties
        │   └── categories.properties
        ├── templates/layout.html     shared page layout
        └── static/                   css/, js/search.js, images/ (logo and SVG covers)
```

## Run with Docker (training session)

```bash
# Build the image
docker build -t blog-app .

# Run it and open http://localhost:8080
docker run --rm --name blog -p 8080:8080 blog-app

# In another terminal
curl http://localhost:8080/health
docker ps                  # STATUS shows (health: starting), then (healthy)
docker logs -f blog        # startup summary, then one log line per request
```

Run two containers from the same image and compare the hostname in each page footer:

```bash
docker run -d --name blog-1 -p 8080:8080 blog-app
docker run -d --name blog-2 -p 8081:8080 blog-app
docker rm -f blog-1 blog-2
```

Change the port the app listens on inside the container:

```bash
docker run --rm -e PORT=3000 -p 8080:3000 blog-app
```

Inspect the result:

```bash
docker image ls blog-app
docker history blog-app
docker inspect --format '{{.State.Health.Status}}' blog-1
```

## Add a new post

1. Create `src/main/resources/content/posts/my-new-post.html`:

   ```html
   ---
   title: My new post
   date: 2026-11-20
   category: devops
   tags: docker, kubernetes
   author: elena
   cover: /images/covers/pipeline.svg
   summary: One or two sentences shown on cards, in search, and under the title.
   ---
   <p>The article body, in plain HTML.</p>
   <h2>A section</h2>
   <pre><code>docker build -t blog-app .</code></pre>
   ```

   `category` must be a key in `categories.properties`, and `author` a key in `authors.properties`.
   Escape `<`, `>`, and `&` inside code samples.

2. Add `my-new-post` on its own line in `src/main/resources/content/index.txt`.
3. Rebuild the image. The new post appears on the home page, its category and author pages, the archive, and search.

If a post has a mistake, such as an unknown category or a missing field, the server stops at startup with a message
naming the file. In Docker that shows up as a container that exits immediately, and `docker logs` gives the reason.

## Run without Docker

Requires JDK 27.

```bash
./mvnw package
java -jar target/blog.jar          # PORT=9090 java -jar target/blog.jar to change the port
```

With an older JDK (21 or newer), build with `./mvnw package -Djava.version=25` (use your JDK version number).
