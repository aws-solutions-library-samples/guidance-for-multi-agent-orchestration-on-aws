#!/bin/bash

# Script to fix AWS config file parsing issues

echo "===== AWS Config File Fix Tool ====="
echo "This script will examine and repair your AWS config file"
echo ""

CONFIG_FILE=~/.aws/config
BACKUP_DIR=~/.aws/backups
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "No AWS config file found at $CONFIG_FILE"
    echo "Creating a minimal default config file..."
    mkdir -p ~/.aws
    echo "# AWS CLI config file" > "$CONFIG_FILE"
    echo "Config file created successfully."
    exit 0
fi

# Create a backup of the current file
echo "Creating backup of current AWS config file..."
cp "$CONFIG_FILE" "$BACKUP_DIR/config.$TIMESTAMP"
echo "Backup saved to $BACKUP_DIR/config.$TIMESTAMP"

echo "Examining AWS config file for common syntax issues..."

# Common issues:
# 1. Unclosed profile sections
# 2. Missing brackets
# 3. Indentation issues
# 4. Trailing characters

# Check for incomplete profile sections (missing closing brackets)
if grep -q "\[profile" "$CONFIG_FILE"; then
    PROFILES=$(grep -n "\[profile" "$CONFIG_FILE" | cut -d ':' -f1)
    PROFILE_COUNT=$(echo "$PROFILES" | wc -l | tr -d ' ')
    echo "Found $PROFILE_COUNT profile section(s) in config file."
    
    # Create a fixed version of the file with proper section closures
    echo "# AWS CLI config file - Fixed version" > "$CONFIG_FILE.fixed"
    
    PREV_LINE=0
    for LINE in $PROFILES; do
        if [ "$PREV_LINE" -gt 0 ]; then
            sed -n "${PREV_LINE},${LINE}p" "$CONFIG_FILE" | grep -v "^\[profile" >> "$CONFIG_FILE.fixed"
            echo "" >> "$CONFIG_FILE.fixed"
        fi
        PREV_LINE="$LINE"
        PROFILE_NAME=$(sed -n "${LINE}p" "$CONFIG_FILE" | sed 's/\[profile \(.*\)\]/\1/')
        echo "[profile $PROFILE_NAME]" >> "$CONFIG_FILE.fixed"
    done
    
    # Add the final section
    if [ "$PREV_LINE" -gt 0 ]; then
        sed -n "${PREV_LINE},\$p" "$CONFIG_FILE" | grep -v "^\[profile" >> "$CONFIG_FILE.fixed"
    fi
else
    # No profiles found, just fix general syntax issues
    echo "No profile sections found in config file."
    cp "$CONFIG_FILE" "$CONFIG_FILE.fixed"
fi

# Fix common syntax errors
sed -i.bak -e 's/=[[:space:]]\+/=/g' \
           -e 's/[[:space:]]\+=/=/g' \
           -e '/^[[:space:]]*$/d' \
           -e 's/[[:space:]]*$//' "$CONFIG_FILE.fixed"
rm -f "$CONFIG_FILE.fixed.bak"

# Apply the fixed file
echo "Applying fixes to AWS config file..."
mv "$CONFIG_FILE.fixed" "$CONFIG_FILE"
chmod 600 "$CONFIG_FILE"

echo ""
echo "AWS config file has been repaired."
echo "You may want to verify the content with: cat ~/.aws/config"
echo ""
echo "If you experience further issues, you can restore your backup with:"
echo "cp $BACKUP_DIR/config.$TIMESTAMP ~/.aws/config"

echo ""
echo "Let's create a fresh mac-demo-dev profile to avoid further issues..."
aws configure --profile mac-demo-dev

echo ""
echo "AWS config file repair complete! Try running your AWS commands again."
