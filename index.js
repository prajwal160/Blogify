require('dotenv').config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const Blog = require("./models/blog");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const app = express();
const PORT = process.env.PORT || 8000;
const PAGE_SIZE = 6;

async function connectDatabase() {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("MongoDb Connected");
}

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));

    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
    }));
}

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

app.get("/", async (req, res, next) => {
    try {
        const q = (req.query.q || "").trim();
        const tag = (req.query.tag || "").trim().toLowerCase();
        const sort = (req.query.sort || "latest").trim();
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

        const filter = { status: "published" };

        if (q) {
            const regex = new RegExp(q, "i");
            filter.$or = [
                { title: regex },
                { excerpt: regex },
                { tags: regex },
            ];
        }

        if (tag) {
            filter.tags = tag;
        }

        const sortMap = {
            latest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            popular: { views: -1, createdAt: -1 },
        };

        const activeSort = sortMap[sort] ? sort : "latest";
        const totalBlogs = await Blog.countDocuments(filter);
        const totalPages = Math.max(Math.ceil(totalBlogs / PAGE_SIZE), 1);
        const currentPage = Math.min(page, totalPages);

        const blogs = await Blog.find(filter)
            .populate("createdBy")
            .sort(sortMap[activeSort])
            .skip((currentPage - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE);

        const tags = await Blog.aggregate([
            { $match: { status: "published" } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
        ]);

        return res.render("home", {
            user: req.user,
            blogs,
            filters: {
                q,
                tag,
                sort: activeSort,
                page: currentPage,
            },
            pagination: {
                totalBlogs,
                totalPages,
                currentPage,
                hasPrev: currentPage > 1,
                hasNext: currentPage < totalPages,
            },
            topTags: tags.map((item) => item._id),
            pageTitle: "Blogify - Read Developer Stories",
            metaDescription: "Read developer blogs on coding, design, and career growth.",
            ogTitle: "Blogify",
            ogImage: "/images/favicon.png",
        });
    } catch (error) {
        return next(error);
    }
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

app.use((req, res) => {
    return res.status(404).send("Page not found");
});

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);

    if (res.headersSent) {
        return next(err);
    }

    return res.status(500).send("Something went wrong. Please try again later.");
});

if (require.main === module) {
    connectDatabase()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server Started at PORT: ${PORT}`);
            });
        })
        .catch((err) => {
            console.log("MongoDb connection error:", err);
            process.exit(1);
        });
}

module.exports = app;
