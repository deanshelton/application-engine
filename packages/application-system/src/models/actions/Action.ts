import { getLogger, Logger } from '@repo/logger';
import type { ActionMap } from '../ActionMap';
import type { ApplicationConfiguration, ApplicationGlobals } from '../Application';
import { DataAccess } from '../DataAccess';

/**
 * This abstract class defines the basis for all actions.
 * The most important method here is the "invoke" method.
 * Each Action must implement "invoke" to execute it's custom
 * behavior.
 */

export class Action<
  C extends ActionConfiguration,
  I extends ActionInput, 
  O extends ActionOutput 
> {
  public config: C;
  private dataAccess: DataAccess;
  public actionMap: ActionMap;
  public applicationConf: ApplicationConfiguration;
  public globals: ApplicationGlobals;
  public logger: Logger;
  public static batchProviders: any;

  /**
   *
   */
  constructor({
    config,
    dataAccess,
    actionMap,
    applicationConf,
    globals,
    logger = getLogger(),
  }: {
    config: C;
    dataAccess: DataAccess;
    actionMap: ActionMap;
    applicationConf: ApplicationConfiguration;
    globals: ApplicationGlobals;
    logger: Logger;
  }) {
    this.config = config;
    this.dataAccess = dataAccess;
    this.globals = globals;
    this.dataAccess = dataAccess;
    this.actionMap = actionMap;
    this.applicationConf = applicationConf;
    this.logger = logger;
  }

  /**
   * Atomically increment a value in state.
   */
  public async incrementVariable(variableName: string, incrBy = 1) {
    return this.dataAccess.incrementVariable(this.config.actionId, variableName, incrBy);
  }

  /**
   *
   * Set the expiration of a variable to a unix timestamp in ms.
   */
  public async setExpiry(variableName: string, expireAt: number) {
    return this.dataAccess.setExpiry(this.config.actionId, variableName, expireAt);
  }

  /**
   * Safely retrieve a variable from this Action's memory for this
   * campaignId and accountId. If you require reading memory of a different
   * Action in the same application, use configuration inputs.
   * If you require reading from state of a different Application's
   * actions. You will need to access that memory another way.
   */
  public async getStringVariable(variableName: string): Promise<string | null> {
    return this.dataAccess.getStringVariable(this.config.actionId, variableName);
  }
  /**
   * Safely retrieve a variable from this Action's memory for this
   * campaignId and accountId. If you require reading memory of a different
   * Action in the same application, use configuration inputs.
   * If you require reading from state of a different Application's
   * actions. You will need to access that memory another way.
   */
  public async getNumericVariable(variableName: string): Promise<number | null> {
    return this.dataAccess.getNumericVariable(this.config.actionId, variableName);
  }
  /**
   * Check if a variable exists for this accountId and campaignId.
   */
  public async variableExists(variableName: string) {
    return this.dataAccess.variableExists(this.config.actionId, variableName);
  }

  /**
   * Safely persist string values to state in a way that wont
   * collide with other Action's memory. You can NOT use this method
   * to update variables of a different Action.
   */
  public async setStringVariable(variableName: string, value: string, expire?: number) {
    return this.dataAccess.setStringVariable(
      this.config.actionId,
      variableName,
      value,
      expire,
    );
  }

  /**
   * Safely persist string values to state in a way that wont
   * collide with other Action's memory. You can NOT use this method
   * to update variables of a different Action.
   */
  public async setNumericVariable(variableName: string, value: number, expire?: number) {
    return this.dataAccess.setNumericVariable(
      this.config.actionId,
      variableName,
      value,
      expire,
      false
    );
  }
  /**
   * Safely persist string values to state in a way that wont
   * collide with other Action's memory. You can NOT use this method
   * to update variables of a different Action.
   */
  public async setNumericVariableIfNotExist(variableName: string, value: number, expire?: number) {
    return this.dataAccess.setNumericVariable(
      this.config.actionId,
      variableName,
      value,
      expire,
      true
    );
  }


  /**
   * Calling this function will "branch" the application logic mid-action
   * executing the sub-actions outlined within a named hook in this
   * action's configuration. After the branch resolves, the execution
   * path will continue on to either the next hook (if another exists)
   * or the onSuccess/onFailure paths depending on what
   * happened in the branch.
   */
  // public async fireHooks(hookName: string) {
  //   if (this.config.hooks && this.config.hooks[hookName] && this.config.hooks[hookName].length) {
  //     for (let i = 0; i < this.config.hooks[hookName].length; i++) {
  //       await this.dataAccess.setLinkedListPointer(this.config.hooks[hookName][i].config.actionId);
  //       const subApp = new Application({
  //         dataAccess: this.dataAccess,
  //         actionMap: this.actionMap,
  //         globals: this.globals,
  //         applicationConf: this.config.hooks[hookName][i],
  //       });
  //       await subApp.run();
  //     }
  //   }
  // }

  /**
   * At the end of an actions lifecycle it's output will be stored
   * at a memory address that is accessible to future invocations of 
   * the application. It may only read/write to it's own action namespace.
   * To read from another action's namespace one must hydrate that action
   * object using the ActionMap, and call .getOutput on the action
   * retrieved from the ActionMap.
   */
  public async setOutput(output: O) {
    return this.setStringVariable('output', JSON.stringify(output))
  }
 
  /**
   * An action may only get the output for itself, 
   * a higher order lookup must be done to get output from another 
   * action. If you need the output from another action during 
   * your application runtime, it must be retrieved by going 
   * thru the hydrated actions found in the ActionMap.
   */
  public async getOutput() {
    let rawOutput = await this.getStringVariable('output');
    if(rawOutput) return JSON.parse(rawOutput) as O;
    return null
  }


  /**
   * This method is called internally by the `Application` class to
   * resolve the inputs specified in the `inputSources` object
   * of this action's configuration. An `action`'s `invoke` method
   * should never need to call this method directly.
   * 
   * There are a few string PREFIX formats used for specifying from where these
   * input values are retrieved.
   * 
   * Examples: 
   * 
   * - `GLOBAL:<someGlobalVar>` 
   *    This specifies that the application should pull `someGlobalVar` from 
   *    the global namespace of this application. These values
   *    usually only contain very limited sets of values that every action may need, 
   *    like, the User object, or the Application object.
   * - `GET:<actionId>:<someGlobalVar>` 
   *    This specifies that the application should pull `someGlobalVar` from 
   *    the namespace namespace of a previous action. This of-course requires that 
   *    the referenced actionID was executed previously to the current Action, 
   *    otherwise this value would be null;
   * - `<someGlobalVar>` 
   *    In the event that the value is not expected to be dynamic, and can be hard-coded
   *    this value will be pulled directly from the config and assumed to be static.
   */
  public async getInput() {
    const returnMe = {} as Record<string, any>;
    if (this.config.inputSources) {
      const attributes = Object.keys(this.config.inputSources);
      for (let i = 0; i < attributes.length; i++) {
        const attribute = attributes[i];
        const inputValue = this.config.inputSources[attribute] as string; // example: GET:actionId:outputVarName
        if (inputValue.startsWith('GLOBAL')) {
          const [, variableName] = inputValue.split(':');
          returnMe[attribute] = this.globals[variableName as keyof typeof this.globals] as any;
        } else if (inputValue.startsWith('GET')) {
          const [, actionId, variableName] = inputValue.split(':');
          const output = await this.actionMap.getActionByLinkedListId(actionId).action.getOutput();
          if (output === null){
            throw new Error(
              `Previous action var lookup failure. ${actionId}:${variableName}`
            );
          }
          returnMe[attribute] = output[variableName];
        } else {
          returnMe[attribute] = inputValue;
        }
      }
    }
    console.log('GETTING INPUT', returnMe)
    return returnMe;
  }

  /**
   * This method is where an Action's behavior lives.
   * The output of this method must be either undefined a single dimension
   * dictionary serializable object. The `Application` class will
   * automatically store the output to the persistance layer and make values
   * available to other actions in the application flow.
   */
  // eslint-disable-next-line no-unused-vars
  public async invoke(_input: I): Promise<ActionOutput> {
    throw new Error('NOT_IMPLEMENTED. Subclass must override.');
  }
}

export interface ActionInput {
  [key: string]: string | any;
}
export interface ActionOutput {
  [key: string]: string | any;
}
export interface ActionInputSources {
  [key: string]: string;
}
export interface ActionState {}

export interface ActionCreationPayload {}
export interface ActionConfiguration {
  actionId: string;
  inputSources?: ActionInputSources;
  hooks?: {
    [hookName: string]: ApplicationConfiguration[];
  };
}
