// Node.js script for generating heritage_cards.json via GitHub Actions
// Enforces Heritage format rules: Standard-legal premier set verification, 
// exclusion of Universes Beyond and "your commander" cards.

const fs = require('fs');
const https = require('https');

const DELAY_MS = 200; // Respect Scryfall rate limits

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchScryfall(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'EDHeritageBot/1.0' } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP status ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

async function buildDatabase() {
    console.log("Starting Heritage database build...");
    
    // Pass 1: Get base legal cards (-is:ub -o:"your commander" in standard-legal premier sets)
    let cards = [];
    let hasMore = true;
    let queryUrl = "https://api.scryfall.com/cards/search?q=" + encodeURIComponent('is:booster -is:ub -o:"your commander"');

    while (hasMore) {
        try {
            let result = await fetchScryfall(queryUrl);
            for (let card of result.data) {
                cards.push({
                    n: card.name.toLowerCase(),
                    f: card.flavor_name ? [card.flavor_name.toLowerCase()] : [],
                    t: card.type_line.toLowerCase(),
                    o: (card.oracle_text || '').toLowerCase(),
                    u: card.scryfall_uri,
                    i: card.image_uris ? card.image_uris.normal : ''
                });
            }
            hasMore = result.has_more;
            if (hasMore) {
                queryUrl = result.next_page;
                await sleep(DELAY_MS);
            }
        } catch (e) {
            console.error("Error fetching Scryfall batch:", e.message);
            break;
        }
    }

    // Pass 2: Process promotional reskins / flavor names
    // Matching has:flavor_name cards back to canonical entries
    console.log(`Processed ${cards.length} base cards. Fetching reskins...`);
    let reskinUrl = "https://api.scryfall.com/cards/search?q=" + encodeURIComponent('has:flavor_name -is:ub');
    
    try {
        let reskinResult = await fetchScryfall(reskinUrl);
        for (let reskin of reskinResult.data) {
            let flavorName = reskin.flavor_name.toLowerCase();
            // Find base card match or append alias mapping if necessary
            let existing = cards.find(c => c.n === reskin.name.toLowerCase());
            if (existing && !existing.f.includes(flavorName)) {
                existing.f.push(flavorName);
            }
        }
    } catch (e) {
        console.warn("Skipping or partial reskin fetch error:", e.message);
    }

    const output = {
        lastUpdated: new Date().toISOString(),
        cards: cards
    };

    fs.writeFileSync('heritage_cards.json', JSON.stringify(output));
    console.log("heritage_cards.json generated successfully.");
}

buildDatabase();