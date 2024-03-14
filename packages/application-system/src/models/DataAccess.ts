import { getLogger, Logger } from "@repo/logger";
import { timedEvent } from "@repo/timer";

import { ApplicationState } from "@repo/database";
import { ActionMap } from ".";
import { ApplicationGlobals } from "./Application";

export interface HeapDump {
  heap: Record<string, string | null>;
  pointer: string | null;
}
/**
 * This abstraction provides a clean way to easily swap stateful
 * back-ends for the application system.
 *
 * If we need to change REDIS to S3, or even Postgres,
 * this class will provide a surgical way to make that change.
 */
export class DataAccess {
  protected globals: ApplicationGlobals;
  protected logger: Logger;
  protected memory: { [key: string]: string };

  /**
   *
   */
  constructor({
    globals,
    logger,
  }: {
    globals: ApplicationGlobals;
    logger?: Logger;
  }) {
    this.globals = globals;
    this.logger = logger || getLogger();
    this.memory = {};
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and retrieve a value which was saved with `setString`.
   * 
   * This function only returns null when the key does not exist.
   */
  protected async getString(key: string): Promise<string | null> {
    try {
      return timedEvent(`(dynamo) DataAccess.getString ${key}`, async () => {
        const item = await ApplicationState.get(key);

        if (item?.stringValue === undefined) return "";
        return item?.stringValue;
      });
    } catch (e) {
      this.logger.debug(`Unable to find ApplicationState.get({id: "${key}"})`);
      return null;
    }
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and retrieve a value which was saved with `setNumber`.
   */
  protected async getNumber(key: string): Promise<number | null> {
    try {
      return timedEvent(`(dynamo) DataAccess.getNumber ${key}`, async () => {
        const item = await ApplicationState.get({ id: key });
        return item.numericalValue || null;
      });
    } catch (e) {
      this.logger.debug(`Unable to find ApplicationState.get({id: "${key}"})`);
      return null;
    }
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and return boolean if a value exists`.
   */
  public async exists(key: string): Promise<boolean> {
    try {
      return timedEvent(`(dynamo) DataAccess.exists ${key}`, async () => {
        await ApplicationState.get({ id: key });
        return true;
      });
    } catch (e) {
      return false;
    }
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and increment a value by `incrBy=1`, returning the updated number.
   */
  protected async incr(key: string, incrBy = 1): Promise<number | undefined> {
    try {
      return timedEvent(
        `(dynamo) DataAccess.incr ${key} ${incrBy}`,
        async () => {
          const res = await ApplicationState.update(
            { id: key },
            // @ts-ignore
            { $ADD: { numericalValue: incrBy } }
          );
          // @ts-ignore
          return res.numericalValue;
        }
      );
    } catch (e) {
      this.logger.error(e);
      throw new Error(`Failed to increment ${key} by ${incrBy}.`);
    }
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and save a string of text for later retrieval with `get`.
   */
  protected async setString(
    key: string,
    stringValue: string,
    expire?: number
    // overwrite = true
  ) {
    return timedEvent(`(dynamo) DataAccess.setString ${key}`, async () => {
      const appState = new ApplicationState({
        id: key,
        stringValue: stringValue,
        ...(expire && { expire }),
        appName: "apps",
      });

      await appState.save();
    });
  }

  /**
   * Talk directly to a stateful system, i.e.: redis, postgres, S3, etc.
   * and save a string of text for later retrieval with `get`.
   */
  protected async setNumber(
    key: string,
    numericalValue: number,
    expire?: number,
    overwrite = false
  ) {
    return timedEvent(`(dynamo) DataAccess.setNumber ${key}`, async () => {
      const appState = new ApplicationState({
        key,
        numericalValue,
        ...(expire && { expire }),
        appName: "napps",
      });
      await appState.save({ overwrite } as any);
    });
  }

  /**
   * Talk directly to ephemeral in-memory state
   * and save a string of text for later retrieval with `get`.
   */
  // protected async setMemory(key: string, data: string) {
  //   this.memory[key] = data;
  // }

  /**
   * Talk directly to ephemeral in-memory state
   * and set the expiry using a unix timestamp in ms.
   */
  protected async setEx(id: string, expireAt: number) {
    return timedEvent(`(dynamo) DataAccess.setEx ${id}`, async () => {
      ApplicationState.update({ id, expire: expireAt });
    });
  }

  /**
   * Talk directly to ephemeral in-memory state
   * get a string value in response.
   */
  // protected async getMemory(key: string) {
  //   return this.memory[key];
  // }

  /**
   * This returns the namespace at which a single action's
   * memory will be stored.
   */
  private actionMemoryKey(actionId: string) {
    return `${this.globals.application.id}:${this.globals.user.id}:actionState:${actionId}`;
  }

  /**
   * This returns the namespace at which a users position
   * in the application will be stored.
   */
  private listIdMemoryKey() {
    return `${this.globals.application.id}:${this.globals.user.id}:linkedListId`;
  }

  /**
   * This function is used to return all output values stored for this
   * user's invocation of this application. It will return an object
   * containing an array of memory address' with their values, along
   * with the current pointer for the user's position in the linked
   * list.
   */
  public async getHeap(actionMap: ActionMap): Promise<HeapDump> {
    const actionIds = Object.keys(actionMap.map);
    const heap: Record<string, any> = {};
    const promises = actionIds.map(async (actionId) => {
      const output = await this.getStringVariable(actionId, "output");
      heap[actionId] = output;
    });
    await Promise.all(promises);
    const pointer = await this.getLinkedListPointer();
    console.log("GETTING POINTER FOR HEAP", pointer);
    const res = { heap, pointer };
    return res;
  }

  /**
   * Returns the memory object of a specific action in a
   * users flow within an application.
   */
  public async getStringVariable(actionId: string, keyName: string) {
    const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
    return this.getString(key);
  }

  /**
   * Returns the memory object of a specific action in a
   * users flow within an application.
   */
  public async getNumericVariable(actionId: string, keyName: string) {
    const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
    return this.getNumber(key);
  }

  /**
   * Set a variable in a place where other areas
   * of the application may reference without colliding.
   */
  public async setStringVariable(
    actionId: string,
    keyName: string,
    value: string,
    expire?: number
  ) {
    const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
    await this.setString(key, value, expire);
  }

  /**
   * Set a variable in a place where other areas
   * of the application may reference without colliding.
   */
  public async setNumericVariable(
    actionId: string,
    keyName: string,
    numericalValue: number,
    expire?: number,
    ifNotExist?: boolean
  ) {
    const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
    await this.setNumber(key, numericalValue, expire, ifNotExist);
  }

  /**
   * Returns the memory item of a specific action in a
   * users flow within an application.
   */
  public async variableExists(actionId: string, keyName: string) {
    const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
    return this.exists(key);
  }

  /**
   * Set a variable in a place where other areas
   * of the application may reference without colliding.
   */
  // public async setMemoryVariable(
  //   actionId: string,
  //   keyName: string,
  //   value: string
  // ) {
  //   const key = `${this.actionMemoryKey(actionId)}:${keyName}`;
  //   await this.setMemory(key, value);
  // }

  /**
   * Increment the value of an item in application state by 1 and return
   * the new value. If no value exists, a base value of 0 is assumed, and
   * the resulting stateful value is 1.
   */
  public async incrementVariable(
    actionId: string,
    keyItem: string,
    incrBy = 1
  ) {
    const actionMemoryKey = this.actionMemoryKey(actionId);
    return this.incr(`${actionMemoryKey}:${keyItem}`, incrBy);
  }

  /**
   * Set the expiry of a variable by passing a unix timestamp in ms.
   */
  public async setExpiry(actionId: string, keyItem: string, expireAt: number) {
    const actionMemoryKey = this.actionMemoryKey(actionId);
    return this.setEx(`${actionMemoryKey}:${keyItem}`, expireAt);
  }

  /**
   * Returns the string value of the linked list id
   * which uniquely identifies a user's position
   * in the application.
   *
   * null = never set.
   * empty string = set before, but unset after successful run.
   * value = set before and has not yet completed
   */
  public getLinkedListPointer() {
    console.log("GETTING POINTER-->", this.listIdMemoryKey());
    return this.getString(this.listIdMemoryKey());
  }

  /**
   * Set the string value of the linked list id
   * which uniquely identifies a user's position
   * in the application.
   */
  public async setLinkedListPointer(actionId: string) {
    return this.setString(this.listIdMemoryKey(), actionId);
  }
}
