const fs = require('fs');

const DELAY_MS = 600;

async function fetchAllCards() {
    // 1. Fetch the main base legal cards (~25,000 cards)
    const baseQuery = 'f:commander (in:core OR in:expansion) -is:ub -o:"your commander"';
    console.log('Fetching base Heritage legal cards...');
    const baseCards = await fetchQuery(baseQuery);

    // 2. Fetch cards with flavor names (Secret Lairs, reskins, etc.) to catch alternate titles like "Post's Citadel"
    // We target prints that have a flavor name while ensuring they still pass format constraints
    const flavorQuery = 'f:commander (in:core OR in:expansion) -is:ub -o:"your commander" flavor>=a';
    console.log('Fetching promotional reskins and flavor-name variants...');
    const flavorCards = await fetchQuery(flavorQuery);

    // Combine and deduplicate entries
    const cardMap = new Map();

    // Add base cards
    baseCards.forEach(card => {
        cardMap.set(card.n, card);
    });

    // Merge flavor cards, adding `f` property when a flavor name exists
    flavorCards.forEach(card => {
        if (card.f && cardMap.has(card.n)) {
            // Attach the flavor name to the existing base card record
            const existing = cardMap.get(card.n);
            existing.f = card.f; // Keep track of the alternate name
        } else if (card.f) {
            // If it's a standalone entry not yet caught, add it
            cardMap.set(card.n, card);
        }
    });

    const finalCardsArray = Array.from(cardMap.values());

    const outputData = {
        lastUpdated: new Date().toISOString(),
        cards: finalCardsArray
    };

    fs.writeFileSync('heritage_cards.json', JSON.stringify(outputData));
    console.log(`Extraction complete. Successfully wrote ${finalCardsArray.length} total entries (including reskins) to heritage_cards.json`);
}

async function fetchQuery(queryString) {
    let hasMore = true;
    let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(queryString)}&order=name`;
    const results = [];
    let pageCount = 1;

    while (hasMore) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'HeritageFormatBuilder/1.0',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 429) {
                console.log('Rate limited (429). Pausing for 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                continue;
            }

            if (!response.ok) {
                // If flavor query returns 404 (no results found for a specific sub-query), safely return empty array
                if (response.status === 404) break;
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - Body: ${errorBody}`);
            }

            const data = await response.json();
            
            data.data.forEach(card => {
                const imgUrl = card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '');
                
                let oracleText = card.oracle_text || '';
                if (!oracleText && card.card_faces) {
                    oracleText = card.card_faces.map(f => f.oracle_text || '').join(' ');
                }

                const flavorName = card.flavor_name ? card.flavor_name.toLowerCase() : null;

                results.push({
                    n: card.name.toLowerCase(),
                    f: flavorName,
                    t: card.type_line ? card.type_line.toLowerCase() : '',
                    o: oracleText.toLowerCase(),
                    u: card.scryfall_uri,
                    i: imgUrl
                });
            });

            hasMore = data.has_more;
            if (hasMore) {
                url = data.next_page;
                pageCount++;
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        } catch (error) {
            console.error('Extraction warning/error:', error);
            break;
        }
    }
    return results;
}

fetchAllCards();
