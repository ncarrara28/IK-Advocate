const https = require('https');

module.exports = async function(context, req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    context.res = {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured in Azure App Settings.' })
    };
    return;
  }

  const { messages, system } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    context.res = {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Request body must include a non-empty messages array.' })
    };
    return;
  }

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: system || '',
    messages
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      const httpReq = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      httpReq.on('error', reject);
      httpReq.write(payload);
      httpReq.end();
    });

    context.res = {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
      body: result.body
    };
  } catch (err) {
    context.res = {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to reach Anthropic API: ' + err.message })
    };
  }
};
