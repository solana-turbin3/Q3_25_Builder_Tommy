import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

// Constants
const PROGRAM_ID = new PublicKey("81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx");
const RPC_URL = "https://api.devnet.solana.com";

async function initializeGame() {
  console.log("🎮 Initializing Wasteland Runners game on devnet...\n");

  // Setup connection
  const connection = new Connection(RPC_URL, "confirmed");
  
  // Load wallet
  const walletPath = path.join(process.env.HOME!, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf8")))
  );
  
  console.log("Authority:", walletKeypair.publicKey.toBase58());
  
  // Check wallet balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");
  
  if (balance < 0.1 * 1e9) {
    throw new Error("Insufficient balance. Need at least 0.1 SOL for initialization");
  }

  // Derive PDAs
  const [globalGameStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_game_state")],
    PROGRAM_ID
  );
  
  const [rewardPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_pool")],
    PROGRAM_ID
  );
  
  const [scrapMintPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("scrap_mint")],
    PROGRAM_ID
  );
  
  // Derive reward pool ATA
  const rewardPoolATA = await getAssociatedTokenAddress(
    scrapMintPDA,
    rewardPoolPDA,
    true // allowOwnerOffCurve
  );

  console.log("\n📍 Derived Addresses:");
  console.log("Global Game State:", globalGameStatePDA.toBase58());
  console.log("Reward Pool PDA:", rewardPoolPDA.toBase58());
  console.log("SCRAP Mint PDA:", scrapMintPDA.toBase58());
  console.log("Reward Pool ATA:", rewardPoolATA.toBase58());

  // Check if already initialized
  console.log("\n🔍 Checking if already initialized...");
  const gameStateAccount = await connection.getAccountInfo(globalGameStatePDA);
  if (gameStateAccount && gameStateAccount.owner.equals(PROGRAM_ID)) {
    console.log("❌ Game is already initialized!");
    console.log("Account size:", gameStateAccount.data.length, "bytes");
    console.log("Owner:", gameStateAccount.owner.toBase58());
    return;
  }

  // Create instruction data (no args for initialize_game)
  const discriminator = Buffer.from([44, 62, 102, 247, 126, 208, 130, 215]);
  const instructionData = discriminator;

  // Create instruction
  const instruction = new anchor.web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      // global_game_state (writable, PDA)
      {
        pubkey: globalGameStatePDA,
        isSigner: false,
        isWritable: true,
      },
      // reward_pool (writable, PDA)
      {
        pubkey: rewardPoolPDA,
        isSigner: false,
        isWritable: true,
      },
      // scrap_mint (writable, PDA)
      {
        pubkey: scrapMintPDA,
        isSigner: false,
        isWritable: true,
      },
      // token_program
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      // associated_token_program
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      // system_program
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      // authority (writable, signer)
      {
        pubkey: walletKeypair.publicKey,
        isSigner: true,
        isWritable: true,
      },
      // reward_pool_ata (writable, unchecked)
      {
        pubkey: rewardPoolATA,
        isSigner: false,
        isWritable: true,
      },
    ],
    data: instructionData,
  });

  // Create and send transaction
  console.log("\n🚀 Sending initialization transaction...");
  const transaction = new Transaction().add(instruction);
  
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair],
      {
        commitment: "confirmed",
        maxRetries: 3,
      }
    );
    
    console.log("✅ Game initialized successfully!");
    console.log("Transaction signature:", signature);
    console.log("View on Solscan:", `https://solscan.io/tx/${signature}?cluster=devnet`);

    // Verify initialization
    console.log("\n🔍 Verifying initialization...");
    const verifyGameState = await connection.getAccountInfo(globalGameStatePDA);
    if (verifyGameState && verifyGameState.owner.equals(PROGRAM_ID)) {
      console.log("✅ Global Game State created successfully");
      console.log("   Size:", verifyGameState.data.length, "bytes");
      
      // Read next_expedition_id from byte offset 40 (32 authority + 8 discriminator)
      const nextExpeditionId = verifyGameState.data.readBigUInt64LE(40);
      console.log("   Next Expedition ID:", nextExpeditionId.toString());
    }

    const verifyRewardPool = await connection.getAccountInfo(rewardPoolPDA);
    if (verifyRewardPool && verifyRewardPool.owner.equals(PROGRAM_ID)) {
      console.log("✅ Reward Pool created successfully");
      console.log("   Size:", verifyRewardPool.data.length, "bytes");
    }

    const verifyScrapMint = await connection.getAccountInfo(scrapMintPDA);
    if (verifyScrapMint && verifyScrapMint.owner.equals(TOKEN_PROGRAM_ID)) {
      console.log("✅ SCRAP Mint created successfully");
      console.log("   Owner:", verifyScrapMint.owner.toBase58());
    }

    const verifyRewardPoolATA = await connection.getAccountInfo(rewardPoolATA);
    if (verifyRewardPoolATA && verifyRewardPoolATA.owner.equals(TOKEN_PROGRAM_ID)) {
      console.log("✅ Reward Pool ATA created successfully");
      console.log("   Owner:", verifyRewardPoolATA.owner.toBase58());
    }

    console.log("\n🎉 Wasteland Runners is now ready for E2E testing!");
    console.log("\nNext steps:");
    console.log("1. Run the E2E test: npm run test:e2e");
    console.log("2. Check game state on Solscan:", `https://solscan.io/account/${globalGameStatePDA.toBase58()}?cluster=devnet`);

  } catch (error) {
    console.error("❌ Initialization failed:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("custom program error")) {
        console.error("This is likely a program-specific error. Check the program logs for details.");
      }
      if (error.message.includes("insufficient funds")) {
        console.error("Insufficient SOL for transaction fees. Please fund your wallet.");
      }
    }
    
    throw error;
  }
}

// Run the script
if (require.main === module) {
  initializeGame().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

export { initializeGame };