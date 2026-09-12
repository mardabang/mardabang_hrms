const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    { value: "GENERAL", label: "General (9 AM - 6 PM)" },
    { value: "EIGHT_HOURS", label: "8 Hours" },
    { value: "TWELVE_HOURS", label: "12 Hours" }
  ]);
});

module.exports = router;