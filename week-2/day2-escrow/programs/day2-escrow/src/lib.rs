#![allow(unexpected_cfgs, deprecated)]

use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;

declare_id!("2ETQDQ92wKHZSC7Ey8LggTKGoUQ8NgaEA1RLR4MHvaUU");

#[program]
pub mod day2_escrow {
    use super::*;

    pub fn make(ctx: Context<Make>, seed: u64) -> Result<()> {
        
        Ok(())
    }
}
