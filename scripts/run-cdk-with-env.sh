#!/bin/bash

# Script to run CDK deployment using only environment variables
# This bypasses any AWS config file parsing issues

echo "===== CDK Deployment with Environment Variables ====="
echo "This script will run CDK commands using direct environment variables"
echo "without relying on AWS credential files or profiles."
echo ""

# Check if access key is provided as first argument
if [ -n "$1" ] && [[ ! "$1" == -* ]]; then
    ACCESS_KEY="$1"
    shift
else
    read -p "Enter AWS Access Key ID: " ACCESS_KEY
fi

# Check if secret key is provided as second argument
if [ -n "$1" ] && [[ ! "$1" == -* ]]; then
    SECRET_KEY="$1"
    shift
else
    read -sp "Enter AWS Secret Access Key: " SECRET_KEY
    echo ""  # Add newline after password input
fi

# Default to us-west-2 or use third argument
if [ -n "$1" ] && [[ ! "$1" == -* ]]; then
    REGION="$1"
    shift
else
    read -p "Enter AWS Region [us-west-2]: " REGION
    REGION=${REGION:-us-west-2}  # Default to us-west-2 if not provided
fi

# Build stack selection based on remaining args
STACK_ARGS=""
if [ $# -gt 0 ]; then
    STACK_ARGS="$*"
fi

echo ""
echo "Using environment variables for AWS credentials..."
echo "Region: $REGION"
echo ""

if [ -z "$STACK_ARGS" ]; then
    # If no specific stacks, run the development tool
    echo "Running interactive deployment tool..."
    echo "Select 'Deploy CDK Stack(s)' when the menu appears."
    echo ""
    
    # Set environment variables and run the develop.ts script
    export AWS_ACCESS_KEY_ID="$ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$SECRET_KEY"
    export AWS_DEFAULT_REGION="$REGION"
    export AWS_SDK_LOAD_CONFIG=0  # Prevent loading from config file
    npx ts-node tools/cli/develop.ts
else
    # Run CDK deploy with the specified stacks
    echo "Running CDK deploy for stacks: $STACK_ARGS"
    
    # Go to the backend directory and run CDK deploy
    (
        cd src/backend && \
        export AWS_ACCESS_KEY_ID="$ACCESS_KEY" && \
        export AWS_SECRET_ACCESS_KEY="$SECRET_KEY" && \
        export AWS_DEFAULT_REGION="$REGION" && \
        export AWS_SDK_LOAD_CONFIG=0 && \
        npx cdk deploy $STACK_ARGS --require-approval never
    )
fi

EXIT_STATUS=$?

if [ $EXIT_STATUS -eq 0 ]; then
    echo ""
    echo "CDK deployment completed successfully!"
else
    echo ""
    echo "CDK deployment failed with exit code $EXIT_STATUS"
fi

# Clear environment variables for security
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY

exit $EXIT_STATUS
