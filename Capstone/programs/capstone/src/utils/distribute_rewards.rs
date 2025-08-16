use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::{Expedition, UserExpeditionParticipation};
use crate::errors::ErrorCode;

/// Distribute rewards equally among all expedition participants
/// Returns the amount distributed per participant
pub fn distribute_rewards_equally<'info>(
    expedition: &Expedition,
    participant_count: u64,
    reward_amount: u64,
    from_account: &Account<'info, TokenAccount>,
    from_authority: &AccountInfo<'info>,
    token_program: &Program<'info, Token>,
    participants: &[UserExpeditionParticipation],
    participant_token_accounts: &[Account<'info, TokenAccount>],
) -> Result<u64> {
    // Validate we have participants
    if participant_count == 0 {
        msg!("No participants to distribute rewards to");
        return Ok(0);
    }
    
    // Calculate reward per participant
    let reward_per_participant = reward_amount
        .checked_div(participant_count)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    msg!(
        "Distributing {} tokens to {} participants ({} each)",
        reward_amount,
        participant_count,
        reward_per_participant
    );
    
    // Distribute to each participant
    for (i, participant) in participants.iter().enumerate() {
        // Only distribute to participants who joined this expedition
        if participant.expedition_id != expedition.id {
            continue;
        }
        
        if i >= participant_token_accounts.len() {
            msg!("Warning: Not enough token accounts provided for all participants");
            break;
        }
        
        let participant_token_account = &participant_token_accounts[i];
        
        // Transfer tokens to participant
        let cpi_accounts = Transfer {
            from: from_account.to_account_info(),
            to: participant_token_account.to_account_info(),
            authority: from_authority.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
        
        token::transfer(cpi_ctx, reward_per_participant)?;
        
        msg!(
            "Distributed {} tokens to participant {}",
            reward_per_participant,
            participant.user
        );
    }
    
    Ok(reward_per_participant)
}

/// Calculate total rewards based on expedition performance
/// Base reward + bonus for rounds completed (max 4 rounds)
pub fn calculate_total_rewards(
    base_reward: u64,
    rounds_completed: u64,
) -> Result<u64> {
    // Calculate round bonus based on 4 total rounds
    let round_bonus = match rounds_completed {
        0 => 0,       // No rounds completed: 0% bonus
        1 => 10,      // 1 round completed: 10% bonus
        2 => 25,      // 2 rounds completed: 25% bonus
        3 => 50,      // 3 rounds completed: 50% bonus
        4 => 100,     // All 4 rounds completed: 100% bonus
        _ => 100,     // Cap at max bonus if somehow more than 4
    };
    
    // Apply bonus as a percentage multiplier (100 + bonus) / 100
    let multiplier = 100u64
        .checked_add(round_bonus)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    let total_reward = base_reward
        .checked_mul(multiplier)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(100)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    msg!(
        "Total rewards: {} (base: {}, rounds: {}, bonus: {}%)",
        total_reward,
        base_reward,
        rounds_completed,
        round_bonus
    );
    
    Ok(total_reward)
}

/// Validate reward pool has sufficient balance
pub fn validate_reward_pool_balance(
    pool_balance: u64,
    required_amount: u64,
) -> Result<()> {
    if pool_balance < required_amount {
        msg!(
            "Insufficient reward pool balance: {} < {}",
            pool_balance,
            required_amount
        );
        return Err(error!(ErrorCode::InsufficientFunds));
    }
    
    Ok(())
}

/// Calculate rewards for a specific guild based on their performance
pub fn calculate_guild_rewards(
    guild_wins: u64,
    total_rounds: u64,
    base_reward: u64,
) -> Result<u64> {
    if total_rounds == 0 {
        return Ok(0);
    }
    
    // Calculate win percentage
    let win_percentage = guild_wins
        .checked_mul(100)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(total_rounds)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    // Apply win percentage as a multiplier
    let guild_reward = base_reward
        .checked_mul(win_percentage)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(100)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    msg!(
        "Guild reward: {} (wins: {}/{}, percentage: {}%)",
        guild_reward,
        guild_wins,
        total_rounds,
        win_percentage
    );
    
    Ok(guild_reward)
}