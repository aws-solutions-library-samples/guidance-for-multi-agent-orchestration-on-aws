import { RemovalPolicy } from "aws-cdk-lib";
import {
    BlockPublicAccess,
    Bucket,
    BucketProps,
    HttpMethods,
    ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

type CommonBucketProps = Omit<
    BucketProps,
    "blockPublicAccess" | "enforceSSL" | "serverAccessLogsPrefix"
>;

export class CommonBucket extends Bucket {
    constructor(scope: Construct, id: string, props: CommonBucketProps) {
        super(scope, id, {
            autoDeleteObjects: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            serverAccessLogsPrefix: `${id}/`,
            objectOwnership: props.serverAccessLogsBucket
                ? undefined
                : ObjectOwnership.BUCKET_OWNER_PREFERRED,
            ...props,
        });
    }
}

interface CommonStorageBucketProps extends Omit<CommonBucketProps, "cors"> {
    allowedOrigins: string[];
    /**
     * Set a maximum length for the bucket name to avoid deployment issues.
     * S3 bucket names are limited to 63 characters.
     * Default is 45 characters to leave room for CDK-generated suffixes.
     */
    maxBucketNameLength?: number;
}

export class CommonStorageBucket extends CommonBucket {
    constructor(scope: Construct, id: string, props: CommonStorageBucketProps) {
        // Ensure the bucket name will not exceed limits
        const maxLength = props.maxBucketNameLength || 45;
        const bucketNamePrefix = id.substring(0, maxLength);
        
        // Generate a shortened hash to make bucket name unique without using 'this'
        // Static helper function to avoid using 'this' before super() call
        const shortHash = CommonStorageBucket.generateShortHash(id);
        
        super(scope, id, {
            // Override bucketName with a shorter version if necessary to prevent deployment issues
            bucketName: undefined, // Let CDK generate a bucket name to avoid conflicts
            cors: [
                {
                    allowedMethods: [
                        HttpMethods.GET,
                        HttpMethods.POST,
                        HttpMethods.PUT,
                        HttpMethods.HEAD,
                        HttpMethods.DELETE,
                    ],
                    allowedOrigins: props.allowedOrigins,
                    allowedHeaders: ["*"],
                    exposedHeaders: [
                        "x-amz-server-side-encryption",
                        "x-amz-request-id",
                        "x-amz-id-2",
                        "ETag",
                        "x-amz-meta-foo",
                    ],
                    maxAge: 3000,
                },
            ],
            ...props,
        });
    }
    
    /**
     * Generates a short hash string from the input string.
     * Useful for creating unique but consistent bucket name parts.
     * Made static so it can be used before super() call
     */
    private static generateShortHash(input: string): string {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        
        // Convert to a positive 6-character alphanumeric string
        return Math.abs(hash).toString(36).substring(0, 6);
    }
}
