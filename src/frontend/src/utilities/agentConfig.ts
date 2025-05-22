/**
 * Agent configuration utility
 * 
 * This module provides a centralized way to access agent configuration values
 * like agent IDs and alias IDs, pulling them from environment variables or 
 * other runtime sources rather than hardcoding them.
 */

interface AgentConfig {
  routingClassifier: {
    agentId: string;
    agentAliasId: string;
  };
}

/**
 * Load agent configuration from environment variables
 * Fallback to default values for development only
 *
 * In production, these values should be injected via environment variables
 * during the deployment process from CDK outputs
 */
const loadAgentConfig = (): AgentConfig => {
  // Try to load from environment variables (injected at build time)
  // Vite exposes env vars with VITE_ prefix
  const routingClassifierAgentId =
    import.meta.env.VITE_ROUTING_CLASSIFIER_AGENT_ID;

  const routingClassifierAliasId =
    import.meta.env.VITE_ROUTING_CLASSIFIER_ALIAS_ID;

  // Development fallbacks (these should NEVER be used in production)
  const defaultAgentId = 'JLAUZVXIEP'; // Default for local dev only
  const defaultAliasId = '9YSMGWTMZN'; // Default for local dev only

  return {
    routingClassifier: {
      agentId: routingClassifierAgentId || defaultAgentId,
      agentAliasId: routingClassifierAliasId || defaultAliasId
    }
  };
};

// Export the configuration singleton
export const agentConfig = loadAgentConfig();

/**
 * Helper to check if a trace matches the routing classifier
 * Use this instead of hardcoding IDs in other files
 */
export const isRoutingClassifierAgent = (
  agentId?: string,
  agentAliasId?: string
): boolean => {
  if (!agentId && !agentAliasId) return false;
  
  return (
    agentId === agentConfig.routingClassifier.agentId ||
    agentAliasId === agentConfig.routingClassifier.agentAliasId
  );
};