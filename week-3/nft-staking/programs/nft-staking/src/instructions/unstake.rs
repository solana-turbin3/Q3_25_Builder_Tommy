use anchor_lang::prelude::*;
use anchor_spl::{
    metadata::{
        mpl_token_metadata::instructions::{
            ThawDelegatedAccountCpi, 
            ThawDelegatedAccountCpiAccounts
        }, 
        MasterEditionAccount, 
        Metadata, MetadataAccount
    }, 
    token::{
        revoke, 
        Mint, 
        Revoke, 
        Token, 
        TokenAccount
    }
};

use crate::{
    error::StakeError,
    state::{StakeConfig, UserAccount, StakeAccount},
};

#[derive(Accounts)]

pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub user_mint_ata: Account<'info, TokenAccount>, // ata for the user's mint, authority is user


    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition",
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub edition: Account<'info, MetadataAccount>, 

    #[account(
        seeds = [b"config"],
        bump = config.bump,
    )]
    pub config: Account<'info, StakeConfig>, 


    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()], 
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut, // doesn't need to be initialized anymore, but mutable to change the state
        close = user, // close the account after unstaking
        seeds = [b"stake", mint.key().as_ref(), config.key().as_ref()], // makes it unique for each mint
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,



    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub metadata_program: Program<'info, Metadata>,
}

impl<'info> Unstake<'info> {
    pub fn unstake(&mut self) -> Result<()> {

        let time_elapsed = ((Clock::get()?.unix_timestamp - self.stake_account.staked_at) / 86400) as u32;

        // check if time elapsed is greater than freeze_period
        require!(time_elapsed > self.config.freeze_period, StakeError::FreezePeriodNotExpired);

        // check if the user has any NFTs staked
        require!(self.user_account.amount_staked > 0, StakeError::NoStakedTokens);
        
        // check if the user is the original staker
        require!(self.stake_account.owner == self.user.key(), StakeError::NotOriginalStaker);

        let program = self.token_program.to_account_info();

        // increment the user's points based on time elapsed

        self.user_account.points += (self.config.points_per_stake as u32) * time_elapsed;


        let accounts = ThawDelegatedAccountCpiAccounts {
            delegate: &self.stake_account.to_account_info(),
            token_account: &self.user_mint_ata.to_account_info(),
            edition: &self.edition.to_account_info(),
            mint: &self.mint.to_account_info(),
            token_program: &self.token_program.to_account_info(),
        };
        
        // i had to store the variables to defeat the "temporary value dropped while borrowing" error. Not sure why it's happening.
        let mint_key = self.mint.key();
        let config_key = self.config.key();
        let seeds = &[
            b"stake",
            mint_key.as_ref(),
            config_key.as_ref(),
            
            // self.mint.to_account_info().key().as_ref(),
            // │         │                 │     │
            // │         │                 │     └─ 4️⃣ Convert Pubkey to &[u8; 32]
            // │         │                 └─ 3️⃣ Extract the address (Pubkey) -- 32-byte address
            // │         └─ 2️⃣ Convert to AccountInfo<'info> --- Raw Solana account info
            // └─ 1️⃣ Start with Account<'info, Mint> -- Anchor's typed wrapper

            // ultimately, CPI calfunctions expect AccountInfo types, not Account<T>.
            // self.config.to_account_info().key().as_ref(),
            &[self.stake_account.bump],
            ];
        let signer_seeds = &[&seeds[..]];
            
        ThawDelegatedAccountCpi::new(&self.metadata_program.to_account_info(), accounts).invoke_signed(signer_seeds);
        
        // Revoke the approval and give it back to user
        let account  = Revoke{ 
            source: self.user_mint_ata.to_account_info(), 
            authority: self.user.to_account_info(),
        };

        let ctx = CpiContext::new(program, account);
        revoke(ctx);
        
        self.user_account.amount_staked -= 1;

        Ok(())


    }
}
