 import { Router } from "express";
import { loginUser, logOutUser, registerUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.post("/register", registerUser);
router.route("/register").post(
  upload.fields([
    {
      name:"avatar",
      maxCount:1
    },
    {
      name: "coverImage",
      maxCount:1
    }
  ])
  

  , registerUser
);

router.route("/login").post(loginUser)


//secured routes when user is logged in
//next jo middleware mai likha tha us se murad ye hai le verifyJWT func ke baad logOutUser run ho
router.route("/logout").post(verifyJWT, logOutUser)
router.route("./refresh-token").post(refreshAccessToken)

router.route("change-password").post(verifyJWT,changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)
//below post islye nhi sari details update ho jainge
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

router.route("./cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("./c/:username").get(verifyJWT,getUserChannelProfile)

router.route("./history").get(verifyJWT,getWatchHistory)

export default router;


// user logged in hona chahiye to uske lye verifyjwt middleware use kreinge