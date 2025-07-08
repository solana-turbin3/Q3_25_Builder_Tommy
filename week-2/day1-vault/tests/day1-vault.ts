import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Day1Vault } from "../target/types/day1_vault";

describe("day1-vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.day1Vault as Program<Day1Vault>;

  // Derive PDAs using the hierarchical structure
  const vaultState = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("state"), provider.publicKey.toBytes()], program.programId)[0];
  const vault = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("vault"), vaultState.toBytes()], program.programId)[0];

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize()
      .accountsPartial({
        signer: provider.publicKey,
        vaultState,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
