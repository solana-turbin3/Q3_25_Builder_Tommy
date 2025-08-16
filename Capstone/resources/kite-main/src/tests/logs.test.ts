import { before, describe, test } from "node:test";
import assert from "node:assert";
import { connect } from "..";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { SOL } from "../lib/constants";

describe("getLogs", () => {
  test("getLogs works", async () => {
    const connection = connect();
    const keyPairSigner = await generateKeyPairSigner();

    const signature = await connection.airdropIfRequired(keyPairSigner.address, lamports(2n * SOL), lamports(1n * SOL));

    // Signature should never be null as we always need an airdrop
    assert.ok(signature);

    const logs = await connection.getLogs(signature);
    assert.deepEqual(logs, [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 success",
    ]);
  });
});
