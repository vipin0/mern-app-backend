const jwt = require('jsonwebtoken');

const HttpError = require("../models/http-error");

module.exports = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }
    try {
        
        const token = req.headers.authorization.split(' ')[1];  // Bearer token
        //console.log(token);
        if (!token) {
           throw new Error('Authorization failed!');
        }
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        //console.log(decodedToken);
        req.userData = { userId:decodedToken.userId };
        next();
    } catch (err) {
        const error = new HttpError('Authorization failed!', 403);
        return next(error);
    }
};