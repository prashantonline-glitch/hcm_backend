const {
  detectPrimaryIntent,
  generateContextualFallback
} = require('../src/controllers/copilotController');

console.log('Testing detectPrimaryIntent...');

const testCases = [
  { q: 'can you tell me the no. of employees ?', expected: 'EMPLOYEE_COUNT' },
  { q: 'how many employees are in our company?', expected: 'EMPLOYEE_COUNT' },
  { q: 'total employees', expected: 'EMPLOYEE_COUNT' },
  { q: 'headcount metrics', expected: 'EMPLOYEE_COUNT' },
  { q: 'what is our staff count?', expected: 'EMPLOYEE_COUNT' },
  { q: 'hello', expected: 'GREETING' },
  { q: 'hi copilot', expected: 'GREETING' },
  { q: 'how many departments do we have?', expected: 'DEPARTMENTS' },
  { q: 'what is my leave balance?', expected: 'LEAVE_BALANCE' },
  { q: 'what is today date?', expected: 'DATE_TIME' }
];

let allPassed = true;
for (const tc of testCases) {
  const detected = detectPrimaryIntent(tc.q);
  const ok = detected === tc.expected;
  if (!ok) allPassed = false;
  console.log(`${ok ? '✅' : '❌'} Query: "${tc.q}" -> Detected: ${detected} (Expected: ${tc.expected})`);
}

if (!allPassed) {
  console.error('Some intent tests failed!');
  process.exit(1);
}

console.log('\nTesting generateContextualFallback for EMPLOYEE_COUNT...');
const fallback = generateContextualFallback({
  intent: 'EMPLOYEE_COUNT',
  verifiedData: {
    organizationMetrics: {
      totalHeadcount: 15,
      activeHeadcount: 14,
      onNoticeCount: 1,
      totalDepartments: 3,
      departments: [
        { name: 'Engineering', employeeCount: 8 },
        { name: 'Sales', employeeCount: 4 },
        { name: 'Human Resources', employeeCount: 2 }
      ],
      recentEmployees: [
        { name: 'Rahul Sharma', code: 'EMP-001', department: 'Engineering', role: 'Lead Developer' }
      ]
    }
  },
  user: { name: 'Admin', role: 'ADMIN' },
  systemContext: { formattedDate: 'Friday, October 30, 2026', formattedTime: '07:15 PM' },
  pageContext: '/admin/dashboard'
});

console.log('Fallback answer:\n', fallback.answer);
console.log('Fallback actions:\n', fallback.actions);

if (!fallback.answer.includes('14 active employees') || !fallback.answer.includes('Engineering')) {
  console.error('Fallback answer check failed!');
  process.exit(1);
}

console.log('🎉 All Copilot test assertions passed!');

