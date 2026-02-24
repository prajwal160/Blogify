const {Schema, model} = require("mongoose");

const blogSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    excerpt: {
        type: String,
        default: "",
    },
    tags: {
        type: [String],
        default: [],
    },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "published",
    },
    body:{
        type:String,
        required: true,
    },
    coverImageURL:{
        type:String,
        required:false,
    },
    createdBy:{
        type:Schema.Types.ObjectId,
        ref:"user",
    },
    views: {
        type: Number,
        default: 0,
    },
    likesCount: {
        type: Number,
        default: 0,
    },
},
{timestamps: true},
);

const Blog = model("blog", blogSchema);

module.exports = Blog;
