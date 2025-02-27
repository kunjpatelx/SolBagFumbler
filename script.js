const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");

async function fetchWalletData() {
    const walletAddress = document.getElementById("walletAddress").value.trim();
    if (!walletAddress || walletAddress.length < 32) {
        alert("Hey, player! Drop a real Solana wallet address!");
        return;
    }

    document.getElementById("results").classList.remove("hidden");
    const coinList = document.getElementById("coinList");
    coinList.innerHTML = "Loading yer loot...";

    try {
        // Step 1: Fetch token accounts
        const publicKey = new solanaWeb3.PublicKey(walletAddress);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: solanaWeb3.TOKEN_PROGRAM_ID });

        // Step 2: Get coins wallet interacted with
        const coins = new Map();
        tokenAccounts.value.forEach(account => {
            const mint = account.account.data.parsed.info.mint;
            const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
            if (amount > 0) coins.set(mint, { amount });
        });

        // Step 3: Fetch recent transactions for buy/sell data
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 50 });
        const txs = await connection.getParsedTransactions(signatures.map(sig => sig.signature));
        txs.forEach(tx => {
            if (tx?.meta?.postTokenBalances) {
                tx.meta.postTokenBalances.forEach(balance => {
                    const mint = balance.mint;
                    if (coins.has(mint)) {
                        coins.get(mint).lastTx = tx.blockTime;
                    }
                });
            }
        });

        // Step 4: Price and fumble calc
        const coinData = await Promise.all(
            Array.from(coins.entries()).map(async ([mint, info]) => {
                const coinId = mint === "So11111111111111111111111111111111111111112" ? "solana" : mint; // Simplified, needs token mapping
                const buyPrice = info.lastTx ? await getHistoricalPrice(coinId, info.lastTx) : 0;
                const currentPrice = await getCurrentPrice(coinId);
                const fumbled = currentPrice > buyPrice ? (currentPrice - buyPrice) * info.amount : 0;
                const roi = buyPrice ? ((currentPrice - buyPrice) / buyPrice * 100).toFixed(2) : 0;

                return { coin: coinId.slice(0, 8), buyPrice, currentPrice, fumbled, roi };
            })
        );

        // Step 5: Display with NES flair
        coinList.innerHTML = coinData.map(data => `
            <p>${data.coin}: Grabbed at $${data.buyPrice.toFixed(2)} | Now $${data.currentPrice.toFixed(2)}
            <br>ROI: ${data.roi}% - ${data.roi > 0 ? "Score!" : "Ouch!"}
            ${data.fumbled > 0 ? `<br><span style="color: #ff00ff">Fumbled $${data.fumbled.toFixed(2)}! Shoulda HODLed, dude!</span>` : ""}
            </p>
        `).join("");

        // Step 6: Chart it up
        drawChart(coinData);
    } catch (error) {
        coinList.innerHTML = "Game over! Blockchain glitch—try again, hero!";
        console.error(error);
    }
}

async function getHistoricalPrice(coin, timestamp) {
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}/history?date=${date}`);
        return response.data.market_data?.current_price?.usd || 0;
    } catch {
        return 0; // Fallback if API fails
    }
}

async function getCurrentPrice(coin) {
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd`);
        return response.data[coin]?.usd || 0;
    } catch {
        return 0;
    }
}

function drawChart(coinData) {
    const ctx = document.getElementById("fumbleChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: coinData.map(d => d.coin),
            datasets: [
                { label: "Fumbled Gains ($)", data: coinData.map(d => d.fumbled), backgroundColor: "#ff00ff" },
                { label: "ROI (%)", data: coinData.map(d => d.roi), backgroundColor: "#00ff00" }
            ]
        },
        options: {
            scales: { y: { beginAtZero: true, title: { display: true, text: "Score", color: "#ffff00" } } },
            plugins: { legend: { labels: { color: "#ffff00" } }, title: { display: true, text: "Fumble-o-Tron 3000", color: "#ff00ff" } }
        }
    });
}