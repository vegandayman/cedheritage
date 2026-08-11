const fs = require('fs');

const BASE_URL = 'https://api.scryfall.com/cards/search?q=';
const QUERY = encodeURIComponent('f:commander (in:core OR in:expansion) -is:ub -o:"your commander"');
const DELAY_MS = 150; // 150ms delay to safely stay under the 10 req/sec limit

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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            data.data.forEach(card => {
                legalCards.push(card.name.toLowerCase());
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