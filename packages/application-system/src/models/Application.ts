import { getLogger, Logger } from "@repo/logger";

import { timedEvent } from "@repo/timer";
import type { ActionMap, ActionType } from "./ActionMap";
import type { ActionConfiguration } from "./actions/Action";
import { DataAccess, HeapDump } from "./DataAccess";

export interface ApplicationHooks {
  [hookName: symbol]: ApplicationConfiguration;
}
[];
export interface ApplicationConfiguration<
  HOOKS extends ApplicationHooks = ApplicationHooks,
> {
  type: ActionType;
  config: ActionConfiguration;
  onSuccess?: ApplicationConfiguration;
  onFailure?: ApplicationConfiguration;
  hooks?: HOOKS;
}

export interface ApplicationGlobals {
  application: { id: string };
  user: { id: string };
}

export class Application<G extends ApplicationGlobals> {
  public dataAccess: DataAccess;
  public actionMap: ActionMap;
  public applicationConf: ApplicationConfiguration;
  public logger: Logger;

  /**
   * This memory object stores the nextLinkedListId
   * to traverse the linked-list while recursing.
   * By-design this object does not persist outside
   * of application memory, causing the user's state
   * to return the the start of the list for each
   * initial invocation.
   */
  // protected memory: { [key: string]: string } = {};

  /**
   * Globals are values passed to all actions.
   * These values can be referenced from an action's configuration
   * inputSources.
   */
  public globals: G;

  public constructor({
    dataAccess,
    applicationConf,
    globals,
    actionMap,
    logger,
  }: {
    globals: G;
    applicationConf: ApplicationConfiguration;
    dataAccess: DataAccess;
    actionMap: ActionMap;
    logger?: Logger;
  }) {
    this.globals = globals;
    this.applicationConf = applicationConf;
    this.logger = logger || getLogger();
    this.dataAccess = dataAccess;
    this.actionMap = actionMap; //||
    // new ActionMap({
    //   globals: this.globals,
    //   logger,
    //   dataAccess: this.dataAccess,
    // });
    this.actionMap.linkedList = this.actionMap.createLinkedList(
      this.applicationConf
    );
  }

  /**
   * This function will return a heap dump and the last set pointer.
   * Run the application:
   * - get next-to-be-processed linkedListId for this accountId
   * - get instance of action by it's linkedListId
   * - get the input for this action
   * - invoke this action
   * - set next-to-be-processed linkedListId for this accountId.
   * - recurse
   */
  public async run(): Promise<HeapDump> {
    let linkedListId = await this.dataAccess.getLinkedListPointer();
    if (linkedListId === null || linkedListId == "") {
      this.logger.debug(`Starting at root.`);
      linkedListId = this.actionMap.getRootOfLinkedList().id;
    }
    this.logger.debug(`"${linkedListId}" is the next node.`);
    const linkedListItem = this.actionMap.getActionByLinkedListId(linkedListId);
    const input = await linkedListItem.action.getInput();

    try {
      const name = linkedListItem.action.constructor.name;
      this.logger.debug(
        `[${name}::${linkedListId}] Input: ${JSON.stringify(input)};`
      );

      const output = await timedEvent(
        `[${name}::${linkedListId}].invoke()`,
        async () => linkedListItem.action.invoke(input)
      );

      linkedListItem.invoked = true; // <-- helps testing.
      this.logger.debug(
        `[${name}::${linkedListId}] Output: ${JSON.stringify(output)}`
      );
      // If the action had output, we will write it to state for that action.
      if (output) await linkedListItem.action.setOutput(output);

      // if there is an onSuccess pointer, we move the current pointer to that and recurse.
      if (linkedListItem.onSuccess) {
        await this.dataAccess.setLinkedListPointer(linkedListItem.onSuccess.id);
        return await this.run(); // recurse
      } else {
        // We are done with this application run. We need to reset the pointer.
        await this.dataAccess.setLinkedListPointer("");
      }
      // At this point we are done with happy-path recursion.
      // We can safely exit and pull a heap dump to return to the caller.
      return this.dataAccess.getHeap(this.actionMap); // success exit criteria
    } catch (e) {
      this.logger.error(e);
      // Oh no! Something went wrong while traversing the action items.
      // If there is an onFailure action, we set the pointer and recurse,
      // Otherwise we raise the error.
      linkedListItem.invoked = true; // <-- helps testing.
      this.logger.debug(
        `Failure ClassName: ${e?.constructor?.name || "UNKNOWN ERROR"}`
      );

      if (!linkedListItem.onFailure?.id) {
        throw e; // failure exit criteria
      }
      await this.dataAccess.setLinkedListPointer(linkedListItem.onFailure.id);

      return this.run();
    }
  }
}
