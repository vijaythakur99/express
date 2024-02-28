import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req, res) => {
    const { fullName, email, userName, password } = req.body;

    const missedPropertyArr = [
        fullName,
        email,
        userName,
        password
    ]
    .filter(item => !item);

    if(missedPropertyArr.length > 0) {
        throw new ApiError(400, 'fullName, email, userName & password are mandatory fields');
    }

    const existingUser = await User.findOne({
        $or: [{userName}, {email}]
    });

    if(existingUser) {
        throw new ApiError(409, 'User with this userName or email already exist!');
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;

    if(req.files && req.files?.coverImage && req.files?.coverImage[0]){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, 'avatar is required');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    let coverImage;
    if(coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        password,
        fullName,
        email,//add proper email validation 
        avatar: avatar.url,
        coverImage: coverImage?.url ?? ''
    });

    const createdUser = await User.findById(user._id).select(
        '-password -refreshToken'
    );

    if(!createdUser) {
        throw new ApiError(500, 'Something went wrong while registering the user');
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User registered successfully !')
    );
});

export { registerUser }