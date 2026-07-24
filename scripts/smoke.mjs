#!/usr/bin/env node
/**
 * Stdio MCP smoke test (Inspector-equivalent):
 * list tools → list_templates → get_template_fields → generate_document (pdf)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, '..', 'dist', 'index.js');

function loadApiKey() {
  if (process.env.DOCUMENTERO_API_KEY) {
    return process.env.DOCUMENTERO_API_KEY;
  }
  const home = JSON.parse(
    readFileSync(`${process.env.HOME}/.cursor/mcp.json`, 'utf8')
  );
  return home.mcpServers.documentero.env.DOCUMENTERO_API_KEY;
}

function textContent(result) {
  const parts = result.content ?? [];
  return parts
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('\n');
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    throw new Error('DOCUMENTERO_API_KEY not found');
  }

  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: {
      ...process.env,
      DOCUMENTERO_API_KEY: apiKey,
    },
    stderr: 'pipe',
  });

  transport.stderr?.on('data', (chunk) => {
    process.stderr.write(`[server] ${chunk}`);
  });

  const client = new Client({ name: 'documentero-smoke', version: '0.1.0' });
  await client.connect(transport);

  const steps = [];

  // 1) tools/list
  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name).sort();
  steps.push({ step: 'tools/list', ok: true, tools: toolNames });
  const expected = ['generate_document', 'get_template_fields', 'list_templates'];
  if (expected.some((name) => !toolNames.includes(name))) {
    throw new Error(`Missing tools. Got: ${toolNames.join(', ')}`);
  }

  // 2) list_templates
  const listResult = await client.callTool({ name: 'list_templates', arguments: {} });
  if (listResult.isError) {
    throw new Error(`list_templates failed: ${textContent(listResult)}`);
  }
  const listPayload = JSON.parse(textContent(listResult));
  const templates = listPayload.templates ?? [];
  steps.push({
    step: 'list_templates',
    ok: true,
    count: templates.length,
    sample: templates.slice(0, 3),
    kinds: [...new Set(templates.map((t) => t.kind))],
  });

  const target =
    templates.find((t) => t.name.includes('Umowa_o_prac')) ||
    templates.find((t) => t.id === 'IgwlbHZDGSPXKRsES8e4') ||
    templates[0];
  if (!target) {
    throw new Error('No templates returned');
  }
  if (!target.allowedFormats?.includes('pdf') && target.kind === 'word') {
    throw new Error(`Expected word template allowedFormats to include pdf: ${JSON.stringify(target)}`);
  }

  // Prefer an excel template presence check (non-fatal if none)
  const excel = templates.find((t) => t.kind === 'excel');
  if (excel && (!excel.allowedFormats.includes('xlsx') || excel.allowedFormats.length !== 1)) {
    throw new Error(`Excel template formats wrong: ${JSON.stringify(excel)}`);
  }

  // 3) get_template_fields
  const fieldsResult = await client.callTool({
    name: 'get_template_fields',
    arguments: { templateId: target.id },
  });
  if (fieldsResult.isError) {
    throw new Error(`get_template_fields failed: ${textContent(fieldsResult)}`);
  }
  const fieldsPayload = JSON.parse(textContent(fieldsResult));
  if (!fieldsPayload.jsonSchema || fieldsPayload.jsonSchema.type !== 'object') {
    throw new Error('jsonSchema missing or invalid in get_template_fields response');
  }
  if (!Array.isArray(fieldsPayload.fieldDefinitions)) {
    throw new Error('fieldDefinitions missing in get_template_fields response');
  }
  steps.push({
    step: 'get_template_fields',
    ok: true,
    templateId: target.id,
    kind: fieldsPayload.kind,
    allowedFormats: fieldsPayload.allowedFormats,
    propertyCount: Object.keys(fieldsPayload.jsonSchema.properties ?? {}).length,
    fieldDefinitionCount: fieldsPayload.fieldDefinitions.length,
    hasFieldValueRules: Boolean(fieldsPayload.fieldValueRules?.image),
    sampleValueGuide: fieldsPayload.fieldDefinitions[0]?.valueGuide?.slice(0, 80),
  });

  // 4) generate_document (pdf) — fill from schema keys with sample values
  const props = fieldsPayload.jsonSchema.properties ?? {};
  const data = {};
  for (const [key, schema] of Object.entries(props)) {
    const s = schema;
    if (s.type === 'boolean') {
      data[key] = true;
    } else if (s.type === 'array') {
      data[key] = [{}];
    } else if (key.toLowerCase().includes('pracownik') || key.toLowerCase().includes('nazwisko')) {
      data[key] = 'Janusz Kowalski';
    } else if (key.toLowerCase().includes('imie') || key === 'name') {
      data[key] = 'Janusz Kowalski';
    } else {
      data[key] = `Sample ${key}`;
    }
  }
  // Prefer known employee field if present
  if ('imieINazwiskoPracownika' in props) {
    data.imieINazwiskoPracownika = 'Janusz Kowalski';
  }

  const genResult = await client.callTool({
    name: 'generate_document',
    arguments: {
      templateId: target.id,
      format: 'pdf',
      data,
    },
  });
  if (genResult.isError) {
    throw new Error(`generate_document failed: ${textContent(genResult)}`);
  }
  const genPayload = JSON.parse(textContent(genResult));
  const url = typeof genPayload.data === 'string' ? genPayload.data : null;
  if (genPayload.status !== 200 || !url?.startsWith('https://')) {
    throw new Error(`Unexpected generate result: ${textContent(genResult).slice(0, 500)}`);
  }
  steps.push({
    step: 'generate_document',
    ok: true,
    status: genPayload.status,
    message: genPayload.message,
    urlPrefix: url.slice(0, 80) + '...',
  });

  await client.close();

  console.log(JSON.stringify({ ok: true, steps }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});
