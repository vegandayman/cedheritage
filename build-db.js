const fs = require('fs');

const DELAY_MS = 600;

async function fetchAllCards() {
    // 1. Fetch base legal cards (unique=cards, strictly blocking UB)
    const baseQuery = 'f:commander (in:core OR in:expansion) -is:ub -o:"your commander"';
    console.log('Fetching base Heritage legal cards...');
    const baseCards = await fetchQuery(baseQuery, 'cards');

    // 2. Fetch flavor cards (unique=prints to expose flavor_name)
    // We DROP -is:ub here so we can catch Universes Beyond reskins of legal premier cards.
    const flavorQuery = 'f:commander (in:core OR in:expansion) has:flavor_name';
    console.log('Fetching promotional reskins and flavor-name variants...');
    const flavorCards = await fetchQuery(flavorQuery, 'prints');

    const cardMap = new Map();

    // Add base cards
    baseCards.forEach(card => {
        card.f = []; // Initialize an array to hold multiple possible reskin names
        cardMap.set(card.n, card);
    });

    // Merge flavor cards safely onto existing legal cards
    flavorCards.forEach(card => {
        // If the card has a flavor name AND the base card passed our strict Heritage filters in query 1
        if (card.f && cardMap.has(card.n)) {
            const existing = cardMap.get(card.n);
            // Push the flavor name if we haven't already saved it
            if (!existing.f.includes(card.f)) {
                existing.f.push(card.f);
            }
        }
    });

    const finalCardsArray = Array.from(cardMap.values());

    const outputData = {
        lastUpdated: new Date().toISOString(),
        cards: finalCardsArray
    };

    fs.writeFileSync('heritage_cards.json', JSON.stringify(outputData));
    console.log(`Extraction complete. Successfully wrote ${finalCardsArray.length} total entries to heritage_cards.json`);
}

async function fetchQuery(queryString, uniqueType) {
    let hasMore = true;
    let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(queryString)}&unique=${uniqueType}&order=name`;
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

            console.log(`Fetched page ${pageCount}. Total entries so far in this query: ${results.length}`);

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
