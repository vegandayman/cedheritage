const fs = require('fs');

// Using unique=prints so our script encounters special art printings and Secret Lair reskins
const URL = 'https://api.scryfall.com/cards/search?q=f:commander+(in:core+OR+in:expansion)+-is:ub+-o:%22your+commander%22&unique=prints&order=name';
const DELAY_MS = 600;

async function fetchAllCards() {
    let hasMore = true;
    let url = URL;
    const legalCards = [];
    let pageCount = 1;

    console.log('Starting full Scryfall extraction (including reskins/flavor names)...');

    while (hasMore) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'HeritageFormatBuilder/1.0',
                    'Accept': 'application/json'
                }
            });

            if (response.status === 429) {
                console.log('Rate limited (429). Pausing for 30 seconds before retrying...');
                await new Promise(resolve => setTimeout(resolve, 30000));
                continue;
            }

            if (!response.ok) {
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

                // Automatically capture flavor/reskin names (e.g. "Post's Citadel")
                const flavorName = card.flavor_name ? card.flavor_name.toLowerCase() : null;

                legalCards.push({
                    n: card.name.toLowerCase(),
                    f: flavorName,
                    t: card.type_line ? card.type_line.toLowerCase() : '',
                    o: oracleText.toLowerCase(),
                    u: card.scryfall_uri,
                    i: imgUrl
                });
            });

            console.log(`Fetched page ${pageCount}. Total entries so far: ${legalCards.length}`);

            hasMore = data.has_more;
            if (hasMore) {
                url = data.next_page;
                pageCount++;
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        } catch (error) {
            console.error('Fatal extraction error:', error);
            process.exit(1);
        }
    }

    const outputData = {
        lastUpdated: new Date().toISOString(),
        cards: legalCards
    };

    fs.writeFileSync('heritage_cards.json', JSON.stringify(outputData));
    console.log(`Extraction complete. Successfully wrote ${legalCards.length} entries to heritage_cards.json`);
}

fetchAllCards();
