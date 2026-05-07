import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('allride123', 10);

  const driver = await prisma.user.upsert({
    where: { email: 'driver@allride.com' },
    update: {},
    create: {
      fullName: 'Conductor de Prueba',
      email: 'driver@allride.com',
      password: hashedPassword,
      isVerified: true,
    },
  });

  console.log('✅ Conductor de prueba creado con password:', driver.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
