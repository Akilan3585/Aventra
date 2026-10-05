import { AgentWorkspace } from "@/ai/presentation/agent-workspace";
import { resolveAiProviderConfiguration } from "@/ai/providers/provider-configuration";
import { WorkspaceBanner } from "@/components/operations/operations-ui";
import { resolveWorkspaceAccess } from "@/server/workspace/workspace-access";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const access = await resolveWorkspaceAccess("reports:read", "agents:execute");
  const provider = resolveAiProviderConfiguration();
  const modelLabel = provider ? `${provider.provider} · ${provider.model}` : null;

  return (
    <section className="mx-auto max-w-5xl">
      <WorkspaceBanner mode={access.mode} />
      <AgentWorkspace
        canUse={access.canManage && access.mode === "live"}
        modelLabel={modelLabel}
      />
    </section>
  );
}
