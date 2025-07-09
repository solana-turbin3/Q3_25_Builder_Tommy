use anchor_lang::prelude::*;

// 📋 THE TRADE OFFER CONTRACT
// This is like a detailed contract posted on the trading card shop's bulletin board
// containing all the terms of the trade someone wants to make

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    // 🎲 UNIQUE TRADE ID: Allows maker to post multiple trade offers
    // (Like having trade offer #1, #2, #3 on the bulletin board)
    pub seed: u64,
    
    // 👤 WHO POSTED THIS TRADE: The trader's wallet address
    // (So we know who to contact if someone wants to accept)
    pub maker: Pubkey,
    
    // 🏷️ WHAT THEY'RE OFFERING: Pokemon card type (what they give away)
    pub mint_a: Pubkey,
    
    // 🏷️ WHAT THEY WANT: Baseball card type (what they want to receive)
    pub mint_b: Pubkey,
    
    // 💰 HOW MANY THEY WANT: Number of Baseball cards they want to receive
    // (Like "I want 3 Baseball cards for my 5 Pokemon cards")
    pub receive: u64,
    
    // 🔐 PDA BUMP: Technical detail for creating the contract's address
    pub bump: u8,
}

// 📝 WHAT'S MISSING FROM THIS CONTRACT:
// - How many Pokemon cards they're offering (mint_a amount)
// - Where their Pokemon cards are currently stored
// - Where the escrow vault will hold the cards during the trade
//
// 💭 This struct just stores the TERMS of the trade, not the actual tokens!
