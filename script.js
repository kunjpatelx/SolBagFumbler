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
        // Vercel function path
        const response = await axios.get(`/api/solana?address=${walletAddress}`);
        const coinData = response.data;

        coinList.innerHTML = coinData.map(data => `
            <p>${data.coin}: Snagged at $${data.buyPrice.toFixed(2)} | Now $${data.currentPrice.toFixed(2)}
            <br>ROI: ${data.roi}% - ${data.roi > 0 ? "Score!" : "Ouch!"}
            ${data.fumbled > 0 ? `<br><span style="color: #ff00ff">Fumbled $${data.fumbled.toFixed(2)}! Shoulda HODLed, dude!</span>` : ""}
            </p>
        `).join("");

        drawChart(coinData);
    } catch (error) {
        coinList.innerHTML = "Game over! Blockchain glitch—try again, hero!";
        console.error(error);
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