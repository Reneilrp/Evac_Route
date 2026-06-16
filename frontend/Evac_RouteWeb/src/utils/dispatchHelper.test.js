/* global describe, test, expect */
import { validateDispatchQuantity, getStatusBadgeColor, formatDispatchOrderNotes } from './dispatchHelper';

describe('validateDispatchQuantity', () => {
  test('returns valid when quantity is positive and <= stock', () => {
    expect(validateDispatchQuantity(50, 100)).toEqual({ valid: true, message: 'Quantity is valid.' });
    expect(validateDispatchQuantity(100, 100)).toEqual({ valid: true, message: 'Quantity is valid.' });
  });

  test('returns invalid when quantity is negative or zero', () => {
    expect(validateDispatchQuantity(0, 100).valid).toBe(false);
    expect(validateDispatchQuantity(-10, 100).valid).toBe(false);
  });

  test('returns invalid when quantity exceeds stock', () => {
    expect(validateDispatchQuantity(120, 100)).toEqual({
      valid: false,
      message: 'Insufficient stock in warehouse.'
    });
  });

  test('handles non-numeric inputs', () => {
    expect(validateDispatchQuantity('50', 100).valid).toBe(false);
    expect(validateDispatchQuantity(50, null).valid).toBe(false);
  });
});

describe('getStatusBadgeColor', () => {
  test('returns correct classes for each status', () => {
    expect(getStatusBadgeColor('pending')).toContain('text-yellow-500');
    expect(getStatusBadgeColor('in_transit')).toContain('text-blue-500');
    expect(getStatusBadgeColor('delivered')).toContain('text-green-500');
    expect(getStatusBadgeColor('cancelled')).toContain('text-red-500');
    expect(getStatusBadgeColor('unknown')).toContain('text-zinc-500');
  });
});

describe('formatDispatchOrderNotes', () => {
  test('returns trimmed notes when provided', () => {
    expect(formatDispatchOrderNotes('  Urgent delivery!  ')).toBe('Urgent delivery!');
  });

  test('returns default text when notes are empty or null', () => {
    expect(formatDispatchOrderNotes(null)).toBe('No notes provided.');
    expect(formatDispatchOrderNotes('')).toBe('No notes provided.');
    expect(formatDispatchOrderNotes('   ')).toBe('No notes provided.');
  });
});
