use axum::{extract::State, response::Json};
use sqlx::SqlitePool;
use serde_json::{json, Value};
use crate::auth::AuthUser;
use crate::models::Stats;

pub async fn get_stats(
    _auth: AuthUser,
    State(pool): State<SqlitePool>,
) -> Result<Json<Stats>, Json<Value>> {
    let stats = sqlx::query_as::<_, Stats>(
        r#"
        SELECT
            (SELECT COUNT(*) FROM users) as total_users,
            (SELECT COUNT(*) FROM guilds) as total_guilds,
            (SELECT COALESCE(SUM(guild_messages), 0) FROM user_guilds) as total_messages,
            (SELECT COALESCE(AVG(overall_level), 0.0) FROM users) as avg_level
        "#,
    )
    .fetch_one(&pool)
    .await
    .map_err(|e| Json(json!({ "error": e.to_string() })))?;

    Ok(Json(stats))
}
