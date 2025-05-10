const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = 80; // Port 80, as required

// Parse JSON bodies
app.use(bodyParser.json());

// Replace with your actual Bitget API credentials
const API_KEY = 'bg_92839cac0f9670749a1e396b0fdf33a4';
const API_SECRET = '0e18812e8f2ecdf105d617ce3ca038344692d357bde6c0b9bb0aaf4621d322cc';
const API_PASSPHRASE = 'MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDQlmpb94++NrhtorNcv43v22KV0BySp/+uzcIltYudSyxSMtOIXa8LyIGRMdOPE2s212qU6/KBT05/jxaDb4CYiM47p3ckmKqIRSaQ22xuaNoDhrABx3a9qslnhE5Th5Pj4TgVvj8exD09Rwi8cD0ZOvSkyMyFpSfCxq5NJcImQAPENAMelT9O1xt6Q1b8YivdXaTaqKNE8Xd6FArbpOQcHLjwcopGmcNWaE8tRdrFdOT8ryzWwV/CZh2hc5FJ+7tazslKj21d4w4zazgccgVKra6IkvEUmJZEArCMiQy7YaA2yyhirwoOZo+aVtHWIS9ZMeBc+gpgU+nsQk1K2/JrAgMBAAECggEABzGLdSTVBWjVXxvo1qPZN8fs9Etgk42NVlB3R8ilNNABCnar7+csixn89JkaJDQ1vYbxVeB16mVl83qSUAcaPBMfwFPsBSGUuVgKgUgSoGjSTU5+/G4OF3LFOQze4fzqKfDm98JUt/Fpm+w6uLugMndjii6jSwqhPpOOiE+V4gQW0mTkxHVXNLTZl8gx7FDKrheWXvJI4rVvIv2RqLB9Yfi7nAEECoKpo8NHt87bkgjxVtAhn25gYnXT9pZb9GaZij5V/Xe9XpVmMOjSSIBsh7/bId9Y+hfZPg/O2i9mx0DKURExzSMa9Yl81qH/SNvixI7zEJQKsM6UMVkia7Q1AQKBgQD8UPM2qfwXH/rFZsS1QZUlSVSDE49dILgygo+hZ1anKIwRIa01T1ZY9dWl3pFkK8N7r7CAQLN5JoIBtLjvIWd+UQmCTkjftYw6iY8uC0XsIa0BTd4/C84cdIDwxAdk7CzHBLQsjRgWzIS2OEKQqs4wmYL8F8CJhIjdtVJqu09bAQKBgQDTogbE8KZoy8P4Eb6CaRLy9WoELHkY36SH6mSROBtV8yfRk3Y/jj4htOiTZjyfbRCRq4TE/OZfe3Q61kjkB+7zyq04NSWXrsilmtTc5NyepLO0+yWjgVg1hXaB/1YSNI2HHOOOluhSKHqaOUPuFgefAfAjR+l8/KXDrQ4nN93pawKBgE1Ly0ZqysSW0m8Y7ZgNkFBM56wEGP5RoLwwjSnIC57H6CjzZSmYtX4pSZs31NiYI5nHl82ihJjPuDInmCQB2r+yubQGoYKPDnd8XrWfVHtjUam9niE4T5seAcZAd3dudsU9ZqjjTIbnfpyIHbRN7z6qOJtb92rphDhPbQEvgr8BAoGASEHB3evsZUttFX25df06Iwn3sIUes4doPZ+hxpNJggcLSVr3vKtsO0XxQqJdgHFUfuf45OkUHvWfsZcIPBMZWtOQYOiEdU2P5DsBAoqBaQkC8n/tUe4Pl/aBh9EOKhkXWVJbv4t2ttZrRczXjKqo33lh7CnZZns8fZrQgkNo2RECgYA8EQYXZs5R/45dZ9qYQPBjeUusFjeNnJAvzSpHC1RDlOcrPmWySfTNMSqT3njaGvyj8X1zfs4aWi4MspIpC/RgG9xcEjtUZRGax/pzUHqKO0CxrTeEfb9NMm4xr5vO0PJQ0ktQjD6qvze2CCbHggsu1t4qcz/4NT1vDt3TwD/I9g==';

// Webhook endpoint
app.post('/webhook', async (req, res) => {
    const data = req.body;

    // Extract information from the webhook
    const symbol = data.symbol;  // e.g., BTCUSDT
    const side = data.side;      // BUY or SELL
    const type = data.type || 'market';  // limit or market
    const quantity = data.quantity;  // e.g., 0.01
    const price = data.price;     // For limit orders

    // Prepare Bitget order details
    const orderPayload = {
        symbol: symbol,
        side: side.toUpperCase(),
        orderType: type.toUpperCase(),
        size: quantity.toString(),
        price: price || '',  // Only needed for limit orders
    };

    try {
        // Call Bitget API to place the order
        const response = await placeBitgetOrder(orderPayload);
        res.status(200).send('Order placed successfully');
    } catch (error) {
        console.error('Error placing order:', error.message);
        res.status(500).send('Error placing order');
    }
});

// Function to place an order on Bitget
async function placeBitgetOrder(payload) {
    const url = 'https://api.bitget.com/api/spot/v1/trade/orders';
    const timestamp = Date.now();
    
    // Prepare the query string and signature
    const body = JSON.stringify(payload);
    const signature = createSignature(timestamp, 'POST', '/api/spot/v1/trade/orders', body);

    const headers = {
        'Content-Type': 'application/json',
        'ACCESS-KEY': API_KEY,
        'ACCESS-SIGN': signature,
        'ACCESS-TIMESTAMP': timestamp.toString(),
        'ACCESS-PASSPHRASE': API_PASSPHRASE,
    };

    const response = await axios.post(url, body, { headers });
    return response.data;
}

// Function to create a signature for the Bitget API
function createSignature(timestamp, method, path, body) {
    const query = `${timestamp}${method}${path}${body}`;
    const sign = crypto
        .createHmac('sha256', API_SECRET)
        .update(query)
        .digest('hex');

    return sign;
}

// Start the server
app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
});
