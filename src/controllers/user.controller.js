import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

    const cookieOptions = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
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
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(
        new ApiResponse(200, {}, 'Logged out successfully!')
    );
});

export { 
    registerUser,
    loginUser,
    logoutUser
}