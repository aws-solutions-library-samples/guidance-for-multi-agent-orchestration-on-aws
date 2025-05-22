import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentConfig, isRoutingClassifierAgent } from '../agentConfig';

describe('agentConfig', () => {
  // Save original import.meta.env
  const originalImportMetaEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
    // Mock import.meta.env
    import.meta.env = {
      ...import.meta.env,
      VITE_ROUTING_CLASSIFIER_AGENT_ID: undefined,
      VITE_ROUTING_CLASSIFIER_ALIAS_ID: undefined
    };
  });

  afterEach(() => {
    // Restore original import.meta.env
    import.meta.env = originalImportMetaEnv;
  });

  it('should use default values if environment variables are not set', () => {
    expect(agentConfig.routingClassifier.agentId).toBeDefined();
    expect(agentConfig.routingClassifier.agentAliasId).toBeDefined();
    // Default development values
    expect(agentConfig.routingClassifier.agentId).toBe('JLAUZVXIEP');
    expect(agentConfig.routingClassifier.agentAliasId).toBe('9YSMGWTMZN');
  });

  it('should correctly identify a routing classifier agent', () => {
    // Default agent ID
    expect(isRoutingClassifierAgent('JLAUZVXIEP', undefined)).toBe(true);
    
    // Default alias ID
    expect(isRoutingClassifierAgent(undefined, '9YSMGWTMZN')).toBe(true);
    
    // Both IDs match
    expect(isRoutingClassifierAgent('JLAUZVXIEP', '9YSMGWTMZN')).toBe(true);
    
    // No IDs provided
    expect(isRoutingClassifierAgent(undefined, undefined)).toBe(false);
    
    // Non-matching IDs
    expect(isRoutingClassifierAgent('OTHER_ID', 'OTHER_ALIAS')).toBe(false);
  });
});