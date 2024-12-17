# Variables
NAME = gpt-text-reformulator
VERSION = $(shell jq -r .version manifest.json)
VERSION_NAME = $(shell jq -r .version_name manifest.json)
BUILD_DIR = build
DIST_DIR = dist
ZIP_NAME = $(NAME)-v$(VERSION).zip
TERSER = npx terser
OBFUSCATOR = npx javascript-obfuscator
TERSER_OPTIONS = \
	--compress passes=2,pure_funcs=['console.log'] \
	--mangle toplevel,reserved=['browser','chrome'] \
	--format quote_style=1 \
	--ecma 2020

# Créer un fichier de configuration pour javascript-obfuscator
define OBFUSCATOR_CONFIG
{
	"compact": true,
	"controlFlowFlattening": true,
	"controlFlowFlatteningThreshold": 0.5,
	"deadCodeInjection": true,
	"deadCodeInjectionThreshold": 0.2,
	"identifierNamesGenerator": "hexadecimal",
	"renameGlobals": true,
	"rotateStringArray": true,
	"selfDefending": true,
	"shuffleStringArray": true,
	"simplify": true,
	"splitStrings": true,
	"splitStringsChunkLength": 5,
	"stringArray": true,
	"stringArrayEncoding": ["base64"],
	"stringArrayThreshold": 0.8,
	"stringArrayWrappersCount": 2,
	"target": "browser"
}
endef

export OBFUSCATOR_CONFIG

JS_FILES = $(shell find . -name "*.js" -not -path "./node_modules/*" -not -path "./$(BUILD_DIR)/*" -not -path "./$(DIST_DIR)/*")

# Fichiers et répertoires requis
REQUIRED_BASE_FILES = \
	manifest.json \
	LICENSE \
	README.md

# Dossiers source à compiler
SRC_DIRS = \
	src/assets \
	src/background \
	src/content \
	src/core \
	src/services \
	src/ui \
	src/utils \
	_locales

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
	@echo "🔍 Checking required base files..."
	@for file in $(REQUIRED_BASE_FILES); do \
		if [ ! -f $$file ]; then \
			echo "❌ Missing required file: $$file"; \
			exit 1; \
		fi \
	done
	@echo "🔍 Checking source directories..."
	@for dir in $(SRC_DIRS); do \
		if [ ! -d $$dir ]; then \
			echo "❌ Missing required directory: $$dir"; \
			exit 1; \
		fi \
	done
	@echo "✅ All required files and directories present"
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
	
	@echo "📁 Copying base files..."
	@for file in $(REQUIRED_BASE_FILES); do \
		cp $$file $(BUILD_DIR)/$$file; \
	done
	
	@echo "📁 Processing source files..."
	@for dir in $(SRC_DIRS); do \
		mkdir -p $(BUILD_DIR)/$$dir; \
		find $$dir -type f | while read file; do \
			mkdir -p $(BUILD_DIR)/$$(dirname $$file); \
			if [ "$(VERSION_NAME)" != *"dev"* ] && [ "$${file%.js}" != "$$file" ]; then \
				echo "Processing $$file..."; \
				echo "$$OBFUSCATOR_CONFIG" > obfuscator.json; \
				TEMP_DIR="$$(dirname $(BUILD_DIR)/$$file)"; \
				mkdir -p $$TEMP_DIR; \
				TEMP_FILE="$$TEMP_DIR/temp_$$(basename $$file)"; \
				$(TERSER) $$file $(TERSER_OPTIONS) --output $$TEMP_FILE && \
				$(OBFUSCATOR) $$TEMP_FILE --config obfuscator.json --output $(BUILD_DIR)/$$file && \
				rm $$TEMP_FILE obfuscator.json; \
			else \
				cp $$file $(BUILD_DIR)/$$file; \
			fi \
		done \
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
	@if [ -n "$(VERSION_NAME)" ] && [ "$$(echo $(VERSION_NAME) | grep -o 'dev')" = "dev" ]; then \
		echo "Mode: Development"; \
	else \
		echo "Mode: Production"; \
	fi

dev-version:
	@chmod +x scripts/version.sh
	@./scripts/version.sh dev "$(VERSION_NAME)" "$(VERSION)"

prod-version:
	@chmod +x scripts/version.sh
	@./scripts/version.sh prod "$(VERSION_NAME)" "$(VERSION)"

bump-version:
	@chmod +x scripts/bump.sh
	@./scripts/bump.sh "$(VERSION)" "$(VERSION_NAME)"

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