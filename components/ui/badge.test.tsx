/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/components/ui/badge";

describe("Badge Component", () => {
  describe("Rendering", () => {
    it("should render with default variant", () => {
      render(<Badge>Default Badge</Badge>);
      
      const badge = screen.getByText("Default Badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-slot", "badge");
    });

    it("should render with secondary variant", () => {
      render(<Badge variant="secondary">Secondary Badge</Badge>);
      
      const badge = screen.getByText("Secondary Badge");
      expect(badge).toBeInTheDocument();
    });

    it("should render with destructive variant", () => {
      render(<Badge variant="destructive">Destructive Badge</Badge>);
      
      const badge = screen.getByText("Destructive Badge");
      expect(badge).toBeInTheDocument();
    });

    it("should render with outline variant", () => {
      render(<Badge variant="outline">Outline Badge</Badge>);
      
      const badge = screen.getByText("Outline Badge");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have default badge styles", () => {
      render(<Badge>Styled Badge</Badge>);
      
      const badge = screen.getByText("Styled Badge");
      // Check that it has some of the key CSS classes
      expect(badge).toHaveClass("inline-flex", "items-center", "justify-center");
    });

    it("should accept custom className", () => {
      render(<Badge className="custom-class">Custom Badge</Badge>);
      
      const badge = screen.getByText("Custom Badge");
      expect(badge).toHaveClass("custom-class");
    });

    it("should merge custom className with default classes", () => {
      render(<Badge className="custom-class">Merged Badge</Badge>);
      
      const badge = screen.getByText("Merged Badge");
      expect(badge).toHaveClass("custom-class");
      expect(badge).toHaveClass("inline-flex"); // Default class should still be there
    });
  });

  describe("Props", () => {
    it("should pass through HTML props", () => {
      render(
        <Badge data-testid="test-badge" role="status" title="Test title">
          Props Badge
        </Badge>
      );
      
      const badge = screen.getByTestId("test-badge");
      expect(badge).toHaveAttribute("role", "status");
      expect(badge).toHaveAttribute("title", "Test title");
    });

    it("should render as span by default", () => {
      render(<Badge>Span Badge</Badge>);
      
      const badge = screen.getByText("Span Badge");
      expect(badge.tagName).toBe("SPAN");
    });

    it("should support asChild prop", () => {
      render(
        <Badge asChild>
          <div>Div Badge</div>
        </Badge>
      );
      
      const badge = screen.getByText("Div Badge");
      expect(badge.tagName).toBe("DIV");
      expect(badge).toHaveAttribute("data-slot", "badge");
    });
  });

  describe("Content", () => {
    it("should render text content", () => {
      render(<Badge>Text Content</Badge>);
      
      expect(screen.getByText("Text Content")).toBeInTheDocument();
    });

    it("should render with children", () => {
      render(
        <Badge>
          <span>Child</span> Content
        </Badge>
      );
      
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    it("should handle empty content", () => {
      render(<Badge data-testid="empty-badge" />);
      
      const badge = screen.getByTestId("empty-badge");
      expect(badge).toBeInTheDocument();
      expect(badge).toBeEmptyDOMElement();
    });
  });

  describe("Accessibility", () => {
    it("should be accessible as a generic element", () => {
      render(<Badge>Accessible Badge</Badge>);
      
      const badge = screen.getByText("Accessible Badge");
      expect(badge).toBeInTheDocument();
    });

    it("should support aria attributes", () => {
      render(
        <Badge aria-label="Status indicator" aria-describedby="status-help">
          Status
        </Badge>
      );
      
      const badge = screen.getByText("Status");
      expect(badge).toHaveAttribute("aria-label", "Status indicator");
      expect(badge).toHaveAttribute("aria-describedby", "status-help");
    });
  });
});