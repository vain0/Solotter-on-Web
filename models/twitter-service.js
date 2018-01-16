const Twitter = require("twitter");
const { OAuth } = require('oauth');

class TwitterAppService {
  constructor() {
    const e = process.env;

    this.accessToken = {
      consumerKey: e.TWITTER_CONSUMER_KEY,
      consumerSecret: e.TWITTER_CONSUMER_SECRET,
    };

    this.oa = new OAuth(
      "https://twitter.com/oauth/request_token",
      "https://twitter.com/oauth/access_token",
      this.accessToken.consumerKey,
      this.accessToken.consumerSecret,
      "1.0",
      e.TWITTER_OAUTH_CALLBACK_URI,
      "HMAC-SHA1"
    );
  }

  authenticate() {
    return new Promise((resolve, reject) => {
      this.oa.getOAuthRequestToken((error, oauthTokenKey, oauthTokenSecret) => {
        if (error) {
          reject(error);
          return;
        }

        const redirectURI = `https://twitter.com/oauth/authenticate?oauth_token=${oauthTokenKey}`;
        resolve({
          redirectURI,
          oauthToken: {
            oauthTokenKey,
            oauthTokenSecret,
          },
        });
      });
    });
  }

  acceptAuthenticationCallback(oauthToken, oauthVerifier) {
    return new Promise((resolve, reject) => {
      this.oa.getOAuthAccessToken(oauthToken.oauthTokenKey, oauthToken.oauthTokenSecret, oauthVerifier, (error, accessTokenKey, accessTokenSecret, results) => {
        console.log(results);
        if (error) {
          reject(error);
          return;
        }

        resolve({
          twitter: {
            accessToken: {
              accessTokenKey,
              accessTokenSecret,
              ...this.accessToken,
            },
            user: {
              screenName: results["screen_name"],
            },
          },
        });
      });
    });
  }

  userService(accessToken, user) {
    const a = accessToken;
    const twitterClient = new Twitter({
      consumer_key: a.consumerKey,
      consumer_secret: a.consumerSecret,
      access_token_key: a.accessTokenKey,
      access_token_secret: a.accessTokenSecret,
    });

    return new TwitterUserService(twitterClient, user);
  }
}

class TwitterUserService {
  constructor(twitterClient, user) {
    this.twitterClient = twitterClient;
    this.user = user;
  }

  async postTweet(status) {
    return await this.twitterClient.post(
      "statuses/update",
      {
        status,
        trim_user: true,
      }
    );
  }

  async lists() {
    const r = await this.twitterClient.get("lists/list", {});
    return r.map(list => ({
      slung: list.slung,
      name: list.name,
    }));
  }

  async friends() {
    const users = [];

    const option = {
      screen_name: this.user.screenName,
      count: 5000,
      skip_status: true,
      include_user_entities: false,
      cursor: -1,
    };

    while (true) {
      const r = await this.twitterClient.get("friends/list", option);

      for (const user of r["users"]) {
        users.push({
          userId: user["id"],
          screenName: user["screen_name"],
          name: user["name"],
        });
      }

      const nextCursor = r["next_cursor"];
      if (nextCursor === 0) break;

      option["cursor"] = nextCursor;
    }

    return users;
  }

  async listMembers(slug) {
    const r = await this.twitterClient.get("lists/members", {
      slug,
      owner_screen_name: this.user.screenName,
      count: 5000,
      skip_status: true,
      include_user_entities: false,
    });

    return r["users"].map(user => ({
      userId: user["id"],
      screenName: user["screen_name"],
      name: user["name"],
    }));
  }

  async members(slug) {
    if (slug === "@friends") {
      return await this.friends();
    }

    return await this.listMembers(slug);
  }

  async addMembers(slug, screenNames) {
    const limit = 100;
    for (var i = 0; i < (screenNames.length + limit - 1) / limit; i++) {
      await this.twitterClient.post("lists/members/create_all", {
        owner_screen_name: this.user.screenName,
        slug,
        screen_name: screenNames.slice(i * limit, (i + 1) * limit).join(","),
      });
    }
  }

  async removeMembers(slug, screenNames) {
    const limit = 100;
    for (var i = 0; i < (screenNames.length + limit - 1) / limit; i++) {
      await this.twitterClient.post("lists/members/destroy_all", {
        owner_screen_name: this.user.screenName,
        slug,
        screen_name: screenNames.slice(i * limit, (i + 1) * limit).join(","),
      });
    }
  }

  diffUserList(oldUsers, newUsers) {
    const oldUserScreenNames =
      new Set(oldUsers.map(user => user.screenName));
    const newUserScreenNames =
      new Set(newUsers.map(user => user.screenName));
    const removedUsers =
      oldUsers.filter(user => !newUserScreenNames.has(user.screenName));
    const addedUsers =
      newUsers.filter(user => !oldUserScreenNames.has(user.screenName));
    return { addedUsers, removedUsers };
  }

  async applyDiff(slug, diff) {
    const { addedUsers, removedUsers } = diff;
    if (slug === "@friends") {
      throw new Error("NOT SUPPORTED.");
      return;
    }

    await this.removeMembers(slug, removedUsers.map(u => u.screenName));
    await this.addMembers(slug, addedUsers.map(u => u.screenName));
  }

  async exportList(slug) {
    const users = await this.members(slug);
    return JSON.stringify(users, null, "  ");
  }

  async importList(slug, json) {
    const oldUsers = await this.members(slug);
    const newUsers = JSON.parse(json);
    const diff = this.diffUserList(oldUsers, newUsers);
    await this.applyDiff(slug, diff);
  }
}

module.exports = { TwitterAppService, TwitterUserService };
