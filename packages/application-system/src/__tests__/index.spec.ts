import { getLogger } from "@repo/logger";

import { Application, TestActionConfiguration } from "../models";
import { ActionMap, ActionType } from "../models/ActionMap";
import { DataAccess } from "../models/DataAccess";

import { expect } from "@jest/globals";
import { FailureByDesign } from "@repo/failure-by-design";
import { fail } from "assert";
import cuid from "cuid";

const logger = getLogger({ level: "silent" });
describe("ApplicationSystem", () => {
  it("Outputs can be used as inputs", async () => {
    const globals = {
      application: { id: 'fakeAppId' },
      user: { id: "fakeUserId" + cuid() },
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
    const actionTwoHeap = JSON.parse(appRunResult.heap["test-action-2"]!);
    expect(actionTwoHeap.inputGivenToAction.myInput).toEqual("Hola");
    expect(appRunResult.pointer).toEqual("");
  });
  it("Throws MISCONFIGURATION when referencing actions by ID which do not exist.", async () => {
    const globals = {
      application: { id: "fakeAppId" },
      user: { id: "fakeUserId"  + cuid() },
      logger,
    };
    const dataAccess = new DataAccess({
      globals,
      logger,
    });

    const validApplicationConf = {
      type: ActionType.TEST_ACTION,
      config: {
        actionId: "act1",
        inputSources: {},
      } as TestActionConfiguration,
      onSuccess: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "onSuccess",
          inputSources: {
            whatever: "GET:flimFlam:someText", // <-- Should not exist
          },
        } as TestActionConfiguration,
      },
      onFailure: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "flimFlam",
        } as TestActionConfiguration,
      },
    };

    try {
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
        applicationConf: validApplicationConf,
      });
      await app.run();
      fail(
        "Did not throw error when referencing actions by ID which do not exist."
      );
    } catch (e) {
      const error = e as unknown as FailureByDesign;
      expect(error.kind).toEqual("MISCONFIGURATION");
      expect(error.message).toEqual(
        "Previous action var lookup failure. flimFlam:someText"
      );
    }
  });
});
