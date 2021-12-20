const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../data/database");

const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  let sessionData = req.session.inputData;
  if (!sessionData) {
    sessionData = {
      email: "",
      confirmedEmail: "",
      password: "",
      hasError: false,
      message: "",
    };
  }
  req.session.inputData = null;
  res.render("signup", { sessionData });
});

router.get("/login", function (req, res) {
  let sessionData = req.session.inputData;
  if (!sessionData) {
    sessionData = {
      email: "",
      password: "",
      hasError: false,
      message: "",
    };
  }
  res.render("login", { sessionData });
});

router.post("/signup", async function (req, res) {
  const userData = req.body;
  const enteredEmail = userData.email.toLowerCase().trim();
  const enteredConfirmEmail = userData["confirm-email"];
  const enteredPassword = userData.password;

  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  req.session.inputData = {
    hasError: true,
    message: "Invalid input - please check your data",
    email: enteredEmail,
    password: enteredPassword,
    confirmedEmail: enteredConfirmEmail,
  };

  if (
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim().length < 6 ||
    !enteredEmail.includes("@")
  ) {
    req.session.save(() => {
      res.redirect("/signup");
    });
    return;
  }

  const existingUser = await db
    .getDb()
    .collection("users")
    .findOne({ email: enteredEmail });

  if (existingUser) {
    req.session.inputData = {
      hasError: true,
      message: "Invalid input - User Already Exists.",
      email: enteredEmail,
      password: enteredPassword,
      confirmedEmail: enteredConfirmEmail,
    };
    req.session.save(() => {
      res.redirect("/signup");
    });
    return;
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
  let sessionData = req.session.inputData;
  if (!sessionData) {
    sessionData = {
      email: "",
      password: "",
      hasError: false,
      message: "",
    };
  }
  if (!loggedInUser) {
    //send an error back
    req.session.inputData = {
      email: enteredEmail,
      password: enteredPassword,
      message: "could not log in",
      hasError: true,
    };
    req.session.save(() => {
      res.redirect("/login");
    });
    return;
  }

  const passwordsMatch = await bcrypt.compare(
    enteredPassword,
    loggedInUser.password
  );
  if (!passwordsMatch) {
    req.session.inputData = {
      email: enteredEmail,
      password: enteredPassword,
      message: "could not log in, passwords do not match",
      hasError: true,
    };
    req.session.save(() => {
      res.redirect("/login");
    });
    return;
  }

  req.session.user = {
    id: loggedInUser._id,
    email: loggedInUser.email,
  };
  req.session.isAuthenticated = true;
  req.session.save(() => {
    res.redirect("/profile");
  });
});

router.get("/admin", async function (req, res) {
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }

  if (!res.locals.isAdmin) {
    return res.status(403).render("403");
  }

  res.render("admin");
});

router.get("/profile", function (req, res) {
  if (!res.locals.isAuth) {
    return res.status(401).render("401");
  }
  let sessionData = req.session.inputData;
  if (!sessionData) {
    sessionData = {
      email: "",
      password: "",
      hasError: false,
      message: "",
    };
  }
  res.render("profile", { sessionData });
});

router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  req.session.save(() => {
    res.redirect("/");
  });
});

module.exports = router;
