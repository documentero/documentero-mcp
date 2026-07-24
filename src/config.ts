export type Config = {
  apiKey: string;
  baseUrl: string;
};

const DEFAULT_BASE_URL = 'https://app.documentero.com/api';

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.DOCUMENTERO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'DOCUMENTERO_API_KEY is required. Set it in your MCP server env (Account → API key in Documentero).'
    );
  }

  const baseUrl = (env.DOCUMENTERO_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');

  return { apiKey, baseUrl };
}
