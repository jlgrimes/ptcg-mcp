# Pokemon TCG Card Search MCP

This Model Context Protocol (MCP) server allows Claude to search and display Pokemon Trading Card Game cards.

## Setup Instructions

1. Update your Claude configuration file:

   - Open `/Users/ABSOLUTE_PATH_HERE/Library/Application Support/Claude/claude_desktop_config.json`
   - Add the following configuration (remove any existing MCP configurations):

   ```json
   {
     "mcpServers": {
       "ptcg-mcp": {
         "command": "node",
         "args": ["ABSOLUTE_PATH_HERE/dist/index.js"]
       }
     }
   }
   ```

2. Quit Claude:

   - Open Task Manager
   - Find and quit Claude completely

3. Restart Claude:
   - The Pokemon TCG Card Search MCP will be automatically loaded
   - You can now ask Claude questions about Pokemon cards

## Usage

Once configured, you can ask Claude questions about Pokemon cards such as:

- "Show me standard-legal basic Pokemon with free retreat"
- "Find water-type Pokemon with more than 120 HP"
- "Search for Pikachu cards"

Claude will display the matching cards with their images and relevant information.

## Features

- Search cards by name, type, subtype, legality, and more
- View high-resolution card images
- Filter by various card attributes:
  - Name (supports exact matching with `!` and wildcards with `*`)
  - Subtypes (e.g., Basic, EX, GX, V, VMAX, etc.)
  - Legalities (Standard, Expanded, Unlimited)
  - Types (Water, Fire, Grass, etc.)
  - Retreat cost
  - HP
  - National Pokedex numbers
  - And more!

## Example Queries

Here are some example queries you can try:

- "Show me standard-legal basic Pokemon with free retreat"
- "Find water-type Pokemon with more than 120 HP"
- "Search for cards with 'char\*' in their name"
- "Show me banned cards in Standard format"
- "Find EX Pokemon that evolve from Charmander"

## Query Syntax

### Name Search

- Regular search: `name:pikachu`
- Exact match: `!name:pikachu`
- Wildcard: `name:char*`
- Preserve hyphens: `name:chien-pao`

### Filters

- Types: `types:water` or `-types:water` (exclude)
- Subtypes: `subtypes:basic`
- Legalities: `legalities.standard:legal`
- HP: `hp:[100 TO 200]`
- Retreat Cost: `convertedRetreatCost:0`

### Range Queries

Use `[` and `]` for inclusive ranges, `{` and `}` for exclusive ranges:

- `hp:[100 TO 200]` - HP between 100 and 200 (inclusive)
- `hp:{100 TO 200}` - HP between 100 and 200 (exclusive)
- `hp:[* TO 100]` - HP up to 100
- `hp:[100 TO *]` - HP 100 or higher

## Response Format

The MCP returns card information including:

- Card name
- Set name
- High-resolution card image
- Card legalities
- Other card details as requested

## Notes

- The MCP uses the Pokemon TCG API to fetch card data
- Images are displayed directly from the Pokemon TCG API's CDN
- All queries are case-insensitive
- Multiple filters can be combined in a single query
