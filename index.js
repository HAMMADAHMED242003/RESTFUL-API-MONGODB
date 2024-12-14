  const express = require("express");
  const mongoose = require("mongoose");
  const methodOverride = require("method-override");
  const path = require("path");
  const session = require("express-session");
  const cookieParser = require("cookie-parser");

  const app = express();
  const port = 3000;

  // Middleware
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride("_method"));
  app.use(cookieParser());
  app.use(
    session({
      secret: "your-secret-key", 
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 60000 }, // Session cookie valid for 1 minute
    })
  );
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.static(path.join(__dirname, "public")));

  // Connect to MongoDB
  mongoose
    .connect("mongodb://localhost:27017/postsDB")
    .then(() => {
      console.log("MongoDB connected!");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
    });

  // Define Mongoose Schema and Model
  const postSchema = new mongoose.Schema({
    username: String,
    content: String,
  });

  const Post = mongoose.model("Post", postSchema);

  // Middleware to check session
  const checkSession = (req, res, next) => {
    if (!req.session.username) {
      return res.redirect("/login");
    }
    next();
  };

  // Routes

  // Login page
  app.get("/", (req, res) => {
    res.render("login.ejs");
  });

  // Login action
  app.post("/login", (req, res) => {
    const { username } = req.body;
    if (username) {
      req.session.username = username; // Store username in session
      res.redirect("/posts");
    } else {
      res.status(400).send("Username is required.");
    }
  });

  // Logout action
  app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).send("Error logging out.");
      }
      res.clearCookie("connect.sid"); // Clear session cookie
      res.redirect("/login");
    });
  });

  app.use((req, res, next) => {
    console.log("Session data:", req.session);
    next();
  });


  // Display all posts (protected route)
  app.get("/posts", checkSession, async (req, res) => {
    const posts = await Post.find({});
    res.render("index.ejs", { posts, username: req.session.username });
  });

  // Form to create a new post (protected route)
  app.get("/posts/new", checkSession, (req, res) => {
    res.render("new.ejs", { username: req.session.username });
  });

  // Add a new post (protected route)
  app.post("/posts", checkSession, async (req, res) => {
    const { username, content } = req.body;
    try {
      const newPost = new Post({ username, content });
      await newPost.save();
      res.redirect("/posts");
    } catch (err) {
      console.error("Error saving post:", err);
      res.status(500).send("Error saving post.");
    }
  });

  // Show a single post (protected route)
  app.get("/posts/:id", checkSession, async (req, res) => {
    const { id } = req.params;
    try {
      const post = await Post.findById(id);
      if (post) {
        res.render("show.ejs", { post, username: req.session.username });
      } else {
        res.status(404).send("Post not found.");
      }
    } catch (err) {
      console.error("Error retrieving post:", err);
      res.status(500).send("Error retrieving post.");
    }
  });

  // Edit a post (protected route)
  app.get("/posts/:id/edit", checkSession, async (req, res) => {
    const { id } = req.params;
    try {
      const post = await Post.findById(id);
      if (post) {
        res.render("edit.ejs", { post, username: req.session.username });
      } else {
        res.status(404).send("Post not found.");
      }
    } catch (err) {
      console.error("Error retrieving post:", err);
      res.status(500).send("Error retrieving post.");
    }
  });

  // Update a post (protected route)
  app.patch("/posts/:id", checkSession, async (req, res) => {
    const { id } = req.params;
    const { username, content } = req.body;
    try {
      const post = await Post.findByIdAndUpdate(
        id,
        { username, content },
        { new: true }
      );
      if (post) {
        res.redirect("/posts");
      } else {
        res.status(404).send("Post not found.");
      }
    } catch (err) {
      console.error("Error updating post:", err);
      res.status(500).send("Error updating post.");
    }
  });

  // Delete a post (protected route)
  app.delete("/posts/:id", checkSession, async (req, res) => {
    const { id } = req.params;
    try {
      await Post.findByIdAndDelete(id);
      res.redirect("/posts");
    } catch (err) {
      console.error("Error deleting post:", err);
      res.status(500).send("Error deleting post.");
    }
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
