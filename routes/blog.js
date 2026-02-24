const { Router } = require("express");
const mongoose = require("mongoose");
const router = Router();

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const Blog = require("../models/blog");
const Comment = require("../models/comment");
const User = require("../models/user");
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

const BLOG_STATUSES = new Set(["draft", "published"]);

function slugify(value = "") {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function parseTags(value = "") {
    return value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8);
}

async function generateUniqueSlug(title, currentBlogId = null) {
    const base = slugify(title) || `post-${Date.now()}`;
    let slug = base;
    let counter = 1;

    while (
        await Blog.exists(
            currentBlogId
                ? { slug, _id: { $ne: currentBlogId } }
                : { slug }
        )
    ) {
        slug = `${base}-${counter}`;
        counter += 1;
    }

    return slug;
}

async function findBlogByIdentifier(identifier) {
    if (mongoose.isValidObjectId(identifier)) {
        return Blog.findById(identifier).populate("createdBy");
    }

    return Blog.findOne({ slug: identifier }).populate("createdBy");
}

function isOwner(user, blog) {
    return !!user && !!blog && String(user._id) === String(blog.createdBy?._id || blog.createdBy);
}

router.get("/add-new", requireAuth, (req, res) => {
    return res.render("addBlog", {
        user: req.user,
        formData: {
            title: "",
            excerpt: "",
            tags: "",
            status: "published",
            body: "",
        },
    });
});

router.get("/:identifier/edit", requireAuth, async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog || !isOwner(req.user, blog)) {
        return res.status(403).send("You are not allowed to edit this post.");
    }

    return res.render("editBlog", {
        user: req.user,
        blog,
        formData: {
            title: blog.title,
            excerpt: blog.excerpt,
            tags: (blog.tags || []).join(", "),
            status: blog.status,
            body: blog.body,
        },
    });
});

router.post("/:identifier/edit", requireAuth, upload.single("coverImage"), async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog || !isOwner(req.user, blog)) {
        return res.status(403).send("You are not allowed to edit this post.");
    }

    const title = req.body?.title?.trim() || "";
    const excerptInput = req.body?.excerpt?.trim() || "";
    const tagsInput = req.body?.tags?.trim() || "";
    const status = req.body?.status?.trim() || "published";
    const body = req.body?.body?.trim() || "";

    if (!title || !body) {
        return res.status(400).render("editBlog", {
            user: req.user,
            blog,
            error: "Title and body are required.",
            formData: {
                title,
                excerpt: excerptInput,
                tags: tagsInput,
                status,
                body,
            },
        });
    }

    if (!BLOG_STATUSES.has(status)) {
        return res.status(400).render("editBlog", {
            user: req.user,
            blog,
            error: "Invalid blog status.",
            formData: {
                title,
                excerpt: excerptInput,
                tags: tagsInput,
                status: "published",
                body,
            },
        });
    }

    const slug = title !== blog.title
        ? await generateUniqueSlug(title, blog._id)
        : blog.slug;

    const excerpt = excerptInput || `${body.slice(0, 160)}${body.length > 160 ? "..." : ""}`;
    const tags = parseTags(tagsInput);

    const updatedFields = {
        title,
        slug,
        excerpt,
        tags,
        status,
        body,
    };

    if (req.file?.path) {
        updatedFields.coverImageURL = req.file.path;
    }

    await Blog.updateOne({ _id: blog._id }, { $set: updatedFields });

    return res.redirect(`/blog/${slug}`);
});

router.post("/:identifier/delete", requireAuth, async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog || !isOwner(req.user, blog)) {
        return res.status(403).send("You are not allowed to delete this post.");
    }

    await Comment.deleteMany({ blogId: blog._id });
    await User.updateMany({}, { $pull: { bookmarks: blog._id } });
    await Blog.deleteOne({ _id: blog._id });

    return res.redirect("/");
});

router.post("/:identifier/like", requireAuth, async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog) {
        return res.status(404).send("Blog not found");
    }

    const userId = req.user._id;
    const liked = (blog.likedBy || []).some((id) => String(id) === String(userId));

    if (liked) {
        await Blog.updateOne(
            { _id: blog._id },
            {
                $pull: { likedBy: userId },
                $inc: { likesCount: -1 },
            }
        );
    } else {
        await Blog.updateOne(
            { _id: blog._id },
            {
                $addToSet: { likedBy: userId },
                $inc: { likesCount: 1 },
            }
        );
    }

    return res.redirect(`/blog/${blog.slug || blog._id}`);
});

router.post("/:identifier/bookmark", requireAuth, async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog) {
        return res.status(404).send("Blog not found");
    }

    const user = await User.findById(req.user._id).select("bookmarks");
    const isBookmarked = (user.bookmarks || []).some((id) => String(id) === String(blog._id));

    if (isBookmarked) {
        await User.updateOne({ _id: user._id }, { $pull: { bookmarks: blog._id } });
    } else {
        await User.updateOne({ _id: user._id }, { $addToSet: { bookmarks: blog._id } });
    }

    return res.redirect(`/blog/${blog.slug || blog._id}`);
});

router.get("/:identifier", async (req, res) => {
    const blog = await findBlogByIdentifier(req.params.identifier);

    if (!blog) {
        return res.status(404).send("Blog not found");
    }

    const owner = isOwner(req.user, blog);
    if (blog.status === "draft" && !owner) {
        return res.status(404).send("Blog not found");
    }

    await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
    blog.views = (blog.views || 0) + 1;

    const comments = await Comment.find({ blogId: blog._id }).populate("createdBy");

    const relatedQuery = {
        _id: { $ne: blog._id },
        status: "published",
    };

    if (blog.tags?.length) {
        relatedQuery.tags = { $in: blog.tags };
    }

    let relatedBlogs = await Blog.find(relatedQuery)
        .sort({ createdAt: -1 })
        .limit(3)
        .select("title slug coverImageURL createdAt");

    if (!relatedBlogs.length) {
        relatedBlogs = await Blog.find({ _id: { $ne: blog._id }, status: "published" })
            .sort({ createdAt: -1 })
            .limit(3)
            .select("title slug coverImageURL createdAt");
    }

    const currentUser = req.user ? await User.findById(req.user._id).select("bookmarks") : null;
    const liked = req.user
        ? (blog.likedBy || []).some((id) => String(id) === String(req.user._id))
        : false;
    const bookmarked = currentUser
        ? (currentUser.bookmarks || []).some((id) => String(id) === String(blog._id))
        : false;

    return res.render("blog", {
        user: req.user,
        blog,
        comments,
        relatedBlogs,
        isOwner: owner,
        isLiked: liked,
        isBookmarked: bookmarked,
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
            relatedBlogs: [],
            isOwner: isOwner(req.user, blog),
            isLiked: false,
            isBookmarked: false,
            error: "Comment cannot be empty.",
        });
    }

    await Comment.create({
        content,
        blogId: req.params.blogId,
        createdBy: req.user._id,
    });

    const updatedBlog = await Blog.findById(req.params.blogId).select("slug");
    return res.redirect(`/blog/${updatedBlog?.slug || req.params.blogId}`);
});

router.post("/", requireAuth, upload.single("coverImage"), async (req, res) => {
    try {
        const title = req.body?.title?.trim() || "";
        const excerptInput = req.body?.excerpt?.trim() || "";
        const tagsInput = req.body?.tags?.trim() || "";
        const status = req.body?.status?.trim() || "published";
        const body = req.body?.body?.trim() || "";

        if (!title || !body) {
            return res.status(400).render("addBlog", {
                user: req.user,
                error: "Title and body are required.",
                formData: {
                    title,
                    excerpt: excerptInput,
                    tags: tagsInput,
                    status,
                    body,
                },
            });
        }

        if (!BLOG_STATUSES.has(status)) {
            return res.status(400).render("addBlog", {
                user: req.user,
                error: "Invalid blog status.",
                formData: {
                    title,
                    excerpt: excerptInput,
                    tags: tagsInput,
                    status: "published",
                    body,
                },
            });
        }

        const coverImageURL = req.file?.path?.startsWith("http")
            ? req.file.path
            : (req.file?.filename ? `/uploads/${req.file.filename}` : "/images/default.png");

        const slug = await generateUniqueSlug(title);
        const excerpt = excerptInput || `${body.slice(0, 160)}${body.length > 160 ? "..." : ""}`;
        const tags = parseTags(tagsInput);

        const blog = await Blog.create({
            title,
            slug,
            excerpt,
            tags,
            status,
            body,
            createdBy: req.user._id,
            coverImageURL,
        });

        return res.redirect(`/blog/${blog.slug}`);
    } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;
