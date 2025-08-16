use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{Instruction, AccountMeta};
use crate::state::{Expedition, ExpeditionStatus, GlobalGameState};
use tuktuk_program::{RunTaskReturnV0, TaskReturnV0, TransactionSourceV0, TriggerV0, compile_transaction};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(expedition_id: u64)]
pub struct CreateExpedition<'info> {
    #[account(
        mut,
        seeds = [b"global_game_state"],
        bump = global_game_state.bump,
    )]
    pub global_game_state: Account<'info, GlobalGameState>,
    
    #[account(
        init,
        payer = payer,
        space = 8 + Expedition::INIT_SPACE,
        seeds = [b"expedition", expedition_id.to_le_bytes().as_ref()],
        bump
    )]
    pub expedition: Account<'info, Expedition>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateExpedition>, expedition_id: u64) -> Result<RunTaskReturnV0> {
    let global_game_state = &mut ctx.accounts.global_game_state;
    
    // the provided expedition_id matches the current next_expedition_id
    if expedition_id != global_game_state.next_expedition_id {
        msg!("Expedition ID mismatch: provided {}, expected {}",
             expedition_id, global_game_state.next_expedition_id);
        return Err(error!(ErrorCode::InvalidExpeditionId));
    }
    
    // init expedition data
    let expedition = &mut ctx.accounts.expedition;
    expedition.id = expedition_id;
    expedition.bump = ctx.bumps.expedition;
    expedition.status = ExpeditionStatus::Pending;
    expedition.scenario_type = 0; 
    expedition.current_round = 0;
    expedition.total_participants = 0;
    expedition.rounds_completed = 0;
    expedition.total_rewards_distributed = 0;
    expedition.rewards_distributed = false;
    
    global_game_state.next_expedition_id = global_game_state.next_expedition_id
        .checked_add(1)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    
    msg!("Created expedition {}", expedition_id);
    
    // // don't schedule any follow-up tasks - the client will queue them separately
    Ok(RunTaskReturnV0 {
        tasks: vec![],
        accounts: vec![],
    })
}