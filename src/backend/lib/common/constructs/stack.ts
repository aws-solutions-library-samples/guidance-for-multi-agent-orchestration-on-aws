import { CfnElement, CfnOutput, CfnResource, Stack, StackProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";

export class CommonStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        const prefix = scope.node.tryGetContext("stackPrefix");
        const prefixedId = prefix ? `${prefix}-${id}` : id;
        super(scope, prefixedId, props);
        if (prefix) {
            Tags.of(this).add("projectId", prefix);
        }
    }

    private capitalize(str: string): string {
        return str[0].toUpperCase() + str.slice(1);
    }

    public allocateLogicalId(element: CfnElement) {
        const logicalId = super.allocateLogicalId(element);
        // prefix must adhere to the regular expression: /^[A-Za-z0-9]{1,255}$/
        const prefix = this.node.tryGetContext("elementPrefix");
        if (prefix && (element instanceof CfnResource || element instanceof CfnOutput)) {
            return `${prefix}${this.capitalize(logicalId)}`;
        } else {
            return logicalId;
        }
    }
}
