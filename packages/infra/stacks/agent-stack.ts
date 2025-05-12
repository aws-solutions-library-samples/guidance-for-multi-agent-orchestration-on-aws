import * as cdk from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { storeAgentIds, storeWebsocketId } from '../lib/utils/ssm-utils';
import { agPolicy } from '../lib/policies/ag-policy';
import { bedrockAgentInferenceProfilePolicy } from '../lib/policies/inference-profile-policy';
import { invokeAgent } from '../lib/policies/invoke-agent';
import { bedrockLoggingPolicy } from '../lib/policies/iam-policy-statements';
import { DynamicLambdaLayer } from '../lib/custom-lambda-layer';
import { createS3DataSource, createActionGroupExecutor, createAgent } from '../lib/compatibility';

// CDK resources
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambda_python from '@aws-cdk/aws-lambda-python-alpha';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { AthenaStack } from './athena-stack';

// ** Additional imports for starting data source ingestion jobs **
import * as cr from 'aws-cdk-lib/custom-resources';
import { AwsCustomResource, AwsCustomResourcePolicy, AwsSdkCall, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';

// Bedrock constructs
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import { AgentActionGroup } from '@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock';
import { NagSuppressions } from 'cdk-nag';
import { OpenSearchSecurityPolicyHandler, IdempotentVectorKnowledgeBase } from '../lib/opensearch-helper';

export class BedrockAgentStack extends cdk.Stack {
  /**
   * Public/private properties for resource references in the stack
   */
  private resourceCounter = 0;
  public readonly layerCreatorFunction: lambda.Function;
  public readonly athenaSetupFunction: lambda_python.PythonFunction;
  public readonly personalizationActionGroupFunction: lambda_python.PythonFunction;
  public readonly orderMgmtActionGroupFunction: lambda_python.PythonFunction;
  public readonly productRecommendLambda: lambda_python.PythonFunction;
  public readonly wsInvokeAgentFn: lambda_python.PythonFunction;
  public readonly wsConnectFn: lambda_python.PythonFunction;
  public readonly wsDisconnectFn: lambda_python.PythonFunction;
  public readonly wsAuthorizerFn: lambda_python.PythonFunction;
  public readonly restApiHandlerFn: lambda_python.PythonFunction;
  public readonly CreateMainAgentLambda: lambda_python.PythonFunction;
  public readonly connectionsTable: dynamodb.Table;

  /**
   * Adds CDK Nag suppressions for common issues in this stack
   */
  private addCdkNagSuppressions(): void {
    // Add suppressions for all Lambda functions in the stack
    const lambdaFunctionList = [
      this.layerCreatorFunction, 
      this.athenaSetupFunction,
      this.personalizationActionGroupFunction,
      this.orderMgmtActionGroupFunction,
      this.productRecommendLambda,
      this.wsInvokeAgentFn,
      this.wsConnectFn,
      this.wsDisconnectFn,
      this.wsAuthorizerFn,
      this.restApiHandlerFn,
      this.CreateMainAgentLambda
    ];

    // Apply suppressions to each Lambda function directly
    lambdaFunctionList.forEach(func => {
      if (func) {
        NagSuppressions.addResourceSuppressions(
          func,
          [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'Lambda functions use AWS managed AWSLambdaBasicExecutionRole policy for CloudWatch Logs access, which is a best practice.'
            },
            {
              id: 'AwsSolutions-IAM5',
              reason: 'Lambda functions require specific permissions to access resources. These permissions are scoped as narrowly as possible for functional requirements.'
            },
            {
              id: 'AwsSolutions-L1', 
              reason: 'The Lambda functions are using Python 3.12, which is a recent runtime. AWS Solutions rule is using a stricter requirement.'
            }
          ],
          true
        );
      }
    });
    
    // Suppress DynamoDB warnings
    if (this.connectionsTable) {
      NagSuppressions.addResourceSuppressions(
        this.connectionsTable,
        [
          {
            id: 'AwsSolutions-DDB3',
            reason: 'Point-in-time recovery is not required for WebSocket connection table that stores ephemeral connection IDs.'
          }
        ],
        true
      );
    }
    
    // Add comprehensive stack-wide suppressions for all resources
    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWS managed policies are used for Lambda execution roles which is appropriate for this demo application.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Lambda functions require specific permissions to access resources, and Lambda frameworks use wildcards which is appropriate for this demo application.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Lambda functions use Python 3.12 and framework Lambda functions use runtimes defined by CDK.',
      },
      {
        id: 'AwsSolutions-APIG1',
        reason: 'API Gateway access logging is not required for WebSocket APIs in this demo application.',
      },
      {
        id: 'AwsSolutions-APIG4',
        reason: 'WebSocket API authorization is handled at the $connect route level, which secures the entire WebSocket connection. Individual routes do not need separate authorization.',
      }
    ], true);
    
    // Add specific suppressions for WebSocket API routes
    cdk.Aspects.of(this).add({
      visit(node: IConstruct) {
        // Suppress for WebSocket API route resources
        if (node instanceof cdk.CfnResource && 
            (node.cfnResourceType === 'AWS::ApiGatewayV2::Route' || 
             node.cfnResourceType === 'AWS::ApiGatewayV2::Stage')) {
          
          NagSuppressions.addResourceSuppressions(node, [
            {
              id: 'AwsSolutions-APIG4',
              reason: 'WebSocket API authorization is handled at the $connect route level, which secures the entire WebSocket connection. Individual routes do not need separate authorization.',
            },
            {
              id: 'AwsSolutions-APIG1',
              reason: 'API Gateway access logging is not required for WebSocket APIs in this demo application.',
            }
          ], true);
        }
        
        // Suppress for lambda-related resources
        if (node instanceof lambda.Function || 
            node instanceof lambda_python.PythonFunction ||
            (node instanceof cdk.CfnResource && 
             (node.cfnResourceType === 'AWS::Lambda::Function' || 
              node.cfnResourceType === 'AWS::Lambda::LayerVersion'))) {
              
          NagSuppressions.addResourceSuppressions(node, [
            {
              id: 'AwsSolutions-L1',
              reason: 'Lambda functions use Python 3.12 and framework Lambda functions use runtimes defined by CDK, which is appropriate for this demo application.',
            }
          ], true);
        }
        
        // Suppress for IAM roles and policies
        if ((node instanceof iam.Role || node instanceof iam.Policy) ||
            (node instanceof cdk.CfnResource && 
             (node.cfnResourceType === 'AWS::IAM::Role' || 
              node.cfnResourceType === 'AWS::IAM::Policy'))) {
              
          NagSuppressions.addResourceSuppressions(node, [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'AWS managed policies are used for Lambda execution roles which is appropriate for this demo application.',
            },
            {
              id: 'AwsSolutions-IAM5',
              reason: 'Lambda functions require specific permissions to access resources, and Lambda frameworks use wildcards which is appropriate for this demo application.',
            }
          ], true);
        }
        
        // Suppress specifically for Lambda provider functions and their roles
        if (node instanceof cdk.CfnResource && 
            (node.node.path.includes('Provider') || 
             node.node.path.includes('LogRetention') || 
             node.node.path.includes('Handler'))) {
              
          NagSuppressions.addResourceSuppressions(node, [
            {
              id: 'AwsSolutions-IAM4',
              reason: 'AWS managed policies are used for Lambda execution roles which is appropriate for this demo application.',
            },
            {
              id: 'AwsSolutions-IAM5',
              reason: 'Lambda functions require specific permissions to access resources, and Lambda frameworks use wildcards which is appropriate for this demo application.',
            },
            {
              id: 'AwsSolutions-L1',
              reason: 'Lambda functions use Python 3.12 and framework Lambda functions use runtimes defined by CDK.',
            }
          ], true);
        }
      }
    });
    
    // Instead of path-based suppressions, enhance our visit function to handle more specific cases
    cdk.Aspects.of(this).add({
      visit(node: IConstruct) {
        // Handle all Lambda function-related resources
        if (node.node.path.includes('Provider') || 
            node.node.path.includes('LogRetention') || 
            node.node.path.includes('Handler') ||
            node.node.path.includes('Function') ||
            node.node.path.includes('Lambda')) {
          
          NagSuppressions.addResourceSuppressions(
            node,
            [
              {
                id: 'AwsSolutions-IAM4',
                reason: 'AWS managed policies are used for Lambda execution roles which is appropriate for this demo application.',
              },
              {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda functions require specific permissions to access resources, and Lambda frameworks use wildcards which is appropriate for this demo application.',
              },
              {
                id: 'AwsSolutions-L1',
                reason: 'Lambda functions use Python 3.12 and framework Lambda functions use runtimes defined by CDK.',
              }
            ],
            true
          );
        }
        
        // Handle WebSocket API resources
        if (node.node.path.includes('WebSocketApi') || 
            node.node.path.includes('Route') || 
            node.node.path.includes('MyWebSocketApi') || 
            node.node.path.includes('WsStage')) {
          
          NagSuppressions.addResourceSuppressions(
            node,
            [
              {
                id: 'AwsSolutions-APIG1',
                reason: 'API Gateway access logging is not required for WebSocket APIs in this demo application.',
              },
              {
                id: 'AwsSolutions-APIG4',
                reason: 'WebSocket API authorization is handled at the $connect route level, which secures the entire WebSocket connection. Individual routes do not need separate authorization.',
              }
            ],
            true
          );
        }
      }
    });
  }

  /**
   * Adds an aspect to exclude AWS::OpenSearchServerless::SecurityPolicy and AWS::OpenSearchServerless::AccessPolicy resources from the stack
   * This prevents "Resource already exists" errors during CloudFormation deployment
   */
  private addResourceTransformHook(): void {
    // Simple direct aspect to mark security and access policies for exclusion
    cdk.Aspects.of(this).add({
      visit: (node: IConstruct) => {
        // Check if this is a CfnResource of either SecurityPolicy or AccessPolicy type
        if (node instanceof cdk.CfnResource && 
            (node.cfnResourceType === 'AWS::OpenSearchServerless::SecurityPolicy' || 
             node.cfnResourceType === 'AWS::OpenSearchServerless::AccessPolicy')) {
          
          //console.log(`Excluding OpenSearch resource: ${node.cfnResourceType} - ${node.node.id}`);
          
          // Mark the resource to be excluded from CloudFormation template
          node.node.addMetadata('aws:cdk:skip', 'true');
          
          // Force retention policy to RETAIN to be safe
          node.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
          
          // Give it a unique logical ID to avoid conflicts
          // Using a counter rather than timestamp to ensure no collisions
          const originalId = node.node.id || 'UnknownPolicy';
          const uniqueCounter = ++this.resourceCounter;
          const uniqueId = `Skipped${originalId}${uniqueCounter}`;
          
          //console.log(`Assigning unique logical ID: ${uniqueId}`);
          node.overrideLogicalId(uniqueId);
        }
      }
    });
  }
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a direct Lambda function to create a proper boto3 layer
    this.layerCreatorFunction = new lambda.Function(this, 'LayerCreatorFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda_assets/layer_creator')),
      handler: 'index.lambda_handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        PYTHONPATH: '/var/task:/opt/python'
      }
    });
    
    // Grant Lambda permissions to create layers
    this.layerCreatorFunction.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'lambda:PublishLayerVersion',
        'lambda:AddLayerVersionPermission'
      ],
      resources: ['*']
    }));
    
    // Create a custom resource that will invoke the layer creator during deployment
    const layerCreatorProvider = new cr.Provider(this, 'LayerCreatorProvider', {
      onEventHandler: this.layerCreatorFunction,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
    });
    
    // Define the custom resource to create the boto3 layer
    const boto3LayerResource = new cdk.CustomResource(this, 'Boto3LayerResource', {
      serviceToken: layerCreatorProvider.serviceToken,
      properties: {
        LayerName: 'layer-boto3',
        Description: 'Lambda layer containing boto3',
        CompatibleRuntimes: ['python3.11', 'python3.12'],
        Dependencies: { 'boto3': 'latest' },
        LicenseInfo: 'MIT',
        // Force update on each deployment
        Timestamp: new Date().getTime()
      }
    });
    
    // Get the layer ARN output from the custom resource
    const boto3LayerArn = boto3LayerResource.getAttString('LayerVersionArn');
    
    // Create the Lambda layer reference from the ARN
    const Boto3Layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'Boto3Layer',
      boto3LayerArn
    );
    
    // We'll only use the boto3 layer
    
    // Create the OpenSearch security policy handler for idempotent resource creation
    const securityPolicyHandler = new OpenSearchSecurityPolicyHandler(this, 'SecurityPolicyHandler');
    
    // Skip creating OpenSearch security policy resources by marking them to be excluded
    // This ensures we don't hit "Resource already exists" errors
    this.addResourceTransformHook();

    // ──────────────────────────────────────────────────────────────────────────
    // 1) Common Buckets: AccessLogs + DocBucket
    // ──────────────────────────────────────────────────────────────────────────
    const accesslogBucket = new s3.Bucket(this, 'AccessLogs', {
      enforceSSL: true,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    NagSuppressions.addResourceSuppressions(accesslogBucket, [
      {
        id: 'AwsSolutions-S1',
        reason: 'No need to enable access logging for the AccessLogs bucket itself.',
      },
    ]);

    // ──────────────────────────────────────────────────────────────────────────
    // 2) Shared OpenAPI schema (reused for the Agents' action groups)
    // ──────────────────────────────────────────────────────────────────────────
    const ag_schema = bedrock.ApiSchema.fromInline(
      JSON.stringify({
        openapi: '3.0.1',
        info: {
          title: 'AthenaQuery API',
          description: 'API for querying data from an Athena database',
          version: '1.0.0',
        },
        paths: {
          '/athenaQuery': {
            post: {
              description: 'Execute a query on an Athena database',
              operationId: 'executeAthenaQuery',
              requestBody: {
                description: 'Athena query details',
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        procedureId: {
                          type: 'string',
                          description: 'Unique identifier for the procedure',
                          nullable: true,
                        },
                        query: {
                          type: 'string',
                          description: 'SQL Query',
                        },
                      },
                      required: ['query'],
                    },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Successful response with query results',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          resultSet: {
                            type: 'array',
                            items: { type: 'object' },
                            description: 'Results returned by the query',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    );

    // Instead of embedding Python code, point `entry` + `index` to index.py
    const athenaQueryLambdaProps: lambda_python.PythonFunctionProps = {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/athena_query_tool'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the boto3 layer
    };

    // ──────────────────────────────────────────────────────────────────────────
    // 3) PERSONALIZATION AGENT + KB
    // ──────────────────────────────────────────────────────────────────────────
    // Use our idempotent version that handles existing security policies
    const personalizationKBWrapper = new IdempotentVectorKnowledgeBase(this, 'PersonalizationKB', {
      embeddingsModel: bedrock.BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
      instruction: 'Use this knowledge base to retrieve user preferences and browsing history.'
    }, securityPolicyHandler);
    const personalizationKB = personalizationKBWrapper.knowledgeBase;

    // If you want to reference an existing bucket named "genai-labs-personalize-unstr-<account>", do:
    const personalizationDataBucket = s3.Bucket.fromBucketName(
      this,
      'PersonalizeUnstructuredBucket',
      `genai-labs-personalize-unstr-${this.account}`
    );

    const personalizationDataSource = createS3DataSource(
      this, 
      'PersonalizationDataSource', 
      personalizationDataBucket,
      personalizationKB,
      'personalization-data'
    );

    const personalizationAgent = createAgent(
      this, 
      'PersonalizationAgent', 
      {
        name: 'PersonalizationAgent',
        foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0,
        instruction: `You are the Product Recommendation Agent in an AI-driven customer support system, responsible for analyzing structured customer data—specifically purchase history, product details, and customer feedback. You us this information to help provide product suggestions. 

  1. Data Retrieval and Analysis
  - **Access to Customers Preferences Table:** Leverage direct access to the personalization.customers_preferences table in Amazon Athena, containing vital customer attributes including demographics, preference data, and loyalty information.
  - **Construct Targeted SQL Queries:** Develop Presto SQL queries against the customers_preferences table using these guidelines:
    - Use lowercase formatting for all queries and referenced values.
    - Employ "LIKE" operators instead of "=" when comparing string values (e.g., preferred_category LIKE '%electronics%').
    - Verify all column names (customer_id, age, gender, income, location, marital_status, preferred_category, price_range, preferred_brand, loyalty_tier) before query execution.
    - Target specific preference data such as price sensitivity, brand loyalty, and category interests.

  2. Knowledge Base Utilization
  - **Enrich Structured Preference Data:** Augment the foundational customer data from the customers_preferences table with insights from unstructured sources to create comprehensive customer profiles.
  - **Correlate Browsing Patterns with Stated Preferences:** Identify alignment or divergence between explicitly stated preferences in the customers_preferences table and actual browsing/purchasing behavior.

  3. Query Execution
  - **Execute Preference-Based Queries:** Run SQL queries against the customers_preferences table to segment customers by demographic factors, price sensitivity, and brand loyalty.

  4. Profile Enhancement and Personalization
  - **Preference-Informed Personalization:** Utilize the detailed preference data from customers_preferences table (particularly preferred_category, price_range, and preferred_brand) as the foundation for all personalization efforts.
  - **Loyalty-Based Experience Tailoring:** Leverage the loyalty_tier information to provide tier-appropriate recommendations and messaging that acknowledges the customer's relationship status.
  - **Deliver Demographically Relevant Responses:** Craft communications that respect demographic factors (age, income, location, marital_status) to ensure contextually appropriate interactions.

  Quick Reference of Product Categories:
      - Headphones: Audio devices for personal listening
      - Watch: Wearable smart devices
      - Speaker: Home and portable audio
      - Computer: Laptops and desktops
      - Phone: Smartphones and mobile devices
    
  Here are the table schemas for the Amazon Athena database, with sql query examples:
  
  <athena_schemas>
      <customers_preferences_table_schema>
      CREATE EXTERNAL TABLE IF NOT EXISTS personalization.customers_preferences (
          \`customer_id\` STRING,
          \`age\` INT,
          \`gender\` STRING,
          \`income\` STRING,
          \`location\` STRING,
          \`marital_status\` STRING,
          \`preferred_category\` STRING,
          \`price_range\` STRING,
          \`preferred_brand\` STRING,
          \`loyalty_tier\` STRING
      )
      ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
      WITH SERDEPROPERTIES (
          'serialization.format' = ','
      ) LOCATION 's3://genai-labs-mac-data-str-{account_number}/personalization/structured/customers_preferences/'
      TBLPROPERTIES ('skip.header.line.count'='1');
      </customers_preferences_table_schema>
  </athena_schemas>
  
  <athena_examples>
      <athena_example>
      SELECT *
      FROM personalization.customers_preferences
      WHERE customer_id = 'cust001';
      </athena_example>
  
      <athena_example>
      SELECT preferred_category, COUNT(*) AS total_customers
      FROM personalization.customers_preferences
      GROUP BY preferred_category;
      </athena_example>
  </athena_examples>
    `,
        knowledgeBases: [personalizationKB],
        userInputEnabled: true,
        shouldPrepareAgent: true,
        description: 'Agent for personalization data, referencing a knowledge base and using an action group.',
      },
      1800
    );

    // Reference the existing bucket from BucketStack by constructing the bucket name
    const accountId = cdk.Stack.of(this).account;
    const athenaOutputBucketName = `genai-athena-output-bucket-${accountId}-${this.region}`;
    
    // Create Athena resources with reference to the existing bucket
    const athenaStack = new AthenaStack(this, 'AthenaResources', {
      description: 'Athena resources for personalization queries',
      existingBucketName: athenaOutputBucketName
    });

    // Create Lambda function to set up Athena resources
    const athenaSetupPolicies = [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Athena permissions
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
          'athena:GetWorkGroup',
          'athena:UpdateWorkGroup',
          'athena:ListWorkGroups',
          'athena:GetDataCatalog',
          'athena:GetDatabase',
          'athena:GetTableMetadata',
          'athena:ListDatabases',
          'athena:ListTableMetadata'
        ],
        resources: ['*']
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Glue permissions for AWS Glue Data Catalog operations
          'glue:CreateDatabase',
          'glue:CreateTable',
          'glue:DeleteDatabase',
          'glue:DeleteTable',
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetTable',
          'glue:GetTables',
          'glue:UpdateDatabase',
          'glue:UpdateTable'
        ],
        resources: ['*']
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:ListMultipartUploadParts',
          's3:AbortMultipartUpload',
          's3:PutObject'
        ],
        resources: [
          athenaStack.athenaQueryResultsBucket.bucketArn,
          `${athenaStack.athenaQueryResultsBucket.bucketArn}/*`
        ]
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:PutParameter'
        ],
        resources: ['*']
      })
    ];
    
    // All Lambda functions will use Boto3Layer
    
    this.athenaSetupFunction = new lambda_python.PythonFunction(this, 'AthenaSetupFunction', {
      entry: path.join(__dirname, '../lambda_assets/athena_setup'),
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_handler',  // Use the correct handler function name
      environment: {
        ATHENA_RESULTS_LOCATION: athenaStack.athenaQueryResultsLocation,
        ATHENA_PARAMETER_NAME: athenaStack.parameterName,
      },
      timeout: cdk.Duration.minutes(5),
      initialPolicy: athenaSetupPolicies,
      bundling: {
        assetExcludes: ['.venv', '__pycache__', '.pytest_cache', '.mypy_cache'],
      },
      layers: [Boto3Layer] // Use the boto3 layer directly
    });

    // Custom resource to trigger Athena setup
    const athenaSetupResource = new cr.Provider(this, 'AthenaSetupProvider', {
      onEventHandler: this.athenaSetupFunction,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
    });

    const athenaSetupCustomResource = new cdk.CustomResource(this, 'AthenaSetup', {
      serviceToken: athenaSetupResource.serviceToken,
      properties: {
        // Add a timestamp to force the custom resource to run on each deployment
        Timestamp: new Date().getTime().toString()
      }
    });
    
    // Add dependencies to ensure proper resource creation order
    // This ensures our athenaSetupCustomResource runs after the athenaStack
    // and any resources inside it like the workgroup configuration
    athenaSetupCustomResource.node.addDependency(athenaStack);
    
    // Output the Athena query results location for verification
    new cdk.CfnOutput(this, 'AthenaQueryResultsLocation', {
      value: athenaStack.athenaQueryResultsLocation,
      description: 'The S3 location configured for Athena query results'
    });
    
    // Create environment variables object
    const athenaEnvVars = {
      ATHENA_RESULTS_BUCKET: athenaStack.athenaQueryResultsBucket.bucketName,
      ATHENA_RESULTS_LOCATION: athenaStack.athenaQueryResultsLocation,
      ATHENA_PARAMETER_NAME: athenaStack.parameterName,
    };

    // Create new initialPolicy with combined permissions
    const athenaQueryPolicy = [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter'
        ],
        resources: [
          `arn:aws:ssm:${this.region}:${this.account}:parameter/${athenaStack.parameterName}`,
          `arn:aws:ssm:${this.region}:${this.account}:parameter/athena*`
        ]
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetBucketLocation',
          's3:GetObject',
          's3:ListBucket',
          's3:ListBucketMultipartUploads',
          's3:ListMultipartUploadParts',
          's3:AbortMultipartUpload',
          's3:PutObject'
        ],
        resources: [
          athenaStack.athenaQueryResultsBucket.bucketArn,
          `${athenaStack.athenaQueryResultsBucket.bucketArn}/*`
        ]
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Athena permissions
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'athena:StopQueryExecution',
          'athena:GetWorkGroup',
          'athena:GetDataCatalog',
          'athena:GetDatabase',
          'athena:GetTableMetadata',
          'athena:ListDatabases',
          'athena:ListTableMetadata'
        ],
        resources: ['*']
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          // Glue permissions for AWS Glue Data Catalog operations
          'glue:GetDatabase',
          'glue:GetDatabases',
          'glue:GetTable',
          'glue:GetTables',
          'glue:GetPartitions',
          'glue:BatchGetPartition'
        ],
        resources: ['*']
      })
    ];
    
    // Create a new object with the updated policy and environment variables
    const updatedLambdaProps = {
      ...athenaQueryLambdaProps,
      initialPolicy: athenaQueryPolicy,
      environment: athenaEnvVars
    };

    // Create the Personalization function after setting up Athena resources
    this.personalizationActionGroupFunction = new lambda_python.PythonFunction(
      this,
      'PersonalizationActionGroupFunction',
      updatedLambdaProps
    );
    
    // Ensure the function waits for Athena setup
    this.personalizationActionGroupFunction.node.addDependency(athenaSetupCustomResource);

    const personalizationActionGroup = new AgentActionGroup({
      name: 'personalization-tool',
      description: 'Handles user personalization queries from Athena or the knowledge base.',
      executor: createActionGroupExecutor(this.personalizationActionGroupFunction),
      enabled: true,
      apiSchema: ag_schema,
    });
    personalizationAgent.role.addToPrincipalPolicy(bedrockAgentInferenceProfilePolicy(this));
    personalizationAgent.role.addToPrincipalPolicy(agPolicy);
    personalizationAgent.addActionGroup(personalizationActionGroup);
    this.personalizationActionGroupFunction.addToRolePolicy(agPolicy);

    const PersonalizationAgentAliasId = new bedrock.AgentAlias(this, 'PersonalizationAgentAlias', {
      aliasName: 'sonnet_V1',
      agent: personalizationAgent,
      description: 'Alias for the Personalization agent'
    });

    storeAgentIds(this, personalizationAgent.agentId, PersonalizationAgentAliasId.aliasId, 'personalization');

    // Important: Ensure alias creation depends on the agent having prepared:
    PersonalizationAgentAliasId.node.addDependency(personalizationAgent);

    // Create the Lambda function that will handle data source ingestion with retries
    const dataSourceIngestionFunction = new lambda_python.PythonFunction(this, 'DataSourceIngestionFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/datasource_ingestion'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      // Use the new boto3 layer instead
      layers: [Boto3Layer],
      initialPolicy: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'bedrock:StartIngestionJob',
            'bedrock:ListIngestionJobs',
            'bedrock:GetIngestionJob',
            'iam:CreateServiceLinkedRole',
            'iam:PassRole',
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: ['*'],
        }),
      ],
    });
    
    // Create a provider for the data source ingestion custom resource
    const dataSourceIngestionProvider = new cr.Provider(this, 'DataSourceIngestionProvider', {
      onEventHandler: dataSourceIngestionFunction,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });
    
    // ** Custom Resource to start ingestion for PERSONALIZATION data source WITH RETRIES **
    const personalizationSyncJob = new cdk.CustomResource(this, 'PersonalizationSyncJob', {
      serviceToken: dataSourceIngestionProvider.serviceToken,
      properties: {
        dataSourceId: personalizationDataSource.dataSourceId,
        knowledgeBaseId: personalizationKB.knowledgeBaseId,
        PhysicalResourceId: 'PersonalizationDataSourceIngestion',
        // Add a timestamp to force updates
        Timestamp: new Date().getTime().toString()
      }
    });
    personalizationSyncJob.node.addDependency(personalizationDataSource);

    // ──────────────────────────────────────────────────────────────────────────
    // 4) ORDER MANAGEMENT AGENT
    // ──────────────────────────────────────────────────────────────────────────
    this.orderMgmtActionGroupFunction = new lambda_python.PythonFunction(this, 'OrderMgmtActionGroupFunction', {
      ...updatedLambdaProps,
    });

    const orderManagementAgent = new bedrock.Agent(this, 'OrderManagementAgent', {
      name: 'OrderManagementAgent',
      foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_HAIKU_V1_0,
      instruction: `You are an Order Management expert responsible for handling customer inquiries related to orders. You have access to product inventory, and customer orders. Your goal is to retrieve related inventory data and customer orders from Amazon Athena database, then provide accurate, and helpful.
  
  1. Query Analysis and Request Interpretation:
    - **Extract Information Requirements**: Carefully analyze customer inquiries to identify the primary data needs (order status, shipping details, returns/exchanges, product availability, etc.).
    - **Develop Structured Approach**: Break down complex requests into targeted sub-queries that can be efficiently executed against available data sources.
    - **Map Requirements to Data Structure**: Identify which tables in the order_management schema (particularly orders and inventory) contain the necessary information for each sub-query.
    - **Anticipate Information Limitations**: Consider potential data constraints and prepare alternate query approaches if primary data elements might be unavailable.

  2. SQL Query Development and Optimization:
    - **Construct Presto SQL Queries**: Write ANSI SQL-compatible queries specifically formatted for Amazon Athena execution.
    - **Adhere to Technical Guidelines**:
      * Use exclusively lowercase format for all queries and referenced values
      * Keep queries concise and straightforward to ensure Athena compatibility
      * Avoid unsupported functions (such as DATE_SUB and CURRENT_DATE)
      * Use "LIKE" operator instead of equality (=) when comparing text values in searches
      * Verify all column names against the relevant table schema
    - **Optimize Query Efficiency**: Structure queries to retrieve precisely what's needed without unnecessary processing or joins.

  3. Query Execution and Results Management:
    - **Execute and Validate**: Run the finalized SQL queries against Amazon Athena to retrieve current order and inventory information.
    - **Present Transparent Results**: Include both the executed query and the exact results retrieved in your response to maintain accountability.
    - **Maintain Data Integrity**: Present only information that was explicitly returned by the query results.
    - **Address Information Gaps**: When requested information cannot be located, explicitly state "I could not find any information on..." rather than making assumptions or providing estimates.
      
  Quick Reference of Product Categories:
      - headphones: Personal audio devices
      - watch: Wearable smart or digital watches
      - speaker: Portable or home audio speakers
      - computer: Laptops and desktops
      - phone: Smartphones and mobile devices
  
  These are table schemas for the Amazon Athena database:

  1. Table schema1
      <inventory_table_schema> 
          CREATE EXTERNAL TABLE IF NOT EXISTS order_management.inventory (
              \`product_id\` STRING,
              \`product_name\` STRING,
              \`category\` STRING,
              \`quantity\` INT,
              \`in_stock\` STRING,
              \`reorder_threshold\` INT,
              \`reorder_quantity\` INT,
              \`last_restock_date\` STRING
          )
          ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
          WITH SERDEPROPERTIES (
              'serialization.format' = ','
          ) LOCATION 's3://genai-labs-mac-data-str-{account_number}/inventory/'
          TBLPROPERTIES ('skip.header.line.count'='1');
      </inventory_table_schema>
  
  2. Table schema 2
      <orders_table_schema> 
          CREATE EXTERNAL TABLE IF NOT EXISTS order_management.orders (
              \`order_id\` STRING,
              \`customer_id\` STRING,
              \`product_id\` STRING,
              \`product_name\` STRING,
              \`order_status\` STRING,
              \`shipping_status\` STRING,
              \`return_exchange_status\` STRING,
              \`order_date\` STRING,
              \`delivery_date\` STRING
          )
          ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
          WITH SERDEPROPERTIES (
              'serialization.format' = ','
          ) LOCATION 's3://genai-labs-mac-data-str-{account_number}/orders/'
          TBLPROPERTIES ('skip.header.line.count'='1');
      </orders_table_schema>
  
  These are examples of Amazon Athena SQL queries:
  1. Example query 1
      <athena_example> 
      SELECT *
      FROM order_management.orders
      WHERE customer_id = 'CUST001';
      </athena_example>
  
  2. Example query 2
      <athena_example> 
      SELECT 
          product_id,
          product_name,
          category,
          quantity,
          in_stock,
          reorder_threshold,
          reorder_quantity,
          last_restock_date
      FROM order_management.inventory
      WHERE product_id = 'p002';
      </athena_example>
  
  3. Example query 3
      <athena_example> 
      SELECT order_status, COUNT(*) AS total_orders
      FROM order_management.orders
      GROUP BY order_status;
      </athena_example>
  
  4. Example query 4
      <athena_example>
      SELECT product_name, quantity, in_stock
      FROM order_management.inventory
      WHERE in_stock = 'Yes';
      </athena_example>
        `,
      userInputEnabled: true,
      shouldPrepareAgent: true,
      description: 'Agent for order & inventory management, using Amazon Athena via an acton group.',
      idleSessionTTL: cdk.Duration.seconds(1800),
    });

    const orderMgmtActionGroup = new AgentActionGroup({
      name: 'orderMgmtTool',
      description: 'Executes Athena queries for order management, shipping, returns, etc.',
      executor: bedrock.ActionGroupExecutor.fromlambdaFunction(this.orderMgmtActionGroupFunction),
      enabled: true,
      apiSchema: ag_schema,
    });
    orderManagementAgent.role.addToPrincipalPolicy(bedrockAgentInferenceProfilePolicy(this));
    orderManagementAgent.role.addToPrincipalPolicy(agPolicy);
    this.orderMgmtActionGroupFunction.addToRolePolicy(agPolicy);
    orderManagementAgent.addActionGroup(orderMgmtActionGroup);

    const orderMgmtAgentAliasId = new bedrock.AgentAlias(this, 'OrderMgmtAgentAlias', {
      aliasName: 'haiku_3_5',
      agent: orderManagementAgent,
      description: 'Alias for the Order Management agent',
    });
    storeAgentIds(this, orderManagementAgent.agentId, orderMgmtAgentAliasId.aliasId, 'order_management');

    // Important: Ensure alias creation depends on the agent having prepared:
    orderMgmtAgentAliasId.node.addDependency(orderManagementAgent);

    // ──────────────────────────────────────────────────────────────────────────
    // 5) PRODUCT RECOMMENDATION AGENT + KB
    // ──────────────────────────────────────────────────────────────────────────
    // Reference the existing bucket named "genai-labs-prod-rec-unstr-<account>-<region>"
    const productRecExistingBucket = s3.Bucket.fromBucketName(
      this,
      'ProductRecUnstructuredBucket',
      `genai-labs-prod-rec-unstr-${this.account}-${this.region}`
    );

    // Use our idempotent version that handles existing security policies
    const productRecKBWrapper = new IdempotentVectorKnowledgeBase(this, 'ProductRecKB', {
      embeddingsModel: bedrock.BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
      instruction: 'Use this knowledge base when customers ask about product recommendations.'
    }, securityPolicyHandler);
    const productRecKB = productRecKBWrapper.knowledgeBase;

    const productRecDataSource = createS3DataSource(
      this, 
      'ProductRecDataSource',
      productRecExistingBucket,
      productRecKB,
      'product-recommendation-data'
      // Removed the prefix to use the entire bucket
    );

    this.productRecommendLambda = new lambda_python.PythonFunction(this, 'ProductRecommendationLambda', {
      ...updatedLambdaProps,
    });

    const productRecommendActionGroup = new AgentActionGroup({
      name: 'query-prod-rec-info',
      description: 'Manage product recommendation queries via Athena, etc.',
      executor: createActionGroupExecutor(this.productRecommendLambda),
      enabled: true,
      apiSchema: ag_schema,
    });

    const productRecommendAgent = createAgent(
      this,
      'ProductRecommendAgent',
      {
        name: 'ProductRecommendAgent',
        foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0,
        instruction: `You are the Product Recommendation Agent in an AI-driven customer support system, responsible for analyzing structured customer data—specifically purchase history and product details—to provide personalized product suggestions. Your goal is to enhance the customer's shopping experience by offering relevant, timely recommendations that align with their interests and purchasing behavior.
  
  1. Data Retrieval and Analysis:
    - Identify Relevant Data: Determine the specific product and purchase history information needed to generate tailored recommendations. Use structured data from the Amazon Athena database, including purchase history and product catalog details, to inform your recommendations.
    - Construct SQL Queries: Using the provided schemas, create SQL queries in Presto SQL format (ANSI SQL-compatible) to extract necessary data, such as customer purchases, product categories, ratings, and pricing information from the Amazon Athena database.
    - When creating queries for product_name references, always use "LIKE" instead of "=" in the syntax when comparing to values.
    - Doublecheck every column name used in a SQL query to confirm its in the table schema.
    - Access Unstructured Data: Use the knowledge base to perform semantic searches on customer browser history. These insights provide additional context on customer preferences and interests.

  2. Query Construction and Execution:
    - Reference Structured Data: Access the product_catalog and purchase_history tables to retrieve relevant product information and recent customer purchases. Ensure that the queries accurately target fields like product ratings, prices, purchase dates, and quantities.
    - Execute SQL Queries: Run SQL queries against Amazon Athena to retrieve the latest customer data reflecting their interactions and preferences, ensuring the information aligns with recent customer activities.
    - Validate Data Accuracy: Confirm that the retrieved structured data is up-to-date and accurately reflects the customer's most recent interactions and preferences.
    - All queries and referenced values need to be in lowercase format.
    - Doublecheck every column name used in a SQL query to confirm its in the table schema.
    
  3. Profile Update and Recommendation Personalization:
    - Update Profiles: Integrate structured data insights from recent purchases and product catalog details into the customer's profile, ensuring it reflects their current shopping preferences.
    - Generate and Personalize Recommendations: Use purchase history, product data, and customer feedback to create tailored product recommendations that resonate with the customer's unique interests and past experiences.

  Quick Reference of Product Categories:
  - Headphones: Personal audio devices, noise-canceling options
  - Watch: Wearable devices, fitness tracking
  - Speaker: Portable or home audio with various sound enhancements
  - Computer: Laptops and desktops with varying performance specs
  - Phone: Smartphones and 5G-enabled devices
  
  Here are the table schemas for the Amazon Athena database:
  
  <athena_schemas>
  <product_catalog_table_schema>
  CREATE EXTERNAL TABLE IF NOT EXISTS prod_rec.product_catalog (
      \`product_id\` STRING,
      \`product_name\` STRING,
      \`category\` STRING,
      \`price\` DOUBLE,
      \`description\` STRING,
      \`rating\` DOUBLE,
      \`popularity\` STRING
  )
  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
  WITH SERDEPROPERTIES (
      'serialization.format' = ','
  ) LOCATION 's3://genai-labs-mac-data-str-{account_number}/prod_rec/structured/catalog/'
  TBLPROPERTIES ('skip.header.line.count'='1');
  </product_catalog_table_schema>
  
  <purchase_history_table_schema>
  CREATE EXTERNAL TABLE IF NOT EXISTS prod_rec.purchase_history (
      \`customer_id\` STRING,
      \`product_id\` STRING,
      \`purchase_date\` STRING,
      \`quantity\` INT,
      \`purchase_amount\` DOUBLE,
      \`payment_method\` STRING
  )
  ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
  WITH SERDEPROPERTIES (
      'serialization.format' = ','
  ) LOCATION 's3://genai-labs-mac-data-str-{account_number}/prod_rec/structured/history/'
  TBLPROPERTIES ('skip.header.line.count'='1');
  </purchase_history_table_schema>
  
  </athena_schemas>
  
  <athena_examples>
  <athena_example>
  SELECT *
  FROM prod_rec.product_catalog
  WHERE product_name LIKE '%ultrabook pro%';
  </athena_example>
  
  <athena_example>
  SELECT *
  FROM prod_rec.product_catalog
  WHERE product_id = 'p001';
  </athena_example>
  
  <athena_example>
  SELECT category, COUNT(*) AS total_products
  FROM prod_rec.product_catalog
  GROUP BY category;
  </athena_example>
  
  <athena_example>
  SELECT customer_id, SUM(purchase_amount) AS total_spent
  FROM prod_rec.purchase_history
  GROUP BY customer_id
  ORDER BY total_spent DESC
  LIMIT 10;
  </athena_example>
  </athena_examples>
      `,
        knowledgeBases: [productRecKB],
        userInputEnabled: true,
        shouldPrepareAgent: true,
        description: 'Agent for providing product recommendations using a custom knowledge base and action group.',
      },
      1800
    );

    productRecommendAgent.role.addToPrincipalPolicy(bedrockAgentInferenceProfilePolicy(this));
    productRecommendAgent.role.addToPrincipalPolicy(agPolicy);
    productRecommendAgent.addActionGroup(productRecommendActionGroup);
    this.productRecommendLambda.addToRolePolicy(agPolicy);

    const productRecommendAgentAliasId = new bedrock.AgentAlias(this, 'ProductRecommendAgentAlias', {
      aliasName: 'sonnet_3_5_V1',
      agent: productRecommendAgent,
      description: 'Alias for the Product Recommendation agent'
    });
    storeAgentIds(this, productRecommendAgent.agentId, productRecommendAgentAliasId.aliasId, 'product_recommendation');

    // Important: Ensure alias creation depends on the agent having prepared:
    productRecommendAgentAliasId.node.addDependency(productRecommendAgent);

    // ** Custom Resource to start ingestion for PRODUCT RECOMMENDATION data source WITH RETRIES **
    const productRecSyncJob = new cdk.CustomResource(this, 'ProductRecSyncJob', {
      serviceToken: dataSourceIngestionProvider.serviceToken,
      properties: {
        dataSourceId: productRecDataSource.dataSourceId,
        knowledgeBaseId: productRecKB.knowledgeBaseId,
        PhysicalResourceId: 'ProductRecDataSourceIngestion',
        // Add a timestamp to force updates but slightly different than the personalization one
        Timestamp: (new Date().getTime() + 1000).toString()
      }
    });
    productRecSyncJob.node.addDependency(productRecDataSource);

    // ──────────────────────────────────────────────────────────────────────────
    // 6) TROUBLESHOOT AGENT + KB
    // ──────────────────────────────────────────────────────────────────────────
    const troubleshootBucket = new s3.Bucket(this, 'TroubleshootBucket', {
      enforceSSL: true,
      versioned: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      serverAccessLogsBucket: accesslogBucket,
      serverAccessLogsPrefix: 'troubleshootLogs/',
    });

    // Use our idempotent version that handles existing security policies
    const troubleshootKBWrapper = new IdempotentVectorKnowledgeBase(this, 'TroubleshootKB', {
      embeddingsModel: bedrock.BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
      instruction: 'Use this KB to provide troubleshooting steps for product issues and reference FAQs.'
    }, securityPolicyHandler);
    const troubleshootKB = troubleshootKBWrapper.knowledgeBase;

    const troubleshootExistingBucket = s3.Bucket.fromBucketName(
      this,
      'TroubleshootExistingBucket',
      `genai-labs-ts-faq-unstr-${this.account}-${this.region}`
    );

    const troubleshootDataSource = createS3DataSource(
      this,
      'TroubleshootDataSource',
      troubleshootExistingBucket,
      troubleshootKB,
      'troubleshoot-data'
    );

    const troubleshootAgent = new bedrock.Agent(this, 'TroubleshootAgent', {
      name: 'TroubleshootAgent',
      foundationModel: bedrock.BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_HAIKU_V1_0,
      instruction: `You are the Personalization Agent in an AI-driven customer support system, responsible for maintaining and updating persistent customer profiles. Your objective is to enhance the customer experience by providing personalized responses and recommendations based on individual preferences, past behaviors, purchase history, and recent interactions.
  
  1. Data Retrieval and Analysis:
  - Identify Relevant Data: Determine specific customer details required for personalization, including demographics, preferences, purchase history, and interaction history. Reference the structured data in Amazon Athena.
  - Construct SQL Queries: Use the provided schemas to create SQL queries in Presto SQL format (ANSI SQL-compatible) that retrieve necessary structured data, such as preferred product categories, loyalty status, and recent purchase history.
  - All queries and referenced values need to be in lowercase format.
  - Doublecheck every column name used in a SQL query to confirm its in the table schema.
  - When creating queries to search, always use "LIKE" instead of "=" in the syntax when comparing to values.

  
  2. Knowledge Base Utilization:
  - Access Unstructured Data: Perform semantic searches across unstructured data sources, such as customer browsing history, chat transcripts, and feedback. These insights provide additional context for understanding a customer’s interests, product comparisons, and frequently asked questions.
  - Analyze Interaction History: Review past browsing behaviors (e.g., products viewed, actions taken) to gain insights into the customer’s recent interests, preferences, and interaction patterns.
  
  3. Query Execution:
  - Execute SQL Queries: Run SQL queries against the Amazon Athena database to fetch updated customer information from the customer_preferences table.
  - Ensure Data Accuracy: Validate that retrieved data accurately reflects the customer’s latest demographics, preferences, and purchase records, ensuring personalized recommendations are based on current information.

  4. Profile Update and Personalization:
  - Update Customer Profiles: Integrate recent findings from both structured and unstructured data into the customer’s profile, reflecting updates in preferences, frequently viewed products, and newly recorded purchases.
  - Personalize Responses: Use the enriched customer profile, which combines structured data and browsing history, to craft responses that align with the customer’s unique preferences, recent activities, and any previously expressed interests.
        `,
      knowledgeBases: [troubleshootKB],
      userInputEnabled: true,
      shouldPrepareAgent: true,
      description: 'Agent for troubleshooting product issues and referencing an FAQ knowledge base.',
      idleSessionTTL: cdk.Duration.seconds(1800),
    });
    troubleshootAgent.role.addToPrincipalPolicy(bedrockAgentInferenceProfilePolicy(this));

    const troubleshootAgentAliasId = new bedrock.AgentAlias(this, 'TroubleshootAgentAlias', {
      aliasName: 'claude_3_5_haiku',
      agent: troubleshootAgent,
      description: 'Alias for the Troubleshoot agent'
    });

    storeAgentIds(this, troubleshootAgent.agentId, troubleshootAgentAliasId.aliasId, 'troubleshoot');
    
    // Important: Ensure alias creation depends on the agent having prepared:
    troubleshootAgentAliasId.node.addDependency(troubleshootAgent);

    // ** Custom Resource to start ingestion for TROUBLESHOOT data source WITH RETRIES **
    const troubleshootSyncJob = new cdk.CustomResource(this, 'TroubleshootSyncJob', {
      serviceToken: dataSourceIngestionProvider.serviceToken,
      properties: {
        dataSourceId: troubleshootDataSource.dataSourceId,
        knowledgeBaseId: troubleshootKB.knowledgeBaseId,
        PhysicalResourceId: 'TroubleshootDataSourceIngestion',
        // Add a timestamp to force updates but slightly different than the other ones
        Timestamp: (new Date().getTime() + 2000).toString()
      }
    });
    troubleshootSyncJob.node.addDependency(troubleshootDataSource);

    // ──────────────────────────────────────────────────────────────────────────
    // 7) CREATE A DYNAMO TABLE for the WS connections
    // ──────────────────────────────────────────────────────────────────────────
    this.connectionsTable = new dynamodb.Table(this, 'WebSocketConnectionsTable', {
      tableName: 'WebSocketConnections', // if you prefer a fixed name
      partitionKey: { name: 'ConnectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8) CREATE ALL LAMBDA FUNCTIONS from your "lambda_assets" folder
    // ──────────────────────────────────────────────────────────────────────────
  
    // 8A) WebSocket handlers
    // Note: Lambda layer (Boto3Layer) was defined at the beginning of the constructor
    
    this.wsInvokeAgentFn = new lambda_python.PythonFunction(this, 'WsInvokeAgentFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/ws_invoke_agent'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the new boto3 layer instead
    });
    this.connectionsTable.grantReadWriteData(this.wsInvokeAgentFn);
    this.wsInvokeAgentFn.addToRolePolicy(invokeAgent(this));
    
    // Add permissions for Bedrock logging to CloudWatch
    this.wsInvokeAgentFn.addToRolePolicy(bedrockLoggingPolicy(this));

    this.wsConnectFn = new lambda_python.PythonFunction(this, 'WsConnectFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/ws_connect'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the boto3 layer
    });
    this.connectionsTable.grantReadWriteData(this.wsConnectFn);

    this.wsDisconnectFn = new lambda_python.PythonFunction(this, 'WsDisconnectFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/ws_disconnect'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(2),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the boto3 layer
    });
    this.connectionsTable.grantReadWriteData(this.wsDisconnectFn);

    // 8B) WebSocket request-based Authorizer
    this.wsAuthorizerFn = new lambda_python.PythonFunction(this, 'WsAuthorizerFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/ws_authorizer'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the boto3 layer
    });

    this.restApiHandlerFn = new lambda_python.PythonFunction(this, 'RestApiHandlerFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/rest_api_handler'),
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(3),
      memorySize: 1024,
      layers: [Boto3Layer] // Use the boto3 layer
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 9) Create a (STABLE) WebSocket API (v2) in CDK
    // ──────────────────────────────────────────────────────────────────────────
    const wsApi = new WebSocketApi(this, 'MyWebSocketApi', {
      apiName: 'websocketid',
      routeSelectionExpression: '$request.body.action',
      connectRouteOptions: {
        integration: new WebSocketLambdaIntegration('WsConnectIntegration', this.wsConnectFn),
        // Attach the stable WebSocketLambdaAuthorizer from `aws-cdk-lib/aws-apigatewayv2-authorizers`
        authorizer: new WebSocketLambdaAuthorizer('WsLambdaAuthorizer', this.wsAuthorizerFn, {
          // stable props
          authorizerName: 'MyWsAuth',
          identitySource: ['route.request.querystring.auth'],
        }),
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration('WsDisconnectIntegration', this.wsDisconnectFn),
      },
    });
    storeWebsocketId(this, wsApi.apiId, 'websocketid');

    // For your custom route "sendMessage", we call .addRoute():
    wsApi.addRoute('sendMessage', {
      integration: new WebSocketLambdaIntegration('WsInvokeIntegration', this.wsInvokeAgentFn),
    });

    // Finally, create the WebSocketStage
    const wsStage = new WebSocketStage(this, 'WsStage', {
      webSocketApi: wsApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    new cdk.CfnOutput(this, 'WebSocketApiEndpoint', {
      value: wsStage.url,
      description: 'WSS endpoint for the WebSocket API',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 10) CREATE AND INVOKE THE MAIN AGENT LAMBDA (Custom Resource) AT LAST STEP
    // ──────────────────────────────────────────────────────────────────────────
    const mainAgentLambdaPolicies = [
      new iam.PolicyStatement({
        actions: [
          'bedrock:*',
          'iam:CreatePolicy',
          'iam:DeletePolicy',
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:GetRole',
          'iam:ListRoles',
          "iam:ListPolicies",
          'iam:ListRolePolicies',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:ListAttachedRolePolicies',
          'iam:PassRole',
          'iam:PutRolePolicy',
          'iam:GetPolicy',
          'iam:ListEntitiesForPolicy',
          'iam:DeleteRolePolicy',
          'lambda:CreateFunction',
          'lambda:DeleteFunction',
          'lambda:InvokeFunction',
          'dynamodb:CreateTable',
          'dynamodb:DeleteTable',
          'ssm:PutParameter',
          'ssm:GetParameter',
          'ssm:DeleteParameter'
        ],
        resources: ['*']
      })
    ];

    this.CreateMainAgentLambda = new lambda_python.PythonFunction(this, 'MainAgentCreate', {
      runtime: lambda.Runtime.PYTHON_3_12,
      entry: path.join(__dirname, '../lambda_assets/main_agent_create'), // adjust folder structure as needed
      index: 'index.py',
      handler: 'lambda_handler',
      timeout: cdk.Duration.minutes(4),
      memorySize: 3008,
      layers: [Boto3Layer], // Use the new boto3 layer instead
      initialPolicy: mainAgentLambdaPolicies
    });

    // Create a provider to invoke finalLambda
    const finalLambdaProvider = new cr.Provider(this, 'MainAgentLambdaProvider', {
      onEventHandler: this.CreateMainAgentLambda,
      logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    // Custom Resource that triggers finalLambda at the end of the stack deployment.
    const InvokeMainAgentCreateLambda = new cdk.CustomResource(this, 'InvokeMainAgentCreateLambda', {
      serviceToken: finalLambdaProvider.serviceToken,
      properties: {
        // Optional properties if you want to pass anything to finalLambda
        Trigger: 'FinalStep'
      }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 11) Outputs for the Agents
    // ──────────────────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'PersonalizationAgentId', {
      value: personalizationAgent.agentId,
      description: 'Agent ID for the personalization agent'
    }); 
    new cdk.CfnOutput(this, 'PersonalizationAgentAliasId', {
      value: PersonalizationAgentAliasId.aliasId,
      description: 'Agent ID for the personalization agent'
    });
    new cdk.CfnOutput(this, 'PersonalizationKBId', {
      value: personalizationKB.knowledgeBaseId,
      description: 'Knowledge Base ID for the Personalization agent'
    });
    new cdk.CfnOutput(this, 'PersonalizationDataSourceId', {
      value: personalizationDataSource.dataSourceId,
      description: 'Data Source ID for the Personalization KB'
    });

    new cdk.CfnOutput(this, 'OrderMgmtAgentId', {
      value: orderManagementAgent.agentId,
      description: 'Agent ID for the order management agent'
    });
    new cdk.CfnOutput(this, 'OrderMgmtAgentAliasId', {
      value: orderMgmtAgentAliasId.aliasId,
      description: 'Agent ID for the order management agent'
    });

    new cdk.CfnOutput(this, 'ProductRecommendAgentId', {
      value: productRecommendAgent.agentId,
      description: 'Agent ID for Product Recommendation agent'
    });
    new cdk.CfnOutput(this, 'ProductRecommendAgentAliasId', {
      value: productRecommendAgentAliasId.aliasId,
      description: 'Agent ID for Product Recommendation agent'
    });
    new cdk.CfnOutput(this, 'ProductRecKBId', {
      value: productRecKB.knowledgeBaseId,
      description: 'Knowledge Base ID for Product Recommendation agent'
    });
    new cdk.CfnOutput(this, 'ProductRecDataSourceId', {
      value: productRecDataSource.dataSourceId,
      description: 'Data Source ID for the Product Recommendation KB'
    });
    new cdk.CfnOutput(this, 'ProductRecBucketName', {
      value: `genai-labs-prod-rec-unstr-${this.account}-${this.region}`,
      description: 'S3 bucket for the Product Recommendation data'
    });

    new cdk.CfnOutput(this, 'TroubleshootAgentId', {
      value: troubleshootAgent.agentId,
      description: 'Agent ID for the Troubleshoot agent'
    });
    new cdk.CfnOutput(this, 'TroubleshootAliasId', {
      value: troubleshootAgentAliasId.aliasId,
      description: 'Alias ID for the Troubleshoot agent'
    });
    new cdk.CfnOutput(this, 'TroubleshootKBId', {
      value: troubleshootKB.knowledgeBaseId,
      description: 'KB ID for the Troubleshoot agent'
    });
    new cdk.CfnOutput(this, 'TroubleshootDataSourceId', {
      value: troubleshootDataSource.dataSourceId,
      description: 'Data Source ID for the Troubleshoot KB'
    });
    new cdk.CfnOutput(this, 'TroubleshootBucketName', {
      value: troubleshootBucket.bucketName,
      description: 'S3 bucket storing docs for Troubleshoot knowledge base'
    });

    // Create CloudWatch Log Group for Bedrock invocations
    const bedrockLogGroup = new cdk.aws_logs.LogGroup(this, 'BedrockInvocationLogs', {
      logGroupName: '/aws/bedrock/model-invocations',
      retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    // Create CloudWatch Alarms for Bedrock invocation errors
    const bedrockErrorMetric = new cdk.aws_cloudwatch.Metric({
      namespace: 'AWS/Logs',
      metricName: 'ErrorCount',
      dimensionsMap: {
        LogGroupName: '/aws/bedrock/model-invocations'
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5)
    });

    const bedrockErrorAlarm = new cdk.aws_cloudwatch.Alarm(this, 'BedrockErrorAlarm', {
      metric: bedrockErrorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm when Bedrock invocations have errors',
      comparisonOperator: cdk.aws_cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING
    });
    
    // Create a CloudWatch Dashboard for Bedrock monitoring
    const dashboard = new cdk.aws_cloudwatch.Dashboard(this, 'BedrockMonitoringDashboard', {
      dashboardName: 'BedrockModelInvocations'
    });
    
    dashboard.addWidgets(
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Bedrock Invocation Errors',
        left: [bedrockErrorMetric]
      })
    );

    // Add comprehensive CDK Nag suppressions
    this.addCdkNagSuppressions();

    // ──────────────────────────────────────────────────────────────────────────
    // Make sure our Custom Resource to invoke the Main Agent is last
    // by explicitly adding dependencies on all the major agent resources:
    // ──────────────────────────────────────────────────────────────────────────
    InvokeMainAgentCreateLambda.node.addDependency(
      // Agents and their aliases
      personalizationAgent,
      PersonalizationAgentAliasId,
      orderManagementAgent,
      orderMgmtAgentAliasId,
      productRecommendAgent,
      productRecommendAgentAliasId,
      troubleshootAgent,
      troubleshootAgentAliasId,
      // Data source sync jobs - ensure all KB data sources are synced
      personalizationSyncJob,
      productRecSyncJob,
      troubleshootSyncJob
    );
  }
}

/**
 * Helper function to enable CORS on a resource with an OPTIONS method.
 */
function addCorsOptions(resource: apigw.IResource) {
  resource.addMethod('OPTIONS', new apigw.MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'*'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,POST'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
      },
    }],
    passthroughBehavior: apigw.PassthroughBehavior.WHEN_NO_MATCH,
    requestTemplates: { 'application/json': '{"statusCode":200}' },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }],
  });
}
