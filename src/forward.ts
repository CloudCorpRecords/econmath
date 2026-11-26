/**
 * econmath core: a forwarding client for the hosted
 * Economicium MCP server.
 *
 * Nothing is computed here. tools/list is answered from
 * the literal definitions below, which reproduce a live
 * capture of the upstream server word for word (name,
 * title, description and inputSchema exactly as captured;
 * the capture carries title keys on every tool and
 * $schema keys on every inputSchema, all served verbatim).
 * A tools/call travels upstream over a streamable-HTTP
 * JSON-RPC session: an initialize POST, a
 * notifications/initialized POST, then the tools/call
 * POST, carrying the Mcp-Session-Id response header on
 * later requests when the upstream issues one. The
 * session opens lazily on the first forwarded call and
 * is reused for the client's lifetime.
 *
 * The endpoint is pinned to
 * https://economicium-mcp.economicium.workers.dev/mcp and may be replaced
 * with the ECONMATH_MCP_URL environment variable
 * (that override is a labelled reconstruction). The
 * registry record declares NO headers on the upstream
 * remote, so no auth header is ever sent, under any
 * environment.
 *
 * A successful upstream result is returned exactly as
 * received, isError flag and extra fields included.
 * Failures -- an upstream JSON-RPC error, a non-2xx
 * status, a body that cannot be parsed, or a fetch
 * that throws or times out -- become an isError result
 * whose text begins with `econmath error:` (that
 * rendering is a labelled reconstruction). Replies may
 * be plain JSON or SSE (`data:` lines); the JSON-RPC
 * message whose id matches the request wins.
 */
import type {
  FetchFn,
  FetchResponseLike,
  ForwardDeps,
  ToolArgs,
  ToolDef,
  ToolResult,
} from "./types.js";

export const VERSION = "0.1.0";

export const DEFAULT_ENDPOINT_URL = "https://economicium-mcp.economicium.workers.dev/mcp";

export const DEFAULT_TIMEOUT_MS = 30000;

export const PROTOCOL_VERSION = "2025-03-26";

/* ------------------------------------------------------------------ */
/* Tool definitions (tools/list literals, verbatim from the live       */
/* capture in harness/fixtures/economicium-tools.json; generated       */
/* programmatically by parsing and re-serialising the fixture JSON,     */
/* never retyped). All 18 captured tools are built.                    */
/* ------------------------------------------------------------------ */

export const TOOL_DEFS: ToolDef[] = [
  {
    "name": "risk_reward",
    "title": "Risk/reward ratio",
    "description": "Reward:risk ratio, breakeven win rate, and expectancy in R multiples from an entry, stop and target.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "entry": {
          "type": "number",
        "description": "Entry price of the trade",
        },
        "stop": {
          "type": "number",
        "description": "Stop-loss price of the trade",
        },
        "target": {
          "type": "number",
        "description": "Profit-target price of the trade",
        },
        "winRatePct": {
          "description": "Expected win rate, 0-100",
          "type": "number"
        }
      },
      "required": [
        "entry",
        "stop",
        "target",
        "winRatePct"
      ],
      "type": "object"
    }
  },
  {
    "name": "position_size",
    "title": "Position size",
    "description": "Lot size, units and per-lot pip value from account risk, a stop distance, and an instrument.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "accountBalance": {
          "type": "number",
        "description": "Account balance the risk fraction is taken from",
        },
        "accountCurrency": {
          "description": "Account currency, e.g. \"USD\". Defaults to the instrument's own quote currency.",
          "type": "string"
        },
        "contractSize": {
          "description": "Override the instrument's default contract size",
          "type": "number"
        },
        "conversionRate": {
          "description": "Override the quote-to-account conversion rate",
          "type": "number"
        },
        "riskPct": {
          "description": "Percent of the account to risk, e.g. 1 for 1%",
          "type": "number"
        },
        "stopDistance": {
          "description": "Stop distance in price units (pips x pip size, or |entry - stop|)",
          "type": "number"
        },
        "symbol": {
          "description": "Instrument symbol. One of: EURUSD (EUR/USD), GBPUSD (GBP/USD), USDJPY (USD/JPY), USDCHF (USD/CHF), AUDUSD (AUD/USD), USDCAD (USD/CAD), NZDUSD (NZD/USD), EURGBP (EUR/GBP), EURJPY (EUR/JPY), GBPJPY (GBP/JPY), XAUUSD (Gold (XAU/USD)), XAGUSD (Silver (XAG/USD)), USOIL (WTI Crude (USOIL)), US30 (Dow Jones (US30)), NAS100 (Nasdaq 100 (NAS100)), SPX500 (S&P 500 (SPX500)), GER40 (DAX (GER40)), BTCUSD (Bitcoin (BTC/USD)), ETHUSD (Ethereum (ETH/USD))",
          "type": "string"
        }
      },
      "required": [
        "symbol",
        "accountBalance",
        "riskPct",
        "stopDistance"
      ],
      "type": "object"
    }
  },
  {
    "name": "pip_value",
    "title": "Pip value",
    "description": "Cash value of one pip/point for a given instrument, lot size and account currency.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "accountCurrency": {
          "description": "Account currency, e.g. \"USD\". Defaults to the instrument's own quote currency.",
          "type": "string"
        },
        "contractSize": {
          "type": "number",
        "description": "Contract size (units per lot) of the instrument",
        },
        "lots": {
          "type": "number",
        "description": "Position size in lots",
        },
        "pipSize": {
          "type": "number",
        "description": "Size of one pip or point for the instrument",
        },
        "symbol": {
          "description": "Instrument symbol. One of: EURUSD (EUR/USD), GBPUSD (GBP/USD), USDJPY (USD/JPY), USDCHF (USD/CHF), AUDUSD (AUD/USD), USDCAD (USD/CAD), NZDUSD (NZD/USD), EURGBP (EUR/GBP), EURJPY (EUR/JPY), GBPJPY (GBP/JPY), XAUUSD (Gold (XAU/USD)), XAGUSD (Silver (XAG/USD)), USOIL (WTI Crude (USOIL)), US30 (Dow Jones (US30)), NAS100 (Nasdaq 100 (NAS100)), SPX500 (S&P 500 (SPX500)), GER40 (DAX (GER40)), BTCUSD (Bitcoin (BTC/USD)), ETHUSD (Ethereum (ETH/USD))",
          "type": "string"
        }
      },
      "required": [
        "symbol",
        "lots"
      ],
      "type": "object"
    }
  },
  {
    "name": "margin",
    "title": "Required margin",
    "description": "Notional value, required margin, and effective leverage for a leveraged position.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "accountCurrency": {
          "description": "Account currency, e.g. \"USD\". Defaults to the instrument's own quote currency.",
          "type": "string"
        },
        "accountEquity": {
          "description": "Account equity, used to compute effective leverage and % of equity used",
          "type": "number"
        },
        "contractSize": {
          "type": "number",
        "description": "Contract size (units per lot) of the instrument",
        },
        "leverage": {
          "type": "number",
        "description": "Leverage applied to the position",
        },
        "lots": {
          "type": "number",
        "description": "Position size in lots",
        },
        "price": {
          "type": "number",
        "description": "Current price of the instrument",
        },
        "symbol": {
          "description": "Instrument symbol. One of: EURUSD (EUR/USD), GBPUSD (GBP/USD), USDJPY (USD/JPY), USDCHF (USD/CHF), AUDUSD (AUD/USD), USDCAD (USD/CAD), NZDUSD (NZD/USD), EURGBP (EUR/GBP), EURJPY (EUR/JPY), GBPJPY (GBP/JPY), XAUUSD (Gold (XAU/USD)), XAGUSD (Silver (XAG/USD)), USOIL (WTI Crude (USOIL)), US30 (Dow Jones (US30)), NAS100 (Nasdaq 100 (NAS100)), SPX500 (S&P 500 (SPX500)), GER40 (DAX (GER40)), BTCUSD (Bitcoin (BTC/USD)), ETHUSD (Ethereum (ETH/USD))",
          "type": "string"
        }
      },
      "required": [
        "symbol",
        "lots",
        "price",
        "leverage"
      ],
      "type": "object"
    }
  },
  {
    "name": "profit_loss",
    "title": "Trade profit/loss",
    "description": "Cash result, pips, and return-on-margin for a closed or hypothetical trade.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "accountCurrency": {
          "description": "Account currency, e.g. \"USD\". Defaults to the instrument's own quote currency.",
          "type": "string"
        },
        "direction": {
          "enum": [
            "buy",
            "sell"
          ],
          "type": "string",
        "description": "Trade direction: buy or sell",
        },
        "entry": {
          "type": "number",
        "description": "Entry price of the trade",
        },
        "exit": {
          "type": "number",
        "description": "Exit price of the trade",
        },
        "leverage": {
          "description": "Used to compute return-on-margin; omit to skip that figure",
          "type": "number"
        },
        "lots": {
          "type": "number",
        "description": "Position size in lots",
        },
        "symbol": {
          "description": "Instrument symbol. One of: EURUSD (EUR/USD), GBPUSD (GBP/USD), USDJPY (USD/JPY), USDCHF (USD/CHF), AUDUSD (AUD/USD), USDCAD (USD/CAD), NZDUSD (NZD/USD), EURGBP (EUR/GBP), EURJPY (EUR/JPY), GBPJPY (GBP/JPY), XAUUSD (Gold (XAU/USD)), XAGUSD (Silver (XAG/USD)), USOIL (WTI Crude (USOIL)), US30 (Dow Jones (US30)), NAS100 (Nasdaq 100 (NAS100)), SPX500 (S&P 500 (SPX500)), GER40 (DAX (GER40)), BTCUSD (Bitcoin (BTC/USD)), ETHUSD (Ethereum (ETH/USD))",
          "type": "string"
        }
      },
      "required": [
        "symbol",
        "direction",
        "lots",
        "entry",
        "exit"
      ],
      "type": "object"
    }
  },
  {
    "name": "compounding",
    "title": "Compounding growth",
    "description": "Account growth curve, total return and the gain from compounding vs. simple interest.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "contribution": {
          "description": "Recurring contribution added each period",
          "type": "number"
        },
        "periods": {
          "description": "Number of periods to compound over (max 600)",
          "type": "number"
        },
        "ratePct": {
          "description": "Return per period, as a percent, e.g. 1 for 1%",
          "type": "number"
        },
        "start": {
          "description": "Starting balance",
          "type": "number"
        }
      },
      "required": [
        "start",
        "ratePct",
        "periods"
      ],
      "type": "object"
    }
  },
  {
    "name": "pivot_points",
    "title": "Pivot points",
    "description": "Classic, Fibonacci, Camarilla and Woodie support/resistance levels from a prior high, low and close.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "close": {
          "type": "number",
        "description": "Prior period closing price",
        },
        "high": {
          "type": "number",
        "description": "High price of the prior period or swing",
        },
        "low": {
          "type": "number",
        "description": "Low price of the prior period or swing",
        }
      },
      "required": [
        "high",
        "low",
        "close"
      ],
      "type": "object"
    }
  },
  {
    "name": "fibonacci_levels",
    "title": "Fibonacci retracement/extension levels",
    "description": "Retracement (0-100%) and extension (127.2-261.8%) price levels for a swing high/low.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "direction": {
          "description": "The swing's own direction",
          "enum": [
            "up",
            "down"
          ],
          "type": "string"
        },
        "high": {
          "type": "number",
        "description": "High price of the prior period or swing",
        },
        "low": {
          "type": "number",
        "description": "Low price of the prior period or swing",
        }
      },
      "required": [
        "high",
        "low",
        "direction"
      ],
      "type": "object"
    }
  },
  {
    "name": "liquidation_price",
    "title": "Liquidation price",
    "description": "Estimated liquidation price and distance from entry for a leveraged crypto position.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "crossBalance": {
          "description": "Wallet balance backing the position, cross mode only",
          "type": "number"
        },
        "entry": {
          "type": "number",
        "description": "Entry price of the trade",
        },
        "leverage": {
          "type": "number",
        "description": "Leverage applied to the position",
        },
        "maintenanceMarginRatePct": {
          "description": "Exchange maintenance margin rate, as a percent",
          "type": "number"
        },
        "mode": {
          "enum": [
            "cross",
            "isolated"
          ],
          "type": "string",
        "description": "Margin mode: cross or isolated",
        },
        "qty": {
          "type": "number",
        "description": "Position quantity",
        },
        "side": {
          "enum": [
            "long",
            "short"
          ],
          "type": "string",
        "description": "Position side: long or short",
        }
      },
      "required": [
        "side",
        "mode",
        "entry",
        "leverage",
        "maintenanceMarginRatePct",
        "qty"
      ],
      "type": "object"
    }
  },
  {
    "name": "rmd",
    "title": "Required minimum distribution",
    "description": "This year's RMD from a prior-year-end IRA/employer-plan balance and age, per the IRS Uniform Lifetime Table.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "age": {
          "description": "Age at the end of this year",
          "type": "number"
        },
        "priorYearBalance": {
          "type": "number",
        "description": "Prior year-end account balance",
        }
      },
      "required": [
        "priorYearBalance",
        "age"
      ],
      "type": "object"
    }
  },
  {
    "name": "ibond_value",
    "title": "Series I savings bond value",
    "description": "Accrued and redeemable value of a Series I savings bond, from its issue month, face value and an as-of month.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "asOfMonth": {
          "description": "YYYY-MM",
          "type": "string"
        },
        "faceValue": {
          "type": "number",
        "description": "Face value of the bond",
        },
        "issueMonth": {
          "description": "YYYY-MM",
          "type": "string"
        }
      },
      "required": [
        "issueMonth",
        "asOfMonth",
        "faceValue"
      ],
      "type": "object"
    }
  },
  {
    "name": "financial_health_score",
    "title": "Financial health score",
    "description": "A 0-100 score from savings rate, emergency fund coverage and debt-to-income, each against a named benchmark.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "emergencyFund": {
          "type": "number",
        "description": "Emergency fund balance",
        },
        "monthlyDebtPayments": {
          "type": "number",
        "description": "Total monthly debt payments",
        },
        "monthlyExpenses": {
          "type": "number",
        "description": "Total monthly expenses",
        },
        "monthlyIncome": {
          "type": "number",
        "description": "Total monthly income",
        }
      },
      "required": [
        "monthlyIncome",
        "monthlyExpenses",
        "emergencyFund",
        "monthlyDebtPayments"
      ],
      "type": "object"
    }
  },
  {
    "name": "real_wage",
    "title": "Real wage / did my raise beat inflation",
    "description": "Whether a pay change kept pace with inflation, in real (inflation-adjusted) terms, using annual US CPI.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "newPay": {
          "type": "number",
        "description": "Pay after the change",
        },
        "newYear": {
          "type": "number",
        "description": "Year of the new pay",
        },
        "oldPay": {
          "type": "number",
        "description": "Pay before the change",
        },
        "oldYear": {
          "type": "number",
        "description": "Year of the old pay",
        }
      },
      "required": [
        "oldPay",
        "oldYear",
        "newPay",
        "newYear"
      ],
      "type": "object"
    }
  },
  {
    "name": "emergency_fund",
    "title": "Emergency fund / job-loss runway",
    "description": "How many months of runway a set of resources covers against monthly expenses, net of unemployment benefits and COBRA.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "cobra": {
          "description": "Monthly COBRA health insurance cost",
          "type": "number"
        },
        "fund": {
          "description": "Emergency fund savings",
          "type": "number"
        },
        "monthlyExpenses": {
          "type": "number",
        "description": "Total monthly expenses",
        },
        "otherResources": {
          "type": "number",
        "description": "Other resources available beyond severance",
        },
        "severance": {
          "type": "number",
        "description": "Severance amount received",
        },
        "targetMonths": {
          "description": "Target runway in months, default 6",
          "type": "number"
        },
        "unemploymentBenefit": {
          "description": "Monthly unemployment benefit",
          "type": "number"
        }
      },
      "required": [
        "monthlyExpenses"
      ],
      "type": "object"
    }
  },
  {
    "name": "coast_fire",
    "title": "Coast FIRE number",
    "description": "The amount invested today that, growing alone with no further contributions, reaches a full FIRE number by retirement age.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "age": {
          "type": "number",
        "description": "Current age",
        },
        "annualSpend": {
          "type": "number",
        "description": "Planned annual spending in retirement",
        },
        "contribMonthly": {
          "type": "number",
        "description": "Monthly contribution still being made",
        },
        "feesPct": {
          "description": "Annual investment fee drag, as a percent",
          "type": "number"
        },
        "inflationPct": {
          "type": "number",
        "description": "Assumed annual inflation rate, in percent",
        },
        "invested": {
          "type": "number",
        "description": "Amount currently invested",
        },
        "nominalReturnPct": {
          "description": "Expected annual nominal investment return, as a percent",
          "type": "number"
        },
        "otherAnnualIncome": {
          "description": "e.g. Social Security, pension",
          "type": "number"
        },
        "retireAge": {
          "type": "number",
        "description": "Planned retirement age",
        },
        "safeWithdrawalRatePct": {
          "description": "e.g. 4 for the 4% rule",
          "type": "number"
        }
      },
      "required": [
        "age",
        "retireAge",
        "invested",
        "annualSpend",
        "nominalReturnPct",
        "inflationPct",
        "safeWithdrawalRatePct"
      ],
      "type": "object"
    }
  },
  {
    "name": "inflation_adjust",
    "title": "US inflation calculator",
    "description": "What a dollar amount in one year is worth in another year's dollars, based on annual US CPI-U.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "amount": {
          "type": "number",
        "description": "Dollar amount to adjust for inflation",
        },
        "fromYear": {
          "type": "number",
        "description": "Year the amount is expressed in",
        },
        "toYear": {
          "type": "number",
        "description": "Year to express the amount in",
        }
      },
      "required": [
        "amount",
        "fromYear",
        "toYear"
      ],
      "type": "object"
    }
  },
  {
    "name": "fx_rate",
    "title": "Currency exchange rate",
    "description": "Daily ECB reference cross rate between two currencies.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "from": {
          "description": "Currency code, e.g. EUR",
          "type": "string"
        },
        "to": {
          "description": "Currency code, e.g. USD",
          "type": "string"
        }
      },
      "required": [
        "from",
        "to"
      ],
      "type": "object"
    }
  },
  {
    "name": "cpi_index",
    "title": "US CPI-U annual index",
    "description": "The annual (yearly-average) US CPI-U index value for a given year.",
    "inputSchema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "properties": {
        "year": {
          "type": "number",
        "description": "Year to look up",
        }
      },
      "required": [
        "year"
      ],
      "type": "object"
    }
  }
];
export const TOOL_NAMES = TOOL_DEFS.map((t) => t.name);

/** Whether `name` belongs to the captured built surface. */
export function isKnownTool(name: string): boolean {
  return TOOL_NAMES.includes(name);
}

/* ------------------------------------------------------------------ */
/* Forwarding client                                                   */
/* ------------------------------------------------------------------ */

function errorResult(detail: string): ToolResult {
  return {
    content: [{ type: "text", text: `econmath error: ${detail}` }],
    isError: true,
  };
}

function rpcErrorMessage(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message !== "") return message;
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Read a JSON-RPC response body, tolerating SSE framing.
 * Returns the message whose id matches `expectedId` when
 * present, otherwise the last parseable message, otherwise
 * null when nothing in the body parses.
 */
export function parseRpcBody(
  text: string,
  expectedId?: number,
): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const candidates: Record<string, unknown>[] = [];
  const tryPush = (payload: string): void => {
    try {
      const parsed: unknown = JSON.parse(payload);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        candidates.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Not a JSON payload; skip this candidate.
    }
  };
  if (trimmed.includes("data:")) {
    for (const line of trimmed.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice("data:".length).trim();
      if (payload !== "" && payload !== "[DONE]") tryPush(payload);
    }
  } else {
    tryPush(trimmed);
  }
  if (candidates.length === 0) return null;
  if (expectedId !== undefined) {
    const match = candidates.find((c) => c.id === expectedId);
    if (match !== undefined) return match;
  }
  return candidates[candidates.length - 1];
}

async function defaultFetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
): Promise<FetchResponseLike> {
  return fetch(url, init) as unknown as FetchResponseLike;
}

/**
 * A forwarding client holding a single upstream session,
 * opened lazily on first use and reused from then on
 * (for the process lifetime in the MCP server, or for a
 * single invocation in the CLI).
 */
export class EconmathClient {
  private readonly deps: ForwardDeps;
  private sessionId: string | null = null;
  private ready = false;
  private sessionPromise: Promise<void> | null = null;
  private idCounter = 0;

  constructor(deps: ForwardDeps = {}) {
    this.deps = deps;
  }

  private fetchFn(): FetchFn {
    return this.deps.fetchFn ?? defaultFetch;
  }

  private endpointUrl(): string {
    if (this.deps.url && this.deps.url.trim() !== "") return this.deps.url.trim();
    const raw = (this.deps.env ?? process.env).ECONMATH_MCP_URL;
    if (raw && raw.trim() !== "") return raw.trim();
    return DEFAULT_ENDPOINT_URL;
  }

  private timeoutMs(): number {
    if (typeof this.deps.timeoutMs === "number" && this.deps.timeoutMs > 0) {
      return this.deps.timeoutMs;
    }
    return DEFAULT_TIMEOUT_MS;
  }

  private nextId(): number {
    this.idCounter += 1;
    return this.idCounter;
  }

  private async post(
    body: unknown,
    withSession: boolean,
  ): Promise<FetchResponseLike> {
    // The registry record declares NO headers on the upstream
    // remote: no Authorization header is ever sent.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (withSession && this.sessionId !== null) {
      headers["Mcp-Session-Id"] = this.sessionId;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());
    try {
      return await this.fetchFn()(this.endpointUrl(), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private async ensureSession(): Promise<void> {
    if (this.ready) return;
    if (this.sessionPromise === null) {
      this.sessionPromise = (async () => {
        const initId = this.nextId();
        const initRes = await this.post(
          {
            jsonrpc: "2.0",
            id: initId,
            method: "initialize",
            params: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: {},
              clientInfo: { name: "econmath", version: VERSION },
            },
          },
          false,
        );
        const sessionId = initRes.headers.get("mcp-session-id");
        if (sessionId) this.sessionId = sessionId;
        const initText = await initRes.text();
        const initParsed = parseRpcBody(initText, initId);
        if (initParsed !== null && initParsed.error) {
          throw new Error(rpcErrorMessage(initParsed.error));
        }
        if (initRes.status < 200 || initRes.status >= 300) {
          throw new Error(`HTTP ${initRes.status}`);
        }
        if (initParsed === null && initText.trim() !== "") {
          throw new Error("malformed response");
        }
        const initializedRes = await this.post(
          { jsonrpc: "2.0", method: "notifications/initialized" },
          true,
        );
        try {
          await initializedRes.text();
        } catch {
          // Nothing needed from the notification response body.
        }
        this.ready = true;
      })();
    }
    try {
      await this.sessionPromise;
    } catch (err) {
      this.sessionPromise = null;
      this.sessionId = null;
      throw err;
    }
  }

  /** Forward one tool call; upstream failures come back as isError results. */
  async callTool(name: string, args: ToolArgs): Promise<ToolResult> {
    try {
      await this.ensureSession();
    } catch (err) {
      return errorResult(err instanceof Error ? err.message : String(err));
    }

    const callId = this.nextId();
    let callRes: FetchResponseLike;
    try {
      callRes = await this.post(
        {
          jsonrpc: "2.0",
          id: callId,
          method: "tools/call",
          params: { name, arguments: args ?? {} },
        },
        true,
      );
    } catch (err) {
      return errorResult(
        `request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const parsed = parseRpcBody(await callRes.text(), callId);
    if (parsed !== null && parsed.error) {
      return errorResult(rpcErrorMessage(parsed.error));
    }
    if (callRes.status < 200 || callRes.status >= 300) {
      return errorResult(`HTTP ${callRes.status}`);
    }
    if (parsed === null) return errorResult("malformed response");
    const result = parsed.result as ToolResult | undefined;
    if (result === undefined || result === null || typeof result !== "object") {
      return errorResult("malformed response");
    }
    // Hand the upstream result back exactly as received.
    return result;
  }
}

/** Build a forwarding client; tests inject a fake fetch and env through deps. */
export function createClient(deps: ForwardDeps = {}): EconmathClient {
  return new EconmathClient(deps);
}

/** One-shot helper: a fresh client for a single call (the CLI path). */
export async function callTool(
  name: string,
  args: ToolArgs,
  deps: ForwardDeps = {},
): Promise<ToolResult> {
  return new EconmathClient(deps).callTool(name, args);
}
