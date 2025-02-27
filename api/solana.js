const { Connection, PublicKey, TOKEN_PROGRAM_ID } = require("@solana/web3.js");
const axios = require("axios");

module.exports = async (req, res) => {
    const walletAddress = req.query.address;
    const connection = new Connection("https://rpc.ankr.com/solana");

    try {
        const publicKey = new PublicKey(walletAddress);
        const solBalance = await connection.getBalance(publicKey);
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
        const txs = await connection.getParsedTransactions(signatures.map(sig => sig.signature));

        const coins = new Map([["solana", { amount: solBalance / 1000000000, lastTx: null }]]);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID });
        tokenAccounts.value.forEach(account => {
            const mint = account.account.data.parsed.info.mint;
            const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
            if (amount > 0) coins.set(mint, { amount, lastTx: null });
        });

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

        const coinData = await Promise.all(
            Array.from(coins.entries()).map(async ([mint, info]) => {
                const coinId = mint === "So11111111111111111111111111111111111111112" ? "solana" : "usd-coin";
                const buyPrice = info.lastTx ? await getHistoricalPrice(coinId, info.lastTx) : 0.01;
                const currentPrice = await getCurrentPrice(coinId) || 0.01;
                const fumbled = currentPrice > buyPrice ? (currentPrice - buyPrice) * info.amount : 0;
                const roi = buyPrice ? ((currentPrice - buyPrice) / buyPrice * 100).toFixed(2) : 0;

                return { coin: coinId.slice(0, 8), buyPrice, currentPrice, fumbled, roi };
            })
        );

        res.status(200).json(coinData);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch wallet data" });
    }
};

async function getHistoricalPrice(coin, timestamp) {
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}/history?date=${date}`);
        return response.data.market_data?.current_price?.usd || 0.01;
    } catch {
        return 0.01;
    }
}

async function getCurrentPrice(coin) {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
        return response.data[coin]?.usd || 0.01;
    } catch {
        return 0.01;
    }
}
