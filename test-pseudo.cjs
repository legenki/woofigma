"use strict";
const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      .box {
        position: relative;
        width: 100px;
        height: 100px;
        background: red;
        margin: 50px;
      }
      .box::before {
        content: "BEFORE";
        display: block;
        width: 50px;
        height: 50px;
        background: blue;
        position: absolute;
        top: -10px;
        left: -10px;
      }
      .box::after {
        content: "";
        display: inline-block;
        width: 20px;
        height: 20px;
        background: green;
        margin-left: 10px;
      }
    </style>
    <div class="box">Content</div>
  `);

  const result = await page.evaluate(() => {
    const el = document.querySelector(".box");
    const beforeStyle = window.getComputedStyle(el, "::before");
    const afterStyle = window.getComputedStyle(el, "::after");

    // Can we measure it?
    // One hack is to use Range or similar? No.
    // What if we create a real element with the same styles?
    return {
      before: {
        content: beforeStyle.content,
        width: beforeStyle.width,
        height: beforeStyle.height,
        top: beforeStyle.top,
        left: beforeStyle.left,
        position: beforeStyle.position,
      },
      after: {
        content: afterStyle.content,
        width: afterStyle.width,
        height: afterStyle.height,
      },
    };
  });

  console.log(result);
  await browser.close();
})();
