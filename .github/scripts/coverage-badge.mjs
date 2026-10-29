#!/usr/bin/env node
/**
 * Builds a coverage badge (shields.io endpoint JSON + SVG) from a JaCoCo CSV or a Vitest
 * json-summary report.
 *
 * The generated files are published to the `badges` branch by .github/scripts/publish_badges.sh, so the
 * README renders them through https://img.shields.io/endpoint without any third-party service.
 *
 * A missing or unreadable report is a warning, never a failure: the previous badge value simply stays.
 *
 * Usage:
 *   node .github/scripts/coverage-badge.mjs --source jacoco \
 *     --input backend/build/reports/jacoco/test/jacocoTestReport.csv \
 *     --name backend --label "backend coverage" --output-dir coverage-badges \
 *     --summary-file "$GITHUB_STEP_SUMMARY"
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COLORS = {
  brightgreen: '#4c1',
  green: '#97ca00',
  yellowgreen: '#a4a61d',
  yellow: '#dfb317',
  orange: '#fe7d37',
  red: '#e05d44',
};

const REQUIRED = ['source', 'input', 'name'];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined) {
      throw new Error(`Malformed argument near "${key}"`);
    }
    args[key.slice(2)] = value;
  }
  for (const key of REQUIRED) {
    if (!args[key]) {
      throw new Error(`Missing required argument --${key}`);
    }
  }
  if (!['jacoco', 'vitest'].includes(args.source)) {
    throw new Error(`--source must be "jacoco" or "vitest", got "${args.source}"`);
  }
  return {
    source: args.source,
    input: args.input,
    name: args.name,
    label: args.label ?? 'coverage',
    outputDir: args['output-dir'] ?? 'coverage-badges',
    summaryFile: args['summary-file'],
  };
}

function readJaCoCo(path) {
  const [header, ...rows] = readFileSync(path, 'utf8').trim().split(/\r?\n/);
  const columns = header.split(',');
  const index = (column) => {
    const position = columns.indexOf(column);
    if (position === -1) {
      throw new Error(`${path} has no ${column} column`);
    }
    return position;
  };

  let linesMissed = 0;
  let linesCovered = 0;
  let branchesMissed = 0;
  let branchesCovered = 0;
  for (const row of rows) {
    const cells = row.split(',');
    linesMissed += Number(cells[index('LINE_MISSED')]);
    linesCovered += Number(cells[index('LINE_COVERED')]);
    branchesMissed += Number(cells[index('BRANCH_MISSED')]);
    branchesCovered += Number(cells[index('BRANCH_COVERED')]);
  }

  const lines = linesMissed + linesCovered;
  if (!lines) {
    throw new Error(`${path} contains no line data`);
  }
  const branches = branchesMissed + branchesCovered;
  return {
    lines: (100 * linesCovered) / lines,
    branches: branches ? (100 * branchesCovered) / branches : undefined,
  };
}

function readVitest(path) {
  // Some editors/tools write a UTF-8 BOM, which JSON.parse rejects.
  const summary = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  const total = summary.total ?? {};
  const lines = total.lines?.pct;
  if (lines === undefined || lines === null) {
    throw new Error(`${path} contains no line data`);
  }
  const branches = total.branches?.pct;
  return { lines: Number(lines), branches: branches === undefined || branches === null ? undefined : Number(branches) };
}

function badgeColor(percent) {
  if (percent >= 90) return 'brightgreen';
  if (percent >= 80) return 'green';
  if (percent >= 70) return 'yellowgreen';
  if (percent >= 60) return 'yellow';
  if (percent >= 50) return 'orange';
  return 'red';
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function badgeSvg(label, percent) {
  const value = `${percent.toFixed(1)}%`;
  const labelWidth = Math.max(72, label.length * 7 + 12);
  const valueWidth = 52;
  const width = labelWidth + valueWidth;
  const fill = COLORS[badgeColor(percent)];

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(label)}: ${value}">`,
    `  <title>${escapeXml(label)}: ${value}</title>`,
    `  <rect width="${labelWidth}" height="20" rx="3" fill="#555"/>`,
    `  <rect x="${labelWidth}" width="${valueWidth}" height="20" rx="3" fill="${fill}"/>`,
    '  <g fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">',
    `    <text x="6" y="14">${escapeXml(label)}</text>`,
    `    <text x="${labelWidth + 6}" y="14">${value}</text>`,
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

function writeSummary(path, name, lines, branches) {
  const heading = `### ${name.charAt(0).toUpperCase()}${name.slice(1)} coverage\n\n`;
  const table = ['| Metric | Coverage |', '| --- | --- |', `| Lines | ${lines.toFixed(2)}% |`];
  if (branches !== undefined) {
    table.push(`| Branches | ${branches.toFixed(2)}% |`);
  }
  appendFileSync(path, `${heading}${table.join('\n')}\n\n`, 'utf8');
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`::error::${error.message}`);
    return 1;
  }

  if (!existsSync(options.input)) {
    console.log(`::warning::${options.input} is missing, keeping the previous badge value`);
    return 0;
  }

  let coverage;
  try {
    coverage = options.source === 'jacoco' ? readJaCoCo(options.input) : readVitest(options.input);
  } catch (error) {
    console.log(`::warning::Could not read coverage from ${options.input}: ${error.message}`);
    return 0;
  }

  mkdirSync(options.outputDir, { recursive: true });

  const endpoint = {
    schemaVersion: 1,
    label: options.label,
    message: `${coverage.lines.toFixed(1)}%`,
    color: badgeColor(coverage.lines),
  };
  writeFileSync(join(options.outputDir, `${options.name}-coverage.json`), `${JSON.stringify(endpoint, null, 2)}\n`, 'utf8');
  writeFileSync(join(options.outputDir, `${options.name}-coverage.svg`), badgeSvg(options.label, coverage.lines), 'utf8');

  if (options.summaryFile) {
    writeSummary(options.summaryFile, options.name, coverage.lines, coverage.branches);
  }

  const suffix = coverage.branches === undefined ? '' : `, branches ${coverage.branches.toFixed(2)}%`;
  console.log(`${options.name} coverage: lines ${coverage.lines.toFixed(2)}%${suffix}`);
  return 0;
}

process.exit(main());
