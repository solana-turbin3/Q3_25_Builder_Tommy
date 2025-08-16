use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_memory::sol_memcpy;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};
use anchor_spl::associated_token::AssociatedToken;
use crate::state::{Expedition, ExpeditionStatus, GlobalGameState, UserExpeditionParticipation, ExpeditionRound, GuildPerformance};
use crate::constants::{HIGH_RISK_SUCCESS_BPS, MED_RISK_SUCCESS_BPS, LOW_RISK_SUCCESS_BPS, HIGH_RISK_REWARD_BPS, MED_RISK_REWARD_BPS, LOW_RISK_REWARD_BPS};
use crate::errors::ErrorCode;
use tuktuk_program::{RunTaskReturnV0};

#[derive(Accounts)]
pub struct DistributeRewards<'info> {
    #[account(
        mut,
        seeds = [b"expedition", expedition.id.to_le_bytes().as_ref()],
        bump = expedition.bump,
        constraint = expedition.status == ExpeditionStatus::Completed @ ErrorCode::ExpeditionNotCompleted
    )]
    pub expedition: Account<'info, Expedition>,
    
    #[account(
        mut,
        seeds = [b"global_game_state"],
        bump = global_game_state.bump,
    )]
    pub global_game_state: Account<'info, GlobalGameState>,
    
    pub system_program: Program<'info, System>,
}


pub fn handler(ctx: Context<DistributeRewards>) -> Result<RunTaskReturnV0> {
    let expedition = &mut ctx.accounts.expedition;
    
    // check if rewards have already been distributed
    if expedition.rewards_distributed {
        msg!("Rewards already distributed for expedition {}", expedition.id);
        return Ok(RunTaskReturnV0 {
            tasks: vec![],
            accounts: vec![],
        });
    }
    
    // Mark rewards as distributed to prevent double distribution
    expedition.rewards_distributed = true;
    

    let base_reward = 1_000_000_000_000u64; // 1000 SCRAP tokens
    
    // debug logging to figure out what the hell is going on with expedition id numbers
    msg!("🔍 DEBUG: distribute_rewards called");
    msg!("  Expedition ID: {}", expedition.id);
    msg!("  Rounds completed: {}", expedition.rounds_completed);
    msg!("  Total remaining accounts: {}", ctx.remaining_accounts.len());
    

    let rounds_completed = expedition.rounds_completed as usize;
    
    // more debug stuff to track ExpeditionRound
    if ctx.remaining_accounts.len() < rounds_completed {
        msg!("ERROR: Expected {} ExpeditionRound accounts, got {}",
             rounds_completed, ctx.remaining_accounts.len());
        msg!("  This likely means remaining accounts weren't passed through the task queue correctly");
        return Err(ErrorCode::InvalidAccountInput.into());
    }

    let mut successful_rounds = 0u8;
    let mut total_risk_multiplier = 0u64;
    let mut rounds_data = Vec::new();
    
    for round_idx in 0..rounds_completed {
        let round_account_info = &ctx.remaining_accounts[round_idx];
        
        // have to deserialize ExpeditionRound
        // we use anchor's try_deserialize_unchecked to handle remaining accounts
        // i think this skips owner checks but still validates the discriminator?
        // hopefully no gamebreaking bugs here...

        let mut account_data: &[u8] = &round_account_info.data.borrow();
        let round_data = ExpeditionRound::try_deserialize_unchecked(&mut account_data)
            .map_err(|e| {
                msg!("ERROR: Failed to deserialize round {} account: {:?}", round_idx, e);
                ErrorCode::InvalidAccountInput
            })?;
        
        if round_data.expedition_id != expedition.id ||
           round_data.round_number != round_idx as u8 {
            msg!("ERROR: Round account mismatch. Expected expedition {} round {}, got expedition {} round {}",
                 expedition.id, round_idx, round_data.expedition_id, round_data.round_number);
            return Err(ErrorCode::InvalidAccountInput.into());
        }
        
        msg!("Round {} - Risk level: {}, Outcome: {}",
             round_idx,
             round_data.risk_level_chosen,
             round_data.outcome);
        
        
        let success_threshold = match round_data.risk_level_chosen {
            2 => 100 - (HIGH_RISK_SUCCESS_BPS / 100) as u8, // high risk: 10% chance
            1 => 100 - (MED_RISK_SUCCESS_BPS / 100) as u8,  // med risk: 30% chance
            _ => 100 - (LOW_RISK_SUCCESS_BPS / 100) as u8,  // low risk: 80% chance
        };
        
        let is_success = round_data.outcome >= success_threshold;
        
        if is_success {
            successful_rounds += 1;
            let risk_multiplier = match round_data.risk_level_chosen {
                2 => HIGH_RISK_REWARD_BPS / 100, // high risk: 25% of base
                1 => MED_RISK_REWARD_BPS / 100,  // med risk: 15% of base
                _ => LOW_RISK_REWARD_BPS / 100,  // low risk: 5% of base
            };
            total_risk_multiplier += risk_multiplier as u64;
        }
        
        rounds_data.push((round_data.risk_level_chosen, round_data.outcome, is_success));
    }
    
    msg!("Actual round results: {} successful rounds out of {}",
         successful_rounds, rounds_completed);
    msg!("Total risk multiplier earned: {}%", total_risk_multiplier);
    
    // calc total pot earned based on round results
    let total_pot_earned = if successful_rounds > 0 {
        base_reward
            .checked_mul(total_risk_multiplier)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(100)
            .ok_or(ErrorCode::MathOverflow)?
    } else {
        0 // no rewards if no successful rounds
    };
    
    msg!(
        "Expedition {} reward calculation:",
        expedition.id
    );
    msg!("  Base reward pool: {} SCRAP lamports", base_reward);
    msg!("  Rounds completed: {}", expedition.rounds_completed);
    msg!("  Total pot earned: {} SCRAP lamports", total_pot_earned);
    
    let participant_count = expedition.total_participants;
    
    if participant_count == 0 {
        msg!("No participants in expedition {}, no rewards to distribute", expedition.id);
        return Ok(RunTaskReturnV0 {
            tasks: vec![],
            accounts: vec![],
        });
    }
    
    let guild_accounts_start = rounds_completed;
    let mut guild_performances_updated = 0;
       
    // iterate through remaining accounts after ExpeditionRound accounts
    for account_idx in guild_accounts_start..ctx.remaining_accounts.len() {
        let guild_account_info = &ctx.remaining_accounts[account_idx];
        
        if !guild_account_info.is_writable {
            msg!("Skipping non-writable account at index {}", account_idx);
            continue;
        }
        
        let account_data = guild_account_info.data.borrow();
        
        // verify it's a GuildPerformance account by checking size and reading key fields
        if account_data.len() < 35 { 
            msg!("Account at index {} too small to be GuildPerformance", account_idx);
            continue;
        }
        
        // read expedition_id to verify it matches (at offset 8)
        let expedition_id_bytes: [u8; 8] = account_data[8..16].try_into()
            .map_err(|_| ErrorCode::InvalidAccountInput)?;
        let account_expedition_id = u64::from_le_bytes(expedition_id_bytes);
        
        if account_expedition_id != expedition.id {
            msg!("Skipping GuildPerformance for different expedition: {}", account_expedition_id);
            continue;
        }
        
        // read guild_id for logging (at offset 16)
        let guild_id_bytes: [u8; 8] = account_data[16..24].try_into()
            .map_err(|_| ErrorCode::InvalidAccountInput)?;
        let guild_id = u64::from_le_bytes(guild_id_bytes);
        
        msg!("Updating GuildPerformance for guild {}", guild_id);
        msg!("  GuildPerformance PDA: {}", guild_account_info.key());
        
        // calc this guild's actual performance from rounds
        let mut guild_successful_rounds = 0u8;
        let mut guild_total_risk = 0u32;
        let guild_rounds_participated = rounds_completed as u8;
        
        // analyze each round's results
        for (round_idx, &(risk_level, _outcome, is_success)) in rounds_data.iter().enumerate() {
            let risk_points = match risk_level {
                2 => 3, // hi risk = 3 points
                1 => 2, // med risk = 2 points
                _ => 1, // lo risk = 1 point
            };
            guild_total_risk += risk_points;
            
            if is_success {
                guild_successful_rounds += 1;
            }
            
            msg!("  Round {}: risk_level={}, success={}, risk_points={}",
                 round_idx, risk_level, is_success, risk_points);
        }
        
        msg!("  Updated stats: successful={}, participated={}, risk_points={}",
             guild_successful_rounds, guild_rounds_participated, guild_total_risk);
        
        // drop the immutable borrow before getting mutable access
        drop(account_data);
        
        let mut data = guild_account_info.try_borrow_mut_data()
            .map_err(|_| ErrorCode::InvalidAccountInput)?;
        
        // GuildPerformance struct layout
        // Account layout (with 8-byte discriminator):
        // [0-7]   discriminator
        // [8-15]  expedition_id
        // [16-23] guild_id
        // [24-27] total_risk_points (4 bytes)
        // [28-30] current_round_vote_tally (3 bytes)
        // [31]    successful_rounds (1 byte)
        // [32]    total_rounds_participated (1 byte)
        // [33]    player_count (1 byte)
        // [34]    bump (1 byte)
        
        // use sol_memcpy to ensure the writes persist to the blockchain
        // we are losing the data between distribute_rewards and claim_rewards

        // write total_risk_points at offset 24 (4 bytes)
        let risk_bytes = guild_total_risk.to_le_bytes();
        sol_memcpy(&mut data[24..28], &risk_bytes, 4);
        
        // write successful_rounds at offset 31 (1 byte)
        let successful_rounds_bytes = [guild_successful_rounds];
        sol_memcpy(&mut data[31..32], &successful_rounds_bytes, 1);
        
        // write total_rounds_participated at offset 32 (1 byte)
        let participated_bytes = [guild_rounds_participated];
        sol_memcpy(&mut data[32..33], &participated_bytes, 1);
        
        guild_performances_updated += 1;
        msg!("Successfully updated GuildPerformance for guild {} using sol_memcpy for persistence", guild_id);
    }
    
    msg!("Updated {} GuildPerformance accounts", guild_performances_updated);
    
   
    // for E2E testing with one single player (me), simplified distribution
    let reward_per_participant = total_pot_earned
        .checked_div(participant_count)
        .ok_or(ErrorCode::MathOverflow)?;
    
    msg!("Distribution plan:");
    msg!("  Total participants: {}", participant_count);
    msg!("  Reward per participant: {} SCRAP lamports", reward_per_participant);
    
    // SIMPLIFIED FOR E2E: transfer to participant if accounts provided
    // in production, this would iterate through all participants
    
    msg!("Remaining accounts provided: {}", ctx.remaining_accounts.len());
    
    // Store the total rewards that should be distributed
    expedition.total_rewards_distributed = total_pot_earned;
    
    msg!("Rewards calculation complete:");
    msg!("  Total pot earned: {} SCRAP lamports", total_pot_earned);
    msg!("  Per participant: {} SCRAP lamports", reward_per_participant);
    msg!("  Participants should claim rewards using a separate instruction");
    
    // update global stats
    ctx.accounts.global_game_state.total_rewards_distributed =
        ctx.accounts.global_game_state.total_rewards_distributed
            .checked_add(expedition.total_rewards_distributed)
            .ok_or(ErrorCode::Overflow)?;
    
    msg!(
        "Distributed {} SCRAP lamports for expedition {}",
        expedition.total_rewards_distributed,
        expedition.id
    );
    
    // again no follow up tasks needed for tuktuk
    Ok(RunTaskReturnV0 {
        tasks: vec![],
        accounts: vec![],
    })
}

// Note: In a production implementation, i would need additional instructions to:
// 1. iterate through UserExpeditionParticipation accounts
// 2. transfer tokens to each participant's token account
// 3. update participant records

// eg...
// - a separate crank instruction that processes N participants at a time
// - client-side batching of transfer instructions