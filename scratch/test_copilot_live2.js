require('dotenv').config();

async function testWithData() {
  const systemPrompt = `You are HCM.ai Copilot, an enterprise Human Capital Management assistant.
Always use information provided in the verified system context.
CURRENT AUTHENTICATED CONTEXT:
- Authenticated User: Trest Admin (Role: ADMIN)
- Organization: Trest Enterprise
- Organization Metrics:
  Total Headcount: 24 employees
  Active Employees: 23
  On Notice / Relieving: 1
  Configured Departments: 4 (Engineering: 12, Sales: 6, Operations: 4, HR: 2)
`;

  const messages = [
    { role: 'user', content: 'can you tell me the no. of employees ?' }
  ];

  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.2
    })
  });

  const data = await res.json();
  console.log('OpenAI Answer:\n', data.choices[0].message.content);
}

testWithData().catch(console.error);
