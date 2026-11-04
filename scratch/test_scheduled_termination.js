const {
  buildEmployeeTerminationEmail,
  buildManagerTerminationEmail,
  processScheduledTerminations
} = require('../src/services/terminationService');

async function runTest() {
  console.log('Testing Email Template Generation...');

  const sampleEmployeeEmail = buildEmployeeTerminationEmail({
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-007',
    designation: 'Senior Full Stack Engineer',
    departmentName: 'Engineering',
    organizationName: 'Acme Technologies Pvt Ltd',
    lastWorkingDayFormatted: 'Friday, November 28, 2026',
    isImmediate: false,
    reason: 'Restructuring and organizational realignment.'
  });

  if (!sampleEmployeeEmail.includes('Notice of Scheduled Employment Termination') ||
      !sampleEmployeeEmail.includes('Friday, November 28, 2026') ||
      !sampleEmployeeEmail.includes('EMP-007')) {
    throw new Error('Employee email template failed content checks!');
  }
  console.log('✅ Employee email template generated correctly.');

  const sampleImmediateEmail = buildEmployeeTerminationEmail({
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-007',
    designation: 'Senior Full Stack Engineer',
    departmentName: 'Engineering',
    organizationName: 'Acme Technologies Pvt Ltd',
    lastWorkingDayFormatted: 'Friday, October 30, 2026',
    isImmediate: true,
    reason: 'Policy non-compliance.'
  });

  if (!sampleImmediateEmail.includes('Immediate Departure') ||
      !sampleImmediateEmail.includes('Notice of Employment Termination')) {
    throw new Error('Immediate termination email template failed content checks!');
  }
  console.log('✅ Immediate termination email template generated correctly.');

  const sampleManagerEmail = buildManagerTerminationEmail({
    managerName: 'Priya Verma',
    employeeName: 'Rahul Sharma',
    employeeId: 'EMP-007',
    departmentName: 'Engineering',
    organizationName: 'Acme Technologies Pvt Ltd',
    lastWorkingDayFormatted: 'Friday, November 28, 2026',
    reason: 'Restructuring'
  });

  if (!sampleManagerEmail.includes('Team Member Scheduled Departure') ||
      !sampleManagerEmail.includes('Rahul Sharma')) {
    throw new Error('Manager email template failed content checks!');
  }
  console.log('✅ Manager advisory email template generated correctly.');

  console.log('Testing processScheduledTerminations sweeper function...');
  const sweeperResult = await processScheduledTerminations();
  console.log('Sweeper executed cleanly. Result:', sweeperResult);

  console.log('🎉 All automated tests passed successfully!');
}

runTest().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

