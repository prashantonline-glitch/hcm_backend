const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  const users = await prisma.user.findMany({ 
    select: { id: true, email: true, role: true, organizationId: true, name: true } 
  });
  console.log('Total users:', users.length);
  console.log('Users:', users);

  const emps = await prisma.employeeProfile.findMany({ 
    select: { 
      id: true, 
      fullName: true, 
      employeeId: true, 
      organizationId: true, 
      lifecycleStatus: true,
      department: { select: { name: true } }
    } 
  });
  console.log('Total emps:', emps.length);
  console.log('Employees:', emps);

  const orgs = await prisma.organization.findMany();
  console.log('Orgs:', orgs);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
