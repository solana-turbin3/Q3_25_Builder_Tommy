use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{MasterEditionAccount, Metadata, MetadataAccount},
    token_interface::{transfer_checked, TransferChecked, Mint, TokenAccount, TokenInterface},
};

use crate::state::{listing::Listing, marketplace::Marketplace};

#[derive(Accounts)]
#[instruction(name: String)]

pub struct List<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(
        seeds = [b"marketplace", name.as_str().as_bytes()],
        bump = marketplace.bump,
    )]
    pub marketplace: Account<'info, Marketplace>,

    pub maker_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = maker_mint,
        associated_token::authority = maker,
    )]
    pub maker_ata: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        init,
        payer = maker,
        seeds = [marketplace.key().as_ref(), maker_mint.key().as_ref()], // no binary string, to find the nft we associate with the marketplace and maker mint
        bump,
        space = 8 + Listing::INIT_SPACE,
    )]
    pub listing: Account<'info, Listing>,

    #[account(
        init,
        payer = maker,
        associated_token::mint = maker_mint,
        associated_token::authority = listing,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>, // the listing pda controls the vault that holds the NFT

    pub collection_mint: InterfaceAccount<'info, Mint>,

    #[account(                                                              // First check, the metadata of the NFT --->
        seeds = [                                                           // Here's the secret recipe to find the right metadata for the NFT:
            b"metadata",                                                    // Ingredient #1: The word "metadata".
            metadata_program.key().as_ref(),                                // Ingredient #2: The official Metadata program address.
            maker_mint.key().as_ref(),                                      // Ingredient #3: The NFT's own unique address.
        ],                                                                  // End of the recipe.
        seeds::program = metadata_program.key(),                            // We promise: The official Metadata program is the one who made this info card.
        bump,                                                               // 
        constraint = metadata.collection.as_ref().unwrap().key.as_ref() == collection_mint.key().as_ref(), // Rule #1: The NFT must be in the right collection.
        constraint = metadata.collection.as_ref().unwrap().verified == true,                               // Rule #2: That collection must have an official "verified" sticker.
    )]                                                                   // End of our checks for this account.
    pub metadata: Account<'info, MetadataAccount>,                     // This is the NFT's metadata we've been checking.

    #[account(                                                              // Now for the second check, the certificate of authenticity ----->
        seeds = [                                                           // Another secret recipe to find the official certificate:
            b"metadata",                                                    // Ingredient #1: The word "metadata".
            metadata_program.key().as_ref(),                                // Ingredient #2: The official Metadata address.
            maker_mint.key().as_ref(),                                      // Ingredient #3: The NFT's own unique address.
            b"edition",                                                     // Ingredient #4: The special word "edition" to find the certificate.
        ],                                                                  // End of this recipe.
        seeds::program = metadata_program.key(),                            // We promise again: The official Metadata made this certificate.
        bump,                                                               
    )]                                                                  // End of our checks for the certificate.
    pub master_edition: Account<'info, MasterEditionAccount>,         // This is the "Certificate of Authenticity" that proves the NFT is real.

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> List<'info> {
    pub fn create_listing(&mut self, price: u64, bumps: &ListBumps) -> Result<()> {

        self.listing.set_inner(Listing { 
            maker: self.maker.key(), 
            maker_mint: self.maker_mint.key(), 
            price,
            bump: bumps.listing,
        });
        Ok(())
    }

    pub fn deposit_nft(&mut self) -> Result<()> {

        let cpi_program = self.token_program.to_account_info();

        let cpi_accounts = TransferChecked { 
            from: self.maker_ata.to_account_info(), 
            mint: self.maker_mint.to_account_info(), 
            to: self.vault.to_account_info(),
            authority: self.maker.to_account_info(), 
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        transfer_checked(cpi_ctx, self.maker_ata.amount, self.maker_mint.decimals)?; // This securely moves the NFT (amount=1) from the maker's wallet to the vault, checking its decimal count (0 for NFTs).

        Ok(())
    }

}