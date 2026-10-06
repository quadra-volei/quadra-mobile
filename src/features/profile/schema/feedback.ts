import { z } from 'zod';

/**
 * Frontend feedback contract (S10 — "Enviar feedback").
 *
 * The user picks a `type` (suggestion / problem / praise) and writes a free-text
 * `message`. Mirrors the in-app feedback form that replaces the old `mailto:`
 * hand-off.
 *
 * ⚠️ Backend alignment gate: no real feedback endpoint exists yet. This schema
 * defines the *frontend* shape so the screen is buildable/testable now; the mock
 * mutation asserts no network path (see `src/features/profile/api/sendFeedback.ts`).
 */
export const FEEDBACK_TYPES = ['suggestion', 'problem', 'praise'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Upper bound on the free-text message (keeps payloads sane; UI shows a counter TBD). */
export const FEEDBACK_MESSAGE_MAX = 1000;

export const feedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  message: z
    .string()
    .trim()
    .min(1, 'Escreva sua mensagem')
    .max(FEEDBACK_MESSAGE_MAX, 'Mensagem muito longa'),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
