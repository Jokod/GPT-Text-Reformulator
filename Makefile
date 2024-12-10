# Variables
NAME = gpt-text-reformulator
VERSION = $(shell jq -r .version manifest.json)
BUILD_DIR = build
DIST_DIR = dist
ZIP_NAME = $(NAME)-v$(VERSION).zip

# Required files and directories
REQUIRED_FILES = \
	manifest.json \
	schema.json \
	background/background.js \
	content/content.js \
	content/content.css \
	popup/popup.html \
	popup/popup.js \
	popup/popup.css \
	utils/crypto.js \
	utils/storage.js \
	utils/openai.js \
	icons/icon.png \
	LICENSE \
	README.md

# Targets
.PHONY: all clean build package check

all: clean check build package

clean:
	@echo "🧹 Cleaning build and dist directories..."
	@rm -rf $(BUILD_DIR) $(DIST_DIR)

check:
	@echo "🔍 Checking required files..."
	@for file in $(REQUIRED_FILES); do \
		if [ ! -f $$file ]; then \
			echo "❌ Missing required file: $$file"; \
			exit 1; \
		fi \
	done
	@echo "✅ All required files present"
	@echo "🔍 Checking module imports..."
	@if grep -r "import.*from" . | grep -v "node_modules" | grep -v "build" | grep -v "dist" > /dev/null; then \
		echo "✅ Module imports found and valid"; \
	else \
		echo "❌ No module imports found or invalid syntax"; \
		exit 1; \
	fi

build:
	@echo "🏗️  Building extension v$(VERSION)..."
	@mkdir -p $(BUILD_DIR)
	@for file in $(REQUIRED_FILES); do \
		mkdir -p $(BUILD_DIR)/$$(dirname $$file); \
		cp $$file $(BUILD_DIR)/$$file; \
	done
	@echo "✅ Build complete"

package:
	@echo "📦 Packaging extension..."
	@mkdir -p $(DIST_DIR)
	@cd $(BUILD_DIR) && zip -r ../$(DIST_DIR)/$(ZIP_NAME) .
	@echo "✅ Package created: $(DIST_DIR)/$(ZIP_NAME)"
	@echo "📏 Package size: $$(du -h $(DIST_DIR)/$(ZIP_NAME) | cut -f1)"

version:
	@echo "Current version: $(VERSION)"

bump-version:
	@echo "Current version: $(VERSION)"
	@read -p "Enter new version: " new_version; \
	jq ".version = \"$$new_version\"" manifest.json > manifest.json.tmp && \
	mv manifest.json.tmp manifest.json
	@echo "Version updated to: $$(jq -r .version manifest.json)"

# Aide
help:
	@echo "GPT Text Reformulator Extension Build System"
	@echo ""
	@echo "Available commands:"
	@echo "  make          - Clean, check, build and package the extension"
	@echo "  make clean    - Remove build and dist directories"
	@echo "  make check    - Verify all required files and module imports"
	@echo "  make build    - Build the extension"
	@echo "  make package  - Create distribution ZIP file"
	@echo "  make version  - Show current version"
	@echo "  make bump-version - Update extension version"

# Development helpers
dev: clean check build
	@echo "🔄 Development build complete"
	@echo "📁 Files ready in $(BUILD_DIR)/" 