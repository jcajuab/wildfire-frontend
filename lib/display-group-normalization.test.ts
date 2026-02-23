import { describe, expect, test } from "vitest";
import {
  collapseDisplayGroupWhitespace,
  dedupeDisplayGroupNames,
  toDisplayGroupKey,
} from "@/lib/display-group-normalization";

describe("display-group-normalization", () => {
  test("collapseDisplayGroupWhitespace trims and collapses inner spaces", () => {
    expect(collapseDisplayGroupWhitespace("  Main   Lobby  ")).toBe(
      "Main Lobby",
    );
  });

  test("toDisplayGroupKey builds case-insensitive match keys", () => {
    expect(toDisplayGroupKey("  Main Lobby ")).toBe("main lobby");
    expect(toDisplayGroupKey("MAIN   LOBBY")).toBe("main lobby");
  });

  test("dedupeDisplayGroupNames removes case-insensitive duplicates", () => {
    expect(
      dedupeDisplayGroupNames([
        " Lobby",
        "lobby",
        "MAIN HALL",
        "Main   Hall",
        "Office",
      ]),
    ).toEqual(["Lobby", "MAIN HALL", "Office"]);
  });
});
