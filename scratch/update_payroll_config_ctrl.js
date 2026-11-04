const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'payrollConfigController.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

const oldGetStructures = `exports.getSalaryStructures = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const structures = await prisma.salaryStructure.findMany({
      where: { organizationId: orgId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            components: {
              include: { component: true },
              orderBy: { sequence: 'asc' }
            }
          }
        },
        _count: {
          select: { compensations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};`;

const newGetStructures = `exports.getSalaryStructures = async (req, res) => {
  try {
    const orgId = await getOrgId(req.user);
    const structures = await prisma.salaryStructure.findMany({
      where: { organizationId: orgId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            components: {
              include: { component: true },
              orderBy: { sequence: 'asc' }
            },
            compensations: {
              include: {
                employee: {
                  select: {
                    id: true,
                    fullName: true,
                    employeeId: true,
                    designation: true,
                    joiningDate: true,
                    lifecycleStatus: true,
                    department: { select: { id: true, name: true } },
                    user: { select: { id: true, name: true, email: true, isActive: true, status: true } }
                  }
                }
              }
            }
          }
        },
        compensations: {
          include: {
            employee: {
              select: {
                id: true,
                fullName: true,
                employeeId: true,
                designation: true,
                joiningDate: true,
                lifecycleStatus: true,
                department: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, email: true, isActive: true, status: true } }
              }
            }
          }
        },
        _count: {
          select: { compensations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};`;

if (!content.includes(oldGetStructures)) {
  console.error('Could not match old getSalaryStructures!');
  process.exit(1);
}

content = content.replace(oldGetStructures, newGetStructures);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated payrollConfigController.js with compensations employee data!');

