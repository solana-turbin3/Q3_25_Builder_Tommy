use anchor_lang::prelude::*;
use tuktuk_program::RunTaskReturnV0;
use crate::state::{Expedition, ExpeditionStatus};

#[derive(Accounts)]
pub struct StartExpedition<'info> {
    #[account(
        mut,
        seeds = [b"expedition", &expedition.id.to_le_bytes()],
        bump = expedition.bump,
    )]
    pub expedition: Account<'info, Expedition>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StartExpedition>) -> Result<RunTaskReturnV0> {
    let expedition = &mut ctx.accounts.expedition;
    
    expedition.status = ExpeditionStatus::InProgress;
    
    msg!("Started expedition {}", expedition.id);
    
    Ok(RunTaskReturnV0 {
        tasks: vec![],
        accounts: vec![],
    })
}
