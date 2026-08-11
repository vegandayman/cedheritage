Heritage Format Database & Deck Checker — README
Welcome to the Heritage Format Tools repository! This application provides a static, zero-backend web interface hosted on GitHub Pages to help players search for legal Magic: The Gathering cards under the Heritage format ruleset and verify full 100-card decklists instantly.

What is the Heritage Format?
Heritage is a custom Commander variant with strict filtering rules to maintain a specific gameplay feel:

Base Rules: Standard Commander (EDH) rules, color identity, and singleton constraints apply, cross-referenced against the official EDH banlist.

The Premier Set Filter: Cards must have been printed in at least one Standard-legal premier set (Core sets or Expansions, from Alpha onward). Cards printed exclusively in supplemental products (like Modern Horizons, Commander Masters, or Secret Lairs) are banned unless reprinted in a premier set.

Universes Beyond Ban: All Universes Beyond cards (e.g., Doctor Who, Fallout, Final Fantasy, Marvel) are strictly banned, regardless of standard legality.

The "Your Commander" Ban: Any card containing the exact phrase "your commander" in its Oracle text is banned (eliminating format staples like Arcane Signet and Command Tower).

Repository Structure
index.html: The front-end single-file web application handling the user interface, search filters, and decklist parser.

build-db.js: A Node.js extraction script that queries Scryfall, compiles the complete legal database (~25,000 cards), formats the metadata, and saves it locally.

heritage_cards.json: The cached local database file containing card names, types, Oracle text, URIs, and a build timestamp. (Generated automatically via GitHub Actions).

.github/workflows/update-db.yml: The automated cloud workflow that runs build-db.js and commits updates to your repository.

Features & How to Use
1. Loading the Database
Because the database contains nearly 25,000 cards with full metadata, it is cached locally to ensure instant searches without triggering API rate limits.

When you open your GitHub Pages site, click the large green LOAD DATABASE button at the top.

The app will download heritage_cards.json, confirm the total card count, and display the exact date and time the database was last refreshed.

2. Searching the Database
Once the database is loaded, use the advanced search parameters to filter cards:

Name Keyword: Type a string (e.g., Lightning) to filter by card name.

Type Dropdown: Filter cards by major permanent/spell types (Artifact, Creature, Enchantment, Instant, Land, Planeswalker, Sorcery).

Rules Text Keyword: Search the Oracle text box for specific mechanics or phrases (e.g., proliferate or draw a card).

Click Search Heritage to view a visual card gallery displaying up to 50 matching results. Clicking any card image opens its official Scryfall page.

3. Decklist Legality Checker
Verify whether an entire deck is legal for Heritage format:

Prepare a standard text (.txt) decklist file exported from tools like Moxfield or Archidekt.

Click Choose File under the Decklist Legality Checker section, select your .txt file, and click Check Legality.

The script automatically strips leading quantities (e.g., 1x), ignores sideboards, commanders, and basic lands, and cross-references every card against your local memory cache.

A report will immediately output a ✓ LEGAL or ✗ ILLEGAL verdict for every card in the list.

Maintaining and Updating the Database
Whenever a new Standard set is released or the official EDH banlist updates, your local cache needs to reflect those changes. You can refresh the database automatically through GitHub without touching local code:

Go to your repository on GitHub.

Click on the Actions tab at the top.

Select Update Heritage Database in the left sidebar.

Click the Run workflow dropdown on the right side, leave it on the main branch, and click the green Run workflow button.

GitHub's cloud runner will safely execute the pagination script over ~90 seconds, compile the fresh ~25,000-card dataset with an updated timestamp, and push the new heritage_cards.json directly to your repository.