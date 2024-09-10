import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";

// To use below given dotenv syntax you have to make changes in package json file script (-r dotenv/config --experimental-json-modules) if not to follow this you can use code on line 1
dotenv.config({
  path: './.env'
});



connectDB()
  .then(() => {
    const port = process.env.PORT || 8000;
    app.listen(port, () => {
      console.log(`Server running at port: ${port}`);
    });
  })
  .catch((err) => {
    console.log("Mongodb connection failed", err);
  });








/* 1st approach 
import express from "express"
const app = express()


// function connectDB(){}
// connectDB(); it will work corrrectly but below one is professional approach (async()=>{})()

(async()=>{
  try{
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    app.on("error",(error)=>{
      console.log("ERROR: ",error);
      throw error
    })

    app.listen(process.env.PORT,()=>{
      console.log(`App is listening on port ${process.env.PORT}`);
    })


  }catch(error){
    console.log("ERROR: ",error);
    throw error
  }
})()
*/