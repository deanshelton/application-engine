import { getLogger } from "@repo/logger";

import { Application, TestActionConfiguration } from "../models";
import { ActionMap, ActionType } from "../models/ActionMap";
import { DataAccess } from "../models/DataAccess";

import { expect } from "@jest/globals";
import { ApplicationState } from "@repo/database";
const logger = getLogger({ level: "debug" });
describe("ApplicationSystem", () => {
  beforeEach(async () => {
    let items = await ApplicationState.scan().exec();

    await Promise.all(items.map((item) => item.delete()));
  });
  it("Outputs can be used as inputs", async () => {
    const globals = {
      application: { id: "fakeAppId" },
      user: { id: "fakeUserId" },
      logger,
    };
    const dataAccess = new DataAccess({
      globals,
      logger,
    });

    const applicationConf = {
      type: ActionType.TEST_ACTION,
      config: {
        actionId: "test-action-1",
      } as TestActionConfiguration,
      onSuccess: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "test-action-2",
          inputSources: {
            myInput: "GET:test-action-1:someText",
          },
        } as TestActionConfiguration,
      },
      onFailure: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "test-action-fail",
        } as TestActionConfiguration,
      },
    };

    const actionMap = new ActionMap({
      globals,
      dataAccess,
      logger,
    });

    const app = new Application({
      logger,
      actionMap,
      globals,
      dataAccess,
      applicationConf,
    });

    const appRunResult = await app.run();
    const actionTwoHeap = JSON.parse(appRunResult.heap['test-action-2']!)
    expect(actionTwoHeap.inputGivenToAction.myInput).toEqual("Hola");
    expect(appRunResult.pointer).toEqual("");
    expect
  });
});
