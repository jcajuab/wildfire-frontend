import { describe, expect, test } from "vitest";
import { dateToISOStart, dateToISOEnd, formatFileSize } from "@/lib/formatters";

describe("dateToISOStart", () => {
  test("returns valid ISO string for YYYY-MM-DD", () => {
    const result = dateToISOStart("2026-02-21");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(() => new Date(result).getTime()).not.toThrow();
    expect(Number.isFinite(new Date(result).getTime())).toBe(true);
  });

  test("start of day is before end of same day", () => {
    const date = "2026-02-21";
    expect(new Date(dateToISOStart(date)).getTime()).toBeLessThan(
      new Date(dateToISOEnd(date)).getTime(),
    );
  });

  test("interprets date as local calendar day (not UTC)", () => {
    const date = "2026-02-21";
    const start = dateToISOStart(date);
    const end = dateToISOEnd(date);
    const localStart = new Date(`${date}T00:00:00`);
    const localEnd = new Date(`${date}T23:59:59.999`);
    expect(start).toBe(localStart.toISOString());
    expect(end).toBe(localEnd.toISOString());
  });

  test("falls back to UTC literal for malformed date", () => {
    const malformed = "not-a-date";
    expect(dateToISOStart(malformed)).toBe(`${malformed}T00:00:00.000Z`);
    expect(dateToISOEnd(malformed)).toBe(`${malformed}T23:59:59.999Z`);
  });
});

describe("dateToISOEnd", () => {
  test("returns valid ISO string for YYYY-MM-DD", () => {
    const result = dateToISOEnd("2026-02-21");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isFinite(new Date(result).getTime())).toBe(true);
  });
});

describe("formatFileSize", () => {
  test("formats bytes below 1 KB", () => {
    expect(formatFileSize(999)).toBe("999 B");
  });

  test("formats KB with one decimal below 10", () => {
    expect(formatFileSize(2400)).toBe("2.4 KB");
  });

  test("formats MB using decimal units", () => {
    expect(formatFileSize(2_456_918)).toBe("2.5 MB");
  });

  test("formats GB", () => {
    expect(formatFileSize(1_500_000_000)).toBe("1.5 GB");
  });

  test("formats exact boundaries without decimals", () => {
    expect(formatFileSize(1000)).toBe("1 KB");
    expect(formatFileSize(1_000_000)).toBe("1 MB");
  });

  test("returns zero bytes for invalid input", () => {
    expect(formatFileSize(-10)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });
});
