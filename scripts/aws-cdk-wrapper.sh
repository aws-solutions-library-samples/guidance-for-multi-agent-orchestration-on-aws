#!/bin/bash

# This script runs AWS CDK commands with temporary environment variables
# It doesn't store any credentials in files

# Function to run AWS commands with provided environment variables
run_aws_command() {
    # Note: We're not storing credentials anywhere in this script
    # They're only used temporarily in the environment for this one command

    echo "Running AWS command with environment variables..."
    # The actual AWS command with environment variables set just for this command
    AWS_ACCESS_KEY_ID="$1" \
    AWS_SECRET_ACCESS_KEY="$2" \
    AWS_DEFAULT_REGION="$3" \
    "${@:4}"

    # Return the exit code of the command
    return $?
}

# Display usage information if no arguments
if [ $# -lt 4 ]; then
    echo "Usage: $0 <aws_access_key_id> <aws_secret_access_key> <region> <command> [args...]"
    echo "Example: $0 YOUR_ACCESS_KEY YOUR_SECRET_KEY us-west-2 aws sts get-caller-identity"
    exit 1
fi

# Extract parameters
ACCESS_KEY="$1"
SECRET_KEY="$2"
REGION="$3"
shift 3  # Remove first three args, leaving command and its arguments

# Call function with the credentials and command
run_aws_command "$ACCESS_KEY" "$SECRET_KEY" "$REGION" "$@"

# Return the exit status of the command
exit $?
