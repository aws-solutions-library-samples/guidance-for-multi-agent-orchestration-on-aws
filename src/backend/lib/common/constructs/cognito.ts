import { RemovalPolicy, Stack } from "aws-cdk-lib";
import {
    UserPool,
    UserPoolClient,
    UserPoolClientProps,
    UserPoolDomain,
    UserPoolProps,
} from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
import { projectConfig } from "../../../../../config";

export class LabsUserPool extends UserPool {
    public readonly userPoolDomain: UserPoolDomain;
    constructor(scope: Construct, id: string, props: UserPoolProps) {
        super(scope, id, {
            ...props,
            removalPolicy: RemovalPolicy.DESTROY,
            customAttributes: props.customAttributes,
        });
        this.userPoolDomain = this.addDomain("userPoolDomain", {
            cognitoDomain: {
                domainPrefix: `${projectConfig.projectId}-${Stack.of(scope).account}`,
            },
        });
    }
}

export class LabsUserPoolClient extends UserPoolClient {
    constructor(scope: Construct, id: string, props: UserPoolClientProps) {
        super(scope, id, {
            ...props,
            authFlows: props.authFlows,
            oAuth: props.oAuth,
            supportedIdentityProviders: props.supportedIdentityProviders,
        });
    }
}
