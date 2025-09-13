use spacetimedb::{ReducerContext, SpacetimeType, Timestamp, Table, TimeDuration};

#[derive(SpacetimeType, Clone, Debug)]
pub struct GeoPoint {
    pub lat: f64,
    pub lon: f64,
}

#[spacetimedb::table(name = tweet, public)]
#[derive(Debug, Clone)]
pub struct Tweet {
    #[auto_inc]
    #[primary_key]
    pub row_id: u64,
    pub tweet_id: String,
    pub content: String,
    pub username: String,
    pub location: GeoPoint,
    #[index(btree)]
    pub created_at: Timestamp,
    #[index(btree)]
    pub topic: Option<String>,
}

#[spacetimedb::reducer]
pub fn insert_tweet(
    ctx: &ReducerContext,
    tweet_id: String,
    content: String,
    username: String,
    lat: f64,
    lon: f64,
    created_at: Timestamp,
    topic: Option<String>,
) -> Result<(), String> {
    let t = Tweet {
        row_id: 0,
        tweet_id,
        content,
        username,
        location: GeoPoint { lat, lon },
        created_at,
        topic,
    };

    ctx.db.tweet().try_insert(t);

    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_old_tweets(ctx: &ReducerContext) -> Result<(), String> {
    let twenty_four_hours_in_micros = 24 * 60 * 60 * 1000 * 1000;
    let cutoff_time = ctx.timestamp - TimeDuration::from_micros(twenty_four_hours_in_micros);

    let old_tweets: Vec<Tweet> = ctx.db.tweet()
        .iter()
        .filter(|tweet| tweet.created_at < cutoff_time)
        .collect();

    for tweet in old_tweets {
        ctx.db.tweet().delete(tweet);
    }

    Ok(())
}

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    start_periodic_cleanup(ctx);
}

#[spacetimedb::reducer]
pub fn start_periodic_cleanup(ctx: &ReducerContext) -> Result<(), String> {
    delete_old_tweets(ctx)?;
    
    Ok(())
}

#[spacetimedb::reducer]
pub fn run_scheduled_cleanup(ctx: &ReducerContext) -> Result<(), String> {
    delete_old_tweets(ctx)
}