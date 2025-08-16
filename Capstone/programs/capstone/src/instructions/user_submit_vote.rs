use anchor_lang::prelude::*;
use crate::state::{UserAccount, Expedition, ExpeditionStatus, GuildVote, GuildPerformance, UserExpeditionParticipation};
use crate::constants::{USER_SEED, EXPEDITION_SEED, GUILD_SEED};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct SubmitVote<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [USER_SEED, user.key().as_ref()],
        bump = user_account.bump,
        constraint = user_account.authority == user.key() @ ErrorCode::Unauthorized
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [EXPEDITION_SEED, expedition.id.to_le_bytes().as_ref()],
        bump = expedition.bump,
        constraint = expedition.status == ExpeditionStatus::InProgress @ ErrorCode::ExpeditionNotActive,
        constraint = expedition.current_round < 4 @ ErrorCode::ExpeditionNotActive
    )]
    pub expedition: Account<'info, Expedition>,

    #[account(
        mut,
        seeds = [
            GUILD_SEED, 
            expedition.id.to_le_bytes().as_ref(),
            user_account.guild_id.to_le_bytes().as_ref()
        ],
        bump = guild_performance.bump,
        constraint = guild_performance.expedition_id == expedition.id @ ErrorCode::Unauthorized
    )]
    pub guild_performance: Account<'info, GuildPerformance>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + GuildVote::INIT_SPACE,
        seeds = [
            b"guild_vote",
            expedition.id.to_le_bytes().as_ref(),
            user_account.guild_id.to_le_bytes().as_ref(),
            expedition.current_round.to_le_bytes().as_ref(),
            user.key().as_ref()
        ],
        bump
    )]
    pub guild_vote: Account<'info, GuildVote>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserExpeditionParticipation::INIT_SPACE,
        seeds = [
            b"user_participation",
            expedition.id.to_le_bytes().as_ref(),
            user.key().as_ref(),
            user_account.guild_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub user_participation: Account<'info, UserExpeditionParticipation>,

    pub system_program: Program<'info, System>,
}

pub fn submit_vote(ctx: Context<SubmitVote>, risk_level: u8) -> Result<()> {
    // Validate risk level (0 = low, 1 = medium, 2 = high)
    require!(risk_level <= 2, ErrorCode::InvalidRiskLevel);
    
    // Check if expedition is active
    require!(ctx.accounts.expedition.status == ExpeditionStatus::InProgress, ErrorCode::ExpeditionNotActive);
    
    // TODO: Add voting period check when we have round timing implemented
    // For now, we just check if the expedition is active
    
    let guild_vote = &mut ctx.accounts.guild_vote;
    let guild_performance = &mut ctx.accounts.guild_performance;
    let user_participation = &mut ctx.accounts.user_participation;
    
    // track unique participants for fair reward distribution
    if !user_participation.has_voted {
        // the first time this user is participating in this expedition
        user_participation.expedition_id = ctx.accounts.expedition.id;
        user_participation.guild_id = ctx.accounts.user_account.guild_id;
        user_participation.user = ctx.accounts.user.key();
        user_participation.has_voted = true;
        user_participation.bump = ctx.bumps.user_participation;
        

        
        msg!("User {} voted for the first time in expedition {} for guild {}",
             ctx.accounts.user.key(),
             ctx.accounts.expedition.id,
             ctx.accounts.user_account.guild_id);
    }
    
    // init guild vote if this is the first vote for this round
    if !guild_vote.submitted {
        guild_vote.expedition_id = ctx.accounts.expedition.id;
        guild_vote.guild_id = ctx.accounts.user_account.guild_id;
        guild_vote.round_number = ctx.accounts.expedition.current_round as u8;
        guild_vote.risk_level = risk_level;
        guild_vote.vote_count = 1;
        guild_vote.submitted = false;
        guild_vote.bump = ctx.bumps.guild_vote;
    } else {
        // update existing vote
        guild_vote.vote_count += 1;
    }
    
    // update guild performance vote tally
    // the way we are doing tally is [high, med, low]
    match risk_level {
        2 => guild_performance.current_round_vote_tally[0] += 1, // high
        1 => guild_performance.current_round_vote_tally[1] += 1, // medium  
        0 => guild_performance.current_round_vote_tally[2] += 1, // low
        _ => return Err(ErrorCode::InvalidRiskLevel.into()),
    }
    
    msg!("Vote submitted: guild {} voted {} for round {}", 
         ctx.accounts.user_account.guild_id, 
         risk_level, 
         ctx.accounts.expedition.current_round);
    
    Ok(())
}