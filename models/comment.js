const {Schema, model}= require("mongoose");

const commentSchema = new Schema({
    content:{
        type:String,
        required:true,
    },
    blogId:{
        type:String,
        ref: "blog",
    },
    createdBy:{
        type:String,
        ref:"user",
    },
    },
    {timestamps:true}
);

const Comment = model("comment", commentSchema);

module.exports = Comment;