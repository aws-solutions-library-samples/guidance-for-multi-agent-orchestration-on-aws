#!/bin/bash

# Make a backup of the original file
cp src/frontend/src/utilities/traceParser.ts src/frontend/src/utilities/traceParser.ts.bak

# Use sed to modify all instances of dropdownTitle update
sed -i -e 's/traceGroup\.dropdownTitle = `.*`;/\/* dropdownTitle intentionally not updated *\//g' src/frontend/src/utilities/traceParser.ts

# Show the changes
grep -n "dropdownTitle intentionally" src/frontend/src/utilities/traceParser.ts
