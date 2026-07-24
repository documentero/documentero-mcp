# Publishing @documentero/mcp

Publisher identity (must match existing Documentero packages such as `n8n-nodes-documentero`):

- **GitHub org:** https://github.com/documentero/
- **npm author:** Documentero \<support@documentero.com\>
- **Support:** support@documentero.com
- **Public repo:** https://github.com/documentero/documentero-mcp
- **Local path:** sibling of the main app — `Documentero/documentero-mcp`
- **npm package:** `@documentero/mcp` (public scoped)

## Prerequisites

```bash
# GitHub (org owner/member with repo create + push)
gh auth login -h github.com

# npm (account that can publish under @documentero)
npm login
npm whoami
# Confirm access to the documentero org on npmjs.com
```

## First-time: create GitHub repo and push

From this `documentero-mcp/` directory:

```bash
cd documentero-mcp
git init
git add .
git commit -m "Initial @documentero/mcp release"
gh repo create documentero/documentero-mcp --public --source=. --remote=origin --push \
  --description "Official Documentero MCP server for AI agents"
```

Or create the empty repo in the GitHub UI under **documentero**, then:

```bash
git remote add origin https://github.com/documentero/documentero-mcp.git
git push -u origin main
```

## Publish to npm

```bash
cd documentero-mcp
npm run build
npm publish --access public
```

Verify:

```bash
npm view @documentero/mcp
npx -y @documentero/mcp
# (expects DOCUMENTERO_API_KEY; should exit with a clear error without it)
```

## After publish

1. Confirm Integrations → **MCP (AI Agents)** links resolve.
2. Optionally add a docs page under docs.documentero.com (same pattern as n8n).
3. Bump version with `npm version patch|minor` for later releases.
