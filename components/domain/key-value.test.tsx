import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyValue } from "./key-value";

describe("KeyValue", () => {
  it("renders label and value", () => {
    render(<KeyValue label="Registrar" value="NameCheap" />);
    expect(screen.getByText("Registrar")).toBeInTheDocument();
    expect(screen.getByText("NameCheap")).toBeInTheDocument();
  });
});
