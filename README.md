# SolBagFumbler

**Skills Showcased:**  
This repository demonstrates my proficiency in **web development** (HTML, CSS, JavaScript), **blockchain integration** (Solana blockchain via `@solana/web3.js` and Solscan API), **API handling** (CoinGecko and Solscan), **server-side programming** (Node.js with Express), and **deployment** (GitHub Pages, Vercel, Netlify, Render). It reflects my ability to troubleshoot, iterate, and adapt to technical challenges in real-time, showcasing problem-solving and perseverance in building blockchain-based applications.

## Overview
`SolBagFumbler` is an ambitious project aimed at creating a Solana wallet analytics tool for my portfolio website. The goal was to input a Solana wallet address and display stats like coin balances, buy prices, current prices, ROI, and "fumbled" profits (missed gains from selling early), styled with an 8-bit NES aesthetic. Despite extensive efforts, it remains incomplete due to persistent issues with fetching blockchain data reliably on various hosting platforms.

## Project Journey

### Initial Concept
- **Objective:** Build a tool to fetch Solana wallet data (e.g., SOL balance, token holdings) and calculate financial metrics, inspired by tools like Rugcheck.xyz.
- **Tech Stack:** HTML/CSS/JavaScript for the front-end, Node.js/Express for the back-end, `@solana/web3.js` for Solana data, CoinGecko for prices, hosted initially on GitHub Pages.

### Trial and Error Timeline

1. **GitHub Pages Attempt (Early February 2025)**  
   - **Goal:** Host as a static site with client-side Solana calls.
   - **Code:** Used `@solana/web3.js` to fetch balance and transactions directly in `script.js`.
   - **Issue:** CORS errors blocked browser requests to Solana RPC (`rpc.ankr.com`)—GitHub Pages is static-only, no server-side proxy possible.
   - **Outcome:** Abandoned due to CORS limitations.

2. **Netlify Attempt (Mid-February 2025)**  
   - **Goal:** Use serverless functions (`netlify/functions/solana.js`) to bypass CORS.
   - **Code:** Added `server.js` as a function, moved Solana calls there.
   - **Issues:** 
     - Initial deploy failed—no `package.json` for dependencies (`ENOENT` errors).
     - Added `package.json` and `netlify.toml`, but function calls still failed—dependency install issues persisted.
   - **Outcome:** Multiple redeploys (e.g., `main@d74c239`) didn’t resolve—switched platforms due to inconsistent runtime errors.

3. **Vercel Attempt (Late February 2025)**  
   - **Goal:** Use Vercel’s serverless functions (`api/solana.js`).
   - **Code:** Adjusted to Vercel structure (`vercel.json`, `api/` folder).
   - **Issues:** 
     - Build failed due to `netlify/functions` mismatch in `package.json` (`cd: netlify/functions: No such file or directory`).
     - Fixed folder to `api/`, deployed successfully (`https://sol-bag-fumbler.vercel.app`), but styling didn’t load—plain white page.
   - **Outcome:** Static assets (`styles.css`) didn’t serve correctly—abandoned after styling fix attempts failed.

4. **Render Attempt (Late February 2025)**  
   - **Goal:** Host as a unified Node.js app (front-end + back-end) on Render.
   - **Code:** Combined `server.js` with static file serving (`express.static`), used `@solana/web3.js` and CoinGecko.
   - **Issues:** 
     - Initial static site deploy (`srv-cv07r73tq21c7392jqmg`) used wrong “Publish directory” (“main”)—fixed to `./`.
     - Switched to web service (`srv-cv083123esus73e6bb8g`)—build failed (`ENOENT: package.json`) until added.
     - Runtime failed (`Cannot find module '/opt/render/project/src/server.js'`)—fixed with “Root Directory” set to `/`.
     - Final deploy (`commit c810d145…`) succeeded—NES styling loaded, but stats didn’t show (“Game over!”).
     - Switched to Solscan API—still failed despite debug logs, likely due to API timeouts or silent errors.
   - **Outcome:** Closest attempt—styling works, but data fetch remains unreliable.

### Current State
- **URL:** `https://solbagfumblerr.onrender.com` (Render web service).
- **Status:** Incomplete—displays NES-styled interface, but wallet stats (balance, ROI, fumble) don’t load. Clicking “Start Game!” shows “Loading yer loot…” then “Game over!”.
- **Last Known Issue:** Solscan API calls (`/account`, `/account/transactions`) or CoinGecko price fetches fail silently—`axios.get('/solana')` triggers `catch` block without clear logs.

### Lessons Learned
- **CORS Challenges:** Static hosting (GitHub Pages) can’t handle blockchain RPC calls without a proxy—server-side logic is essential.
- **Hosting Quirks:** Vercel/Netlify serverless functions had dependency and asset issues; Render’s web service was most stable but sensitive to directory settings.
- **API Reliability:** Solana RPC (`rpc.ankr.com`) and CoinGecko have timeouts/rate limits—Solscan was simpler but still inconsistent on Render.
- **Debugging:** Detailed logging helped, but Render’s runtime didn’t always surface backend errors.

### Next Steps
- **Fix Data Fetch:** Investigate Solscan API rate limits or switch to a mock data fallback for demo purposes.
- **Alternative Hosting:** Try a VPS (e.g., DigitalOcean) for full control over Node.js runtime.
- **Portfolio Pivot:** Consider a simpler Solana demo (e.g., NFT gallery)—see my other repo `solana-nft-gallery` for a working alternative.

### How to Run Locally
1. Clone: `git clone https://github.com/kunjpatelx/SolBagFumbler.git`
2. Install: `npm install`
3. Start: `npm start`
4. Open: `http://localhost:3000`—enter a Solana wallet address to test (e.g., `DZJSB7H95nBf3294LdZsSaECuW2jFUQKD9jngMAk1f3W`).

*Note:* Local runs may work better than Render—still debugging hosted issues.

---
This project remains a testament to my persistence and learning curve in blockchain development—stay tuned for updates as I refine it!
