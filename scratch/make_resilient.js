const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'controllers', 'copilotController.js');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

// Wrap getRoleGatedDatabaseContext body in try/catch
const oldContextFunc = `async function getRoleGatedDatabaseContext({ userId, role, organizationId, intent }) {
  const context = {
    verifiedAt: new Date().toISOString(),
    role
  };

  // 1. Fetch User Record
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organization: true }
  });

  if (!user) return context;`;

const newContextFunc = `async function getRoleGatedDatabaseContext({ userId, role, organizationId, intent }) {
  const context = {
    verifiedAt: new Date().toISOString(),
    role
  };

  try {
    // 1. Fetch User Record
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    }).catch(err => {
      console.warn('[CopilotController] user.findUnique error:', err.message);
      return null;
    });

    if (!user) return context;`;

content = content.replace(oldContextFunc, newContextFunc);

// Add closing try/catch at the end of getRoleGatedDatabaseContext
const oldContextEnd = `  return context;
}

// ═══════════════════════════════════════════════════════════════════
// 5. CONTEXTUAL DETERMINISTIC FALLBACK ENGINE`;

const newContextEnd = `  } catch (err) {
    console.warn('[CopilotController] getRoleGatedDatabaseContext error:', err.message);
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════════
// 5. CONTEXTUAL DETERMINISTIC FALLBACK ENGINE`;

content = content.replace(oldContextEnd, newContextEnd);

// In handleCopilotChat, wrap getRoleGatedDatabaseContext call safely
const oldCallContext = `    // ── STEP 4: Query Verified Database Data ──
    const verifiedData = await getRoleGatedDatabaseContext({
      userId,
      role,
      organizationId,
      intent
    });`;

const newCallContext = `    // ── STEP 4: Query Verified Database Data ──
    let verifiedData = { role, verifiedAt: new Date().toISOString() };
    try {
      verifiedData = await getRoleGatedDatabaseContext({
        userId,
        role,
        organizationId,
        intent
      });
    } catch (dbErr) {
      console.warn('[CopilotController] Error fetching verified data:', dbErr.message);
    }`;

content = content.replace(oldCallContext, newCallContext);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully made database context extraction resilient!');

