const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testOpenAI() {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  console.log('API key length:', apiKey.length);
  console.log('API key starts with:', apiKey.substring(0, 15));
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testOpenAI();
