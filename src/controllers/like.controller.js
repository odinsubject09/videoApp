import mongoose, {isValidObjectId, Mongoose} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!mongoose.isValidObjectId(videoId))
    {
        throw new ApiError(400,"invalid videoId")
    }
    if(!req.user?._id)
    {
        throw new ApiError(400,"Usernot authenticated")
    }
    try
    {
        const liked=await Like.findOne(
            {
                video:videoId,
                likedBy:req.user._id
            }
        )
        let message, likeStatus

        if (liked) {
            // Step 2: If like exists, delete it (unlike)
            await Like.findByIdAndDelete(liked._id)
            message = "Video unliked successfully"
            likeStatus = "unliked"
        } 
        else {
            // Step 3: If like doesn't exist, create it
            await Like.create({
                video: videoId,
                likedBy: req.user._id
                // comment and tweet fields will be undefined (which is fine)
            })
            message = "Video liked successfully"
            likeStatus = "liked"
        }
        return res.status(200).json(
            new ApiResponse(200,
                {
            videoId,
            likeStatus,
            isLiked:likeStatus==="liked"
                }
        ,message))
    }
    catch(error)
    {
        throw new ApiError(500, "Something went wrong while toggling like")
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    // Check if user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User not authenticated")
    }

    try {
        // Check if like already exists
        const existingLike = await Like.findOne({
            comment: commentId,
            likedBy: req.user._id
        })

        let message, likeStatus

        if (existingLike) {
            // Unlike: delete existing like
            await Like.findByIdAndDelete(existingLike._id)
            message = "Comment unliked successfully"
            likeStatus = "unliked"
        } else {
            // Like: create new like
            await Like.create({
                comment: commentId,
                likedBy: req.user._id
                // video and tweet fields will be undefined
            })
            message = "Comment liked successfully"
            likeStatus = "liked"
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { 
                        commentId,
                        likeStatus,
                        isLiked: likeStatus === "liked"
                    },
                    message
                )
            )

    } catch (error) {
        throw new ApiError(500, "Something went wrong while toggling comment like")
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    // Validate tweetId
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    // Check if user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User not authenticated")
    }

    try {
        // Check if like already exists
        const existingLike = await Like.findOne({
            tweet: tweetId,
            likedBy: req.user._id
        })

        let message, likeStatus

        if (existingLike) {
            // Unlike: delete existing like
            await Like.findByIdAndDelete(existingLike._id)
            message = "Tweet unliked successfully"
            likeStatus = "unliked"
        } else {
            // Like: create new like
            await Like.create({
                tweet: tweetId,
                likedBy: req.user._id
                // video and comment fields will be undefined
            })
            message = "Tweet liked successfully"
            likeStatus = "liked"
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { 
                        tweetId,
                        likeStatus,
                        isLiked: likeStatus === "liked"
                    },
                    message
                )
            )

    } catch (error) {
        throw new ApiError(500, "Something went wrong while toggling tweet like")
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    // Check if user is authenticated
    if (!req.user?._id) {
        throw new ApiError(401, "User not authenticated")
    }

    try {
        const likedVideos = await Like.aggregate([
            {
                $match: {
                    likedBy: new mongoose.Types.ObjectId(req.user._id),
                    video: { $exists: true } // Only get likes that have video field
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "video",
                    foreignField: "_id",
                    as: "videoDetails",
                    pipeline: [
                        {
                            $project: {
                                title: 1,
                                thumbnail: 1,
                                duration: 1,
                                views: 1,
                                createdAt: 1,
                                owner: 1
                            }
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            fullName: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    video: {
                        $first: "$videoDetails"
                    }
                }
            },
            {
                $project: {
                    video: 1,
                    likedBy: 1,
                    createdAt: 1 // When the like was created
                }
            },
            {
                $sort: {
                    createdAt: -1 // Most recently liked first
                }
            }
        ])

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    likedVideos,
                    "Successfully retrieved all liked videos"
                )
            )

    } catch (error) {
        throw new ApiError(500, "Could not retrieve liked videos")
    }
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}