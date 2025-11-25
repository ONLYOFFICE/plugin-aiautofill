# AI Auto Fill Plugin for ONLYOFFICE

An ONLYOFFICE plugin that automatically fills document form fields using AI-powered field mapping and third-party data integration.

## Features

- **AI Powered Field Mapping**: Automatically matches form fields with data keys using ONLYOFFICE AI
- **Third-Party Integration**: Connects to external backend services to retrieve data from
- **Code Rotation Security**: Implements secure code rotation mechanism for API calls
- **Flexible Data Handling**: Supports flat, nested, and array data structures
- **User Confirmation**: Review and modify field mappings before applying

## Requirements

- ONLYOFFICE Document Server 9.2.0 or higher
- AI features enabled in ONLYOFFICE
- Backend service implementing the callback API (see [Third-Party Integration Guide](docs/third-party-integration.md))

## Installation

### For End Users

1. Configure the plugin in your ONLYOFFICE Document Server configuration:

```javascript
const config = {
  editorConfig: {
    plugins: {
      autostart: ['asc.{0616AE85-5DBE-4B6B-A0A9-455C4F1503AD}'],
      options: {
        'asc.{0616AE85-5DBE-4B6B-A0A9-455C4F1503AD}': {
          code: 'your_initial_security_code',
          callback: 'https://your-backend.com/<path_to_data_endpoint>'
        }
      },
      pluginsData: [
        'https://your-backend.com/<path_to_plugin>/config.json'
      ],
      url: 'https://your-backend.com/<path_to_plugin>'
    }
  }
};
```

2. Open a document with form fields in ONLYOFFICE
3. Click the AI Auto Fill plugin icon in the left panel
4. Click "Autofill" to automatically populate form fields

### For Developers

1. Clone this repository
2. Install build tools:
```bash
make install-tools
```

3. Build the plugin:
```bash
make build
```

The built plugin will be in the `build/` directory.

## Usage

### Basic Workflow

1. **Open a Document**: Open a PDF file with form fields in ONLYOFFICE
2. **Launch Plugin**: Click the AI Auto Fill icon in the plugins panel
3. **Start Autofill**: Click the "Autofill" button to begin the process
4. **AI Processing**: The plugin:
   - Detects all form fields in the document
   - Fetches data from your configured backend
   - Uses AI to intelligently map fields to data keys
5. **Review & Confirm**: Review the suggested field mappings and values
6. **Apply**: Click "Apply" to populate the form fields

### Field Mapping Interface

The plugin presents an interactive interface where you can:
- **Select/Deselect Fields**: Choose which fields to fill using checkboxes
- **Modify Values**: Edit or select different values for each field
- **Review Suggestions**: See AI-suggested mappings between form fields and data

## Configuration

See the [Third-Party Integration Guide](docs/third-party-integration.md) for complete API documentation.

## Supported Data Structures

### Flat Data
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

### Nested Data
```json
{
  "user": {
    "name": {
      "first": "John",
      "last": "Doe"
    }
  }
}
```
Extracted as: `user.name.first`, `user.name.last`

### Array Data
```json
{
  "employees": [
    {"name": "John", "role": "Manager"},
    {"name": "Jane", "role": "Developer"}
  ]
}
```
Extracted as: `employees.name`, `employees.role`
