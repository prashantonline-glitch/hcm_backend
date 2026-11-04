const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'copilotController.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

content = content.replace(
  '  return context;\n}\n\n// ═══════════════════════════════════════════════════════════════════\n// 5. DETERMINISTIC',
  '  } catch (err) {\n    console.warn("[CopilotController] getRoleGatedDatabaseContext error:", err.message);\n  }\n  return context;\n}\n\n// ═══════════════════════════════════════════════════════════════════\n// 5. DETERMINISTIC'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed syntax cleanly!');

