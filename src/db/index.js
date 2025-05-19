import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{
    try {
        const connectDB=await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\nMongoDB connected,mongoDB Host:${connectDB.connection.host}`)
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1)
    }
}

export default connectDB