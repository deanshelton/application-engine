import { FailureByDesign } from "..";

describe("@repo/failure-by-design", () => {
  it("prints a message", () => {
    const FBD = new FailureByDesign('MISCONFIGURATION','hi there', {flimflam:true})
    // eslint-disable-next-line no-console -- testing console
    expect(FBD.diagnosticInfo.flimflam).toEqual(true);
  });
});
