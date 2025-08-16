use anchor_lang::prelude::*;
use crate::state::GuildPerformance;
use crate::constants::{HIGH_RISK_POINTS, MEDIUM_RISK_POINTS, LOW_RISK_POINTS};

impl GuildPerformance {
    /// Calculates the guild's score based on their performance
    pub fn calculate_score(&self) -> u64 {
        // Base score from risk points (total risk taken)
        let base_score = self.total_risk_points as u64;
        
        // Success rate bonus (successful rounds / total rounds)
        let success_rate = if self.total_rounds_participated > 0 {
            (self.successful_rounds as u64 * 100) / self.total_rounds_participated as u64
        } else {
            0
        };
        
        // Participation bonus (10 points per round participated)
        let participation_bonus = self.total_rounds_participated as u64 * 10;
        
        // Apply success rate multiplier
        let multiplier = 100 + success_rate; // 100% base + success rate bonus
        
        (base_score * multiplier / 100) + participation_bonus
    }
    
    /// Records the result of a round for this guild
    pub fn record_round_result(&mut self, won: bool, risk_level: u8) {
        self.total_rounds_participated += 1;
        
        if won {
            self.successful_rounds += 1;
            
            // Add risk points based on the risk level taken
            let risk_points = match risk_level {
                2 => HIGH_RISK_POINTS,
                1 => MEDIUM_RISK_POINTS,
                0 => LOW_RISK_POINTS,
                _ => 0,
            };
            self.total_risk_points += risk_points;
        }
        
        // Reset vote tally for next round
        self.current_round_vote_tally = [0, 0, 0];
    }
}