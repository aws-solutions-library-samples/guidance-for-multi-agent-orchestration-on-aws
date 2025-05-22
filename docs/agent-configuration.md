# Agent Configuration

This document describes how agent configurations are managed in the application, specifically how agent IDs and alias IDs are handled without hardcoding.

## Agent IDs and Alias IDs

Agent IDs and alias IDs are used in various parts of the application to identify specific agents, such as the routing classifier agent. Instead of hardcoding these values, we use a dynamic configuration approach:

### Backend

In the backend, agent IDs and alias IDs are passed from the CDK constructs to Lambda functions through environment variables:

```typescript
// In src/backend/lib/stacks/backend/streaming-api/index.ts
const resolverFunction = new CommonNodejsFunction(this, "resolverFunction", {
  entry: path.join(__dirname, "resolver-function", "index.ts"),
  environment: {
    GRAPH_API_URL: amplifiedGraphApi.graphqlUrl,
    AGENT_ID: supervisorAgent.agentId,
    AGENT_ALIAS_ID: supervisorAgentAlias.aliasId,
  },
  // ...
});
```

These values are then used in the Lambda function:

```typescript
// In src/backend/lib/stacks/backend/streaming-api/resolver-function/index.ts
const command = new InvokeAgentCommand({
  agentId: process.env.AGENT_ID,
  agentAliasId: process.env.AGENT_ALIAS_ID,
  // ...
});
```

### Frontend

In the frontend, agent configurations are managed through the `agentConfig` utility:

```typescript
// In src/frontend/src/utilities/agentConfig.ts
const loadAgentConfig = (): AgentConfig => {
  // Try to load from environment variables (injected at build time)
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
```

The utility also provides helper functions like `isRoutingClassifierAgent()` to check if a given agent ID or alias ID matches the configured values.

## Deployment Configuration

To configure agent IDs for different environments:

1. During deployment, CDK outputs the agent IDs and alias IDs as CloudFormation outputs
2. These outputs are collected and passed to the frontend build process
3. Vite environment variables (with `VITE_` prefix) make these values available to the frontend code

## Local Development

For local development:
- The frontend uses fallback values when environment variables are not available
- You can set up a `.env.local` file in the frontend directory with your agent IDs:

```
VITE_ROUTING_CLASSIFIER_AGENT_ID=your_agent_id
VITE_ROUTING_CLASSIFIER_ALIAS_ID=your_agent_alias_id
```

## Testing

The configuration system has been tested to ensure it works correctly in different environments:
- Tests verify that agent detection works with both configured and default values
- Tests ensure that all agent detection functions use the dynamic configuration correctly