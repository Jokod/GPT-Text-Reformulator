#!/bin/bash

update_version() {
    local new_version=$1
    local new_version_name=$2
    jq ".version = \"$new_version\" | .version_name = \"$new_version_name\"" manifest.json > manifest.json.tmp
    mv manifest.json.tmp manifest.json
    echo "✅ Version updated to $new_version ($new_version_name)"
}

case "$1" in
    "dev")
        if [[ -z "$(echo $2 | grep -o dev)" ]]; then
            update_version "$3" "$3-dev"
        else
            echo "Already in development mode"
        fi
        ;;
    "prod")
        if [[ -n "$2" && "$(echo $2 | grep -o dev)" == "dev" ]]; then
            update_version "$3" "$3"
            echo "🚀 Switched to production mode"
        else
            echo "Already in production mode"
        fi
        ;;
    "bump")
        update_version "$2" "$3"
        ;;
esac 