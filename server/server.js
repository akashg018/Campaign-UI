import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(express.json());

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

const N8N_WEBHOOK_URL = 'https://suryasom.app.n8n.cloud/webhook/61ab0308-5a21-45e2-b9bb-e143245b713e';

// Log middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// Proxy POST to n8n
// Handle OPTIONS pre-flight requests
app.options('/call-webhook', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.post('/call-webhook', async (req, res) => {
  try {
    // Log the complete request details
    console.log('Forwarding request to n8n:', {
      url: N8N_WEBHOOK_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Campaign-UI'
      },
      body: req.body
    });

    // Make the request to n8n
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': req.headers.authorization || '',
        'User-Agent': 'Campaign-UI'
      },
      body: JSON.stringify(req.body)
    });

    // Log detailed response information
    console.log('n8n raw response:', {
      status: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(resp.headers.entries())
    });

    const data = await resp.text();
    let parsedData;
    try {
      parsedData = JSON.parse(data);
      console.log('n8n parsed response:', {
        status: resp.status,
        data: parsedData
      });
    } catch (parseError) {
      console.log('n8n raw response data:', {
        status: resp.status,
        data: data
      });
    }

    res.status(resp.status).send(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send({ error: 'Proxy error', details: err.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

// Test n8n webhook endpoint
app.get('/test-webhook', async (req, res) => {
  try {
    const testData = {
      test: true,
      timestamp: new Date().toISOString()
    };
    
    console.log('Testing n8n webhook with simple payload:', testData);
    
    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const data = await resp.text();
    res.send({
      status: resp.status,
      statusText: resp.statusText,
      headers: Object.fromEntries(resp.headers.entries()),
      data: data
    });
  } catch (error) {
    res.status(500).send({
      error: error.message,
      stack: error.stack
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
