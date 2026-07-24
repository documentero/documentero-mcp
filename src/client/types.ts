/** Template list item from GET/POST /api/templates */
export type TemplateListItem = {
  label: string;
  value: string;
};

export type TemplateSummary = {
  id: string;
  name: string;
  kind: 'word' | 'excel';
  defaultFormat: string;
  allowedFormats: string[];
};

/** Field shapes from /api/meta (default format = forms.fields) */
export type TemplateField = {
  type: 'textfield' | 'image' | 'repeater' | string;
  key: string;
  subfields?: TemplateField[];
  html?: boolean;
  markdown?: boolean;
  qrcode?: boolean;
  link?: boolean;
  xml?: boolean;
  custom?: Record<string, unknown>;
  [key: string]: unknown;
};

export type TemplateMeta = {
  fields: TemplateField[];
  outputFormats: Record<string, string>;
  outputFormat: string;
  jsonSchema: Record<string, unknown>;
};

export type GenerateRequest = {
  templateId: string;
  data: Record<string, unknown>;
  format?: 'docx' | 'pdf' | 'xlsx' | string;
  embed?: boolean;
};

export type GenerateEmbedData = {
  fileName: string;
  fileContent: string;
  fileExtension: string;
  contentType: string;
};

export type GenerateResult = {
  status: number;
  message: string;
  data: string | GenerateEmbedData;
};

export type MeResult = {
  status: number;
  message: string;
  name?: string;
};

export class DocumenteroApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'DocumenteroApiError';
    this.status = status;
    this.body = body;
  }
}
