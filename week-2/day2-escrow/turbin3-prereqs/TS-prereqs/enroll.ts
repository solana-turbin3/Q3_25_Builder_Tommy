import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js"
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor"
import { IDL, Turbin3Prereq } from "./programs/Turbin3_prereq"
import wallet from "./Turbin3-wallet.json"

const MPL_CORE_PROGRAM_ID = new
PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

// Import our dev wallet keypair from the wallet file
const keypair = Keypair.fromSecretKey(new Uint8Array(wallet));

// Create a devnet connection
const connection = new Connection("https://api.devnet.solana.com");

// Create our anchor provider
const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: "confirmed"
});

// Create our program
const program : Program<Turbin3Prereq> = new Program(IDL, provider);

console.log("Available methods:", Object.keys(program.methods));

// Create the PDA for our enrollment account
const account_seeds = [
    Buffer.from("prereqs"),
    keypair.publicKey.toBuffer(),
];

const [account_key, _account_bump] = 
    PublicKey.findProgramAddressSync(account_seeds, program.programId);


const mintCollection = new PublicKey("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2");
const mintTs = Keypair.generate();

// Authority PDA (the other hint from tutorial)
const authority_seeds = [
    Buffer.from("collection"),
    mintCollection.toBuffer(),
];

const [authority_key, _authority_bump] = 
    PublicKey.findProgramAddressSync(authority_seeds, program.programId);


const RUN_INITIALIZE = false;
const RUN_SUBMIT_TS = true;

////////////TRANSACITONS NEXT////////////////////

// Execute the initialize transaction
if (RUN_INITIALIZE) {
    (async () => {
        try {
            const txhash = await program.methods
                .initialize("7ommyzero")  // my username here, replace the placeholder thingy
                .accountsPartial({
                    user: keypair.publicKey,
                    account: account_key,
                    system_program: SystemProgram.programId,
                })
                .signers([keypair])
                .rpc();
            console.log(`Success! Check out your TX here:
https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
        } catch (e) {
            console.error(`Oops, something went wrong: ${e}`);
        }
    })();
}

// Execute the submitTs transaction
if (RUN_SUBMIT_TS) {
    (async () => {
        try {
            const txhash = await (program.methods as any) // i forced the acceptance of .sumbitTs() here with "as any", but i realize i could have changed it in the IDL itself, which is probably easier and more proper!
                .submitTs()
                .accountsPartial({
                    user: keypair.publicKey,
                    account: account_key,
                    mint: mintTs.publicKey,
                    collection: mintCollection,
                    authority: authority_key,
                    mpl_core_program: MPL_CORE_PROGRAM_ID,
                    system_program: SystemProgram.programId,
                })
                .signers([keypair, mintTs])
                .rpc();
            console.log(`Success! Check out your TX here:
https://explorer.solana.com/tx/${txhash}?cluster=devnet`);
        } catch (e) {
            console.error(`Oops, something went wrong: ${e}`);
        }
    })();
}