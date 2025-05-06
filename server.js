const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { MongoClient, ServerApiVersion } = require('mongodb');
const Joi = require('joi');
const path = require('path');
const app = express();
dotenv.config();


const uri = process.env.MONGODB_URI;
const port = process.env.PORT || 3000;

app.use("/js", express.static("./public/js"));
app.use("/css", express.static("./public/css"));
app.use("/image", express.static("./public/image"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let usersCollection;
let sessionsCollection;

async function connectToDB() {
    try {
        await client.connect();
        
        const db = client.db("myApp");
        usersCollection = db.collection("users");
        sessionsCollection = db.collection("sessions");
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
    //session exipre after 1 hour
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

app.get("/", (req, res) => {
    if (req.session.username) {
        res.redirect("/memberspage");
    } else {
        const doc = fs.readFileSync("./views/index.html", "utf8");
        res.setHeader("Content-Type", "text/html");
        res.send(doc);
    }
});

app.get("/loginpage", (req, res) => {
    if (req.session.username) {
        res.redirect("/memberspage");
    } else {
        const doc = fs.readFileSync("./views/login.html", "utf8");
        res.setHeader("Content-Type", "text/html");
        res.send(doc);
    }
});

app.get("/signuppage", (req, res) => {
    if (req.session.username) {
        res.redirect("/memberspage");
    } else {
        const doc = fs.readFileSync("./views/signup.html", "utf8");
        res.setHeader("Content-Type", "text/html");
        res.send(doc);
    }
});

app.get("/memberspage", (req, res) => {
    if (req.session.username) {
        const doc = fs.readFileSync("./views/members.html", "utf8");
        res.setHeader("Content-Type", "text/html");
        res.send(doc);
    } else {
        res.redirect("/loginpage");
    }
});

app.post("/signup", async (req, res) => {
    const json = req.body;

    //Using joi to validate for user name
    const schema = Joi.object({
        username: Joi.string().max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(20).required()
    });

    const validationResult = schema.validate(json);

    // if i got error maeesage from validation it will allow not
    if (validationResult.error) {
        return res.status(400).json({ error: validationResult.error.details[0].message });
    }

    const hashedPassword = bcrypt.hashSync(json.password, 12);
    const user = {
        username: json.username,
        email: json.email,
        password: hashedPassword
    };

    try {
        const result = await usersCollection.insertOne(user);
        req.session.username = user.username;
        req.session.save(() => {
            res.json({ redirect: "/memberspage" });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to insert user" });
    }
});

app.post("/login", async (req, res) => {
    const json = req.body;
    const user = await usersCollection.findOne({ email: json.email });

    if (user && await bcrypt.compare(json.password, user.password)) {
        req.session.username = user.username;

        req.session.save(() => {
            res.redirect("/memberspage");
        });

    } else {
        res.status(401).json({ error: "Invalid email or password" });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            res.status(500).send("Error logging out");
        } else {
            res.redirect("/");

        }
    });
});

app.get("/getUsername", (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.redirect('/loginpage');
    }
});

app.use((req, res) => {
    res.status(404).send("Page not found - 404");
});

app.listen(port, () => {
    console.log('Server running at http://localhost:' + port);
});
