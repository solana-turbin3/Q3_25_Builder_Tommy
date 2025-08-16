use anchor_lang::prelude::*;
use crate::state::{Expedition, ExpeditionStatus, GlobalGameState};
use tuktuk_program::RunTaskReturnV0;
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct CompleteExpedition<'info> {
    #[account(
        mut,
        seeds = [b"expedition", expedition.id.to_le_bytes().as_ref()],
        bump = expedition.bump,
        constraint = expedition.status == ExpeditionStatus::InProgress @ ErrorCode::ExpeditionNotActive
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

pub fn handler(ctx: Context<CompleteExpedition>) -> Result<RunTaskReturnV0> {
    let expedition = &mut ctx.accounts.expedition;
    let expedition_id = expedition.id;
    

    expedition.status = ExpeditionStatus::Completed;
    expedition.rounds_completed = expedition.current_round;
    
    msg!("Expedition {} completed with {} rounds",
         expedition_id, expedition.rounds_completed);
    
    // don't schedule any follow-up tasks - the client will queue them separately
    Ok(RunTaskReturnV0 {
        tasks: vec![],
        accounts: vec![],
    })
}
