use std::fs;
use litesvm::LiteSVM;
use solana_sdk::{
    account::AccountSharedData,
    instruction::{Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
    transaction::Transaction,
};

#[tokio::test]
async fn test_hello_world() {
    let mut svm = LiteSVM::new();
    let program_id = "B6fjKKwLEwWNUJ6JiSPSwLVJSz6ZjtCVi4gjqxbQYT7d".parse().unwrap();
    
    let program_name = env!("CARGO_PKG_NAME").replace('-', "_");
    let program_path = format!("target/deploy/{}.so", program_name);
    let program_bytes = fs::read(&program_path)
        .unwrap_or_else(|e| panic!("Failed to read program bytes at {}: {}", program_path, e));
    svm.add_program(program_id, &program_bytes);
    
    let payer = Keypair::new();
    let payer_account = AccountSharedData::new(1_000_000_000, 0, &system_program::id());
    svm.set_account(payer.pubkey(), payer_account.into()).unwrap();
    
    let discriminator = [11, 235, 52, 244, 76, 66, 25, 71]; // hello_world discriminator
    let instruction = Instruction::new_with_bytes(
        program_id,
        &discriminator,
        vec![],
    );
    
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        svm.latest_blockhash(),
    );
    
    let result = svm.send_transaction(transaction);
    assert!(result.is_ok(), "Transaction failed: {:?}", result.err());
    
    println!("✅ Hello world test passed!");
}