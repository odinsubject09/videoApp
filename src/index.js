import dotenv from 'dotenv'
import connectDB from './db/index.js';

dotenv.config({
    path:'./env'
})

connectDB()

/*;(async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error', (err) => {
            console.error('MongoDB connection error:', err)
        })
        app.listen(process.env.PORT,()=>{
            console.log('server is running on port:',process.env.PORT)
        })
    } catch (error) {
        console.error('Error connecting to MongoDB:', error)``
    }
})()*/
