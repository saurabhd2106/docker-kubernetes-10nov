# Container Field Notes: a standalone Angular blog

A static engineering blog built with Angular 22 (standalone components, no NgModules), used to demonstrate deploying an application with Docker.
It has no backend and no database. Articles are compiled into the bundle, and the image serves the build output with unprivileged nginx.

| Path | What it returns |
| --- | --- |
| `/` | Blog home page with a featured article and topic filters |
| `/about`, `/posts/<slug>` | About page and articles (Angular routes; nginx falls back to `index.html`) |
| `/health` | `ok` with status 200 (used by the health check) |
| `/runtime.json` | `{"hostname": "...", "port": "..."}` filled in by nginx at request time |

The footer of every page reads `/runtime.json` and shows the container hostname and port, so separate containers are easy to tell apart.

## Project layout

```
standalone-angular-app/
├── Dockerfile                    multi-stage build: Node 26 -> nginx-unprivileged
├── nginx/default.conf.template   PORT, SPA fallback, /health, /runtime.json
├── package.json, angular.json    Angular CLI workspace
└── src/
    ├── styles.css                the whole design (light and dark)
    └── app/
        ├── posts.ts              articles, authors, reading time
        ├── components/           post card, cover art, byline, inline code text
        └── pages/                home, post, about, 404
```

## Run with Docker (training session)

```bash
# Build the image
docker build -t angular-blog .

# Run it and open http://localhost:8080
docker run --rm --name blog -p 8080:8080 angular-blog

# In another terminal
curl http://localhost:8080/health
curl http://localhost:8080/runtime.json
docker ps                  # STATUS shows (health: starting), then (healthy)
docker logs -f blog        # nginx access log, one line per request
```

Run two containers from the same image and compare the hostname in each page footer:

```bash
docker run -d --name blog-1 -p 8080:8080 angular-blog
docker run -d --name blog-2 -p 8081:8080 angular-blog
docker rm -f blog-1 blog-2
```

Change the port nginx listens on inside the container (applied at startup, no rebuild):

```bash
docker run --rm -e PORT=3000 -p 8080:3000 angular-blog
```

Inspect the result:

```bash
docker image ls angular-blog      # about 55 MB; node_modules never ships
docker history angular-blog
docker exec blog-1 id             # uid=101(nginx), not root
docker inspect --format '{{.State.Health.Status}}' blog-1
```

## Run without Docker

Requires Node 22.22+, 24.15+, or 26 (Angular 22's supported versions).

```bash
npm ci
npm start                          # http://localhost:4200, footer says "Angular dev server"
npm run build                      # output in dist/standalone-angular-app/browser
```
