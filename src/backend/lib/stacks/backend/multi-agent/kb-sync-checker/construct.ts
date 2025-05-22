import { Duration } from "aws-cdk-lib";
import { Rule, Schedule, RuleTargetInput } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { Construct } from "constructs";
import * as path from "path";

/**
 * Properties for the KnowledgeBaseSyncChecker construct
 */
export interface KnowledgeBaseSyncCheckerProps {
  /**
   * Knowledge base IDs to check and sync
   */
  knowledgeBaseIds: string[];
  
  /**
   * Name of the service for identifying the Lambda function
   * @default 'kb-sync-checker'
   */
  serviceName?: string;
  
  /**
   * How often to check and sync the knowledge base (in hours)
   * @default 24
   */
  checkIntervalHours?: number;
}

/**
 * A construct that creates a scheduled Lambda function to check knowledge bases 
 * and trigger ingestion jobs if needed
 */
export class KnowledgeBaseSyncChecker extends Construct {
  /**
   * The Lambda function that checks and syncs knowledge bases
   */
  public readonly syncCheckerFunction: PythonFunction;
  
  /**
   * The scheduled rule that triggers the Lambda function
   */
  public readonly syncSchedule: Rule;
  
  constructor(scope: Construct, id: string, props: KnowledgeBaseSyncCheckerProps) {
    super(scope, id);
    
    const {
      knowledgeBaseIds,
      serviceName = 'kb-sync-checker',
      checkIntervalHours = 24,
    } = props;
    
    // Create the Lambda function that checks and syncs knowledge bases
    this.syncCheckerFunction = new PythonFunction(this, "SyncCheckerFunction", {
      entry: path.join(__dirname),
      runtime: Runtime.PYTHON_3_12,
      index: "index.py",
      handler: "lambda_handler",
      timeout: Duration.seconds(60),
      environment: {
        POWERTOOLS_SERVICE_NAME: serviceName,
      },
    });
    
    // Add permissions to interact with Bedrock agents and knowledge bases
    this.syncCheckerFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "bedrock:ListKnowledgeBases",
          "bedrock:GetKnowledgeBase",
          "bedrock:ListDataSources",
          "bedrock:GetDataSource",
          "bedrock:ListIngestionJobs",
          "bedrock:StartIngestionJob",
        ],
        resources: ["*"],
      })
    );
    
    // Create a scheduled rule to check and sync the knowledge base
    // Create a payload with the knowledge base IDs for the Lambda function
    const lambdaPayload = { knowledgeBaseIds };

    this.syncSchedule = new Rule(this, "SyncSchedule", {
      schedule: Schedule.rate(Duration.hours(checkIntervalHours)),
      targets: [
        new LambdaFunction(this.syncCheckerFunction, {
          event: RuleTargetInput.fromObject(lambdaPayload)
        }),
      ],
    });
  }
}
