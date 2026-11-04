const prisma = require('../src/config/prisma');

async function check() {
  for (let i = 0; i < 5; i++) {
    try {
      console.log(`Connecting to DB (attempt ${i + 1})...`);
      const empCount = await prisma.employeeProfile.count();
      const comps = await prisma.compensationProfile.findMany({
        include: { employee: true, salaryStructure: true }
      });
      const structures = await prisma.salaryStructure.findMany({
        include: { _count: { select: { compensations: true } } }
      });
      const taxes = await prisma.taxRule.findMany();
      console.log('✅ Connected successfully!');
      console.log('Total Employees:', empCount);
      console.log('Compensations count:', comps.length);
      console.log('Structures:', structures.map(s => ({ id: s.id, name: s.name, count: s._count.compensations })));
      console.log('Taxes:', taxes.map(t => ({ id: t.id, name: t.name, country: t.country })));
      process.exit(0);
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed:`, e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  process.exit(1);
}

check();
