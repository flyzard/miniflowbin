/**
 * CSV Validation Utilities
 * Shared validation logic for CSV imports
 */

import { parseCsv, validateCsvHeaders, type CsvParseResult } from './csvParserService';
import type { ValidationError, ValidationResult } from '../types';

/**
 * Configuration for CSV validation
 */
export interface CsvValidationConfig<TRow, TParsed> {
  /** Required CSV headers */
  requiredHeaders: readonly string[];
  /** All known/valid headers */
  knownHeaders: readonly string[];
  /** Field used as primary key for duplicate detection */
  primaryKeyField: keyof TRow;
  /** Transform raw CSV row to parsed entity */
  transformRow: (row: TRow) => TParsed;
  /** Validate a single row, returns array of errors */
  validateRow: (row: TRow, rowIndex: number) => ValidationError[];
  /** Optional: Transform key before duplicate comparison (e.g., toUpperCase for SKU) */
  duplicateKeyTransform?: (key: string) => string;
  /** Optional: Custom warnings to add based on headers */
  customHeaderWarnings?: (headers: string[]) => string[];
}

/**
 * Generic CSV content validation function
 * Extracts common validation logic from layoutImportService and productImportService
 */
export function validateCsvContent<TRow, TParsed>(
  csvContent: string,
  config: CsvValidationConfig<TRow, TParsed>
): ValidationResult<TParsed> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // 1. Empty content check
  if (!csvContent.trim()) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'File is empty'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // 2. Parse CSV
  const parseResult: CsvParseResult<TRow> = parseCsv<TRow>(csvContent);

  // 3. Filter out the "Unable to auto-detect delimiting character" warning for single-column CSVs
  const actualErrors = parseResult.errors.filter(
    err => !err.message.includes('Unable to auto-detect delimiting character')
  );

  // 4. Check parse errors
  if (actualErrors.length > 0) {
    for (const err of actualErrors) {
      errors.push({
        row: err.row ?? 0,
        field: 'csv',
        message: err.message
      });
    }
    return { valid: false, errors, warnings, parsed: [] };
  }

  // 5. Empty data check
  if (parseResult.data.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'No data rows found (only headers)'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // 6. Header validation
  const headerValidation = validateCsvHeaders(parseResult.headers, config.requiredHeaders);
  if (!headerValidation.valid) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Missing required headers: ${headerValidation.missing.join(', ')}`
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // 7. Unknown headers warning
  const unknownHeaders = parseResult.headers.filter(
    h => !config.knownHeaders.includes(h.toLowerCase() as (typeof config.knownHeaders)[number])
  );
  if (unknownHeaders.length > 0) {
    warnings.push(`Unknown columns will be ignored: ${unknownHeaders.join(', ')}`);
  }

  // 8. Custom header warnings (e.g., for layout: capacity_units, max_weight_kg)
  if (config.customHeaderWarnings) {
    warnings.push(...config.customHeaderWarnings(parseResult.headers));
  }

  // 9. Row validation and duplicate detection
  const seenKeys = new Map<string, number>();
  const parsed: TParsed[] = [];
  const keyField = String(config.primaryKeyField);

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    if (!row) continue;

    const rowNumber = i + 2; // +2 for 1-indexed + header row

    // Validate row
    const rowErrors = config.validateRow(row, rowNumber);
    errors.push(...rowErrors);

    // Duplicate key detection
    const keyValue = (row as Record<string, unknown>)[keyField];
    if (typeof keyValue === 'string' && keyValue.trim()) {
      const normalizedKey = config.duplicateKeyTransform
        ? config.duplicateKeyTransform(keyValue.trim())
        : keyValue.trim();

      const firstRow = seenKeys.get(normalizedKey);
      if (firstRow !== undefined) {
        errors.push({
          row: rowNumber,
          field: keyField,
          message: `Duplicate ${keyField} "${keyValue}" (first seen on row ${firstRow})`,
          value: keyValue
        });
      } else {
        seenKeys.set(normalizedKey, rowNumber);
      }
    }

    // Only add to parsed if no errors for this row
    if (rowErrors.length === 0) {
      parsed.push(config.transformRow(row));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed
  };
}
