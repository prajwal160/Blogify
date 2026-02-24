const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key";
process.env.MONGO_URL = "mongodb://127.0.0.1:27017/blogify_test";
process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "demo";
process.env.CLOUDINARY_API_SECRET = "demo";

const app = require("../index");
const User = require("../models/user");
const Blog = require("../models/blog");
const Comment = require("../models/comment");

function authCookie(payload = { _id: "507f1f77bcf86cd799439011", fullName: "Tester", email: "tester@example.com", role: "USER" }) {
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    return `token=${token}`;
}

test("POST /user/signin returns error message on invalid credentials", async () => {
    const original = User.matchPasswordAndGenerateToken;
    User.matchPasswordAndGenerateToken = async () => {
        throw new Error("Invalid credentials");
    };

    const response = await request(app)
        .post("/user/signin")
        .type("form")
        .send({ email: "wrong@example.com", password: "badpass" });

    User.matchPasswordAndGenerateToken = original;

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Incorrect Email or Password/);
});

test("POST /blog rejects missing title/body with 400", async () => {
    const response = await request(app)
        .post("/blog")
        .set("Cookie", authCookie())
        .type("form")
        .send({ title: "", body: "" });

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Title and body are required/);
});

test("POST /blog/comment/:blogId rejects empty comments with 400", async () => {
    const originalFindById = Blog.findById;
    const originalCommentFind = Comment.find;

    Blog.findById = () => ({
        populate: async () => ({
            _id: "507f1f77bcf86cd799439012",
            title: "Sample Blog",
            excerpt: "Sample excerpt",
            coverImageURL: "/images/default.png",
            createdBy: { _id: "507f1f77bcf86cd799439011", fullName: "Author", profileImageURL: "/images/default.png" },
        }),
    });

    Comment.find = () => ({
        populate: async () => [],
    });

    const response = await request(app)
        .post("/blog/comment/507f1f77bcf86cd799439012")
        .set("Cookie", authCookie())
        .type("form")
        .send({ content: "   " });

    Blog.findById = originalFindById;
    Comment.find = originalCommentFind;

    assert.equal(response.statusCode, 400);
    assert.match(response.text, /Comment cannot be empty/);
});
