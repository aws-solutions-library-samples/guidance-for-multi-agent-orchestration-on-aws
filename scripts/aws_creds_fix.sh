#!/bin/bash

# Script to diagnose and fix AWS credential issues

echo "=== AWS Credential Diagnosis ==="
echo ""
echo "1. Checking for existing credentials for mac-demo-dev profile:"

if grep -q "\[mac-demo-dev\]" ~/.aws/credentials 2>/dev/null; then
  echo "Found mac-demo-dev profile in credentials file:"
  sed -n '/\[mac-demo-dev\]/,/^\[/p' ~/.aws/credentials | grep -v "^\[.*\]$" | sed '$d'
else
  echo "No mac-demo-dev profile found in credentials file."
fi

echo ""
echo "2. Checking for profile configuration in config file:"
if grep -q "\[profile mac-demo-dev\]" ~/.aws/config 2>/dev/null; then
  echo "Found mac-demo-dev profile in config file:"
  sed -n '/\[profile mac-demo-dev\]/,/^\[/p' ~/.aws/config | grep -v "^\[.*\]$" | sed '$d'
else
  echo "No mac-demo-dev profile found in config file."
fi

echo ""
echo "3. Checking for credential processes:"
grep -r "credential_process" ~/.aws/* 2>/dev/null || echo "No credential_process found."

echo ""
echo "4. Checking for AWS environment variables:"
env | grep -E "^AWS_" | sort

echo ""
echo "5. Checking for credential provider chain:"
aws configure list-profiles

echo ""
echo "6. Checking current identity with mac-demo-dev profile:"
aws sts get-caller-identity --profile mac-demo-dev || echo "Failed to get identity"

echo ""
echo "=== Resolving credential issues ==="

echo ""
read -p "Do you want to clear AWS CLI cache? (y/n): " clear_cache
if [[ "$clear_cache" == "y" ]]; then
  echo "Clearing AWS CLI cache..."
  rm -rf ~/.aws/cli/cache/* 2>/dev/null
  echo "Cache cleared."
fi

echo ""
read -p "Do you want to reset your mac-demo-dev profile credentials? (y/n): " reset_creds
if [[ "$reset_creds" == "y" ]]; then
  echo "Resetting credentials for mac-demo-dev profile..."
  
  # Backup existing credentials
  cp ~/.aws/credentials ~/.aws/credentials.bak
  
  # Remove existing profile if it exists
  if grep -q "\[mac-demo-dev\]" ~/.aws/credentials; then
    # Create a temporary file
    awk '/\[mac-demo-dev\]/{flag=1; next} /^\[/{flag=0} !flag' ~/.aws/credentials > ~/.aws/credentials.tmp
    mv ~/.aws/credentials.tmp ~/.aws/credentials
  fi
  
  # Add new credentials
  echo "Enter your new AWS Access Key ID for mac-demo-dev profile:"
  read -r aws_access_key_id
  echo "Enter your new AWS Secret Access Key for mac-demo-dev profile:"
  read -r aws_secret_access_key
  
  echo -e "\n[mac-demo-dev]\naws_access_key_id = $aws_access_key_id\naws_secret_access_key = $aws_secret_access_key\nregion = us-east-1" >> ~/.aws/credentials
  
  echo "Credentials reset complete."
fi

echo ""
echo "Testing the updated configuration:"
aws sts get-caller-identity --profile mac-demo-dev

echo ""
echo "Diagnosis and fixes complete!"
