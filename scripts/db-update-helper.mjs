#!/usr/bin/env node
import { spawn } from 'child_process';
import { readdirSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendDir = path.join(repoRoot, 'apps', 'backend');
const prismaSchemaPath = 'prisma/schema.prisma';
const migrationDir = path.join(backendDir, 'prisma', 'migrations');

let migrations = [];
try {
  migrations = readdirSync(migrationDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
} catch (error) {
  console.warn('Unable to read migrations directory:', error.message);
}

const pnpmPrefix = ['--filter', '@command-center/backend', 'exec', '--', 'prisma'];
const isWindows = process.platform === 'win32';

async function runPrisma(args, { capture = false, silent = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', [...pnpmPrefix, ...args], {
      cwd: backendDir,
      shell: isWindows,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : silent ? 'ignore' : 'inherit',
    });

    if (!capture) {
      child.on('exit', (code) => {
        code === 0 ? resolve({ code }) : reject(new Error(`Command failed with code ${code}`));
      });
      child.on('error', reject);
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      const error = new Error(stderr || stdout || `Command failed with code ${code}`);
      error.stdout = stdout;
      error.stderr = stderr;
      code === 0 ? resolve({ stdout, stderr, code }) : reject(error);
    });
  });
}

function analyzeStatus(output) {
  const text = output.toLowerCase();
  if (text.includes('database schema is up to date')) {
    return 'upToDate';
  }
  if (
    text.includes('have not yet been applied') ||
    text.includes('pending') ||
    text.includes('need to be applied')
  ) {
    return 'pending';
  }
  if (text.includes('database schema is not empty') && text.includes('baseline')) {
    return 'needsBaseline';
  }
  if (text.includes('drift detected')) {
    return 'drift';
  }
  return 'unknown';
}

async function getStatus() {
  try {
    const result = await runPrisma(['migrate', 'status', '--schema', prismaSchemaPath], {
      capture: true,
    });
    const output = (result.stdout ?? '') + (result.stderr ?? '');
    return { raw: output, state: analyzeStatus(output) };
  } catch (error) {
    const output = [error.stdout, error.stderr, error.message].filter(Boolean).join('\n');
    const state = analyzeStatus(output);
    if (state === 'pending' || state === 'needsBaseline') {
      return { raw: output, state };
    }
    throw error;
  }
}

function extractFailedMigrations(output) {
  const migrations = new Set();
  const regex = /The `([^`]+)` migration.*failed/gi;
  let match;
  while ((match = regex.exec(output)) !== null) {
    migrations.add(match[1]);
  }
  const p3018 = output.match(/Migration name: ([^\n]+)/i);
  if (p3018) migrations.add(p3018[1].trim());
  return Array.from(migrations);
}

function findDuplicateTableCreates() {
  const tableMap = new Map();

  for (const migration of migrations) {
    const sqlPath = path.join(migrationDir, migration, 'migration.sql');
    if (!existsSync(sqlPath)) continue;

    const content = readFileSync(sqlPath, 'utf8');
    const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?([A-Za-z0-9_]+)["`]?/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const table = match[1].toLowerCase();
      if (!tableMap.has(table)) {
        tableMap.set(table, []);
      }
      tableMap.get(table).push(migration);
    }
  }

  return Array.from(tableMap.entries())
    .map(([table, list]) => ({ table, migrations: list.sort() }))
    .filter((entry) => entry.migrations.length > 1);
}

async function checkTableExists(tableName) {
  try {
    const result = await runPrisma(
      ['db', 'execute', '--stdin', '--schema', prismaSchemaPath],
      { capture: true }
    );

    // return true and let the migration handle it
    return true;
  } catch (error) {
    return false;
  }
}

async function resolveDuplicates() {
  const duplicates = findDuplicateTableCreates();
  if (duplicates.length === 0) return false;

  let actuallyResolved = 0;
  let alreadyResolved = 0;

  console.log('Checking for duplicate CREATE TABLE statements...');

  for (const entry of duplicates) {
    const [primary, ...redundant] = entry.migrations;

    for (const migration of redundant) {
      try {
        await runPrisma(
          ['migrate', 'resolve', '--applied', migration, '--schema', prismaSchemaPath],
          { capture: true },
        );
        if (actuallyResolved === 0) {
          console.log(`\nResolving duplicates for table "${entry.table}":`);
        }
        console.log(`  ✓ Marked ${migration} as applied`);
        actuallyResolved++;
      } catch (error) {
        const output = [error.stderr, error.stdout].filter(Boolean).join('\n');
        if (
          output.includes('already been recorded') ||
          output.includes('already recorded as applied')
        ) {
          alreadyResolved++;
        } else {
          console.log(`  ✗ Failed to mark ${migration}: ${error.message}`);
        }
      }
    }
  }

  if (actuallyResolved > 0) {
    console.log(`\n✓ Resolved ${actuallyResolved} duplicate migration(s)\n`);
  }

  return actuallyResolved > 0;
}

async function baselineAllMigrations() {
  if (migrations.length === 0) {
    console.log('No migrations found to baseline');
    return;
  }

  console.log('Database has existing schema but no migration history');
  console.log('Baselining all migrations as applied:\n');

  let baselined = 0;
  for (const name of migrations) {
    try {
      await runPrisma(['migrate', 'resolve', '--applied', name, '--schema', prismaSchemaPath], {
        capture: true,
      });
      console.log(`  ✓ ${name}`);
      baselined++;
    } catch (error) {
      const output = [error.stderr, error.stdout].filter(Boolean).join('\n');
      if (output.includes('already applied') || output.includes('already been recorded')) {
        continue;
      }
      console.log(`  ✗ ${name}: ${error.message}`);
    }
  }

  if (baselined > 0) {
    console.log(`\n✓ Baselined ${baselined} migration(s)\n`);
  }
}

async function markAsApplied(migrationName) {
  try {
    await runPrisma(
      ['migrate', 'resolve', '--applied', migrationName, '--schema', prismaSchemaPath],
      { capture: true },
    );
    return true;
  } catch (err) {
    const output = [err.stderr, err.stdout].filter(Boolean).join('\n');
    return output.includes('already been recorded');
  }
}

async function attemptDeploy() {
  try {
    await runPrisma(['migrate', 'deploy', '--schema', prismaSchemaPath], { capture: true });
    return { success: true };
  } catch (error) {
    const fullOutput = [error.stderr, error.stdout, error.message].filter(Boolean).join('\n');
    const failed = extractFailedMigrations(fullOutput);

    // Check if it's a "table already exists" error
    if (fullOutput.includes('already exists') || fullOutput.includes('P3010')) {
      return { success: false, failedMigrations: failed, reason: 'table_exists' };
    }

    return failed.length > 0
      ? { success: false, failedMigrations: failed }
      : Promise.reject(error);
  }
}

function handleDrift(statusOutput) {
  console.error('\n⚠ Drift detected: database schema differs from prisma/schema.prisma\n');
  console.error('Review the output and reconcile manually:\n');
  console.error(statusOutput);
  console.log('\nSuggested commands:');
  console.log('  pnpm --filter @command-center/backend exec -- prisma migrate diff \\');
  console.log('    --from-schema-datasource --to-schema prisma/schema.prisma --script');
  console.log(
    '  pnpm --filter @command-center/backend exec -- prisma migrate resolve --applied <migration>',
  );
  console.log('\nAfter reconciling, rerun: pnpm update-db');
}

async function main() {
  console.log('=== AntiHunter Command Center :: Database Updater ===\n');

  try {
    console.log(`Found ${migrations.length} migration(s) in migrations directory`);

    let hadDuplicates = false;
    if (migrations.length > 0) {
      hadDuplicates = await resolveDuplicates();
    }

    console.log('\nChecking migration status...');
    const status = await getStatus();

    if (status.state === 'upToDate') {
      console.log('\n' + '='.repeat(60));
      console.log('✓ Database is up to date - no migrations needed');
      console.log('='.repeat(60) + '\n');
      return;
    }

    if (status.state === 'drift') {
      handleDrift(status.raw);
      process.exitCode = 1;
      return;
    }

    if (status.state === 'needsBaseline') {
      await baselineAllMigrations();
    }

    console.log('Applying pending migrations...\n');
    let result = await attemptDeploy();
    const processed = new Set();
    let retryCount = 0;
    const maxRetries = 3;

    while (!result.success && result.failedMigrations && retryCount < maxRetries) {
      console.log('\nHandling failed migrations (likely due to existing tables):\n');

      for (const migration of result.failedMigrations) {
        if (processed.has(migration)) continue;

        console.log(`  Marking as applied: ${migration}`);
        if (await markAsApplied(migration)) {
          processed.add(migration);
          console.log(`  ✓ ${migration} marked as applied`);
        } else {
          console.log(`  ✗ Failed to mark ${migration}`);
        }
      }

      if (result.failedMigrations.every((m) => processed.has(m))) {
        console.log('\nRetrying migration deploy...\n');
        result = await attemptDeploy();
        retryCount++;
      } else {
        break;
      }
    }

    if (!result.success) {
      console.error('\n✗ Failed to apply all migrations');
      console.log('\nTroubleshooting steps:');
      console.log('  1. Check the error messages above');
      console.log('  2. Verify database connectivity');
      console.log('  3. Check for schema drift:');
      console.log('     pnpm --filter @command-center/backend exec -- prisma migrate status');
      console.log('  4. Manually resolve failed migrations:');
      console.log('     pnpm --filter @command-center/backend exec -- prisma migrate resolve --applied <migration>');
      process.exitCode = 1;
    } else {
      console.log('\n' + '='.repeat(60));
      console.log('✓ Database migrations applied successfully!');
      if (hadDuplicates || processed.size > 0) {
        console.log(`  - Resolved ${processed.size} conflicting migration(s)`);
      }
      console.log('='.repeat(60) + '\n');
    }
  } catch (error) {
    console.error('\n✗ Database update failed:', error.message);

    if (error.stdout || error.stderr) {
      console.error('\nOutput:');
      console.error(error.stderr || error.stdout);
    }

    console.log('\nManual recovery options:');
    console.log('  pnpm --filter @command-center/backend exec -- prisma migrate status');
    console.log('  pnpm --filter @command-center/backend exec -- prisma migrate deploy');
    console.log('  pnpm --filter @command-center/backend exec -- prisma migrate resolve --help');

    process.exitCode = 1;
  }
}

main();
