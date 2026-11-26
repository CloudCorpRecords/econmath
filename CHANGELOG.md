# Changelog

## 0.1.0 (2026-10-28)

- First release: a forwarding client for the hosted Economicium MCP server. All 18 captured tools are answered locally for tools/list, and every tools/call is forwarded upstream over a streamable-HTTP JSON-RPC session (initialize, notifications/initialized, tools/call, honouring the Mcp-Session-Id header when the upstream issues one).
- Tools: `risk_reward`, `position_size`, `pip_value`, `margin`, `profit_loss`, `compounding`, `pivot_points`, `fibonacci_levels`, `liquidation_price`, `rmd`, `ibond_value`, `financial_health_score`, `real_wage`, `emergency_fund`, `coast_fire`, `inflation_adjust`, `fx_rate`, `cpi_index`. The capture carries `title` keys on every tool and `$schema` keys on every inputSchema, and both are served verbatim.
- Upstream results pass through verbatim, including the isError flag; upstream failures surface as `econmath error:` text results.
- One bin serves the CLI (one subcommand per tool, plus `--version`) and the stdio MCP server (`mcp` subcommand). The upstream endpoint can be overridden via `ECONMATH_MCP_URL`. The upstream record declares no headers, so no auth header is ever sent.
