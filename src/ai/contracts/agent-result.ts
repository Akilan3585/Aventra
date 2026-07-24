export type AgentEvidence = {
  sourceId: string;
  sourceType: string;
  summary: string;
};

export type AgentResult<TDecision> = {
  decision: TDecision;
  confidence: number;
  evidence: AgentEvidence[];
  reasons: string[];
  nextActions: string[];
  requiresHumanReview: boolean;
};
