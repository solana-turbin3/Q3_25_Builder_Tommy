use anchor_lang::prelude::*;
use crate::constants::{HIGH_RISK_POINTS, MEDIUM_RISK_POINTS, LOW_RISK_POINTS};
use crate::state::{GuildPerformance, ExpeditionRound};

/// Calculate guild score based on expedition rounds and performance
/// Returns the total score gained from the expedition
pub fn calculate_guild_score(
    guild_performance: &mut GuildPerformance,
    expedition_rounds: &[ExpeditionRound],
    guild_id: u64,
) -> Result<u32> {
    let mut total_score = 0u32;
    let mut successful_rounds = 0u8;
    
    // Process each round
    for round in expedition_rounds {
        // Only count rounds where this guild was the winner
        if round.winning_guild_id == Some(guild_id) {
            // Calculate points based on risk level chosen
            let points = match round.risk_level_chosen {
                3 => HIGH_RISK_POINTS,   // High risk
                2 => MEDIUM_RISK_POINTS,  // Medium risk
                1 => LOW_RISK_POINTS,     // Low risk
                _ => 0,                   // Invalid or no risk
            };
            
            // Only add points if the round was successful
            // Success is determined by outcome >= 50 (simplified logic)
            if round.outcome >= 50 {
                total_score = total_score
                    .checked_add(points)
                    .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
                successful_rounds = successful_rounds
                    .checked_add(1)
                    .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
            }
        }
    }
    
    // Update guild performance stats
    guild_performance.total_risk_points = guild_performance.total_risk_points
        .checked_add(total_score)
        .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
    
    guild_performance.successful_rounds = guild_performance.successful_rounds
        .checked_add(successful_rounds)
        .ok_or(error!(crate::errors::ErrorCode::MathOverflow))?;
    
    guild_performance.total_rounds_participated = expedition_rounds.len() as u8;
    
    msg!("Guild {} scored {} points from expedition", guild_id, total_score);
    
    Ok(total_score)
}

/// Calculate winning guild from voting results
/// Returns the guild ID that won the most rounds
pub fn determine_winning_guild(
    expedition_rounds: &[ExpeditionRound],
) -> Option<u64> {
    use std::collections::HashMap;
    
    let mut guild_wins: HashMap<u64, u32> = HashMap::new();
    
    for round in expedition_rounds {
        if let Some(guild_id) = round.winning_guild_id {
            *guild_wins.entry(guild_id).or_insert(0) += 1;
        }
    }
    
    // Find the guild with the most wins
    guild_wins
        .into_iter()
        .max_by_key(|(_, wins)| *wins)
        .map(|(guild_id, _)| guild_id)
}

/// Calculate bonus points based on rounds completed
/// More rounds completed = higher bonus (4 rounds max)
pub fn calculate_round_bonus(rounds_completed: u64) -> u64 {
    match rounds_completed {
        0 => 0,       // No rounds completed: 0% bonus
        1 => 10,      // 1 round completed: 10% bonus
        2 => 25,      // 2 rounds completed: 25% bonus
        3 => 50,      // 3 rounds completed: 50% bonus
        4 => 100,     // All 4 rounds completed: 100% bonus
        _ => 100,     // Cap at max bonus if somehow more than 4
    }
}