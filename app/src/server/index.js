// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------
import express from "express";
import flash from "express-flash";
import session from "express-session";
import url from "url";
import passport from "passport";
import path from "path";
import pg from "pg";
import redis from "redis";
import connectRedis from "connect-redis";
import waitOn from "wait-on";
import Auth from "./auth.js";

// -----------------------------------------------------------------------------
// Environmental Variables && Constants
// -----------------------------------------------------------------------------
const APP_PORT = process.env.APP_PORT ? process.env.APP_PORT : 1337;
const SESSION_SECRET = process.env.SESSION_SECRET
  ? process.env.SESSION_SECRET
  : "keyboardCat";
const DB_HOST = process.env.DB_HOST ? process.env.DB_HOST : "db";
const DB_PORT = process.env.DB_PORT ? process.env.DB_PORT : 5432;
const DB_NAME = process.env.DB_NAME ? process.env.DB_NAME : "postgres";
const DB_USER = process.env.DB_USER ? process.env.DB_USER : "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD
  ? process.env.DB_PASSWORD
  : "postgres";
const CACHE_HOST = process.env.CACHE_HOST ? process.env.CACHE_HOST : "cache";
const CACHE_PORT = process.env.CACHE_PORT ? process.env.CACHE_PORT : 6379;
  
// -----------------------------------------------------------------------------
// Initialization
// -----------------------------------------------------------------------------

// Setup the database connection
console.log(`Waiting on database availability ${DB_HOST}:${DB_PORT}`);
await waitOn({
  resources: [`tcp:${DB_HOST}:${DB_PORT}`],
});
const db = new pg.Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
});
console.log(`Database available at ${DB_HOST}:${DB_PORT}`);


// Setup cache connection
console.log(`Waiting on cache availability ${CACHE_HOST}:${CACHE_PORT}`);
await waitOn({
  resources: [`tcp:${CACHE_HOST}:${CACHE_PORT}`],
});
const RedisStore = connectRedis(session);
const redisClient = redis.createClient({ 
  legacyMode: true,
  url: `redis://${CACHE_HOST}:${CACHE_PORT}`
});
await redisClient.connect()
console.log(`Cache available ${CACHE_HOST}:${CACHE_PORT}`);

// Setup the main application stack
console.log("Initializing app server");
const app = express();
// Find the path to the staic file folder
const filePath = url.fileURLToPath(import.meta.url);
const serverPath = path.dirname(filePath);
const viewPath = path.join(serverPath, "views");
const publicPath = path.join(serverPath, "public");
// Configure middleware
app.set("view engine", "pug");
app.set("views", viewPath);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
const auth = new Auth(passport, db).init();

// -----------------------------------------------------------------------------
// Web Server
// -----------------------------------------------------------------------------
app.use(express.static(publicPath));

app.get("/", async (req, res) => {
  const query = `
    SELECT post_description, post_created_at, account_name 
    FROM post JOIN account 
    ON post_owner_id = account_id
    ORDER BY post_created_at DESC
  `;
  const posts = (await db.query(query)).rows;
  res.render("index", { posts, user: req.user });
});

app.get("/account", auth.check("/login"), async (req, res) => {
  res.render("account", { user: req.user });
});

app.get("/post", auth.check("/login"), async (req, res) => {
  const results = (await db.query("SELECT * FROM post")).rows;
  res.render("post", { results, user: req.user });
});

app.post("/post", auth.check("/login"), async (req, res) => {
  const owner = req.user.account_id;
  const description = req.body.description;
  const query = `
    INSERT INTO post(post_owner_id, post_description) 
    VALUES ($1, $2) 
    RETURNING *
  `;
  const result = await db.query(query, [owner, description]);
  res.redirect("/");
});

app.get("/register", auth.checkNot("/"), async (req, res) => {
  res.render("register", { user: req.user });
});
app.post("/register", auth.checkNot("/"), async (req, res) => {
  await auth.registerUser(req.body.name, req.body.password);
  res.redirect("/login");
});

app.get("/login", auth.checkNot("/"), async (req, res) => {
  res.render("login", { user: req.user });
});

app.post(
  "/login",
  auth.checkNot("/"),
  (req, res, next) => {
    let targetUrl = "/";
    if (req.session.targetUrl) {
      targetUrl = req.session.targetUrl;
      delete req.session.targetUrl;
    }
    return auth.authenticate({
      successRedirect: targetUrl,
      failureRedirect: "/login",
    })(req, res, next);
  }
);

app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) next(err);
    else res.redirect("back");
  });
});

// -----------------------------------------------------------------------------
// Deployment
// -----------------------------------------------------------------------------
app.listen(APP_PORT, () => console.log(`Server listening on port ${APP_PORT}`));
