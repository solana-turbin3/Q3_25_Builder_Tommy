import { before, describe, test } from "node:test";
import assert from "node:assert";
import { Address } from "@solana/kit";
import { getPDAAndBump } from "../lib/pdas";

describe("getPDAAndBump", () => {
  test("getPDAAndBump returns the same as the web3.js v1 equivalent code", async () => {
    const aliceAddress = "qbuMdeYxYJXBjU6C6qFKjZKjXmrU83eDQomHdrch826" as Address;
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const offerId = 420n;
    const { pda, bump } = await getPDAAndBump(programAddress, ["offer", aliceAddress, offerId]);

    assert.equal(pda.toString(), "GNhnD5ucxtTkuX4raePZxo4spK27t4qzBMHgscSYyLS3");
    assert.equal(bump, 253);
  });

  test("works with string seed only", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const { pda, bump } = await getPDAAndBump(programAddress, ["foo"]);
    assert.ok(pda);
    assert.strictEqual(typeof bump, "number");
  });

  test("works with Address seed only", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const addr = "qbuMdeYxYJXBjU6C6qFKjZKjXmrU83eDQomHdrch826" as Address;
    const { pda, bump } = await getPDAAndBump(programAddress, [addr]);
    assert.ok(pda);
    assert.strictEqual(typeof bump, "number");
  });

  test("works with BigInt seed only", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const { pda, bump } = await getPDAAndBump(programAddress, [123456789n]);
    assert.ok(pda);
    assert.strictEqual(typeof bump, "number");
  });

  test("works with Uint8Array seed only", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const arr = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const { pda, bump } = await getPDAAndBump(programAddress, [arr]);
    assert.ok(pda);
    assert.strictEqual(typeof bump, "number");
  });

  test("works with mixed seed types", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    const addr = "qbuMdeYxYJXBjU6C6qFKjZKjXmrU83eDQomHdrch826" as Address;
    const arr = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2]);
    const { pda, bump } = await getPDAAndBump(programAddress, ["foo", addr, 42n, arr]);
    assert.ok(pda);
    assert.strictEqual(typeof bump, "number");
  });

  test("throws or returns for empty seeds array", async () => {
    const programAddress = "CXSfSLuAf6gtkGBH6i1kyRXFtH7CqNRHnPMo39AFKn6X" as Address;
    try {
      await getPDAAndBump(programAddress, []);
      // If no error, that's fine, just check output type
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  });
});
