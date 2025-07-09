#![allow(unexpected_cfgs, deprecated)]

// 🏪 TRADING CARD SHOP ESCROW ANALOGY:
// This is like posting a trade offer on the shop's bulletin board!
// "I want to trade 5 of my Pokemon cards for 3 Baseball cards"

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,  // 🔧 Tool for creating associated token accounts
    token_interface::{Mint, TokenAccount, TokenInterface, TransferChecked}, // 🔧 TransferChecked = secure token transfers with amount/decimals verification
};

use crate::state::Escrow;

// 📝 THE "MAKE" INSTRUCTION: When someone wants to POST a trade offer
// Like walking into the trading card shop and saying:
// "I want to trade my Pokemon cards for Baseball cards - here are my terms!"
#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct Make<'info> {
    // 👤 THE TRADER: Person posting the trade offer (must sign and pay for posting)
    #[account(mut)]
    pub maker: Signer<'info>,

    // 🏷️ WHAT I'M OFFERING: Pokemon card type (mint_a = what I give)
    #[account(
        mint::token_program = token_program,
    )]
    pub mint_a: InterfaceAccount<'info, Mint>,
    
    // 🏷️ WHAT I WANT: Baseball card type (mint_b = what I want to receive)
    #[account(
        mint::token_program = token_program,
    )]
    pub mint_b: InterfaceAccount<'info, Mint>,

    // 💳 MY POKEMON CARD WALLET: Where my Pokemon cards currently live
    // (I need to prove I actually own Pokemon cards to make this trade offer!)
    #[account(
        mut,
        associated_token::mint = mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_ata_a: InterfaceAccount<'info, TokenAccount>,

    // 📋 THE TRADE OFFER BOARD: PDA account storing my trade details
    // Like a contract posted on the shop's bulletin board with all the terms
    // Seeds include my pubkey + unique seed so I can make multiple offers
    //
    // 🔢 SEED CONVERSION: seed.to_le_bytes() converts the u64 seed to little-endian bytes
    // This ensures consistent PDA generation across all clients/systems
    // Example: seed=1 becomes [1,0,0,0,0,0,0,0] in little-endian format
    //
    // 🎯 MULTIPLE OFFERS: Different seed values create different PDA addresses:
    // - seed=1 → PDA_1 → "Trade Offer #1"
    // - seed=2 → PDA_2 → "Trade Offer #2"
    // - seed=3 → PDA_3 → "Trade Offer #3"
    //
    // 💡 SINGLE OFFER VERSION: If we only wanted one offer per maker, we'd use:
    // seeds = [b"escrow", maker.key().as_ref()] (no seed parameter needed)
    #[account(
        init,
        payer = maker,
        seeds = [b"escrow", maker.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump,
        space = 8 + Escrow::INIT_SPACE,
    )]
    pub escrow: Account<'info, Escrow>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = mint_a, 
        associated_token::authority = escrow,
        associated_token::token_program = token_program,
        // doesn't need space because its owned by the token program so it knows its space
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    // 🔧 REQUIRED SOLANA PROGRAMS:
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,    // Token specialist (handles secure transfers)
    pub system_program: Program<'info, System>,             // General manager (creates accounts, moves SOL)

    // 🚧 WHAT HAPPENS NEXT (still missing):
    // 1. Store trade terms in escrow account ✅ (we have the PDA)
    // 2. Create vault to hold my tokens ❌ (need vault_a account)
    // 3. Transfer my tokens to vault ❌ (need transfer logic)
    // 4. Wait for someone to "take" this offer ❌ (need take instruction)
    //
    // 💭 CURRENT STATE: This just posts the offer, doesn't move tokens yet!
}

///////////////BUSINESS LOGIC//////////////////////


impl<'info> Make<'info> {
    // 🏪 ALICE POSTS HER TRADE OFFER: "I want to trade my Pokemon cards for Baseball cards!"
    // This function is like Alice walking up to the trading card shop bulletin board
    // and filling out a trade offer form with all her requirements
    pub fn make(&mut self, seed: u64, receive: u64, bumps: &MakeBumps) -> Result<()> {

        // 📝 FILLING OUT THE TRADE OFFER FORM: Alice writes down all her trade details
        // This is like taking a blank "Trade Offer" form and filling in every field
        // The form gets posted on the bulletin board for everyone to see
        self.escrow.set_inner(Escrow {
            // 🎲 TRADE OFFER NUMBER: "This is my trade offer #1, #2, #3, etc."
            // Allows Alice to post multiple different trade offers simultaneously
            seed,
            
            // 👤 WHO'S MAKING THIS OFFER: "This trade offer is posted by Alice"
            // Alice's wallet signature proves she really posted this offer
            maker: self.maker.key(),
            
            // 🏷️ WHAT I'M OFFERING: "I'm offering Pokemon cards (mint_a)"
            // This identifies the specific type of Pokemon cards Alice has
            mint_a: self.mint_a.key(),
            
            // 🏷️ WHAT I WANT IN RETURN: "I want Baseball cards (mint_b)"
            // This identifies the specific type of Baseball cards Alice wants
            mint_b: self.mint_b.key(),
            
            // 💰 HOW MANY I WANT: "I want exactly 3 Baseball cards for my Pokemon cards"
            // Alice specifies the quantity she wants to receive
            receive,
            
            // 🔐 BULLETIN BOARD LOCATION: Technical detail for where this form is posted
            // The bump ensures this trade offer has a unique address on the blockchain
            bump: bumps.escrow,
        });

        // ✅ TRADE OFFER POSTED SUCCESSFULLY: "Alice's offer is now on the bulletin board!"
        // At this point:
        // ✅ Alice's trade terms are stored and visible to everyone
        // ✅ A vault (safe storage box) has been created for her Pokemon cards
        // ❌ BUT Alice hasn't put her Pokemon cards in the vault yet!
        // ❌ Anyone trying to accept this trade would find an empty vault
        //
        // 🚧 NEXT STEPS NEEDED (not implemented yet):
        // 1. Transfer Alice's Pokemon cards from her wallet → vault
        // 2. Implement "take" instruction for someone to accept the trade
        // 3. Implement "refund" instruction for Alice to cancel and get cards back
        Ok (())
    }
}