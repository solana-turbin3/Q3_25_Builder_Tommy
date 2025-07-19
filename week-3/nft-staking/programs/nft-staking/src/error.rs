use anchor_lang::prelude::*;

#[error_code]
pub enum StakeError {
    #[msg("Maximum stake limit reached")]
    MaxStakeReached,
    
    #[msg("No tokens currently staked by user")]
    NoStakedTokens,
    
    #[msg("Cannot unstake yet - freeze period has not expired")]
    FreezePeriodNotExpired,
    
    #[msg("Cannot unstake - not the original staker of this NFT")]
    NotOriginalStaker,
    
    #[msg("Invalid stake account for this NFT")]
    InvalidStakeAccount,
}