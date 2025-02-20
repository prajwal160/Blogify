const {createHmac, randomBytes}=require("crypto");
const mongoose = require("mongoose");
const { createTokenForUser } = require("../services/authentication");

const userSchema = new mongoose.Schema({
    fullName:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    salt:{
        type:String,
    },
    password:{
        type: String,
        required: true,
    },
    profileImageURL:{
        type:String,
        default:"/images/default.png",
    },
    role:{
        type:String,
        enum:["USER" , "ADMIN"],
        default:"USER",
    },
},
{timestamps:true}
);

userSchema.pre("save",function(next){  //mongoose pre
    const user = this;

    if(!user.isModified("password")) {
        return;
    }

    // const salt = "someRandomSalt";//extra added later
    const salt = randomBytes(16).toString();   //we will generate the 16 digit String random keys.

    const hashedPassword = createHmac("sha256", salt) // then we sill user tha key to salt the password.
    .update(user.password)
    .digest("hex"); // then give it to me in the hex form
    
    this.salt = salt;
    this.password = hashedPassword;
    
    next();
})

userSchema.static("matchPasswordAndGenerateToken",async function (email, password){ //mongoose virtual functions
    //     console.log("Email:", email);
    // console.log("Password:", password);

    const user =await this.findOne({email});
    if (!user) throw new Error("User not found!");

    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvidedHash = createHmac("sha256", salt)
    .update(password)
    .digest("hex");
    
    if(hashedPassword !== userProvidedHash)throw new Error("Incorrect password")

    // return {...user, password:undefined, salt: undefined}; // if don't want to return email and password.
    // return {user};     //?return {...user._doc}; we can also use this as_doc will be returned by database.

    const token = createTokenForUser(user);
    return token;
});


const User = mongoose.model("user", userSchema);

module.exports= User; //?const User = require("../models/user");
























// module.exports={ //?const { User } = require("../models/user");
//     User
// }









//? https://mongoosejs.com/docs/middleware.html#pre
//? https://getbootstrap.com/docs/5.3/components/navbar/#nav
//? https://nodejs.org/api/crypto.html#cryptocreatehmacalgorithm-key-options


// Regular Function: In a regular function, the this keyword refers to the document being saved. This allows you to access and modify the document's properties within the middleware.

// Arrow Function: Arrow functions do not have their own this context. Instead, they inherit this from the surrounding lexical scope, which means this would not refer to the document in the context of Mongoose middleware.

//? https://nodejs.org/api/crypto.html


//! When to Use Each Approach:
//? Whole Library Import (const mongoose = require("mongoose");):
//? When you need access to multiple parts of Mongoose.
//? When you prefer a single, consistent object to call various Mongoose methods.
//? Destructuring Import (const { model, Schema } = require("mongoose");):
//? When you want to use only specific parts of the library.
//? To keep your code concise and focused on the parts you are using.