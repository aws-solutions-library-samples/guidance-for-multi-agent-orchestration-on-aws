#!/bin/bash

# Script to run AWS commands with direct environment credentials
# instead of using profiles with potential Isengard conflicts

# Function to display usage instructions
show_usage() {
    echo "Usage: $0 <command>"
    echo "Example: $0 'aws sts get-caller-identity --profile mac-demo-dev'"
    echo ""
    echo "This script will use direct environment variables to override credentials"
    echo "for AWS commands, avoiding Isengard credential conflicts."
    echo ""
    echo "You will be prompted for AWS credentials at runtime - they are never stored."
    exit 1
}

# Check if command was provided
if [ $# -eq 0 ]; then
    show_usage
fi

# Build the full command from all arguments
COMMAND="$*"

# Prompt for credentials (not stored in files or history)
read -p "Enter AWS Access Key ID: " ACCESS_KEY
read -sp "Enter AWS Secret Access Key: " SECRET_KEY
echo ""  # Add newline after password input
read -p "Enter AWS Region [us-west-2]: " REGION
REGION=${REGION:-us-west-2}  # Default to us-west-2 if not provided

# Show execution details
echo ""
echo "Running command with direct credentials: $COMMAND"
echo ""

# Run the command with environment variables overriding any profile settings
AWS_ACCESS_KEY_ID="$ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$SECRET_KEY" \
AWS_DEFAULT_REGION="$REGION" \
$COMMAND

# Store the exit status
EXIT_STATUS=$?

echo ""
if [ $EXIT_STATUS -eq 0 ]; then
    echo "Command completed successfully."
else
    echo "Command failed with exit code $EXIT_STATUS."
fi

exit $EXIT_STATUS
