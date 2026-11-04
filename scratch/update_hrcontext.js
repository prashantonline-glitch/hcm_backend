const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', 'hcm_frontend', 'src', 'context', 'HRContext.jsx');
let raw = fs.readFileSync(filePath, 'utf8');
let content = raw.replace(/\r\n/g, '\n');

const oldCode = `  const initiateTermination = async (data) => {
    try {
      await hrAPI.initiateTermination(data);
      showToast('Exit clearance initiated successfully!');
      await fetchExits();
      await fetchEmployees();
      return { success: true };
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Failed to initiate exit clearance';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };`;

const newCode = `  const initiateTermination = async (data) => {
    try {
      const res = await hrAPI.initiateTermination(data);
      const msg = res.data?.message || 'Scheduled termination initiated successfully!';
      showToast(msg);
      await fetchExits();
      await fetchEmployees();
      return { success: true, data: res.data };
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error?.message || 'Failed to initiate exit clearance';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };`;

if (!content.includes(oldCode)) {
  console.error('Could not find oldCode in HRContext.jsx');
  process.exit(1);
}

content = content.replace(oldCode, newCode);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated HRContext.jsx!');

