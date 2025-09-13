use spacetimedb::{ReducerContext, SpacetimeType, Timestamp, Table, TimeDuration, ScheduleAt};

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
    pub topic: String,
}

// Scheduled table for cleanup
#[spacetimedb::table(name = cleanup_timer, scheduled(delete_old_tweets))]
pub struct CleanupTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
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
    topic: String,
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

    ctx.db.tweet().try_insert(t)?;
    Ok(())
}

#[spacetimedb::reducer]
pub fn delete_old_tweets(ctx: &ReducerContext, _timer: CleanupTimer) -> Result<(), String> {
    let twenty_four_hours_in_micros = 24 * 60 * 60 * 1000 * 1000;
    let cutoff_time = ctx.timestamp - TimeDuration::from_micros(twenty_four_hours_in_micros);

    // Collect all old tweets first
    let old_tweets: Vec<Tweet> = ctx.db.tweet()
        .iter()
        .filter(|tweet| tweet.created_at < cutoff_time)
        .collect();

    // Delete each old tweet
    for tweet in old_tweets {
        ctx.db.tweet().delete(tweet);
    }

    Ok(())
}

// New reducer to delete tweets by topic
#[spacetimedb::reducer]
pub fn delete_tweets_by_topic(ctx: &ReducerContext, topic: String) -> Result<(), String> {
    // Collect all tweets with the specified topic first
    let tweets_to_delete: Vec<Tweet> = ctx.db.tweet()
        .iter()
        .filter(|tweet| 
            tweet.topic == topic
        )
        .collect();

    let deleted_count = tweets_to_delete.len();
    
    // Delete each matching tweet
    for tweet in tweets_to_delete {
        ctx.db.tweet().delete(tweet);
    }
    
    Ok(())
}

// Initialize the scheduled cleanup when the module is first deployed
#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    // Schedule cleanup to run every 10 minutes (600,000,000 microseconds)
    ctx.db.cleanup_timer().try_insert(CleanupTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(TimeDuration::from_micros(600_000_000)),
    })?;
    
    Ok(())
}