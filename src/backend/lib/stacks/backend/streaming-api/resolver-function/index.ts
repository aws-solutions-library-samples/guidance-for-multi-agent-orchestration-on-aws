import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { AUTH_TYPE, AWSAppSyncClient } from "aws-appsync";
import { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import { gql } from "graphql-tag";
import { createChat, updateChat } from "./mutations";
import {
    CreateChatMutation,
    CreateChatMutationVariables,
    UpdateChatMutationVariables,
} from "./types";

interface Arguments {
    sessionId: string;
    human: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionAttributes?: Record<string, any>;
}

const bedrockAgentClient = new BedrockAgentRuntimeClient({});

export const handler = async (event: AppSyncResolverEvent<Arguments>) => {
    const { sessionId, human, sessionAttributes } = event.arguments;
    const { username } = event.identity as AppSyncIdentityCognito;

    const graphqlClient = new AWSAppSyncClient({
        url: process.env.GRAPH_API_URL!,
        region: process.env.AWS_REGION!,
        auth: {
            type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
            jwtToken: event.request.headers.authorization!,
        },
        disableOffline: true,
    });

    const command = new InvokeAgentCommand({
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        inputText: human,
        sessionId: sessionId,
        enableTrace: true,
        streamingConfigurations: {
            streamFinalResponse: true,
        },
        sessionState: {
            sessionAttributes: {
                username,
                ...sessionAttributes,
            },
        },
    });

    const agentResponse = await bedrockAgentClient.send(command);
    let assistant = "";

    if (agentResponse.completion) {
        const { id } = (
            (await graphqlClient.mutate({
                mutation: gql`
                    ${createChat}
                `,
                variables: {
                    input: {
                        sessionId,
                        expiration: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours from now
                    },
                } as CreateChatMutationVariables,
            })) as { data: CreateChatMutation }
        ).data.createChat!;

        for await (const response of agentResponse.completion) {
            assistant += new TextDecoder().decode(response.chunk?.bytes);

            await graphqlClient.mutate({
                mutation: gql`
                    ${updateChat}
                `,
                variables: {
                    input: {
                        id,
                        human,
                        assistant,
                        trace: JSON.stringify(response.trace),
                    },
                } as UpdateChatMutationVariables,
            });
        }
    }

    return assistant;
};
