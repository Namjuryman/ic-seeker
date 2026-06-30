export type QuotaEvaluation = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number | null;
  reason?: string;
};

export function evaluateQuota(input: {
  metric: string;
  planName: string;
  limit: number;
  used: number;
  increment?: number;
}): QuotaEvaluation {
  const increment = input.increment ?? 1;
  if (input.limit < 0) {
    return { allowed: true, used: input.used, limit: input.limit, remaining: null, reason: undefined };
  }
  const remaining = Math.max(0, input.limit - input.used);
  const allowed = input.used + increment <= input.limit;
  return {
    allowed,
    used: input.used,
    limit: input.limit,
    remaining,
    reason: allowed ? undefined : `${input.metric} quota exceeded for ${input.planName}`,
  };
}
