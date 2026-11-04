const prisma = require('../config/prisma');
const { sendEmail } = require('../utils/emailService');
const { createNotification } = require('../utils/notificationHelper');

/**
 * Format date into human-readable string (e.g., "Friday, November 28, 2026")
 */
const formatDisplayDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Build corporate HTML email for employee termination notice
 */
const buildEmployeeTerminationEmail = ({
  employeeName,
  employeeId,
  designation,
  departmentName,
  organizationName,
  lastWorkingDayFormatted,
  isImmediate,
  reason
}) => {
  const company = organizationName || 'HCM Cloud Enterprise';
  const effectiveNotice = isImmediate ? 'Immediate Departure' : `Effective ${lastWorkingDayFormatted}`;
  const noticeTitle = isImmediate ? 'Notice of Employment Termination' : 'Notice of Scheduled Employment Termination';
  const noticeColor = isImmediate ? '#dc2626' : '#d97706';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${noticeTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px; text-align: left; }
    .header h1 { margin: 0; font-size: 22px; color: #ffffff; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; font-weight: 500; }
    .content { padding: 32px 36px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${noticeColor}15; color: ${noticeColor}; border: 1px solid ${noticeColor}30; margin-bottom: 20px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .info-table td { padding: 12px 18px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .info-table tr:last-child td { border-bottom: none; }
    .info-label { font-weight: 600; color: #64748b; width: 38%; }
    .info-value { font-weight: 600; color: #0f172a; }
    .steps-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .steps-box h3 { margin: 0 0 12px; font-size: 14px; color: #1e40af; font-weight: 700; }
    .steps-box ul { margin: 0; padding-left: 20px; }
    .steps-box li { font-size: 13px; color: #1e3a8a; line-height: 1.6; margin-bottom: 6px; }
    .footer { padding: 24px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${company}</h1>
      <p>Human Resources Department • Official Notice</p>
    </div>
    <div class="content">
      <div class="badge">${effectiveNotice}</div>
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">${noticeTitle}</h2>
      
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        Dear <strong>${employeeName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        ${isImmediate 
          ? `This communication serves as official notification that your employment with <strong>${company}</strong> has been concluded, effective immediately.`
          : `This communication serves as official notification that your employment with <strong>${company}</strong> is scheduled for termination, with your official last working day established below.`
        }
      </p>

      <table class="info-table">
        <tr>
          <td class="info-label">Employee Name</td>
          <td class="info-value">${employeeName}</td>
        </tr>
        <tr>
          <td class="info-label">Employee ID</td>
          <td class="info-value">${employeeId || 'N/A'}</td>
        </tr>
        <tr>
          <td class="info-label">Department & Role</td>
          <td class="info-value">${departmentName || 'General'}${designation ? ` • ${designation}` : ''}</td>
        </tr>
        <tr>
          <td class="info-label">Last Working Day (LWD)</td>
          <td class="info-value" style="color: ${noticeColor}; font-weight: 700;">${lastWorkingDayFormatted}</td>
        </tr>
        ${reason ? `
        <tr>
          <td class="info-label">Clearance Notes / Reason</td>
          <td class="info-value">${reason}</td>
        </tr>` : ''}
      </table>

      <div class="steps-box">
        <h3>Offboarding & Clearance Formalities:</h3>
        <ul>
          <li><strong>Handover:</strong> Please liaise with your manager to complete knowledge transfer and project transitions prior to your last working day.</li>
          <li><strong>Asset Return:</strong> All company equipment (laptop, monitors, security badges, access cards, and company documents) must be handed over to the IT & Operations team.</li>
          <li><strong>Full & Final Settlement (F&F):</strong> Your final payroll, leave encashment, and relieving documentation will be processed in accordance with organizational policies following clearance completion.</li>
          <li><strong>System Access:</strong> Account access will automatically conclude at 23:59 on your last working day.</li>
        </ul>
      </div>

      <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin-top: 24px;">
        Should you have any questions regarding your offboarding formalities, insurance, or settlement timelines, please reach out to the HR Helpdesk.
      </p>
      
      <p style="font-size: 13px; color: #334155; margin-top: 24px; font-weight: 600;">
        Sincerely,<br/>
        Human Resources Department<br/>
        <span style="font-weight: normal; color: #64748b;">${company}</span>
      </p>
    </div>
    <div class="footer">
      This is an automated operational notification generated by ${company} HCM Portal.
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Build manager advisory HTML email
 */
const buildManagerTerminationEmail = ({
  managerName,
  employeeName,
  employeeId,
  departmentName,
  organizationName,
  lastWorkingDayFormatted,
  reason
}) => {
  const company = organizationName || 'HCM Cloud Enterprise';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>HR Advisory: Employee Departure Scheduled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1e293b; padding: 24px 32px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; color: #ffffff; }
    .content { padding: 28px 32px; font-size: 14px; line-height: 1.6; color: #334155; }
    .info-card { background: #f1f5f9; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>HR Notice: Team Member Scheduled Departure</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${managerName || 'Manager'}</strong>,</p>
      <p>This is to inform you that an offboarding/termination schedule has been initiated for a member of your team:</p>
      
      <div class="info-card">
        <div><strong>Employee:</strong> ${employeeName} (${employeeId || 'No ID'})</div>
        <div><strong>Department:</strong> ${departmentName || 'General'}</div>
        <div><strong>Last Working Day:</strong> <span style="color: #dc2626; font-weight: bold;">${lastWorkingDayFormatted}</span></div>
        ${reason ? `<div><strong>Notes:</strong> ${reason}</div>` : ''}
      </div>

      <p><strong>Next Steps for Department Handover:</strong></p>
      <ul>
        <li>Schedule handover sessions and allocate ongoing deliverables among team members.</li>
        <li>Review repository permissions, documents, and credentials owned by the employee.</li>
        <li>Complete managerial clearance signoff in the HCM Exit & Clearance Center once handover is verified.</li>
      </ul>

      <p style="margin-top: 24px; color: #64748b;">
        Best regards,<br/>
        <strong>Human Resources Department</strong><br/>
        ${company}
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Schedule or immediately execute an employee termination
 */
const scheduleOrExecuteTermination = async ({
  employeeId,
  lastWorkingDay,
  reason,
  exitType = 'TERMINATION',
  sendNoticeEmail = true,
  notifyManager = true,
  comments = '',
  actorUserId = null
}) => {
  if (!employeeId || !lastWorkingDay) {
    throw new Error('Employee ID and Last Working Day are required.');
  }

  // 1. Fetch employee profile with all associated metadata
  const emp = await prisma.employeeProfile.findFirst({
    where: {
      OR: [
        { id: employeeId },
        { userId: employeeId }
      ]
    },
    include: {
      user: true,
      department: true,
      organization: true,
      manager: {
        include: {
          user: true
        }
      }
    }
  });

  if (!emp) {
    throw new Error('Employee profile not found.');
  }

  // 2. Check for active exit records
  const existingExit = await prisma.exitLifecycle.findFirst({
    where: {
      employeeId: emp.id,
      status: { in: ['INITIATED', 'CLEARANCE_IN_PROGRESS', 'APPROVED', 'PENDING_HR_APPROVAL', 'PENDING_MANAGER_APPROVAL'] }
    }
  });

  if (existingExit) {
    throw new Error('An active exit lifecycle is already in progress for this employee.');
  }

  // 3. Determine if scheduled date is immediate or future
  const scheduledDate = new Date(lastWorkingDay);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid Last Working Day date format.');
  }

  const endOfScheduledDay = new Date(scheduledDate);
  endOfScheduledDay.setHours(23, 59, 59, 999);
  const now = new Date();
  const isImmediate = endOfScheduledDay <= now;

  const targetExitStatus = isImmediate ? 'EMPLOYEE_RELIEVED' : 'INITIATED';
  const targetLifecycleStatus = isImmediate ? 'TERMINATED' : 'ON_NOTICE';

  // 4. Create ExitLifecycle record
  const exit = await prisma.exitLifecycle.create({
    data: {
      employeeId: emp.id,
      exitType: exitType || 'TERMINATION',
      status: targetExitStatus,
      lastWorkingDay: scheduledDate,
      finalLastWorkingDay: scheduledDate,
      reason: reason || 'Scheduled termination initiated by HR.',
      hrId: actorUserId,
      hrComment: comments || reason || 'Scheduled termination initiated.',
      hrDecisionDate: now
    }
  });

  // 5. Update EmployeeProfile lifecycleStatus
  await prisma.employeeProfile.update({
    where: { id: emp.id },
    data: {
      lifecycleStatus: targetLifecycleStatus
    }
  });

  // 6. If immediate, deactivate user account immediately
  if (isImmediate) {
    await prisma.user.update({
      where: { id: emp.userId },
      data: {
        isActive: false,
        status: 'Terminated'
      }
    });
  }

  const formattedLwd = formatDisplayDate(scheduledDate);
  const employeeDisplayName = emp.fullName || emp.user?.name || 'Employee';
  const orgName = emp.organization?.name || 'HCM Cloud Enterprise';

  // 7. Create In-App Notification for employee
  try {
    await createNotification({
      userId: emp.userId,
      title: isImmediate ? 'Employment Concluded' : 'Scheduled Termination Notice',
      message: isImmediate
        ? `Your employment has concluded effective immediately (${formattedLwd}). Please review your email for handover and final settlement formalities.`
        : `An employment termination notice has been scheduled with last working day on ${formattedLwd}. Please review your email for offboarding details.`,
      type: 'ALERT',
      link: '/employee/profile'
    });
  } catch (notifErr) {
    console.warn('[TerminationService] Failed to create in-app notification for employee:', notifErr.message);
  }

  // 8. Send Automatic Email to Employee
  let emailDispatched = false;
  if (sendNoticeEmail && emp.user?.email) {
    try {
      const emailHtml = buildEmployeeTerminationEmail({
        employeeName: employeeDisplayName,
        employeeId: emp.employeeId,
        designation: emp.designation,
        departmentName: emp.department?.name,
        organizationName: orgName,
        lastWorkingDayFormatted: formattedLwd,
        isImmediate,
        reason
      });

      const subject = isImmediate
        ? `Official Notice: Employment Termination - ${orgName}`
        : `Official Notice: Scheduled Employment Termination (${formattedLwd}) - ${orgName}`;

      const sendResult = await sendEmail({
        to: emp.user.email,
        subject,
        html: emailHtml,
        text: `Dear ${employeeDisplayName},\n\nThis is official notification that your employment with ${orgName} has been ${isImmediate ? 'concluded immediately' : 'scheduled for termination with Last Working Day set to ' + formattedLwd}.\n\nReason/Notes: ${reason || 'N/A'}\n\nPlease complete handover and return company assets before departure.\n\nHuman Resources Department\n${orgName}`
      });

      emailDispatched = !!sendResult?.success;
      console.log(`[TerminationService] Termination notice email sent to employee "${emp.user.email}": ${emailDispatched}`);
    } catch (emailErr) {
      console.error('[TerminationService] Error sending termination email to employee:', emailErr.message);
    }
  }

  // 9. Send Automatic Advisory Email to Manager (if requested and exists)
  if (notifyManager && emp.manager?.user?.email) {
    try {
      const managerEmailHtml = buildManagerTerminationEmail({
        managerName: emp.manager.fullName || emp.manager.user.name,
        employeeName: employeeDisplayName,
        employeeId: emp.employeeId,
        departmentName: emp.department?.name,
        organizationName: orgName,
        lastWorkingDayFormatted: formattedLwd,
        reason
      });

      await sendEmail({
        to: emp.manager.user.email,
        subject: `HR Advisory: Scheduled Offboarding for ${employeeDisplayName}`,
        html: managerEmailHtml,
        text: `Hello,\n\nPlease be advised that offboarding has been scheduled for ${employeeDisplayName} (${emp.employeeId || 'No ID'}) with last working day ${formattedLwd}.\n\nPlease coordinate knowledge transfer and handover formalities.`
      });

      // Manager in-app notification
      await createNotification({
        userId: emp.manager.userId,
        title: 'Team Offboarding Advisory',
        message: `Offboarding for ${employeeDisplayName} has been scheduled. Last working day: ${formattedLwd}.`,
        type: 'WARNING',
        link: '/manager/team'
      });
    } catch (mgrEmailErr) {
      console.error('[TerminationService] Error sending manager advisory email:', mgrEmailErr.message);
    }
  }

  return {
    success: true,
    exit,
    isImmediate,
    emailDispatched,
    scheduledDate: scheduledDate.toISOString(),
    formattedLwd,
    message: isImmediate
      ? `Employee terminated immediately. Account deactivated and notice email dispatched to ${emp.user?.email || 'employee'}.`
      : `Termination scheduled for ${formattedLwd}. Notice email dispatched to ${emp.user?.email || 'employee'}.`
  };
};

/**
 * Sweeper engine that processes all scheduled exits whose lastWorkingDay has arrived or passed
 */
const processScheduledTerminations = async () => {
  try {
    const now = new Date();

    // Query exits in pending/active status where last working day has arrived or passed
    const overdueExits = await prisma.exitLifecycle.findMany({
      where: {
        status: { in: ['INITIATED', 'APPROVED', 'CLEARANCE_IN_PROGRESS', 'PENDING_CLEARANCE'] },
        OR: [
          { finalLastWorkingDay: { lte: now } },
          {
            AND: [
              { finalLastWorkingDay: null },
              { lastWorkingDay: { lte: now } }
            ]
          }
        ]
      },
      include: {
        employee: {
          include: {
            user: true,
            organization: true
          }
        }
      }
    });

    if (!overdueExits || overdueExits.length === 0) {
      return { processedCount: 0 };
    }

    let processedCount = 0;

    for (const exit of overdueExits) {
      try {
        const emp = exit.employee;
        if (!emp) continue;

        // 1. Deactivate user login
        if (emp.userId) {
          await prisma.user.update({
            where: { id: emp.userId },
            data: {
              isActive: false,
              status: 'Terminated'
            }
          });
        }

        // 2. Set employee profile lifecycleStatus to TERMINATED
        await prisma.employeeProfile.update({
          where: { id: emp.id },
          data: {
            lifecycleStatus: 'TERMINATED'
          }
        });

        // 3. Mark exit record as EMPLOYEE_RELIEVED
        await prisma.exitLifecycle.update({
          where: { id: exit.id },
          data: {
            status: 'EMPLOYEE_RELIEVED'
          }
        });

        processedCount++;
        console.log(`[AutoTermination] Scheduled termination executed for: ${emp.fullName || emp.employeeId} (${emp.user?.email || 'No email'}). User deactivated.`);

        // 4. Send conclusion in-app notification
        if (emp.userId) {
          await createNotification({
            userId: emp.userId,
            title: 'Employment Concluded',
            message: `Your employment tenure has concluded as of today. Your account is now relieved. Thank you for your service.`,
            type: 'INFO',
            link: '/employee/profile'
          });
        }

      } catch (itemErr) {
        console.error(`[AutoTermination] Error processing exit ID ${exit.id}:`, itemErr.message);
      }
    }

    return { processedCount };
  } catch (err) {
    console.error('[AutoTermination] Error executing processScheduledTerminations:', err.message);
    return { processedCount: 0, error: err.message };
  }
};

/**
 * Start background periodic checker
 */
let schedulerIntervalId = null;

const initTerminationScheduler = (intervalMinutes = 30) => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
  }

  // Run initial check after server warms up (5 seconds)
  setTimeout(() => {
    processScheduledTerminations().then(res => {
      if (res?.processedCount > 0) {
        console.log(`[TerminationScheduler] Startup check processed ${res.processedCount} scheduled terminations.`);
      }
    }).catch(err => {
      console.error('[TerminationScheduler] Startup check failed:', err.message);
    });
  }, 5000);

  // Set periodic execution
  const intervalMs = intervalMinutes * 60 * 1000;
  schedulerIntervalId = setInterval(() => {
    processScheduledTerminations().then(res => {
      if (res?.processedCount > 0) {
        console.log(`[TerminationScheduler] Periodic sweep processed ${res.processedCount} scheduled terminations.`);
      }
    }).catch(err => {
      console.error('[TerminationScheduler] Periodic sweep error:', err.message);
    });
  }, intervalMs);

  console.log(`[TerminationScheduler] Scheduled termination auto-sweep initialized (Interval: ${intervalMinutes} min).`);
};

module.exports = {
  scheduleOrExecuteTermination,
  processScheduledTerminations,
  initTerminationScheduler,
  buildEmployeeTerminationEmail,
  buildManagerTerminationEmail
};

