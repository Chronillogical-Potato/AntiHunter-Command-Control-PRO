import { PrismaClient, Role, SiteAccessLevel } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_FEATURES_BY_ROLE } from '../src/users/user-permissions.constants';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin';
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';

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

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await argon2.hash(adminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        legalAcceptedAt: null,
        firstName: 'Admin',
        lastName: 'User',
        jobTitle: 'System Administrator',
        preferences: {
          create: {
            theme: 'dark',
            density: 'compact',
            language: 'en',
            timeFormat: '24h',
          },
        },
        permissions: {
          create: (DEFAULT_FEATURES_BY_ROLE[Role.ADMIN] ?? []).map((feature) => ({
            feature,
          })),
        },
        siteAccess: {
          create: [
            {
              siteId: 'default',
              level: SiteAccessLevel.MANAGE,
            },
          ],
        },
      },
    });
  }
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
