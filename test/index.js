const SERVER = require("../index.js");
const UTIL = require("common-fn-js");
sitemap = {"/":0, "/test":0, "/echo":0, "/visits":0, "/form":0};

SERVER_A = SERVER()
.asifnot("visits", sitemap)
.GET("/", (STATE, req, res, next) => {
  let html = Object.keys(STATE.visits).reduce((html, link) => {
    html += `<li><a href="${link}">${link}</a></li>`;
    return html;
  }, "<h1>WELCOME!!!!111</h1><ul>") + "</ul>";
  res.send(html);
});


SERVER_B = SERVER().GET("/test", (STATE, req, res, next) => {
  res.send("test!");
});

SERVER_C = SERVER().GET("/hello", (STATE, req, res, next) => {
  res.send("hello world!");
});

ECHO_SERVER = SERVER().augment("echo", (route) => (metaproc) =>  {
  return metaproc.GET(route, async (STATE, req, res, next) => {
    res.send(`http://${STATE.address}:${STATE.port}`)
  })
}).echo("/echo")

FORM_SERVER = SERVER()
  .GET("/form", (STATE, req, res, next) => {
    let html = `
      <h2>TeSt FoRm</h2>
      <hr />
      <form action="/form" method="POST">
        <input type="text" placeholder="Random String" name="test_str" />
        <input type="date" placholder="Random Date" name="test_date" />
        <input type="number" placeholder="Random Number" name="tes_num" />
        <input type="submit" value="Test" />
      </form>
    `;
    res.send(html);
  })
  .POST("/form", (STATE, req, res, next) => {
    console.log(req.body);
    res.send("Submitted, now go away.");
  })

BREAK_SERVER = SERVER()
  .GET("/break", (STATE, req, res, next) => {
    next("I done broke it");
  })

WATCHER = SERVER()
.asifnot("visits", sitemap)
.GET("/visits", (STATE, req, res, next) => {
  let html = Object.keys(STATE.visits).reduce((html, whereFrom) => {
    html += `<tr><td align="center">${whereFrom}</td><td align="center">${STATE.visits[whereFrom]}</td></tr>`;
    return html;
  }, `<table width="100%" border="1"><tr><th>Page Name</th><th>Number of Visits</th></tr>`) + "</table>";
  res.send(html);
})
.when("visit", (STATE, whereFrom) => {
  if (STATE.visits[whereFrom] !== undefined) {
    STATE.visits[whereFrom] += 1;
  } else {
    console.log(`Visit not counted for ${whereFrom}`)
  }

})


SERVER()
.GET("*", (STATE, req, res, next) => {
  console.log(`${UTIL.timestamp()} ${req.originalUrl} => ${req.connection.remoteAddress}`)
  STATE.events.emit("visit", req.originalUrl);
  next();
})
.chains(SERVER_A)
.chains(SERVER_B)
.chains(SERVER_C)
.chains(ECHO_SERVER)
.chains(FORM_SERVER)
.chains(BREAK_SERVER)
.chains(WATCHER)
.create({"port":3005})
.catch((err) => {
  console.log(err.msg)
})
