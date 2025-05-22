import {
    Duration,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_lambda as lambda,
    aws_wafv2 as waf,
} from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { LabsUserPool, LabsUserPoolClient } from "../../common/constructs/cognito";
import { createManagedRules } from "../../common/utils";

interface AuthProps {
    urls: string[];
    hydrationFunction?: lambda.Function;
}

export class Auth extends Construct {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolDomain?: cognito.UserPoolDomain;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly identityPool: cognito.CfnIdentityPool;
    public readonly authenticatedRole: iam.Role;
    public readonly unauthenticatedRole: iam.Role;
    public readonly regionalWebAclArn: string;

    constructor(scope: Construct, id: string, props: AuthProps) {
        super(scope, id);

        const { urls, hydrationFunction } = props;

        const userPool = new LabsUserPool(this, "userPool", {
            selfSignUpEnabled: false,
            signInAliases: {
                phone: false,
                email: false,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireDigits: true,
                requireUppercase: true,
                requireSymbols: true,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            featurePlan: cognito.FeaturePlan.ESSENTIALS,
            lambdaTriggers: {
                postConfirmation: hydrationFunction,
            },
        });
        NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: "AwsSolutions-COG2",
                reason: "Cognito user pool should not require MFA when using Midway.",
            },
            {
                id: "AwsSolutions-COG3",
                reason: "AdvancedSecurityMode is set to depreciate. Using Cognito feature plan's essential security feature.",
            },
        ]);

        new cognito.UserPoolGroup(this, "adminUserPoolGroup", {
            userPool: userPool,
            groupName: "Admin",
        });

        new cognito.UserPoolGroup(this, "usersUserPoolGroup", {
            userPool: userPool,
            groupName: "Users",
        });

        const tokenValidity = Duration.hours(8);
        const userPoolClient = new LabsUserPoolClient(this, "userPoolClient", {
            userPool: userPool,
            generateSecret: false,
            refreshTokenValidity: tokenValidity,
            accessTokenValidity: tokenValidity,
            idTokenValidity: tokenValidity,
            readAttributes: new cognito.ClientAttributes().withStandardAttributes({
                email: true,
            }),
            authFlows: {
                adminUserPassword: true,
                custom: true,
                userSrp: true,
            },
            oAuth: {
                callbackUrls: urls,
                logoutUrls: urls,
            },
        });

        const identityPool = new cognito.CfnIdentityPool(this, "identityPool", {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: userPoolClient.userPoolClientId,
                    providerName: userPool.userPoolProviderName,
                },
            ],
        });

        const authenticatedRole = new iam.Role(this, `authenticatedRole`, {
            assumedBy: new iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                {
                    StringEquals: {
                        "cognito-identity.amazonaws.com:aud": identityPool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "authenticated",
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
        });

        const unauthenticatedRole = new iam.Role(this, `unauthenticatedRole`, {
            assumedBy: new iam.FederatedPrincipal(
                "cognito-identity.amazonaws.com",
                {
                    StringEquals: {
                        "cognito-identity.amazonaws.com:aud": identityPool.ref,
                    },
                    "ForAnyValue:StringLike": {
                        "cognito-identity.amazonaws.com:amr": "unauthenticated",
                    },
                },
                "sts:AssumeRoleWithWebIdentity"
            ),
        });
        unauthenticatedRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.DENY,
                actions: ["*"],
                resources: ["*"],
            })
        );

        new cognito.CfnIdentityPoolRoleAttachment(this, `identityPoolRoleAttachment`, {
            identityPoolId: identityPool.ref,
            roles: {
                authenticated: authenticatedRole.roleArn,
                unauthenticated: unauthenticatedRole.roleArn,
            },
        });

        const regionalWebAcl = new waf.CfnWebACL(this, "regionalWebAcl", {
            defaultAction: { allow: {} },
            scope: "REGIONAL",
            visibilityConfig: {
                metricName: "regionalWebAcl",
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
            },
            rules: [
                {
                    name: "ipRateLimitingRule",
                    priority: 0,
                    statement: {
                        rateBasedStatement: {
                            limit: 3000,
                            aggregateKeyType: "IP",
                        },
                    },
                    action: {
                        block: {},
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: "ipRateLimitingRule",
                    },
                },
                ...createManagedRules("regional", 1, [
                    {
                        name: "AWSManagedRulesCommonRuleSet",
                        overrideAction: {
                            count: {}, // override to count to bypass AWS#AWSManagedRulesCommonRuleSet#SizeRestrictions_BODY
                        },
                    },
                    {
                        name: "AWSManagedRulesBotControlRuleSet",
                        overrideAction: {
                            count: {},
                        },
                        // ruleActionOverrides: [
                        //     // allows requests from cURL and Postman to AppSync
                        //     {
                        //         actionToUse: {
                        //             count: {},
                        //         },
                        //         name: "CategoryHttpLibrary",
                        //     },
                        //     {
                        //         actionToUse: {
                        //             count: {},
                        //         },
                        //         name: "SignalNonBrowserUserAgent",
                        //     },
                        // ],
                    },
                    {
                        name: "AWSManagedRulesKnownBadInputsRuleSet",
                    },
                    {
                        name: "AWSManagedRulesUnixRuleSet",
                        ruleActionOverrides: [
                            {
                                name: "UNIXShellCommandsVariables_BODY",
                                actionToUse: {
                                    count: {},
                                },
                            },
                        ],
                    },
                    {
                        name: "AWSManagedRulesSQLiRuleSet",
                        ruleActionOverrides: [
                            {
                                name: "SQLi_BODY",
                                actionToUse: {
                                    count: {},
                                },
                            },
                        ],
                    },
                ]),
            ],
        });
        const regionalWebAclArn = regionalWebAcl.attrArn;

        new waf.CfnWebACLAssociation(this, "userPoolWebAclAssociation", {
            resourceArn: userPool.userPoolArn,
            webAclArn: regionalWebAclArn,
        });

        this.userPool = userPool;
        this.userPoolDomain = userPool.userPoolDomain;
        this.userPoolClient = userPoolClient;
        this.identityPool = identityPool;
        this.authenticatedRole = authenticatedRole;
        this.unauthenticatedRole = unauthenticatedRole;
        this.regionalWebAclArn = regionalWebAclArn;
    }
}
