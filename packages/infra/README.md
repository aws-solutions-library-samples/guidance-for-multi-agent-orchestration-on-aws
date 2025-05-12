# Security Enhancements

## AWS SSM Parameter Store SecureString Parameters

This project uses AWS Systems Manager Parameter Store SecureString parameters to securely store sensitive information:

- Agent IDs and Alias IDs are stored as SecureString parameters
- WebSocket IDs are stored as SecureString parameters
- Athena query results locations are stored as SecureString parameters

Using SecureString parameters provides the following benefits:
- Data is encrypted at rest using AWS KMS
- Access to parameters can be controlled with fine-grained IAM policies
- Parameter values are not displayed in the AWS Management Console
- Parameter values are automatically redacted in CloudWatch Logs

## Bedrock Model Invocation Logging

All Amazon Bedrock model invocations are logged to a dedicated CloudWatch log group (`/aws/bedrock/model-invocations`) with comprehensive details including:

- Agent ID and Alias ID
- Session ID
- Input prompts
- Response data
- Error information

This logging implementation supports responsible AI governance and compliance requirements.
