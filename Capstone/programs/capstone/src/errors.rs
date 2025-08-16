use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // Existing errors from user instructions
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Expedition already started")]
    ExpeditionAlreadyStarted,
    #[msg("Expedition not active")]
    ExpeditionNotActive,
    #[msg("Already voted in this round")]
    AlreadyVoted,
    #[msg("Invalid vote")]
    InvalidVote,
    
    // New errors for Tuktuk integration
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("Insufficient funds in reward pool")]
    InsufficientFunds,
    #[msg("Invalid expedition status")]
    InvalidExpeditionStatus,
    #[msg("Round not ready to process")]
    RoundNotReady,
    #[msg("VRF request failed")]
    VrfRequestFailed,
    #[msg("Maximum retries exceeded")]
    MaxRetriesExceeded,
    #[msg("Invalid risk level")]
    InvalidRiskLevel,
    #[msg("Expedition not found")]
    ExpeditionNotFound,
    #[msg("Participant already joined")]
    ParticipantAlreadyJoined,
    #[msg("Vote already submitted")]
    VoteAlreadySubmitted,
    #[msg("Expedition not completed")]
    ExpeditionNotCompleted,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Math overflow")]
    Overflow,
    #[msg("Randomness already fulfilled")]
    RandomnessAlreadyFulfilled,
    #[msg("Invalid expedition")]
    InvalidExpedition,
    #[msg("Invalid round")]
    InvalidRound,
    #[msg("Invalid expedition account")]
    InvalidExpeditionAccount,
    #[msg("Invalid expedition ID")]
    InvalidExpeditionId,
    #[msg("Invalid account input")]
    InvalidAccountInput,
    #[msg("Rewards not distributed")]
    RewardsNotDistributed,
    #[msg("Rewards already claimed")]
    RewardsAlreadyClaimed,
}