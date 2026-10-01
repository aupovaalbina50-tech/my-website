// Gemini Vision inspection — the free option. Uses the same GEMINI_API_KEY
// secret as the site's ai-chat assistant (Google AI Studio free tier:
// https://aistudio.google.com/apikey), so no extra setup or payment is needed.
//
// Same inputs and output as the Claude path (inspection.ts): the photo goes in
// as inline image data, the inspector instructions + full glossary as the
// system instruction, and the answer is constrained to the JSON shape via
// responseMimeType + responseSchema.
//
// Note: on the free tier Google may use requests to improve its products —
// see the AI Studio terms before checking confidential documents.

import { buildSystemPrompt, ERROR_TYPES } from './systemPrompt.ts'
import type { GlossaryTerm } from './glossary.ts'
import {
  InspectionError,
  toInspectionResult,
  userInstruction,
  type InspectParams,
  type InspectionResult,
} from './inspection.ts'

const MODEL = Deno.env.get('DOC_INSPECTOR_GEMINI_MODEL') || Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest'

// Gemini's response schema (OpenAPI subset: upper-case types, enums on strings).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    document_readable: { type: 'BOOLEAN' },
    document_language: { type: 'STRING', enum: ['kk', 'ru', 'mixed', 'other'] },
    findings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          found_text: { type: 'STRING' },
          correct_term: { type: 'STRING' },
          error_type: { type: 'STRING', enum: [...ERROR_TYPES] },
          explanation: { type: 'STRING' },
        },
        required: ['found_text', 'correct_term', 'error_type', 'explanation'],
        propertyOrdering: ['found_text', 'correct_term', 'error_type', 'explanation'],
      },
    },
  },
  required: ['document_readable', 'document_language', 'findings'],
  propertyOrdering: ['document_readable', 'document_language', 'findings'],
}

// Reasons Gemini stops without (usable) output because of its content filters.
const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'])

export async function inspectWithGemini(params: InspectParams, apiKey: string): Promise<InspectionResult> {
  const { imageBase64, mediaType, explanationLang, glossary } = params
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      // Key in a header rather than the URL, so it never appears in logs.
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt(glossary as GlossaryTerm[]) }] },
        contents: [
          {
            role: 'user',
            parts: [{ inline_data: { mime_type: mediaType, data: imageBase64 } }, { text: userInstruction(explanationLang) }],
          },
        ],
        generationConfig: {
          temperature: 0.1, // an inspector should be consistent, not creative
          maxOutputTokens: 16384,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })
  } catch {
    throw new InspectionError(503, 'ai_unavailable', 'Gemini API is unreachable')
  }

  if (!res.ok) {
    const body = await res.text()
    if (res.status === 429) throw new InspectionError(503, 'ai_busy', `Gemini free quota reached: ${body}`)
    if (res.status === 401 || res.status === 403) throw new InspectionError(500, 'config_error', 'GEMINI_API_KEY is missing or invalid')
    if (res.status === 400) throw new InspectionError(422, 'image_rejected', `Gemini rejected the request: ${body}`)
    throw new InspectionError(502, 'ai_unavailable', `Gemini API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  if (data?.promptFeedback?.blockReason) {
    throw new InspectionError(422, 'refused', `Gemini blocked the image: ${data.promptFeedback.blockReason}`)
  }

  const candidate = data?.candidates?.[0]
  const finishReason: string | undefined = candidate?.finishReason
  if (finishReason && BLOCKED_FINISH_REASONS.has(finishReason)) {
    throw new InspectionError(422, 'refused', `Gemini stopped: ${finishReason}`)
  }
  if (finishReason === 'MAX_TOKENS') {
    throw new InspectionError(502, 'truncated', 'The inspection report was cut off')
  }

  const text: string = (candidate?.content?.parts ?? [])
    .filter((part: { text?: string; thought?: boolean }) => part.text && !part.thought)
    .map((part: { text: string }) => part.text)
    .join('')

  try {
    return toInspectionResult(JSON.parse(text), glossary, data?.modelVersion || MODEL)
  } catch {
    throw new InspectionError(502, 'bad_response', 'Gemini returned malformed JSON')
  }
}
