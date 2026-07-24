#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DocumenteroClient } from './client/documentero.js';
import { loadConfig } from './config.js';
import { createServer } from './server.js';

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }

  const client = new DocumenteroClient(config);

  try {
    await client.me();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to validate DOCUMENTERO_API_KEY against Documentero API';
    console.error(`API key validation failed: ${message}`);
    process.exit(1);
  }

  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
