const SERVER = require("../index.js")

SERVER_A = SERVER().GET("/", (STATE, req, res, next) => {
  res.send("hello world!");
});

SERVER_B =  SERVER().GET("/test", (STATE, req, res, next) => {
  res.send("test!");
});

SERVER()
  .GET("/*", (STATE, req, res, next) => {
    console.log(req.originalUrl, req.connection.remoteAddress)
    next();
  })
  .chain(SERVER_A)
  .chain(SERVER_B)
  .start({"port":3005})
.then(SERVER.showAddress)
.catch((err) => console.log(err))
