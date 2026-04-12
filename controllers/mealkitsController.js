const express = require("express");
const router = express.Router();
const MealKit = require("../models/MealKit");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

function isDataClerk(req, res, next) {
  if (!req.session.user || req.session.user.role !== "Data Clerk") {
    return res.status(403).render("error", {
      code: 403,
      message: "You are not authorized to access this page."
    });
  }
  next();
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only jpg, jpeg, png, and gif files are allowed."));
    }
  }
});


router.get("/list", isDataClerk, async (req, res) => {
  const kits = await MealKit.find().sort({ title: 1 });
  res.render("mealkits-list", { kits });
});


router.get("/add", isDataClerk, (req, res) => {
  res.render("add-mealkit");
});


router.post("/add", isDataClerk, upload.single("imageUrl"), async (req, res) => {
  try {
    const {
      title,
      includes,
      description,
      category,
      price,
      cookingTime,
      servings
    } = req.body;

    if (!req.file) {
      return res.status(400).render("error", {
        code: 400,
        message: "An image file is required."
      });
    }

    await MealKit.create({
      title: title.trim(),
      includes: includes.trim(),
      description: description.trim(),
      category: category.trim(),
      price: Number(price),
      cookingTime: Number(cookingTime),
      servings: Number(servings),
      imageUrl: "/uploads/" + req.file.filename,
      featuredMealKit: !!req.body.featuredMealKit
    });

    res.redirect("/mealkits/list");
  } catch (err) {
    res.status(500).render("error", {
      code: 500,
      message: err.message || "Unable to add meal kit."
    });
  }
});


router.get("/edit/:id", isDataClerk, async (req, res) => {
  const kit = await MealKit.findById(req.params.id);

  if (!kit) {
    return res.status(404).render("error", {
      code: 404,
      message: "Meal kit not found."
    });
  }

  res.render("edit-mealkit", { kit });
});


router.post("/edit/:id", isDataClerk, upload.single("imageUrl"), async (req, res) => {
  try {
    const kit = await MealKit.findById(req.params.id);

    if (!kit) {
      return res.status(404).render("error", {
        code: 404,
        message: "Meal kit not found."
      });
    }

    kit.title = req.body.title.trim();
    kit.includes = req.body.includes.trim();
    kit.description = req.body.description.trim();
    kit.category = req.body.category.trim();
    kit.price = Number(req.body.price);
    kit.cookingTime = Number(req.body.cookingTime);
    kit.servings = Number(req.body.servings);
    kit.featuredMealKit = !!req.body.featuredMealKit;

    if (req.file) {
      if (kit.imageUrl && kit.imageUrl.startsWith("/uploads/")) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          kit.imageUrl.replace(/^\//, "")
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      kit.imageUrl = "/uploads/" + req.file.filename;
    }

    await kit.save();
    res.redirect("/mealkits/list");
  } catch (err) {
    res.status(500).render("error", {
      code: 500,
      message: err.message || "Unable to update meal kit."
    });
  }
});


router.get("/remove/:id", isDataClerk, async (req, res) => {
  const kit = await MealKit.findById(req.params.id);

  if (!kit) {
    return res.status(404).render("error", {
      code: 404,
      message: "Meal kit not found."
    });
  }

  res.render("delete-confirm", { kit });
});


router.post("/remove/:id", isDataClerk, async (req, res) => {
  const kit = await MealKit.findById(req.params.id);

  if (!kit) {
    return res.status(404).render("error", {
      code: 404,
      message: "Meal kit not found."
    });
  }

  if (kit.imageUrl && kit.imageUrl.startsWith("/uploads/")) {
    const imagePath = path.join(
      __dirname,
      "..",
      "public",
      kit.imageUrl.replace(/^\//, "")
    );

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  await MealKit.findByIdAndDelete(req.params.id);
  res.redirect("/mealkits/list");
});

module.exports = router;