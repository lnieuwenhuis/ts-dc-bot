use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub username: String,
    pub discriminator: Option<String>,
    pub chips: i64,
    pub total_xp: i64,
    pub overall_level: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Guild {
    pub id: String,
    pub name: String,
    pub owner_id: Option<String>,
    pub member_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserGuild {
    pub id: i64,
    pub user_id: String,
    pub guild_id: String,
    pub guild_xp: i64,
    pub guild_level: i64,
    pub guild_messages: i64,
    pub joined_at: String,
    pub last_message_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaderboardEntry {
    pub rank: i64,
    pub user_id: String,
    pub username: String,
    pub guild_level: i64,
    pub guild_xp: i64,
    pub guild_messages: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Stats {
    pub total_users: i64,
    pub total_guilds: i64,
    pub total_messages: i64,
    pub avg_level: f64,
}
