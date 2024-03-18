import { FailureByDesign } from "@repo/failure-by-design";
import Ajv, { ValidateFunction } from "ajv";
import {
  Action,
  ActionConfiguration,
  ActionConstructorArgs,
  ActionInput,
} from "./Action";

export class VerifyPayload extends Action<
  VerifyPayloadConfiguration,
  VerifyPayloadInput,
  VerifyPayloadOutput<VerifyPayloadInput>
> {
  validate: ValidateFunction<VerifyPayloadInput>;
  static ajv = new Ajv();

  public constructor(args: ActionConstructorArgs<VerifyPayloadConfiguration>) {
    super(args);
    try {
      this.validate = VerifyPayload.ajv.compile<VerifyPayloadInput>(
        this.config.schema
      );
    } catch (e) {
      throw new FailureByDesign("MISCONFIGURATION", `[VerifyPayload] ${e}`, {
        error: e,
      });
    }
  }
  /**
   *
   */
  public async invoke(inputGivenToAction: VerifyPayloadInput) {
    try {
      const validatedInput = this.validate(inputGivenToAction);
      if (validatedInput === false) {
        throw new FailureByDesign(
          "BAD_REQUEST",
          `JSON input does not match schema: ${JSON.stringify(this.validate.errors, null, 2)}`
        );
      }
      return { validatedInput };
    } catch (e) {
      const error = e as unknown as FailureByDesign;
      throw new FailureByDesign("BAD_REQUEST", error.message, { error });
    }
  }
}

export interface VerifyPayloadInput extends ActionInput {
  payload: any;
}
export type VerifyPayloadOutput<T> = { validatedInput: T };
export interface VerifyPayloadConfiguration extends ActionConfiguration {
  schema: object;
}
