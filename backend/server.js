const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/webhook', (req, res) => {
  console.log('Received webhook payload:', JSON.stringify(req.body, null, 2));
  // OpenWA and CRM integration logic goes here
  res.status(200).send('Webhook received');
});

app.listen(PORT, () => {
  console.log(`Backend API server running on http://localhost:${PORT}`);
});
