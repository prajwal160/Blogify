const { Router } = require("express");
const router = Router();

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const Blog = require("../models/blog");
const Comment = require("../models/comment");
const { requireAuth } = require("../middlewares/authentication");

const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    throw new Error("Missing Cloudinary environment variables.");
}

cloudinary.config(cloudinaryConfig);

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: process.env.CLOUDINARY_FOLDER || "blog-uploads",
        format: async () => "jpeg",
        public_id: (req, file) => `${Date.now()}-${file.originalname}`,
    },
});

const upload = multer({ storage });

router.get("/add-new", requireAuth, (req, res) => {
    return res.render("addBlog", {
        user: req.user,
    });
});

router.get("/:id", async (req, res) => {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");

    return res.render("blog", {
        user: req.user,
        blog,
        comments,
    });
});

router.post("/comment/:blogId", requireAuth, async (req, res) => {
    const content = req.body?.content?.trim();

    if (!content) {
        const blog = await Blog.findById(req.params.blogId).populate("createdBy");
        const comments = await Comment.find({ blogId: req.params.blogId }).populate("createdBy");

        return res.status(400).render("blog", {
            user: req.user,
            blog,
            comments,
            error: "Comment cannot be empty.",
        });
    }

    await Comment.create({
        content,
        blogId: req.params.blogId,
        createdBy: req.user._id,
    });

    return res.redirect(`/blog/${req.params.blogId}`);
});

router.post("/", requireAuth, upload.single("coverImage"), async (req, res) => {
    try {
        const title = req.body?.title?.trim();
        const body = req.body?.body?.trim();

        if (!title || !body) {
            return res.status(400).render("addBlog", {
                user: req.user,
                error: "Title and body are required.",
            });
        }

        const coverImageURL = req.file?.path?.startsWith("http")
            ? req.file.path
            : (req.file?.filename ? `/uploads/${req.file.filename}` : "/images/default.png");

        const blog = await Blog.create({
            body,
            title,
            createdBy: req.user._id,
            coverImageURL,
        });

        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
