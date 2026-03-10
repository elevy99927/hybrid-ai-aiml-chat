#!/bin/bash

# Package and release Helm chart to GitHub
# Usage: ./scripts/release-helm-chart.sh [version]
# Example: ./scripts/release-helm-chart.sh 1.0.0

set -e

# Get version from Chart.yaml if not provided
if [ -z "$1" ]; then
    VERSION=$(grep '^version:' helm/hybrid-chatbot/Chart.yaml | awk '{print $2}')
    echo "No version provided, using version from Chart.yaml: ${VERSION}"
else
    VERSION="$1"
    # Remove 'v' prefix if provided
    VERSION="${VERSION#v}"
    echo "Using provided version: ${VERSION}"
fi

CHART_NAME="hybrid-chatbot"
CHART_PATH="helm/${CHART_NAME}"
TAG_NAME="helm-chart-v${VERSION}"

echo "=========================================="
echo "Releasing Helm Chart"
echo "Chart: ${CHART_NAME}"
echo "Version: ${VERSION}"
echo "Tag: ${TAG_NAME}"
echo "=========================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Lint the chart
echo ""
echo "Step 1: Linting Helm chart..."
helm lint "${CHART_PATH}"
echo "✅ Chart linted successfully"

# Step 2: Package the chart
echo ""
echo "Step 2: Packaging Helm chart..."
mkdir -p .helm-packages
helm package "${CHART_PATH}" -d .helm-packages
PACKAGE_FILE="${CHART_NAME}-${VERSION}.tgz"

if [ ! -f ".helm-packages/${PACKAGE_FILE}" ]; then
    echo "❌ Error: Package file not created: .helm-packages/${PACKAGE_FILE}"
    exit 1
fi
echo "✅ Chart packaged: .helm-packages/${PACKAGE_FILE}"

# Step 3: Update Chart.yaml version if provided
if [ -n "$1" ]; then
    echo ""
    echo "Step 3: Updating Chart.yaml version to ${VERSION}..."
    sed -i.bak "s/^version:.*/version: ${VERSION}/" "${CHART_PATH}/Chart.yaml"
    rm -f "${CHART_PATH}/Chart.yaml.bak"
    git add "${CHART_PATH}/Chart.yaml"
    echo "✅ Chart.yaml updated"
fi

# Step 4: Commit changes
echo ""
echo "Step 4: Committing changes..."
git add "${CHART_PATH}/"
if git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
else
    git commit -m "Release Helm chart v${VERSION}"
    echo "✅ Changes committed"
fi

# Step 5: Create git tag
echo ""
echo "Step 5: Creating git tag..."
if git rev-parse "${TAG_NAME}" >/dev/null 2>&1; then
    echo "⚠️  Tag ${TAG_NAME} already exists"
    read -p "Do you want to delete and recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d "${TAG_NAME}"
        git push origin ":refs/tags/${TAG_NAME}" 2>/dev/null || true
        echo "✅ Old tag deleted"
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

git tag -a "${TAG_NAME}" -m "Helm Chart v${VERSION}

Release Notes:
- Chart version: ${VERSION}
- App version: $(grep '^appVersion:' ${CHART_PATH}/Chart.yaml | awk '{print $2}' | tr -d '\"')

Installation:
helm install my-chatbot https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/download/${TAG_NAME}/${PACKAGE_FILE}
"
echo "✅ Tag created: ${TAG_NAME}"

# Step 6: Push to GitHub
echo ""
echo "Step 6: Pushing to GitHub..."
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git push origin "${CURRENT_BRANCH}"
git push origin "${TAG_NAME}"
echo "✅ Pushed to GitHub"

# Step 7: Clean up package file
echo ""
echo "Step 7: Cleaning up..."
rm -f "${PACKAGE_FILE}"
echo "✅ Package file removed (will be created by GitHub Actions)"

echo ""
echo "=========================================="
echo "✅ Helm chart release completed!"
echo "=========================================="
echo ""
echo "GitHub Actions will now:"
echo "  1. Package the chart"
echo "  2. Create a GitHub release"
echo "  3. Upload ${PACKAGE_FILE}"
echo "  4. Publish to GitHub Pages"
echo ""
echo "Release will be available at:"
echo "  https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/${TAG_NAME}"
echo ""
echo "Users can install with:"
echo "  helm install my-chatbot https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/download/${TAG_NAME}/${PACKAGE_FILE}"
echo ""
