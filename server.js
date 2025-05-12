// server.js
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');
const app = express();

dotenv.config();

// Setup
const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/js", express.static("./public/js"));
app.use("/css", express.static("./public/css"));
app.use("/image", express.static("./public/image"));

// MongoDB
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let usersCollection;

async function connectToDB() {
    try {
        await client.connect();
        const db = client.db("myApp");
        usersCollection = db.collection("users");
        console.log("Connected to MongoDB");
    } catch (err) {
        console.error("MongoDB connection failed", err);
    }
}
connectToDB();

app.use(session({
    secret: process.env.NODE_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: uri,
        dbName: "myApp",
        crypto: {
            secret: process.env.MONGODB_SESSION_SECRET
        }
    }),
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// Middleware to expose session to EJS
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/members", (req, res) => {
    if (!req.session.username) return res.redirect("/");
    res.render("members");
});

app.get("/admin", async (req, res) => {
    if (!req.session.username) return res.redirect("/login");
    const currentUser = await usersCollection.findOne({ username: req.session.username });
    if (!currentUser || currentUser.user_type !== 'admin') {
        return res.status(403).send("403 - Failed");
    }
    const users = await usersCollection.find().toArray();
    res.render("admin", { users });
});

app.post("/promote", async (req, res) => {
    await usersCollection.updateOne(
        { email: req.body.email },
        { $set: { user_type: "admin" } }
    );
    res.redirect("/admin");
});

app.post("/demote", async (req, res) => {
    await usersCollection.updateOne(
        { email: req.body.email },
        { $set: { user_type: "user" } }
    );
    res.redirect("/admin");
});

app.post("/signup", async (req, res) => {
    const schema = Joi.object({
        username: Joi.string().max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(20).required()
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    const hashedPassword = bcrypt.hashSync(req.body.password, 12);
    const newUser = {
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword,
        user_type: "user"
    };

    try {
        await usersCollection.insertOne(newUser);
        req.session.username = newUser.username;
        res.redirect("/members");
    } catch (err) {
        res.status(500).send("Failed to sign up user");
    }
});

app.post("/login", async (req, res) => {
    const user = await usersCollection.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        req.session.username = user.username;
        res.redirect("/members");
    } else {
        res.status(401).send("Invalid email or password");
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).send("Error logging out");
        res.redirect("/");
    });
});

// 404 page
app.use((req, res) => {
    res.status(404).render("404");
});

// Server start
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
