// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// .use works for configuration or middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
// extended (nested objects bhi de sakte ho)
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
// files(images ya or kuch) public assets
app.use(express.static("public"));
// iski waja se hum controller mai cookie access ker pa rahe hain
app.use(cookieParser());

//routes import we use here userRouter name when importing using default
import userRouter from "./routes/user.routes.js";

// routes declaration {direct app.get when we were not exporting routers,here controller and routers are separated now we need middleware} now below we can use app.use and we can write route and routers.

app.use("/api/v1/users", userRouter);
// ./users is prefix standard practice "./api/v1/users" where v1 stands for  version:1 (http://localhost:8000/api/v1/users/register

export { app };

/*
The app.use function in an Express.js application is used to add middleware to the application. Middleware are functions that have access to the request object (req), the response object (res), and the next middleware function in the application's request-response cycle. Middleware can perform various tasks such as modifying the request and response objects, ending the request-response cycle, and calling the next middleware function.

CORS Middleware: Handles cross-origin requests to allow or restrict access from different domains.
JSON Body Parser Middleware: Parses JSON data in the request body.
URL-encoded Body Parser Middleware: Parses URL-encoded form data in the request body.
Cookie Parser Middleware: Parses cookies from the request headers.

*/
