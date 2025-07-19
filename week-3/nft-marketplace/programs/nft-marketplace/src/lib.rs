use anchor_lang::prelude::*;

declare_id!("2kiY1JNDe8CYxQK2UAkXSNiRdK52aMkHbUAWWfyJL4hY");

pub mod instructions;
use instructions::*;
pub mod state;
use state::*;

#[program]
pub mod nft_marketplace {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, fee: u16) -> Result<()> {
        ctx.accounts.init(name, fee, &ctx.bumps)?;
        Ok(())
    }


    pub fn listing(ctx: Context<List>, name: String, price: u64) -> Result<()> {
        ctx.accounts.create_listing(price, &ctx.bumps)?;
        ctx.accounts.deposit_nft()?;
        Ok(())
    }

    pub fn delisting(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft()?;
        Ok(())
    }

    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.send_sol()?;
        ctx.accounts.send_nft()?;
        ctx.accounts.close_mint_vault()
    }
    


}