const express = require("express");
const { Connection, PublicKey, TOKEN_PROGRAM_ID } = require("@solana/web3.js");
const axios = require("axios");
const app = express();

// Serve static files from root
app.use(express.static(__dirname));

app.get("/solana", async (req, res) => {
    const walletAddress = req.query.address;
    console.log(`[REQUEST] Received /solana call for wallet: ${walletAddress}`);

    if (!walletAddress) {
        console.error("[ERROR] No wallet address provided");
        return res.status(400).json({ error: "Wallet address required" });
    }

    const connection = new Connection("https://rpc.ankr.com/solana", { commitment: "confirmed", timeout: 30000 });

    try {
        console.log("[STEP 1] Validating public key...");
        const publicKey = new PublicKey(walletAddress);
        console.log("[STEP 2] Fetching SOL balance...");
        const solBalance = await connection.getBalance(publicKey);
        console.log(`[STEP 2] SOL balance: ${solBalance / 1000000000} SOL`);
        console.log("[STEP 3] Fetching signatures...");
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
        console.log(`[STEP 3] Found ${signatures.length} signatures`);
        console.log("[STEP 4] Fetching transactions...");
        const txs = await connection.getParsedTransactions(signatures.map(sig => sig.signature));
        console.log(`[STEP 4] Loaded ${txs.length} transactions`);

        const coins = new Map([["solana", { amount: solBalance / 1000000000, lastTx: null }]]);
        console.log("[STEP 5] Fetching token accounts...");
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        tokenAccounts.value.forEach(account => {
            const mint = account.account.data.parsed.info.mint;
            const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
            if (amount > 0) coins.set(mint, { amount, lastTx: null });
        });
        console.log(`[STEP 5] Found ${coins.size} coins`);

        txs.forEach(tx => {
            if (tx?.meta?.postTokenBalances) {
                tx.meta.postTokenBalances.forEach(balance => {
                    const mint = balance.mint;
                    if (coins.has(mint) && !coins.get(mint).lastTx) coins.get(mint).lastTx = tx.blockTime;
                });
            } else if (!coins.get("solana").lastTx) {
                coins.get("solana").lastTx = tx.blockTime;
            }
        });

        console.log("[STEP 6] Fetching prices...");
        const coinData = await Promise.all(
            Array.from(coins.entries()).map(async ([mint, info]) => {
                const coinId = mint === "So11111111111111111111111111111111111111112" ? "solana" : "usd-coin";
                console.log(`[PRICE] Fetching for ${coinId}...`);
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
