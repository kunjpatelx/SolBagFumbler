const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.static(__dirname));

app.get("/solana", async (req, res) => {
    const walletAddress = req.query.address;
    console.log(`[REQUEST] Received /solana call for wallet: ${walletAddress}`);

    if (!walletAddress) {
        console.error("[ERROR] No wallet address provided");
        return res.status(400).json({ error: "Wallet address required" });
    }

    try {
        // Fetch SOL balance from Solscan
        console.log("[STEP 1] Fetching SOL balance from Solscan...");
        const balanceResponse = await axios.get(`https://public-api.solscan.io/account/${walletAddress}`, {
            headers: { "Accept": "application/json" },
            timeout: 10000
        });
        const solBalance = balanceResponse.data.lamports / 1000000000; // Convert lamports to SOL
        console.log(`[STEP 1] SOL balance: ${solBalance} SOL`);

        // Fetch recent transactions
        console.log("[STEP 2] Fetching recent transactions from Solscan...");
        const txResponse = await axios.get(`https://public-api.solscan.io/account/transactions?account=${walletAddress}&limit=10`, {
            headers: { "Accept": "application/json" },
            timeout: 10000
        });
        const txs = txResponse.data;
        console.log(`[STEP 2] Found ${txs.length} transactions`);

        // Process coins (SOL only for simplicity, extendable to tokens)
        const coins = new Map([["solana", { amount: solBalance, lastTx: txs.length > 0 ? txs[0].blockTime : null }]]);
        console.log(`[STEP 3] Coins processed: ${coins.size}`);

        // Fetch prices and calculate stats
        console.log("[STEP 4] Fetching prices...");
        const coinData = await Promise.all(
            Array.from(coins.entries()).map(async ([mint, info]) => {
                const coinId = "solana"; // Hardcoded for SOL; extend for tokens later
                const buyPrice = info.lastTx ? await getHistoricalPrice(coinId, info.lastTx) : 0.01;
                const currentPrice = await getCurrentPrice(coinId) || 0.01;
                const fumbled = currentPrice > buyPrice ? (currentPrice - buyPrice) * info.amount : 0;
                const roi = buyPrice ? ((currentPrice - buyPrice) / buyPrice * 100).toFixed(2) : 0;

                return { coin: coinId.slice(0, 8), buyPrice, currentPrice, fumbled, roi };
            })
        );

        console.log("[SUCCESS] Sending coin data:", JSON.stringify(coinData));
        res.status(200).json(coinData);
    } catch (error) {
        console.error("[ERROR] Failed in /solana:", error.message, error.stack);
        res.status(500).json({ error: "Failed to fetch wallet data", details: error.message });
    }
});

async function getHistoricalPrice(coin, timestamp) {
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}/history?date=${date}`, { timeout: 10000 });
        console.log(`[PRICE] Historical price for ${coin} on ${date}: ${response.data.market_data?.current_price?.usd}`);
        return response.data.market_data?.current_price?.usd || 0.01;
    } catch (error) {
        console.error(`[PRICE ERROR] Historical price fetch failed for ${coin}:`, error.message);
        return 0.01;
    }
}

async function getCurrentPrice(coin) {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`, { timeout: 10000 });
        console.log(`[PRICE] Current price for ${coin}: ${response.data[coin]?.usd}`);
        return response.data[coin]?.usd || 0.01;
    } catch (error) {
        console.error(`[PRICE ERROR] Current price fetch failed for ${coin}:`, error.message);
        return 0.01;
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
