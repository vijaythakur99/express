import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({
    path: './env'
});

connectDB();


















// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";
// import express from 'express';

// const app = express();

// ;(async () => {
//     try {
//         console.log(process.env.MONGODB_URI)
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on('error', (err) => {
//             console.error(err);
//             throw err;
//         });

//         app.listen(process.env.PORT, ()=>{
//             console.log(`App is listening at ${process.env.PORT}`)
//         })

//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// })();