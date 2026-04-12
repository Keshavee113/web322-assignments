const express = require("express");
const router = express.Router();
const MealKit = require("../models/MealKit");

router.get("/mealkits", async (req, res) => {


  if (!req.session.user || req.session.user.role !== "Data Clerk") {
    return res.status(403).render("error", {
      code: 403,
      message: "You are not authorized to add meal kits"
    });
  }

  const existing = await MealKit.find();

  if (existing.length > 0) {
    return res.render("error", {
      code: 200,
      message: "Meal kits already exist in database"
    });
  }

  await MealKit.insertMany([
    {
      title: "Butter Chicken",
      includes: "Chicken, spices",
      description: "Classic Indian dish",
      category: "Indian",
      price: 12.99,
      cookingTime: 30,
      servings: 2,
      imageUrl: "/images/kit1.jpg",
      featuredMealKit: true
    },
    {
      title: "Paneer Tikka",
      includes: "Paneer, spices",
      description: "Vegetarian meal",
      category: "Indian",
      price: 10.99,
      cookingTime: 25,
      servings: 2,
      imageUrl: "/images/kit2.jpg",
      featuredMealKit: true
    },
    {
      title: "Pasta Alfredo",
      includes: "Pasta, cream",
      description: "Italian pasta",
      category: "Italian",
      price: 11.99,
      cookingTime: 20,
      servings: 2,
      imageUrl: "/images/kit3.jpg",
      featuredMealKit: false
    },
    {
      title: "Pizza",
      includes: "Dough, cheese",
      description: "Classic pizza",
      category: "Italian",
      price: 13.99,
      cookingTime: 20,
      servings: 2,
      imageUrl: "/images/kit4.jpg",
      featuredMealKit: true
    },
    {
      title: "Tacos",
      includes: "Tortilla, meat",
      description: "Mexican tacos",
      category: "Mexican",
      price: 9.99,
      cookingTime: 15,
      servings: 2,
      imageUrl: "/images/kit5.jpg",
      featuredMealKit: false
    },
    {
      title: "Burrito",
      includes: "Rice, beans",
      description: "Mexican burrito",
      category: "Mexican",
      price: 10.99,
      cookingTime: 15,
      servings: 2,
      imageUrl: "/images/kit6.jpg",
      featuredMealKit: false
    }
  ]);

  res.render("error", {
    code: 200,
    message: "Meal kits added successfully"
  });
});

module.exports = router;