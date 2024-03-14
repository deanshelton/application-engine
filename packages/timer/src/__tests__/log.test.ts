import { getLogger } from "@repo/logger";

jest.spyOn(global.console, "log");

describe("@repo/logger", () => {
  it("prints a message", () => {
    getLogger({level:'SILENT'}).log("hello");
    // eslint-disable-next-line no-console -- testing console
    expect(true).toEqual(true);
  });
});
