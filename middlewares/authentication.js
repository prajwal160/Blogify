const {validateToken} = require("../services/authentication")

function checkForAuthenticationCookie(cookieName){
    return (req, res, next)=>{
        const tokenCookieValue = req.cookies[cookieName];
        if(!tokenCookieValue){
            return next();                                      //wrote within bracket{} so we must write return word.
        }

        try {
            const userPayload = validateToken(tokenCookieValue)
            req.user = userPayload; 
        } catch (error) {}

        return next();
    };
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.redirect("/user/signin");
    }

    return next();
}

module.exports ={
    checkForAuthenticationCookie,
    requireAuth,
};
