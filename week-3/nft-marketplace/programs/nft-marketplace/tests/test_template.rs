use std::fs;
use litesvm::LiteSVM;
use solana_sdk::{
    account::AccountSharedData,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

#[tokio::test]
async fn test_hello_world() {
    // Initialize the LiteSVM instance
    let mut svm = LiteSVM::new();
    
    // Program ID for our template program - must match the declare_id! in lib.rs
    let program_id = "2kiY1JNDe8CYxQK2UAkXSNiRdK52aMkHbUAWWfyJL4hY".parse().unwrap();
    
    // Load the compiled program - it's in this program's target/deploy directory
    let program_name = env!("CARGO_PKG_NAME").replace('-', "_");
    let program_path = format!("target/deploy/{}.so", program_name);
    let program_bytes = fs::read(&program_path)
        .unwrap_or_else(|e| panic!("Failed to read program bytes at {}: {}", program_path, e));
    svm.add_program(program_id, &program_bytes);
    
    // Create a keypair for the transaction
    let payer = Keypair::new();
    
    // Fund the payer account
    let payer_account = AccountSharedData::new(1_000_000_000, 0, &system_program::id());
    svm.set_account(payer.pubkey(), payer_account.into()).unwrap();
    
    // Create the instruction for hello_world with proper Anchor discriminator from IDL
    let discriminator = [11, 235, 52, 244, 76, 66, 25, 71]; // hello_world discriminator
    let instruction = Instruction::new_with_bytes(
        program_id,
        &discriminator,
        vec![], // No accounts needed for hello_world
    );
    
    // Create and send the transaction
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );
    
    // Process the transaction
    let result = svm.send_transaction(transaction);
    
    // Assert the transaction was successful
    assert!(result.is_ok(), "Transaction failed: {:?}", result.err());
    
    println!("✅ Hello world test passed!");
}