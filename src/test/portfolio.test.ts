import { describe, expect, it } from "vitest";
import { portfolioSelection } from "@/lib/portfolio";

describe("portfolio selection", () => {
  it("initially shows six references", () => {
    expect(portfolioSelection("all", false).visible).toHaveLength(6);
    expect(portfolioSelection("all", false).hasMore).toBe(true);
  });
  it("reveals all fourteen references", () => {
    expect(portfolioSelection("all", true).visible).toHaveLength(14);
    expect(portfolioSelection("all", true).hasMore).toBe(false);
  });
  it("filters the eight sites", () => {
    const selection = portfolioSelection("sites", true);
    expect(selection.visible).toHaveLength(8);
    expect(selection.visible.every(project => project.category === "sites")).toBe(true);
  });
  it("filters the six Google profiles", () => {
    const selection = portfolioSelection("google", false);
    expect(selection.visible).toHaveLength(6);
    expect(selection.visible.every(project => project.category === "google")).toBe(true);
    expect(selection.hasMore).toBe(false);
  });
});