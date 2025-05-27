import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/apiError.js'
import { User } from '../models/user.model.js'
import { uploadOnCloudinary,deleteFromCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"
import mongoose from 'mongoose'

const generateAccessTokenAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error)
    {
        throw new ApiError(500,error.message,"something went wrong ,could not generate access and refresh token")
    }
}

const registerUser=asyncHandler(async (req,res)=>{
    /*1.get user details from frontend
    2.check if all fields filled
    3.check if user already present-username
    4.upload image,avatar to multer->cloudinary
    5.create user object upload to DB
    6.response returned to user don not return passwrod refresh token
    7.check for user creation
    8.return response
      
    */
   
    const {username,fullName,password,email}=req.body

    if(
        [fullName,email,username,password].some((field)=>
            field?.trim()==="")
    )
    {
        throw new ApiError(400,"all fields required")
    }

    const existedUser=await User.findOne(
        {
            $or:[{email},{username}]
        }
    )

    if(existedUser)
    {
        throw new ApiError(409,'email or username already present')
    }
    console.log(req.files)
    const avatarLocalPath=req.files?.avatar[0]?.path
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
      let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if(!avatarLocalPath)
    {
        throw new ApiError(400,'Avatar file is required')
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    
    console.log("coverImage right before DB insert:", coverImage);
    console.log("coverImage.url:", coverImage?.url);
    if(!avatar)
    {
        throw new ApiError(400,'Avatar file is required')
    }

    const user= await User.create(
        {
            fullName,
            email,
            password,
            username:username.toLowerCase(),
            avatar:avatar.url,
            coverImage:coverImage?.url||""
        }
    )

    const userCreated=await User.findById(user._id).select(
        "-password -refreshToken"
    ) 

    if(!userCreated)
    {
        throw new ApiError(500,'something went wrong ,could not create user')
    }

    res.status(200).json(
            new ApiResponse(201,userCreated,"user Created")
    )
})

const loginUser=asyncHandler(async (req,res)=>{
    /*
        1.data from req.body
        2.check if username or email present
        3.then check password
        4.if password correct then generate access token and refresh token
        5.send cookies
    */

    const {username,email,password}=req.body
    if(!username&&!email)
    {
        throw new ApiError(400,"username or email required")
    }

    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if(!user)
    {
        throw new ApiError(404,"user does not exist")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid)
    {
        throw new ApiError(401,"Wrong password")
    }
    const{refreshToken,accessToken}=await generateAccessTokenAndRefreshToken(user._id)
    
    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            }
        )
    )
})

const logoutUser=asyncHandler(async (req,res)=>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>
    {
    const incomingRefreshToken=req.cookies.refreshToken||req.body.refreshToken
    
    if(!incomingRefreshToken)
    {
        throw new ApiError(401,'UnAuthorised Request')
    }
    try{
            const decodedToken=jwt.verify(incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET)
            
            const user=User.findById(decodedToken?._id)

            if(!user)
            {
                throw new ApiError(401,"invalid refresh Token")
            }

            if(incomingRefreshToken!==user.refreshToken)
            {
                throw new ApiError(401,"Refresh token is expired or used")
            }

            const options={
                httpOnly: true,
                secure: true
            }
            const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
            
                return res
                .status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        200, 
                        {accessToken, refreshToken: newRefreshToken},
                        "Access token refreshed"
                    )
                )
    }
    catch(error)
    {
        throw new ApiError(401,error?.message)
    }
})

const changeCurrentPassword=asyncHandler(async(req,res)=>
    {
    const{oldPassword,newPassword,}=req.body
    const user=await User.findById(req.user?._id)
    
    const isPasswordCorrect=user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
    {
        throw new ApiError(400,"Invalid Password")
    }

    user.password=newPassword
    await user.save({
        validateBeforeSave:false
    })

    return res.
    status(200).
    json(new ApiResponse(200,{},"Password is changed"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.
           status(200).
           json(new ApiResponse(200,req.user,"current user fetched successfully"))

})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const{fullName,email}=req.body
    if(!fullName||!email)
    {
        throw new ApiError(400,"both fields required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(200,user,"user details updated"))
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar is missing")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url)
    {
        throw new ApiError(400,"cannot create avatar url")
    }
    const oldAvatarPath=req.user.avatar
    const user=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    const response=await deleteFromCloudinary(oldAvatarPath)
    return res.status(200)
            .json(new ApiResponse(200,user,"avatar updated successfully")) 
})
const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if(!username?.trim())
    {
        throw new ApiError(400,"username is missing")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:
                {
                    $size:"$subscribers"
                },
                subscribedToCount:
                {
                    $size:"$subscribedTo"
                },
                isSubscribedTo:
                {
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                coverImage:1,
                avatar:1,
                email:1,
                subscribedToCount:1,
                subscriberCount:1,
                isSubscribedTo:1
            }
        }
    ])
    if(!channel?.length)
    {
        throw new ApiError(404,"Channel does not exist")
    }
    return res.status(200).
            json(new ApiResponse(200,channel[0],"User channel found successfully"))
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAccountDetails,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}