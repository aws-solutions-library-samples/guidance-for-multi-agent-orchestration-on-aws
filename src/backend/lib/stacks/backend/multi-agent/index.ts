import {
    Agent,
    AgentAlias,
    AgentCollaboratorType,
    BedrockFoundationModel,
    CrossRegionInferenceProfile,
    CrossRegionInferenceProfileRegion,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import * as path from "path";
import { CommonPythonPowertoolsFunction } from "../../../common/constructs/lambda";
import { CommonBucket } from "../../../common/constructs/s3";
import { OrderManagementSubAgent } from "./order_management";
import { PersonalizationSubAgent } from "./personalization";
import { ProductRecommendationSubAgent } from "./product_recommendation";
import { TroubleshootSubAgent } from "./troubleshoot";

interface MultiAgentProps {
    athenaResultsBucket: Bucket;
    structuredDataBucket: Bucket;
}

export class MultiAgent extends Construct {
    public readonly supervisorAgent: Agent;
    public readonly supervisorAgentAlias: AgentAlias;

    constructor(scope: Construct, id: string, props: MultiAgentProps) {
        super(scope, id);

        const { athenaResultsBucket, structuredDataBucket } = props;

        const loggingBucket = new CommonBucket(this, "loggingBucket", {});

        const executorFunction = new CommonPythonPowertoolsFunction(this, "executorFunction", {
            entry: path.join(__dirname, "action-group", "executor-function"),
            memorySize: 1024,
            timeout: Duration.minutes(5),
            environment: {
                ATHENA_RESULTS_BUCKET_PATH: athenaResultsBucket.s3UrlForObject(),
            },
        });
        executorFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "athena:StartQueryExecution",
                    "athena:GetQueryExecution",
                    "athena:GetQueryResults",
                    "athena:StopQueryExecution",
                    "glue:GetDatabase",
                    "glue:GetTable",
                    "glue:GetPartitions",
                ],
                resources: ["*"],
            })
        );
        athenaResultsBucket.grantReadWrite(executorFunction);
        structuredDataBucket.grantRead(executorFunction);

        const personalizationSubAgent = new PersonalizationSubAgent(
            this,
            "personalizationSubAgent",
            {
                loggingBucket,
                executorFunction,
            }
        );

        const orderManagementSubAgent = new OrderManagementSubAgent(
            this,
            "orderManagementSubAgent",
            {
                executorFunction,
            }
        );

        const productRecommendationSubAgent = new ProductRecommendationSubAgent(
            this,
            "productRecommendationSubAgent",
            {
                loggingBucket,
                executorFunction,
            }
        );

        const troubleshootSubAgent = new TroubleshootSubAgent(this, "troubleshootSubAgent", {
            loggingBucket,
        });

        const supervisorInferenceProfile = CrossRegionInferenceProfile.fromConfig({
            geoRegion: CrossRegionInferenceProfileRegion.US,
            model: BedrockFoundationModel.AMAZON_NOVA_PRO_V1,
        });

        const supervisorAgent = new Agent(this, "supervisorAgent", {
            //name: "SupervisorAgent-" + Date.now(),            
            foundationModel: supervisorInferenceProfile,
            instruction: readFileSync(path.join(__dirname, "instructions.txt"), "utf-8"),
            agentCollaboration: AgentCollaboratorType.SUPERVISOR,
            agentCollaborators: [
                personalizationSubAgent.agentCollaborator,
                orderManagementSubAgent.agentCollaborator,
                productRecommendationSubAgent.agentCollaborator,
                troubleshootSubAgent.agentCollaborator,
            ],
        });
        supervisorInferenceProfile.grantInvoke(supervisorAgent.role);
        supervisorInferenceProfile.grantProfileUsage(supervisorAgent.role);

        const supervisorAgentAlias = new AgentAlias(this, "supervisorAgentAlias", {
            agent: supervisorAgent,
        });

        this.supervisorAgent = supervisorAgent;
        this.supervisorAgentAlias = supervisorAgentAlias;
    }
}
