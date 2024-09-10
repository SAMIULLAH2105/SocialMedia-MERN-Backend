import { asyncHandler } from "../utils/ayncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/users.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { json } from "express";
import mongoose from 'mongoose';


// internal method joke Schema mai hain un ke lye user or jo monodb te related unke lye User
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    // below bcz werna password wagera bhi dena pare ga schema mai dekho
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating Access And Refresh Token "
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend (here will use postman)
  // validation - not empty
  // check if user already exists: username and email
  // check for images , check for avatar
  // upload to cloudnary, avatar
  // create user object  - create entry in db
  // remove password and refresh token from response from db
  // check for user creation
  // return res

  const { fullname, email, username, password } = req.body;
  //console.log("email: ", email);

  // this below code is also correct you can write it for each entry full below the commented code we are validating all fiels using 1 if condition
  // if(fullname===""){
  //   throw new apiError(400,"full name is required");
  // }

  if (
    [fullname, email, username, password].some((field) => field?.trim() == "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  // when checking only one User.findOne({email})
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new apiError(409, "User already exist.");
  }
  //?. (Optional Chaining Operator): This operator is used to safely access properties of an object. If the object on the left side of ?. is null or undefined, the entire expression evaluates to undefined without causing an error. In this case, it ensures that if req.files is null or undefined, the rest of the expression won't be evaluated, and undefined will be returned.
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(404, "avatar is Required bro");
  }

  //agee nhi jao jab tak upload na ho
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new apiError(404, "avatar is Required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // 2 field select ho ker nhi ain ge
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something wrong while registring user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data le ao
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;
  if (!(username || email)) {
    throw new apiError(404, "username or email is required");
  }

  // simple agar email se kerte to user.findOne({email})
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials (Password)");
  }
  // user object mai se _id pas kerdi
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // by default frontend per  koi bhi modify kr sakta hai with below restrictions only server can modify
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in successfully "
      )
    );
});

// login mai to hum emial and password le rahe the to user._id easily mil rahi thi lekin logout mai hum phirse to nhi lein ge user se
// solution: using middleware (apna banaige)

const logOutUser = asyncHandler(async (req, res) => {
  //abhi hamare pass access hai req.user ka bcz of auth  middleware
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, //removes field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out"));
});

// refresh access token ke lye end point

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(
      401,
      "Unauthorized Request incoming refresh token not found"
    );
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid refresh token");
  }
});

// jab route banai ge to login wagera check kerlein ge using middleware
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfuly"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new apiError(400, "All fields are required");
  }
  // below user will have update information
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname,
        email: email,
      },
    },
    { new: true } //update hone ke baad jo information hoti hai wo return hoti hai
  ).select("-password");

  return (
    res.status(200),
    json(new ApiResponse(200, user, "Account details updated successfully"))
  );
});

// now updating file

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new apiError(400, "Error on uploading avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.User?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new apiError(400, "Error on uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.User?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});


const getUserChannelProfile = asyncHandler(async(req,res)=>{


  // main we access channel by urls like /chaiAurCode same will do below with the help of params

  const {username} = req.params;

  if(!username?.trim()){
    throw new apiError(400,"username is missing")
  }

  // User.find({username}) where clause {username}
  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase()
      }
    },
    {
      $lookup:{
        // model mai sare chezein lowercase mai and plural mai ho jati hain  mongoose.model("Subscription", subscriptionSchema); yaha is lye hum Subscription nahi likhei ge balke "subscriptions" likhienge

        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup:{
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields:{
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size:"$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in:[req.user?._id,"$subscribers.subscriber"] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project:{
        fullname: 1,
        username: 1,
        subscribersCount:1,
        channelsSubscribedToCount:1,
        isSubscribed: 1,
        avatar:1,
        coverImage:1,
        email:1


      }
    }





  ])

  if(!channel?.length){
    throw new apiError(404,"Channel does not exist")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))


})

const getWatchHistory = asyncHandler(async(req,res)=>{
const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            // idhar ham videos ke andar hain
            $lookup:{
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              //sari info send nhi kerni to is waja se below pipeline use ker rahe hain joke limites data owner mai degi
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1


                  }
                },
                //below pipeline is used to extract 1 element from array to make easier for frontend dev
                {
                  $addFields:{
                    owner: {
                      $first: "owner"

                    }
                  }
                }
              ]
            }
          }
        ]
      }
    }
  ])
  return res
  .status(200)
  .json((
    new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully")
  ))
})
export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
