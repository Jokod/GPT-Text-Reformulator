#!/bin/bash

current_version=$1
current_version_name=$2

echo "Current version: $current_version ($current_version_name)"
echo "Select version type:"
echo "  1) Patch (x.x.X)"
echo "  2) Minor (x.X.0)"
echo "  3) Major (X.0.0)"
echo "  4) Custom"

read -p "Choice [1-4]: " choice

case $choice in
    1) new_version=$(echo "$current_version" | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g');;
    2) new_version=$(echo "$current_version" | awk -F. '{$2 = $2 + 1; $3 = 0;} 1' | sed 's/ /./g');;
    3) new_version=$(echo "$current_version" | awk -F. '{$1 = $1 + 1; $2 = 0; $3 = 0;} 1' | sed 's/ /./g');;
    4) read -p "Enter new version: " new_version;;
    *) echo "Invalid choice"; exit 1;;
esac

if [[ "$current_version_name" == *"-dev"* ]]; then
    ./scripts/version.sh bump "$new_version" "$new_version-dev"
else
    ./scripts/version.sh bump "$new_version" "$new_version"
fi 