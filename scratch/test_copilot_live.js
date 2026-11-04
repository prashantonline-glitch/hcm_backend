require('dotenv').config();
const { handleCopilotChat } = require('../src/controllers/copilotController');

async function testLiveChat() {
  console.log('Testing handleCopilotChat with question: "can you tell me the no. of employees ?"');

  const req = {
    body: {
      message: 'can you tell me the no. of employees ?',
      pageContext: '/admin/dashboard'
    },
    user: {
      userId: 'test-admin',
      id: 'test-admin',
      role: 'ADMIN',
      email: 'admin@hcm.local'
    }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (payload) => {
      responseData = payload;
      return res;
    }
  };

  const next = (err) => {
    console.error('Next called with error:', err);
  };

  await handleCopilotChat(req, res, next);

  console.log(`Response HTTP Status: ${statusCode}`);
  console.log('Success:', responseData?.success);
  console.log('Answer:\n', responseData?.data?.answer);
  console.log('Is Fallback:', responseData?.data?.isFallback);
  console.log('Actions:', responseData?.data?.actions);
}

testLiveChat().then(() => {
  console.log('Live chat test finished.');
  process.exit(0);
}).catch(err => {
  console.error('Live chat test failed:', err);
  process.exit(1);
});

