# econmath

Need a finance figure without spinning up a spreadsheet? econmath is a local forwarding client for the hosted Economicium MCP service: it answers `tools/list` locally from the captured tool definitions and forwards every call to the service, returning the answers exactly as the service sends them back.

All eighteen tools are calculators over numbers you supply, plus two reference reads over public data (annual US CPI-U and daily ECB reference rates). The trading tools size hypothetical or closed trades — none of them places an order, connects to a broker, or moves money. The personal-finance tools cover compounding, retirement withdrawals, I-bond values, emergency-fund runway, Coast FIRE, and a self-assessment health score from your own household figures.

## The tools

- **`risk_reward`** — Reward:risk ratio, breakeven win rate, and expectancy in R multiples from an `entry`, `stop` and `target`; `winRatePct` is required too.
- **`position_size`** — Lot size, units and per-lot pip value from a `symbol`, `accountBalance`, `riskPct` and `stopDistance`.
- **`pip_value`** — Cash value of one pip/point for a `symbol` and `lots`.
- **`margin`** — Notional value, required margin, and effective leverage for a `symbol`, `lots`, `price` and `leverage`.
- **`profit_loss`** — Cash result, pips, and return-on-margin for a closed or hypothetical trade: `symbol`, `direction` (buy/sell), `lots`, `entry`, `exit`.
- **`compounding`** — Growth curve, total return and the compounding-vs-simple gain from a `start`, `ratePct` and `periods`.
- **`pivot_points`** — Classic, Fibonacci, Camarilla and Woodie support/resistance levels from a prior `high`, `low` and `close`.
- **`fibonacci_levels`** — Retracement (0-100%) and extension (127.2-261.8%) levels for a swing `high`/`low` and its `direction`.
- **`liquidation_price`** — Estimated liquidation price and distance from entry for a leveraged crypto position: `side`, `mode`, `entry`, `leverage`, `maintenanceMarginRatePct`, `qty`.
- **`rmd`** — This year's required minimum distribution from a `priorYearBalance` and `age`, per the IRS Uniform Lifetime Table.
- **`ibond_value`** — Accrued and redeemable value of a Series I savings bond from its `issueMonth`, `asOfMonth` and `faceValue`.
- **`financial_health_score`** — A 0-100 score from `monthlyIncome`, `monthlyExpenses`, `emergencyFund` and `monthlyDebtPayments`, each against a named benchmark.
- **`real_wage`** — Whether a pay change kept pace with inflation: `oldPay`/`oldYear` against `newPay`/`newYear`, using annual US CPI.
- **`emergency_fund`** — Months of job-loss runway against `monthlyExpenses`, net of unemployment benefits and COBRA.
- **`coast_fire`** — The amount invested today that reaches a full FIRE number by retirement with no further contributions: `age`, `retireAge`, `invested`, `annualSpend`, `nominalReturnPct`, `inflationPct`, `safeWithdrawalRatePct`.
- **`inflation_adjust`** — What an `amount` in `fromYear` is worth in `toYear` dollars, based on annual US CPI-U.
- **`fx_rate`** — Daily ECB reference cross rate between two currency codes, `from` and `to`.
- **`cpi_index`** — The annual (yearly-average) US CPI-U index value for a `year`.

## Install and run

As an MCP server via npm:

```bash
npx -y @reneturcios/econmath mcp
```

MCP client configuration:

```json
{
  "mcpServers": {
    "econmath": {
      "command": "npx",
      "args": ["-y", "@reneturcios/econmath", "mcp"]
    }
  }
}
```

As a container:

```bash
docker run -i ghcr.io/cloudcorprecords/econmath
docker run --rm ghcr.io/cloudcorprecords/econmath fx_rate '{"from":"EUR","to":"USD"}'
```

## CLI

One binary serves both the command line and the MCP server. Each tool is a subcommand taking a single JSON string with that tool's arguments:

```bash
econmath risk_reward '{"entry":100,"stop":95,"target":115,"winRatePct":50}'
econmath position_size '{"symbol":"EURUSD","accountBalance":10000,"riskPct":1,"stopDistance":0.005}'
econmath pivot_points '{"high":110,"low":100,"close":105}'
econmath coast_fire '{"age":35,"retireAge":65,"invested":100000,"annualSpend":40000,"nominalReturnPct":7,"inflationPct":3,"safeWithdrawalRatePct":4}'
econmath fx_rate '{"from":"EUR","to":"USD"}'
econmath cpi_index '{"year":2024}'
econmath --version
```

Exit codes: `0` when the forwarded call succeeds, `1` when the upstream result is an error, and `2` for usage problems such as an unknown subcommand or a malformed JSON argument.

## Configuration

- `ECONMATH_MCP_URL` — Overrides the upstream endpoint. The default is the pinned hosted endpoint, `https://economicium-mcp.economicium.workers.dev/mcp`. (The override variable is a reconstruction added by this rebuild.)

The upstream registry record declares no headers, so no authentication header is ever sent; the tool surface was captured keyless.

Upstream failures — a JSON-RPC error from the service, a non-2xx response, an unreadable body, or a request that fails outright — are reported to the caller as an error result whose text starts with `econmath error:`.

## How forwarding works

The first forwarded call opens a session: an `initialize` request (protocol version `2025-03-26`), followed by a `notifications/initialized` notification, then the `tools/call` itself. If the service answers the initialize request with an `Mcp-Session-Id` header, that value is carried on every later request, and the open session is reused for the rest of the process. Replies are accepted either as plain JSON or as server-sent events. Successful results pass through verbatim, including any `isError` flag and any extra fields the service includes.

## Development

```bash
npm install
npm run build   # tsc -> dist/ (dist/cli.js is the bin)
npm test        # tsx --test test/*.test.ts — stubbed upstream, no network
npm run dev     # run the CLI from source
```

The test suite checks the served tool list against the captured surface (all 18 tools, deep-equal, in order, with titles served verbatim), exercises the session handshake and its reuse, verifies that no `Authorization` or `X-API-Key` header is ever sent under any environment, and verifies that arguments go upstream untouched and results come back untouched.

## License

MIT — see `LICENSE`. Copyright (c) 2026 Rene Turcios.
