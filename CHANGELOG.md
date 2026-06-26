# Change Log

##
### Added
- Dedicated handlers for text, boolean, radio, and complex form field types.
- Field constraint validation for character limits and related rules.

### Changed
- Refined AI mapping prompt with a confidence threshold and clearer matching rules.
- Excluded signature form fields from autofill processing.

### Fixed
- Form cleanup warning issues.

## 1.0.1
- Added signature validation to forms
- Removed image support from form filling
- Optimized prompt templates used for data mapping
- Excluded generic fields from processing results

## 1.0.0
- AI-powered form field mapping based on field keys and data keys
- Third-party backend integration via callback endpoint
- Code rotation security mechanism for API calls
- Review/apply flow with the ability to edit values and skip fields before filling
- Support for flat, nested, and array data structures
