const fs = require('fs');

const BASE_URL = 'https://api.scryfall.com/cards/search?q=';
// Updated query using set types and explicit legal parameters to prevent pagination truncation
const QUERY = encodeURIComponent('f:commander (st:core OR st:expansion) -is:ub -o:"your commander"');
const DELAY_MS = 150;

async function fetchAllCards() {
    let hasMore = true;
    let url = BASE_URL + QUERY;
    const legalCards = [];
    let pageCount = 1;

    console.log('Starting Scryfall extraction...');

    while (hasMore) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'HeritageFormatBuilder/1.0',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            
            data.data.forEach(card => {
                const imgUrl = card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '');
                legalCards.push({
                    n: card.name.toLowerCase(),
                    u: card.scryfall_uri,
                    i: imgUrl
                });
            });

            console.log(`Fetched page ${pageCount}. Total cards so far: ${legalCards.length}`);

            hasMore = data.has_more;
            if (hasMore) {
                url = data.next_page;
                pageCount++;
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            break;
        }
    }

    fs.writeFileSync('heritage_cards.json', JSON.stringify(legalCards));
    console.log(`Extraction complete. Wrote ${legalCards.length} cards to heritage_cards.json`);
}

fetchAllCards();
