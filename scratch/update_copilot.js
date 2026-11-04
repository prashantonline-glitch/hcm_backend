const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'copilotController.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

// 1. Add callDirectOpenAI helper after getAiServerUrl
const oldAiUrlBlock = `const getAiServerUrl = () => {
  let url = process.env.AI_SERVER_URL || 'https://hcm-ai-server-production.up.railway.app';
  url = url.trim().replace(/\\/+$/, '');
  if (!/^https?:\\/\\//i.test(url)) {
    url = \`https://\${url}\`;
  }
  return url;
};`;

const newAiUrlBlock = `const getAiServerUrl = () => {
  let url = process.env.AI_SERVER_URL || 'http://localhost:4000';
  url = url.trim().replace(/\\/+$/, '');
  if (!/^https?:\\/\\//i.test(url)) {
    url = \`http://\${url}\`;
  }
  return url;
};

/**
 * Direct OpenAI Chat Completion Helper
 * Connects directly to OpenAI API using OPENAI_API_KEY from .env
 */
async function callDirectOpenAI({ systemPrompt, messages, model = 'gpt-4o-mini', timeoutMs = 12000 }) {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('aapka-')) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const formattedMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || model,
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 1000
    }),
    signal: AbortSignal.timeout(timeoutMs)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(\`OpenAI HTTP \${response.status}: \${errorBody.slice(0, 150)}\`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}`;

content = content.replace(oldAiUrlBlock, newAiUrlBlock);

// 2. Replace INTENT_PATTERNS and detectPrimaryIntent
const oldIntentBlockRegex = /\/\/ 2\. INTENT CLASSIFICATION ENGINE[\s\S]*?function detectPrimaryIntent\(message\) \{[\s\S]*?return 'GENERAL';\s*\}/;

const newIntentBlock = `// 2. INTENT CLASSIFICATION ENGINE
const INTENT_PATTERNS = {
  DATE_TIME: [
    'today date', "today's date", 'what date', 'what day', 'current date', 
    'current time', 'what time is it', 'which day', 'what is the date', "what is today"
  ],
  GREETING: [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'who are you', 'what can you do'
  ],
  EMPLOYEE_COUNT: [
    'no. of employees', 'no of employees', 'number of employees', 'how many employees',
    'total employees', 'count of employees', 'employee count', 'headcount', 'head count',
    'staff count', 'how many staff', 'how many members', 'total staff', 'total workforce',
    'active employees', 'who works here', 'list employees', 'show employees', 'all employees',
    'employee list', 'list of employees', 'kitne employee', 'kitne log', 'employee details'
  ],
  DEPARTMENTS: [
    'how many departments', 'dept count', 'total departments', 'department list', 'list departments',
    'all departments', 'which departments', 'show departments', 'our departments'
  ],
  LEAVE_BALANCE: [
    'leave balance', 'how many leaves', 'remaining leave', 'leaves left', 
    'annual leave balance', 'sick leave balance', 'pto balance', 'vacation balance',
    'my leave', 'my leaves', 'leave quota', 'allocated leaves'
  ],
  LEAVE_REQUEST: [
    'apply leave', 'request leave', 'pending leave', 'leave request', 
    'leave status', 'leave history', 'cancel leave', 'who is on leave', 'leaves pending'
  ],
  PAYROLL: [
    'payroll', 'salary', 'ctc', 'gross pay', 'net pay', 'earnings', 
    'increment', 'compensation', 'allowance', 'bonus', 'pay structure'
  ],
  PAYSLIP: [
    'payslip', 'pay slip', 'salary slip', 'latest payslip', 'download payslip', 
    'deduction', 'pf deduction', 'tax deduction'
  ],
  ATTENDANCE: [
    'attendance', 'clock in', 'clock out', 'punch in', 'punch out', 
    'work hours', 'working hours', 'late mark', 'late minutes', 'absent days', 'present days',
    'who is present', 'who is absent'
  ],
  PROFILE: [
    'my profile', 'who am i', 'my designation', 'my department', 'my manager', 
    'joining date', 'employee id', 'contact details', 'emergency contact'
  ],
  PERFORMANCE: [
    'kpi', 'goal', 'performance', 'review', 'appraisal', 'rating', 'feedback', 'target'
  ],
  BENEFITS: [
    'benefit', 'insurance', 'claim', 'medical allowance', 'reimbursement', 'health plan'
  ],
  DOCUMENT: [
    'document', 'vault', 'id proof', 'offer letter', 'contract', 'certificate', 'upload doc'
  ],
  TEAM_ANALYTICS: [
    'my team', 'team attendance', 'team leaves', 'direct reports', 'team kpi', 
    'team performance', 'subordinates', 'team members', 'pending team approvals'
  ],
  RECRUITMENT: [
    'candidate', 'recruitment', 'job post', 'hiring', 'interview', 'applicant', 'pipeline', 'onboarding',
    'open jobs', 'vacancies', 'job openings', 'open positions'
  ],
  CANDIDATE_STATUS: [
    'my application', 'interview schedule', 'application status', 'offer letter candidate'
  ],
  ADMIN_OVERVIEW: [
    'workforce metrics', 'organization summary', 'headcount metrics', 'platform status', 'audit logs', 'backup status'
  ],
  SUPERADMIN_STATS: [
    'platform organization', 'tenant growth', 'system health', 'platform metrics', 'global analytics', 'active tenants'
  ],
  REPORT: [
    'report', 'analytics', 'headcount trend', 'summary trend', 'metrics report', 'export report'
  ],
  POLICY: [
    'policy', 'rule', 'handbook', 'guideline', 'dress code', 'probation period', 
    'notice period', 'work from home policy', 'code of conduct'
  ]
};

function detectPrimaryIntent(message) {
  const lower = message.toLowerCase().trim();

  // Check specific date/time queries first
  if (INTENT_PATTERNS.DATE_TIME.some(kw => lower.includes(kw))) {
    return 'DATE_TIME';
  }

  // Check specific employee count / headcount queries
  if (INTENT_PATTERNS.EMPLOYEE_COUNT.some(kw => lower.includes(kw))) {
    return 'EMPLOYEE_COUNT';
  }

  // Check department queries
  if (INTENT_PATTERNS.DEPARTMENTS.some(kw => lower.includes(kw))) {
    return 'DEPARTMENTS';
  }

  // Check greeting queries (exact match or simple greetings)
  if (['hello', 'hi', 'hey', 'namaste', 'greeting'].includes(lower) || INTENT_PATTERNS.GREETING.some(kw => lower === kw || lower.startsWith(kw + ' '))) {
    return 'GREETING';
  }

  // Check balance before general leave
  if (INTENT_PATTERNS.LEAVE_BALANCE.some(kw => lower.includes(kw))) {
    return 'LEAVE_BALANCE';
  }

  // Check superadmin & admin metrics
  if (INTENT_PATTERNS.SUPERADMIN_STATS.some(kw => lower.includes(kw))) {
    return 'SUPERADMIN_STATS';
  }

  if (INTENT_PATTERNS.ADMIN_OVERVIEW.some(kw => lower.includes(kw))) {
    return 'ADMIN_OVERVIEW';
  }

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return intent;
    }
  }

  return 'GENERAL';
}`;

content = content.replace(oldIntentBlockRegex, newIntentBlock);

// 3. Update getRoleGatedDatabaseContext for HR / ADMIN / SUPERADMIN to include breakdown
const oldAdminQueryBlock = `  // 7. HR / ADMIN ROLE: Org-wide Metrics
  if (['HR', 'ADMIN', 'SUPERADMIN'].includes(role)) {
    if (['RECRUITMENT', 'REPORT', 'TEAM_ANALYTICS', 'ADMIN_OVERVIEW', 'GENERAL'].includes(intent)) {
      const [totalEmployees, activeJobs, pendingLeavesCount, deptCount, pendingCandidateApps, totalPolicies] = await Promise.all([
        prisma.employeeProfile.count(),
        prisma.jobPost.count({ where: { isActive: true } }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        prisma.department.count(),
        prisma.jobApplication.count({ where: { status: 'PENDING' } }).catch(() => 0),
        prisma.policy.count().catch(() => 0)
      ]);

      context.organizationMetrics = {
        totalHeadcount: totalEmployees,
        activeJobOpenings: activeJobs,
        orgPendingLeaves: pendingLeavesCount,
        totalDepartments: deptCount,
        pendingApplications: pendingCandidateApps,
        publishedPolicies: totalPolicies
      };
    }
  }`;

const newAdminQueryBlock = `  // 7. HR / ADMIN ROLE: Org-wide Metrics
  if (['HR', 'ADMIN', 'SUPERADMIN'].includes(role)) {
    if (['RECRUITMENT', 'REPORT', 'TEAM_ANALYTICS', 'ADMIN_OVERVIEW', 'EMPLOYEE_COUNT', 'DEPARTMENTS', 'GENERAL'].includes(intent)) {
      const orgFilter = organizationId ? { organizationId } : {};
      const [
        totalEmployees,
        activeEmployees,
        onNoticeEmployees,
        activeJobs,
        pendingLeavesCount,
        departments,
        recentEmployees,
        pendingLeavesList
      ] = await Promise.all([
        prisma.employeeProfile.count({ where: orgFilter }).catch(() => 0),
        prisma.employeeProfile.count({ where: { ...orgFilter, lifecycleStatus: { notIn: ['TERMINATED', 'RESIGNED'] } } }).catch(() => 0),
        prisma.employeeProfile.count({ where: { ...orgFilter, lifecycleStatus: 'ON_NOTICE' } }).catch(() => 0),
        prisma.jobPost.count({ where: { ...orgFilter, isActive: true } }).catch(() => 0),
        prisma.leaveRequest.count({ where: { status: 'PENDING', ...(organizationId ? { user: { organizationId } } : {}) } }).catch(() => 0),
        prisma.department.findMany({
          where: orgFilter,
          select: { name: true, _count: { select: { employees: true } } }
        }).catch(() => []),
        prisma.employeeProfile.findMany({
          where: orgFilter,
          select: { fullName: true, employeeId: true, designation: true, department: { select: { name: true } }, lifecycleStatus: true },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }).catch(() => []),
        prisma.leaveRequest.findMany({
          where: { status: 'PENDING', ...(organizationId ? { user: { organizationId } } : {}) },
          select: { id: true, leaveType: true, totalDays: true, startDate: true, user: { select: { name: true, email: true } } },
          take: 5
        }).catch(() => [])
      ]);

      context.organizationMetrics = {
        totalHeadcount: totalEmployees,
        activeHeadcount: activeEmployees || totalEmployees,
        onNoticeCount: onNoticeEmployees,
        activeJobOpenings: activeJobs,
        orgPendingLeaves: pendingLeavesCount,
        totalDepartments: departments.length,
        departments: departments.map(d => ({ name: d.name, employeeCount: d._count?.employees || 0 })),
        recentEmployees: recentEmployees.map(e => ({
          name: e.fullName,
          code: e.employeeId,
          role: e.designation,
          department: e.department?.name,
          status: e.lifecycleStatus
        }))
      };

      context.pendingLeavesList = pendingLeavesList.map(l => ({
        id: l.id,
        employeeName: l.user?.name || l.user?.email,
        leaveType: l.leaveType,
        totalDays: l.totalDays,
        startDate: l.startDate ? new Date(l.startDate).toISOString().split('T')[0] : 'N/A'
      }));
    }
  }`;

content = content.replace(oldAdminQueryBlock, newAdminQueryBlock);

// 4. Update generateContextualFallback to handle EMPLOYEE_COUNT, DEPARTMENTS, GREETING, and smart default
const oldFallbackHeader = `function generateContextualFallback({ intent, verifiedData, user, systemContext, pageContext }) {
  const userName = verifiedData.employee?.fullName || user.name || user.email?.split('@')[0] || 'there';

  switch (intent) {
    case 'DATE_TIME':`;

const newFallbackHeader = `function generateContextualFallback({ intent, verifiedData, user, systemContext, pageContext, message = '' }) {
  const userName = verifiedData.employee?.fullName || user.name || user.email?.split('@')[0] || 'there';

  switch (intent) {
    case 'GREETING': {
      return {
        answer: \`Hello **\${userName}**! I am your **HCM.ai Enterprise Copilot**.\\n\\nI am connected to your authenticated account as **\${user.role}** and grounded in real-time verified database records.\\n\\nHere are some things you can ask me:\\n• *"How many employees are in our organization?"*\\n• *"Show department breakdown"\\n• *"How many leave requests are pending?"*\\n• *"Summarize recent attendance logs"\\n• *"What is our current payroll overview?"*\\n\\nHow can I help you today?\`,
        actions: []
      };
    }

    case 'EMPLOYEE_COUNT': {
      const om = verifiedData.organizationMetrics;
      const count = om?.activeHeadcount ?? om?.totalHeadcount ?? 0;
      const totalCount = om?.totalHeadcount ?? count;
      const onNotice = om?.onNoticeCount || 0;
      const depts = om?.departments || [];
      const deptBreakdown = depts
        .map(d => \`• **\${d.name}**: \${d.employeeCount} \${d.employeeCount === 1 ? 'employee' : 'employees'}\`)
        .join('\\n');

      let reply = \`### Organization Headcount & Employee Overview\\n\\n\`;
      reply += \`There are currently **\${count} active \${count === 1 ? 'employee' : 'employees'}** in your organization\`;
      if (depts.length > 0) {
        reply += \` across **\${depts.length} configured departments**\`;
      }
      reply += \`.\\n\\n\`;

      if (onNotice > 0) {
        reply += \`• **Active Staff**: \${count}\\n• **On Notice**: \${onNotice}\\n• **Total Registered**: \${totalCount}\\n\\n\`;
      }

      if (deptBreakdown) {
        reply += \`**Department Distribution:**\\n\${deptBreakdown}\\n\\n\`;
      }

      if (om?.recentEmployees && om.recentEmployees.length > 0) {
        reply += \`**Recent Team Members:**\\n\`;
        om.recentEmployees.slice(0, 5).forEach(e => {
          reply += \`• \${e.name} (\${e.code || 'ID Pending'}) — \${e.department || 'General'}\${e.role ? \` • \${e.role}\` : ''}\\n\`;
        });
        reply += \`\\n\`;
      }

      reply += \`You can view and manage all employee records in the Users directory.\`;

      return {
        answer: reply,
        actions: [
          { label: 'View Employee Directory', route: '/admin/users' },
          { label: 'Manage Departments', route: '/admin/departments' }
        ]
      };
    }

    case 'DEPARTMENTS': {
      const depts = verifiedData.organizationMetrics?.departments || [];
      const deptList = depts.map(d => \`• **\${d.name}**: \${d.employeeCount || 0} employees\`).join('\\n');
      return {
        answer: \`### Organization Departments (\${depts.length})\\n\\n\${deptList || 'No departments configured yet.'}\\n\\nYou can manage department structures and assignments in the Departments panel.\`,
        actions: [
          { label: 'Manage Departments', route: '/admin/departments' }
        ]
      };
    }

    case 'DATE_TIME':`;

content = content.replace(oldFallbackHeader, newFallbackHeader);

// 5. Update default fallback case in generateContextualFallback
const oldDefaultFallback = `    default: {
      return {
        answer: \`Hello **\${userName}**, I am your **HCM.ai Enterprise Copilot**.\\n\\nI am connected to your authenticated account (**\${user.role}**) and can assist you with:\\n• **Leave & Time Off**: Real-time balances, pending requests, allocations\\n• **Payroll & Compensation**: Payslips, allowances, deductions, CTC\\n• **Attendance**: Daily punch logs, shift schedules, overtime\\n• **Organizational Policies**: Handbooks, guidelines, team workflows\\n\\nHow can I help you today?\`,
        actions: []
      };
    }`;

const newDefaultFallback = `    default: {
      const om = verifiedData.organizationMetrics;
      let reply = \`Hello **\${userName}**, here is your real-time organizational snapshot:\\n\\n\`;
      if (om) {
        reply += \`• **Active Headcount**: **\${om.activeHeadcount || om.totalHeadcount || 0}** employees\\n\`;
        reply += \`• **Configured Departments**: **\${om.totalDepartments || 0}** teams\\n\`;
        reply += \`• **Pending Leave Requests**: **\${om.orgPendingLeaves || 0}** awaiting review\\n\`;
        reply += \`• **Active Job Openings**: **\${om.activeJobOpenings || 0}** positions\\n\\n\`;
      }
      reply += \`You can ask me questions about **employee counts**, **department distribution**, **pending leaves**, **attendance**, **compensation**, or **company policies**.\`;
      return {
        answer: reply,
        actions: [
          { label: 'Admin Dashboard', route: '/admin/dashboard' },
          { label: 'Employee Directory', route: '/admin/users' }
        ]
      };
    }`;

content = content.replace(oldDefaultFallback, newDefaultFallback);

// 6. Update handleCopilotChat Step 6 to try Direct OpenAI first
const oldStep6Regex = /\/\/ ── STEP 6: Call AI Server with Fallback Protection ──[\s\S]*?if \(!finalAnswer \|\| typeof finalAnswer !== 'string' \|\| finalAnswer\.trim\(\)\.length === 0\) \{[\s\S]*?isFallback = true;\s*\}/;

const newStep6 = `// ── STEP 6: Call AI Service (OpenAI Direct -> Local AI Server -> Intelligent Fallback) ──
    let finalAnswer = null;
    let fallbackActions = [];
    let isFallback = false;

    // 1. Direct OpenAI API call (Instant, Natural, Multi-turn)
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    if (apiKey && !apiKey.includes('aapka-')) {
      try {
        const directReply = await callDirectOpenAI({
          systemPrompt,
          messages: aiMessages,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          timeoutMs: 10000
        });
        if (directReply && typeof directReply === 'string' && directReply.trim().length > 0) {
          finalAnswer = directReply.trim();
          isFallback = false;
        }
      } catch (openAiErr) {
        console.warn('[CopilotController] Direct OpenAI error:', openAiErr.message);
      }
    }

    // 2. Local / External AI Server fallback (if direct call not available or failed)
    if (!finalAnswer && process.env.AI_SERVER_URL) {
      try {
        const aiResponse = await fetch(\`\${getAiServerUrl()}/api/mcp/chat\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: aiMessages,
            tenantId: organizationId || 'global',
            accessLevel: role,
            systemPrompt
          }),
          signal: AbortSignal.timeout(3000)
        });

        if (aiResponse.ok) {
          const result = await aiResponse.json();
          finalAnswer = result?.data?.reply || result?.reply || result?.data?.answer || result?.answer || null;
        }
      } catch (aiErr) {
        // Silently continue to deterministic DB fallback
      }
    }

    // 3. Deterministic Verified Database Fallback
    if (!finalAnswer || typeof finalAnswer !== 'string' || finalAnswer.trim().length === 0) {
      const fallbackResult = generateContextualFallback({
        intent,
        verifiedData,
        user: userProfileSummary,
        systemContext,
        pageContext: effectivePageContext,
        message
      });
      finalAnswer = fallbackResult.answer;
      fallbackActions = fallbackResult.actions || [];
      isFallback = true;
    }`;

if (!oldStep6Regex.test(content)) {
  console.error('Failed to match old Step 6 regex in copilotController.js!');
  process.exit(1);
}

content = content.replace(oldStep6Regex, newStep6);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated copilotController.js!');

