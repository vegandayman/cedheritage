const fs = require('fs');

const DELAY_MS = 600;

async function fetchAllCards() {
  // 1. Fetch base legal cards (unique=cards, strictly blocking UB)
  // (game:paper) prevents digital-only reskins from pulling in their UB oracle identities
  const baseQuery = 'f:commander (in:core OR in:expansion) -is:ub -o:"your commander" (game:paper)';
  console.log('Fetching base Heritage legal cards...');
  const baseCards = await fetchQuery(baseQuery, 'cards');

  // 2. Fetch flavor cards (unique=prints to expose flavor_name)
  const flavorQuery = 'f:commander (in:core OR in:expansion) has:flavor_name';
  console.log('Fetching promotional reskins and flavor-name variants...');
  const flavorCards = await fetchQuery(flavorQuery, 'prints');

  // 3. Fetch Through the Omenpaths reskins specifically
  const omenpathsQuery = 'f:commander set:om1';
  console.log('Fetching Through the Omenpaths reskins...');
  const omenpathsCards = await fetchQuery(omenpathsQuery, 'prints');

  const cardMap = new Map();

  // Add base cards
  baseCards.forEach(card => {
    card.f = []; 
    cardMap.set(card.n, card);
  });

  // Merge flavor cards safely onto existing legal cards
  flavorCards.forEach(card => {
    if (card.f && cardMap.has(card.n)) {
      const existing = cardMap.get(card.n);
      if (!existing.f.includes(card.f)) {
        existing.f.push(card.f);
      }
    }
  });

  // Inject Omenpaths cards, inverted to hide the UB name
  omenpathsCards.forEach(card => {
    if (card.f) {
      cardMap.set(card.f, {
        n: card.f, // Set the Omenpaths name as the primary legal name
        f: [],     // Do NOT include the UB Oracle name here
        t: card.t,
        o: card.o,
        u: card.u,
        i: card.i
      });
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
        throw new Error(`HTTP error! status: ${response.status}, Body: ${errorBody}`);
      }

      const data = await response.json();
      
      data.data.forEach(card => {
        const imgUrl = card.image_uris ? card.image_uris.normal : (card.card_faces ? card.card_faces[0].image_uris.normal : '');
        
        let oracleText = card.oracle_text || '';
        if (!oracleText && card.card_faces) {
          oracleText = card.card_faces.map(f => f.oracle_text || '').join(' ');
        }

        // Check for printed_name to support Through the Omenpaths and handle DFCs
        let altName = null;
        if (card.flavor_name) {
          altName = card.flavor_name.toLowerCase();
        } else if (card.printed_name) {
          altName = card.printed_name.toLowerCase();
        } else if (card.card_faces) {
          if (card.card_faces[0].flavor_name) {
            altName = card.card_faces.map(f => f.flavor_name || f.name).join(' // ').toLowerCase();
          } else if (card.card_faces[0].printed_name) {
            altName = card.card_faces.map(f => f.printed_name || f.name).join(' // ').toLowerCase();
          }
        }

        results.push({
          n: card.name.toLowerCase(),
          f: altName,
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
