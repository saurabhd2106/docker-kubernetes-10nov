---
name: create-lab
description: >-
  Writes short hands-on training labs (Title, Overview, Learning Objective,
  Steps to follow, Outcome) as Markdown and renders them to a PDF with
  icon-style architecture and workflow diagrams. Use when the user asks for a
  lab, hands-on exercise, workshop, practical, or step-by-step training guide,
  for example on Docker, Kubernetes, containers, CI/CD, or cloud, even if they
  do not say "lab".
---

# Create a lab

A lab is a short, hands-on guide that a learner follows at a terminal. It has two files:

- `labs/<short-kebab-name>.md` — the source you write
- `labs/<short-kebab-name>.pdf` — what the learner gets, rendered by the script

Use another folder only when the user names one.

## Workflow

1. Work out the task, the starting point (what the learner already has), and the end state.
2. Write the Markdown using the template below.
3. Add a `lab-diagram` block wherever a picture explains architecture or order better than a sentence.
4. Render the PDF:

   ```bash
   python3 .cursor/skills/create-lab/scripts/render_lab.py labs/<name>.md
   ```

   The script installs `reportlab` and `svglib` if they are missing. It prints the PDF path.
5. Fix any error it reports (usually a bad icon name or invalid JSON) and run it again.

## Template

Use these headings, in this order. The renderer expects them.

~~~markdown
# <Title: the task, e.g. "Containerize a Node.js App with Docker">

## Overview

<Two or three sentences. What the learner does and what they have at the end.>

**Prerequisites**
- <Only what they must have before step 1>

## Learning Objective

- <Verb> <one thing they can do>
- ...3 to 5 bullets

## Steps to follow

### Step 1: <Short action>

<One sentence on why.>

```bash
<copy-paste command>
```

### Step 2: ...

## Outcome

<Two or three sentences. What is now built or running, and how to tell it worked.>
~~~

Prerequisites are optional. Leave them out when there are none.

## Writing rules

- Short sentences and everyday words. Write for someone new to the tool.
- Each step does one thing: an action, one line of why, then a command or file.
- Explain a flag or line only when it would confuse a beginner. One line, after the command.
- Use placeholders like `<dockerhub_username>` for values the learner supplies.
- No theory sections and no click-by-click UI tours. For a UI task, give the shortest path in a few words, such as "Account Settings > Personal access tokens > Generate new token".
- Aim for 4 to 7 steps. Split a longer lab into two labs.

## Diagrams

Diagrams use a fixed icon style: soft colored badges with white line icons, thin curved connectors, and a muted palette (sage, olive, dusty rose, beige, blue-gray). The script draws them. Never use Mermaid, ASCII art, or generated images.

Add a diagram only when it helps:

- **Workflow**: the order of actions is the lesson, like write, build, run, verify.
- **Architecture**: how the parts connect, like app, image, container, host, and registry.

Skip it when the steps already say the same thing. Most labs need one or two. Put the block just before the step it explains.

```lab-diagram
{
  "layout": "flow",
  "caption": "From source code to a running container",
  "nodes": [
    {"icon": "code", "label": "Node app"},
    {"icon": "file", "label": "Dockerfile"},
    {"icon": "layers", "label": "Image"},
    {"icon": "box", "label": "Container"}
  ]
}
```

Fields:

- `layout`: `flow` draws badges in a row joined by curves, and fits 3 to 6 nodes. `hub` draws a center shape with badges around it, and fits 3 to 6 nodes plus `center`.
- `caption`: one short line printed under the diagram.
- `nodes`: each has `icon` and `label`. Labels are one to three words and may use `\n` for a second line.
- `edges` (flow only, optional): labels for the connectors in order, such as `["build", "run", "-p 80:3000"]`. Use `""` for no label.
- `center` (hub only): `{"icon": "cloud", "label": "Docker host"}`.

Icons: `code`, `file`, `terminal`, `layers`, `box`, `package`, `server`, `cloud`, `globe`, `database`, `shield`, `key`, `people`, `user`, `browser`, `gear`, `upload`, `download`, `check`, `network`, `kubernetes`.

Use only these names. The script rejects any other name.

## Example

See [examples/containerize-nodejs-app.md](examples/containerize-nodejs-app.md) for a complete lab with one flow and one hub diagram. Its rendered PDF is next to it.
