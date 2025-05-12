import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as bedrock from 'aws-cdk-lib/aws-bedrock';

export function storeAgentIds(scope: cdk.Stack, agentId: string, aliasId: string, prefix: string) {
    new ssm.StringParameter(scope, `${prefix}AgentIdParam`, {
        parameterName: `/${prefix}/agentid`,
        stringValue: agentId,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.SECURE_STRING,
        description: `Agent ID for ${prefix}`
    });

    new ssm.StringParameter(scope, `${prefix}AliasIdParam`, {
        parameterName: `/${prefix}/aliasid`,
        stringValue: aliasId,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.SECURE_STRING,
        description: `Agent Alias ID for ${prefix}`
    });
}

export function storeWebsocketId(scope: cdk.Stack, wsId: string, prefix: string) {
    new ssm.StringParameter(scope, `WebsocketEndpoint${prefix.replace(/[^a-zA-Z0-9]/g, '')}Param`, {
        parameterName: `/${prefix}`,
        stringValue: wsId,
        tier: ssm.ParameterTier.STANDARD,
        type: ssm.ParameterType.SECURE_STRING,
        description: `WebSocket ID for ${prefix}`
    });
}
