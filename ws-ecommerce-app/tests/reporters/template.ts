export type StepSummary = {
  title: string;
  category: 'input' | 'action' | 'validation' | 'other';
  error?: string;
};

export type TestSummary = {
  title: string;
  fullTitle: string;
  file: string;
  project: string;
  tags: string[];
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted' | 'flaky';
  durationMs: number;
  retries: number;
  errorMessage?: string;
  errorStack?: string;
  screenshotBase64?: string;
  steps: StepSummary[];
};

export type ReportModel = {
  generatedAt: string;
  durationMs: number;
  environment: {
    baseUrl: string;
    apiUrl: string;
    browsers: string;
    os: string;
    node: string;
    gitCommit: string;
  };
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    passRate: number;
  };
  byProject: Record<string, { total: number; passed: number; failed: number; skipped: number }>;
  byFile: Record<string, { total: number; passed: number; failed: number; skipped: number }>;
  tests: TestSummary[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function statusClass(status: string): string {
  if (status === 'passed') return 'ok';
  if (status === 'flaky') return 'flaky';
  if (status === 'skipped') return 'skip';
  return 'fail';
}

export function buildSummaryHtml(model: ReportModel): string {
  const failures = model.tests.filter((t) => t.status === 'failed' || t.status === 'timedOut');
  const projectRows = Object.entries(model.byProject)
    .map(
      ([name, s]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${s.total}</td><td>${s.passed}</td><td>${s.failed}</td><td>${s.skipped}</td></tr>`,
    )
    .join('');
  const fileRows = Object.entries(model.byFile)
    .map(
      ([name, s]) =>
        `<tr><td>${escapeHtml(name)}</td><td>${s.total}</td><td>${s.passed}</td><td>${s.failed}</td><td>${s.skipped}</td></tr>`,
    )
    .join('');
  const testRows = model.tests
    .map((t) => {
      const steps = t.steps
        .map((s) => `<li class="step-${s.category}">${escapeHtml(s.title)}</li>`)
        .join('');
      return `<tr class="${statusClass(t.status)}">
        <td>${escapeHtml(t.project)}</td>
        <td>
          <strong>${escapeHtml(t.title)}</strong>
          <div class="muted">${escapeHtml(t.file)}</div>
          ${t.tags.length ? `<div class="tags">${t.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
          ${steps ? `<ul class="steps">${steps}</ul>` : ''}
        </td>
        <td><span class="badge ${statusClass(t.status)}">${escapeHtml(t.status)}</span></td>
        <td>${(t.durationMs / 1000).toFixed(2)}s</td>
        <td>${t.retries}</td>
      </tr>`;
    })
    .join('');

  const failureBlocks = failures
    .map((t) => {
      const screenshot = t.screenshotBase64
        ? `<img class="shot" alt="failure screenshot" src="data:image/png;base64,${t.screenshotBase64}" />`
        : '<p class="muted">No screenshot attached.</p>';
      return `<section class="failure">
        <h3>${escapeHtml(t.fullTitle)}</h3>
        <p class="muted">${escapeHtml(t.project)} · ${escapeHtml(t.file)}</p>
        <pre>${escapeHtml(t.errorMessage || 'Unknown error')}${t.errorStack ? `\n\n${escapeHtml(t.errorStack)}` : ''}</pre>
        ${screenshot}
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Oakline E2E Test Summary</title>
  <style>
    :root { --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --muted:#94a3b8; --ok:#22c55e; --fail:#ef4444; --skip:#94a3b8; --flaky:#f59e0b; --accent:#38bdf8; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, Segoe UI, sans-serif; background: var(--bg); color: var(--text); }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
    h1,h2,h3 { margin: 0 0 12px; }
    .muted { color: var(--muted); font-size: 13px; }
    .grid { display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; margin: 16px 0 24px; }
    .card { background: var(--card); border-radius: 12px; padding: 16px; }
    .card .n { font-size: 28px; font-weight: 700; }
    .bar { height: 10px; background:#334155; border-radius: 999px; overflow:hidden; margin-top:8px; }
    .bar > span { display:block; height:100%; background: linear-gradient(90deg, var(--ok), var(--accent)); }
    table { width:100%; border-collapse: collapse; margin: 12px 0 24px; }
    th, td { text-align:left; padding:10px 8px; border-bottom:1px solid #334155; vertical-align: top; }
    th { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; }
    .badge.ok { background: rgba(34,197,94,.15); color: var(--ok); }
    .badge.fail { background: rgba(239,68,68,.15); color: var(--fail); }
    .badge.skip { background: rgba(148,163,184,.15); color: var(--skip); }
    .badge.flaky { background: rgba(245,158,11,.15); color: var(--flaky); }
    .tags span { display:inline-block; margin:4px 4px 0 0; padding:2px 6px; border-radius:6px; background:#334155; font-size:11px; }
    .steps { margin:8px 0 0; padding-left:18px; color: var(--muted); font-size:12px; }
    .step-input { color:#a78bfa; }
    .step-action { color:#38bdf8; }
    .step-validation { color:#22c55e; }
    .failure { background: var(--card); border-left: 4px solid var(--fail); border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    pre { white-space: pre-wrap; background:#0b1220; padding:12px; border-radius:8px; overflow:auto; }
    img.shot { max-width:100%; border-radius:8px; margin-top:12px; border:1px solid #334155; }
    .env dt { color: var(--muted); font-size:12px; }
    .env dd { margin:0 0 8px; }
    @media print {
      body { background: white; color: #111; }
      .card, .failure { background: #f8fafc; border: 1px solid #cbd5e1; }
      .muted, .steps { color: #475569; }
      th, td { border-bottom: 1px solid #cbd5e1; }
      pre { background: #f1f5f9; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Oakline E2E Test Summary</h1>
    <p class="muted">Generated ${escapeHtml(model.generatedAt)} · Duration ${(model.durationMs / 1000).toFixed(1)}s</p>

    <section class="card env">
      <h2>Environment</h2>
      <dl>
        <dt>Base URL</dt><dd>${escapeHtml(model.environment.baseUrl)}</dd>
        <dt>API URL</dt><dd>${escapeHtml(model.environment.apiUrl)}</dd>
        <dt>Browsers</dt><dd>${escapeHtml(model.environment.browsers)}</dd>
        <dt>OS</dt><dd>${escapeHtml(model.environment.os)}</dd>
        <dt>Node</dt><dd>${escapeHtml(model.environment.node)}</dd>
        <dt>Git commit</dt><dd>${escapeHtml(model.environment.gitCommit)}</dd>
      </dl>
    </section>

    <div class="grid">
      <div class="card"><div class="muted">Total</div><div class="n">${model.totals.total}</div></div>
      <div class="card"><div class="muted">Passed</div><div class="n" style="color:var(--ok)">${model.totals.passed}</div></div>
      <div class="card"><div class="muted">Failed</div><div class="n" style="color:var(--fail)">${model.totals.failed}</div></div>
      <div class="card"><div class="muted">Skipped</div><div class="n">${model.totals.skipped}</div></div>
      <div class="card"><div class="muted">Flaky</div><div class="n" style="color:var(--flaky)">${model.totals.flaky}</div></div>
    </div>
    <div class="card">
      <div class="muted">Pass rate</div>
      <div class="n">${model.totals.passRate.toFixed(1)}%</div>
      <div class="bar"><span style="width:${model.totals.passRate}%"></span></div>
    </div>

    <h2>By project</h2>
    <table><thead><tr><th>Project</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead><tbody>${projectRows}</tbody></table>

    <h2>By spec file</h2>
    <table><thead><tr><th>File</th><th>Total</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr></thead><tbody>${fileRows}</tbody></table>

    <h2>All tests</h2>
    <table>
      <thead><tr><th>Project</th><th>Test</th><th>Status</th><th>Duration</th><th>Retries</th></tr></thead>
      <tbody>${testRows}</tbody>
    </table>

    <h2>Failures</h2>
    ${failureBlocks || '<p class="muted">No failures.</p>'}
  </div>
</body>
</html>`;
}
