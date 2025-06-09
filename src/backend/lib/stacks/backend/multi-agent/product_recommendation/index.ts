import {
    ActionGroupExecutor,
    Agent,
    AgentActionGroup,
    AgentAlias,
    AgentCollaborator,
    BedrockFoundationModel,
    ChunkingStrategy,
    CrossRegionInferenceProfile,
    CrossRegionInferenceProfileRegion,
    InlineApiSchema,
    S3DataSource,
    VectorKnowledgeBase,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { Duration } from "aws-cdk-lib";
import { Rule } from "aws-cdk-lib/aws-events";
import { AwsApi } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import * as path from "path";
import { CommonBucket } from "../../../../common/constructs/s3";
import { KnowledgeBaseSyncChecker } from "../kb-sync-checker/construct";

interface ProductRecommendationSubAgentProps {
    loggingBucket: Bucket;
    executorFunction: Function;
}

export class ProductRecommendationSubAgent extends Construct {
    public readonly agentCollaborator: AgentCollaborator;
    public readonly knowledgeBaseId: string;
    public readonly agent: Agent;
    public readonly agentAlias: AgentAlias;

    constructor(scope: Construct, id: string, props: ProductRecommendationSubAgentProps) {
        super(scope, id);

        const { loggingBucket, executorFunction } = props;

        const productRecommendationKnowledgeBase = new VectorKnowledgeBase(
            this,
            "productRecommendationKnowledgeBase",
            {
                embeddingsModel: BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
                instruction:
                    "Use this knowledge base to retrieve user preferences and browsing history.",
            }
        );

        const productRecommendationKnowledgeBucket = new CommonBucket(
            this,
            "productRecommendationKnowledgeBucket",
            {
                serverAccessLogsBucket: loggingBucket,
            }
        );

        const productRecommendationKnowledgeSource = new S3DataSource(
            this,
            "productRecommendationKnowledgeSource",
            {
                bucket: productRecommendationKnowledgeBucket,
                knowledgeBase: productRecommendationKnowledgeBase,
                dataSourceName: "productRecommendation-data"
            }
        );

        const productRecommendationIngestionRule = new Rule(
            this,
            "productRecommendationIngestionRule",
            {
                eventPattern: {
                    source: ["aws.s3"],
                    detail: {
                        bucket: {
                            name: [productRecommendationKnowledgeBucket.bucketName],
                        },
                    },
                },
                targets: [
                    new AwsApi({
                        service: "bedrock-agent",
                        action: "startIngestionJob",
                        parameters: {
                            knowledgeBaseId: productRecommendationKnowledgeBase.knowledgeBaseId,
                            dataSourceId: productRecommendationKnowledgeSource.dataSourceId,
                        },
                    }),
                ],
            }
        );

        // Create knowledge base deployment with explicit sync
        const productRecommendationKnowledgeDeployment = new BucketDeployment(
            this,
            "productRecommendationKnowledgeDeployment",
            {
                sources: [Source.asset(path.join(__dirname, "knowledge-base"))],
                destinationBucket: productRecommendationKnowledgeBucket,
                exclude: [".DS_Store"],
                prune: true
            }
        );

        // Add dependency to ensure rule is created first
        productRecommendationKnowledgeDeployment.node.addDependency(
            productRecommendationIngestionRule
        );

        // Add explicit ingestion job after deployment completes
        const productRecommendationInitialIngestion = new Rule(this, "productRecommendationInitialIngestion", {
            eventPattern: {
                source: ["aws.cloudformation"],
                detailType: ["CloudFormation Resource Status Change"],
                detail: {
                    resourceType: ["AWS::S3::BucketDeployment"],
                    resourceStatus: ["CREATE_COMPLETE", "UPDATE_COMPLETE"],
                    logicalResourceId: [productRecommendationKnowledgeDeployment.node.id]
                }
            },
            targets: [
                new AwsApi({
                    service: "bedrock-agent",
                    action: "startIngestionJob",
                    parameters: {
                        knowledgeBaseId: productRecommendationKnowledgeBase.knowledgeBaseId,
                        dataSourceId: productRecommendationKnowledgeSource.dataSourceId,
                    },
                }),
            ],
        });

        // Create a knowledge base sync checker to ensure data is synchronized
        const productRecommendationSyncChecker = new KnowledgeBaseSyncChecker(this, "productRecommendationSyncChecker", {
            knowledgeBaseIds: [productRecommendationKnowledgeBase.knowledgeBaseId],
            serviceName: "product-recommendation-kb-sync-checker",
            checkIntervalHours: 24
        });

        const productRecommendationActionGroup = new AgentActionGroup({
            name: "productRecommendationActionGroup",
            description: "Handles user personalization queries from Athena or the knowledge base.",
            executor: ActionGroupExecutor.fromlambdaFunction(executorFunction),
            apiSchema: InlineApiSchema.fromLocalAsset(
                path.join(__dirname, "..", "action-group", "schema.json")
            ),
        });

        const model = BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0;

        const productRecommendationInferenceProfile = CrossRegionInferenceProfile.fromConfig({
            geoRegion: CrossRegionInferenceProfileRegion.US,
            model: model,
        });

        const productRecommendationAgent = new Agent(this, "productRecommendationAgent", {
            //name: "ProductRecommendationAgent-" + Date.now(), 
            foundationModel: productRecommendationInferenceProfile,
            instruction: readFileSync(path.join(__dirname, "instructions.txt"), "utf-8"),
            knowledgeBases: [productRecommendationKnowledgeBase],
            actionGroups: [productRecommendationActionGroup],
            userInputEnabled: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(1800),
        });
        productRecommendationAgent.role.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream",
                    "bedrock:GetInferenceProfile",
                    "bedrock:GetFoundationModel",
                    "bedrock:Retrieve", // Add permission to retrieve from knowledge base
                ],
                resources: [
                    `arn:aws:bedrock:*::foundation-model/${model.modelId}`,
                    productRecommendationInferenceProfile.inferenceProfileArn,
                    productRecommendationKnowledgeBase.knowledgeBaseArn, // Add knowledge base ARN
                ],
            })
        );

        const productRecommendationAgentAlias = new AgentAlias(
            this,
            "alias",
            {
                agent: productRecommendationAgent,
            }
        );

        const productRecommendationAgentCollaborator = new AgentCollaborator({
            agentAlias: productRecommendationAgentAlias,
            collaborationInstruction: "Expert in suggesting relevant products based on customer needs.",
            collaboratorName: "ProductRecommendation",
            relayConversationHistory: true,
        });

        this.agentCollaborator = productRecommendationAgentCollaborator;
        this.knowledgeBaseId = productRecommendationKnowledgeBase.knowledgeBaseId;
        this.agent = productRecommendationAgent;
        this.agentAlias = productRecommendationAgentAlias;
    }
}
