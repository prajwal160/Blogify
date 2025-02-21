const {Router}= require("express");
const router = Router();
const path = require("path")

const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");  // ✅ Import CloudinaryStorage

const  Blog= require("../models/blog");
const  Comment= require("../models/comment");

// 🔹 Configure Cloudinary
cloudinary.config({
    cloud_name: "dbzzxajv2",  // Replace with your Cloudinary cloud name
    api_key: "953427381864972",        // Replace with your Cloudinary API key
    api_secret: "qiLpUxmUGGb7KebUIRbZD6xDflg",  // Replace with your Cloudinary API secret
});

// const storage = multer.diskStorage({  //made for local storage, gave error after deploying aswe are makeing changes to to deployed files on every post call during add blog. so I will use cloudinary,
//     destination: function (req, file, cb) {
//         cb(null, path.resolve(`./public/uploads/`));
//     },
//     filename: function (req, file, cb) {
//         const fileName = `${Date.now()}-${file.originalname}`;
//         cb(null, fileName)
//     }
// });

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "blog-uploads", // Cloudinary folder name
      format: async (req, file) => "jpeg", // Convert to jpeg format
      public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Unique filename
    },
});

const upload = multer({ storage: storage });


router.get("/add-new", (req, res)=>{
    return res.render("addBlog",{
        user: req.user,
    });
});

router.get("/:id", async (req, res)=>{
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    const comments = await Comment.find({blogId: req.params.id}).populate(
        "createdBy"
    );
    // console.log("comments", comments);
    // console.log("blog", blog);
    return res.render("blog",{
        user: req.user,
        blog,
        comments,
    })
})

router.post("/comment/:blogId",async (req, res)=>{
    const comment = await Comment.create({
        content : req.body.content,
        blogId: req.params.blogId,
        createdBy: req.user._id,
    });
    // console.log('Comment created:', comment);
    return res.redirect(`/blog/${req.params.blogId}`);
});


router.post("/", upload.single("coverImage"),async (req, res)=>{  //coverImage is name of the "input" tag in ejs file
    // console.log(req.body);
    // console.log(req.file); //file (multer)
    try {
        const {title, body} = req.body;

        const coverImageURL = req.file.path.startsWith("http") 
        ? req.file.path  // ✅ Use full Cloudinary URL
        : `/uploads/${req.file.filename}`; // ✅ Keep local images working
    
        const blog = await Blog.create({
            body,
            title,
            createdBy: req.user._id,
            // coverImageURL:  req.file.path.startsWith("http") ? req.file.path : `/uploads/${req.file.filename}`,
            coverImageURL: coverImageURL,
        });
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error("Error uploading image:", error);
        return res.status(500).send("Internal Server Error");
    }
});

module.exports = router;