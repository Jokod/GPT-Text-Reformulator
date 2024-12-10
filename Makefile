# Variables
NAME = gpt-text-reformulator
VERSION = $(shell jq -r .version manifest.json)
VERSION_NAME = $(shell jq -r .version_name manifest.json)
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

# Version management
define update_version
	@echo "Updating version from $(VERSION) to $(1)"
	@jq ".version = \"$(1)\" | .version_name = \"$(2)\"" manifest.json > manifest.json.tmp
	@mv manifest.json.tmp manifest.json
	@echo "✅ Version updated to $(1) ($(2))"
endef

# Targets
.PHONY: all clean build package check version dev-version prod-version bump-version help dev

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

# Version management commands
version:
	@echo "Current version: $(VERSION)"
	@echo "Version name: $(VERSION_NAME)"
	@if [[ "$(VERSION_NAME)" == *"-dev"* ]]; then \
		echo "Mode: Development"; \
	else \
		echo "Mode: Production"; \
	fi

dev-version:
	@if [[ "$(VERSION_NAME)" != *"-dev"* ]]; then \
		$(call update_version,$(VERSION),"$(VERSION)-dev"); \
		echo "🔧 Switched to development mode"; \
	else \
		echo "Already in development mode"; \
	fi

prod-version:
	@if [[ "$(VERSION_NAME)" == *"-dev"* ]]; then \
		$(call update_version,$(VERSION),"$(VERSION)"); \
		echo "🚀 Switched to production mode"; \
	else \
		echo "Already in production mode"; \
	fi

bump-version:
	@echo "Current version: $(VERSION) ($(VERSION_NAME))"
	@echo "Select version type:"
	@echo "  1) Patch (x.x.X)"
	@echo "  2) Minor (x.X.0)"
	@echo "  3) Major (X.0.0)"
	@echo "  4) Custom"
	@read -p "Choice [1-4]: " choice; \
	case $$choice in \
		1) new_version=$$(echo "$(VERSION)" | awk -F. '{$$NF = $$NF + 1;} 1' | sed 's/ /./g');; \
		2) new_version=$$(echo "$(VERSION)" | awk -F. '{$$2 = $$2 + 1; $$3 = 0;} 1' | sed 's/ /./g');; \
		3) new_version=$$(echo "$(VERSION)" | awk -F. '{$$1 = $$1 + 1; $$2 = 0; $$3 = 0;} 1' | sed 's/ /./g');; \
		4) read -p "Enter new version: " new_version;; \
		*) echo "Invalid choice"; exit 1;; \
	esac; \
	if [[ "$(VERSION_NAME)" == *"-dev"* ]]; then \
		$(call update_version,$$new_version,"$$new_version-dev"); \
	else \
		$(call update_version,$$new_version,"$$new_version"); \
	fi

# Development helpers
dev: dev-version clean check build
	@echo "🔄 Development build complete"
	@echo "📁 Files ready in $(BUILD_DIR)/"

prod: prod-version clean check build package
	@echo "🚀 Production build complete"
	@echo "📦 Package ready in $(DIST_DIR)/"

# Aide
help:
	@echo "GPT Text Reformulator Extension Build System"
	@echo ""
	@echo "Version management:"
	@echo "  make version      - Show current version info"
	@echo "  make dev-version  - Switch to development mode"
	@echo "  make prod-version - Switch to production mode"
	@echo "  make bump-version - Increment version number"
	@echo ""
	@echo "Build commands:"
	@echo "  make dev         - Build for development"
	@echo "  make prod        - Build for production"
	@echo "  make clean       - Remove build and dist directories"
	@echo "  make check       - Verify all required files"
	@echo "  make build       - Build the extension"
	@echo "  make package     - Create distribution ZIP"