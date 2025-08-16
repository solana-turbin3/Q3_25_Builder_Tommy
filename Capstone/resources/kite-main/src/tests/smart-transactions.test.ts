import { describe, test } from "node:test";
import assert from "node:assert";
import { connect } from "..";
import { lamports } from "@solana/kit";
import { loadWalletFromEnvironment } from "../lib/keypair";
import dotenv from "dotenv";

describe("Smart transactions", () => {
  // This test expects two private keys to be saved in the .env file
  // MAINNET_WALLET_WITH_SOME_SOL
  // MAINNET_WALLET_THAT_WILL_RECIEVE_SOL
  // HELIUS_API_KEY
  test(
    "transferLamports on mainnet with retries",
    { skip: "skipping mainnet tests unless explicitly needed" },
    async () => {
      dotenv.config();
      const connection = connect("helius-mainnet");
      const sender = await loadWalletFromEnvironment("MAINNET_WALLET_WITH_SOME_SOL");
      const recipient = await loadWalletFromEnvironment("MAINNET_WALLET_THAT_WILL_RECIEVE_SOL");

      try {
        const transferSignature = await connection.transferLamports({
          source: sender,
          destination: recipient.address,
          // A tiny amount to test the retries since this is mainnet and the SOL has value
          amount: lamports(100n),
          skipPreflight: true,
          maximumClientSideRetries: 4,
        });

        assert.ok(transferSignature);

        // I hate console logs in test output too, but this is a mainnet test
        // and someone running this test is likely doing it interactively.
        console.log("Transaction Signature:", connection.getExplorerLink("tx", transferSignature));
      } catch (thrownObject) {
        const error = thrownObject as Error;
        console.log(error.message);
        console.log(error.cause);
      }
    },
  );
});
