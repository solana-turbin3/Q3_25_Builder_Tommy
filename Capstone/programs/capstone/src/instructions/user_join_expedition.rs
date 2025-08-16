use anchor_lang::prelude::*;
use crate::state::{UserAccount, Expedition, ExpeditionStatus, GuildPerformance};
use crate::constants::{USER_SEED, EXPEDITION_SEED, GUILD_SEED};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct JoinExpedition<'info> {
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
        constraint = expedition.status == ExpeditionStatus::Pending @ ErrorCode::ExpeditionAlreadyStarted,
    )]
    pub expedition: Account<'info, Expedition>,

    #[account(
        init,
        payer = user,
        space = 8 + GuildPerformance::INIT_SPACE,
        seeds = [
            GUILD_SEED, 
            expedition.id.to_le_bytes().as_ref(),
            user_account.guild_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub guild_performance: Account<'info, GuildPerformance>,

    pub system_program: Program<'info, System>,
}

pub fn join_expedition(ctx: Context<JoinExpedition>) -> Result<()> {
    let guild_performance = &mut ctx.accounts.guild_performance;
    let expedition = &mut ctx.accounts.expedition;
    let user_account = &ctx.accounts.user_account;
    
    expedition.total_participants = expedition.total_participants
        .checked_add(1)
        .ok_or(ErrorCode::Overflow)?;
    
    
    // init guild performance for this expedition
    guild_performance.expedition_id = expedition.id;
    guild_performance.guild_id = user_account.guild_id;
    guild_performance.total_risk_points = 0;
    guild_performance.successful_rounds = 0;
    guild_performance.total_rounds_participated = 0;
    guild_performance.player_count = 1; // init w/ 1 player (the one joining)
    guild_performance.current_round_vote_tally = [0, 0, 0]; // [high, med, low]
    guild_performance.bump = ctx.bumps.guild_performance;
    
    msg!("Guild {} joined expedition {}",
         user_account.guild_id,
         expedition.id);
    msg!("Total participants now: {}", expedition.total_participants);
    
    Ok(())
}