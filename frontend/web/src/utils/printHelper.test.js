import { printElement } from './printHelper';

describe('printHelper', () => {
  test('safely handles non-browser / node environments without throwing', () => {
    expect(() => printElement(null)).not.toThrow();
    expect(() => printElement({})).not.toThrow();
  });
});
