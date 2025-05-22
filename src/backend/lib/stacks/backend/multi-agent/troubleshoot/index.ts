import {
    Agent,
    AgentAlias,
    AgentCollaborator,
    BedrockFoundationModel,
    ChunkingStrategy,
    CrossRegionInferenceProfile,
    CrossRegionInferenceProfileRegion,
    S3DataSource,
    VectorKnowledgeBase,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { Duration } from "aws-cdk-lib";
import { Rule } from "aws-cdk-lib/aws-events";
import { AwsApi } from "aws-cdk-lib/aws-events-targets";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import * as path from "path";
import { CommonBucket } from "../../../../common/constructs/s3";
import { KnowledgeBaseSyncChecker } from "../kb-sync-checker/construct";

interface TroubleshootSubAgentProps {
    loggingBucket: Bucket;
}

export class TroubleshootSubAgent extends Construct {
    public readonly agentCollaborator: AgentCollaborator;

    constructor(scope: Construct, id: string, props: TroubleshootSubAgentProps) {
        super(scope, id);

        const { loggingBucket } = props;

        const troubleshootKnowledgeBase = new VectorKnowledgeBase(
            this,
            "troubleshootKnowledgeBase",
            {
                embeddingsModel: BedrockFoundationModel.COHERE_EMBED_ENGLISH_V3,
                instruction:
                    "Use this knowledge base to retrieve user preferences and browsing history.",
            }
        );

        const troubleshootKnowledgeBucket = new CommonBucket(this, "troubleshootKnowledgeBucket", {
            serverAccessLogsBucket: loggingBucket,
        });

        const troubleshootKnowledgeSource = new S3DataSource(this, "troubleshootKnowledgeSource", {
            bucket: troubleshootKnowledgeBucket,
            knowledgeBase: troubleshootKnowledgeBase,
            dataSourceName: "troubleshoot-data"
        });

        const troubleshootIngestionRule = new Rule(this, "troubleshootIngestionRule", {
            eventPattern: {
                source: ["aws.s3"],
                detail: {
                    bucket: {
                        name: [troubleshootKnowledgeBucket.bucketName],
                    },
                },
            },
            targets: [
                new AwsApi({
                    service: "bedrock-agent",
                    action: "startIngestionJob",
                    parameters: {
                        knowledgeBaseId: troubleshootKnowledgeBase.knowledgeBaseId,
                        dataSourceId: troubleshootKnowledgeSource.dataSourceId,
                    },
                }),
            ],
        });

        // Create knowledge base deployment with explicit sync
        const troubleshootKnowledgeDeployment = new BucketDeployment(
            this,
            "troubleshootKnowledgeDeployment",
            {
                sources: [Source.asset(path.join(__dirname, "knowledge-base"))],
                destinationBucket: troubleshootKnowledgeBucket,
                exclude: [".DS_Store"],
                prune: true
            }
        );

        // Add dependency to ensure rule is created first
        troubleshootKnowledgeDeployment.node.addDependency(troubleshootIngestionRule);

        // Add explicit ingestion job after deployment completes
        const troubleshootInitialIngestion = new Rule(this, "troubleshootInitialIngestion", {
            eventPattern: {
                source: ["aws.cloudformation"],
                detailType: ["CloudFormation Resource Status Change"],
                detail: {
                    resourceType: ["AWS::S3::BucketDeployment"],
                    resourceStatus: ["CREATE_COMPLETE", "UPDATE_COMPLETE"],
                    logicalResourceId: [troubleshootKnowledgeDeployment.node.id]
                }
            },
            targets: [
                new AwsApi({
                    service: "bedrock-agent",
                    action: "startIngestionJob",
                    parameters: {
                        knowledgeBaseId: troubleshootKnowledgeBase.knowledgeBaseId,
                        dataSourceId: troubleshootKnowledgeSource.dataSourceId,
                    },
                }),
            ],
        });

        // Create a knowledge base sync checker to ensure data is synchronized
        const troubleshootSyncChecker = new KnowledgeBaseSyncChecker(this, "troubleshootSyncChecker", {
            knowledgeBaseIds: [troubleshootKnowledgeBase.knowledgeBaseId],
            serviceName: "troubleshoot-kb-sync-checker",
            checkIntervalHours: 24
        });

        const model = BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0;

        const troubleshootInferenceProfile = CrossRegionInferenceProfile.fromConfig({
            geoRegion: CrossRegionInferenceProfileRegion.US,
            model: model,
        });

        const troubleshootAgent = new Agent(this, "troubleshootAgent", {
            //name: "TroubleshootAgent-" + Date.now(), 
            foundationModel: troubleshootInferenceProfile,
            instruction: readFileSync(path.join(__dirname, "instructions.txt"), "utf-8"),
            knowledgeBases: [troubleshootKnowledgeBase],
            userInputEnabled: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(1800),
        });
        troubleshootAgent.role.addToPrincipalPolicy(
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
                    troubleshootInferenceProfile.inferenceProfileArn,
                    troubleshootKnowledgeBase.knowledgeBaseArn, // Add knowledge base ARN
                ],
            })
        );

        const troubleshootAgentAlias = new AgentAlias(this, "troubleshootAgentAlias", {
            agent: troubleshootAgent,
        });

        const troubleshootAgentCollaborator = new AgentCollaborator({
            agentAlias: troubleshootAgentAlias,
            collaborationInstruction: "Route troubleshoot questions to this agent.",
            collaboratorName: "Troubleshoot",
            relayConversationHistory: true,
        });

        this.agentCollaborator = troubleshootAgentCollaborator;
    }
}
