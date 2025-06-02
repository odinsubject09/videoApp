import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!req.user) {
        throw new ApiError(400, "User not authenticated");
    }

    const userId = req.user._id;


    const existingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    let subscribed = false;

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id);
    } else {
        await Subscription.create({
            subscriber: userId,
            channel: channelId
        });
        subscribed = true;
    }

    return res.status(200).json(new ApiResponse(200, {}, `subscribed: ${subscribed}`));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    
    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            coverImage: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriber: {
                    $first: "$subscriberDetails"
                }
            }
        },
        {
            $project: {
                subscriber: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

    return res.status(200).json({
        success: true,
        data: subscribers,
        message: "Subscribers extracted successfully"
    });
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}