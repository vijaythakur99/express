import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const accessToken = req.cookies?.accessToken ?? req.header('Authorization')?.replace('Bearer ', '');
    
        if(!accessToken) {
            throw new ApiError(401, 'Unauthorized request!');
        }
    
        const decodedData = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User
        .findById(decodedData?._id)
        .select('-password -refreshToken');
    
        if(!user) {
            throw new ApiError(401, 'Invalid access token!');
        }
    
        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(401, 'error?.message' ?? 'Invalid access token!');
    }
})