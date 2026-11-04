const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'middlewares', 'authMiddleware.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

const oldExitBlock = `    if (employeeProfile?.exitLifecycle) {
      const exit = employeeProfile.exitLifecycle;
      const approvedStatuses = ['APPROVED', 'CLEARANCE_IN_PROGRESS', 'PENDING_CLEARANCE'];
      if (approvedStatuses.includes(exit.status)) {
        const effectiveLwd = exit.finalLastWorkingDay ? new Date(exit.finalLastWorkingDay) : (exit.lastWorkingDay ? new Date(exit.lastWorkingDay) : null);
        if (effectiveLwd && !isNaN(effectiveLwd.getTime())) {
          const endOfLwd = new Date(effectiveLwd);
          endOfLwd.setHours(23, 59, 59, 999);
          if (new Date() > endOfLwd) {
            await prisma.user.update({ where: { id: user.id }, data: { isActive: false, status: 'Inactive' } });
            await prisma.exitLifecycle.update({ where: { id: exit.id }, data: { status: 'EMPLOYEE_RELIEVED' } });
            return res.status(401).json({
              success: false,
              error: { code: 'EMPLOYMENT_ENDED', message: 'Your tenure has concluded and your account is deactivated.' }
            });
          }
        }
      } else if (exit.status === 'EMPLOYEE_RELIEVED' || exit.status === 'COMPLETED') {
        if (user.isActive) {
          await prisma.user.update({ where: { id: user.id }, data: { isActive: false, status: 'Inactive' } });
        }
        return res.status(401).json({
          success: false,
          error: { code: 'ACCOUNT_RELIEVED', message: 'Your account has been deactivated.' }
        });
      }
    }`;

const newExitBlock = `    if (employeeProfile?.exitLifecycle) {
      const exit = employeeProfile.exitLifecycle;
      // Allow INITIATED (standard for scheduled terminations) alongside approved statuses
      const activeExitStatuses = ['APPROVED', 'CLEARANCE_IN_PROGRESS', 'PENDING_CLEARANCE', 'INITIATED'];
      if (activeExitStatuses.includes(exit.status)) {
        const effectiveLwd = exit.finalLastWorkingDay ? new Date(exit.finalLastWorkingDay) : (exit.lastWorkingDay ? new Date(exit.lastWorkingDay) : null);
        if (effectiveLwd && !isNaN(effectiveLwd.getTime())) {
          const endOfLwd = new Date(effectiveLwd);
          endOfLwd.setHours(23, 59, 59, 999);
          if (new Date() > endOfLwd) {
            await prisma.user.update({ where: { id: user.id }, data: { isActive: false, status: 'Terminated' } });
            await prisma.employeeProfile.update({ where: { id: employeeProfile.id }, data: { lifecycleStatus: 'TERMINATED' } });
            await prisma.exitLifecycle.update({ where: { id: exit.id }, data: { status: 'EMPLOYEE_RELIEVED' } });
            return res.status(401).json({
              success: false,
              error: { code: 'EMPLOYMENT_ENDED', message: 'Your employment tenure has concluded and your account is deactivated as per scheduled termination.' }
            });
          }
        }
      } else if (exit.status === 'EMPLOYEE_RELIEVED' || exit.status === 'COMPLETED') {
        if (user.isActive) {
          await prisma.user.update({ where: { id: user.id }, data: { isActive: false, status: 'Terminated' } });
        }
        if (employeeProfile.lifecycleStatus !== 'TERMINATED') {
          await prisma.employeeProfile.update({ where: { id: employeeProfile.id }, data: { lifecycleStatus: 'TERMINATED' } });
        }
        return res.status(401).json({
          success: false,
          error: { code: 'ACCOUNT_RELIEVED', message: 'Your account has been relieved and deactivated.' }
        });
      }
    }`;

if (!content.includes(oldExitBlock)) {
  console.error('Could not find oldExitBlock in authMiddleware.js');
  process.exit(1);
}

content = content.replace(oldExitBlock, newExitBlock);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated authMiddleware.js!');

