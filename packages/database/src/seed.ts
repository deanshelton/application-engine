import { timedEvent } from "@repo/timer";

(async () => {
  await timedEvent("....create", async () => {
    console.log("...nothing here yet...");
  });
})();
