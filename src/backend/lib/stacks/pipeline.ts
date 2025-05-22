import {
    aws_cloudtrail as cloudtrail,
    aws_codebuild as codebuild,
    aws_codepipeline as codepipeline,
    aws_codepipeline_actions as codepipeline_actions,
    aws_iam as iam,
    pipelines,
    StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { PresetStageType, projectConfig } from "../../../../config";
import { LabsCodeBuildStep } from "../common/constructs/codebuild";
import { CommonBucket } from "../common/constructs/s3";
import { CommonStack } from "../common/constructs/stack";
import { ApplicationStage } from "../stage";

export class PipelineStack extends CommonStack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceBucket = new CommonBucket(this, "sourceBucket", {
            bucketName: `${projectConfig.projectId}-source-bucket-${this.account}-${this.region}`,
            serverAccessLogsBucket: new CommonBucket(this, "loggingBucket", {}),
            versioned: true, // requirement for triggering pipeline
        });

        const objectKey: string = "deploy.zip";
        // this is the file name Gitlab-CI will bundle the repo to in AWS S3

        new cloudtrail.Trail(this, "trail").addS3EventSelector(
            [
                {
                    bucket: sourceBucket,
                    objectPrefix: objectKey,
                },
            ],
            {
                readWriteType: cloudtrail.ReadWriteType.WRITE_ONLY,
            }
        );

        // https://gitlab.pages.aws.dev/docs/Platform/aws-credential-vendor.html#template-trust-policy
        new iam.CfnRole(this, "gitlabRunnerRole", {
            roleName: `${projectConfig.projectId}-gitlab-runner-role`,
            assumeRolePolicyDocument: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ["sts:AssumeRole", "sts:TagSession"],
                        principals: [
                            new iam.ArnPrincipal(
                                "arn:aws:iam::979517299116:role/gitlab-runners-prod"
                            ),
                        ], // must be the central Gitlab runner account
                        conditions: {
                            StringEquals: {
                                "aws:PrincipalTag/GitLab:Group": [projectConfig.gitlabGroup],
                                "aws:PrincipalTag/GitLab:Project": [projectConfig.gitlabProject],
                            },
                        },
                    }),
                ],
            }),
            policies: [
                {
                    policyName: "sourceBucketReadWritePolicy",
                    policyDocument: {
                        Version: "2012-10-17",
                        Statement: [
                            {
                                Effect: "Allow",
                                Action: ["s3:List*"],
                                Resource: [
                                    `${sourceBucket.bucketArn}`,
                                    `${sourceBucket.bucketArn}/*`,
                                ],
                            },
                            {
                                Effect: "Allow",
                                Action: "s3:*Object",
                                Resource: [
                                    `${sourceBucket.bucketArn}`,
                                    `${sourceBucket.bucketArn}/*`,
                                ],
                            },
                        ],
                    },
                },
            ],
        });

        const pipeline = new pipelines.CodePipeline(this, "pipeline", {
            selfMutation: true,
            dockerEnabledForSynth: true,
            crossAccountKeys: true,
            codeBuildDefaults: {
                buildEnvironment: {
                    buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2_STANDARD_3_0,
                    computeType: codebuild.ComputeType.LARGE,
                    privileged: true, // for docker in docker
                },
                partialBuildSpec: codebuild.BuildSpec.fromObject({
                    phases: {
                        install: {
                            "runtime-versions": {
                                nodejs: 22,
                            },
                        },
                    },
                }),
            },
            synth: new LabsCodeBuildStep("synth", {
                input: pipelines.CodePipelineSource.s3(sourceBucket, objectKey, {
                    trigger: codepipeline_actions.S3Trigger.EVENTS,
                    actionName: new codepipeline_actions.S3SourceAction({
                        actionName: "S3Source",
                        bucket: sourceBucket,
                        bucketKey: objectKey,
                        output: new codepipeline.Artifact(),
                        trigger: codepipeline_actions.S3Trigger.EVENTS,
                    }).actionProperties.actionName,
                }),
                installCommands: ["npm run setup"],
                commands: ["npm run -w backend synth"],
                primaryOutputDirectory: "./src/backend/cdk.out",
            }),
        });

        pipeline.addStage(
            new ApplicationStage(this, PresetStageType.Dev, {
                env: {
                    account: projectConfig.accounts[PresetStageType.Dev].number,
                    region: projectConfig.accounts[PresetStageType.Dev].region,
                },
            })
        );

        const prodAccount = projectConfig.accounts[PresetStageType.Prod];
        if (prodAccount) {
            pipeline.addStage(
                new ApplicationStage(this, PresetStageType.Prod, {
                    env: {
                        account: prodAccount.number,
                        region: prodAccount.region,
                    },
                }),
                {
                    pre: [
                        new pipelines.ManualApprovalStep("prodApprovalStep", {
                            comment: "Approve changes to prod.",
                        }),
                    ],
                }
            );
        }
    }
}
