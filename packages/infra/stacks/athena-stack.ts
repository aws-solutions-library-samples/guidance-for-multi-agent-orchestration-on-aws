import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as cr from 'aws-cdk-lib/custom-resources';

// Define interface for stack props to accept bucket name
interface AthenaStackProps extends cdk.NestedStackProps {
  existingBucketName?: string;
  description?: string;
}

export class AthenaStack extends cdk.NestedStack {
  public readonly athenaQueryResultsBucket: s3.IBucket;
  public readonly athenaQueryResultsLocation: string;
  public readonly parameterName: string;

  constructor(scope: Construct, id: string, props: AthenaStackProps) {
    super(scope, id, props);

    // Get bucket name - either from props or construct from account ID
    const accountId = cdk.Stack.of(this).account;
    const bucketName = props.existingBucketName || `genai-athena-output-bucket-${accountId}`;
    
    console.log(`Using Athena output bucket: ${bucketName}`);
    
    // Use fromBucketName to reference the existing bucket
    this.athenaQueryResultsBucket = s3.Bucket.fromBucketName(
      this, 
      'ExistingAthenaOutputBucket',
      bucketName
    );

    // Set the query results location with the existing bucket
    this.athenaQueryResultsLocation = `s3://${bucketName}/query-results/`;
    
    // Create SSM parameter for Athena query results location with a unique name
    // Use a unique parameter name to avoid conflicts with existing parameters
    const paramName = `/athena/query-results-location-${cdk.Names.uniqueId(this)}`;
    
    new ssm.StringParameter(this, 'AthenaQueryResultsLocation', {
      parameterName: paramName,
      stringValue: this.athenaQueryResultsLocation,
      description: 'Location for storing Athena query results',
      type: ssm.ParameterType.SECURE_STRING,
      tier: ssm.ParameterTier.STANDARD
    });
    
    // Store the parameter name for reference
    this.parameterName = paramName;

    // Create a custom resource to configure the Athena workgroup
    const athenaWorkgroupSetupLambda = new lambda.Function(this, 'AthenaWorkgroupSetupFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.lambda_handler',
      code: lambda.Code.fromInline(`
import boto3
import logging
import json
import cfnresponse

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")
    
    try:
        athena_client = boto3.client('athena')
        output_location = '${this.athenaQueryResultsLocation}'
        
        if event['RequestType'] in ['Create', 'Update']:
            logger.info(f"Configuring Athena workgroup with output location: {output_location}")
            
            # Get current workgroup configuration
            try:
                workgroup_response = athena_client.get_work_group(WorkGroup='primary')
                logger.info(f"Current workgroup configuration: {workgroup_response}")
            except Exception as e:
                logger.warning(f"Error getting workgroup configuration: {str(e)}")
            
            # Update workgroup configuration
            try:
                athena_client.update_work_group(
                    WorkGroup='primary',
                    Description='Updated by MAC demo deployment',
                    ConfigurationUpdates={
                        'ResultConfigurationUpdates': {
                            'OutputLocation': output_location,
                        },
                        'EnforceWorkGroupConfiguration': True,
                        'PublishCloudWatchMetricsEnabled': True,
                        'RequesterPaysEnabled': False
                    }
                )
                logger.info(f"Successfully updated Athena workgroup with output location: {output_location}")
                
                # Verify the configuration was applied
                verify_response = athena_client.get_work_group(WorkGroup='primary')
                logger.info(f"Verified workgroup configuration: {verify_response}")
                
                cfnresponse.send(event, context, cfnresponse.SUCCESS, 
                    {"message": f"Athena workgroup configured with output location: {output_location}"})
            except Exception as e:
                logger.error(f"Error updating workgroup: {str(e)}")
                cfnresponse.send(event, context, cfnresponse.FAILED, 
                    {"message": f"Failed to update Athena workgroup: {str(e)}"})
        else:
            # Delete case - nothing to clean up for Athena workgroup configuration
            cfnresponse.send(event, context, cfnresponse.SUCCESS, 
                {"message": "No cleanup needed for Athena workgroup"})
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}")
        cfnresponse.send(event, context, cfnresponse.FAILED, 
            {"message": f"Unhandled error: {str(e)}"})
      `),
      timeout: cdk.Duration.minutes(2),
    });
    
    // Grant required permissions to the Lambda
    athenaWorkgroupSetupLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'athena:GetWorkGroup',
          'athena:UpdateWorkGroup',
          'athena:ListWorkGroups'
        ],
        resources: ['*']
      })
    );
    
    // Add S3 permissions for Athena results
    athenaWorkgroupSetupLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:ListMultipartUploadParts',
          's3:AbortMultipartUpload',
          's3:CreateBucket',
          's3:PutObject',
          's3:PutBucketPublicAccessBlock'
        ],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`
        ]
      })
    );
    
    // Create a provider for the custom resource
    const athenaWorkgroupProvider = new cr.Provider(this, 'AthenaWorkgroupProvider', {
      onEventHandler: athenaWorkgroupSetupLambda,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
    });
    
    // Create the custom resource
    const athenaWorkgroupSetup = new cdk.CustomResource(this, 'AthenaWorkgroupSetup', {
      serviceToken: athenaWorkgroupProvider.serviceToken,
      properties: {
        // Add a timestamp to force the custom resource to run on each deployment
        Timestamp: new Date().getTime().toString()
      }
    });
  }
}