import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("Utility Functions", () => {
  describe("cn (className utility)", () => {
    it("should merge class names correctly", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      expect(cn("class1", true && "class2", false && "class3")).toBe(
        "class1 class2",
      );
    });

    it("should handle empty values", () => {
      expect(cn("class1", "", "class2")).toBe("class1 class2");
      expect(cn("", "class1")).toBe("class1");
    });

    it("should handle Tailwind merge conflicts", () => {
      // tw-merge should handle conflicting Tailwind classes
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("should handle arrays and objects", () => {
      expect(cn(["class1", "class2"])).toBe("class1 class2");
      expect(cn({ class1: true, class2: false, class3: true })).toBe(
        "class1 class3",
      );
    });

    it("should handle mixed input types", () => {
      expect(
        cn(
          "base-class",
          { "conditional-class": true, "ignored-class": false },
          ["array-class1", "array-class2"],
          true && "dynamic-class",
        ),
      ).toBe(
        "base-class conditional-class array-class1 array-class2 dynamic-class",
      );
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle null and undefined", () => {
      expect(cn("class1", null, undefined, "class2")).toBe("class1 class2");
    });
  });
});
