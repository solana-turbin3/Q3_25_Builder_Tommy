#![allow(unexpected_cfgs)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;



use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FJaGSGgyggHR6Rr1hdEzgWQ9Ysv8KyySSw3Jwq33Ydic");


#[program]
pub mod escrow {

    use super::*;

    pub fn make_offer(
        ctx: Context<MakeOffer>, 
        id: u64, 
        token_a_offered_amount: u64, 
        token_b_wanted_amount: u64
    ) -> Result<()> {
        make_offer::handler(
            ctx,
            id, 
            token_a_offered_amount,
            token_b_wanted_amount,
        )
    }

    pub fn take_offer(
        ctx: Context<TakeOffer>, 
        id: u64,
        
    ) -> Result<()> {
        take_offer::handler(
            ctx,
            id,
        )
    }

    pub fn refund_offer(
        ctx: Context<RefundOffer>, 
        id: u64, 
    ) -> Result<()> {
        refund_offer::handler(
            ctx,
            id,
        )
    }

}

