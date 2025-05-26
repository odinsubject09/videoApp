import { type } from "@testing-library/user-event/dist/cjs/utility/type.js"
import mongoose,{Schema} from "mongoose"

const subscriptionSchema=new Schema(
    {
        subscriber:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        channel:{
            type:Schema.Types.ObjectId,
            ref:"User"
        },
    },{timestamps:true}
)

export const Subscription=new mongoose.model("Subscription",subscriptionSchema)
