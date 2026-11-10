/** Text inside backticks renders as inline code. */
export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'code'; text: string; label?: string }
  | { kind: 'callout'; text: string }
  | { kind: 'quote'; text: string; cite?: string }
  | { kind: 'list'; items: string[] };

export interface Author {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface Post {
  slug: string;
  title: string;
  date: string;
  tag: string;
  author: string;
  summary: string;
  /** Two colors for the generated cover gradient. */
  cover: [string, string];
  /** A short snippet printed on the cover art. */
  coverText: string;
  body: Block[];
}

export const AUTHORS: Record<string, Author> = {
  priya: { id: 'priya', name: 'Priya Nair', role: 'Platform engineer', color: '#d6213f' },
  marcus: { id: 'marcus', name: 'Marcus Chen', role: 'Frontend lead', color: '#3b5bdb' },
  elena: { id: 'elena', name: 'Elena Rossi', role: 'Site reliability engineer', color: '#0c8a6a' },
};

const POST_LIST: Post[] = [
  {
    slug: 'multi-stage-builds',
    title: 'Multi-stage builds: ship the site, leave the toolchain behind',
    date: '2026-11-09',
    tag: 'Docker',
    author: 'priya',
    summary:
      'Node, npm, and 300 MB of dependencies build this blog. None of them ship. Here is how a two-stage Dockerfile turns a heavy toolchain into a 50 MB image.',
    cover: ['#d6213f', '#7b1fa2'],
    coverText: 'FROM node AS build\nFROM nginx',
    body: [
      {
        kind: 'p',
        text: 'An Angular app needs Node, npm, a TypeScript compiler, and a few hundred megabytes of `node_modules` to build. Once it is built, it is a handful of HTML, JavaScript, and CSS files. Everything that produced those files is dead weight in production.',
      },
      {
        kind: 'p',
        text: 'The naive Dockerfile ignores that. It starts from a Node image, copies the source, runs the build, and serves the result with a development server. It works, and it ships a 1 GB image with a compiler, a package manager, and every transitive dependency your app ever touched.',
      },
      { kind: 'h2', text: 'Two stages, one Dockerfile' },
      {
        kind: 'p',
        text: 'A multi-stage build splits the job in two. The first stage has everything needed to compile. The second stage starts from a clean, small image and copies in only the output.',
      },
      {
        kind: 'code',
        label: 'Dockerfile',
        text: `FROM node:26-bookworm-slim AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx/nginx-unprivileged:stable-alpine
COPY --from=build /workspace/dist/standalone-angular-app/browser \\
     /usr/share/nginx/html`,
      },
      {
        kind: 'p',
        text: 'Only the last `FROM` becomes the image you run. The build stage still exists in the builder cache, which makes the next build fast, but it never reaches a registry.',
      },
      { kind: 'h2', text: 'Order layers by how often they change' },
      {
        kind: 'p',
        text: 'Docker caches each instruction as a layer and reuses it until something it depends on changes. Dependencies change rarely; source changes constantly. So the manifests go in first:',
      },
      {
        kind: 'list',
        items: [
          '`COPY package.json package-lock.json` and `RUN npm ci` are cached until a dependency changes.',
          '`COPY src` and `RUN npm run build` rerun on every code change, and take seconds.',
          'Editing a blog post never reinstalls a single package.',
        ],
      },
      { kind: 'h2', text: 'Deep links need a fallback' },
      {
        kind: 'p',
        text: 'There is no file called `/posts/multi-stage-builds` in the image. The Angular router draws this page in the browser. Refresh it anyway and it still loads, because nginx answers unknown paths with `index.html` and lets the router take over. Paths that look like files, such as `/missing.js`, still get an honest 404.',
      },
      {
        kind: 'callout',
        text: 'Compare `docker image ls angular-blog` with `du -sh node_modules` on your machine. That difference is what the second stage saves on every pull, every deploy, and every security scan.',
      },
    ],
  },
  {
    slug: 'runtime-config',
    title: 'One image, every environment: configuration at runtime',
    date: '2026-11-07',
    tag: 'DevOps',
    author: 'elena',
    summary:
      'If you rebuild your image to change an API URL, you are shipping a different artifact to production than the one you tested. Move configuration to the moment the container starts.',
    cover: ['#0c8a6a', '#1864ab'],
    coverText: 'docker run -e PORT=3000',
    body: [
      {
        kind: 'p',
        text: 'The promise of containers is that the thing you tested is the thing you run. That promise breaks the moment staging and production need different images. Usually the culprit is configuration baked in at build time: an API URL in an environment file, a feature flag compiled into the bundle.',
      },
      {
        kind: 'quote',
        text: 'Store config in the environment. Config varies substantially across deploys, code does not.',
        cite: 'The Twelve-Factor App',
      },
      { kind: 'h2', text: 'What belongs in the image' },
      {
        kind: 'list',
        items: [
          'Code, compiled assets, and the server that serves them.',
          'Sensible defaults, such as `ENV PORT=8080`.',
          'Nothing that differs between staging and production.',
        ],
      },
      { kind: 'h2', text: 'How this blog does it' },
      {
        kind: 'p',
        text: 'The nginx config is a template. When the container starts, the official entrypoint runs `envsubst` over it and writes the real config. That is how the same image listens on 8080 by default and on 3000 when you ask it to:',
      },
      { kind: 'code', label: 'shell', text: 'docker run --rm -e PORT=3000 -p 8080:3000 angular-blog' },
      {
        kind: 'p',
        text: 'The browser bundle is the harder case, because it is identical in every container. It cannot know its own hostname. So the app asks the server: nginx answers `/runtime.json` with its hostname and port, filled in per request. Look at the footer of this page; that line came from that file.',
      },
      {
        kind: 'callout',
        text: 'The same pattern scales to real settings. Serve an `/config.json` from the container, fetch it before the app boots, and promote one image through every environment.',
      },
    ],
  },
  {
    slug: 'health-checks',
    title: 'Health checks: is it running, or is it working?',
    date: '2026-11-05',
    tag: 'Operations',
    author: 'elena',
    summary:
      'A process that is up is not always a process that is serving. A health check is the difference between "the container exists" and "the site answers".',
    cover: ['#e8590c', '#c92a2a'],
    coverText: 'HEALTHCHECK\nCMD wget /health',
    body: [
      {
        kind: 'p',
        text: "Docker knows whether a container's main process is alive. It has no idea whether that process is answering requests. A server stuck on a bad config, a full disk, or a deadlock looks exactly as \"up\" as a healthy one.",
      },
      { kind: 'h2', text: 'The endpoint' },
      {
        kind: 'p',
        text: 'nginx answers `/health` itself with status `200` and the body `ok`. Angular is not involved, logging is switched off for it, and it costs almost nothing to call:',
      },
      { kind: 'code', label: 'shell', text: 'curl -i http://localhost:8080/health' },
      { kind: 'h2', text: 'The HEALTHCHECK instruction' },
      {
        kind: 'code',
        label: 'Dockerfile',
        text: `HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \\
  CMD wget -q -O /dev/null "http://127.0.0.1:\${PORT}/health" || exit 1`,
      },
      {
        kind: 'list',
        items: [
          '`--interval`: how often Docker runs the check.',
          '`--timeout`: how long one check may take before it counts as a failure.',
          '`--start-period`: a grace period while the process boots.',
          '`--retries`: consecutive failures before the container is marked unhealthy.',
        ],
      },
      {
        kind: 'p',
        text: 'The Alpine base image includes BusyBox `wget`, so nothing extra is installed. Watch the `STATUS` column in `docker ps`: it moves from `(health: starting)` to `(healthy)` once the first check passes.',
      },
      {
        kind: 'callout',
        text: "`docker inspect --format '{{.State.Health.Status}}' blog-1` prints just the health state, which is handy in scripts and CI.",
      },
      { kind: 'h2', text: 'Looking ahead to Kubernetes' },
      {
        kind: 'p',
        text: 'Kubernetes ignores the Docker `HEALTHCHECK` and uses its own liveness and readiness probes instead. The same `/health` endpoint works for both, which is a good reason to make it cheap and honest from day one.',
      },
    ],
  },
  {
    slug: 'port-mapping',
    title: 'Port mapping, or why localhost:8080 works',
    date: '2026-11-03',
    tag: 'Networking',
    author: 'priya',
    summary:
      'nginx listens on a port inside the container. `-p` connects it to a port on your machine. Most "it works in the container but not in my browser" bugs live in between.',
    cover: ['#1971c2', '#5f3dc4'],
    coverText: '-p 9090:8080',
    body: [
      {
        kind: 'p',
        text: "Inside its container, nginx listens on port `8080`. That port belongs to the container's own network namespace, so your browser cannot reach it until you publish it.",
      },
      { kind: 'h2', text: 'Publishing a port' },
      { kind: 'code', label: 'shell', text: 'docker run --rm -p 9090:8080 angular-blog' },
      {
        kind: 'p',
        text: 'Read `-p 9090:8080` as host port, then container port. Docker forwards traffic from port 9090 on your machine to port 8080 inside the container. Open `http://localhost:9090` and you are talking to the same site.',
      },
      { kind: 'h2', text: 'Many containers, one image' },
      {
        kind: 'p',
        text: 'Host ports must be unique; container ports need not be. Every copy of this blog listens on 8080 internally, and each one gets its own host port:',
      },
      {
        kind: 'code',
        label: 'shell',
        text: `docker run -d --name blog-1 -p 8080:8080 angular-blog
docker run -d --name blog-2 -p 8081:8080 angular-blog`,
      },
      {
        kind: 'callout',
        text: '`EXPOSE 8080` in the Dockerfile is documentation. It does not publish anything by itself; only `-p` (or `-P`) does.',
      },
      { kind: 'h2', text: 'Why 8080 and not 80?' },
      {
        kind: 'p',
        text: 'The image runs nginx as an unprivileged user. Ports below 1024 traditionally need root, so the unprivileged nginx image defaults to 8080, and the container never needs elevated rights.',
      },
    ],
  },
  {
    slug: 'angular-signals',
    title: 'Signals in practice: a smaller mental model for Angular state',
    date: '2026-10-29',
    tag: 'Angular',
    author: 'marcus',
    summary:
      'This blog has no NgModules, no zone.js, and no state library. A handful of signals and computed values carry everything, from the topic filter to the footer.',
    cover: ['#c2255c', '#e8590c'],
    coverText: 'computed(() => …)',
    body: [
      {
        kind: 'p',
        text: 'Modern Angular defaults look very different from a few years ago. New apps are standalone, so components import what they use directly. They are zoneless, so change detection runs because state changed, not because some timer fired somewhere.',
      },
      { kind: 'h2', text: 'Three primitives' },
      {
        kind: 'list',
        items: [
          '`signal()` holds a value you can set.',
          '`computed()` derives a value and recalculates only when its inputs change.',
          '`input()` exposes a component input as a signal, including route parameters.',
        ],
      },
      { kind: 'h2', text: 'The topic filter on the home page' },
      {
        kind: 'code',
        label: 'home.ts',
        text: `readonly topic = signal<string | null>(null);

readonly visible = computed(() => {
  const topic = this.topic();
  return topic ? POSTS.filter((p) => p.tag === topic) : POSTS;
});`,
      },
      {
        kind: 'p',
        text: 'Clicking a topic calls `topic.set()`. Angular knows exactly which template reads `visible()`, and updates only that. There is no subscription to clean up and no manual change detection.',
      },
      { kind: 'h2', text: 'Route parameters as inputs' },
      {
        kind: 'p',
        text: 'With `withComponentInputBinding()`, the `:slug` in `/posts/:slug` arrives as a signal input on the post component. Looking up the article is a single `computed()`, and navigating between posts just works.',
      },
      {
        kind: 'callout',
        text: 'None of this changes how the app is deployed. It still compiles to static files, which is the whole point: the container does not care which framework drew the page.',
      },
    ],
  },
  {
    slug: 'dockerignore',
    title: 'The .dockerignore file you are probably missing',
    date: '2026-10-24',
    tag: 'Docker',
    author: 'marcus',
    summary:
      'Every `docker build` starts by uploading a build context. Without a `.dockerignore`, that upload includes `node_modules`, `.git`, and your local secrets.',
    cover: ['#495057', '#1c7ed6'],
    coverText: 'node_modules/\n.git/',
    body: [
      {
        kind: 'p',
        text: 'Before Docker runs a single instruction, it sends the build context, the directory you pointed it at, to the builder. If that directory holds a 400 MB `node_modules`, the build starts with a 400 MB upload.',
      },
      { kind: 'h2', text: 'Three reasons it matters' },
      {
        kind: 'list',
        items: [
          'Speed: a smaller context uploads faster and invalidates the cache less often.',
          'Correctness: host `node_modules` built for macOS must never overwrite the Linux modules from `npm ci`.',
          'Safety: `.env` files and credentials should not end up in an image layer.',
        ],
      },
      { kind: 'h2', text: 'What this project ignores' },
      {
        kind: 'code',
        label: '.dockerignore',
        text: `node_modules/
dist/
.angular/
.git/
.vscode/
Dockerfile
README.md`,
      },
      {
        kind: 'p',
        text: 'Ignoring `Dockerfile` and `README.md` looks odd, but it means editing docs never busts the `COPY` cache. Docker reads the Dockerfile separately, so the build still works.',
      },
      {
        kind: 'callout',
        text: 'Run a build with `--progress=plain` and look for "transferring context". That number should be in kilobytes, not megabytes.',
      },
    ],
  },
  {
    slug: 'non-root-containers',
    title: 'Your container probably runs as root. This one does not.',
    date: '2026-10-18',
    tag: 'Security',
    author: 'priya',
    summary:
      'Unless an image says otherwise, its process runs as root. Switching to an unprivileged user is one of the cheapest security wins in containers.',
    cover: ['#2b8a3e', '#087f5b'],
    coverText: 'USER 101',
    body: [
      {
        kind: 'p',
        text: 'Containers share the host kernel. Isolation is strong, but not perfect, and a process running as root inside a container is one misconfiguration away from being root somewhere it should not be.',
      },
      { kind: 'h2', text: 'Check what you are running' },
      { kind: 'code', label: 'shell', text: 'docker exec blog-1 id\n# uid=101(nginx) gid=101(nginx)' },
      {
        kind: 'p',
        text: 'This blog is served by `nginx-unprivileged`, a variant of the official image built to run as user 101. It writes its PID file and temp files to `/tmp` and listens on 8080, so it never needs root at any point.',
      },
      { kind: 'h2', text: 'Habits worth keeping' },
      {
        kind: 'list',
        items: [
          'Prefer base images that already run unprivileged.',
          'If you build your own, add a user and end the Dockerfile with `USER`.',
          'Listen on a high port and let `-p` map it to 80 or 443 on the host.',
          'In Kubernetes, enforce it with `runAsNonRoot: true` in the pod security context.',
        ],
      },
      {
        kind: 'quote',
        text: 'The best privilege escalation is the one that has nothing to escalate from.',
      },
    ],
  },
  {
    slug: 'docker-to-kubernetes',
    title: 'From docker run to a Kubernetes Deployment',
    date: '2026-10-11',
    tag: 'Kubernetes',
    author: 'elena',
    summary:
      'Every flag you pass to `docker run` has a home in a Kubernetes manifest. Mapping one to the other is the fastest way to make YAML feel familiar.',
    cover: ['#364fc7', '#0b7285'],
    coverText: 'kind: Deployment\nreplicas: 3',
    body: [
      {
        kind: 'p',
        text: 'By the end of the Docker session you can build an image, run several copies, map ports, pass configuration, and check health. Kubernetes asks for the same things, written down instead of typed.',
      },
      { kind: 'h2', text: 'The translation table' },
      {
        kind: 'list',
        items: [
          '`docker run angular-blog` becomes a container in a Pod template.',
          'Running two copies by hand becomes `replicas: 2`.',
          '`-e PORT=8080` becomes an `env` entry.',
          '`-p 8080:8080` becomes a Service that routes to the pods.',
          '`HEALTHCHECK` becomes `livenessProbe` and `readinessProbe`.',
        ],
      },
      {
        kind: 'code',
        label: 'deployment.yaml',
        text: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: angular-blog
spec:
  replicas: 3
  selector:
    matchLabels: { app: angular-blog }
  template:
    metadata:
      labels: { app: angular-blog }
    spec:
      containers:
        - name: web
          image: angular-blog:latest
          ports: [{ containerPort: 8080 }]
          readinessProbe:
            httpGet: { path: /health, port: 8080 }`,
      },
      {
        kind: 'p',
        text: 'Refresh the page behind a Service and the footer hostname changes as requests land on different pods. It is the same trick as running two containers on two ports, with Kubernetes doing the routing.',
      },
      {
        kind: 'callout',
        text: 'Nothing in the image changes between Docker and Kubernetes. That is the payoff for keeping configuration at runtime and health checks cheap.',
      },
    ],
  },
];

export const POSTS: Post[] = [...POST_LIST].sort((a, b) => b.date.localeCompare(a.date));

export const TOPICS: string[] = [...new Set(POSTS.map((post) => post.tag))];

export function findPost(slug: string | null | undefined): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export function authorOf(post: Post): Author {
  return AUTHORS[post.author];
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('');
}

export function readingMinutes(post: Post): number {
  const words = post.body
    .flatMap((block) => (block.kind === 'list' ? block.items : [block.text]))
    .join(' ')
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
