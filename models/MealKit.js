const mongoose = require("mongoose");

const mealKitSchema = new mongoose.Schema({
  title: String,
  includes: String,
  description: String,
  category: String,
  price: Number,
  cookingTime: Number,
  servings: Number,
  imageUrl: String,
  featuredMealKit: Boolean
});

module.exports = mongoose.model("MealKit", mealKitSchema);