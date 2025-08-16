import { before, describe, test } from "node:test";
import assert from "node:assert";
import { connect } from "..";
import { generateKeyPairSigner, lamports } from "@solana/kit";
import { SOL } from "../lib/constants";

describe("getLamportBalance", () => {
  test("getLamportBalance returns 0 for a new account", async () => {
    const keypairSigner = await generateKeyPairSigner();
    const connection = connect();
    const balance = await connection.getLamportBalance(keypairSigner.address, "finalized");
    assert.equal(balance, 0n);
  });

  test("getLamportBalance returns 1 SOL after 1 SOL is airdropped", async () => {
    const keypairSigner = await generateKeyPairSigner();
    const connection = connect();
    await connection.airdropIfRequired(keypairSigner.address, lamports(1n * SOL), lamports(1n * SOL));
    const balance = await connection.getLamportBalance(keypairSigner.address, "finalized");
    assert.equal(balance, lamports(1n * SOL));
  });
});

describe("transferLamports", () => {
  test("Transferring SOL / lamports between wallets", async () => {
    const connection = connect();
    const [sender, recipient] = await connection.createWallets(2, {
      airdropAmount: lamports(1n * SOL),
    });

    const transferSignature = await connection.transferLamports({
      source: sender,
      destination: recipient.address,
      amount: lamports(1_000_000n),
    });

    assert.ok(transferSignature);
  });
});
