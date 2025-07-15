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
#[instruction(id: u64)] // tells anchor to extract id from the instruction data and pass it as a parameter to the handler function.
pub struct TakeOffer<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,
/// CHECK: Validated through has_one contraint and PDA derivation using maker's key.
    #[account(mut)]
    pub maker: AccountInfo<'info>, 

    /*
    AccountInfo<'info> type account is used to provide additional context and metadata
    about the account. This allows for type safety and encapsulation when 
    interacting with accounts in the context of the Anchor library.
    */

    #[account(mut)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_a,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint_b,
        associated_token::authority = taker,
        associated_token::token_program = token_program,
    )]
    pub taker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::mint = token_mint_b,
        associated_token::authority = maker,
        associated_token::token_program = token_program,
    )]
    pub maker_token_account_b: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        close = maker,
        has_one = maker, // makes sure that Alice's pubkey is the same one she provided in her offer details. the has_one constraint is verifying the .key() method call 
        has_one = token_mint_b, // makes sure that token_mint_b is the same one that Alice provided in her offer.
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes().as_ref()], // to_le_bytes() turns numbers into little-endian format bytes.
        bump
    )]
    pub offer_details: Account<'info, Offer>,

    #[account(
        mut,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer_details,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>, // vault holds Alice's tokens here, hence mint_a, controlled by program PDA offer_details


    


    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>, // this token program uses the token program to transfer tokens
    pub system_program: Program<'info, System>,

}


//=======================IMPLEMENT METHODS========================//
// we're going to build two transactions: Bob sends token to Alice, Vault sends tokens to Bob
// then we close the vault account since the escrow is donezo.


pub fn handler(
    ctx: Context<TakeOffer>, // IMPORTANT: all accounts are bundled into Context<TakeOffer>, and then referred to by handlers e.g ctx.accounts.maker_token_account_a, etc.
    id: u64,
) -> Result<()> {
    let id_bytes = id.to_le_bytes();
    let maker_key = ctx.accounts.maker.key();
    let offer_account_seeds = 
        &[b"offer",
        maker_key.as_ref(),
        &id_bytes,
        &[ctx.accounts.offer_details.bump]];

    
    let signers_seeds = Some(&offer_account_seeds[..]);


    // implement bob to alice transfer
    transfer_tokens(
        &ctx.accounts.taker_token_account_b,
        &ctx.accounts.maker_token_account_b,
        &ctx.accounts.offer_details.token_b_wanted_amount,
        &ctx.accounts.token_mint_b,
        &ctx.accounts.taker.to_account_info(),
        &ctx.accounts.token_program,
        None  
    )?;


    // implement vault to bob transfer
    transfer_tokens(
        &ctx.accounts.vault,
        &ctx.accounts.taker_token_account_a,
        &ctx.accounts.vault.amount,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.offer_details.to_account_info(),
        &ctx.accounts.token_program,
        signers_seeds,
    )?;

    close_token_account(
        &ctx.accounts.vault,
        &ctx.accounts.maker.to_account_info(),
        &ctx.accounts.offer_details.to_account_info(),
        &ctx.accounts.token_program,
         signers_seeds,
        
    )?;
    Ok(())
}