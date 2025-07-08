import { Commitment, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js"
import wallet from "../turbin3-wallet.json"
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";

// define decimals
const TOKEN_DECIMALS = 6;

function toTokenAmount(tokens: number): bigint {
    return BigInt(tokens * Math.pow(10, TOKEN_DECIMALS));
}

// We're going to import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

// Mint address
const mint = new PublicKey("HKmw98z1e1shtoM6JYnbRzSuD1VdT1c9KrmrcgnfbaJZ");

// Recipient address
const to = new PublicKey("DwFgED8ZcztuT4FourTdcDu5tAGrZPMXfjVbLbcMBCHf");

(async () => {
    try {
        // Get the token account of the fromWallet address, and if it does not exist, create it
        const fromAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey);
        // Get the token account of the toWallet address, and if it does not exist, create it
        const toAta = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, to);
        // Transfer the new token to the "toTokenAccount" we just created
        const transferTx = await transfer(
            connection,
            keypair,
            fromAta.address,
            toAta.address,
            keypair.publicKey,
            toTokenAmount(50),
        );
        console.log(`Transfer successful! Signature: ${transferTx}`);
    } catch(e) {
        console.error(`Oops, something went wrong: ${e}`)
    }
})();