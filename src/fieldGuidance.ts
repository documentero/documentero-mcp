import type { TemplateField } from './client/types.js';

export type TemplateKind = 'word' | 'excel';

export type TemplateCapabilities = {
  kind: TemplateKind;
  defaultFormat: string;
  allowedFormats: string[];
};

/** Shared rules aligned with https://docs.documentero.com/documentation */
export const FIELD_VALUE_RULES = {
  textfield:
    'Plain string. Use \\n for line breaks. Same key can appear multiple times in the template.',
  html: 'HTML string for {*field} placeholders. Use as its own paragraph (not inline). Supported tags include a, b, br, p, h1-h6, ul/ol/li, table, img, and others listed in Documentero HTML docs. Mermaid via <pre class="mermaid">.',
  markdown:
    'Markdown string for {!field} placeholders. Use as its own paragraph (not inline). Supports headings, emphasis, links, images (public URLs), lists, tables, and ```mermaid fenced blocks.',
  link: 'Clickable link string for {&field}. Pass a URL (e.g. https://example.com) or URL with display text: https://example.com[Link Text].',
  qrcode:
    'QR payload string for {>field}. Any scannable content (URL, text, etc.). Max 1000 characters and 50 lines; use \\n for multiline. Exceeding limits omits the QR from the output.',
  image:
    'Image string for {%field}: full image URL, or base64-encoded image text. Supported types: jpg, png, svg.',
  repeaterWithSubfields:
    'Array of objects. Each object keys match subfield keys. Used for tables/repeated blocks ({#section}...{/section}).',
  repeaterWithoutSubfields:
    'Boolean. true shows the section, false/omit hides it (simple checkbox section).',
} as const;

export function capabilitiesFromFormats(
  outputFormats: Record<string, string>,
  outputFormat: string
): TemplateCapabilities {
  const keys = Object.keys(outputFormats || {});
  const isExcel = keys.length === 1 && keys[0] === 'xlsx';
  if (isExcel) {
    return {
      kind: 'excel',
      defaultFormat: 'xlsx',
      allowedFormats: ['xlsx'],
    };
  }
  return {
    kind: 'word',
    defaultFormat: outputFormat || 'docx',
    allowedFormats: keys.length ? keys : ['docx', 'pdf'],
  };
}

export function parseTypedTemplateLabel(label: string, id: string) {
  const match = label.match(/^(.*) \((DOCX|PDF|XLSX)\)$/i);
  const name = match ? match[1] : label;
  const marker = match ? match[2].toUpperCase() : null;
  const isExcel = marker === 'XLSX';

  if (isExcel) {
    return {
      id,
      name,
      kind: 'excel' as const,
      defaultFormat: 'xlsx',
      allowedFormats: ['xlsx'] as string[],
    };
  }

  return {
    id,
    name,
    kind: 'word' as const,
    defaultFormat: (marker ? marker.toLowerCase() : 'docx') as string,
    // Word/DOCX templates can generate DOCX or PDF regardless of default
    allowedFormats: ['docx', 'pdf'] as string[],
  };
}

export function valueGuideForField(field: TemplateField): string {
  if (field.type === 'image') {
    return FIELD_VALUE_RULES.image;
  }
  if (field.type === 'repeater') {
    return field.subfields && field.subfields.length > 0
      ? FIELD_VALUE_RULES.repeaterWithSubfields
      : FIELD_VALUE_RULES.repeaterWithoutSubfields;
  }
  if (field.type === 'textfield' || !field.type) {
    if (field.html) return FIELD_VALUE_RULES.html;
    if (field.markdown) return FIELD_VALUE_RULES.markdown;
    if (field.link) return FIELD_VALUE_RULES.link;
    if (field.qrcode) return FIELD_VALUE_RULES.qrcode;
    return FIELD_VALUE_RULES.textfield;
  }
  return `Pass a value appropriate for type "${field.type}".`;
}

export function annotateFieldDefinitions(fields: TemplateField[]): TemplateField[] {
  return fields.map((field) => {
    const annotated: TemplateField = {
      ...field,
      valueGuide: valueGuideForField(field),
    };
    if (field.subfields?.length) {
      annotated.subfields = annotateFieldDefinitions(field.subfields);
    }
    return annotated;
  });
}

type JsonSchemaObject = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  [key: string]: unknown;
};

type JsonSchemaNode = JsonSchemaObject;

function findField(fields: TemplateField[], key: string): TemplateField | undefined {
  for (const field of fields) {
    if (field.key === key) return field;
    if (field.subfields?.length) {
      const nested = findField(field.subfields, key);
      if (nested) return nested;
    }
  }
  return undefined;
}

/** Enrich JSON Schema descriptions from Documentero field flags (primary generate contract). */
export function enrichJsonSchema(
  schema: Record<string, unknown>,
  fields: TemplateField[]
): Record<string, unknown> {
  const clone = structuredClone(schema) as JsonSchemaNode;
  enrichProperties(clone.properties, fields);
  return clone as Record<string, unknown>;
}

function enrichProperties(
  properties: Record<string, JsonSchemaNode> | undefined,
  fields: TemplateField[]
) {
  if (!properties) return;

  for (const [key, node] of Object.entries(properties)) {
    const field = findField(fields, key);
    if (field) {
      const guide = valueGuideForField(field);
      node.description = node.description ? `${node.description}. ${guide}` : guide;
    }

    if (node.type === 'array' && node.items && typeof node.items === 'object') {
      const repeater = field?.type === 'repeater' ? field : undefined;
      enrichProperties(node.items.properties, repeater?.subfields ?? fields);
    } else if (node.type === 'object' && node.properties) {
      enrichProperties(node.properties, fields);
    }
  }
}
