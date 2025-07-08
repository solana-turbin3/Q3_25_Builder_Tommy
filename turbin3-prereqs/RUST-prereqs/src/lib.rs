#[cfg(test)]
mod tests {
    use solana_client::rpc_client::RpcClient;
    use solana_program::{pubkey::{self, Pubkey}, system_instruction::transfer};
    use solana_program::hash::hash;
    use solana_sdk::{
        message::Message,
        signature::{read_keypair_file, Keypair, Signer},
        transaction::Transaction,
        system_program,
        instruction::{AccountMeta, Instruction},
    };
    use std::{fs::read, str::FromStr};

    const RPC_URL: &str = "https://turbine-solanad-4cde.devnet.rpcpool.com/9a9da9cf-6db1-47dc-839a-55aca5c9c80a";

    
    #[test]
    fn keygen() {
        let kp = Keypair::new();

        println!("You've generated a new Solana wallet: {}", kp.pubkey().to_string());
        println!("");
        println!("To save your wallet, copy and paste the following into a JSON file:");
        println!("{:?}", kp.to_bytes());
    }
    
    #[test]
    fn claim_airdrop() {
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file.");

        let client = RpcClient::new(RPC_URL);

        match client.request_airdrop(&keypair.pubkey(), 2_000_000_000u64){
            Ok(sig) => {
                println!("Success! Check ur TX here:");
                println!("https://explorer.solana.com/tx/{}?cluster=devnet", sig);
            }
            Err(err) => {
                println!("Airdrop failed: {}", err);
            }
        }
    }
    
    #[test]
    fn transfer_sol() {

        // Load your devnet keypair from file
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");


        // Generate a signature from the keypair
        let pubkey = keypair.pubkey();
        let message_bytes = b"I verify my Solana Keypair!";
        let sig = keypair.sign_message(message_bytes);
        let sig_hashed = hash(sig.as_ref());

        match sig.verify(&pubkey.to_bytes(), &sig_hashed.to_bytes()) {
            true => println!("Signature verified"),
            false => println!("Verification failed"),
            }
        
        // Step 4: Define the destination (Turbin3) address
        let to_pubkey = Pubkey::from_str("4Ts3DXtN8EvFLn47BsPvFU25ghwiy7DmrYmPyzcaJYtg").unwrap();
        
        // Step 5: Connect to devnet
        let rpc_client = RpcClient::new(RPC_URL);

        // Step 6: Fetch recent blockhash
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        // Step 7: Create and sign the transaction
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, 1_000_000)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );

        // Step 8: Send the transaction and print tx
        let signature = rpc_client
        .send_and_confirm_transaction(&transaction)
        .expect("Failed to send transaction");

        println!("Success! Check out your TX here: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);
    }

    
    #[test]
    fn empty_wallet() {
            // Load your devnet keypair from file
        let keypair = read_keypair_file("dev-wallet.json").expect("Couldn't find wallet file");
        
        // Define the destination (Turbin3) address
        let to_pubkey = Pubkey::from_str("4Ts3DXtN8EvFLn47BsPvFU25ghwiy7DmrYmPyzcaJYtg").unwrap();
        
        // Connect to devnet
        let rpc_client = RpcClient::new(RPC_URL);

        // Fetch recent blockhash
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        // Step 2: Get current balance
        let balance = rpc_client
            .get_balance(&keypair.pubkey())
            .expect("Failed to get balance");

        // Step 3: Build a mock transaction to calculate fee
        let message = Message::new_with_blockhash(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance)],
            Some(&keypair.pubkey()),
            &recent_blockhash,
        );

        // Step 4: Estimate transaction fee
        let fee = rpc_client
            .get_fee_for_message(&message)
            .expect("Failed to get fee calculator");

        // Step 5: Create final transaction with balance minus fee
        let transaction = Transaction::new_signed_with_payer(
            &[transfer(&keypair.pubkey(), &to_pubkey, balance - fee)],
            Some(&keypair.pubkey()),
            &vec![&keypair],
            recent_blockhash,
        );       

        // Step 6: Send transaction and verify
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send final transaction");
            
            
        println!("Success! Entire balance transferred: https://explorer.solana.com/tx/{}/?cluster=devnet", signature);

    }

    #[test]
    fn submit_rs() {

        // 1. create solana client
        let rpc_client = RpcClient::new(RPC_URL);

        // 2. load signer keypair
        let signer = read_keypair_file("turbin3-wallet.json")
            .expect("Couldn't find wallet file");

        // 3. Define program and account public keys
        let mint = Keypair::new();
        let turbin3_prereq_program = Pubkey::from_str("TRBZyQHB3m68FGeVsqTK39Wm4xejadjVhP5MAZaKWDM").unwrap();
        let collection = Pubkey::from_str("5ebsp5RChCGK7ssRZMVMufgVZhd2kFbNaotcZ5UvytN2").unwrap();
        let mpl_core_program = Pubkey::from_str("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d").unwrap();

        let system_program = system_program::id();

        // 4. Get the PDA (Program Derived Address)

        let signer_pubkey = signer.pubkey();
        let seeds = &[b"prereqs", signer_pubkey.as_ref()];
        let (prereq_pda, _bump) = Pubkey::find_program_address(seeds, &turbin3_prereq_program);

        // 4.1 define authority dont forget!!!

        let authority_seeds = &[b"collection", collection.as_ref()];
        let (authority, _authority_bump) = Pubkey::find_program_address(authority_seeds, &turbin3_prereq_program);

        // 5. Prepare the instruction data (discriminator)
        let data = vec![77, 124, 82, 163, 21, 133, 181, 206];

        // 6. Define the accounts metadata
        let accounts = vec![
            AccountMeta::new(signer.pubkey(), true), // user signer
            AccountMeta::new(prereq_pda, false), // PDA account
            AccountMeta::new(mint.pubkey(), true), // mint keypair
            AccountMeta::new(collection, false), // collection
            AccountMeta::new_readonly(authority, false), // authority (PDA)
            AccountMeta::new_readonly(mpl_core_program, false), // mpl core program
            AccountMeta::new_readonly(system_program, false), // system program
        ];


        // 7. get recent blockhash
        let blockhash = rpc_client
            .get_latest_blockhash()
            .expect("Failed to get recent blockhash");

        // 8. Build instruction
        let instruction = Instruction {
            program_id: turbin3_prereq_program,
            accounts,
            data,
        };

        // 9. create and sign tx
        let transaction = Transaction::new_signed_with_payer(
            &[instruction], 
            Some(&signer.pubkey()),
            &[&signer, &mint],
            blockhash,
        );

        // 10. send and confirm tx

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .expect("Failed to send tx");

        println!("Check out your TX here:\nhttps://explorer.solana.com/tx/{}/?cluster=devnet", signature);

    }

}