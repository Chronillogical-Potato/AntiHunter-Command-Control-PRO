const fs = require('fs');
const path = require('path');
function loadEnv(relative) {
  const resolved = path.resolve(__dirname, relative);
  if (!fs.existsSync(resolved)) {
    return;
  }
  const lines = fs.readFileSync(resolved, 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const idx = line.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
loadEnv('../apps/backend/.env');
loadEnv('../apps/backend/prisma/.env');
const { PrismaClient } = require('../apps/backend/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.node.count();
  console.log('Node count:', count);
  const sites = await prisma.site.findMany({ select: { id: true } });
  console.log('Sites:', sites);
}
main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
