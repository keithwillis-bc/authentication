const path = require("path");

const express = require("express");
const session = require("express-session");
const mongoDbStore = require("connect-mongodb-session");

const db = require("./data/database");
const demoRoutes = require("./routes/demo");
const { Http2ServerRequest } = require("http2");

const MongoDbStore = mongoDbStore(session);

const app = express();

const sessionStore = new MongoDbStore({
  uri: "mongodb://localhost:27017",
  databaseName: "auth-demo",
  collection: "sessions",
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: "super-secret",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      maxAge: 60 * 1000 * 20,
    },
  })
);

app.use(async (req, res, next) => {
  const isAuth = req.session.isAuthenticated;
  const user = req.session.user;
  console.log(user);
  if (!user || !isAuth) {
    return next();
  }
  const userDoc = await db
    .getDb()
    .collection("users")
    .findOne({ _id: user.id });

  const isAdmin = userDoc.isAdmin;

  res.locals.isAuth = isAuth;
  res.locals.isAdmin = isAdmin;

  next();
});

app.use(demoRoutes);

app.use(function (error, req, res, next) {
  console.log(error);
  res.render("500");
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
