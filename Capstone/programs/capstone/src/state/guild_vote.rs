use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
#[repr(C)]
pub struct GuildVote {
    pub expedition_id: u64,     // 8 bytes - links to expedition
    pub guild_id: u64,          // 8 bytes - discord server id
    pub round_number: u8,       // 1 byte - which round (0-3)
    pub risk_level: u8,         // 1 byte - 0=low, 1=med, 2=high
    pub vote_count: u8,         // 1 byte - number of players voting for this level
    pub submitted: bool,        // 1 byte - whether vote has been finalized
    pub bump: u8                // 1 byte
    // Total: 21 bytes + 8 discriminator = 29 bytes
}