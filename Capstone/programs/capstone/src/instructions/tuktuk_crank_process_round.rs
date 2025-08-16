use anchor_lang::prelude::*;
use crate::state::{Expedition, ExpeditionStatus, ExpeditionRound, GlobalGameState, GuildPerformance};
use crate::constants::{MAX_ROUNDS, HIGH_RISK_SUCCESS_BPS, MED_RISK_SUCCESS_BPS, LOW_RISK_SUCCESS_BPS};
use tuktuk_program::RunTaskReturnV0;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ProcessRound<'info> {
    #[account(
        mut,
        seeds = [b"expedition", expedition.id.to_le_bytes().as_ref()],
        bump = expedition.bump,
        constraint = expedition.status == ExpeditionStatus::InProgress @ ErrorCode::ExpeditionNotActive
    )]
    pub expedition: Account<'info, Expedition>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + ExpeditionRound::INIT_SPACE,
        seeds = [
            b"expedition_round",
            expedition.id.to_le_bytes().as_ref(),
            expedition.current_round.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub expedition_round: Account<'info, ExpeditionRound>,
    
    #[account(
        mut,
        seeds = [b"global_game_state"],
        bump = global_game_state.bump,
    )]
    pub global_game_state: Account<'info, GlobalGameState>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

// GuildPerformance accounts are passed as remaining_accounts to determine the risk level chosen by the guild majority

pub fn handler(ctx: Context<ProcessRound>) -> Result<RunTaskReturnV0> {
    let current_time = Clock::get()?.unix_timestamp;
    let clock = Clock::get()?;
    let expedition_id = ctx.accounts.expedition.id;
    let current_round = ctx.accounts.expedition.current_round;
    
    msg!("Processing round {} for expedition {}", current_round, expedition_id);
    
    // simple randomness for testing (no VRF) - expedition_id + current_round + slot
    let pseudo_random = expedition_id.wrapping_add(current_round).wrapping_add(clock.slot);
    
    let risk_level_chosen = determine_guild_risk_level(&ctx.remaining_accounts, expedition_id)?;
    
    // Iinit expedition round
    {
        let expedition_round = &mut ctx.accounts.expedition_round;
        expedition_round.expedition_id = expedition_id;
        expedition_round.round_number = current_round as u8;
        expedition_round.round_start_time = current_time;
        expedition_round.round_end_time = Some(current_time);
        expedition_round.bump = ctx.bumps.expedition_round;
        expedition_round.winning_guild_id = None;
        expedition_round.risk_level_chosen = risk_level_chosen;
        
        let outcome = (pseudo_random % 100) as u8;
        expedition_round.outcome = outcome;
        
        let success_threshold = match risk_level_chosen {
            2 => 100 - (HIGH_RISK_SUCCESS_BPS / 100) as u8, // hi risk: 10% chance (90 threshold)
            1 => 100 - (MED_RISK_SUCCESS_BPS / 100) as u8,  // med risk: 30% chance (70 threshold)
            _ => 100 - (LOW_RISK_SUCCESS_BPS / 100) as u8,  // lo risk: 80% chance (20 threshold)
        };
        
        let is_success = outcome >= success_threshold;
        
        msg!("Round {} - Risk level: {}, Outcome: {}, Threshold: {}, Result: {}",
             expedition_round.round_number,
             risk_level_chosen,
             outcome,
             success_threshold,
             if is_success { "success" } else { "failure" });
    }
    
    // Helper function to determine the risk level based on guild voting
    fn determine_guild_risk_level(remaining_accounts: &[AccountInfo], expedition_id: u64) -> Result<u8> {
        if remaining_accounts.is_empty() {
            msg!("No guild performance accounts provided, defaulting to low risk (0)");
            return Ok(0);
        }
        
        let mut total_high_votes = 0u32;
        let mut total_medium_votes = 0u32;
        let mut total_low_votes = 0u32;
        
        for account_info in remaining_accounts {
            if account_info.data_len() < 8 {
                continue;
            }
            
            match GuildPerformance::try_deserialize(&mut &account_info.data.borrow()[8..]) {
                Ok(guild_performance) => {
                    // verify this is for the correct expedition
                    if guild_performance.expedition_id == expedition_id {
                        total_high_votes += guild_performance.current_round_vote_tally[0] as u32;
                        total_medium_votes += guild_performance.current_round_vote_tally[1] as u32;
                        total_low_votes += guild_performance.current_round_vote_tally[2] as u32;
                        
                        msg!("Guild {} votes: [H:{}, M:{}, L:{}]",
                             guild_performance.guild_id,
                             guild_performance.current_round_vote_tally[0],
                             guild_performance.current_round_vote_tally[1],
                             guild_performance.current_round_vote_tally[2]);
                    }
                }
                Err(_) => {
                    // not a GuildPerformance account, skip
                    continue;
                }
            }
        }
        
        // determine majority vote
        let chosen_risk_level = if total_high_votes >= total_medium_votes && total_high_votes >= total_low_votes {
            2 // hi risk
        } else if total_medium_votes >= total_low_votes {
            1 // med risk
        } else {
            0 // lo risk
        };
        
        msg!("Vote totals - High: {}, Medium: {}, Low: {} -> Chosen: {}",
             total_high_votes, total_medium_votes, total_low_votes, chosen_risk_level);
        
        Ok(chosen_risk_level)
    }
    
    msg!("Pseudo-randomness generated for expedition {} round {}: {}", 
         expedition_id, current_round, pseudo_random);
    
    let next_round = {
        let expedition = &mut ctx.accounts.expedition;
        expedition.current_round = expedition.current_round
            .checked_add(1)
            .ok_or(error!(ErrorCode::MathOverflow))?;
        expedition.current_round
    };
    
    if next_round >= MAX_ROUNDS as u64 {
        msg!("All rounds completed for expedition {}", expedition_id);
    } else {
        msg!("Round {} completed for expedition {}, next round: {}",
             current_round, expedition_id, next_round);
    }
    
    Ok(RunTaskReturnV0 {
        tasks: vec![],
        accounts: vec![],
    })
}

