// The Claude Vision call for the doc-inspector Edge Function.
//
// One request per document: the photo goes in as a base64 image block, the
// inspector instructions + full glossary go in as a cached system prompt, and
// the answer is forced into a JSON schema via structured outputs
// (output_config.format) — so the response is always valid JSON of the
// expected shape, never free text that has to be scraped.

import Anthropic from 'npm:@anthropic-ai/sdk@0.129.0'
import { buildSystemPrompt, ERROR_TYPES } from './systemPrompt.ts'
import { findGlossaryTerm, type GlossaryTerm } from './glossary.ts'

// Claude Sonnet 5.5 — the current Sonnet. (claude-3-5-sonnet-20241022 was
// retired on 2025-10-28 and no longer accepts requests.) Override with the
// DOC_INSPECTOR_MODEL secret if needed, e.g. claude-opus-5-5 for maximum
// accuracy at a higher price.
const MODEL = Deno.env.get('DOC_INSPECTOR_MODEL') || 'claude-sonnet-5-5'

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export interface Finding {
  found_text: string
  correct_term: string
  error_type: (typeof ERROR_TYPES)[number]
  explanation: string
  // Filled in by us, not by the model: the matching glossary entry (or null),
  // so the UI can link the recommendation to "Мой словарь".
  term: GlossaryTerm | null
}

export interface InspectionResult {
  readable: boolean
  documentLanguage: 'kk' | 'ru' | 'mixed' | 'other'
  findings: Finding[]
  model: string
}

/** A failure with an HTTP status and a stable code the frontend can switch on. */
export class InspectionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

// The exact shape Claude must return. additionalProperties: false + required
// on every object is what structured outputs needs to guarantee the shape.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    document_readable: {
      type: 'boolean',
      description: 'false if the image has no readable document text',
    },
    document_language: {
      type: 'string',
      enum: ['kk', 'ru', 'mixed', 'other'],
      description: 'main language of the document text',
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          found_text: { type: 'string', description: 'the erroneous fragment exactly as written in the document' },
          correct_term: { type: 'string', description: 'official replacement term, verbatim from the glossary when possible' },
          error_type: { type: 'string', enum: [...ERROR_TYPES] },
          explanation: { type: 'string', description: 'short official explanation, in the requested language' },
        },
        required: ['found_text', 'correct_term', 'error_type', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['document_readable', 'document_language', 'findings'],
  additionalProperties: false,
}

export const EXPLANATION_LANGUAGE = { kk: 'казахский', ru: 'русский' } as const

export interface InspectParams {
  imageBase64: string
  mediaType: ImageMediaType
  explanationLang: 'kk' | 'ru'
  glossary: GlossaryTerm[]
}

export function userInstruction(explanationLang: 'kk' | 'ru'): string {
  return `Проверь терминологию в документе на изображении.\nЯзык пояснений (explanation): ${EXPLANATION_LANGUAGE[explanationLang]}.`
}

/** Shared by every provider: model JSON -> InspectionResult with glossary links. */
export function toInspectionResult(
  parsed: {
    document_readable: boolean
    document_language: InspectionResult['documentLanguage']
    findings: Omit<Finding, 'term'>[]
  },
  glossary: GlossaryTerm[],
  model: string,
): InspectionResult {
  return {
    readable: parsed.document_readable,
    documentLanguage: parsed.document_language,
    findings: (parsed.findings || []).map((finding) => ({
      ...finding,
      term: findGlossaryTerm(glossary, finding.correct_term),
    })),
    model,
  }
}

// Created on first use, so the function still starts (and can use Gemini)
// when no ANTHROPIC_API_KEY secret is set.
let client: Anthropic | null = null

/** Claude Vision inspection — used when the ANTHROPIC_API_KEY secret is set. */
export async function inspectWithClaude(params: InspectParams): Promise<InspectionResult> {
  const { imageBase64, mediaType, explanationLang, glossary } = params
  client ??= new Anthropic() // reads ANTHROPIC_API_KEY from the Edge Function secrets

  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // Server-side refusal fallback: if a safety classifier declines the
      // request, the API re-runs it on Anthropic's recommended fallback model
      // inside the same call instead of returning a refusal.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      // Careful reading of a whole document against ~930 terms: medium effort
      // keeps latency reasonable; raise to "high" if recall matters more.
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
      // The system prompt (instructions + glossary, ~20k tokens) is identical
      // for every request, so it is cached: repeat checks within the cache
      // window read it at ~10% of the input price.
      system: [{ type: 'text', text: buildSystemPrompt(glossary), cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: userInstruction(explanationLang) },
          ],
        },
      ],
    })
  } catch (error) {
    // Most specific first. The SDK already retried 408/409/429/5xx and
    // connection errors twice before throwing.
    if (error instanceof Anthropic.BadRequestError) {
      // e.g. the image couldn't be decoded by the API
      throw new InspectionError(422, 'image_rejected', error.message)
    }
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new InspectionError(500, 'config_error', 'Anthropic API key is missing or invalid')
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new InspectionError(503, 'ai_busy', 'Anthropic API rate limit reached')
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new InspectionError(503, 'ai_unavailable', 'Anthropic API is unreachable')
    }
    if (error instanceof Anthropic.APIError) {
      throw new InspectionError(502, 'ai_unavailable', `Anthropic API error ${error.status}: ${error.message}`)
    }
    throw error
  }

  // Always check why generation stopped before reading content.
  if (response.stop_reason === 'refusal') {
    throw new InspectionError(422, 'refused', response.stop_details?.explanation || 'The model declined this image')
  }
  if (response.stop_reason === 'max_tokens') {
    throw new InspectionError(502, 'truncated', 'The inspection report was cut off')
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  try {
    return toInspectionResult(JSON.parse(text), glossary, response.model)
  } catch {
    throw new InspectionError(502, 'bad_response', 'The model returned malformed JSON')
  }
}
