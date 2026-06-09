#!/usr/bin/env node
/**
 * Zero-dependency custom lint rules, enforced in the pre-commit hook.
 *
 * Parses with the TypeScript compiler that's already a dependency — no new
 * packages. Walks the AST of every src/**.ts file and the frontmatter +
 * <script> blocks of every src/**.astro file, and reports:
 *
 *   no-else          — `else` / `else if` (use early returns instead)
 *   nested-if        — `if` nested deeper than MAX_IF_DEPTH
 *   nested-loop      — a loop inside another loop
 *   too-many-loops   — more than MAX_LOOPS_PER_FN loops in one function
 *   swallowed-error  — empty `catch`, or a `catch` that neither logs nor rethrows
 *   duplicate-string — a long string literal repeated more than DUP_MAX times
 *
 * Tune the thresholds below. Test files are intentionally skipped.
 * Escape hatch: put `// lint:allow-swallow` on a catch line to permit a swallow.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(ROOT, 'src');

// ── Thresholds ─────────────────────────────────────────────────
const MAX_IF_DEPTH = 2;       // one level of nesting allowed; deeper fails
const MAX_LOOP_DEPTH = 1;     // no nested loops
const MAX_LOOPS_PER_FN = 2;   // "avoid more than 2 loops"
const DUP_MAX = 2;            // a string may repeat at most twice (3rd fails)
const DUP_MIN_LEN = 10;       // ignore short literals (type tags, slugs, css)
const ALLOW_SWALLOW = 'lint:allow-swallow';

const LOOP_KINDS = new Set([
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
]);

const FN_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

const isFn = node => FN_KINDS.has(node.kind);
const isLoop = node => LOOP_KINDS.has(node.kind);

/** A parseable code segment lifted out of a source file. */
function segmentsOf(filePath, text) {
  if (!filePath.endsWith('.astro')) return [{ code: text, lineOffset: 0 }];

  const segments = [];
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatter) {
    segments.push({ code: frontmatter[1], lineOffset: lineAt(text, frontmatter.index) + 1 });
  }
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = scriptRe.exec(text)) !== null) {
    const contentStart = m.index + m[0].indexOf('>') + 1;
    segments.push({ code: m[1], lineOffset: lineAt(text, contentStart) });
  }
  return segments;
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length - 1;

// ── Rule walkers ───────────────────────────────────────────────

function checkNesting(sf, report) {
  const walk = (node, ifDepth, loopDepth) => {
    let nextIf = ifDepth;
    let nextLoop = loopDepth;

    if (ts.isIfStatement(node)) {
      if (node.elseStatement) report(node.elseStatement, 'no-else', '`else` — restructure with an early return');
      nextIf = ifDepth + 1;
      if (nextIf > MAX_IF_DEPTH) report(node, 'nested-if', `if nested ${nextIf} deep (max ${MAX_IF_DEPTH})`);
    } else if (isLoop(node)) {
      nextLoop = loopDepth + 1;
      if (nextLoop > MAX_LOOP_DEPTH) report(node, 'nested-loop', 'loop inside another loop');
    } else if (isFn(node)) {
      nextIf = 0;       // a new function is a fresh nesting scope
      nextLoop = 0;
    }

    ts.forEachChild(node, child => walk(child, nextIf, nextLoop));
  };
  walk(sf, 0, 0);
}

/** Count loops belonging to `fn` without descending into nested functions. */
function countOwnLoops(fn) {
  let count = 0;
  const visit = node => {
    if (node !== fn && isFn(node)) return;
    if (isLoop(node)) count++;
    ts.forEachChild(node, visit);
  };
  visit(fn);
  return count;
}

function checkLoopBudget(sf, report) {
  const visit = node => {
    if (isFn(node) && countOwnLoops(node) > MAX_LOOPS_PER_FN) {
      report(node, 'too-many-loops', `function has more than ${MAX_LOOPS_PER_FN} loops`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function checkCatches(sf, text, report) {
  const visit = node => {
    if (ts.isCatchClause(node)) inspectCatch(node, text, report);
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

function inspectCatch(node, text, report) {
  const onAllowedLine = text.slice(0, node.getStart(node.getSourceFile())).includes(ALLOW_SWALLOW)
    ? lineHasAllow(node, text)
    : false;
  if (onAllowedLine) return;

  if (node.block.statements.length === 0) {
    report(node, 'swallowed-error', 'empty catch block swallows the error');
    return;
  }
  if (!catchHandles(node.block)) {
    report(node, 'swallowed-error', `catch neither logs nor rethrows (add a log, rethrow, or \`// ${ALLOW_SWALLOW}\`)`);
  }
}

function lineHasAllow(node, text) {
  const start = node.getStart(node.getSourceFile());
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const lineEnd = text.indexOf('\n', start);
  return text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).includes(ALLOW_SWALLOW);
}

/** True if the catch body throws or calls console.*. */
function catchHandles(block) {
  let handled = false;
  const visit = node => {
    if (handled) return;
    if (ts.isThrowStatement(node)) handled = true;
    if (ts.isCallExpression(node) && node.expression.getText().startsWith('console.')) handled = true;
    ts.forEachChild(node, visit);
  };
  visit(block);
  return handled;
}

function checkDuplicateStrings(sf, report) {
  const seen = new Map(); // value -> first node
  const counts = new Map();
  const visit = node => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const value = node.text;
      if (value.length >= DUP_MIN_LEN && !/^[\w-]+$/.test(value)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
        if (!seen.has(value)) seen.set(value, node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  for (const [value, count] of counts) {
    if (count > DUP_MAX) {
      report(seen.get(value), 'duplicate-string', `"${value}" repeated ${count}× (max ${DUP_MAX}) — extract a constant`);
    }
  }
}

// ── Driver ─────────────────────────────────────────────────────

function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (/\.(ts|astro)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

function lintFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const violations = [];

  for (const { code, lineOffset } of segmentsOf(filePath, text)) {
    const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const report = (node, rule, message) => {
      const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      violations.push({ line: line + lineOffset + 1, col: character + 1, rule, message });
    };
    checkNesting(sf, report);
    checkLoopBudget(sf, report);
    checkCatches(sf, code, report);
    checkDuplicateStrings(sf, report);
  }
  return violations.sort((a, b) => a.line - b.line);
}

let total = 0;
for (const file of listSourceFiles(SRC)) {
  const violations = lintFile(file);
  if (violations.length === 0) continue;
  total += violations.length;
  const rel = relative(ROOT, file);
  for (const v of violations) {
    console.error(`${rel}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
  }
}

if (total > 0) {
  console.error(`\n✗ ${total} lint violation(s). Commit blocked.`);
  process.exit(1);
}
console.log('✓ custom lint rules passed');
