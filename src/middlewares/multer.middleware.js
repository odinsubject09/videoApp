import multer from "multer"

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')//location to store file
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)//original name as send by user
  }
})

export const upload = multer({ storage: storage })


