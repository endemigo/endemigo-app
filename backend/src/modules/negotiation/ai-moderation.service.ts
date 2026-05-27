import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ViolationType } from '@endemigo/shared';

export interface AiModerationInput {
  text: string;
  normalizedText: string;
  ruleViolations: ViolationType[];
  source: 'message' | 'offer_note';
}

export interface AiModerationResult {
  riskScore: number;
  reason: string;
  provider: 'local' | 'openai';
  reviewedAt: string;
  shouldBlock: boolean;
}

@Injectable()
export class AiModerationService {
  constructor(
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async analyze(input: AiModerationInput): Promise<AiModerationResult> {
    const apiKey = this.configService?.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return this.localResult(input);
    }

    try {
      return await this.openAiResult(input, apiKey);
    } catch {
      return this.localResult(input);
    }
  }

  private localResult(input: AiModerationInput): AiModerationResult {
    const ruleScore = input.ruleViolations.length > 0
      ? Math.min(1, 0.72 + input.ruleViolations.length * 0.07)
      : 0.08;

    return {
      riskScore: Number(ruleScore.toFixed(2)),
      reason:
        input.ruleViolations.length > 0
          ? 'Rule-based off-platform contact signal'
          : 'No local off-platform contact signal',
      provider: 'local',
      reviewedAt: new Date().toISOString(),
      shouldBlock: input.ruleViolations.length > 0,
    };
  }

  private async openAiResult(
    input: AiModerationInput,
    apiKey: string,
  ): Promise<AiModerationResult> {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService?.get<string>('OPENAI_MODERATION_MODEL') ?? 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'Return JSON only with riskScore 0..1, reason, shouldBlock. Flag phone, social media, email, URL, IBAN, or off-platform payment/contact attempts.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              text: input.text,
              normalizedText: input.normalizedText,
              ruleViolations: input.ruleViolations,
              source: input.source,
            }),
          },
        ],
        text: { format: { type: 'json_object' } },
      }),
    });

    if (!response.ok) {
      return this.localResult(input);
    }

    const body = (await response.json()) as {
      output_text?: string;
      output?: { content?: { text?: string }[] }[];
    };
    const rawText =
      body.output_text ??
      body.output?.flatMap((item) => item.content ?? [])
        .map((item) => item.text)
        .find((text): text is string => Boolean(text)) ??
      '';
    const parsed = JSON.parse(rawText) as {
      riskScore?: number;
      reason?: string;
      shouldBlock?: boolean;
    };
    const riskScore = Number.isFinite(parsed.riskScore)
      ? Math.max(0, Math.min(1, Number(parsed.riskScore)))
      : this.localResult(input).riskScore;

    return {
      riskScore,
      reason: parsed.reason ?? 'OpenAI moderation result',
      provider: 'openai',
      reviewedAt: new Date().toISOString(),
      shouldBlock: parsed.shouldBlock ?? riskScore >= 0.85,
    };
  }
}
