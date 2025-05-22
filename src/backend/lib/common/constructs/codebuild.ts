import { BuildSpec, Project, ProjectProps } from "aws-cdk-lib/aws-codebuild";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CodeBuildStep, CodeBuildStepProps } from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { projectConfig } from "../../../../../config";

const codeArtifactPolicies = [
    new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
            "codeartifact:GetAuthorizationToken",
            "codeartifact:GetRepositoryEndpoint",
            "codeartifact:ReadFromRepository",
        ],
        resources: ["*"], // must have * permission to list all stacks in account to filter the correct stack
    }),
    new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:GetServiceBearerToken"],
        resources: ["*"], // must have * permission to list all stacks in account to filter the correct stack
        conditions: {
            StringEquals: {
                "sts:AWSServiceName": "codeartifact.amazonaws.com",
            },
        },
    }),
];

const codeArtifactCommand = projectConfig?.codeArtifact
    ? [
          "aws codeartifact login --tool npm --repository shared --domain amazon --domain-owner 149122183214 --region $AWS_REGION",
      ]
    : [];

export class LabsCodeBuildStep extends CodeBuildStep {
    constructor(id: string, props: CodeBuildStepProps) {
        super(id, {
            ...props,
            installCommands: [...codeArtifactCommand, ...(props.installCommands || [])],
            rolePolicyStatements: [...codeArtifactPolicies, ...(props.rolePolicyStatements || [])],
        });
    }
}

export class LabsReactProject extends Project {
    constructor(scope: Construct, id: string, props: ProjectProps) {
        super(scope, id, {
            ...props,
            buildSpec: BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        "runtime-versions": {
                            nodejs: "22",
                        },
                        commands: [...codeArtifactCommand, "npm install"],
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
        codeArtifactPolicies.forEach((policy) => {
            this.addToRolePolicy(policy);
        });
    }
}
