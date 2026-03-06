import { describe, expect, test } from "vitest";
import { deriveDisplayFingerprint } from "@/lib/display-identity/fingerprint";

describe("deriveDisplayFingerprint", () => {
  test("returns stable fingerprint for same output and public key", async () => {
    const first = await deriveDisplayFingerprint({
      output: "HDMI-0",
      publicKeyPem:
        "-----BEGIN PUBLIC KEY-----\nabc123\n-----END PUBLIC KEY-----",
    });
    const second = await deriveDisplayFingerprint({
      output: "  hdmi-0  ",
      publicKeyPem:
        "-----BEGIN PUBLIC KEY-----\nabc123\n-----END PUBLIC KEY-----",
    });

    expect(first).toBe(second);
  });

  test("returns different fingerprints for different outputs", async () => {
    const hdmi0 = await deriveDisplayFingerprint({
      output: "HDMI-0",
      publicKeyPem:
        "-----BEGIN PUBLIC KEY-----\nabc123\n-----END PUBLIC KEY-----",
    });
    const hdmi1 = await deriveDisplayFingerprint({
      output: "HDMI-1",
      publicKeyPem:
        "-----BEGIN PUBLIC KEY-----\nabc123\n-----END PUBLIC KEY-----",
    });

    expect(hdmi0).not.toBe(hdmi1);
  });
});
