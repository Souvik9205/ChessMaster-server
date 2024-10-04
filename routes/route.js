const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const express = require("express");

const prisma = new PrismaClient();
const router = express.Router();

router.post("/auth", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      // Compare passwords
      const passwordMatch = await bcrypt.compare(
        password,
        existingUser.password
      );
      if (passwordMatch) {
        // Send success response (username will be stored in localStorage by the frontend)
        res.status(200).json({
          message: "Login successful!",
          username: existingUser.username,
        });
      } else {
        // Password does not match
        res
          .status(401)
          .json({
            error: "Invalid credentials, or the username is already taken",
          });
      }
    } else {
      // User does not exist, create a new user
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

      const newUser = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
      });

      res.status(201).json({
        message: "User registered successfully!",
        username: newUser.username,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during authentication" });
  }
});

router.get("/", (req, res) => {
  res.send("Hello World!");
});

module.exports = router;
