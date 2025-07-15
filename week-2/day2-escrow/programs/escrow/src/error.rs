use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Not enough taker balance")]
    InsufficientTakerBalance,
    #[msg("Not enough maker balance")]
    InsufficientMakerBalance,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Invalid amount")]
    InvalidAmount,
}
