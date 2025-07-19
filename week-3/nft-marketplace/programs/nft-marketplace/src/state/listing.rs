use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Listing { // this is the PDA holding NFT up for listing
    pub maker: Pubkey, // who did the listing
    pub maker_mint: Pubkey, // the unique mint of the NFT
    pub price: u64,
    pub bump: u8,
}