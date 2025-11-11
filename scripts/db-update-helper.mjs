#!/usr/bin/env node
import { createInterface } from 'readline';
import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const backendDir = path.join(repoRoot, 'apps', 'backend');
const migrationsDir = path.join(backendDir, 'prisma', 'migrations');

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function runCommand(command, args, options = {}) {
  const cwd = options.cwd ?? backendDir;
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

function listMigrations() {
  try {
    const entries = readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (entries.length === 0) {
      console.log('No migrations found.\n');
      return;
    }
    entries.forEach((name, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${name}`);
    });
    console.log('');
  } catch (error) {
    console.error('Unable to read migrations directory:', error.message);
  }
}

async function baselineInitialMigration() {
  const migration = '20251027205237_init';
  console.log(`\nMarking ${migration} as applied...\n`);
  try {
    await runCommand('pnpm', [
      '--filter',
      '@command-center/backend',
      'prisma',
      'migrate',
      'resolve',
      '--applied',
      migration,
    ]);
    console.log('\nBaseline successful.\n');
  } catch (error) {
    console.error('\nBaseline failed:', error.message, '\n');
  }
}

async function baselineSpecificMigration() {
  console.log('\nAvailable migrations:\n');
  listMigrations();
  const name = await ask('Enter exact migration name to mark as applied: ');
  if (!name) {
    console.log('No migration provided.\n');
    return;
  }
  console.log(`\nMarking ${name} as applied...\n`);
  try {
    await runCommand('pnpm', [
      '--filter',
      '@command-center/backend',
      'prisma',
      'migrate',
      'resolve',
      '--applied',
      name,
    ]);
    console.log('\nMigration marked as applied.\n');
  } catch (error) {
    console.error('\nFailed to mark migration as applied:', error.message, '\n');
  }
}

async function markRolledBack() {
  console.log('\nAvailable migrations:\n');
  listMigrations();
  const name = await ask('Enter exact migration name to mark as rolled back: ');
  if (!name) {
    console.log('No migration provided.\n');
    return;
  }
  console.log(`\nMarking ${name} as rolled back...\n`);
  try {
    await runCommand('pnpm', [
      '--filter',
      '@command-center/backend',
      'prisma',
      'migrate',
      'resolve',
      '--rolled-back',
      name,
    ]);
    console.log('\nMigration marked as rolled back.\n');
  } catch (error) {
    console.error('\nFailed to mark migration as rolled back:', error.message, '\n');
  }
}

async function runMigrateDeploy() {
  console.log('\nRunning prisma migrate deploy...\n');
  try {
    await runCommand('pnpm', ['--filter', '@command-center/backend', 'exec', 'prisma', 'migrate', 'deploy']);
    console.log('\nMigrations applied successfully.\n');
  } catch (error) {
    console.error('\nMigration failed:', error.message, '\n');
  }
}

async function runMigrateReset() {
  console.log('\nWARNING: This will drop the database schema and reapply migrations.');
  const confirm = await ask('Type RESET to continue: ');
  if (confirm !== 'RESET') {
    console.log('Reset cancelled.\n');
    return;
  }
  try {
    await runCommand('pnpm', [
      '--filter',
      '@command-center/backend',
      'prisma',
      'migrate',
      'reset',
      '--force',
      '--skip-seed',
    ]);
    console.log('\nDatabase reset complete.\n');
  } catch (error) {
    console.error('\nReset failed:', error.message, '\n');
  }
}

async function dropPublicSchema() {
  console.log('\nDANGER: This will drop and recreate the public schema (all data will be lost).');
  const confirm = await ask('Type DROP to continue: ');
  if (confirm !== 'DROP') {
    console.log('Operation cancelled.\n');
    return;
  }
  const script = 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;';
  try {
    await runCommand('pnpm', [
      '--filter',
      '@command-center/backend',
      'exec',
      'prisma',
      'db',
      'execute',
      '--script',
      script,
    ]);
    console.log('\nSchema recreated. Run migrate deploy next.\n');
  } catch (error) {
    console.error('\nFailed to drop schema:', error.message, '\n');
  }
}

async function mainMenu() {
  console.log('\n=== Database Update Helper ===\n');
  console.log('1) Baseline initial migration (20251027205237_init)');
  console.log('2) Mark a migration as applied');
  console.log('3) Mark a migration as rolled back');
  console.log('4) Run prisma migrate deploy');
  console.log('5) Reset database schema (prisma migrate reset)');
  console.log('6) Drop and recreate public schema');
  console.log('7) List migrations');
  console.log('0) Exit\n');

  const choice = await ask('Select an option: ');
  switch (choice) {
    case '1':
      await baselineInitialMigration();
      break;
    case '2':
      await baselineSpecificMigration();
      break;
    case '3':
      await markRolledBack();
      break;
    case '4':
      await runMigrateDeploy();
      break;
    case '5':
      await runMigrateReset();
      break;
    case '6':
      await dropPublicSchema();
      break;
    case '7':
      listMigrations();
      break;
    case '0':
      rl.close();
      return false;
    default:
      console.log('\nUnknown option.\n');
  }
  return true;
}

async function main() {
  let keepRunning = true;
  while (keepRunning) {
    keepRunning = await mainMenu();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
