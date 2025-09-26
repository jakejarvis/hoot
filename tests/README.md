# Testing Documentation

This directory contains the test suite for the Hoot domain intelligence tool, built with Vitest and React Testing Library.

## Test Structure

### Unit Tests (`lib/` and `server/`)
- **`lib/domain.test.ts`** - Domain input normalization and validation
- **`lib/domain-server.test.ts`** - Server-side domain utilities using tldts
- **`lib/providers/detection.test.ts`** - Provider detection system (hosting, email, DNS, registrar)
- **`lib/format.test.ts`** - Data formatting utilities (dates, TTL, registrants)
- **`lib/utils.test.ts`** - General utility functions

### Component Tests (`components/`)
- **`components/ui/badge.test.tsx`** - Badge component functionality and styling
- **`components/logo.test.tsx`** - Logo SVG component with accessibility
- **`components/domain/export-data.test.ts`** - Domain data export functionality

### Integration Tests (`tests/`)
- **`tests/server-setup.test.ts`** - Testing infrastructure and mocking examples

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode  
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run with coverage report
pnpm test:coverage

# Run with UI interface
pnpm test:ui
```

## Test Coverage

Current test coverage focuses on:
- **Domain Processing**: Input validation, normalization, and parsing
- **Provider Detection**: Rule-based detection for hosting/email/DNS providers
- **Data Formatting**: Date formatting, TTL conversion, registrant formatting
- **UI Components**: React component rendering, props, and accessibility
- **Utilities**: Helper functions and data transformation

## Testing Patterns

### Unit Testing
```typescript
import { describe, it, expect } from "vitest";
import { functionToTest } from "@/lib/module";

describe("Module Name", () => {
  describe("functionToTest", () => {
    it("should handle normal case", () => {
      expect(functionToTest("input")).toBe("expected");
    });

    it("should handle edge cases", () => {
      expect(functionToTest("")).toBe("");
      expect(functionToTest(null)).toBeNull();
    });
  });
});
```

### React Component Testing
```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Component } from "@/components/component";

describe("Component", () => {
  it("should render correctly", () => {
    render(<Component prop="value" />);
    expect(screen.getByText("Expected Text")).toBeInTheDocument();
  });
});
```

### Mocking External Dependencies
```typescript
import { vi, beforeEach } from "vitest";

// Mock external modules
vi.mock("@/lib/external-service", () => ({
  serviceFunction: vi.fn(),
}));

describe("Service Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use mocked service", () => {
    const { serviceFunction } = require("@/lib/external-service");
    serviceFunction.mockReturnValue("mocked result");
    // Test implementation
  });
});
```

## Test Configuration

### Vitest Config (`vitest.config.ts`)
- **Environment**: jsdom for DOM testing
- **Setup**: `vitest.setup.ts` for global test configuration
- **Globals**: Vitest globals enabled for cleaner test syntax
- **Coverage**: V8 provider with HTML reports
- **Path Aliases**: `@/` mapped to project root

### Coverage Settings
- **Include**: `lib/`, `components/`, `server/`, `hooks/`
- **Exclude**: Tests, configs, build files, node_modules
- **Reporters**: Text (console), JSON, HTML

## Adding New Tests

1. **Create test file** next to the module being tested with `.test.ts` extension
2. **Follow naming convention**: `module-name.test.ts` 
3. **Use descriptive test names** that explain the behavior being tested
4. **Group related tests** using `describe` blocks
5. **Test edge cases** including empty, null, and invalid inputs
6. **Mock external dependencies** appropriately

## CI Integration

Tests are configured to run in CI environments:
- Exit code 0 for passing tests, non-zero for failures
- Coverage reports can be generated and uploaded
- Compatible with GitHub Actions and other CI platforms

## Dependencies

- **Vitest**: Fast unit test framework
- **@testing-library/react**: React component testing utilities
- **@testing-library/jest-dom**: Additional DOM matchers
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM environment for testing
- **@vitest/coverage-v8**: Code coverage reporting