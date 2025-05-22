#!/bin/bash

# Script to run AWS CDK deployments with direct environment credentials
# This works specifically with the project's CDK deployment process

# Function to display usage instructions
show_usage() {
    echo "Usage: $0 [stack_name(s)]"
    echo ""
    echo "This script will run 'cdk deploy' with direct environment credentials,"
    echo "avoiding any Isengard credential conflicts."
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy all stacks interactively"
    echo "  $0 'dev/mac-demo-*'     # Deploy all dev stacks"
    echo "  $0 'dev/mac-demo-auth'  # Deploy specific stack"
    echo ""
    echo "You will be prompted for AWS credentials at runtime - they are never stored."
    echo "The script will use the project's backend CDK to run the deployment."
    exit 1
}

# Check if help was requested
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_usage
fi

# Prompt for credentials (not stored in files or history)
read -p "Enter AWS Access Key ID: " ACCESS_KEY
read -sp "Enter AWS Secret Access Key: " SECRET_KEY
echo ""  # Add newline after password input
read -p "Enter AWS Region [us-west-2]: " REGION
REGION=${REGION:-us-west-2}  # Default to us-west-2 if not provided

# If stacks specified, use them; otherwise, run the interactive deploy
if [ $# -gt 0 ]; then
    STACKS="$*"
    echo ""
    echo "Running CDK deploy for stacks: $STACKS"
    
    # Use environment variables to override credentials for the CDK command
    (
      cd src/backend && \
      AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
      AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
      AWS_DEFAULT_REGION="$REGION" \
      AWS_SDK_LOAD_CONFIG=0 \
      npx cdk deploy $STACKS --require-approval never
    )
else
    echo ""
    echo "Running interactive CDK deployment with direct credentials"
    echo "Select your stack(s) in the interactive menu"
    echo ""
    
    # Run the project's develop.ts script but override AWS credentials with environment variables
    AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
    AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
    AWS_DEFAULT_REGION="$REGION" \
    AWS_SDK_LOAD_CONFIG=0 \
    npx ts-node tools/cli/develop.ts
fi

# Store the exit status
EXIT_STATUS=$?

echo ""
if [ $EXIT_STATUS -eq 0 ]; then
    echo "CDK deployment completed successfully."
else
    echo "CDK deployment failed with exit code $EXIT_STATUS."
fi

exit $EXIT_STATUS
