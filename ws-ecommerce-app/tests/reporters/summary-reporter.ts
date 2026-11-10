import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import { chromium } from '@playwright/test';
import { env } from '../src/config/env';
import { buildSummaryHtml, type ReportModel, type StepSummary, type TestSummary } from './template';

function categorizeStep(title: string): StepSummary['category'] {
  if (title.startsWith('Input Data:')) return 'input';
  if (title.startsWith('Action:')) return 'action';
  if (title.startsWith('Validation:')) return 'validation';
  return 'other';
}

function gitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

class SummaryReporter implements Reporter {
  private startedAt = 0;
  private config!: FullConfig;
  private readonly tests: TestSummary[] = [];

  onBegin(config: FullConfig, _suite: Suite): void {
    this.config = config;
    this.startedAt = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const project = test.parent.project()?.name ?? 'unknown';
    const file = path.relative(process.cwd(), test.location.file);
    const tags = test.tags ?? [];
    const retries = result.retry;

    let status: TestSummary['status'] = result.status;
    if (result.status === 'passed' && retries > 0) {
      status = 'flaky';
    }

    const screenshot = result.attachments.find(
      (a) => a.name === 'screenshot' || a.contentType?.startsWith('image/'),
    );
    let screenshotBase64: string | undefined;
    if (screenshot?.path && fs.existsSync(screenshot.path)) {
      screenshotBase64 = fs.readFileSync(screenshot.path).toString('base64');
    } else if (screenshot?.body) {
      screenshotBase64 = Buffer.from(screenshot.body).toString('base64');
    }

    const steps: StepSummary[] = [];
    const walk = (nodes: TestResult['steps']) => {
      for (const step of nodes) {
        if (step.category === 'test.step' || step.title.startsWith('Input Data:') || step.title.startsWith('Action:') || step.title.startsWith('Validation:')) {
          steps.push({
            title: step.title,
            category: categorizeStep(step.title),
            error: step.error?.message,
          });
        }
        if (step.steps?.length) walk(step.steps);
      }
    };
    walk(result.steps);

    this.tests.push({
      title: test.title,
      fullTitle: test.titlePath().filter(Boolean).join(' › '),
      file,
      project,
      tags,
      status,
      durationMs: result.duration,
      retries,
      errorMessage: result.error?.message,
      errorStack: result.error?.stack,
      screenshotBase64,
      steps,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    try {
      const outDir = path.join(env.reportsDir, 'summary');
      fs.mkdirSync(outDir, { recursive: true });

      const byProject: ReportModel['byProject'] = {};
      const byFile: ReportModel['byFile'] = {};
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let flaky = 0;

      for (const t of this.tests) {
        byProject[t.project] ??= { total: 0, passed: 0, failed: 0, skipped: 0 };
        byFile[t.file] ??= { total: 0, passed: 0, failed: 0, skipped: 0 };
        byProject[t.project].total += 1;
        byFile[t.file].total += 1;

        if (t.status === 'passed') {
          passed += 1;
          byProject[t.project].passed += 1;
          byFile[t.file].passed += 1;
        } else if (t.status === 'flaky') {
          flaky += 1;
          passed += 1;
          byProject[t.project].passed += 1;
          byFile[t.file].passed += 1;
        } else if (t.status === 'skipped') {
          skipped += 1;
          byProject[t.project].skipped += 1;
          byFile[t.file].skipped += 1;
        } else {
          failed += 1;
          byProject[t.project].failed += 1;
          byFile[t.file].failed += 1;
        }
      }

      const total = this.tests.length;
      const passRate = total === 0 ? 0 : ((passed) / total) * 100;

      const model: ReportModel = {
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - this.startedAt,
        environment: {
          baseUrl: env.baseUrl,
          apiUrl: env.apiUrl,
          browsers: env.browsers.join(', '),
          os: `${os.type()} ${os.release()}`,
          node: process.version,
          gitCommit: gitCommit(),
        },
        totals: { total, passed, failed, skipped, flaky, passRate },
        byProject,
        byFile,
        tests: this.tests,
      };

      const html = buildSummaryHtml(model);
      const htmlPath = path.join(outDir, 'index.html');
      fs.writeFileSync(htmlPath, html, 'utf8');

      const pdfPath = path.join(outDir, 'test-report.pdf');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: 'load' });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      });
      await browser.close();

      // Keep JSON model for debugging / CI upload
      fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(model, null, 2));
      console.log(`\nSummary HTML: ${htmlPath}`);
      console.log(`Summary PDF:  ${pdfPath}`);
      console.log(`Overall status: ${result.status}`);
    } catch (error) {
      console.error('Summary reporter failed (tests exit code unchanged):', error);
    }
  }
}

export default SummaryReporter;
