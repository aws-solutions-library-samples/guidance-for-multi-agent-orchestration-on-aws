import { CloudfrontWebAcl } from "@aws/pdk/static-website";
import {
    CfnOutput,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as cloudfront_origins,
    aws_codebuild as codebuild,
    custom_resources,
    CustomResource,
    Duration,
    aws_iam as iam,
    aws_logs as logs,
    aws_s3 as s3,
    aws_s3_assets as s3_assets,
    Stack,
    StackProps,
    aws_stepfunctions as stepfunctions,
} from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { LabsReactProject } from "../../common/constructs/codebuild";
import { CommonNodejsFunction } from "../../common/constructs/lambda";
import { CommonBucket } from "../../common/constructs/s3";
import { CommonStack } from "../../common/constructs/stack";

export class FrontendStack extends CommonStack {
    public readonly websiteBucket: s3.Bucket;
    public readonly distribution: cloudfront.Distribution;
    public readonly urls: string[];

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const loggingBucket = new CommonBucket(this, "loggingBucket", {});

        this.websiteBucket = new CommonBucket(this, "websiteBucket", {
            serverAccessLogsBucket: loggingBucket,
        });

        const cloudfrontWebAcl = new CloudfrontWebAcl(this, "cloudfrontWebAcl", {
            managedRules: [
                {
                    vendor: "AWS",
                    name: "AWSManagedRulesCommonRuleSet",
                },
                {
                    vendor: "AWS",
                    name: "AWSManagedRulesAmazonIpReputationList",
                },
                {
                    vendor: "AWS",
                    name: "AWSManagedRulesBotControlRuleSet",
                },
            ],
        });

        this.distribution = new cloudfront.Distribution(this, "distribution", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
                    this.websiteBucket
                ),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            },
            errorResponses: [
                {
                    httpStatus: 404,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
                {
                    httpStatus: 403,
                    responsePagePath: "/index.html",
                    responseHttpStatus: 200,
                },
            ],
            minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
            sslSupportMethod: cloudfront.SSLMethod.SNI,
            webAclId: cloudfrontWebAcl.webAclArn,
            logBucket: loggingBucket,
            logIncludesCookies: true,
            logFilePrefix: "distribution",
        });
        NagSuppressions.addResourceSuppressions(this.distribution, [
            {
                id: "AwsSolutions-CFR1",
                reason: "Distribution should be globally accessible.",
            },
            {
                id: "AwsSolutions-CFR4",
                reason: "Distribution is configured with TLS_V1_2_2021.",
            },
        ]);

        this.urls = [
            `https://${this.distribution.distributionDomainName}`,
            "http://localhost:3000",
        ];
    }
}

interface FrontendDeploymentStackProps extends StackProps {
    websiteBucket: s3.Bucket;
    distribution: cloudfront.Distribution;
    environmentVariables: Record<string, string>;
}

export class FrontendDeploymentStack extends CommonStack {
    constructor(scope: Construct, id: string, props: FrontendDeploymentStackProps) {
        super(scope, id, props);

        const websiteAssets = new s3_assets.Asset(this, "websiteAssets", {
            path: path.join(__dirname, "..", "..", "..", "..", "frontend"),
            exclude: ["node_modules", "dist"],
        });

        const buildEnvironmentVariables: codebuild.BuildEnvironment["environmentVariables"] =
            Object.fromEntries(
                Object.entries(props.environmentVariables).map(([key, value]) => [key, { value }])
            );

        const reactProject = new LabsReactProject(this, "reactProject", {
            source: codebuild.Source.s3({
                bucket: websiteAssets.bucket,
                path: websiteAssets.s3ObjectKey,
            }),
            artifacts: codebuild.Artifacts.s3({
                bucket: props.websiteBucket,
                includeBuildId: false,
                packageZip: false,
                name: "/",
                encryption: false,
            }),
            environment: {
                buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                computeType: codebuild.ComputeType.SMALL,
                environmentVariables: {
                    ...buildEnvironmentVariables,
                    DISTRIBUTION_ID: {
                        value: props.distribution.distributionId,
                    },
                },
            },
            buildSpec: codebuild.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        "runtime-versions": {
                            nodejs: "22",
                        },
                        commands: ["npm install"],
                    },
                    build: {
                        commands: ["npm run build"],
                    },
                    post_build: {
                        commands: [
                            'aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"',
                        ],
                    },
                },
                artifacts: {
                    files: ["**/*"],
                    "base-directory": "dist",
                },
            }),
        });
        reactProject.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["cloudfront:CreateInvalidation"],
                resources: [props.distribution.distributionArn],
            })
        );
        NagSuppressions.addResourceSuppressions(reactProject, [
            {
                id: "AwsSolutions-CB4",
                reason: "CodeBuild project does not need a KMS key for encryption.",
            },
        ]);

        const providerFunctionEntry = path.join(__dirname, "provider-function", "index.ts");
        const reactProvider = new custom_resources.Provider(this, "reactProvider", {
            onEventHandler: new CommonNodejsFunction(this, "reactOnEventHandler", {
                entry: providerFunctionEntry,
                handler: "onEventHandler",
                initialPolicy: [
                    new iam.PolicyStatement({
                        actions: ["codebuild:StartBuild"],
                        resources: [reactProject.projectArn],
                    }),
                ],
            }),
            isCompleteHandler: new CommonNodejsFunction(this, "reactIsCompleteHandler", {
                entry: providerFunctionEntry,
                handler: "isCompleteHandler",
                initialPolicy: [
                    new iam.PolicyStatement({
                        actions: ["codebuild:BatchGetBuilds"],
                        resources: [reactProject.projectArn],
                    }),
                ],
            }),
            logRetention: logs.RetentionDays.THREE_MONTHS,
            queryInterval: Duration.seconds(15),
            totalTimeout: Duration.minutes(15),
            waiterStateMachineLogOptions: {
                level: stepfunctions.LogLevel.ALL,
            },
        });
        NagSuppressions.addResourceSuppressions(
            reactProvider,
            [
                {
                    id: "AwsSolutions-SF2",
                    reason: "X-Ray tracing is not configurable.",
                },
            ],
            true
        );

        new CustomResource(this, "reactCustomResource", {
            serviceToken: reactProvider.serviceToken,
            properties: {
                projectName: reactProject.projectName,
                assetHash: websiteAssets.assetHash,
            },
        });

        const outputPrefix = Stack.of(this).stackName;
        Object.entries(props.environmentVariables).forEach(([key, value]) => {
            const outputKey = key.toLocaleLowerCase();
            const outputId = outputKey.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            const outputSuffix = outputKey.replace(/_/g, "-");
            new CfnOutput(this, outputId, {
                value: value,
                exportName: `${outputPrefix}-${outputSuffix}`,
            });
        });
    }
}
