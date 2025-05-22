import { StackProps } from 'aws-cdk-lib';
import { Architecture, Runtime } from 'aws-cdk-lib/aws-lambda';

/**
 * Lambda configuration
 */
export const lambdaArchitecture = Architecture.ARM_64;
export const lambdaRuntime = Runtime.PYTHON_3_12;
export const lambdaBundlerImage = lambdaRuntime.bundlingImage;

/**
 * Project configuration
 * The project name should be lowercase and use dashes for spaces (kebab-case)
 */
export const projectName = 'mac-demo';

/**
 * Get AWS account info from environment variables
 * If not available, use empty string to force explicit configuration
 */
const currentAccount = '{ACCOUNT_NUMBER}';// Default to us-west-2 if region not specified
const currentRegion = process.env.CDK_DEFAULT_REGION || 'us-west-2';

/**
 * Account configuration for deployment environments - only DEV is supported
 */
export const accountMappings: AccountMappingType[] = [
  {
    id: 'dev',
    account: currentAccount,
    region: currentRegion,
    type: 'DEV'
  }
];


/**
 * Environment configuration interface 
 */
export interface CdkEnvironment {
  account: string;
  region: string;
}

/**
 * CDK Props interface extending StackProps with additional properties
 */
export interface CDKProps extends StackProps {
  projectName: string;
  stage: string;
  dev: boolean; // Always true - only DEV is supported
  env?: CdkEnvironment;
  description?: string;
  terminationProtection?: boolean;
  environment?: string;
}

/**
 * Account mapping type definition
 */
export interface AccountMappingType {
  id: string;
  account: string;
  region: string;
  type: 'DEV'; // Only DEV is supported
}

