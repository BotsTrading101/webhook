require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { startWebhookServer } = require('./src/tradeBot'); // Import your tradeBot logic

const app = express();
app.use(express.json()); // For parsing incoming JSON requests

// Start the webhook server to listen for trading signals
startWebhookServer(app);

// Set up the port for the server to listen on
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
