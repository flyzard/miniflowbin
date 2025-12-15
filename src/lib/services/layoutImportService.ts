/**
 * Layout Import Service
 * Handles validation, preview, and execution of CSV layout imports
 */

import { transaction } from '../db/database';
import { parseLayoutCsv, validateHeaders } from './csvParserService';
import {
  listAllPositions,
  createPositionBulk,
  updatePositionBulk,
  deletePosition,
  markPositionInactive,
  positionHasInventory
} from '../repositories/positionRepo';
import type {
  CsvPositionRow,
  ImportPosition,
  ImportPreviewItem,
  ImportPreviewSummary,
  ImportValidationResult,
  CsvValidationError,
  OrphanStrategy,
  ImportResult,
  ImportAction
} from '../types';
import { STATUS_MAP, KNOWN_HEADERS, REQUIRED_HEADERS } from '../types';

/**
 * Transform CSV row to ImportPosition
 */
function transformRow(row: CsvPositionRow): ImportPosition {
  const status = row.status?.toLowerCase() ?? 'available';
  return {
    code: row.slot_code,
    zone: row.zone,
    aisle: row.aisle,
    rack: row.column, // column -> rack mapping
    level: row.level,
    description: row.notes?.trim() || null,
    is_active: STATUS_MAP[status] ?? true
  };
}

/**
 * Validate a single CSV row
 */
function validateRow(row: CsvPositionRow, rowIndex: number): CsvValidationError[] {
  const errors: CsvValidationError[] = [];

  // Required field validation
  if (!row.zone?.trim()) {
    errors.push({ row: rowIndex, field: 'zone', message: 'Zone is required' });
  }
  if (!row.slot_code?.trim()) {
    errors.push({ row: rowIndex, field: 'slot_code', message: 'Slot code is required' });
  }
  if (!row.aisle?.trim()) {
    errors.push({ row: rowIndex, field: 'aisle', message: 'Aisle is required' });
  }
  if (!row.column?.trim()) {
    errors.push({ row: rowIndex, field: 'column', message: 'Column is required' });
  }
  if (!row.level?.trim()) {
    errors.push({ row: rowIndex, field: 'level', message: 'Level is required' });
  }

  // Zone prefix validation (slot_code should start with zone)
  if (row.zone?.trim() && row.slot_code?.trim()) {
    const zonePrefix = row.zone.trim();
    const slotCode = row.slot_code.trim();
    if (!slotCode.startsWith(zonePrefix)) {
      errors.push({
        row: rowIndex,
        field: 'slot_code',
        message: `Slot code "${slotCode}" should start with zone "${zonePrefix}"`,
        value: slotCode
      });
    }
  }

  // Status validation (warn for unknown values)
  if (row.status?.trim()) {
    const status = row.status.toLowerCase().trim();
    if (!Object.keys(STATUS_MAP).includes(status)) {
      // This is a warning, not an error - will default to active
      // We'll handle this separately
    }
  }

  return errors;
}

/**
 * Validate entire CSV content
 */
export function validateCsv(csvContent: string): ImportValidationResult {
  const errors: CsvValidationError[] = [];
  const warnings: string[] = [];

  // Check for empty content
  if (!csvContent.trim()) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'File is empty'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // Parse CSV
  const parseResult = parseLayoutCsv(csvContent);

  // Check for parse errors
  if (parseResult.errors.length > 0) {
    for (const err of parseResult.errors) {
      errors.push({
        row: err.row ?? 0,
        field: 'csv',
        message: err.message
      });
    }
    return { valid: false, errors, warnings, parsed: [] };
  }

  // Check for empty data
  if (parseResult.data.length === 0) {
    errors.push({
      row: 0,
      field: 'file',
      message: 'No data rows found (only headers)'
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // Validate headers
  const headerValidation = validateHeaders(parseResult.headers);
  if (!headerValidation.valid) {
    errors.push({
      row: 1,
      field: 'headers',
      message: `Missing required headers: ${headerValidation.missing.join(', ')}`
    });
    return { valid: false, errors, warnings, parsed: [] };
  }

  // Check for unknown headers
  const unknownHeaders = parseResult.headers.filter(
    h => !KNOWN_HEADERS.includes(h.toLowerCase() as typeof KNOWN_HEADERS[number])
  );
  if (unknownHeaders.length > 0) {
    warnings.push(`Unknown columns will be ignored: ${unknownHeaders.join(', ')}`);
  }

  // Warn about ignored capacity/weight fields
  const hasCapacity = parseResult.headers.some(h => h.toLowerCase() === 'capacity_units');
  const hasWeight = parseResult.headers.some(h => h.toLowerCase() === 'max_weight_kg');
  if (hasCapacity || hasWeight) {
    const ignored = [hasCapacity && 'capacity_units', hasWeight && 'max_weight_kg'].filter(Boolean);
    warnings.push(`${ignored.join(' and ')} field(s) will be ignored (not supported)`);
  }

  // Validate each row
  const seenCodes = new Map<string, number>(); // code -> first row number
  const parsed: ImportPosition[] = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    if (!row) continue;

    const rowNumber = i + 2; // +2 for 1-indexed + header row
    const rowErrors = validateRow(row, rowNumber);
    errors.push(...rowErrors);

    // Check for duplicates within file
    if (row.slot_code?.trim()) {
      const code = row.slot_code.trim();
      const firstRow = seenCodes.get(code);
      if (firstRow !== undefined) {
        errors.push({
          row: rowNumber,
          field: 'slot_code',
          message: `Duplicate slot code "${code}" (first seen on row ${firstRow})`,
          value: code
        });
      } else {
        seenCodes.set(code, rowNumber);
      }
    }

    // Check for unknown status values (warning only)
    if (row.status?.trim()) {
      const status = row.status.toLowerCase().trim();
      if (!Object.keys(STATUS_MAP).includes(status)) {
        warnings.push(`Row ${rowNumber}: Unknown status "${row.status}" will default to active`);
      }
    }

    // Only add to parsed if no errors for this row
    if (rowErrors.length === 0) {
      parsed.push(transformRow(row));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed
  };
}

/**
 * Compare two values for change detection
 */
function valuesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const normA = a?.trim() || null;
  const normB = b?.trim() || null;
  return normA === normB;
}

/**
 * Generate import preview by comparing CSV with existing DB positions
 */
export function generatePreview(
  validated: ImportPosition[],
  distributionCenterId: string
): ImportPreviewSummary {
  const items: ImportPreviewItem[] = [];
  const existingPositions = listAllPositions(distributionCenterId);
  const existingByCode = new Map(existingPositions.map(p => [p.code, p]));
  const csvCodes = new Set(validated.map(p => p.code));

  let unchangedCount = 0;

  // Process positions from CSV
  for (const position of validated) {
    const existing = existingByCode.get(position.code);

    if (!existing) {
      // New position - CREATE
      items.push({
        position,
        action: 'CREATE'
      });
    } else {
      // Existing position - check for changes
      const changes: string[] = [];

      if (!valuesEqual(existing.zone, position.zone)) {
        changes.push(`zone: "${existing.zone}" → "${position.zone}"`);
      }
      if (!valuesEqual(existing.aisle, position.aisle)) {
        changes.push(`aisle: "${existing.aisle || '(empty)'}" → "${position.aisle}"`);
      }
      if (!valuesEqual(existing.rack, position.rack)) {
        changes.push(`rack: "${existing.rack || '(empty)'}" → "${position.rack}"`);
      }
      if (!valuesEqual(existing.level, position.level)) {
        changes.push(`level: "${existing.level || '(empty)'}" → "${position.level}"`);
      }
      if (!valuesEqual(existing.description, position.description)) {
        const oldDesc = existing.description || '(empty)';
        const newDesc = position.description || '(empty)';
        changes.push(`notes: "${oldDesc.substring(0, 20)}..." → "${newDesc.substring(0, 20)}..."`);
      }
      if ((existing.is_active ? true : false) !== position.is_active) {
        changes.push(`status: ${existing.is_active ? 'active' : 'inactive'} → ${position.is_active ? 'active' : 'inactive'}`);
      }

      if (changes.length > 0) {
        items.push({
          position,
          action: 'UPDATE',
          existingId: existing.id,
          changes,
          hasInventory: positionHasInventory(existing.id)
        });
      } else {
        unchangedCount++;
      }
    }
  }

  // Process orphaned positions (in DB but not in CSV)
  let orphanedWithInventory = 0;
  let orphanedEmpty = 0;

  for (const existing of existingPositions) {
    if (!csvCodes.has(existing.code)) {
      const hasInv = positionHasInventory(existing.id);

      if (hasInv) {
        orphanedWithInventory++;
      } else {
        orphanedEmpty++;
      }

      items.push({
        position: {
          code: existing.code,
          zone: existing.zone,
          aisle: existing.aisle ?? '',
          rack: existing.rack ?? '',
          level: existing.level ?? '',
          description: existing.description,
          is_active: existing.is_active ? true : false
        },
        action: 'KEEP',
        existingId: existing.id,
        hasInventory: hasInv
      });
    }
  }

  // Calculate summary
  const creates = items.filter(i => i.action === 'CREATE').length;
  const updates = items.filter(i => i.action === 'UPDATE').length;

  return {
    creates,
    updates,
    unchanged: unchangedCount,
    orphanedWithInventory,
    orphanedEmpty,
    items
  };
}

/**
 * Execute the import based on preview and user's orphan strategy choice
 */
export function executeImport(
  preview: ImportPreviewSummary,
  orphanStrategy: OrphanStrategy,
  distributionCenterId: string
): ImportResult {
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let markedInactive = 0;
  const errors: string[] = [];

  try {
    transaction(() => {
      for (const item of preview.items) {
        try {
          switch (item.action) {
            case 'CREATE':
              createPositionBulk({
                ...item.position,
                distributionCenterId
              });
              created++;
              break;

            case 'UPDATE':
              if (item.existingId) {
                updatePositionBulk(item.existingId, item.position);
                updated++;
              }
              break;

            case 'KEEP':
              // Handle orphaned positions based on user's strategy
              if (item.existingId && !item.hasInventory) {
                switch (orphanStrategy) {
                  case 'delete':
                    deletePosition(item.existingId);
                    deleted++;
                    break;
                  case 'mark_inactive':
                    markPositionInactive(item.existingId);
                    markedInactive++;
                    break;
                  case 'keep':
                    // Do nothing - keep as-is
                    break;
                }
              }
              // Positions with inventory are always kept (protected)
              break;

            case 'UNCHANGED':
              // Do nothing
              break;
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Error processing ${item.position.code}: ${message}`);
        }
      }
    });

    return {
      success: errors.length === 0,
      created,
      updated,
      deleted,
      markedInactive,
      errors
    };
  } catch (err) {
    return {
      success: false,
      created: 0,
      updated: 0,
      deleted: 0,
      markedInactive: 0,
      errors: [err instanceof Error ? err.message : 'Transaction failed']
    };
  }
}
