import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

interface Card {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp: string;
  types: string[];
  evolvesTo: string[];
  attacks: Array<{
    name: string;
    cost: string[];
    damage: string;
    text: string;
  }>;
  weaknesses: Array<{
    type: string;
    value: string;
  }>;
  set: {
    name: string;
    series: string;
  };
  images: {
    small: string;
    large: string;
  };
}

interface PtcgResponse {
  data: Card[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// Create an MCP server
const server = new McpServer(
  {
    name: 'ptcg mcp server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

server.tool(
  'pokemon-card-search',
  'Searches for Pokemon cards',
  {
    name: z
      .string()
      .describe(
        'The name of the card. Exclude all possible subtypes that are detected from the query in this field. IMPORTANT: For hyphenated names like "chien-pao", you MUST preserve the hyphen exactly as it appears. For example, "chien-pao ex" should have name "chien-pao" (with the hyphen) and subtypes ["EX"]. Never remove or modify hyphens in the name.'
      ),
    subtypes: z
      .array(
        z.enum([
          'BREAK',
          'Baby',
          'Basic',
          'EX',
          'GX',
          'Goldenrod Game Corner',
          'Item',
          'LEGEND',
          'Level-Up',
          'MEGA',
          'Pokémon Tool',
          'Pokémon Tool F',
          'Rapid Strike',
          'Restored',
          "Rocket's Secret Machine",
          'Single Strike',
          'Special',
          'Stadium',
          'Stage 1',
          'Stage 2',
          'Supporter',
          'TAG TEAM',
          'Technical Machine',
          'V',
          'VMAX',
        ])
      )
      .optional()
      .describe(
        'ALWAYS try to extract subtypes from the query. For example, "chien pao ex" should have name "chien pao" and subtypes ["EX"]. If multiple subtypes are present like "basic pikachu ex", use ["Basic", "EX"]. If no subtypes are found, omit this field.'
      ),
    legalities: z
      .array(z.enum(['standard', 'expanded', 'unlimited']))
      .optional()
      .describe(
        'The legalities for a given card. For each legality passed in, the value is "legal".'
      ),
  },
  async ({ name, subtypes, legalities }) => {
    const query = buildQuery(name, subtypes, legalities);
    const result = await ptcg_search(query);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.data),
        },
      ],
    };
  }
);

function buildQuery(
  name: string,
  subtypes?: string[],
  legalities?: string[]
): string {
  // Preserve the exact name as provided, including hyphens
  const parts: string[] = [`name:"${name}"`];

  function addFilter(values: string[] | undefined, field: string) {
    if (values && values.length > 0) {
      if (values.length === 1) {
        parts.push(`${field}:${values[0]}`);
      } else {
        const query = values.map(value => `${field}:${value}`).join(' OR ');
        parts.push(`(${query})`);
      }
    }
  }

  addFilter(subtypes, 'subtypes');
  addFilter(legalities, 'legalities');

  return parts.join(' ');
}

async function ptcg_search(query: string): Promise<PtcgResponse> {
  const response = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(query)}`
  );
  return response.json() as Promise<PtcgResponse>;
}

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
