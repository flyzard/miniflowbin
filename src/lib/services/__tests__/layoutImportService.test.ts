/**
 * Layout Import Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCsv, generatePreview, executeImport } from '../layoutImportService';
import type { ImportPosition, ImportPreviewSummary, OrphanStrategy } from '../../types';

// Mock database module
vi.mock('../../db/database', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  exec: vi.fn(),
  transaction: vi.fn((fn: () => void) => fn())
}));

// Mock position repository
vi.mock('../../repositories/positionRepo', () => ({
  listAllPositions: vi.fn(),
  createPositionBulk: vi.fn(),
  updatePositionBulk: vi.fn(),
  deletePosition: vi.fn(),
  markPositionInactive: vi.fn(),
  positionHasInventory: vi.fn()
}));

import {
  listAllPositions,
  createPositionBulk,
  updatePositionBulk,
  deletePosition,
  markPositionInactive,
  positionHasInventory
} from '../../repositories/positionRepo';

describe('layoutImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCsv', () => {
    it('should validate a correct CSV', () => {
      const csv = `zone,slot_code,aisle,column,level,status,notes
A,A-01-1,1,1,1,available,Ground level
A,A-01-2,1,1,2,available,`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.parsed).toHaveLength(2);
      expect(result.parsed[0]).toEqual({
        code: 'A-01-1',
        zone: 'A',
        aisle: '1',
        rack: '1',
        level: '1',
        description: 'Ground level',
        is_active: true
      });
    });

    it('should reject empty file', () => {
      const result = validateCsv('');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.message).toContain('empty');
    });

    it('should reject missing required headers', () => {
      const csv = `zone,slot_code,aisle
A,A-01-1,1`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Missing required headers'))).toBe(true);
    });

    it('should reject missing required fields per row', () => {
      const csv = `zone,slot_code,aisle,column,level
A,,1,1,1`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Slot code is required'))).toBe(true);
    });

    it('should reject zone prefix mismatch', () => {
      const csv = `zone,slot_code,aisle,column,level
A,B-01-1,1,1,1`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('should start with zone'))).toBe(true);
    });

    it('should reject duplicate slot codes within file', () => {
      const csv = `zone,slot_code,aisle,column,level
A,A-01-1,1,1,1
A,A-01-1,1,1,2`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should map status to is_active correctly', () => {
      const csv = `zone,slot_code,aisle,column,level,status
A,A-01-1,1,1,1,available
A,A-01-2,1,1,2,maintenance`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.parsed[0]?.is_active).toBe(true);
      expect(result.parsed[1]?.is_active).toBe(false);
    });

    it('should warn about ignored fields', () => {
      const csv = `zone,slot_code,aisle,column,level,capacity_units,max_weight_kg
A,A-01-1,1,1,1,10,500.00`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('ignored'))).toBe(true);
    });

    it('should warn about unknown status values', () => {
      const csv = `zone,slot_code,aisle,column,level,status
A,A-01-1,1,1,1,unknown_status`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(true);
      expect(result.warnings.some(w => w.includes('unknown_status'))).toBe(true);
      expect(result.parsed[0]?.is_active).toBe(true); // defaults to active
    });

    it('should handle header-only file', () => {
      const csv = `zone,slot_code,aisle,column,level`;

      const result = validateCsv(csv);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('No data rows'))).toBe(true);
    });
  });

  describe('generatePreview', () => {
    const mockDcId = 'dc-123';

    beforeEach(() => {
      vi.mocked(listAllPositions).mockReturnValue([]);
      vi.mocked(positionHasInventory).mockReturnValue(false);
    });

    it('should classify new positions as CREATE', () => {
      vi.mocked(listAllPositions).mockReturnValue([]);

      const validated: ImportPosition[] = [
        { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }
      ];

      const preview = generatePreview(validated, mockDcId);

      expect(preview.creates).toBe(1);
      expect(preview.updates).toBe(0);
      expect(preview.items[0]?.action).toBe('CREATE');
    });

    it('should classify changed positions as UPDATE', () => {
      vi.mocked(listAllPositions).mockReturnValue([
        { id: 'pos-1', code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true, zone_type: null, distribution_center_id: mockDcId, created_at: '', updated_at: '' }
      ]);

      const validated: ImportPosition[] = [
        { code: 'A-01-1', zone: 'A', aisle: '2', rack: '1', level: '1', description: null, is_active: true } // aisle changed
      ];

      const preview = generatePreview(validated, mockDcId);

      expect(preview.creates).toBe(0);
      expect(preview.updates).toBe(1);
      expect(preview.items[0]?.action).toBe('UPDATE');
      expect(preview.items[0]?.changes).toContain('aisle: "1" → "2"');
    });

    it('should count unchanged positions', () => {
      vi.mocked(listAllPositions).mockReturnValue([
        { id: 'pos-1', code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true, zone_type: null, distribution_center_id: mockDcId, created_at: '', updated_at: '' }
      ]);

      const validated: ImportPosition[] = [
        { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }
      ];

      const preview = generatePreview(validated, mockDcId);

      expect(preview.unchanged).toBe(1);
      expect(preview.creates).toBe(0);
      expect(preview.updates).toBe(0);
    });

    it('should detect orphaned positions with inventory', () => {
      vi.mocked(listAllPositions).mockReturnValue([
        { id: 'pos-1', code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true, zone_type: null, distribution_center_id: mockDcId, created_at: '', updated_at: '' }
      ]);
      vi.mocked(positionHasInventory).mockReturnValue(true);

      const validated: ImportPosition[] = []; // CSV has no positions

      const preview = generatePreview(validated, mockDcId);

      expect(preview.orphanedWithInventory).toBe(1);
      expect(preview.orphanedEmpty).toBe(0);
      expect(preview.items[0]?.hasInventory).toBe(true);
    });

    it('should detect orphaned positions without inventory', () => {
      vi.mocked(listAllPositions).mockReturnValue([
        { id: 'pos-1', code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true, zone_type: null, distribution_center_id: mockDcId, created_at: '', updated_at: '' }
      ]);
      vi.mocked(positionHasInventory).mockReturnValue(false);

      const validated: ImportPosition[] = [];

      const preview = generatePreview(validated, mockDcId);

      expect(preview.orphanedWithInventory).toBe(0);
      expect(preview.orphanedEmpty).toBe(1);
      expect(preview.items[0]?.hasInventory).toBe(false);
    });
  });

  describe('executeImport', () => {
    const mockDcId = 'dc-123';

    beforeEach(() => {
      vi.mocked(createPositionBulk).mockReturnValue({} as any);
      vi.mocked(updatePositionBulk).mockReturnValue(undefined);
      vi.mocked(deletePosition).mockReturnValue(undefined);
      vi.mocked(markPositionInactive).mockReturnValue(undefined);
    });

    it('should execute CREATE operations', () => {
      const preview: ImportPreviewSummary = {
        creates: 1,
        updates: 0,
        unchanged: 0,
        orphanedWithInventory: 0,
        orphanedEmpty: 0,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'CREATE' }
        ]
      };

      const result = executeImport(preview, 'keep', mockDcId);

      expect(result.success).toBe(true);
      expect(result.created).toBe(1);
      expect(createPositionBulk).toHaveBeenCalled();
    });

    it('should execute UPDATE operations', () => {
      const preview: ImportPreviewSummary = {
        creates: 0,
        updates: 1,
        unchanged: 0,
        orphanedWithInventory: 0,
        orphanedEmpty: 0,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'UPDATE', existingId: 'pos-1' }
        ]
      };

      const result = executeImport(preview, 'keep', mockDcId);

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(updatePositionBulk).toHaveBeenCalledWith('pos-1', expect.any(Object));
    });

    it('should keep orphans when strategy is keep', () => {
      const preview: ImportPreviewSummary = {
        creates: 0,
        updates: 0,
        unchanged: 0,
        orphanedWithInventory: 0,
        orphanedEmpty: 1,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'KEEP', existingId: 'pos-1', hasInventory: false }
        ]
      };

      const result = executeImport(preview, 'keep', mockDcId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
      expect(result.markedInactive).toBe(0);
      expect(deletePosition).not.toHaveBeenCalled();
      expect(markPositionInactive).not.toHaveBeenCalled();
    });

    it('should delete orphans when strategy is delete', () => {
      const preview: ImportPreviewSummary = {
        creates: 0,
        updates: 0,
        unchanged: 0,
        orphanedWithInventory: 0,
        orphanedEmpty: 1,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'KEEP', existingId: 'pos-1', hasInventory: false }
        ]
      };

      const result = executeImport(preview, 'delete', mockDcId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(1);
      expect(deletePosition).toHaveBeenCalledWith('pos-1');
    });

    it('should mark orphans inactive when strategy is mark_inactive', () => {
      const preview: ImportPreviewSummary = {
        creates: 0,
        updates: 0,
        unchanged: 0,
        orphanedWithInventory: 0,
        orphanedEmpty: 1,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'KEEP', existingId: 'pos-1', hasInventory: false }
        ]
      };

      const result = executeImport(preview, 'mark_inactive', mockDcId);

      expect(result.success).toBe(true);
      expect(result.markedInactive).toBe(1);
      expect(markPositionInactive).toHaveBeenCalledWith('pos-1');
    });

    it('should never delete orphans with inventory', () => {
      const preview: ImportPreviewSummary = {
        creates: 0,
        updates: 0,
        unchanged: 0,
        orphanedWithInventory: 1,
        orphanedEmpty: 0,
        items: [
          { position: { code: 'A-01-1', zone: 'A', aisle: '1', rack: '1', level: '1', description: null, is_active: true }, action: 'KEEP', existingId: 'pos-1', hasInventory: true }
        ]
      };

      const result = executeImport(preview, 'delete', mockDcId);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
      expect(deletePosition).not.toHaveBeenCalled();
    });
  });
});
