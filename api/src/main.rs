mod auth;
mod models;
mod routes;

use axum::{
    http::StatusCode,
    response::Json,
    routing::{get, patch, post},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::SqlitePool;
use std::env;
use tower_http::cors::{Any, CorsLayer};

use auth::encode_token;
use routes::{
    guilds::{get_guild, get_guild_leaderboard, list_guilds, patch_guild},
    stats::get_stats,
    users::{get_user, get_user_guilds, list_users, patch_user},
};

#[derive(Deserialize)]
struct LoginRequest {
    password: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let db_path = env::var("DB_PATH").unwrap_or_else(|_| "/data/discord_bot.sqlite".to_string());
    let api_port = env::var("API_PORT").unwrap_or_else(|_| "8081".to_string());
    let admin_password = env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "changeme".to_string());

    let database_url = format!("sqlite:{}", db_path);

    let pool = SqlitePool::connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Enable WAL mode for better concurrent read performance
    sqlx::query("PRAGMA journal_mode=WAL")
        .execute(&pool)
        .await
        .expect("Failed to set WAL mode");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new()
        .route("/stats", get(get_stats))
        .route("/guilds", get(list_guilds))
        .route("/guilds/:id", get(get_guild).patch(patch_guild))
        .route("/guilds/:id/leaderboard", get(get_guild_leaderboard))
        .route("/users", get(list_users))
        .route("/users/:id", get(get_user).patch(patch_user))
        .route("/users/:id/guilds", get(get_user_guilds))
        .with_state(pool.clone());

    // Auth route needs admin_password state, while api routes need pool state
    // Use a shared AppState for auth route
    let app = Router::new()
        .route(
            "/auth/login",
            post({
                let admin_password = admin_password.clone();
                move |Json(body): Json<LoginRequest>| {
                    let pw = admin_password.clone();
                    async move {
                        if body.password != pw {
                            return Err((
                                StatusCode::UNAUTHORIZED,
                                Json(json!({ "error": "Invalid password" })),
                            ));
                        }
                        let jwt_secret =
                            env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret".to_string());
                        let token = encode_token(&jwt_secret);
                        Ok(Json(json!({ "token": token })))
                    }
                }
            }),
        )
        .nest("/api", api_routes)
        .layer(cors);

    let addr = format!("0.0.0.0:{}", api_port);
    println!("API server listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
