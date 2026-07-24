import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { DocumenteroClient } from './client/documentero.js';
import { generateDocument, getTemplateFields, listTemplates } from './tools/index.js';

export function createServer(client: DocumenteroClient): McpServer {
  const server = new McpServer({
    name: 'documentero',
    version: '0.1.0',
  });

  server.registerTool(
    'list_templates',
    {
      title: 'List templates',
      description:
        'List Documentero templates for the configured API key. Each item includes id, name, kind (word|excel), defaultFormat, and allowedFormats. Word templates allow docx/pdf; Excel templates allow only xlsx. Call this before get_template_fields or generate_document.',
      inputSchema: {},
    },
    async () => listTemplates(client)
  );

  server.registerTool(
    'get_template_fields',
    {
      title: 'Get template fields',
      description:
        'Get the schema for a Documentero template. Use jsonSchema as the primary contract for generate_document data (descriptions include value rules). fieldDefinitions adds Documentero metadata plus valueGuide per field. Respect kind/allowedFormats: word → docx|pdf, excel → xlsx only. Field value rules: image = URL or base64 (jpg/png/svg); link = URL or URL[Label]; qrcode = payload string (max 1000 chars / 50 lines); html/markdown = formatted markup as own paragraph; plain text uses \\n for newlines; repeaters are object arrays or booleans. See fieldValueRules and https://docs.documentero.com/documentation.',
      inputSchema: {
        templateId: z
          .string()
          .describe('Template id from list_templates (the id field, not the name)'),
      },
    },
    async ({ templateId }) => getTemplateFields(client, templateId)
  );

  server.registerTool(
    'generate_document',
    {
      title: 'Generate document',
      description:
        'Generate a document from a Documentero template. Call get_template_fields first. Shape data to match jsonSchema (and field value rules: image URL/base64, link URL, qrcode content, etc.; use \\n for multiline text). format is optional — if omitted, the template defaultFormat is used; when set it must be in allowedFormats (word: docx|pdf; excel: xlsx only). By default the response data is a time-limited signed download URL (~1 hour). Set embed=true to get base64 file content (fileName, fileContent, fileExtension, contentType) instead of a URL. Email delivery options exist on the Cloud API but are not exposed by this tool.',
      inputSchema: {
        templateId: z
          .string()
          .describe('Template id from list_templates'),
        data: z
          .record(z.string(), z.unknown())
          .describe('Template field values matching get_template_fields jsonSchema and field value rules'),
        format: z
          .enum(['docx', 'pdf', 'xlsx'])
          .optional()
          .describe(
            'Output format. Optional — defaults to the template defaultFormat. Must be in allowedFormats (xlsx-only for excel; docx or pdf for word).'
          ),
        embed: z
          .boolean()
          .optional()
          .describe(
            'If true, return base64 file payload instead of a signed download URL (useful when the client needs file bytes directly).'
          ),
      },
    },
    async ({ templateId, data, format, embed }) =>
      generateDocument(client, { templateId, data, format, embed })
  );

  return server;
}
