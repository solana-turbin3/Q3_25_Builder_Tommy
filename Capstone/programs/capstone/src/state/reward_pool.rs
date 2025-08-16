use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct RewardPool {
    pub authority: Pubkey,
    pub scrap_mint: Pubkey,
    pub bump: u8
}