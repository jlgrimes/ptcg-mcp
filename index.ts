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
  regulationMark?: string;
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices: {
      holofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number;
      };
      normal?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number;
      };
      reverseHolofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow: number;
      };
    };
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: {
      averageSellPrice: number;
      lowPrice: number;
      trendPrice: number;
      germanProLow: number;
      suggestedPrice: number;
      reverseHoloSell: number;
      reverseHoloLow: number;
      reverseHoloTrend: number;
      lowPriceExPlus: number;
      avg1: number;
      avg7: number;
      avg30: number;
      reverseHoloAvg1: number;
      reverseHoloAvg7: number;
      reverseHoloAvg30: number;
    };
  };
}

interface PtcgResponse {
  data: Card[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

// Standardized field descriptions
const FIELD_DESCRIPTIONS = {
  EXACT_MATCH:
    'Use ! for exact matching (e.g., "!value" to match only exact value).',
  RANGE_INCLUSIVE:
    'Use [ and ] for inclusive ranges (e.g., [1 TO 3] for values 1-3).',
  RANGE_EXCLUSIVE:
    'Use { and } for exclusive ranges (e.g., {1 TO 3} for values more than 1 and less than 3).',
  RANGE_UNBOUNDED:
    'Use * for unbounded ranges (e.g., [* TO 100] for values up to 100, or [100 TO *] for values 100 or higher).',
  NEGATIVE_FILTER:
    'Use negative values with a "-" prefix to exclude values (e.g., ["-value"] to exclude value).',
  MULTIPLE_VALUES:
    'For multiple values, use an array (e.g., ["value1", "value2"]).',
  EXTRACT_EXPLICIT:
    'IMPORTANT: Only extract values that are explicitly specified in the query. Do not infer or guess values. Do not provide default values. If a value is not explicitly mentioned, omit the field entirely. Do not try to be systematic or methodical - just query exactly what was asked for.',
  NO_INFERENCE:
    'CRITICAL: Never infer or guess values. Never provide default values. Never make assumptions about what the user might want. Never try to be systematic or methodical. Never try to find "specific examples". Just query exactly what was asked for, nothing more and nothing less.',
  DIRECT_QUERY:
    'CRITICAL: Query exactly what was asked for. Do not try to be systematic. Do not try to find specific examples. Do not try to be methodical. Just make the exact query requested.',
  EXCLUDE_SUBTYPES:
    'Exclude all possible subtypes that are detected from the query in this field.',
  PRESERVE_HYPHEN:
    'IMPORTANT: For hyphenated names like "chien-pao", you MUST preserve the hyphen exactly as it appears.',
  WILDCARD_MATCH:
    'Use * for wildcard matching (e.g., "char*" to match all cards starting with "char", or "char*der" to match cards starting with "char" and ending with "der").',
  NESTED_FIELD:
    'Use dot notation (.) to search nested fields (e.g., "set.id:sm1" for set ID, "attacks.name:Spelunk" for attack names).',
} as const;

// Reusable description components
const DESCRIPTION_COMPONENTS = {
  NUMERICAL: `${FIELD_DESCRIPTIONS.EXACT_MATCH} ${FIELD_DESCRIPTIONS.RANGE_INCLUSIVE} ${FIELD_DESCRIPTIONS.RANGE_EXCLUSIVE} ${FIELD_DESCRIPTIONS.RANGE_UNBOUNDED}`,
  FILTERABLE: `${FIELD_DESCRIPTIONS.NEGATIVE_FILTER} ${FIELD_DESCRIPTIONS.EXACT_MATCH}`,
  NESTED: `${FIELD_DESCRIPTIONS.NESTED_FIELD}`,
  STRICT_EXTRACT: `${FIELD_DESCRIPTIONS.EXTRACT_EXPLICIT} ${FIELD_DESCRIPTIONS.NO_INFERENCE} ${FIELD_DESCRIPTIONS.DIRECT_QUERY}`,
} as const;

// Field-specific descriptions
const FIELD_DESCRIPTIONS_SPECIFIC = {
  NAME: `${FIELD_DESCRIPTIONS.NO_INFERENCE} ${FIELD_DESCRIPTIONS.DIRECT_QUERY} ${FIELD_DESCRIPTIONS.PRESERVE_HYPHEN} For example, "chien-pao ex" should have name "chien-pao" (with the hyphen) and subtypes ["EX"]. Never remove or modify hyphens in the name. ${FIELD_DESCRIPTIONS.WILDCARD_MATCH} ${FIELD_DESCRIPTIONS.EXACT_MATCH} IMPORTANT: If no name is explicitly provided in the query, do not include a name field at all.`,

  SUBTYPES: `${FIELD_DESCRIPTIONS.NO_INFERENCE} ${FIELD_DESCRIPTIONS.DIRECT_QUERY} For example, "chien pao ex" should have name "chien pao" and subtypes ["EX"]. If multiple subtypes are present like "basic pikachu ex", use ["Basic", "EX"]. ${DESCRIPTION_COMPONENTS.FILTERABLE} If no subtypes are explicitly mentioned in the query, omit this field entirely.`,

  LEGALITIES: `${FIELD_DESCRIPTIONS.NO_INFERENCE} ${FIELD_DESCRIPTIONS.DIRECT_QUERY} The legalities for a given card. For each legality passed in, the value is "legal" without quotes. ${DESCRIPTION_COMPONENTS.FILTERABLE} ${DESCRIPTION_COMPONENTS.NESTED} For example, "legalities.standard:banned" to find cards banned in Standard. If no legalities are explicitly mentioned, omit this field entirely.`,

  CONVERTED_RETREAT_COST: `${FIELD_DESCRIPTIONS.NO_INFERENCE} ${FIELD_DESCRIPTIONS.DIRECT_QUERY} The converted retreat cost for a given Pokemon card. If no converted retreat cost is explicitly mentioned, omit this field. If the user explicitly specifies "free retreat", set this to 0. ${DESCRIPTION_COMPONENTS.NUMERICAL}`,

  HP: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The HP (Hit Points) of the Pokemon card. ${DESCRIPTION_COMPONENTS.NUMERICAL} If no HP is explicitly mentioned, omit this field entirely.`,

  NATIONAL_POKEDEX_NUMBERS: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The National Pokedex numbers of the Pokemon. ${DESCRIPTION_COMPONENTS.NUMERICAL} If no Pokedex numbers are explicitly mentioned, omit this field entirely.`,

  PAGE: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The page number for pagination. ${DESCRIPTION_COMPONENTS.NUMERICAL} If no page is explicitly mentioned, omit this field entirely.`,

  PAGE_SIZE: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The number of cards per page. ${DESCRIPTION_COMPONENTS.NUMERICAL} If no page size is explicitly mentioned, omit this field entirely.`,

  TYPES: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The types of the Pokemon card (e.g., ["Grass", "Psychic"]). ${DESCRIPTION_COMPONENTS.FILTERABLE} If no types are explicitly mentioned, omit this field entirely.`,

  EVOLVES_TO: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The Pokemon this card evolves into. ${DESCRIPTION_COMPONENTS.FILTERABLE} If no evolution information is explicitly mentioned, omit this field entirely.`,

  SET: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The set information for this card. ${DESCRIPTION_COMPONENTS.NESTED} For example, "set.id:sm1" to find cards from a specific set. If no set information is explicitly mentioned, omit this field entirely.`,

  ATTACKS: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The attacks available to this Pokemon card. ${DESCRIPTION_COMPONENTS.NESTED} For example, "attacks.name:Spelunk" to find cards with a specific attack name. If no attack information is explicitly mentioned, omit this field entirely.`,

  WEAKNESSES: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The weaknesses of this Pokemon card. ${DESCRIPTION_COMPONENTS.FILTERABLE} ${DESCRIPTION_COMPONENTS.NESTED} For example, "weaknesses.type:Water" to find cards weak to Water. If no weakness information is explicitly mentioned, omit this field entirely.`,

  PRICE_LOOKUP: `${FIELD_DESCRIPTIONS.NO_INFERENCE} Look up the current market price for a specific card. Returns both TCGPlayer and Cardmarket prices if available. If no price information is explicitly requested, omit this field entirely.`,

  REGULATION_MARK: `${FIELD_DESCRIPTIONS.NO_INFERENCE} The regulation mark (also known as "block") of the card (e.g., "F", "G", "H"). This indicates which regulation block the card belongs to. ${DESCRIPTION_COMPONENTS.FILTERABLE} If no regulation mark is explicitly mentioned, omit this field entirely.`,
} as const;

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
    name: z.string().optional().describe(FIELD_DESCRIPTIONS_SPECIFIC.NAME),
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
          'VSTAR',
          'Tera',
        ])
      )
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.SUBTYPES),
    legalities: z
      .object({
        standard: z.enum(['legal', 'banned']).optional(),
        expanded: z.enum(['legal', 'banned']).optional(),
        unlimited: z.enum(['legal', 'banned']).optional(),
      })
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.LEGALITIES),
    convertedRetreatCost: z
      .number()
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.CONVERTED_RETREAT_COST),
    hp: z.string().optional().describe(FIELD_DESCRIPTIONS_SPECIFIC.HP),
    nationalPokedexNumbers: z
      .string()
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.NATIONAL_POKEDEX_NUMBERS),
    page: z.number().optional().describe(FIELD_DESCRIPTIONS_SPECIFIC.PAGE),
    pageSize: z
      .number()
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.PAGE_SIZE),
    types: z
      .array(z.string())
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.TYPES),
    evolvesTo: z
      .array(z.string())
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.EVOLVES_TO),
    attacks: z
      .array(
        z.object({
          name: z.string(),
          cost: z.array(z.string()),
          damage: z.string(),
          text: z.string(),
        })
      )
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.ATTACKS),
    weaknesses: z
      .array(
        z.object({
          type: z.string(),
          value: z.string(),
        })
      )
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.WEAKNESSES),
    set: z
      .object({
        name: z.string(),
        series: z.string(),
      })
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.SET),
    regulationMark: z
      .string()
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.REGULATION_MARK),
  },
  async ({
    name,
    subtypes,
    legalities,
    convertedRetreatCost,
    hp,
    types,
    evolvesTo,
    attacks,
    weaknesses,
    set,
    nationalPokedexNumbers,
    page,
    pageSize,
    regulationMark,
  }) => {
    // Split types into positive and negative filters
    const positiveTypes = types?.filter(t => !t.startsWith('-')) || [];
    const negativeTypes =
      types?.filter(t => t.startsWith('-')).map(t => t.slice(1)) || [];

    let query = buildQuery(
      name,
      subtypes,
      legalities,
      hp,
      positiveTypes,
      evolvesTo,
      convertedRetreatCost,
      nationalPokedexNumbers,
      page,
      pageSize,
      set,
      attacks,
      weaknesses,
      regulationMark
    );

    // Add negative type filters
    if (negativeTypes.length > 0) {
      const negativeQuery = buildQuery(
        undefined,
        undefined,
        undefined,
        undefined,
        negativeTypes,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );
      query = `${query} ${negativeQuery}`;
    }

    const result = await ptcg_search(query);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total: result.totalCount,
            cards: result.data,
          }),
        },
      ],
    };
  }
);

server.tool(
  'pokemon-card-price',
  'Look up the current market price for a Pokemon card',
  {
    name: z.string().describe(FIELD_DESCRIPTIONS_SPECIFIC.NAME),
    set: z
      .object({
        name: z.string(),
        series: z.string(),
      })
      .optional()
      .describe(FIELD_DESCRIPTIONS_SPECIFIC.SET),
  },
  async ({ name, set }) => {
    let query = buildQuery(
      name,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      set,
      undefined,
      undefined
    );
    const result = await ptcg_search(query);

    if (!result.data.length) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'No cards found matching the criteria',
            }),
          },
        ],
      };
    }

    const card = result.data[0];
    const priceInfo = {
      name: card.name,
      set: card.set.name,
      tcgplayer: card.tcgplayer
        ? {
            url: card.tcgplayer.url,
            updatedAt: card.tcgplayer.updatedAt,
            prices: card.tcgplayer.prices,
          }
        : null,
      cardmarket: card.cardmarket
        ? {
            url: card.cardmarket.url,
            updatedAt: card.cardmarket.updatedAt,
            prices: card.cardmarket.prices,
          }
        : null,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(priceInfo),
        },
      ],
    };
  }
);

function buildQuery(
  name?: string,
  subtypes?: string[],
  legalities?:
    | {
        standard?: 'legal' | 'banned';
        expanded?: 'legal' | 'banned';
        unlimited?: 'legal' | 'banned';
      }
    | string,
  hp?: string,
  types?: string[],
  evolvesTo?: string[],
  convertedRetreatCost?: number,
  nationalPokedexNumbers?: string,
  page?: number | string,
  pageSize?: number | string,
  set?: { id?: string; name?: string; series?: string } | string,
  attacks?:
    | Array<{ name?: string; cost?: string[]; damage?: string; text?: string }>
    | string,
  weaknesses?: Array<{ type?: string; value?: string }> | string,
  regulationMark?: string
): string {
  const parts: string[] = [];

  // Handle name with special cases
  if (name) {
    if (name.startsWith('!') || name.includes('*')) {
      parts.push(`name:${name}`);
    } else {
      parts.push(`name:"${name}"`);
    }
  }

  // Generic filter handler for arrays
  function addFilter(
    values: string[] | undefined,
    field: string,
    negative = false
  ) {
    if (!values?.length) return;

    const query = values
      .map(value => {
        if (value.includes('.')) return value;
        if (value.startsWith('!')) return `${field}:${value}`;
        if (negative) return `-${field}:${value}`;
        return `${field}:${value}`;
      })
      .join(' OR ');

    parts.push(values.length === 1 ? query : `(${query})`);
  }

  // Generic nested filter handler
  function addNestedFilter(value: string | object | undefined, field: string) {
    if (!value) return;

    if (typeof value === 'string') {
      parts.push(value.includes('.') ? value : `${field}:${value}`);
    } else {
      Object.entries(value).forEach(([key, val]) => {
        if (val !== undefined) {
          parts.push(`${field}.${key}:${val}`);
        }
      });
    }
  }

  // Generic range filter handler
  function addRangeFilter(value: string | number | undefined, field: string) {
    if (!value) return;

    const strValue = String(value);
    if (
      strValue.startsWith('[') ||
      strValue.startsWith('{') ||
      strValue.startsWith('!')
    ) {
      parts.push(`${field}:${strValue}`);
    } else {
      parts.push(`${field}:${value}`);
    }
  }

  // Add all filters
  addFilter(subtypes, 'subtypes');
  addNestedFilter(legalities, 'legalities');
  addFilter(types, 'types');
  addFilter(evolvesTo, 'evolvesTo');

  addRangeFilter(hp, 'hp');
  addRangeFilter(convertedRetreatCost, 'convertedRetreatCost');
  addRangeFilter(nationalPokedexNumbers, 'nationalPokedexNumbers');
  addRangeFilter(page, 'page');
  addRangeFilter(pageSize, 'pageSize');

  addNestedFilter(set, 'set');
  addNestedFilter(attacks, 'attacks');
  addNestedFilter(weaknesses, 'weaknesses');

  // Add regulation mark filter
  if (regulationMark) {
    parts.push(`regulationMark:${regulationMark}`);
  }

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
