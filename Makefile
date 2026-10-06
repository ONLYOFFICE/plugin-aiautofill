SHELL := /bin/bash

.DEFAULT_GOAL := all
.DELETE_ON_ERROR:
.SUFFIXES:

MAKEFLAGS += --no-builtin-rules --warn-undefined-variables

BUILD_DIR := build
SOURCE_DIRS := scripts components vendor translations resources styles
MINIFY_JS_DIRS := scripts components
TYPES_DIR := types
VENDOR_TYPES_DIR := $(TYPES_DIR)/vendor

TERSER ?= terser
HTML_MINIFIER ?= html-minifier-terser
TYPESCRIPT_VERSION ?= 6.0.3
TSC ?= npx --yes -p typescript@$(TYPESCRIPT_VERSION) tsc
CURL ?= curl -fsSL --retry 3

TERSER_FLAGS := --compress --mangle
HTML_MINIFIER_FLAGS := --collapse-whitespace --remove-comments --minify-css true --minify-js true

ONLYOFFICE_TYPES_REF := 3d00385c19b85e81ccd1a0e0a72c11f18535cbe4
ONLYOFFICE_TYPES_URL := https://raw.githubusercontent.com/ONLYOFFICE/doceditor-plugin-types/$(ONLYOFFICE_TYPES_REF)/artifacts/ambient/onlyoffice-doceditor-plugin-types.word.ambient.d.ts
NPM_CDN := https://cdn.jsdelivr.net/npm
JQUERY_TYPES := @types/jquery@3.5.34
SIZZLE_TYPES := @types/sizzle@2.3.10
SELECT2_TYPES := @types/select2@4.0.63

ONLYOFFICE_TYPE_FILE := $(TYPES_DIR)/onlyoffice.word.d.ts
JQUERY_TYPE_FILES := $(addprefix $(VENDOR_TYPES_DIR)/jquery/,index.d.ts JQuery.d.ts JQueryStatic.d.ts legacy.d.ts misc.d.ts)
SIZZLE_TYPE_FILE := $(VENDOR_TYPES_DIR)/sizzle/index.d.ts
SELECT2_TYPE_FILE := $(VENDOR_TYPES_DIR)/select2/index.d.ts
TYPE_FILES := $(ONLYOFFICE_TYPE_FILE) $(JQUERY_TYPE_FILES) $(SIZZLE_TYPE_FILE) $(SELECT2_TYPE_FILE)

require = @command -v $(firstword $(1)) >/dev/null 2>&1 || { echo "error: '$(firstword $(1))' not found. $(2)" >&2; exit 1; }

define download
@mkdir -p $(dir $(2))
@echo "Downloading $(2)"
@$(CURL) -o $(2).tmp $(1) && mv $(2).tmp $(2) || { rm -f $(2).tmp; exit 1; }
endef

minify = @find $(1) -name '$(2)' -type f -exec sh -c 'for f; do $(3) || exit 1; done' sh {} +

$(ONLYOFFICE_TYPE_FILE):
	$(call download,$(ONLYOFFICE_TYPES_URL),$@)

$(VENDOR_TYPES_DIR)/jquery/%.d.ts:
	$(call download,$(NPM_CDN)/$(JQUERY_TYPES)/$*.d.ts,$@)

$(SIZZLE_TYPE_FILE):
	$(call download,$(NPM_CDN)/$(SIZZLE_TYPES)/index.d.ts,$@)

$(SELECT2_TYPE_FILE):
	$(call download,$(NPM_CDN)/$(SELECT2_TYPES)/index.d.ts,$@)

.PHONY: all build clean check-tools install-tools types typecheck help

help: ## Show this help
	@awk 'BEGIN { FS = ":.*## " } /^[a-z-]+:.*## / { printf "  %-14s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

all: clean types typecheck build ## Build with all checks and cleanups

build: check-tools ## Build the minified plugin into build/
	@echo "Building the plugin..."
	@rm -rf $(BUILD_DIR)
	@mkdir -p $(BUILD_DIR)
	@cp -r $(SOURCE_DIRS) *.html config.json $(BUILD_DIR)/
	@echo "Minifying JavaScript files..."
	$(call minify,$(addprefix $(BUILD_DIR)/,$(MINIFY_JS_DIRS)),*.js,$(TERSER) "$$f" $(TERSER_FLAGS) --output "$$f")
	@echo "Minifying HTML files..."
	$(call minify,$(BUILD_DIR) -maxdepth 1,*.html,$(HTML_MINIFIER) $(HTML_MINIFIER_FLAGS) "$$f" -o "$$f")
	@echo "Build complete!"

clean: ## Remove build/ and the downloaded type definitions
	@rm -rf $(BUILD_DIR) $(ONLYOFFICE_TYPE_FILE) $(VENDOR_TYPES_DIR)

check-tools: ## Check that the build tools are installed
	$(call require,$(TERSER),Install with: make install-tools)
	$(call require,$(HTML_MINIFIER),Install with: make install-tools)

install-tools: ## Install the build tools globally with npm
	@npm install -g terser html-minifier-terser

types: ## Download the type definitions again
	@rm -f $(TYPE_FILES)
	@$(MAKE) --no-print-directory $(TYPE_FILES)

typecheck: $(TYPE_FILES) ## Type-check scripts/ and components/ (downloads the types on first run)
	$(call require,$(TSC),Install Node.js from https://nodejs.org)
	@$(TSC) -p jsconfig.json