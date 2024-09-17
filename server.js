var express = require('express');
const app = express();
const math = require("mathjs");
const port = 3000; // Use 3000 for the port number
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

// Firebase Admin SDK Initialization
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
var serviceAccount = require("");

// Middleware setup
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore(); // Firestore initialization

app.get('/', (req, res) => {
    res.render("home");
});

app.get('/main', (req, res) => {
    res.render("main");
});

app.get('/signin', (req, res) => {
    res.render("signin");
});

app.get('/about', (req, res) => {
    res.render("about");
});

app.get('/product', (req, res) => {
    res.render("product");
});

app.get('/contact', (req, res) => {
    res.render("contact");
});

app.get('/signup', (req, res) => {
    res.render("signup", { error: "" });
});

// Signup route
app.post('/signup', async (req, res) => {
    const { full_name, last_name, email, password } = req.body;

    try {
        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            displayName: full_name + " " + last_name,
            email: email,
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user data in Firestore
        await db.collection("users").doc(userRecord.uid).set({
            name: full_name + " " + last_name,
            email: email,
            password: hashedPassword,
        });

        console.log("Successfully created new user:", userRecord.uid);
        res.render("signin", { error: "" });

    } catch (error) {
        const errorMessage = error.errorInfo.message;
        console.error("Error creating new user:", errorMessage);
        res.render("signup", { error: errorMessage });
    }
});

// Signin route
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const querySnapshot = await db.collection("users").where("email", "==", email).get();
        if (querySnapshot.empty) {
            return res.send("No account found with this email");
        }

        // Get user data
        const userDoc = querySnapshot.docs[0].data();
        const storedHashedPassword = userDoc.password;

        // Compare passwords
        const passwordMatch = await bcrypt.compare(password, storedHashedPassword);

        if (passwordMatch) {
            res.render("main");
        } else {
            res.send("Incorrect password");
        }

    } catch (error) {
        console.error("Error signing in user:", error);
        res.status(500).send('An error occurred while signing in');
    }
});

// Cart functionality
const cartItems = [];
const itemCosts = [];
let totalAmount = 0;

app.get("/addToCart", (req, res) => {
    const itemName = req.query.ItemName;
    let itemCost = req.query.ItemCost;

    if (itemCost) {
        itemCosts.push(itemCost);
        const numericCost = math.evaluate(itemCost.slice(0, itemCost.length - 2)); // Remove currency symbol
        totalAmount += numericCost;

        cartItems.push(itemName);
    }
    res.render("product");
});

app.get("/cart", (req, res) => {
    if (cartItems.length > 0) {
        db.collection("Cart").add({
            Cart: cartItems,
            Cost: itemCosts,
            TotalCost: totalAmount,
        }).then(() => {
            res.render("cart", { productsData: cartItems, amount: totalAmount, cost: itemCosts });
        }).catch(err => {
            console.error('Error adding to cart:', err);
            res.status(500).send('Error processing cart');
        });
    } else {
        res.send('Cart is empty');
    }
});

app.get("/cartsubmit", (req, res) => {
    res.render("contact");
});

app.get("/ordersubmit", (req, res) => {
    res.render("contact");
});

app.get("/contact", (req, res) => {
    res.render("contact");
});

// Contact form submission
app.get("/contactsubmit", (req, res) => {
    const { email, phone, review } = req.query;

    db.collection("Feedback").add({
        Email: email,
        PhoneNumber: phone,
        Feedback: review,
    }).then(() => {
        res.render("thankyou");
    }).catch(err => {
        console.error('Error submitting feedback:', err);
        res.status(500).send('Error submitting feedback');
    });
});

app.get("/thankyou", (req, res) => {
    res.render("thankyou");
});

app.get("/thankyousubmit", (req, res) => {
    res.render("home");
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
