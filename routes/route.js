const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const express = require("express");

const prisma = new PrismaClient();
const router = express.Router();

router.post("/auth", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      const passwordMatch = await bcrypt.compare(
        password,
        existingUser.password
      );
      if (passwordMatch) {
        res.status(200).json({
          message: "Login successful!",
          username: existingUser.username,
        });
      } else {
        res.status(401).json({
          error: "Invalid credentials, or the username is already taken",
        });
      }
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
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
router.post("/end", async (req, res) => {
  const { username, matches, wins, draws } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: {
        matches: user.matches + matches,
        wins: user.wins + wins,
        draws: user.draws + draws,
      },
    });

    res.status(200).json({ message: "User stats updated", updatedUser });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while updating the user stats" });
  }
});
router.get("/dashboard/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: {
        username: id,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/", (req, res) => {
  res.send("Hello World!");
});

module.exports = router;
