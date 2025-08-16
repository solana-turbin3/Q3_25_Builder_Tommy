use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token},
};
use crate::{
    state::{reward_pool::RewardPool, global_game_state::GlobalGameState},
    INITIAL_SUPPLY,
    EXPEDITION_INTERVAL,
    BASE_REWARD_AMOUNT,
};
use super::token_operations::*;

/*
so to init the game we need these accounts:
1. authority or admin to sign first
2. reward_pool -- this pda will own the ata account
3. scrap_mint -- this will mint the scrap
4. reward_pool_ata -- this guy is gonna hold the rewards, with reward_pool as its owner

architecture is 

scrap_mint ====> reward_pool_ata <===== reward_pool pda

we gotta init all this to start, then throw away the authority and freeze
*/

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalGameState::INIT_SPACE,
        seeds = [b"global_game_state"],
        bump
    )]
    pub global_game_state: Account<'info, GlobalGameState>,

    #[account(
        init,
        payer = authority,
        space = 8 + RewardPool::INIT_SPACE,
        seeds = [b"reward_pool"],
        bump
    )]
    pub reward_pool: Account<'info, RewardPool>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = authority.key(),
        mint::freeze_authority = authority.key(),
        seeds = [b"scrap_mint"],
        bump
    )]
    pub scrap_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,

    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: This account will be initialized in the instruction logic
    #[account(mut)]
    pub reward_pool_ata: UncheckedAccount<'info>,
}

pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
    // init global game state
    let global_game_state = &mut ctx.accounts.global_game_state;
    let clock = Clock::get()?;
    
    global_game_state.authority = ctx.accounts.authority.key();
    global_game_state.next_expedition_id = clock.unix_timestamp as u64; // Initialize with timestamp for uniqueness
    global_game_state.next_expedition_time = clock.unix_timestamp + EXPEDITION_INTERVAL;
    global_game_state.expedition_interval = EXPEDITION_INTERVAL;
    global_game_state.base_reward_per_expedition = BASE_REWARD_AMOUNT;
    global_game_state.scrap_mint = ctx.accounts.scrap_mint.key();
    global_game_state.total_rewards_distributed = 0;
    global_game_state.bump = ctx.bumps.global_game_state;

    // iinit reward pool w/ defaults
    let reward_pool = &mut ctx.accounts.reward_pool;
    reward_pool.authority = ctx.accounts.authority.key();
    reward_pool.scrap_mint = ctx.accounts.scrap_mint.key();
    reward_pool.bump = ctx.bumps.reward_pool;

    //create reward_pool_ata w/ helper function
    create_reward_pool_ata(
        &ctx.accounts.authority.to_account_info(),
        &ctx.accounts.reward_pool.to_account_info(),
        &ctx.accounts.reward_pool_ata.to_account_info(),
        &ctx.accounts.scrap_mint.to_account_info(),
        &ctx.accounts.associated_token_program.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
    )?;

    // transfer auth helper function
    transfer_authorities_to_pda(
        &ctx.accounts.authority.to_account_info(),
        &ctx.accounts.reward_pool.key(),
        &ctx.accounts.scrap_mint.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
    )?;

    let reward_pool_seeds = &[
        b"reward_pool".as_ref(),
        &[ctx.bumps.reward_pool]
    ];
    let signer_seeds = &[&reward_pool_seeds[..]];

    // mint all SCRAP supply to RewardPool ata
    mint_initial_supply(
        &ctx.accounts.scrap_mint.to_account_info(),
        &ctx.accounts.reward_pool_ata.to_account_info(),
        &ctx.accounts.reward_pool.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        signer_seeds,
        INITIAL_SUPPLY,
    )?;

    // remove auth -- no touchy
    remove_authorities(
        &ctx.accounts.reward_pool.to_account_info(),
        &ctx.accounts.scrap_mint.to_account_info(),
        &ctx.accounts.token_program.to_account_info(),
        signer_seeds,
    )?;

    Ok(())
}
