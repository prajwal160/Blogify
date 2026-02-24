const { Router } = require("express");
const User = require("../models/user");

const router = Router();

router.get("/signin", (req, res) => {
    return res.render("signin", {
        pageTitle: "Signin | Blogify",
        metaDescription: "Signin to Blogify to publish and engage with blogs.",
        ogTitle: "Signin - Blogify",
    });
});

router.get("/signup", (req, res) => {
    return res.render("signup", {
        pageTitle: "Create Account | Blogify",
        metaDescription: "Create your Blogify account to write and share blog posts.",
        ogTitle: "Signup - Blogify",
    });
});

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    try {
        const token = await User.matchPasswordAndGenerateToken(email, password);
        return res.cookie("token", token).redirect("/");
    } catch (error) {
        return res.render("signin", {
            error: "Incorrect Email or Password",
            pageTitle: "Signin | Blogify",
            metaDescription: "Signin to Blogify to publish and engage with blogs.",
            ogTitle: "Signin - Blogify",
        });
    }
});

router.get("/logout", (req, res) => {
    res.clearCookie("token").redirect("/");
});

router.post("/signup", async (req, res) => {
    const { fullName, email, password } = req.body;

    await User.create({
        fullName,
        email,
        password,
    });

    return res.redirect("/");
});

module.exports = router;
