const X_API_BASE = "https://api.x.com/2";
const TIMELINE_PAGE_SIZE = 25;
const TARGET_POST_COUNT = 10;
const MIN_POSTS_BEFORE_PAGINATE = 5;

export type XProfilePost = {
  id: string;
  text: string;
  createdAt: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  lang?: string;
};

export type XProfileOverview = {
  id: string;
  handle: string;
  displayName: string;
  username: string;
  bio: string;
  avatarUrl: string;
  location?: string;
  websiteUrl?: string;
  verified?: boolean;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
};

type XApiTweet = {
  id: string;
  text: string;
  created_at?: string;
  lang?: string;
  entities?: { urls?: { start: number; end: number; url: string }[] };
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
  };
};

type XApiUser = {
  id: string;
  name: string;
  username: string;
  description?: string;
  profile_image_url?: string;
  location?: string;
  url?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
  };
};

type CachedBearer = {
  token: string;
  expiresAt: number;
};

let cachedBearer: CachedBearer | null = null;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function fetchBearerViaOAuth(): Promise<string> {
  const apiKey = readEnv("X_API_KEY");
  const apiSecret = readEnv("X_API_SECRET");
  if (!apiKey || !apiSecret) {
    throw new Error(
      "X_API_KEY and X_API_SECRET are required for X profile reverse."
    );
  }

  const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const response = await fetch("https://api.x.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        error_description?: string;
        detail?: string;
      };
      detail = body.error_description ?? body.detail ?? "";
    } catch {
      // ignore
    }
    throw new Error(
      detail
        ? `X API token exchange failed (${response.status}): ${detail}`
        : `X API token exchange failed with status ${response.status}.`
    );
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  const token = body.access_token?.trim();
  if (!token) {
    throw new Error("X API token exchange returned no access_token.");
  }

  const ttlSeconds =
    typeof body.expires_in === "number" && body.expires_in > 60
      ? body.expires_in - 60
      : 60 * 60;
  cachedBearer = {
    token,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  return token;
}

async function requireBearerToken(): Promise<string> {
  if (cachedBearer && cachedBearer.expiresAt > Date.now()) {
    return cachedBearer.token;
  }

  const apiKey = readEnv("X_API_KEY");
  const apiSecret = readEnv("X_API_SECRET");
  if (apiKey && apiSecret) {
    return fetchBearerViaOAuth();
  }

  const raw = readEnv("X_BEARER_TOKEN");
  if (!raw) {
    throw new Error(
      "Set X_API_KEY + X_API_SECRET (recommended) or X_BEARER_TOKEN for X profile reverse."
    );
  }

  // Use bearer exactly as issued (often URL-encoded). Do not decodeURIComponent.
  return raw;
}

async function xHeaders(): Promise<HeadersInit> {
  return {
    Authorization: `Bearer ${await requireBearerToken()}`,
    "User-Agent": "gitreverse/1.0.0",
  };
}

async function xFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: await xHeaders() });

  if (response.status === 404) {
    throw new Error("X profile not found.");
  }
  if (response.status === 401 || response.status === 403) {
    cachedBearer = null;
    throw new Error(
      "X API authentication failed. Check X_API_KEY / X_API_SECRET in your environment."
    );
  }
  if (response.status === 429) {
    throw new Error("X API rate limit exceeded. Try again in a few minutes.");
  }
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as {
        detail?: string;
        title?: string;
        errors?: { detail?: string }[];
      };
      detail =
        body.detail ??
        body.title ??
        body.errors?.[0]?.detail ??
        "";
    } catch {
      // ignore
    }
    throw new Error(
      detail
        ? `X API request failed (${response.status}): ${detail}`
        : `X API request failed with status ${response.status}.`
    );
  }

  return (await response.json()) as T;
}

function hasOutboundLinks(tweet: XApiTweet): boolean {
  return (
    Array.isArray(tweet.entities?.urls) && tweet.entities.urls.length > 0
  );
}

function mapTweet(tweet: XApiTweet): XProfilePost {
  return {
    id: tweet.id,
    text: tweet.text,
    createdAt: tweet.created_at ?? "",
    lang: tweet.lang,
    likeCount: tweet.public_metrics?.like_count,
    retweetCount: tweet.public_metrics?.retweet_count,
    replyCount: tweet.public_metrics?.reply_count,
  };
}

function filterLinkFreePosts(tweets: XApiTweet[]): XProfilePost[] {
  return tweets
    .filter((tweet) => !hasOutboundLinks(tweet))
    .map(mapTweet)
    .slice(0, TARGET_POST_COUNT);
}

async function fetchUserTimelinePage(
  userId: string,
  paginationToken?: string
): Promise<{ tweets: XApiTweet[]; nextToken?: string }> {
  const params = new URLSearchParams({
    max_results: String(TIMELINE_PAGE_SIZE),
    exclude: "retweets,replies",
    "tweet.fields": "created_at,public_metrics,entities,lang",
  });
  if (paginationToken) {
    params.set("pagination_token", paginationToken);
  }

  const data = await xFetch<{
    data?: XApiTweet[];
    meta?: { next_token?: string };
  }>(`${X_API_BASE}/users/${userId}/tweets?${params.toString()}`);

  return {
    tweets: data.data ?? [],
    nextToken: data.meta?.next_token,
  };
}

export async function getXProfileOverview(
  handle: string
): Promise<XProfileOverview> {
  const username = handle.trim().replace(/^@+/, "").toLowerCase();
  const params = new URLSearchParams({
    "user.fields":
      "id,name,username,description,profile_image_url,public_metrics,location,url,verified",
  });

  const data = await xFetch<{ data?: XApiUser }>(
    `${X_API_BASE}/users/by/username/${encodeURIComponent(username)}?${params.toString()}`
  );

  const user = data.data;
  if (!user) {
    throw new Error("X profile not found.");
  }

  return {
    id: user.id,
    handle: user.username.toLowerCase(),
    displayName: user.name,
    username: user.username,
    bio: user.description ?? "",
    avatarUrl: user.profile_image_url ?? "",
    location: user.location,
    websiteUrl: user.url,
    verified: user.verified,
    followerCount: user.public_metrics?.followers_count,
    followingCount: user.public_metrics?.following_count,
    postCount: user.public_metrics?.tweet_count,
  };
}

export async function getXProfilePosts(
  userId: string
): Promise<XProfilePost[]> {
  const firstPage = await fetchUserTimelinePage(userId);
  let linkFree = filterLinkFreePosts(firstPage.tweets);

  if (
    linkFree.length < MIN_POSTS_BEFORE_PAGINATE &&
    firstPage.nextToken
  ) {
    const secondPage = await fetchUserTimelinePage(userId, firstPage.nextToken);
    const combined = [...firstPage.tweets, ...secondPage.tweets];
    linkFree = filterLinkFreePosts(combined);
  }

  return linkFree;
}

export async function getXProfileWithPosts(handle: string): Promise<{
  overview: XProfileOverview;
  posts: XProfilePost[];
}> {
  const overview = await getXProfileOverview(handle);
  const posts = await getXProfilePosts(overview.id);
  return { overview, posts };
}
