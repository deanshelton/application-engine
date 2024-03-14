import { ApplicationConfiguration } from "../Application";
import {
  Action,
  ActionConfiguration,
  ActionInput,
  ActionOutput,
} from "./Action";

export class TestAction extends Action<
  TestActionConfiguration,
  TestActionInput,
  TestActionOutput
> {
  /**
   *
   */
  public async invoke(inputGivenToAction: any) {
    return {
      testOutput: "Hi there! This is test output.",
      someText: "Hola",
      flimFlam: true,
      inputGivenToAction,
    };
  }
}

export type TestActionInput = ActionInput;
export type TestActionOutput = ActionOutput;

export interface TestActionConfiguration extends ActionConfiguration {
  hooks?: {
    test: ApplicationConfiguration[];
  };
}
