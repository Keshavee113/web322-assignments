const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const MealKit = require("../models/MealKit");
const { sendEmail } = require("../services/mailgun-service");


router.get("/", async (req, res) => {
  const featuredMealKits = await MealKit.find({ featuredMealKit: true });
  res.render("home", { featuredMealKits });
});

router.get("/on-the-menu", async (req, res) => {
  const kits = await MealKit.find().sort({ category: 1, title: 1 });

  const categories = [];
  kits.forEach((k) => {
    let found = categories.find((c) => c.categoryName === k.category);
    if (!found) {
      found = { categoryName: k.category, mealKits: [] };
      categories.push(found);
    }
    found.mealKits.push(k);
  });

  res.render("on-the-menu", { categories });
});


router.get("/sign-up", (req, res) => {
  res.render("sign-up");
});

router.get("/log-in", (req, res) => {
  res.render("log-in");
});


router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (existingUser) {
      return res.status(400).render("error", {
        code: 400,
        message: "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: "Customer"
    });

    res.redirect("/log-in");
  } catch (err) {
    res.status(500).render("error", {
      code: 500,
      message: "Unable to create your account."
    });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    });

    if (!user) {
      return res.status(401).render("error", {
        code: 401,
        message: "Invalid login credentials."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches || user.role !== role) {
      return res.status(401).render("error", {
        code: 401,
        message: "Invalid login credentials."
      });
    }

    req.session.user = {
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };

    if (!req.session.cart) {
      req.session.cart = [];
    }

    res.redirect("/");
  } catch (err) {
    res.status(500).render("error", {
      code: 500,
      message: "Unable to log in."
    });
  }
});


router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});


router.post("/cart/add/:id", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "Customer") {
    return res.status(403).render("error", {
      code: 403,
      message: "Only logged-in customers can add items to the cart."
    });
  }

  const id = req.params.id;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const existing = req.session.cart.find((item) => item.id === id);

  if (existing) {
    existing.qty += 1;
  } else {
    req.session.cart.push({ id, qty: 1 });
  }

  res.redirect("/cart");
});


router.get("/cart", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "Customer") {
    return res.status(403).render("error", {
      code: 403,
      message: "Only logged-in customers can access the shopping cart."
    });
  }

  const cart = req.session.cart || [];
  const detailedCart = [];
  let subtotal = 0;

  for (const item of cart) {
    const kit = await MealKit.findById(item.id);

    if (!kit) {
      continue;
    }

    const total = kit.price * item.qty;
    subtotal += total;

    detailedCart.push({
      kit,
      qty: item.qty,
      total
    });
  }

  const tax = subtotal * 0.10;
  const grandTotal = subtotal + tax;

  res.render("cart", {
    detailedCart,
    subtotal,
    tax,
    grandTotal
  });
});


router.post("/cart/update/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "Customer") {
    return res.status(403).render("error", {
      code: 403,
      message: "Only logged-in customers can update the shopping cart."
    });
  }

  const quantity = Number(req.body.quantity);

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const item = req.session.cart.find((i) => i.id === req.params.id);

  if (item) {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      req.session.cart = req.session.cart.filter((i) => i.id !== req.params.id);
    } else {
      item.qty = quantity;
    }
  }

  res.redirect("/cart");
});


router.post("/cart/remove/:id", (req, res) => {
  if (!req.session.user || req.session.user.role !== "Customer") {
    return res.status(403).render("error", {
      code: 403,
      message: "Only logged-in customers can update the shopping cart."
    });
  }

  req.session.cart = (req.session.cart || []).filter(
    (i) => i.id !== req.params.id
  );

  res.redirect("/cart");
});


router.post("/cart/place-order", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "Customer") {
    return res.status(403).render("error", {
      code: 403,
      message: "Only logged-in customers can place orders."
    });
  }

  const cart = req.session.cart || [];

  if (cart.length === 0) {
    return res.status(400).render("error", {
      code: 400,
      message: "Your shopping cart is empty."
    });
  }

  const detailedCart = [];
  let subtotal = 0;

  for (const item of cart) {
    const kit = await MealKit.findById(item.id);

    if (!kit) {
      continue;
    }

    const total = kit.price * item.qty;
    subtotal += total;

    detailedCart.push({
      kit,
      qty: item.qty,
      total
    });
  }

  const tax = subtotal * 0.10;
  const grandTotal = subtotal + tax;

  const rows = detailedCart.map((item) => `
    <tr>
      <td>${item.kit.title}</td>
      <td>${item.kit.includes}</td>
      <td>$${item.kit.price.toFixed(2)}</td>
      <td>${item.qty}</td>
      <td>$${item.total.toFixed(2)}</td>
    </tr>
  `).join("");

  const html = `
    <h2>Thank you for your order, ${req.session.user.firstName}!</h2>
    <p>Here is your order summary:</p>
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
      <thead>
        <tr>
          <th>Meal Kit</th>
          <th>Includes</th>
          <th>Price</th>
          <th>Quantity</th>
          <th>Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <p><strong>Subtotal:</strong> $${subtotal.toFixed(2)}</p>
    <p><strong>Tax:</strong> $${tax.toFixed(2)}</p>
    <p><strong>Grand Total:</strong> $${grandTotal.toFixed(2)}</p>
  `;

  try {
    await sendEmail(
      req.session.user.email,
      "Your MealKitly Order Confirmation",
      html
    );

    req.session.cart = [];

    res.render("error", {
      code: 200,
      message: "Order placed successfully. A confirmation email has been sent."
    });
  } catch (err) {
    res.status(500).render("error", {
      code: 500,
      message: "Your order could not be emailed. Check your Mailgun settings."
    });
  }
});

module.exports = router;