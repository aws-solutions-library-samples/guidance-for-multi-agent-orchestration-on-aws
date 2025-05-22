import {
    PythonFunction,
    PythonFunctionProps,
    PythonLayerVersion,
    PythonLayerVersionProps,
} from "@aws-cdk/aws-lambda-python-alpha";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

const commonFunctionProps = {
    architecture: Architecture.ARM_64,
    logRetention: RetentionDays.THREE_MONTHS,
};

export class CommonNodejsFunction extends NodejsFunction {
    constructor(
        scope: Construct,
        id: string,
        props: Omit<NodejsFunctionProps, "architecture" | "runtime" | "logRetention">
    ) {
        super(scope, id, {
            ...commonFunctionProps,
            runtime: Runtime.NODEJS_22_X,
            ...props,
        });
    }
}

const pythonRuntime = Runtime.PYTHON_3_12;

export class CommonPythonLayerVersion extends PythonLayerVersion {
    constructor(
        scope: Construct,
        id: string,
        props: Omit<PythonLayerVersionProps, "compatibleArchitectures" | "compatibleRuntimes">
    ) {
        super(scope, id, {
            compatibleArchitectures: [commonFunctionProps.architecture],
            compatibleRuntimes: [pythonRuntime],
            ...props,
        });
    }
}

type CommonPythonFunctionProps = Omit<
    PythonFunctionProps,
    "architecture" | "runtime" | "logRetention"
>;

export class CommonPythonFunction extends PythonFunction {
    constructor(scope: Construct, id: string, props: CommonPythonFunctionProps) {
        super(scope, id, {
            ...commonFunctionProps,
            runtime: pythonRuntime,
            ...props,
        });
    }
}

export class CommonPythonPowertoolsFunction extends CommonPythonFunction {
    constructor(scope: Construct, id: string, props: CommonPythonFunctionProps) {
        const powertoolsLayer = new CommonPythonLayerVersion(scope, `${id}PowertoolsLayer`, {
            entry: path.join(__dirname, "..", "layers", "powertools"),
        });
        super(scope, id, {
            ...props,
            layers: [powertoolsLayer, ...(props.layers || [])],
        });
    }
}
