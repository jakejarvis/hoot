/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Logo } from "@/components/logo";

describe("Logo Component", () => {
  describe("Rendering", () => {
    it("should render the logo SVG", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      expect(logo).toBeInTheDocument();
      expect(logo.tagName).toBe("svg");
    });

    it("should render with correct SVG attributes", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveAttribute("xmlns", "http://www.w3.org/2000/svg");
      expect(logo).toHaveAttribute("viewBox", "9 4.875 82 90.25");
      expect(logo).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
    });

    it("should contain the expected path element", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      const path = logo.querySelector("path");
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute("fill", "currentColor");
    });
  });

  describe("Title and Accessibility", () => {
    it("should render without title by default", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      const titleElement = logo.querySelector("title");
      expect(titleElement).not.toBeInTheDocument();
      expect(logo).not.toHaveAttribute("aria-label");
    });

    it("should render with title when provided", () => {
      render(<Logo title="Hoot Logo" />);
      
      const logo = screen.getByRole("img");
      const titleElement = logo.querySelector("title");
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent("Hoot Logo");
      expect(logo).toHaveAttribute("aria-label", "Hoot Logo");
    });

    it("should be accessible as an image", () => {
      render(<Logo title="Site Logo" />);
      
      const logo = screen.getByRole("img", { name: "Site Logo" });
      expect(logo).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    it("should accept custom className", () => {
      render(<Logo className="custom-logo" />);
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveClass("custom-logo");
    });

    it("should accept custom width and height", () => {
      render(<Logo width={100} height={120} />);
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveAttribute("width", "100");
      expect(logo).toHaveAttribute("height", "120");
    });

    it("should accept custom style", () => {
      render(<Logo style={{ color: "red", margin: "10px" }} />);
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveStyle({ color: "rgb(255, 0, 0)", margin: "10px" });
    });

    it("should accept data attributes", () => {
      render(<Logo data-testid="logo-icon" data-theme="dark" />);
      
      const logo = screen.getByTestId("logo-icon");
      expect(logo).toHaveAttribute("data-theme", "dark");
    });

    it("should forward all SVG props", () => {
      render(
        <Logo
          id="main-logo"
          role="img"
          fill="blue"
          stroke="red"
          strokeWidth={2}
        />
      );
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveAttribute("id", "main-logo");
      expect(logo).toHaveAttribute("fill", "blue");
      expect(logo).toHaveAttribute("stroke", "red");
      expect(logo).toHaveAttribute("stroke-width", "2");
    });
  });

  describe("SVG Structure", () => {
    it("should have the expected SVG structure", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      
      // Check for main group element
      const group = logo.querySelector("g");
      expect(group).toBeInTheDocument();
      
      // Check for path within group
      const path = group?.querySelector("path");
      expect(path).toBeInTheDocument();
    });

    it("should have proper SVG drawing attributes", () => {
      render(<Logo />);
      
      const logo = screen.getByRole("img");
      expect(logo).toHaveAttribute("fill-rule", "evenodd");
      expect(logo).toHaveAttribute("clip-rule", "evenodd");
      expect(logo).toHaveAttribute("stroke-linejoin", "round");
      expect(logo).toHaveAttribute("stroke-miterlimit", "2");
    });
  });

  describe("Title Conditional Rendering", () => {
    it("should not render title element when title is empty string", () => {
      render(<Logo title="" />);
      
      const logo = screen.getByRole("img");
      const titleElement = logo.querySelector("title");
      expect(titleElement).not.toBeInTheDocument();
    });

    it("should render title element when title is provided", () => {
      render(<Logo title="Owl Logo" />);
      
      const logo = screen.getByRole("img");
      const titleElement = logo.querySelector("title");
      expect(titleElement).toBeInTheDocument();
      expect(titleElement?.textContent).toBe("Owl Logo");
    });

    it("should update title when prop changes", () => {
      const { rerender } = render(<Logo title="Original Title" />);
      
      let logo = screen.getByRole("img");
      let titleElement = logo.querySelector("title");
      expect(titleElement?.textContent).toBe("Original Title");
      
      rerender(<Logo title="Updated Title" />);
      
      logo = screen.getByRole("img");
      titleElement = logo.querySelector("title");
      expect(titleElement?.textContent).toBe("Updated Title");
    });
  });
});