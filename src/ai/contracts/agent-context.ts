export type AgentActor = {
  id: string;
  role: string;
};

export type AgentExecutionContext = {
  actor: AgentActor;
  correlationId: string;
  requestedAt: Date;
};
