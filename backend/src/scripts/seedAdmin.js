import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { config } from '../config/env.js';

export const seedAdmin = async () => {
  const email = config.adminEmail;
  const password = config.adminPassword;

  if (!email || !password) {
    console.error('[Admin Seed] Error: ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env');
    return;
  }

  try {
    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log(`[Admin Seed] Admin account '${email}' already exists.`);
      return existingAdmin;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newAdmin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    console.log(`[Admin Seed] Initial admin account '${email}' created successfully!`);
    return newAdmin;
  } catch (error) {
    console.error('[Admin Seed] Error seeding admin account:', error);
    throw error;
  }
};

// Allow executing directly via Node script CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
