use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserExpeditionParticipation {
    pub expedition_id: u64,    // 8 bytes - which expedition
    pub guild_id: u64,          // 8 bytes - which guild they're with
    pub user: Pubkey,           // 32 bytes - the user's pubkey
    pub has_voted: bool,        // 1 byte - track if they've participated
    pub rewards_claimed: bool,  // 1 byte - whether rewards have been claimed
    pub rewards_amount: u64,    // 8 bytes - amount of rewards claimed
    pub bump: u8,               // 1 byte - PDA bump
    // Total: 59 bytes + 8 discriminator = 67 bytes
}