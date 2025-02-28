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
        const connection = new solanaWeb3.Connection("https://api.mainnet-beta.solana.com");
        const pubKey = new solanaWeb3.PublicKey(walletAddress);
        const balance = await connection.getBalance(pubKey);
        const solBalance = balance / 1000000000; // Convert lamports to SOL

        const signatures = await connection.getSignaturesForAddress(pubKey, { limit: 1 });
        const lastTx = signatures.length > 0 ? signatures[0].blockTime : null;

        const coins = [{ coin: "solana", amount: solBalance, lastTx }];

        const coinData = await Promise.all(coins.map(async coin => {
            const buyPrice = coin.lastTx ? await getHistoricalPrice("solana", coin.lastTx) : 0.01;
            const currentPrice = await getCurrentPrice("solana") || 0.01;
            const fumbled = currentPrice > buyPrice ? (currentPrice - buyPrice) * coin.amount : 0;
            const roi = buyPrice ? ((currentPrice - buyPrice) / buyPrice * 100).toFixed(2) : 0;

            return { coin: coin.coin, buyPrice, currentPrice, fumbled, roi };
        }));

        if (!coinData || coinData.length === 0) {
            coinList.innerHTML = "No loot found, adventurer! Try another wallet!";
            return;
        }

        coinList.innerHTML = coinData.map(data => `
            <p>${data.coin}: Snagged at $${data.buyPrice.toFixed(2)} | Now $${data.currentPrice.toFixed(2)}
            <br>ROI: ${data.roi}% - ${data.roi > 0 ? "Score!" : "Ouch!"}
            ${data.fumbled > 0 ? `<br><span style="color: #ff00ff">Fumbled $${data.fumbled.toFixed(2)}! Shoulda HODLed, dude!</span>` : ""}
            </p>
        `).join("");

        drawChart(coinData);
    } catch (error) {
        coinList.innerHTML = "Game over! Blockchain glitch—check the logs, hero!";
        console.error("Fetch error:", error.message);
    }
}

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
