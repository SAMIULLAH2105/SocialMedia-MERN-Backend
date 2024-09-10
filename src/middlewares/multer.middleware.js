import multer from "multer";
import path from "path"


// code from github
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname)
  }
})

// const upload = multer({ storage: storage })
// ** till here
export const upload = multer({storage})