use anchor_lang::prelude::*;
use solana_sysvar::{clock::Clock, Sysvar};

use crate::user_account::UserAccount;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CreateUserAccount<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserAccount::DISCRIMINATOR.len() + UserAccount::INIT_SPACE,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
}

// ============================ instructions ================

pub fn create_user_account(
    ctx: Context<CreateUserAccount>,
    discord_id: u64,
    guild_id: u64,) -> Result<()> {

    ctx.accounts.user_account.authority = ctx.accounts.user.key();
    ctx.accounts.user_account.discord_id = discord_id;
    ctx.accounts.user_account.guild_id = guild_id;
    ctx.accounts.user_account.expeditions_joined = 0;
    ctx.accounts.user_account.total_rewards = 0;
    ctx.accounts.user_account.created_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.user_account.bump = ctx.bumps.user_account;
    Ok(())
}
