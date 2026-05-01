export type ReviewDecision = 'approve' | 'revise' | 'reject';

export interface ReviewIssueSummary {
  high: number;
  medium: number;
  low: number;
}

export function canSubmitDecision(
  decision: ReviewDecision,
  summary: ReviewIssueSummary,
  comment: string
): boolean {
  const trimmedComment = comment.trim();

  if (decision === 'approve') {
    return summary.high === 0;
  }

  if (decision === 'revise' || decision === 'reject') {
    return trimmedComment.length > 0;
  }

  return false;
}
