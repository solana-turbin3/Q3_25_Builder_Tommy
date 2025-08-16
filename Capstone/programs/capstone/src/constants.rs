use anchor_lang::prelude::*;

// token constants
pub const INITIAL_SUPPLY: u64 = 1_000_000_000 * 10u64.pow(9); // 1 billion tokens with 9 decimals
pub const BASE_REWARD_AMOUNT: u64 = 1_000 * 10u64.pow(9); // 1000 SCRAP per expedition

// game constants - configured for capstone demo
pub const EXPEDITION_INTERVAL: i64 = 60; // 60 seconds (1 minute) for capstone
pub const ROUND_DURATION: i64 = 5; // 5 seconds per round for capstone
pub const MAX_ROUNDS: u8 = 4;
pub const VOTING_PERIOD: i64 = 5; // 5 secs for voting period for capstone

// the risk & reward percentages in basis points
pub const HIGH_RISK_REWARD_BPS: u16 = 2500;  // 25%
pub const HIGH_RISK_SUCCESS_BPS: u16 = 1000;  // 10%
pub const MED_RISK_REWARD_BPS: u16 = 1500;   // 15%
pub const MED_RISK_SUCCESS_BPS: u16 = 3000;   // 30%
pub const LOW_RISK_REWARD_BPS: u16 = 500;     // 5%
pub const LOW_RISK_SUCCESS_BPS: u16 = 8000;   // 80%

// risk points for scoring
pub const HIGH_RISK_POINTS: u32 = 100;   // super duper success
pub const MEDIUM_RISK_POINTS: u32 = 50;  // medium rare success
pub const LOW_RISK_POINTS: u32 = 10;     // very sad success

// tuktuktuktuktuktuk integration constants
pub const TUKTUK_PROGRAM_ID: Pubkey = pubkey!("tuktukUrfhXT6ZT77QTU8RQtvgL967uRuVagWF57zVA");
pub const CRON_PROGRAM_ID: Pubkey = pubkey!("cronAjRZnJn3MTP3B9kE62NWDrjSuAPVXf9c4hu4grM");
pub const CRANK_REWARD: u64 = 100_000; // 0.0001 SOL per crank


// PDA seeds
pub const EXPEDITION_SEED: &[u8] = b"expedition";
pub const USER_SEED: &[u8] = b"user";
pub const GAME_STATE_SEED: &[u8] = b"game_state";
pub const GUILD_SEED: &[u8] = b"guild";
pub const ROUND_SEED: &[u8] = b"round";
pub const REWARD_POOL_SEED: &[u8] = b"reward_pool";
pub const TASK_QUEUE_SEED: &[u8] = b"task_queue";

// guild constants
pub const MAX_GUILDS: u8 = 3;
pub const GUILD_NAMES: [&str; 3] = ["Storm Runners", "Sand Walkers", "Void Seekers"];
