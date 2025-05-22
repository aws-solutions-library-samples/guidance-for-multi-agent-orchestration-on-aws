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

interface PersonalizationSubAgentProps {
    loggingBucket: Bucket;
    executorFunction: Function;
}

export class PersonalizationSubAgent extends Construct {
    public readonly agentCollaborator: AgentCollaborator;

    constructor(scope: Construct, id: string, props: PersonalizationSubAgentProps) {
        super(scope, id);

        const { loggingBucket, executorFunction } = props;

        const personalizationKnowledgeBase = new VectorKnowledgeBase(
            this,
            "personalizationKnowledgeBase",
            {
                embeddingsModel: BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
                instruction:
                    "Use this knowledge base to retrieve user preferences and browsing history.",
            }
        );

        const personalizationKnowledgeBucket = new CommonBucket(
            this,
            "personalizationKnowledgeBucket",
            {
                serverAccessLogsBucket: loggingBucket,
            }
        );

        const personalizationKnowledgeSource = new S3DataSource(
            this,
            "personalizationKnowledgeSource",
            {
                bucket: personalizationKnowledgeBucket,
                knowledgeBase: personalizationKnowledgeBase,
                dataSourceName: "personalization-data"
            }
        );

        const personalizationIngestionRule = new Rule(this, "personalizationIngestionRule", {
            eventPattern: {
                source: ["aws.s3"],
                detail: {
                    bucket: {
                        name: [personalizationKnowledgeBucket.bucketName],
                    },
                },
            },
            targets: [
                new AwsApi({
                    service: "bedrock-agent",
                    action: "startIngestionJob",
                    parameters: {
                        knowledgeBaseId: personalizationKnowledgeBase.knowledgeBaseId,
                        dataSourceId: personalizationKnowledgeSource.dataSourceId,
                    },
                }),
            ],
        });

        // Create knowledge base deployment with explicit sync
        const personalizationKnowledgeDeployment = new BucketDeployment(
            this,
            "personalizationKnowledgeDeployment",
            {
                sources: [Source.asset(path.join(__dirname, "knowledge-base"))],
                destinationBucket: personalizationKnowledgeBucket,
                exclude: [".DS_Store"],
                prune: true
            }
        );

        // Add dependency to ensure rule is created first
        personalizationKnowledgeDeployment.node.addDependency(personalizationIngestionRule);

        // Add explicit ingestion job after deployment completes
        const personalizationInitialIngestion = new Rule(this, "personalizationInitialIngestion", {
            eventPattern: {
                source: ["aws.cloudformation"],
                detailType: ["CloudFormation Resource Status Change"],
                detail: {
                    resourceType: ["AWS::S3::BucketDeployment"],
                    resourceStatus: ["CREATE_COMPLETE", "UPDATE_COMPLETE"],
                    logicalResourceId: [personalizationKnowledgeDeployment.node.id]
                }
            },
            targets: [
                new AwsApi({
                    service: "bedrock-agent",
                    action: "startIngestionJob",
                    parameters: {
                        knowledgeBaseId: personalizationKnowledgeBase.knowledgeBaseId,
                        dataSourceId: personalizationKnowledgeSource.dataSourceId,
                    },
                }),
            ],
        });

        // Create a knowledge base sync checker to ensure data is synchronized
        const personalizationSyncChecker = new KnowledgeBaseSyncChecker(this, "personalizationSyncChecker", {
            knowledgeBaseIds: [personalizationKnowledgeBase.knowledgeBaseId],
            serviceName: "personalization-kb-sync-checker",
            checkIntervalHours: 24
        });

        const personalizationActionGroup = new AgentActionGroup({
            name: "personalizationActionGroup",
            description: "Handles user personalization queries from Athena or the knowledge base.",
            executor: ActionGroupExecutor.fromlambdaFunction(executorFunction),
            apiSchema: InlineApiSchema.fromLocalAsset(
                path.join(__dirname, "..", "action-group", "schema.json")
            ),
        });

        const model = BedrockFoundationModel.ANTHROPIC_CLAUDE_3_5_SONNET_V1_0;

        const personalizationInferenceProfile = CrossRegionInferenceProfile.fromConfig({
            geoRegion: CrossRegionInferenceProfileRegion.US,
            model: model,
        });

        const personalizationAgent = new Agent(this, "personalizationAgent", {
            //name: "PersonalizationAgent-" + Date.now(), 
            foundationModel: personalizationInferenceProfile,
            instruction: readFileSync(path.join(__dirname, "instructions.txt"), "utf-8"),
            knowledgeBases: [personalizationKnowledgeBase],
            actionGroups: [personalizationActionGroup],
            userInputEnabled: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(1800),
        });
        personalizationAgent.role.addToPrincipalPolicy(
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
                    personalizationInferenceProfile.inferenceProfileArn,
                    personalizationKnowledgeBase.knowledgeBaseArn, // Add knowledge base ARN
                ],
            })
        );

        const personalizationAgentAlias = new AgentAlias(this, "personalizationAgentAlias", {
            agent: personalizationAgent,
        });

        const personalizationAgentCollaborator = new AgentCollaborator({
            agentAlias: personalizationAgentAlias,
            collaborationInstruction: "Route personalization questions to this agent.",
            collaboratorName: "Personalization",
            relayConversationHistory: true,
        });

        this.agentCollaborator = personalizationAgentCollaborator;
    }
}
