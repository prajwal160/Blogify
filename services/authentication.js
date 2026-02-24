const JWT = require  ("jsonwebtoken");
const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error("Missing JWT_SECRET in environment variables.");
}

function createTokenForUser(user){
    const payload = {
        _id: user.id,
        email: user.email,
        profileImageURL : user.profileImageURL,
        role:user.role,
    };
    const token = JWT.sign(payload, secret);
    return token;
}

function validateToken(token){
    const payload = JWT.verify(token, secret);
    return payload;
}

module.exports = {
    createTokenForUser,
    validateToken,
}
