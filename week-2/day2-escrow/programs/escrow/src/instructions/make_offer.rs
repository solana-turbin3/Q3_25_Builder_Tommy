#![allow(unexpected_cfgs)]

use super::shared::transfer_tokens;
use crate::state::Offer;
use crate::error::ErrorCode;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
#[instruction(id: u64)]
pub struct MakeOffer<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint_a: InterfaceAccount<'info, Mint>,
    #[account(mint::token_program = token_program)]
    pub token_mint_b: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint_a, // validates that this ATA belongs to the specified mint eg if token_mint_a is USDC, then this makes sure this ATA can only hold USDC.
        associated_token::authority = maker, // // validates that the maker is the owner/authority of this token account.
        associated_token::token_program = token_program, // validates that this token account was created by the specified token program.
    )]
    pub maker_token_account_a: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = maker,
        space = Offer::DISCRIMINATOR.len() + Offer::INIT_SPACE, // anchor discriminator (8bytes) + Offer::INIT_SPACE is the size of offer
        seeds = [b"offer", maker.key().as_ref(), id.to_le_bytes().as_ref()], // to_le_bytes() turns numbers into little-endian format bytes.
        bump
    )]
    pub offer_details: Account<'info, Offer>, // this is where we save details of the entire offer we defined in offer.rs


    #[account(
        init,
        payer = maker,
        associated_token::mint = token_mint_a,
        associated_token::authority = offer_details, // validates that the OFFER (not maker) account is the owner/authority of this token account.
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>, // this token program uses the token program to transfer tokens
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>, // this system program is used to create accounts and perform other system-level operations
    
}


//=======================IMPLEMENT METHODS========================//

pub fn handler(
    ctx: Context<MakeOffer>, //instruction handler
    id: u64, // unique id for the offer
    token_a_offered_amount: u64,
    token_b_wanted_amount: u64,
) -> Result<()> {

//=======================ERROR HANDLING========================//

    // Validation: Check that token mints are different
    require!(
        ctx.accounts.token_mint_a.key() != ctx.accounts.token_mint_b.key(),
        ErrorCode::InvalidTokenMint
    );

    // Validation: Check that offered amount is greater than zero
    require!(
        token_a_offered_amount > 0,
        ErrorCode::InvalidAmount
    );

    // Validation: Check that wanted amount is greater than zero
    require!(
        token_b_wanted_amount > 0,
        ErrorCode::InvalidAmount
    );

//==========================TRANSFER TOKENS========================//

    // now we move the tokens from the maker's ATA account -----> vault
    transfer_tokens(  // transfer_tokens function from shared.rs, invokes the function.
        &ctx.accounts.maker_token_account_a,
        &ctx.accounts.vault,
        &token_a_offered_amount,
        &ctx.accounts.token_mint_a,
        &ctx.accounts.maker.to_account_info(),
        &ctx.accounts.token_program,
        None
    )?;

    // now we save the details of the offer inside an offer account (like a ledger history)
    // note that this handler takes the data to the runtime. so once it feeds the Offer struct
    // those are available to be referenced.
    ctx.accounts.offer_details.set_inner(Offer {
        id,
        maker: ctx.accounts.maker.key(),
        token_mint_a: ctx.accounts.token_mint_a.key(),
        token_mint_b: ctx.accounts.token_mint_b.key(),
        token_b_wanted_amount,  // this is the amount of token B the maker wants to receive.
        bump: ctx.bumps.offer_details,
    });
    Ok(())
}



