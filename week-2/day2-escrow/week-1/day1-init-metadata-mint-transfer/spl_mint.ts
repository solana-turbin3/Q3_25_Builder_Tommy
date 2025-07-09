import { Keypair, PublicKey, Connection, Commitment } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import wallet from "../turbin3-wallet.json"

// Import our keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

//Create a Solana devnet connection
const commitment: Commitment = "confirmed";
const connection = new Connection("https://api.devnet.solana.com", commitment);

const token_decimals = 6;

function number_tokens(tokens: number): bigint {
    return BigInt(tokens * Math.pow(10, token_decimals));
}

// Mint address
const mint = new PublicKey("HKmw98z1e1shtoM6JYnbRzSuD1VdT1c9KrmrcgnfbaJZ");

(async () => {
    try {
        // Create an ATA
            const ata = await getOrCreateAssociatedTokenAccount(connection, keypair, mint, keypair.publicKey)
            console.log(`Your ata is: ${ata.address.toBase58()}`);

        // Mint to ATA
            const mintTx = await mintTo(connection, keypair, mint, ata.address, keypair.publicKey, number_tokens(500)); // be careful with decimal placement. 1n would mean 0.000001. changed this to an easier to read function.
            console.log(`Your mint txid: ${mintTx}`);
    } catch(error) {
        console.log(`Oops, something went wrong: ${error}`)
    }
})()
