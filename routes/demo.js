const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../data/database");

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  res.render("signup");
});

router.get("/login", function (req, res) {
  res.render("login");
});

router.post("/signup", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData["confirm-email"];
  const enteredPassword = userData.password;

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  if (
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim().length < 6 ||
    !enteredEmail.includes("@")
  ) {
    console.log("incorrect data");
    return res.redirect("/signup");
  }

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (existingUser) {
    console.log("duplicate user");
    return res.redirect("/signup");
  }

  const user = {
    email: enteredEmail.toLowerCase(),
    password: hashedPassword,
  };
  await db.getDb().collection("users").insertOne(user);

  res.redirect("/login");
});

router.post("/login", async function (req, res) {
  const enteredPassword = req.body.password;
  const enteredEmail = req.body.email;
  const user = {
    email: enteredEmail.toLowerCase(),
  };

  const loggedInUser = await db.getDb().collection("users").findOne(user);

  if (!loggedInUser) {
    //send an error back
    console.log("could not log in");
    return res.redirect("/login");
  }

  const passwordsMatch = await bcrypt.compare(
    enteredPassword,
    loggedInUser.password
  );
  if (!passwordsMatch) {
    console.log("could not log in, passwords do not match");
    return res.redirect("/login");
  }

  console.log("user is authenticated");

  req.session.user = { id: loggedInUser._id, email: loggedInUser.email };
  req.session.isAuthenticated = true;
  req.session.save(() => {
    res.redirect("/admin");
  });
});

router.get("/admin", function (req, res) {
  if (!req.session.isAuthenticated) {
    return res.status(401).render("401");
  }

  res.render("admin");
});

router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  req.session.save(() => {
    res.redirect("/");
  });
});

module.exports = router;
