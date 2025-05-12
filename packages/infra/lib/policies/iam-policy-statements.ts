import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Creates a policy statement for CloudWatch Logs access for Bedrock monitoring
 */
export function bedrockLoggingPolicy(scope: Construct): PolicyStatement {
  const account = Stack.of(scope).account;
  const region = Stack.of(scope).region;
  
  return new PolicyStatement({
    sid: 'BedrockLoggingPolicy',
    effect: Effect.ALLOW,
    actions: [
      'logs:CreateLogGroup',
      'logs:CreateLogStream',
      'logs:PutLogEvents',
      'logs:DescribeLogStreams',
      'logs:GetLogEvents'
    ],
    resources: [
      `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock/model-invocations:*`,
      `arn:aws:logs:${region}:${account}:log-group:/aws/bedrock/model-invocations:log-stream:*`
    ]
  });
}
