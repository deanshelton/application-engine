export type ErrorKind =
  | 'BAD_REQUEST' // triggers onFailure
  | 'MISCONFIGURATION' // stops execution

/**
 * FailureByDesign
 */
export class FailureByDesign extends Error {
  public kind: ErrorKind;
  public diagnosticInfo: any;

  /**
   * @param {ErrorKind} kind The kind of error which changes how this error should be handled.
   * @param {string} message The error message.
   */
  constructor(kind: ErrorKind, message: string, diagnosticInfo?: any) {
    super(message);
    this.message = message;
    this.kind = kind;
    this.diagnosticInfo = diagnosticInfo;
    this.name = 'FailureByDesign';
  }
}
