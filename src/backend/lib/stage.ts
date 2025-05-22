import { Aspects, Stage, StageProps } from "aws-cdk-lib";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { BackendStack } from "./stacks/backend";
import { FrontendDeploymentStack, FrontendStack } from "./stacks/frontend";

export class ApplicationStage extends Stage {
    constructor(scope: Construct, id: string, props: StageProps) {
        super(scope, id, props);

        const frontend = new FrontendStack(this, "frontend");

        const backend = new BackendStack(this, "backend", {
            urls: frontend.urls,
        });

        // this stack must be named frontendDeployment
        new FrontendDeploymentStack(this, "frontendDeployment", {
            websiteBucket: frontend.websiteBucket,
            distribution: frontend.distribution,
            environmentVariables: backend.environmentVariables,
        });

        NagSuppressions.addResourceSuppressions(
            this,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Lambda functions require the AWSLambdaBasicExecutionRole to write logs to CloudWatch.",
                    appliesTo: [
                        "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
                    ],
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "High-level constructs require wildcards for dynamic resource creation and management.",
                },
                {
                    id: "AwsSolutions-L1",
                    reason: "High-level constructs set their own runtimes.",
                },
            ],
            true
        );
        Aspects.of(this).add(new AwsSolutionsChecks());
    }
}
