import { getLogger } from "@repo/logger";

import { Application, TestActionConfiguration } from "../models";
import { ActionMap, ActionType } from "../models/ActionMap";
import { DataAccess } from "../models/DataAccess";

import { expect } from "@jest/globals";
import { ApplicationState } from "@repo/database";
import { FailureByDesign } from "@repo/failure-by-design";
import { fail } from "assert";
import cuid from "cuid";
import { VerifyPayloadConfiguration } from "../models/actions/VerifyPayload";
const logger = getLogger({ level: "silent" });

describe("ApplicationSystem", () => {
  it("Calls OnFailure input is invalid JSON schema", async () => {
    const globals = {
      application: { id: 'fakeAppId' },
      user: { id: "fakeUserId"+cuid() },
      logger,
    };
    const dataAccess = new DataAccess({
      globals,
      logger,
    });

    const invalidApplicationConf = {
      type: ActionType.VERIFY_PAYLOAD,
      config: {
        actionId: "act1",
        schema: "[[[]" as unknown as any, // <- Bogus schema should throw
      } as VerifyPayloadConfiguration,
      onSuccess: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "onSuccess",
          inputSources: {
            myInput: "GET:act1:someValue", // <-- Should not resolve
          },
        } as TestActionConfiguration,
      },
      onFailure: {
        type: ActionType.TEST_ACTION,
        config: {
          inputSources: {
            error: "PROPS:act1:error",
          },
          actionId: "onFailure",
        } as TestActionConfiguration,
      },
    };

    const actionMap = new ActionMap({
      globals,
      dataAccess,
      logger,
    });

    try {
      const app = new Application({
        logger,
        actionMap,
        globals,
        dataAccess,
        applicationConf: invalidApplicationConf,
      });
      await app.run();
      fail("Throws `MISCONFIGURATION` when schema is invalid.");
    } catch (e) {
      const error = e as unknown as FailureByDesign;
      expect(error.kind).toEqual("MISCONFIGURATION");
    }
  });
  it("calls onFailure with BAD_REQUEST when JSON in not valid.", async () => {
    const globals = {
      application: { id: 'fakeAppId' },
      user: { id: "fakeUserId"+cuid() },
      logger,
    };
    const dataAccess = new DataAccess({
      globals,
      logger,
    });

    const validApplicationConf = {
      type: ActionType.VERIFY_PAYLOAD,
      config: {
        inputSources:{
            payload:'PROPS:payload'
        },
        actionId: "act1",
        schema: {
          type: "object",
          properties: {
            foo: { type: "integer" },
          },
          required: ["foo"],
          additionalProperties: false,
        },
      } as VerifyPayloadConfiguration,
      onSuccess: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "onSuccess",
          inputSources: {
            myInput: "GET:act1:input",
          },
        } as TestActionConfiguration,
      },
      onFailure: {
        type: ActionType.TEST_ACTION,
        config: {
          actionId: "onFailureAction",
          inputSources:{
            error: "GET:act1:error",
          }
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
      applicationConf: validApplicationConf,
    });
    const res = await app.run({ payload: "NOT VALID JSON" });
    expect(JSON.parse(res.heap.onFailureAction!).inputGivenToAction.error.kind).toEqual("BAD_REQUEST");
  });
  
});
