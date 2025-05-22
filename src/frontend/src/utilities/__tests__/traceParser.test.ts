import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  isRoutingClassifierTrace, 
  isSupervisorTrace, 
  processTraceData 
} from '../traceParser';
import * as agentConfig from '../agentConfig';

// Mock agentConfig
vi.mock('../agentConfig', () => ({
  agentConfig: {
    routingClassifier: {
      agentId: 'TEST_AGENT_ID',
      agentAliasId: 'TEST_ALIAS_ID'
    }
  },
  isRoutingClassifierAgent: vi.fn()
}));

describe('traceParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default behavior for isRoutingClassifierAgent
    vi.mocked(agentConfig.isRoutingClassifierAgent).mockImplementation(
      (agentId, agentAliasId) => 
        agentId === 'TEST_AGENT_ID' || agentAliasId === 'TEST_ALIAS_ID'
    );
  });

  describe('isRoutingClassifierTrace', () => {
    it('should identify routing classifier by agent ID/alias ID', () => {
      const data = {
        content: {
          agentId: 'TEST_AGENT_ID',
          agentAliasId: 'OTHER_ALIAS'
        }
      };
      
      expect(isRoutingClassifierTrace(data)).toBe(true);
      expect(agentConfig.isRoutingClassifierAgent).toHaveBeenCalledWith(
        'TEST_AGENT_ID', 'OTHER_ALIAS'
      );
    });

    it('should identify routing classifier by text patterns', () => {
      const data = {
        content: {
          trace: {
            orchestrationTrace: {
              modelInvocationInput: {
                text: 'This is a ROUTING_CLASSIFIER example'
              }
            }
          }
        }
      };
      
      expect(isRoutingClassifierTrace(data)).toBe(true);
    });

    it('should identify routing classifier by collaboratorName', () => {
      const data = {
        content: {
          collaboratorName: 'ROUTING_CLASSIFIER'
        }
      };
      
      expect(isRoutingClassifierTrace(data)).toBe(true);
    });
  });

  describe('isSupervisorTrace', () => {
    it('should identify supervisor trace by collaboratorName', () => {
      const data = {
        content: {
          collaboratorName: 'Supervisor'
        }
      };
      
      expect(isSupervisorTrace(data)).toBe(true);
    });

    it('should not identify routing classifier as supervisor', () => {
      const data = {
        content: {
          agentId: 'TEST_AGENT_ID',
          trace: {
            orchestrationTrace: {
              modelInvocationInput: {}
            }
          }
        }
      };
      
      expect(isSupervisorTrace(data)).toBe(false);
    });
  });

  describe('processTraceData', () => {
    it('should correctly process routing classifier data', () => {
      const data = {
        content: {
          agentId: 'TEST_AGENT_ID',
          trace: {
            routingClassifierTrace: {
              modelInvocationInput: {
                text: 'Sample input'
              }
            }
          }
        }
      };
      
      const result = processTraceData(data);
      
      expect(result.traceType).toBe('ROUTING_CLASSIFIER');
      expect(result.orchestrationTraceType).toBe('routingClassifierTrace');
    });

    it('should correctly process supervisor data', () => {
      const data = {
        content: {
          collaboratorName: 'Supervisor',
          trace: {
            orchestrationTrace: {
              rationale: {
                text: 'Sample rationale'
              }
            }
          }
        }
      };
      
      const result = processTraceData(data);
      
      expect(result.traceType).toBe('Supervisor');
      expect(result.subTraceTitle).toBe('Rationale');
    });
  });
});