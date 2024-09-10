// logout ke lye middleware using tokens
// user hai ya nahi hai usercontroller 141

import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/ayncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/users.model.js";



//agar res use nhi ho raha to us ki jaga _ rakh sakte hain
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new apiError(401, "Unauthorized request");
    }
  
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    ); 
  
    if (!user) {
      throw new apiError(401, "Invalid access token");
    }
  
    req.user = user;
    next()
  } catch (error) {
    throw new apiError(401,error?.message || "Invalid access Token ")
    
  }
});

/*
jwt.verify() it will decode the token and verify its signature against the provided secret. If the verification is successful, it returns the decoded payload of the token.
{
  "userId": "12345",
  "username": "john_doe",
  "iat": 1609459200,
  "exp": 1609462800
}
By setting req.user = user, you make this user information available throughout the lifecycle of the request.

next();: This is a call to the next function, which is used in Express middleware to pass control to the next middleware function in the stack. Without this call, the request-response cycle would be halted, and the client would not receive a response.
*/
