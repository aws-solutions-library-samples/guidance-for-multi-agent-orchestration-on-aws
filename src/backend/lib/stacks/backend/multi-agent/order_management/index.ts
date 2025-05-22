import {
    ActionGroupExecutor,
    Agent,
    AgentActionGroup,
    AgentAlias,
    AgentCollaborator,
    BedrockFoundationModel,
    CrossRegionInferenceProfile,
    CrossRegionInferenceProfileRegion,
    InlineApiSchema,
} from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import { Duration } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import * as path from "path";

interface OrderManagementSubAgentProps {
    executorFunction: Function;
}

export class OrderManagementSubAgent extends Construct {
    public readonly agentCollaborator: AgentCollaborator;

    constructor(scope: Construct, id: string, props: OrderManagementSubAgentProps) {
        super(scope, id);

        const { executorFunction } = props;

        const orderManagementActionGroup = new AgentActionGroup({
            name: "orderManagementActionGroup",
            description: "Handles user personalization queries from Athena or the knowledge base.",
            executor: ActionGroupExecutor.fromlambdaFunction(executorFunction),
            apiSchema: InlineApiSchema.fromLocalAsset(
                path.join(__dirname, "..", "action-group", "schema.json")
            ),
        });

        const model = BedrockFoundationModel.ANTHROPIC_CLAUDE_SONNET_V1_0;

        const orderManagementInferenceProfile = CrossRegionInferenceProfile.fromConfig({
            geoRegion: CrossRegionInferenceProfileRegion.US,
            model: model,
        });

        const orderManagementAgent = new Agent(this, "orderManagementAgent", {
            //name: "OrderManagementAgent-" + Date.now(), 
            foundationModel: orderManagementInferenceProfile,
            instruction: readFileSync(path.join(__dirname, "instructions.txt"), "utf-8"),
            actionGroups: [orderManagementActionGroup],
            userInputEnabled: true,
            shouldPrepareAgent: true,
            idleSessionTTL: Duration.seconds(1800)
        });
        orderManagementAgent.role.addToPrincipalPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                    "bedrock:InvokeModel",
                    "bedrock:InvokeModelWithResponseStream",
                    "bedrock:GetInferenceProfile",
                    "bedrock:GetFoundationModel",
                ],
                resources: [
                    `arn:aws:bedrock:*::foundation-model/${model.modelId}`,
                    orderManagementInferenceProfile.inferenceProfileArn,
                ],
            })
        );

        const orderManagementAgentAlias = new AgentAlias(this, "orderManagementAgentAlias", {
            agent: orderManagementAgent
        });

        const orderManagementAgentCollaborator = new AgentCollaborator({
            agentAlias: orderManagementAgentAlias,
            collaborationInstruction: "Route order management questions to this agent.",
            collaboratorName: "OrderManagement",
            relayConversationHistory: true
        });

        this.agentCollaborator = orderManagementAgentCollaborator;
    }
}
