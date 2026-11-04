const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'hrController.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

// 1. Add imports if not present
if (!content.includes('terminationService')) {
  content = content.replace(
    "const { handleBase64Field } = require('../services/cloudUploadService');",
    "const { handleBase64Field } = require('../services/cloudUploadService');\nconst { scheduleOrExecuteTermination, processScheduledTerminations } = require('../services/terminationService');"
  );
}

// 2. Replace initiateTermination
const oldInitiateRegex = /\/\/ POST \/api\/hr\/terminate[\s\S]*?return res\.status\(201\)\.json\(\{ success: true, data: exit, message: 'Exit lifecycle initiated successfully\.' \}\);\s*\} catch \(err\) \{ next\(err\); \}\s*\};/;

const newInitiateCode = `// POST /api/hr/terminate (initiate exit/termination with scheduled date and automated email dispatch)
const initiateTermination = async (req, res, next) => {
  try {
    const {
      employeeId,
      reason,
      lastWorkingDay,
      exitType = 'TERMINATION',
      sendNoticeEmail = true,
      notifyManager = true,
      comments
    } = req.body;

    if (!employeeId || !lastWorkingDay) {
      return res.status(400).json({ success: false, error: { message: 'Employee ID and Last Working Day are required.' } });
    }

    const result = await scheduleOrExecuteTermination({
      employeeId,
      lastWorkingDay,
      reason,
      exitType,
      sendNoticeEmail,
      notifyManager,
      comments,
      actorUserId: req.user?.userId || req.user?.id
    });

    return res.status(201).json({
      success: true,
      data: result.exit,
      message: result.message,
      emailDispatched: result.emailDispatched,
      isImmediate: result.isImmediate,
      scheduledDate: result.scheduledDate,
      formattedLwd: result.formattedLwd
    });
  } catch (err) {
    if (err.message && (err.message.includes('already in progress') || err.message.includes('exists'))) {
      return res.status(409).json({ success: false, error: { message: err.message } });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ success: false, error: { message: err.message } });
    }
    next(err);
  }
};`;

if (!oldInitiateRegex.test(content)) {
  console.error('Failed to match old initiateTermination regex!');
  process.exit(1);
}

content = content.replace(oldInitiateRegex, newInitiateCode);

// 3. Update getExitsList to also trigger sweep & return user isActive/status
const oldExitsListRegex = /\/\/ GET \/api\/hr\/exits[\s\S]*?return res\.status\(200\)\.json\(\{ success: true, data: exits \}\);\s*\} catch \(err\) \{ next\(err\); \}\s*\};/;

const newExitsListCode = `// GET /api/hr/exits
const getExitsList = async (req, res, next) => {
  try {
    // Process any overdue scheduled terminations so statuses are fresh
    try {
      await processScheduledTerminations();
    } catch (sweepErr) {
      console.warn('[HRController] Scheduled exits sweep warning:', sweepErr.message);
    }

    const orgId = req.user?.organizationId || req.tenant?.id;
    const whereClause = orgId ? { employee: { organizationId: orgId } } : {};

    const exits = await prisma.exitLifecycle.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            joiningDate: true,
            lifecycleStatus: true,
            department: { select: { name: true } },
            user: { select: { email: true, isActive: true, status: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: exits });
  } catch (err) { next(err); }
};

// POST /api/hr/exits/process-scheduled
const triggerScheduledTerminationsSweep = async (req, res, next) => {
  try {
    const result = await processScheduledTerminations();
    return res.status(200).json({
      success: true,
      message: \`Scheduled terminations sweep completed. \${result.processedCount || 0} records processed.\`,
      data: result
    });
  } catch (err) { next(err); }
};`;

if (!oldExitsListRegex.test(content)) {
  console.error('Failed to match old getExitsList regex!');
  process.exit(1);
}

content = content.replace(oldExitsListRegex, newExitsListCode);

// 4. Update module.exports to export triggerScheduledTerminationsSweep
if (!content.includes('triggerScheduledTerminationsSweep')) {
  console.error('triggerScheduledTerminationsSweep not found in content!');
  process.exit(1);
}

content = content.replace(
  'initiateTermination, getExitsList, updateClearanceStatus, finalizeExit,',
  'initiateTermination, getExitsList, updateClearanceStatus, finalizeExit, triggerScheduledTerminationsSweep,'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated hrController.js!');

