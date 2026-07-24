# @documentero/mcp

Official [MCP](https://modelcontextprotocol.io) server for [Documentero](https://www.documentero.com) — list templates, inspect field schemas, and generate Word/PDF/Excel documents from AI agents (Cursor, Claude Desktop, and more).

- **npm:** [`@documentero/mcp`](https://www.npmjs.com/package/@documentero/mcp)
- **Source:** [github.com/documentero/documentero-mcp](https://github.com/documentero/documentero-mcp)
- **Website:** [documentero.com](https://documentero.com/)
- **Docs:** [docs.documentero.com](https://docs.documentero.com/documentation)

## Tools

| Tool | Description |
|------|-------------|
| `list_templates` | Templates with `kind` (word\|excel), `defaultFormat`, `allowedFormats` |
| `get_template_fields` | JSON Schema (primary, enriched value rules) + field definitions + allowed formats |
| `generate_document` | Generate Word/PDF or Excel document for given template and fields; signed URL (~1h) by default, or base64 if `embed: true`. `format` optional (template default). |

## Setup

1. Copy your API key from Documentero → Account settings.
2. Add the MCP server to your client config.

### Cursor / Claude Desktop (npx)

```json
{
  "mcpServers": {
    "documentero": {
      "command": "npx",
      "args": ["-y", "@documentero/mcp"],
      "env": {
        "DOCUMENTERO_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Local development

```bash
git clone https://github.com/documentero/documentero-mcp.git
cd documentero-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "documentero": {
      "command": "node",
      "args": ["/absolute/path/to/documentero-mcp/dist/index.js"],
      "env": {
        "DOCUMENTERO_API_KEY": "your-api-key",
        "DOCUMENTERO_BASE_URL": "https://app.documentero.com/api"
      }
    }
  }
}
```

Use `https://documentero-dev.web.app/api` for the development environment.

## Environment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCUMENTERO_API_KEY` | yes | — | Company API key ([Account settings](https://app.documentero.com)) |
| `DOCUMENTERO_BASE_URL` | no | `https://app.documentero.com/api` | Cloud API base URL |

## Typical agent flow

1. `list_templates` → pick a `templateId` (respect `kind` / `allowedFormats`)
2. `get_template_fields` → shape `data` from **`jsonSchema`** (use `fieldDefinitions` for extra context like HTML/Markdown/image/link/QR rules)
3. `generate_document` → download URL (or embedded base64)

## Smoke test

```bash
npm run build
DOCUMENTERO_API_KEY=your-key npm run smoke
```

## Notes

- Thin client of the public Cloud API (`/api/templates`, `/api/meta`, `/api/generate`). Quotas and rate limits are enforced by Documentero as usual.
- Do not put the API key in tool arguments — keep it in MCP env only.
- Word templates support output format: `docx` / `pdf`; Excel templates support output format: `xlsx` only.
- Remote Streamable HTTP hosting (`https://mcp.documentero.com/mcp`) is planned; this release is **stdio only**.

## License

MIT © Documentero
