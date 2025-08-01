use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};


use crate::state::{StakeConfig, UserAccount};

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, StakeConfig>,

    #[account(
        init,
        payer = user,
        seeds = [b"user", user.key().as_ref()], // if we put mint.key() as a seed also, it would create an account for each NFT the user has, each accruing their own set of rewards as seen in @user-key-and-mint-key.png. for the design of this program, we want it to be unique for each user only.
        bump,
        space = 8 + UserAccount::INIT_SPACE,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,

}

impl<'info> InitializeUser<'info> {
    pub fn initialize_user(&mut self, bumps: &InitializeUserBumps) -> Result<()> {
        self.user_account.set_inner(UserAccount {
            points: 0,
            amount_staked: 0,
            bump: bumps.user_account,
        });
        
        Ok(())
    }
}