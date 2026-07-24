import type { Config } from '../config.js';
import { parseTypedTemplateLabel } from '../fieldGuidance.js';
import {
  DocumenteroApiError,
  type GenerateRequest,
  type GenerateResult,
  type MeResult,
  type TemplateListItem,
  type TemplateMeta,
  type TemplateSummary,
} from './types.js';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

export class DocumenteroClient {
  constructor(private readonly config: Config) {}

  async me(): Promise<MeResult> {
    return this.requestJson<MeResult>('/me', { method: 'POST', body: {} });
  }

  async listTemplates(): Promise<TemplateSummary[]> {
    // `types: true` appends (DOCX|PDF|XLSX) so we can distinguish Word vs Excel templates
    const response = await this.requestJson<{ status: number; data: TemplateListItem[] }>(
      '/templates',
      { method: 'POST', body: { types: true } }
    );

    const items = Array.isArray(response.data) ? response.data : [];
    return items.map((item) => parseTypedTemplateLabel(item.label, item.value));
  }

  async getTemplateFields(templateId: string): Promise<TemplateMeta> {
    const [meta, jsonSchema] = await Promise.all([
      this.requestJson<{
        status: number;
        data: TemplateMeta['fields'];
        outputFormats?: Record<string, string>;
        outputFormat?: string;
      }>('/meta', {
        method: 'POST',
        body: { documentId: templateId },
      }),
      this.requestJson<Record<string, unknown>>('/meta', {
        method: 'POST',
        body: { documentId: templateId, format: 'jsonschema' },
      }),
    ]);

    return {
      fields: Array.isArray(meta.data) ? meta.data : [],
      outputFormats: meta.outputFormats ?? {},
      outputFormat: meta.outputFormat ?? 'docx',
      jsonSchema,
    };
  }

  async generateDocument(input: GenerateRequest): Promise<GenerateResult> {
    const body: Record<string, unknown> = {
      document: input.templateId,
      data: input.data,
    };

    if (input.format) {
      body.format = input.format;
    }
    if (input.embed) {
      body.embed = true;
    }

    return this.requestJson<GenerateResult>('/generate', {
      method: 'POST',
      body,
    });
  }

  private async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const method = options.method ?? 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `apiKey ${this.config.apiKey}`,
        ...options.headers,
      },
      body: method === 'GET' ? undefined : JSON.stringify(options.body ?? {}),
    });

    const text = await response.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        parsed = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof parsed === 'object' &&
        parsed !== null &&
        'message' in parsed &&
        typeof (parsed as { message: unknown }).message === 'string'
          ? (parsed as { message: string }).message
          : `Documentero API error (${response.status})`;
      throw new DocumenteroApiError(response.status, message, parsed);
    }

    return parsed as T;
  }
}
