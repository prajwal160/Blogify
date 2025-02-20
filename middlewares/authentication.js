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

module.exports ={
    checkForAuthenticationCookie,
};