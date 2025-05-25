const axios = require('axios');
const { RestClientV5 } = require('bybit-api');
require('dotenv').config(); // Load environment variables from .env file
API_KEY="MU0NzksYkLqh5k9sat";
API_SECRET="VqvoyIra9g1pTjQxSJg9UatbDBEvAGYptH7y";
// Initialize Bybit client with API keys from the environment variables
const client = new RestClientV5({
  key: API_KEY,
  secret: API_SECRET,
  demoTrading: true, // Use testnet for demo trading
  demoTradingUrl: 'https://api-demo.bybit.com', // Bybit demo API URL
});

// Send a message to Telegram
async function sendToTelegram(message) {
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
    });
    console.log('Message sent to Telegram');
  } catch (error) {
    console.error('Error sending message to Telegram:', error);
  }
}

// Function to start the webhook server and handle incoming trade signals
function startWebhookServer(app) {
  app.post('/webhook', async (req, res) => {
    const { symbol, side, entryPrice, tp1, tp2, tp3, sl } = req.body;

    // Log incoming data for debugging
    console.log('Received webhook:', req.body);

    try {
      // Step 1: Place order
      const orderRes = await client.submitOrder({
        category: 'linear',
        symbol,
        side: side.toUpperCase(),
        orderType: 'Market',
        qty: '0.01', // Example quantity
        timeInForce: 'GoodTillCancel',
      });

      const orderId = orderRes.result.orderId;
      console.log(`Order placed with ID: ${orderId}`);

      // Step 2: Confirm order fill (wait until position is filled)
      let positionFilled = false;
      let positionSize = 0;


while (!positionFilled) {
  const res = await client.getPositionInfo({
    category: 'linear',
    symbol: 'BTCUSDT'
  });

  const position = res.result.list[0];
  const size = position ? parseFloat(position.size) : 0;

  if (size > 0) {
    positionFilled = true;
    console.log('✅ Position is open (order filled)');
  } else {
    console.log('⏳ Waiting for position to open...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
  }
}
      // Step 3: Track TP and SL levels
      await trackTakeProfit(symbol, side, entryPrice, tp1, tp2, tp3, sl);

      res.status(200).send('Trade processed successfully.');
    } catch (error) {
      console.error('Error processing trade:', error);
      await sendToTelegram('Error processing trade: ' + error.message);
      res.status(500).send('Error processing trade.');
    }
  });



  app.post('/demo', async (req, res) => {
  const testPayload = {
    symbol: 'BTCUSDT',
    side: 'buy',  // 'buy' or 'sell'
    entryPrice: 10000,  // Example entry price
    tp1: 101000,  // Example TP1 price
    tp2: 102000,  // Example TP2 price
    tp3: 103000,  // Example TP3 price
    sl: 990000,  // Example SL price
  };

  try {
    console.log('✅ Test webhook triggered');
    await app._router.handle({ body: testPayload, method: 'POST' }, res);
    res.status(200).send('Test completed successfully.');
  } catch (err) {
    console.error('❌ Test Error:', err);
    res.status(500).send('Error during test execution');
  }
});


  app.get('/test', async (req, res) => {

  try {
    console.log('✅ Test webhook triggered');
  const testPayload = JSON.stringify({  symbol: 'BTCUSDT',
    side: 'buy',  // 'buy' or 'sell'
    entryPrice: 10000,  // Example entry price
    tp1: 101000,  // Example TP1 price
    tp2: 102000,  // Example TP2 price
    tp3: 103000,  // Example TP3 price
    sl: 990000 });

    res.status(200).send('Test completed successfully'+testPayload);
  } catch (err) {
    console.error('❌ Test Error:', err);
    res.status(500).send('Error during test execution');
  }
});
}

// Track Take Profit and Stop Loss
async function trackTakeProfit(symbol, side, entryPrice, tp1, tp2, tp3, sl) {
  let tpReached = false;

  while (!tpReached) {
    const positionRes = await client.getPositionInfo({ symbol, category: 'linear' });
    const position = positionRes.result[0];

    if (position && position.size > 0) {
      const currentPrice = parseFloat(position.entryPrice);

      if (side === 'buy') {
        if (currentPrice >= tp1) {
          await closePosition(symbol, '0.01', 'sell'); // Close position at TP1
          await sendToTelegram(`TP1 Hit: ${entryPrice} -> ${tp1}`);
          tpReached = true;
        } else if (currentPrice >= tp2) {
          await closePosition(symbol, '0.01', 'sell');
          await sendToTelegram(`TP2 Hit: ${entryPrice} -> ${tp2}`);
          tpReached = true;
        } else if (currentPrice >= tp3) {
          await closePosition(symbol, '0.01', 'sell');
          await sendToTelegram(`TP3 Hit: ${entryPrice} -> ${tp3}`);
          tpReached = true;
        } else if (currentPrice <= sl) {
          await closePosition(symbol, '0.01', 'sell');
          await sendToTelegram(`SL Hit: ${entryPrice} -> ${sl}`);
          tpReached = true;
        }
      } else if (side === 'sell') {
        // Handle short position similarly

         if (currentPrice <= tp1) {
          await closePosition(symbol, '0.01', 'buy'); // Close position at TP1
          await sendToTelegram(`TP1 Hit: ${entryPrice} -> ${tp1}`);
          tpReached = true;
        } else if (currentPrice <= tp2) {
          await closePosition(symbol, '0.01', 'buy');
          await sendToTelegram(`TP2 Hit: ${entryPrice} -> ${tp2}`);
          tpReached = true;
        } else if (currentPrice <= tp3) {
          await closePosition(symbol, '0.01', 'buy');
          await sendToTelegram(`TP3 Hit: ${entryPrice} -> ${tp3}`);
          tpReached = true;
        } else if (currentPrice >= sl) {
          await closePosition(symbol, '0.01', 'buy');
          await sendToTelegram(`SL Hit: ${entryPrice} -> ${sl}`);
          tpReached = true;
        }
      
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait before checking again
  }
}

// Close position
async function closePosition(symbol, qty, side) {
  await client.submitOrder({
    category: 'linear',
    symbol,
    side: side === 'buy' ? 'Sell' : 'Buy',
    orderType: 'Market',
    qty,
    timeInForce: 'GoodTillCancel',
    reduceOnly: true,
  });
}

module.exports = { startWebhookServer };
