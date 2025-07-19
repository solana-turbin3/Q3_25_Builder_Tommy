use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};
use anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface, CloseAccount, close_account, transfer_checked, TransferChecked}, associated_token::AssociatedToken};

use crate::state::{listing::Listing, marketplace::Marketplace};

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    taker: Signer<'info>,

    #[account(mut)]
    maker: SystemAccount<'info>,                 

    maker_mint: InterfaceAccount<'info, Mint>,


    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    marketplace: Account<'info, Marketplace>,


    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = maker_mint,
        associated_token::authority = taker,
    )]
    taker_ata: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        associated_token::authority = listing,
        associated_token::mint = maker_mint,
    )]
    vault: InterfaceAccount<'info, TokenAccount>,


    #[account(
        mut,
        seeds = [b"rewards", marketplace.key().as_ref()],
        bump = marketplace.rewards_bump,
        mint::decimals = 6,
        mint::authority = marketplace,
    )]
    rewards: InterfaceAccount<'info, Mint>, // interfaceaccount accesses the solana program instructions in Mint


    #[account(
        mut,
        close = maker,                     // we close the maker's Listing Account after the purchase is complete, and the rent gets sent back to the maker. Anchor handles this automatically after all our functions are executed.
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()],
        bump = listing.bump,
    )]
    listing: Account<'info, Listing>,


    #[account(
        seeds = [b"treasury", marketplace.key().as_ref()],
        bump = marketplace.treasury_bump,
    )]
    treasury: SystemAccount<'info>, // systemaccount because it only transfers lamports


    associated_token_program: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    token_program: Interface<'info, TokenInterface>,
}

impl<'info> Purchase<'info> {                                                   // The Purchase implementation contains three critical functions that execute the complete NFT purchase flow
    pub fn send_sol(&self) -> Result<()> {                                      // 💰 STEP 1: Handle all SOL payments - split between seller and marketplace
        let accounts = Transfer {                                               // First payment setup: Taker pays most of the price to the Maker (seller)
            from: self.taker.to_account_info(),                                 // Money flows FROM: The buyer (taker) who's purchasing the NFT
            to: self.maker.to_account_info(),                                   // Money flows TO: The original seller (maker) who listed the NFT
        };                                                                      // End of the first payment routing

        let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), accounts); // Create the payment context using Solana's System Program for SOL transfers

        let amount = self.listing.price                                 // Calculate the marketplace fee that needs to be deducted:
            .checked_mul(self.marketplace.fee as u64).unwrap()               // Take the listing price × marketplace fee percentage (e.g., 250 = 2.5%)
            .checked_div(10000).unwrap();                                       // Divide by 10000 to convert basis points to actual fee amount

        transfer(cpi_ctx, self.listing.price - amount)?;               // Execute the main payment: Send (listing price - marketplace fee) to the seller

        let accounts = Transfer {                                 // Second payment setup: Taker pays marketplace fee to Treasury
            from: self.taker.to_account_info(),                                 // Money flows FROM: Same buyer (taker) - they pay both amounts
            to: self.treasury.to_account_info(),                                // Money flows TO: The marketplace treasury (collects fees)
        };                                                                      // End of the second payment routing

        let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), accounts); // Create second payment context for the fee transfer

        transfer(cpi_ctx, amount)                                               // Execute the fee payment: Send the calculated marketplace fee to treasury

                                                             // ==========================================================================================================
    }                                                        // =============== End of SOL distribution - seller gets most money, marketplace gets its cut ===============
                                                            // ==========================================================================================================


    pub fn send_nft(&mut self) -> Result<()> {                                  // 🖼️ STEP 2: Transfer the NFT from escrow to buyer - this is the main event!
        let seeds = &[                                                          
            &self.marketplace.key().to_bytes()[..],                             // Ingredient #1: The marketplace's unique address (as bytes)
            &self.maker_mint.key().to_bytes()[..],                              // Ingredient #2: The NFT's unique mint address (as bytes)
            &[self.listing.bump],                                               // Ingredient #3: The bump seed that makes this PDA address valid
        ];                                                                      // End of the PDA signature recipe
        let signer_seeds = &[&seeds[..]];                       // Package the seeds for Anchor to use as signing authority

        let accounts = TransferChecked {                   // Setup the NFT transfer parameters - this is a secure token transfer:
            from: self.vault.to_account_info(),                                 // NFT source: The escrow vault (controlled by listing PDA)
            to: self.taker_ata.to_account_info(),                               // NFT destination: The buyer's token account (receives the NFT)
            authority: self.listing.to_account_info(),                          // Transfer authority: The listing PDA (signs using the seeds above)
            mint: self.maker_mint.to_account_info(),                            // NFT mint: Used to verify this is the correct token being transferred
        };                                                                      // End of transfer setup

        let cpi_ctx = CpiContext::new_with_signer(        // Create transfer context WITH the PDA signature capability:
            self.token_program.to_account_info(),                               // Use the Token Program to handle the NFT transfer
            accounts,                                                           // Pass the transfer parameters we just set up
            signer_seeds,                                                       // Include the PDA seeds so listing can sign on behalf of the vault
        );                                                                      // End of CPI context creation

        transfer_checked(cpi_ctx, 1, self.maker_mint.decimals)           // Execute the transfer: Move exactly 1 NFT (amount=1) with decimal verification

    }                                                         // ==========================================================================================================
                                                              // ============== End of NFT transfer - buyer now owns the NFT! =============================================
                                                              // ==========================================================================================================

    pub fn close_mint_vault(&mut self) -> Result<()> {                          // 🧹 STEP 3: Clean up by closing the vault and refunding rent to seller
        let seeds = &[                                             // Recreate the same PDA signature recipe (listing needs to sign for closure):
            &self.marketplace.key().to_bytes()[..],                             // Ingredient #1: Marketplace address (same as NFT transfer)
            &self.maker_mint.key().to_bytes()[..],                              // Ingredient #2: NFT mint address (same as NFT transfer)
            &[self.listing.bump],                                               // Ingredient #3: Listing bump (same as NFT transfer)
        ];                                                                      // End of PDA signature recipe
        let signer_seeds = &[&seeds[..]];                       // Package seeds for signing authority

        let accounts = CloseAccount {                         // Setup account closure parameters:
            account: self.vault.to_account_info(),                              // Account to close: The vault that held the NFT (now empty)
            destination: self.maker.to_account_info(),                          // Rent refund goes to: The original seller (maker)
            authority: self.listing.to_account_info(),                          // Closure authority: The listing PDA (same authority that transferred the NFT)
        };                                                                      // End of closure setup

        let cpi_ctx = CpiContext::new_with_signer(// Create closure context WITH PDA signing capability:
            self.token_program.to_account_info(),                       // Use Token Program to close the token account
            accounts,                                                           // Pass the closure parameters
            signer_seeds                                                        // Include PDA seeds for signing authority
        );                                                                      // End of CPI context

        close_account(cpi_ctx)                                                  // Execute closure: Close vault & send remaining rent lamports to seller
    }                                                                           // End of cleanup - all temporary accounts closed, rent refunded, including the rent in the Listings account, returned to maker.
}                                                                               // End of Purchase implementation - complete transaction flow executed!