const express = require("express");
const path = require("path");
const layouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
require("dotenv").config();

const generalController = require("./controllers/generalController");
const mealkitsController = require("./controllers/mealkitsController");
const loadDataController = require("./controllers/loadDataController");

const app = express();
const PORT = process.env.PORT || 8080;


mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));


app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});


app.set("view engine", "ejs");
app.use(layouts);
app.set("layout", "layouts/main");


app.use("/", generalController);
app.use("/mealkits", mealkitsController);
app.use("/load-data", loadDataController);


app.use((req, res) => {
  res.status(404).render("error", {
    code: 404,
    message: "Page not found"
  });
});

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));