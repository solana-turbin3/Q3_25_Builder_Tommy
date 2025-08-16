#![allow(unexpected_cfgs)]
#![allow(unused_imports)]

use anchor_lang::prelude::*;
use tuktuk_program;

// Import all modules
pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod utils;


// Re-export commonly used items
pub use constants::*;
pub use state::*;
pub use utils::*;
pub use instructions::*;


declare_id!("81zfvbGkhnSgAg24xtC7f24N3TKfanNs7426RkzBUmsx");

#[program]
pub mod wasteland_runners {
    use super::*;


    // ============= start the game =============
    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        instructions::initialize_game(ctx)
    }
    
    // ============= stuff users can do  =============
    pub fn create_user_account(
        ctx: Context<CreateUserAccount>,
        discord_id: u64,
        guild_id: u64,
    ) -> Result<()> {
        instructions::create_user_account(ctx, discord_id, guild_id)
    }


    pub fn join_expedition(ctx: Context<JoinExpedition>) -> Result<()> {
        instructions::join_expedition(ctx)
    }

    pub fn submit_vote(ctx: Context<SubmitVote>, vote: u8) -> Result<()> {
        instructions::submit_vote(ctx, vote)
    }
    
    // ============= Tuktuk crank instructions =============
    pub fn tuktuk_crank_create_expedition(ctx: Context<CreateExpedition>, expedition_id: u64) -> Result<tuktuk_program::RunTaskReturnV0> {
        instructions::tuktuk_crank_create_expedition::handler(ctx, expedition_id)
    }

    pub fn tuktuk_crank_start_expedition(ctx: Context<StartExpedition>) -> Result<tuktuk_program::RunTaskReturnV0> {
        instructions::tuktuk_crank_start_expedition::handler(ctx)
    }

    pub fn tuktuk_crank_process_round(ctx: Context<ProcessRound>) -> Result<tuktuk_program::RunTaskReturnV0> {
        instructions::tuktuk_crank_process_round::handler(ctx)
    }
    
    pub fn tuktuk_crank_complete_expedition(ctx: Context<CompleteExpedition>) -> Result<tuktuk_program::RunTaskReturnV0> {
        instructions::tuktuk_crank_complete_expedition::handler(ctx)
    }

    pub fn tuktuk_crank_distribute_rewards(ctx: Context<DistributeRewards>) -> Result<tuktuk_program::RunTaskReturnV0> {
        instructions::tuktuk_crank_distribute_rewards::handler(ctx)
    }
    
    // ============= Token operations =============
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }

    // ============= magicblock vrf callback =============
    
    // pub fn magicblock_vrf_callback(ctx: Context<MagicblockVrfCallback>, randomness: [u8; 32]) -> Result<()> {
    //     instructions::magicblock_vrf_callback::handler(ctx, randomness)
    // }

    // in production, use MagicBlock VRF for secure randomness
    // i ran out of time troubleshooting the magicblock VRF devnet, so im using a simple random number generator instead
}
