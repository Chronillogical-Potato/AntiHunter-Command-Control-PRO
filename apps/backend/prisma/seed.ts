import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  await prisma.alarmConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  await prisma.visualConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  await prisma.coverageConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {},
  });

  await prisma.site.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Default Site',
      color: '#2E7D32',
    },
  });

  await prisma.serialConfig.upsert({
    where: { siteId: 'default' },
    update: {},
    create: {
      siteId: 'default',
    },
  });

  await prisma.mqttConfig.upsert({
    where: { siteId: 'default' },
    update: {},
    create: {
      brokerUrl: 'mqtt://localhost:1883',
      clientId: 'command-center-default',
      siteId: 'default',
    },
  });
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console -- CLI feedback
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
