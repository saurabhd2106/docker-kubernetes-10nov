#!/usr/bin/env tsx
/**
 * Enforces the writing-test-cases skill format on every specs/.../*.spec.ts file:
 * - title matches /^should .+ when .+$/
 * - required Action: and Validation: steps (Input Data: optional)
 * - steps appear in order: Input Data, Action, Validation
 * - no expect() outside a Validation: step
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SPECS_ROOT = path.resolve(__dirname, '../specs');
const TITLE_RE = /^should .+ when .+$/;

type Issue = { file: string; line: number; message: string };

function listSpecFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSpecFiles(full));
    else if (entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isTestCall(expr: ts.CallExpression): boolean {
  // test('...', ...) or test('...', { tag }, ...)
  if (ts.isIdentifier(expr.expression) && expr.expression.text === 'test') return true;
  // test.only / test.fix — still validate body if present
  if (
    ts.isPropertyAccessExpression(expr.expression) &&
    ts.isIdentifier(expr.expression.expression) &&
    expr.expression.expression.text === 'test' &&
    (expr.expression.name.text === 'only' || expr.expression.name.text === 'fix' || expr.expression.name.text === 'skip')
  ) {
    return true;
  }
  return false;
}

function getStringLiteral(node: ts.Expression | undefined): string | undefined {
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function getTestCallback(call: ts.CallExpression): ts.ArrowFunction | ts.FunctionExpression | undefined {
  for (let i = call.arguments.length - 1; i >= 0; i -= 1) {
    const arg = call.arguments[i];
    if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) return arg;
  }
  return undefined;
}

function isTestStepCall(node: ts.CallExpression): boolean {
  // test.step('...', async () => ...)
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'test' &&
    node.expression.name.text === 'step'
  );
}

function isExpectCall(node: ts.CallExpression): boolean {
  // expect(...) or expect.soft(...)
  if (ts.isIdentifier(node.expression) && node.expression.text === 'expect') return true;
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'expect'
  ) {
    return true;
  }
  return false;
}

type StepKind = 'input' | 'action' | 'validation' | 'other';

function stepKind(title: string): StepKind {
  if (title.startsWith('Input Data:')) return 'input';
  if (title.startsWith('Action:')) return 'action';
  if (title.startsWith('Validation:')) return 'validation';
  return 'other';
}

function collectStepsAndExpects(
  callback: ts.ArrowFunction | ts.FunctionExpression,
  sourceFile: ts.SourceFile,
): { steps: { kind: StepKind; title: string; node: ts.CallExpression }[]; orphanExpects: ts.CallExpression[] } {
  const steps: { kind: StepKind; title: string; node: ts.CallExpression }[] = [];
  const orphanExpects: ts.CallExpression[] = [];

  const visit = (node: ts.Node, insideValidation: boolean) => {
    if (ts.isCallExpression(node) && isTestStepCall(node)) {
      const title = getStringLiteral(node.arguments[0]) ?? '';
      const kind = stepKind(title);
      steps.push({ kind, title, node });
      const stepCb = node.arguments.find((a) => ts.isArrowFunction(a) || ts.isFunctionExpression(a)) as
        | ts.ArrowFunction
        | ts.FunctionExpression
        | undefined;
      if (stepCb) visit(stepCb, kind === 'validation');
      return;
    }

    if (ts.isCallExpression(node) && isExpectCall(node) && !insideValidation) {
      orphanExpects.push(node);
    }

    ts.forEachChild(node, (child) => visit(child, insideValidation));
  };

  visit(callback, false);
  return { steps, orphanExpects };
}

function checkFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true);
  const rel = path.relative(process.cwd(), filePath);

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isTestCall(node)) {
      const title = getStringLiteral(node.arguments[0]);
      if (title === undefined) {
        issues.push({ file: rel, line: lineOf(sourceFile, node), message: 'test title must be a string literal' });
      } else if (!TITLE_RE.test(title)) {
        issues.push({
          file: rel,
          line: lineOf(sourceFile, node),
          message: `title must match /^should .+ when .+$/ — got "${title}"`,
        });
      }

      const callback = getTestCallback(node);
      if (!callback) {
        issues.push({ file: rel, line: lineOf(sourceFile, node), message: 'test is missing a callback body' });
      } else {
        const { steps, orphanExpects } = collectStepsAndExpects(callback, sourceFile);

        const hasAction = steps.some((s) => s.kind === 'action');
        const hasValidation = steps.some((s) => s.kind === 'validation');
        if (!hasAction) {
          issues.push({ file: rel, line: lineOf(sourceFile, node), message: 'missing required "Action:" test.step' });
        }
        if (!hasValidation) {
          issues.push({ file: rel, line: lineOf(sourceFile, node), message: 'missing required "Validation:" test.step' });
        }

        for (const step of steps) {
          if (step.kind === 'other') {
            issues.push({
              file: rel,
              line: lineOf(sourceFile, step.node),
              message: `step title must start with "Input Data:", "Action:", or "Validation:" — got "${step.title}"`,
            });
          }
        }

        // Order: input* → action+ → validation+  (no mixing after progressing)
        let phase: StepKind | 'start' = 'start';
        for (const step of steps) {
          if (step.kind === 'other') continue;
          if (step.kind === 'input') {
            if (phase !== 'start' && phase !== 'input') {
              issues.push({
                file: rel,
                line: lineOf(sourceFile, step.node),
                message: '"Input Data:" step must appear before Action and Validation',
              });
            }
            phase = 'input';
          } else if (step.kind === 'action') {
            if (phase === 'validation') {
              issues.push({
                file: rel,
                line: lineOf(sourceFile, step.node),
                message: '"Action:" step must appear before Validation',
              });
            }
            phase = 'action';
          } else if (step.kind === 'validation') {
            phase = 'validation';
          }
        }

        for (const exp of orphanExpects) {
          issues.push({
            file: rel,
            line: lineOf(sourceFile, exp),
            message: 'expect() must only appear inside a "Validation:" test.step',
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return issues;
}

function main(): void {
  if (!fs.existsSync(SPECS_ROOT)) {
    console.error(`Specs directory not found: ${SPECS_ROOT}`);
    process.exit(1);
  }

  const files = listSpecFiles(SPECS_ROOT);
  const issues = files.flatMap(checkFile);

  if (issues.length === 0) {
    console.log(`lint:tests OK — checked ${files.length} spec file(s)`);
    process.exit(0);
  }

  console.error(`lint:tests failed — ${issues.length} issue(s) in ${files.length} file(s):\n`);
  for (const issue of issues) {
    console.error(`  ${issue.file}:${issue.line} — ${issue.message}`);
  }
  process.exit(1);
}

main();
