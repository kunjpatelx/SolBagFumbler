async function fetchWalletData() {
    const walletAddress = document.getElementById("walletAddress").value.trim();
    if (!walletAddress) {
        alert("Yo, enter a wallet address first!");
        return;
    }

    document.getElementById("results").classList.remove("hidden");
    const coinList = document.getElementById("coinList");
    coinList.innerHTML = "Scanning the blockchain, hold tight...";

    try {
        // Step 1: Fetch Solana transactions (simplified with Solscan API)
        const solscanResponse = await axios.get(`https://api.solscan.io/account/transactions?address=${walletAddress}&limit=10`);
        const transactions = solscanResponse.data.data;

        // Step 2: Filter coins wallet interacted with
        const coins = new Set();
        transactions.forEach(tx => {
            if (tx.token_transfers) {
                tx.token_transfers.forEach(transfer => {
                    coins.add(transfer.token_symbol || transfer.token_address);
                });
            }
        });

        // Step 3: Get prices and "fumbled" data
        const coinData = await Promise.all(
            Array.from(coins).map(async (coin) => {
                const buyTx = transactions.find(tx => tx.token_transfers?.some(t => t.token_symbol === coin && t.type === "transfer_in"));
                const sellTx = transactions.find(tx => tx.token_transfers?.some(t => t.token_symbol === coin && t.type === "transfer_out"));
                const buyPrice = buyTx ? await getHistoricalPrice(coin, buyTx.block_time) : 0;
                const sellPrice = sellTx ? await getHistoricalPrice(coin, sellTx.block_time) : 0;
                const currentPrice = await getCurrentPrice(coin);
                const fumbled = sellPrice && currentPrice > sellPrice ? (currentPrice - sellPrice) * (sellTx?.token_transfers[0]?.amount || 0) : 0;

                return { coin, buyPrice, sellPrice, currentPrice, fumbled };
            })
        );

        // Step 4: Display results with playful tone
        coinList.innerHTML = coinData.map(data => `
            <p>${data.coin}: Bought at $${data.buyPrice.toFixed(2)} | Sold at $${data.sellPrice.toFixed(2)} | Now $${data.currentPrice.toFixed(2)}
            ${data.fumbled > 0 ? `<br><span style="color: #ff007a">Fumbled $${data.fumbled.toFixed(2)}! Oof, you left some gains on the table!</span>` : ""}
            </p>
        `).join("");

        // Step 5: Fun chart
        drawChart(coinData);
    } catch (error) {
        coinList.innerHTML = "Oops, something crashed! Maybe the blockchain’s laughing at us.";
        console.error(error);
    }
}

async function getHistoricalPrice(coin, timestamp) {
    // CoinGecko API (simplified - needs token ID, not symbol)
    const date = new Date(timestamp * 1000).toISOString().split("T")[0];
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin.toLowerCase()}/history?date=${date}`);
    return response.data.market_data?.current_price?.usd || 0;
}

async function getCurrentPrice(coin) {
    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.toLowerCase()}&vs_currencies=usd`);
    return response.data[coin.toLowerCase()]?.usd || 0;
}

function drawChart(coinData) {
    const ctx = document.getElementById("fumbleChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: coinData.map(d => d.coin),
            datasets: [{
                label: "Fumbled Gains ($)",
                data: coinData.map(d => d.fumbled),
                backgroundColor: "#ff007a",
                borderColor: "#00ffcc",
                borderWidth: 1
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, title: { display: true, text: "Missed Bucks", color: "#fff" } } },
            plugins: { legend: { labels: { color: "#fff" } }, title: { display: true, text: "Your Fumble Hall of Fame", color: "#ccff00" } }
        }
    });
}