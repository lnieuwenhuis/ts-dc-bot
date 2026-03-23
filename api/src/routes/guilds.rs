use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::SqlitePool;

use crate::auth::AuthUser;
use crate::models::{Guild, LeaderboardEntry};

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct LeaderboardResponse {
    pub data: Vec<LeaderboardEntry>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Deserialize)]
pub struct PatchGuildBody {
    pub name: Option<String>,
    pub member_count: Option<i64>,
}

pub async fn list_guilds(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<Guild>>, Json<Value>> {
    let guilds = sqlx::query_as::<_, Guild>(
        "SELECT * FROM guilds ORDER BY member_count DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(guilds))
}

pub async fn get_guild(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<Guild>, Json<Value>> {
    let guild = sqlx::query_as::<_, Guild>(
        "SELECT * FROM guilds WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?
    .ok_or_else(|| Json(json!({ "error": "Guild not found" })))?;

    Ok(Json(guild))
}

pub async fn get_guild_leaderboard(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<LeaderboardResponse>, Json<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let offset = (page - 1) * limit;

    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_guilds WHERE guild_id = ?",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    let entries = sqlx::query_as::<_, LeaderboardEntry>(
        r#"
        SELECT
            ROW_NUMBER() OVER (ORDER BY ug.guild_xp DESC) as rank,
            ug.user_id,
            u.username,
            ug.guild_level,
            ug.guild_xp,
            ug.guild_messages
        FROM user_guilds ug
        JOIN users u ON ug.user_id = u.id
        WHERE ug.guild_id = ?
        ORDER BY ug.guild_xp DESC
        LIMIT ? OFFSET ?
        "#,
    )
    .bind(&id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(LeaderboardResponse {
        data: entries,
        total,
        page,
        limit,
    }))
}

pub async fn patch_guild(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(body): Json<PatchGuildBody>,
) -> Result<Json<Guild>, Json<Value>> {
    // Fetch current guild
    let guild = sqlx::query_as::<_, Guild>(
        "SELECT * FROM guilds WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?
    .ok_or_else(|| Json(json!({ "error": "Guild not found" })))?;

    let new_name = body.name.unwrap_or(guild.name);
    let new_member_count = body.member_count.unwrap_or(guild.member_count);

    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE guilds SET name = ?, member_count = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&new_name)
    .bind(new_member_count)
    .bind(&now)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    let updated = sqlx::query_as::<_, Guild>(
        "SELECT * FROM guilds WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(updated))
}
