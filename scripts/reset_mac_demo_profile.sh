#!/bin/bash

echo "===== AWS Profile Reset Tool ====="
echo "This script will backup your AWS credentials and config files,"
echo "then clean up and reconfigure the mac-demo-dev profile."
echo ""

# Backup the AWS credentials and config files
echo "Creating backups of your AWS config files..."
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
mkdir -p ~/.aws/backups
cp ~/.aws/credentials ~/.aws/backups/credentials.$TIMESTAMP 2>/dev/null
cp ~/.aws/config ~/.aws/backups/config.$TIMESTAMP 2>/dev/null
echo "Backups created at ~/.aws/backups/"

# Clean up the mac-demo-dev profile in the credentials file
if grep -q "\[mac-demo-dev\]" ~/.aws/credentials 2>/dev/null; then
    echo "Removing mac-demo-dev from credentials file..."
    sed -i.bak '/\[mac-demo-dev\]/,/^\[/d' ~/.aws/credentials
    # Restore the last removed section header if it wasn't mac-demo-dev
    tail -1 ~/.aws/credentials.bak | grep "^\[" | grep -v "\[mac-demo-dev\]" >> ~/.aws/credentials
    rm ~/.aws/credentials.bak
fi

# Clean up the mac-demo-dev profile in the config file
if grep -q "\[profile mac-demo-dev\]" ~/.aws/config 2>/dev/null; then
    echo "Removing mac-demo-dev from config file..."
    sed -i.bak '/\[profile mac-demo-dev\]/,/^\[/d' ~/.aws/config
    # Restore the last removed section header if it wasn't mac-demo-dev
    tail -1 ~/.aws/config.bak | grep "^\[" | grep -v "\[profile mac-demo-dev\]" >> ~/.aws/config
    rm ~/.aws/config.bak
fi

# Clean any cached credentials
echo "Cleaning credential caches..."
rm -rf ~/.aws/cli/cache/* 2>/dev/null
rm -rf ~/.aws/sso/cache/* 2>/dev/null

# Unset any AWS environment variables that might interfere
echo "Temporarily unsetting AWS environment variables..."
AWS_PROFILE_OLD=$AWS_PROFILE
AWS_ACCESS_KEY_ID_OLD=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY_OLD=$AWS_SECRET_ACCESS_KEY
AWS_SESSION_TOKEN_OLD=$AWS_SESSION_TOKEN
unset AWS_PROFILE
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

echo ""
echo "Now reconfiguring mac-demo-dev profile..."
echo "Please enter your direct AWS access credentials (not Isengard):"
aws configure --profile mac-demo-dev

echo ""
echo "Testing the new configuration:"
aws sts get-caller-identity --profile mac-demo-dev

echo ""
echo "If the credentials test was successful, you should now be using your direct AWS credentials."
echo "If the output still shows Isengard (containing 'assumed-role'), some other credential"
echo "provider might be interfering. In that case, try creating a completely new profile:"
echo ""
echo "aws configure --profile mac-demo-direct"
echo ""
echo "And use that profile instead."
echo ""
echo "Reset complete!"
