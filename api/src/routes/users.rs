use axum::{
    extract::{Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::SqlitePool;

use crate::auth::AuthUser;
use crate::models::User;

#[derive(Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Serialize)]
pub struct UsersResponse {
    pub data: Vec<User>,
    pub total: i64,
    pub page: i64,
    pub limit: i64,
}

#[derive(Deserialize)]
pub struct PatchUserBody {
    pub chips: Option<i64>,
    pub total_xp: Option<i64>,
    pub overall_level: Option<i64>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct UserGuildEntry {
    pub id: i64,
    pub user_id: String,
    pub guild_id: String,
    pub guild_name: String,
    pub guild_xp: i64,
    pub guild_level: i64,
    pub guild_messages: i64,
    pub joined_at: String,
    pub last_message_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub async fn list_users(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<UsersResponse>, Json<Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100).max(1);
    let offset = (page - 1) * limit;

    let total: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    let users = sqlx::query_as::<_, User>(
        "SELECT * FROM users ORDER BY total_xp DESC LIMIT ? OFFSET ?",
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(UsersResponse {
        data: users,
        total,
        page,
        limit,
    }))
}

pub async fn get_user(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<User>, Json<Value>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?
    .ok_or_else(|| Json(json!({ "error": "User not found" })))?;

    Ok(Json(user))
}

pub async fn get_user_guilds(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
) -> Result<Json<Vec<UserGuildEntry>>, Json<Value>> {
    let entries = sqlx::query_as::<_, UserGuildEntry>(
        r#"
        SELECT
            ug.id, ug.user_id, ug.guild_id,
            g.name as guild_name,
            ug.guild_xp, ug.guild_level, ug.guild_messages,
            ug.joined_at, ug.last_message_at,
            ug.created_at, ug.updated_at
        FROM user_guilds ug
        JOIN guilds g ON ug.guild_id = g.id
        WHERE ug.user_id = ?
        ORDER BY ug.guild_xp DESC
        "#,
    )
    .bind(&id)
    .fetch_all(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(entries))
}

pub async fn patch_user(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
    Path(id): Path<String>,
    Json(body): Json<PatchUserBody>,
) -> Result<Json<User>, Json<Value>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?",
    )
    .bind(&id)
    .fetch_optional(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?
    .ok_or_else(|| Json(json!({ "error": "User not found" })))?;

    let new_chips = body.chips.unwrap_or(user.chips);
    let new_total_xp = body.total_xp.unwrap_or(user.total_xp);

    // Recalculate level if XP changes: floor(sqrt(xp / 50)) + 1
    let new_overall_level = if body.total_xp.is_some() {
        ((new_total_xp as f64 / 50.0).sqrt().floor() as i64) + 1
    } else {
        body.overall_level.unwrap_or(user.overall_level)
    };

    let now = chrono::Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE users SET chips = ?, total_xp = ?, overall_level = ?, updated_at = ? WHERE id = ?",
    )
    .bind(new_chips)
    .bind(new_total_xp)
    .bind(new_overall_level)
    .bind(&now)
    .bind(&id)
    .execute(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    let updated = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE id = ?",
    )
    .bind(&id)
    .fetch_one(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(updated))
}
