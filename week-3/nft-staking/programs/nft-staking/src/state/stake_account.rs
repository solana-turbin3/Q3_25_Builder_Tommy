use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub owner: Pubkey, // who staked the NFT
    pub mint: Pubkey, // which specific NFT is staked
    pub staked_at: i64, // when the NFT was staked,  need to know how long theyve staked to provide appropriate reward for them
    pub bump: u8, 
    // pub accumulated_rewards: u64, // this would track per-nft rewards, but it's not needed for this program
    // pub last_claimed_rewards: u64, // this would track when rewards were last claimed, not needed for this program
}