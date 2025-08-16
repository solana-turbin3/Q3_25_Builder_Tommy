use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
// lined up all fields in the struct in order by size to optimize memory usage
// and minimize padding
// tried to also use repr(packed) but got some errors
pub struct UserAccount{
    pub authority: Pubkey, // matrica-verified wally (32 bytes)
    pub discord_id: u64, // discord snowflake id (main identifier) (8 bytes)
    pub guild_id: u64, // discord server id (8 bytes)
    pub total_rewards: u64, // (8 bytes)
    pub created_at: i64, // (8 bytes)
    pub expeditions_joined: u32, // (4 bytes)
    pub bump: u8, // (1 byte)
}

