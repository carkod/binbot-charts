import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('Example app', () => {
  it('should build without errors', () => {
    // Try to build the example app (if present)
    expect(() => {
      execSync('npm run build', { cwd: process.cwd(), stdio: 'inherit' });
    }).not.toThrow();
  });
});
