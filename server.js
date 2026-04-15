const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Zoho token exchange ──
app.get('/zoho/token', async (req, res) => {
  const { code, client_id, client_secret, redirect_uri, accounts_server } = req.query;
  if (!code || !client_id || !client_secret) {
    return res.status(400).send('Missing required parameters');
  }
  const base = accounts_server || 'https://accounts.zoho.com';
  try {
    const params = new URLSearchParams({
      code, client_id, client_secret,
      redirect_uri: redirect_uri || '',
      grant_type: 'authorization_code'
    });
    const response = await fetch(`${base}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Claude proxy ──
app.post('/api/claude', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  try {
    const payload = {
      model: req.body.model || 'claude-sonnet-4-20250514',
      max_tokens: req.body.max_tokens || 1000,
      messages: req.body.messages,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 1
        }
      ]
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('LeadKit proxy running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));
