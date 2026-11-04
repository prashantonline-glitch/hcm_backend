const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'routes', 'hrRoutes.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

content = content.replace(
  'initiateTermination, getExitsList, updateClearanceStatus, finalizeExit, reviewResignationHr,',
  'initiateTermination, getExitsList, updateClearanceStatus, finalizeExit, reviewResignationHr, triggerScheduledTerminationsSweep,'
);

content = content.replace(
  "router.get('/exits', checkPermission('offboarding_resignations', 'view'), subscriptionGuard('offboarding_exit'), getExitsList);",
  "router.get('/exits', checkPermission('offboarding_resignations', 'view'), subscriptionGuard('offboarding_exit'), getExitsList);\nrouter.post('/exits/process-scheduled', checkPermission('offboarding_resignations', 'edit'), subscriptionGuard('offboarding_exit'), triggerScheduledTerminationsSweep);"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated hrRoutes.js!');

