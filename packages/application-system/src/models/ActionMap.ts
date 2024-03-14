import { getLogger, Logger } from '@repo/logger';

import { TestAction } from './actions/TestAction';
import { DataAccess } from './DataAccess';

import type { Action, ActionConfiguration, ActionInput, ActionOutput } from './actions/Action';
import type { ApplicationConfiguration, ApplicationGlobals } from './Application';
export interface LinkedListItem {
  action: Action<ActionConfiguration, ActionInput, ActionOutput>;
  id: string;
  hooks: { [hookName: string]: LinkedListItem };
  onSuccess: LinkedListItem | null;
  onFailure: LinkedListItem | null;
  invoked: boolean;
}

export enum ActionType {
  // eslint-disable-next-line no-unused-vars
  TEST_ACTION = 'TestAction',
}

const ActionClass = {
  [ActionType.TEST_ACTION]: TestAction,
};

/**
 * The purpose of this class is to create TWO methods of referencing an
 * action in the application config.
 *
 * 1. A linked list of actions which can be traversed.
 * 2. A flat map relating {linkedListNodeId => ListItem} to aid in
 *    access/retrieval via user id.
 */
export class ActionMap {
  public map: { [key: string]: LinkedListItem } = {};
  public linkedList: LinkedListItem;
  public globals: ApplicationGlobals;
  public dataAccess: DataAccess;
  public applicationConf: ApplicationConfiguration;
  public logger: Logger;

  constructor({
    globals,
    dataAccess,
    logger,
  }: {
    globals: ApplicationGlobals;
    dataAccess: DataAccess;
    logger?: Logger;
  }) {
    this.globals = globals;
    this.dataAccess = dataAccess;
    this.logger = logger || getLogger();
    this.linkedList = {} as LinkedListItem;
    this.applicationConf = {} as ApplicationConfiguration;
  }

  public createLinkedList(applicationConf: ApplicationConfiguration) {
    const { config, onSuccess, onFailure, type } = applicationConf;
    const newAction: any = new ActionClass[type]({
      config: config as any,
      globals: this.globals,
      dataAccess: this.dataAccess,
      applicationConf: this.applicationConf,
      actionMap: this,
      logger: this.logger,
    });
    const node = {} as LinkedListItem;
    node.invoked = false;
    node.action = newAction;
    node.id = newAction.config.actionId;

    // Create a flat map of nodes in the linked list
    this.map[node.id] = node;

    // node.hooks = hooks
    //   ? Object.keys(hooks).reduce((a, b: any) => {
    //       const node = this.createLinkedList(hooks[b]);
    //       a[b] = node;
    //       this.logger.debug('adding hook to map', node.id);
    //       this.map[node.id] = node;
    //       return a;
    //     }, {} as any)
    //   : null;
    node.onSuccess = onSuccess ? this.createLinkedList(onSuccess) : null;
    node.onFailure = onFailure ? this.createLinkedList(onFailure) : null;
    return node;
  }

  public getActionByLinkedListId(linkedListId: string) {
    return this.map[linkedListId];
  }

  public getRootOfLinkedList() {
    return this.linkedList;
  }
}
