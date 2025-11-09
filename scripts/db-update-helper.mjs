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
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
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
    entries.forEach((name, index) => {
      console.log(`${String(index + 1).padStart(2, ' ')}. ${name}`);
    });
  } catch (error) {
    console.error('Unable to read migrations directory:', error.message);
  }
}

async function baselineInitialMigration() {
  const migration = '20251027205237_init';
  console.log(`\nMarking ${migration} as applied...`);
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
    console.log('Baseline complete.\n');
  } catch (error) {
    console.error('\nFailed to baseline migration:', error.message, '\n');
  }
}

async function baselineCustomMigration() {
  console.log('\nAvailable migrations:\n');
  listMigrations();
  const name = await ask('\nEnter exact migration name to mark as applied: ');
  if (!name) {
    console.log('No migration name provided.\n');
    return;
  }
  console.log(`\nMarking ${name} as applied...`);
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
    console.log('Baseline complete.\n');
  } catch (error) {
    console.error('\nFailed to baseline migration:', error.message, '\n');
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
  console.log('\nWARNING: This will drop the database schema. Make sure you have backups!');
  const confirm = await ask('Type "RESET" to continue or press Enter to cancel: ');
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

async function dropSchema() {
  console.log('\nDANGER: This will drop schema "public" and recreate it. ALL DATA WILL BE LOST.');
  const confirm = await ask('Type "DROP" to continue or press Enter to cancel: ');
  if (confirm !== 'DROP') {
    console.log('Operation cancelled.\n');
    return;
  }
  const script =
    'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO CURRENT_USER;';
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
    console.log('\nSchema recreated. Run option 4 afterwards to reapply migrations.\n');
  } catch (error) {
    console.error('\nFailed to drop schema:', error.message, '\n');
  }
}

async function showMenu() {
  console.log('\n=== Database Update Helper ===\n');
  console.log('1) Baseline initial migration (20251027205237_init)');
  console.log('2) Baseline a specific migration');
  console.log('3) List migrations');
  console.log('4) Run prisma migrate deploy');
  console.log('5) Run prisma migrate reset --force --skip-seed');
  console.log('6) Drop and recreate public schema (clears database)');
  console.log('0) Exit\n');
  const choice = await ask('Select an option: ');
  switch (choice) {
    case '1':
      await baselineInitialMigration();
      break;
    case '2':
      await baselineCustomMigration();
      break;
    case '3':
      console.log('');
      listMigrations();
      console.log('');
      break;
    case '4':
      await runMigrateDeploy();
      break;
    case '5':
      await runMigrateReset();
      break;
    case '6':
      await dropSchema();
      break;
    case '0':
      rl.close();
      return false;
    default:
      console.log('\nUnknown option. Please try again.\n');
  }
  return true;
}

async function main() {
  let keepRunning = true;
  while (keepRunning) {
    // eslint-disable-next-line no-await-in-loop
    keepRunning = await showMenu();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
