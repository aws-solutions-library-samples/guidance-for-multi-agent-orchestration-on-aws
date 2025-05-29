import { Database } from "@aws-cdk/aws-glue-alpha";
import { aws_s3 as s3, aws_s3_deployment as s3_deployment, Stack } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { createGluePolicy } from "./glue-policies";
import { CfnCrawler, CfnTable } from "aws-cdk-lib/aws-glue";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
    AwsCustomResource,
    AwsCustomResourcePolicy,
    AwsSdkCall,
    PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import * as path from "path";
import { CommonBucket, CommonStorageBucket } from "../../../common/constructs/s3";

interface StorageProps {
    urls: string[];
}

export class Storage extends Construct {
    public readonly structuredDataBucket: s3.Bucket;
    public readonly athenaResultsBucket: s3.Bucket;
    public readonly orderManagementDatabase: Database;

    constructor(scope: Construct, id: string, props: StorageProps) {
        super(scope, id);

        const { urls } = props;

        const loggingBucket = new CommonBucket(this, "loggingBucket", {});

        const structuredDataBucket = new CommonStorageBucket(this, "structuredDataBucket", {
            allowedOrigins: urls,
            eventBridgeEnabled: true,
            serverAccessLogsBucket: loggingBucket,
        });

        const athenaResultsBucket = new CommonStorageBucket(this, "athenaResultsBucket", {
            allowedOrigins: urls,
            eventBridgeEnabled: true,
            serverAccessLogsBucket: loggingBucket,
        });

        const storageDeployment = new s3_deployment.BucketDeployment(this, "storageDeployment", {
            sources: [s3_deployment.Source.asset(path.join(__dirname, "assets"))],
            destinationBucket: structuredDataBucket,
            // prune: false,
        });

        // Create databases
        const orderManagementDatabase = new Database(this, "orderManagementDatabase", {
            databaseName: "order_management",
        });
        
        const personalizationDatabase = new Database(this, "personalizationDatabase", {
            databaseName: "personalization",
        });
        
        const productRecommendationDatabase = new Database(this, "productRecommendationDatabase", {
            databaseName: "prod_rec",
        });

        const databaseList = [
            orderManagementDatabase,
            personalizationDatabase,
            productRecommendationDatabase,
        ];

        const crawlerRole = new Role(this, "crawlerRole", {
            assumedBy: new ServicePrincipal("glue.amazonaws.com"),
        });
        crawlerRole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSGlueServiceRole")
        );
        structuredDataBucket.grantRead(crawlerRole);

        // Array to track crawler resources for dependencies
        const crawlerResources: AwsCustomResource[] = [];

        // Create crawlers for other tables in the databases, excluding the order_management paths
        databaseList.forEach((database, index) => {
            let crawlerTargets: any = {
                s3Targets: [
                    {
                        path: `s3://${structuredDataBucket.bucketName}/${database.databaseName}/`,
                    },
                ],
                exclusions: []
            };
            
            // Remove exclusions for order_management to allow the crawler to discover all tables with proper schemas
            // Previously we were excluding orders and inventory tables, which caused them to have generic column names (col0, col1, etc.)
            if (database.databaseName === "order_management") {
                crawlerTargets.exclusions = [];
            }

            const crawler = new CfnCrawler(this, `crawler${index}`, {
                targets: crawlerTargets,
                databaseName: database.databaseName,
                role: crawlerRole.roleArn,
                tablePrefix: "",
            });

            // Create a stable identifier based on stack name and crawler name
            const stableId = `${Stack.of(this).stackName}-crawler-${index}`;
            
            const startCrawlerCall: AwsSdkCall = {
                service: "Glue",
                action: "startCrawler",
                parameters: {
                    Name: crawler.ref,
                },
                physicalResourceId: PhysicalResourceId.of(stableId),
            };
            
            // Create and track crawler resources
            const crawlerResource = new AwsCustomResource(this, `startCrawlerCustomResource${index}`, {
                onCreate: startCrawlerCall,
                onUpdate: startCrawlerCall,
                policy: createGluePolicy(),
            });
            crawlerResource.node.addDependency(storageDeployment);
            crawlerResources.push(crawlerResource);
        });

        // Using Athena SQL to create tables with proper schema (more reliable than CfnTable)
        // This approach creates tables with proper column names instead of generic col0, col1, etc.
        
        // Grant Athena permissions to access the results bucket
        athenaResultsBucket.grantReadWrite(new ServicePrincipal('athena.amazonaws.com'));
        
        // Step 1: Drop existing orders table
        const dropOrdersTableQuery = this.createAthenaQueryResource(
            "DropOrdersTable",
            `DROP TABLE IF EXISTS ${orderManagementDatabase.databaseName}.orders;`,
            athenaResultsBucket,
            structuredDataBucket
        );
        
        // Step 2: Create orders table with proper column names
        const createOrdersTableQuery = this.createAthenaQueryResource(
            "CreateOrdersTable",
            `CREATE EXTERNAL TABLE IF NOT EXISTS ${orderManagementDatabase.databaseName}.orders (
                order_id STRING,
                customer_id STRING,
                product_id STRING,
                product_name STRING,
                order_status STRING,
                shipping_status STRING,
                return_exchange_status STRING,
                order_date STRING,
                delivery_date STRING
            )
            ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
            WITH SERDEPROPERTIES (
                'serialization.format' = ',',
                'escapeChar' = '\\\\',
                'quoteChar' = '"'
            )
            LOCATION 's3://${structuredDataBucket.bucketName}/${orderManagementDatabase.databaseName}/orders/'
            TBLPROPERTIES ('skip.header.line.count'='1');`,
            athenaResultsBucket,
            structuredDataBucket
        );
        
        // Step 3: Drop existing inventory table
        const dropInventoryTableQuery = this.createAthenaQueryResource(
            "DropInventoryTable",
            `DROP TABLE IF EXISTS ${orderManagementDatabase.databaseName}.inventory;`,
            athenaResultsBucket,
            structuredDataBucket
        );
        
        // Step 4: Create inventory table with proper column names
        const createInventoryTableQuery = this.createAthenaQueryResource(
            "CreateInventoryTable",
            `CREATE EXTERNAL TABLE IF NOT EXISTS ${orderManagementDatabase.databaseName}.inventory (
                product_id STRING,
                product_name STRING,
                category STRING,
                quantity INT,
                in_stock STRING,
                reorder_threshold INT,
                reorder_quantity INT,
                last_restock_date STRING
            )
            ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
            WITH SERDEPROPERTIES (
                'serialization.format' = ',',
                'escapeChar' = '\\\\',
                'quoteChar' = '"'
            )
            LOCATION 's3://${structuredDataBucket.bucketName}/${orderManagementDatabase.databaseName}/inventory/'
            TBLPROPERTIES ('skip.header.line.count'='1');`,
            athenaResultsBucket,
            structuredDataBucket
        );
        
        // Set up the proper sequence of dependencies for table creation
        
        // Ensure drops happen after any crawlers
        crawlerResources.forEach(resource => {
            dropOrdersTableQuery.node.addDependency(resource);
            dropInventoryTableQuery.node.addDependency(resource);
        });
        
        // Ensure table creation happens after table drops
        createOrdersTableQuery.node.addDependency(dropOrdersTableQuery);
        createInventoryTableQuery.node.addDependency(dropInventoryTableQuery);
        
        this.structuredDataBucket = structuredDataBucket;
        this.athenaResultsBucket = athenaResultsBucket;
        this.orderManagementDatabase = orderManagementDatabase;
    }

    /**
     * Creates an AWS Custom Resource that executes an Athena query
     * @param id Resource ID
     * @param query SQL query to execute
     * @param resultsBucket Bucket to store query results
     * @param dataBucket Bucket containing the data for tables
     * @returns AwsCustomResource that executes the query
     */
    private createAthenaQueryResource(id: string, query: string, resultsBucket: s3.Bucket, dataBucket: s3.Bucket): AwsCustomResource {
        // Create a stable identifier based on query content hash to ensure consistency
        // This approach prevents the changing physical ID issues that can occur with timestamps
        const stackName = Stack.of(this).stackName;
        const queryHash = this.hashString(query).substring(0, 8); // Use first 8 chars of hash
        const stableId = `${stackName}-${id}-${queryHash}`;
        
        // Create a very simple query for the delete handler that always succeeds
        // Using a simple metadata query avoids the complexities of the real query during deletion
        const simpleQueryCall: AwsSdkCall = {
            service: 'Athena',
            action: 'startQueryExecution',
            parameters: {
                QueryString: 'SELECT 1', // Simple query that always succeeds
                ResultConfiguration: {
                    OutputLocation: `s3://${resultsBucket.bucketName}/deletion-${id}/`,
                },
                // Add database context even for simple queries to ensure permissions are correct
                QueryExecutionContext: {
                    Database: 'default'
                }
            },
            // Use a static ID for deletion that doesn't depend on the current time
            physicalResourceId: PhysicalResourceId.of(`static-${stableId}`),
        };
        
        // Main query for creation and updates
        const executeQueryCall: AwsSdkCall = {
            service: 'Athena',
            action: 'startQueryExecution',
            parameters: {
                QueryString: query,
                ResultConfiguration: {
                    OutputLocation: `s3://${resultsBucket.bucketName}/${id}/`,
                },
                // Add query execution context with database specified
                QueryExecutionContext: {
                    // Use the database name extracted from the query if it's a CREATE/DROP TABLE,
                    // otherwise use 'default'. This helps ensure we're using the right database context.
                    Database: query.includes('TABLE') ? 
                        query.match(/\b(\w+)\.(\w+)\b/)?.[1] || 'default' : 
                        'default'
                }
            },
            // Use a stable physical ID for the resource based on content hash rather than timestamp
            physicalResourceId: PhysicalResourceId.of(`query-${stableId}`),
        };
        
        // Create the custom resource with better error handling and a simpler delete operation
        return new AwsCustomResource(this, id, {
            onCreate: executeQueryCall,
            onUpdate: executeQueryCall,
            // Use the simple query for delete to avoid complexities with deletion
            // This is CRITICAL for preventing stuck resources during stack deletion
            onDelete: simpleQueryCall,
        policy: AwsCustomResourcePolicy.fromStatements([
            new iam.PolicyStatement({
                actions: [
                    'athena:StartQueryExecution',
                    'athena:GetQueryExecution',
                    'athena:GetQueryResults'
                ],
                resources: ['*']
            }),
            new iam.PolicyStatement({
                actions: [
                    's3:GetBucketLocation',
                    's3:GetObject',
                    's3:ListBucket',
                    's3:ListBucketMultipartUploads',
                    's3:ListMultipartUploadParts',
                    's3:AbortMultipartUpload',
                    's3:CreateBucket',
                    's3:PutObject'
                ],
                resources: [
                    resultsBucket.bucketArn,
                    `${resultsBucket.bucketArn}/*`,
                    // Also grant access to data bucket for table creation
                    dataBucket.bucketArn,
                    `${dataBucket.bucketArn}/*`
                ]
            }),
            // Add Glue permissions needed for Athena to access the catalog
            new iam.PolicyStatement({
                actions: [
                    'glue:CreateDatabase',
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:CreateTable',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:UpdateTable',
                    'glue:DeleteTable',
                    'glue:BatchCreatePartition',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                    'glue:BatchGetPartition'
                ],
                resources: ['*']
            })
        ]),
        });
    }
    
    /**
     * Generates a simple hash of a string for creating stable IDs
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Convert to positive hex string
        return Math.abs(hash).toString(16);
    }
}
