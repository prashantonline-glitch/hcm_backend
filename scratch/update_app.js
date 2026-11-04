const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

if (!content.includes('initTerminationScheduler')) {
  const target = "  console.log(`✅ HCM Backend Server running on http://0.0.0.0:${PORT}`);";
  const replacement = `  console.log(\`✅ HCM Backend Server running on http://0.0.0.0:\${PORT}\`);\n  // Initialize automated background scheduler for scheduled terminations and exits\n  try {\n    const { initTerminationScheduler } = require('./src/services/terminationService');\n    initTerminationScheduler(30);\n  } catch (schedErr) {\n    console.error('Failed to initialize termination scheduler:', schedErr.message);\n  }`;
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated app.js!');
} else {
  console.log('app.js already contains initTerminationScheduler.');
}

