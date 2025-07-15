#![allow(unexpected_cfgs)]
#![allow(unused_imports)]

use super::shared::{transfer_tokens, close_token_account};
use crate::state::Offer;

use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct RefundOffer<'info> {
    
    #[account(mut)]
    pub maker: Signer<'info>,


    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(mut)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        close = maker,
        has_one = maker, 
        has_one = token_mint_a, 
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes().as_ref()], 
        bump
    )]
    pub offer_details: Account<'info, Offer>, // make sure to use token mint A for the refund
    
    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer_details,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

}


//=======================IMPLEMENT HANDLER METHODS========================//

pub fn handler(
    ctx: Context<RefundOffer>,
    id: u64,
)   -> Result <()> {
    // we also need to derive the offer_details again using the seeds
    let id_bytes = id.to_le_bytes();
    let maker_key = ctx.accounts.maker.key();
    let offer_account_seeds = 
        &[b"offer",
        maker_key.as_ref(),
        &id_bytes,
        &[ctx.accounts.offer_details.bump]];

    let signers_seeds = Some(&offer_account_seeds[..]);    


    // first, transfer tokens from the vault to the maker
    transfer_tokens(
        &ctx.accounts.vault,
        &ctx.accounts.maker_token_account_a,
        &ctx.accounts.vault.amount,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.offer_details.to_account_info(),
        &ctx.accounts.token_program,
        signers_seeds,
    )?;

    // then, close the vault account since the escrow is done
     close_token_account(
        &ctx.accounts.vault,
        &ctx.accounts.maker.to_account_info(),
        &ctx.accounts.offer_details.to_account_info(),
        &ctx.accounts.token_program,
         signers_seeds,
        
    )?;

    Ok(())
}