const express = require("express");
const session = require("express-session");
const morgan = require("morgan");
const path = require("path");

const app = express();

/* ENV */
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev_secret";

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const KAKAO_REDIRECT_URI =
  process.env.KAKAO_REDIRECT_URI || `${BASE_URL}/auth/kakao/callback`;

app.set("trust proxy", 1);

/* MIDDLEWARE */
app.use(morgan("dev"));
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: "auto",
      sameSite: "lax",
      httpOnly: true,
    },
  })
);

/* STATIC */
app.use(express.static(path.join(__dirname, "public")));

/* PLANS */
const PLANS = {
  living_biz_3d: { days: 3, price: 49000 },
  living_biz_7d: { days: 7, price: 99000 },
};

/* HELPERS */
const setPass = (req, planId) => {
  const now = Date.now();
  req.session.pass = {
    planId,
    start: now,
    end: now + PLANS[planId].days * 86400000,
  };
};

/* ROUTES */
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({});
  res.json({ user: req.session.user, pass: req.session.pass });
});

app.post("/api/orders/create", (req, res) => {
  if (!req.session.user) return res.status(401).json({});
  const { planId } = req.body;

  res.json({
    orderId: "order_" + Date.now(),
    amount: PLANS[planId].price,
    successUrl: `${BASE_URL}/payment/success?planId=${planId}`,
    failUrl: `${BASE_URL}/payment/fail`,
  });
});

app.get("/payment/success", (req, res) => {
  setPass(req, req.query.planId);
  res.redirect("/success.html");
});

app.get("/payment/fail", (req, res) => {
  res.redirect("/fail.html");
});

/* KAKAO LOGIN */
app.get("/auth/kakao/start", (req, res) => {
  const qs = new URLSearchParams({
    client_id: KAKAO_REST_API_KEY,
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  });
  res.redirect(`https://kauth.kakao.com/oauth/authorize?${qs}`);
});

app.get("/auth/kakao/callback", async (req, res) => {
  req.session.user = { name: "Kakao User" }; // 시연용
  res.redirect("/");
});

app.listen(PORT, () => console.log(`Server running → ${BASE_URL}`));
