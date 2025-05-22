import { AmplifyData, AmplifyDataDefinition } from "@aws-amplify/data-construct";
import { Agent, AgentAlias } from "@cdklabs/generative-ai-cdk-constructs/lib/cdk-lib/bedrock";
import {
    Duration,
    aws_appsync as appsync,
    aws_cognito as cognito,
    aws_logs as logs,
    aws_wafv2 as waf,
} from "aws-cdk-lib";
import { MappingTemplate } from "aws-cdk-lib/aws-appsync";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { CommonNodejsFunction } from "../../../common/constructs/lambda";

interface StreamingApiProps {
    userPool: cognito.UserPool;
    regionalWebAclArn: string;
    supervisorAgent: Agent;
    supervisorAgentAlias: AgentAlias;
}

export class StreamingApi extends Construct {
    public readonly amplifiedGraphApi: AmplifyData;

    constructor(scope: Construct, id: string, props: StreamingApiProps) {
        super(scope, id);

        const { userPool, regionalWebAclArn, supervisorAgent, supervisorAgentAlias } = props;

        const amplifiedGraphApi = new AmplifyData(this, "amplifiedGraphApi", {
            definition: AmplifyDataDefinition.fromFiles(path.join(__dirname, "schema.graphql")),
            authorizationModes: {
                defaultAuthorizationMode: "AMAZON_COGNITO_USER_POOLS",
                userPoolConfig: {
                    userPool: userPool,
                },
                iamConfig: {
                    enableIamAuthorizationMode: true,
                },
            },
            logging: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
                retention: logs.RetentionDays.THREE_MONTHS,
                excludeVerboseContent: false,
            },
        });
        NagSuppressions.addResourceSuppressions(
            amplifiedGraphApi,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "AmplifyGraphqlApi requires the AWSAppSyncPushToCloudWatchLogs policy for logging.",
                },
                {
                    id: "AwsSolutions-S1",
                    reason: "AmplifyGraphqlApi-created buckets do not require server access logs.",
                },
                {
                    id: "AwsSolutions-S10",
                    reason: "AmplifyGraphqlApi-created buckets do not require requests to use SSL.",
                },
            ],
            true
        );

        amplifiedGraphApi.resources.cfnResources.cfnGraphqlApi.xrayEnabled = true;
        Object.values(amplifiedGraphApi.resources.cfnResources.cfnTables).forEach((table) => {
            table.pointInTimeRecoverySpecification = {
                pointInTimeRecoveryEnabled: true,
            };
        });

        const resolverFunction = new CommonNodejsFunction(this, "resolverFunction", {
            entry: path.join(__dirname, "resolver-function", "index.ts"),
            environment: {
                GRAPH_API_URL: amplifiedGraphApi.graphqlUrl,
                AGENT_ID: supervisorAgent.agentId,
                AGENT_ALIAS_ID: supervisorAgentAlias.aliasId,
            },
            bundling: {
                externalModules: ["aws-sdk"],
            },
            memorySize: 1024,
            timeout: Duration.minutes(5),
        });
        resolverFunction.addToRolePolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["bedrock:InvokeAgent"],
                resources: [supervisorAgent.agentArn, supervisorAgentAlias.aliasArn],
            })
        );
        amplifiedGraphApi.resources.graphqlApi.grantMutation(resolverFunction);
        amplifiedGraphApi.resources.graphqlApi.grantQuery(resolverFunction);

        amplifiedGraphApi
            .addLambdaDataSource("lambdaDataSource", resolverFunction)
            .createResolver("resolver", {
                typeName: "Mutation",
                fieldName: "sendChat",
                requestMappingTemplate: MappingTemplate.lambdaRequest(),
                responseMappingTemplate: MappingTemplate.lambdaResult(),
            });

        new waf.CfnWebACLAssociation(this, "graphApiWebAclAssociation", {
            resourceArn: amplifiedGraphApi.resources.graphqlApi.arn,
            webAclArn: regionalWebAclArn,
        });

        this.amplifiedGraphApi = amplifiedGraphApi;
    }
}
