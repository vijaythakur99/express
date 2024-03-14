import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { COOKIE_OPTIONS } from '../utils/cookie-options.js';
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        //saving refresh token in db before login
        user.refreshToken = refreshToken;
        await user.save({
            validateBeforeSave: true
        });

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        throw new ApiError(500, 'Something went wrong while generating access tokens!')
    }
}

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

const loginUser = asyncHandler(async (req, res) => {
    
    const { email, userName, password } = req.body;

    if(!email && !userName) {
        throw new ApiError(400, 'Username or email is required');
    }

    const user = await User.findOne({
        $or: [{userName}, {email}]
    });

    if(!user) {
        throw new ApiError(404, 'User does not exist!');
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password);

    if(!isPasswordCorrect) {
        throw new ApiError(401, 'Invalid credentials !');
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    return res
    .status(200)
    .cookie('accessToken', accessToken, COOKIE_OPTIONS)
    .cookie('refreshToken', refreshToken, COOKIE_OPTIONS)
    .json(
        new ApiResponse(
            200,
            {
                user,
                accessToken,
                refreshToken
            },
            "User logged in successfully!"
        )
    )
});

const logoutUser = asyncHandler(async (req, res) => {
    await User
    .findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true }
    );

    return res
    .status(200)
    .clearCookie('accessToken', COOKIE_OPTIONS)
    .clearCookie('refreshToken', COOKIE_OPTIONS)
    .json(
        new ApiResponse(200, {}, 'Logged out successfully!')
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(400, 'Refresh token is required');
        }

        const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!decodedToken) {
            throw new ApiError(400, 'Invalid refresh token');
        }

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(400, 'Invalid refresh token');
        }

        if (user.refreshToken !== incomingRefreshToken) {
            throw new ApiError(400, 'Refresh token did not matched');
        }

        const generatedTokens = await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie('accessToken', generatedTokens.accessToken, COOKIE_OPTIONS)
            .cookie('refreshToken', generatedTokens.refreshToken, COOKIE_OPTIONS)
            .json(
                new ApiResponse(
                    200,
                    {
                        ...generatedTokens
                    },
                    'Refresh token generated successfully !'
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message ?? 'Invalid refresh token');
    }
});

const updatePassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if(!oldPassword) {
        throw new ApiError(400, 'Old password is mandatory');
    }
    
    if(!newPassword) {
        throw new ApiError(400, 'New password is mandatory');
    }

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(400, 'Invalid password');
    }

    user.password = newPassword;
    await user.save({
        validateBeforeSave: false
    });

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Password changed successfully')
    );
});

const getCurrentUser = asyncHandler (async (req, res) => {
    if(!req?.user) {
        throw new ApiError(400, 'Unauthrized request');
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, 'One user found')
    )
});

const updateUserDetails = asyncHandler (async (req, res) => {
    const { fullName, email } = req.body;

    if(!fullName || !email) {
        throw new ApiError(500, 'fullName and email fields are mandatory');
    }

    const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    email
                }
            },
            {
                new: true
            }
        )
        .select('-password -refreshToken');

    if(!user) {
        throw new ApiError(400, 'Error while fetching the user from DB');
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, 'User details updated successfully')
    );

});

const updateAvatarImage = asyncHandler (async (req, res) => {
    const avatarLocalPath = req.file?.avatar;

    if(!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is mandatory');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar?.url) {
        throw new ApiError(400, 'Error while uploading on cloudinary');
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    )
    .select('-password -refreshToken');

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Avatar updated successfully')
    );
});

const updateCoverImage = asyncHandler (async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new ApiError(400, 'Cover image is mandatory');
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage?.url) {
        throw new ApiError(400, 'Error while uploading on cloudinary');
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    )
    .select('-password -refreshToken');
    
    //delete old coverImage
    await deleteFromCloudinary(req.user?.coverImage);

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, 'Cover image updated successfully')
    );
});

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    getCurrentUser,
    updateUserDetails,
    updateAvatarImage,
    updateCoverImage,
}