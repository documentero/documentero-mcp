import { DocumenteroApiError } from '../client/types.js';
import type { DocumenteroClient } from '../client/documentero.js';
import {
  annotateFieldDefinitions,
  capabilitiesFromFormats,
  enrichJsonSchema,
  FIELD_VALUE_RULES,
} from '../fieldGuidance.js';

export function jsonResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(error: unknown) {
  if (error instanceof DocumenteroApiError) {
    return {
      isError: true as const,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              error: error.message,
              status: error.status,
              details: error.body,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
  };
}

export async function listTemplates(client: DocumenteroClient) {
  try {
    const templates = await client.listTemplates();
    return jsonResult({
      templates,
      notes: {
        word:
          'kind=word templates are Word (.docx) based. allowedFormats are typically docx and pdf. Pick format in generate_document from allowedFormats.',
        excel:
          'kind=excel templates are spreadsheet (.xlsx) based. allowedFormats is only xlsx — do not request docx/pdf.',
      },
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function getTemplateFields(client: DocumenteroClient, templateId: string) {
  try {
    const meta = await client.getTemplateFields(templateId);
    const caps = capabilitiesFromFormats(meta.outputFormats, meta.outputFormat);
    const fieldDefinitions = annotateFieldDefinitions(meta.fields);
    const jsonSchema = enrichJsonSchema(meta.jsonSchema, meta.fields);

    return jsonResult({
      templateId,
      kind: caps.kind,
      defaultFormat: caps.defaultFormat,
      allowedFormats: caps.allowedFormats,
      // Primary contract for generate_document `data`
      jsonSchema,
      // Extra Documentero field metadata + per-field valueGuide
      fieldDefinitions,
      fieldValueRules: FIELD_VALUE_RULES,
      docs: 'https://docs.documentero.com/documentation',
    });
  } catch (error) {
    return errorResult(error);
  }
}

export async function generateDocument(
  client: DocumenteroClient,
  args: {
    templateId: string;
    data: Record<string, unknown>;
    format?: string;
    embed?: boolean;
  }
) {
  try {
    const result = await client.generateDocument({
      templateId: args.templateId,
      data: args.data,
      format: args.format,
      embed: args.embed,
    });
    return jsonResult(result);
  } catch (error) {
    return errorResult(error);
  }
}
