require('dotenv').config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser"); // this si also a middleware

const Blog = require("./models/blog")

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;

//"mongodb://127.0.0.1:27017/short-url"
"mongodb://127.0.0.1:27017/blogify"
mongoose.connect(process.env.MONGO_URL)
.then(()=>{
    console.log("MongoDb Connected")
})
.catch((err)=>{
    console.log("MongoDb connection error:", err)
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token")); //we have initialized cookie parser and checking for cookie named token.
app.use(express.static(path.resolve("./public"))); //? <%# image not rendered because express js doesn't treat static assets as it operates with non static things. || because express thinks path of image as the route like/blog/new-add so we specific it serve it as static %>.

app.get("/", async(req, res)=>{
    // console.log("User Object:", req.user);
    const allBlogs = await Blog.find({}).sort({createdAt: -1}); 
    res.render("home", { 
        user: req.user,
        blogs: allBlogs,
    });
});


app.use("/user", userRoute); 
app.use("/blog", blogRoute); 

app.listen(PORT, ()=>{
    console.log(`Server Started ar PORT: ${PORT}`)
});