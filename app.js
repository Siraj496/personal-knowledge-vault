import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;
const saltRounds = 10;

// =======================
// Middleware
// =======================
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Make `user` available in all templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// =======================
// PostgreSQL Client
// =======================
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Database connection error:", err));

// =======================
// Passport Local Strategy
// =======================
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [username]);
      if (result.rows.length === 0) return done(null, false, { message: "User not found" });

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid) return done(null, user);
      else return done(null, false, { message: "Incorrect password" });
    } catch (err) {
      return done(err);
    }
  })
);

// =======================
// Passport Google Strategy
// =======================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [profile.email]);
        if (result.rows.length === 0) {
          const insert = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [profile.email, "google"]
          );
          return done(null, insert.rows[0]);
        } else {
          return done(null, result.rows[0]);
        }
      } catch (err) {
        return done(err);
      }
    }
  )
);

// =======================
// Passport Serialize/Deserialize
// =======================
passport.serializeUser((user, done) => {
  done(null, user.id); // store only user ID
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);
    if (result.rows.length === 0) return done(null, false);
    done(null, result.rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// =======================
// Routes
// =======================

// Home → redirect
app.get("/", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/dashboard");
  res.redirect("/login");
});

// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) console.error(err);
    res.redirect("/");
  });
});

app.get("/note", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");
  res.render("add-note.ejs"); // page with form
});


// Google OAuth
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);
// =======================
// Show Edit Page
// =======================
app.get("/edit-note/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const noteId = req.params.id;

  try {
    const result = await db.query(
      "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
      [noteId, req.user.id]
    );

    if (result.rows.length === 0) return res.redirect("/dashboard");

    res.render("edit-note", { note: result.rows[0] });
  } catch (err) {
    console.error("Edit fetch error:", err);
    res.send("Error loading edit page.");
  }
});

// =======================
// Dashboard
// =======================
app.get("/dashboard", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  try {
    const notesResult = await db.query(
      `SELECT n.id, n.title, n.content, n.created_at,
        COALESCE(json_agg(t.name) FILTER (WHERE t.id IS NOT NULL), '[]') AS tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE n.user_id = $1
      GROUP BY n.id
      ORDER BY n.created_at DESC`,
      [req.user.id]
    );

    const notes = notesResult.rows;
    res.render("dashboard", { notes, user: req.user });
  } catch (err) {
    console.error(err);
    res.send("Error fetching notes.");
  }
});


// =======================
// POST Routes
// =======================

// Register
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await db.query("SELECT * FROM users WHERE email=$1", [username]);
    if (existing.rows.length > 0) return res.redirect("/login");

    const hashed = await bcrypt.hash(password, saltRounds);

    const result = await db.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
      [username, hashed]
    );

    // Login after registration
    req.login(result.rows[0], (err) => {
      if (err) {
        console.error("Login after register failed:", err);
        return res.send("Error logging in after register.");
      }
      return res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    res.send("Error registering user.");
  }
});

app.post("/note", async (req, res) => {
  // Make sure user is logged in
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { title, content, tags } = req.body;

  try {
    // Insert note
    const noteResult = await db.query(
      "INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING id",
      [req.user.id, title, content]
    );

    const noteId = noteResult.rows[0].id;

    // Handle tags (comma separated)
    if (tags && tags.trim() !== "") {
      const tagList = tags.split(",").map((t) => t.trim().toLowerCase());

      for (const tagName of tagList) {
        // Insert tag if not exists
        const tagResult = await db.query(
          "INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id",
          [tagName]
        );
        const tagId = tagResult.rows[0].id;

        // Link note and tag
        await db.query(
          "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [noteId, tagId]
        );
      }
    }

    res.redirect("/dashboard"); // back to dashboard after adding
  } catch (err) {
    console.error("Error adding note:", err);
    res.send("Error adding note.");
  }
});

// =======================
// Delete Note
// =======================
app.post("/delete-note", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const noteId = req.body.noteId;

  try {
    // First delete relations in note_tags
    await db.query(
      "DELETE FROM note_tags WHERE note_id = $1",
      [noteId]
    );

    // Then delete note (only if it belongs to logged in user)
    await db.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2",
      [noteId, req.user.id]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Delete error:", err);
    res.send("Error deleting note.");
  }
});
// =======================
// Update Note
// =======================
app.post("/edit-note", async (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/login");

  const { noteId, title, content } = req.body;

  try {
    await db.query(
      "UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4",
      [title, content, noteId, req.user.id]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Update error:", err);
    res.send("Error updating note.");
  }
});

// Login
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  })
);
// =======================
// Start server
// =======================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
