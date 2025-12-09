SRC_DIR = .
BUILD_DIR = build
SCRIPTS_DIR = $(SRC_DIR)/scripts
COMPONENTS_DIR = $(SRC_DIR)/components
VENDOR_DIR = $(SRC_DIR)/vendor
TRANSLATIONS_DIR = $(SRC_DIR)/translations
RESOURCES_DIR = $(SRC_DIR)/resources
STYLES_DIR = $(SRC_DIR)/styles

TERSER = terser
HTML_MINIFIER = html-minifier-terser

TERSER_AVAILABLE := $(shell command -v $(TERSER) 2> /dev/null)
HTML_MINIFIER_AVAILABLE := $(shell command -v $(HTML_MINIFIER) 2> /dev/null)

JS_SCRIPTS = $(wildcard $(SCRIPTS_DIR)/*.js) $(wildcard $(SCRIPTS_DIR)/utils/*.js)
JS_COMPONENTS = $(wildcard $(COMPONENTS_DIR)/*/script.js)
JS_ALL = $(JS_SCRIPTS) $(JS_COMPONENTS)

HTML_FILES = index.html form.html confirm.html revert.html rconfirm.html

.PHONY: all build clean check-tools install-tools

all: build

install-tools:
	@echo "Installing required build tools..."
	@npm install -g terser
	@npm install -g html-minifier-terser
	@echo "Installation complete!"

clean:
	@echo "Cleaning build directory..."
	@rm -rf $(BUILD_DIR)

check-tools:
	@echo "Checking for required build tools..."
ifndef TERSER_AVAILABLE
	@echo "Terser not found. Install with: npm install -g terser"
	@exit 1
else
	@echo "Terser found at $(TERSER_AVAILABLE)"
endif
ifndef HTML_MINIFIER_AVAILABLE
	@echo "Html-minifier-terser not found. Install with: npm install -g html-minifier-terser"
	@exit 1
else
	@echo "Html-minifier-terser found at $(HTML_MINIFIER_AVAILABLE)"
endif
	@echo "All required tools are installed!"

build: clean check-tools
	@echo "Building the plugin..."
	
	@mkdir -p $(BUILD_DIR)
	@cp -r $(SCRIPTS_DIR) $(COMPONENTS_DIR) $(VENDOR_DIR) $(TRANSLATIONS_DIR) $(RESOURCES_DIR) $(STYLES_DIR) $(BUILD_DIR)/
	@cp *.html config.json $(BUILD_DIR)/
	
	@echo "Minifying JavaScript files..."
	@find $(BUILD_DIR)/$(SCRIPTS_DIR) $(BUILD_DIR)/$(COMPONENTS_DIR) -name "*.js" -type f -exec $(TERSER) {} --compress --mangle --output {} \;
	
	@echo "Minifying HTML files..."
	@find $(BUILD_DIR) -maxdepth 1 -name "*.html" -type f -exec $(HTML_MINIFIER) --collapse-whitespace --remove-comments --minify-css true --minify-js true {} -o {} \;
	
	@echo "Build complete!"