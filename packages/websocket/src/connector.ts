import NodeWebSocket from "ws";
import { generateChannelId, parseChannelId } from "./channel";
import { WsChannel, WsSubscriptionParams, WsUpdateType } from "./types";

// delay between pings.
// see WsConnector.intervalHeartbeat
const DEFAULT_INTERVAL_HEARTBEAT = 3000;

// 2x DEFAULT_INTERVAL_HEARTBEAT to allow for missing
// one heartbeat without triggering disconnect.
// see WsConnector.timeoutHeartbeat
const DEFAULT_TIMEOUT_HEARTBEAT = 6100;

// see WsConnector.timeoutConnect
const DEFAULT_TIMEOUT_CONNECT = 2000;

export interface WsStatusChangeListener {
  (connected: boolean): void;
}

/**
 * See WsConnector class members for description of
 * each configuration option.
 */
export interface WsConnectorOptions {
  endpoint: string;
  onStatusChange?: WsStatusChangeListener;
  debugMode?: boolean;

  timeoutConnect?: number;

  intervalHeartbeat?: number;
  timeoutHeartbeat?: number;
  enableHeartbeat?: boolean;
}

export interface WsResult<T = unknown> {
  requestId?: string
  channel?: string
  blockHeight?: number
  updateType?: WsUpdateType
  timestamp: Date
  data: T
}

interface PromiseHandler {
  requestId?: string;
  resolve: (result?: WsResult<any>) => void;
  reject: (reason?: any) => void;
}

interface WsError {
  code: string;
  message: string;
}

interface WsMessage<T extends any> {
  requestId: string;
  channel?: string;
  error?: WsError;
  result?: WsResult<T>;
}

export interface WsSubscriber<T extends any = unknown> {
  (result: WsResult<T>): void;
}

interface PromiseHandlerCache {
  [index: string]: PromiseHandler;
}

interface MessageSubscribers<T extends any = any> {
  [index: string]: WsSubscriber<T>;
}

/**
 * WsConnector is a wrapper class to manage websocket connections with the server. It makes use of
 * WebSocket instances to connect to the server.
 *
 * Multiple subscriptions to the same channel is not supported.
 *
 * @example
 * (async () => {
 *   const wsConnector = new WsConnector({
 *     endpoint: WS_ENDPOINT,
 *   });
 *
 *   // run connect before executing any subscription
 *   await wsConnector.connect();
 *
 *   // subscribe to new channel
 *   await wsConnector.subscribe({ channel: WsChannel.market_stats }, (result: WsResult<MarketStats>) => {
 *     console.log("received market stats", result);
 *   });
 *
 *   // unsubscribe
 *   await wsConnector.unsubscribe({ channel: WsChannel.market_stats });
 *
 *   // clean up
 *   await wsConnector.disconnect();
 * })();
 */
export class WsConnector {
  // websocket endpoint
  endpoint: string;

  // prints logs if set to true
  debugMode: boolean;

  // delay in milliseconds before a ping message is sent to
  // the socket server
  // disables ping messages if value is ≤ 0
  intervalHeartbeat: number;

  // timeout in milliseconds before connection is deemed broken.
  // resets every intervalHeartbeat
  // disables timeout if value is ≤ 0
  timeoutHeartbeat: number;

  // timeout in milliseconds to try to connect to websocket
  // endpoint.
  timeoutConnect: number;

  // flag for enabling websocket heartbeats for detecting
  // disconnects, if not eanbled websocket may not disconnect 
  // client when connection is broken
  enableHeartbeat: boolean;

  // websocket instance
  websocket: WebSocket | NodeWebSocket | null = null;

  // used to tracking websocket messages, increment by 1 every request
  requestIdCounter: number = 0;

  // true if connection initiated, even if connection is not established
  // will cause reconnect attempts if true.
  shouldConnect: boolean = false;

  // true only if connection is established and ready to use
  connected: boolean = false;

  // called whenever WsConnector.connected changes
  statusChangeListener?: WsStatusChangeListener;

  // promise abstraction handler for WsConnector.connect
  connectPromiseHandler: PromiseHandler | null = null;

  // promise abstraction handlers store for WsConnector.request
  requestHandlers: PromiseHandlerCache = {};

  // channel subscription handlers
  channelHandlers: MessageSubscribers = {};

  // used for track ws message sequence, for some cases a out of sequence
  // message is invalid and request have to be resent.
  sequenceNumberCache: {
    [index: string]: number;
  } = {};

  // interval ID for tracking active setInterval
  heartbeatInterval?: number;

  // timeout ID for tracking active setTimeout
  heartbeatTimeout?: number;

  // timeout ID for catching websocket instantiation error
  // which cannot be caught with a try-catch block
  initFailureTimeout?: number;

  public static generateChannelId = generateChannelId;

  public static parseChannelId = parseChannelId;

  /**
   * Initialises an instance of WsConnector with the specified options
   * @param {WsConnectorOptions} options - options to configure the WsConnector instance
   */
  constructor(options: WsConnectorOptions) {
    const {
      endpoint,
      debugMode = false,
      timeoutConnect = DEFAULT_TIMEOUT_CONNECT,
      intervalHeartbeat = DEFAULT_INTERVAL_HEARTBEAT,
      timeoutHeartbeat = DEFAULT_TIMEOUT_HEARTBEAT,
      enableHeartbeat = false,
      onStatusChange,
    } = options;

    this.endpoint = endpoint;
    this.debugMode = debugMode;
    this.timeoutConnect = timeoutConnect;
    this.intervalHeartbeat = intervalHeartbeat;
    this.timeoutHeartbeat = timeoutHeartbeat;
    this.enableHeartbeat = enableHeartbeat;
    this.statusChangeListener = onStatusChange;
  }

  /**
   * Starts a connection to the server via a WebSocket instance
   * rejects the promise if connection cannot be established within WsConnector.timeoutConnect
   * milliseconds.
   *
   * @see WsConnector documentation for usage example
   */
  public async connect(): Promise<unknown> {
    if (this.shouldConnect) {
      // resolve promise immediately if already connecting
      return Promise.resolve();
    }

    this.shouldConnect = true;

    this.connectWebSocket();

    return new Promise((resolve, reject) => {
      this.connectPromiseHandler = { resolve, reject };
    });
  }

  /**
   * Disconnects the WebSocket connection with endpoint, releases resources and reverse states.
   * It is safe to call WsConnector.connect() again once WsConnector.disconnect() is called.
   *
   * @see WsConnector documentation for usage example
   */
  public disconnect() {
    this.shouldConnect = false;
    this.disconnectWebsocket();
  }

  /**
   * Subscribes to the channels specified with the websocket. Sends a subscription data frame with
   * channel ID to WebSocket server.
   * @param {WsSubscriptionParams | WsSubscriptionParams[]} params a list of parameters specifying the channels to connect to
   * @param {WsSubscriber} handler an event handler that subscribes to the websocket channels
   *
   * @see WsConnector documentation for usage example
   */
  public subscribe<T extends any = unknown>(params: WsSubscriptionParams | WsSubscriptionParams[], handler: WsSubscriber<T>) {
    const channels: string[] = [];
    if (!Array.isArray(params)) {
      params = [params]; // eslint-disable-line no-param-reassign
    }

    for (const param of params as WsSubscriptionParams[]) {
      const channelId = generateChannelId(param);
      const shouldSubscribe = this.channelHandlers[channelId] === undefined;

      if (shouldSubscribe && channelId.length > 0) {
        this.channelHandlers[channelId] = handler;
        channels.push(channelId);
      }
    }

    if (channels.length > 0) {
      this.send("subscribe", { channels });
    }
  }

  /**
   * Unsubscribes to the websocket channels indicated in the params, by broadcasting an unsubscribe
   * message to these channels.
   * @param {WsSubscriptionParams | WsSubscriptionParams[]} params - channel(s) to unsubcribe to
   *
   * @see WsConnector documentation for usage example
   */
  public unsubscribe(params: WsSubscriptionParams | WsSubscriptionParams[]) {
    if (!Array.isArray(params)) {
      params = [params]; // eslint-disable-line no-param-reassign
    }

    const channelIds: string[] = [];
    for (const param of params) {
      const channelId = generateChannelId(param);
      const shouldUnsubscribe = this.channelHandlers[channelId] !== undefined;
      delete this.channelHandlers[channelId];

      if (shouldUnsubscribe && channelId.length > 0) {
        channelIds.push(channelId);
      }
    }

    if (channelIds.length > 0) {
      this.send("unsubscribe", {
        channels: channelIds,
      });
    }
  }

  /**
   * Sends a message to the websocket channels.
   * @param {string} method - the type of message to send to the websocket channels. 
   * Available options: subscribe, unsubscribe.
   * @param {any} params - An object containing parameters based on the specified method
   */
  public send(method: string, params: any) {
    this.sendMessage(
      JSON.stringify({
        id: `g${++this.requestIdCounter}`,
        method,
        params,
      })
    );
  }

  /**
   * 
   * Requests data from the server endpoint - this feature has been deprecated on server
   * websocket service.
   * @param {string} method - the type of message to send to the websocket channels. 
   * @param {any} params - parameters based on the specified method
   * @param {any} extras - additional args to be sent in the request
   *
   * @returns {Promise<WsResult<T>>} - a Promise resolving to the response from the endpoint
   *
   * @see WsConnector documentation for usage example
   */
  public async request<T = unknown>(method: string, params: any, extras: any = {}): Promise<WsResult<T> | undefined> {
    const requestId = `r${++this.requestIdCounter}`;

    this.sendMessage(
      JSON.stringify({
        id: requestId,
        method,
        params,
        ...extras,
      })
    );

    return new Promise((resolve, reject) => {
      this.requestHandlers[requestId] = { requestId, resolve, reject };
    });
  }

  /**
   * Sends a message to the web socket
   * @param {string | Buffer} data - the message sent to the web socket
   */
  private sendMessage(data: string | Buffer) {
    const socket = this.getSocket();
    this.debugLog("WsConnector.sendMessage", data);
    socket?.send(data);
  }

  /**
   * An event handler that is called when a connection is started with the WebSocket instance.
   * @param {Event} ev - the event that is called with
   */
  private onOpen(ev: Event) {
    this.debugLog("WsConnector.onOpen", ev);

    // clear timeout for killing connect attempts
    clearTimeout(this.timeoutConnect);

    this.connected = true;
    this.connectPromiseHandler?.resolve();
    this.connectPromiseHandler = null;

    this.updateConnectStatus();
    this.startHeartbeat();
  }

  /**
   * An event handler that is called when a MessageEvent is emitted from the server
   * @param {MessageEvent} ev - the MessageEvent that is emitted from the server
   */
  private onMessage(ev: MessageEvent) {
    this.debugLog("WsConnector.onMessage", ev);

    if (ev.data === "pong") {
      this.restartHeartbeatTimeout();
      return;
    }

    const message = this.parseWsMessage<unknown>(ev);

    if (!message.requestId && message.channel) {
      const channelHandler = this.channelHandlers[message.channel];
      if (!channelHandler) {
        this.debugLog(`handler not found for channel: ${message.channel}`);
        try {
          const params = parseChannelId(message.channel);
          this.unsubscribe({ channel: params.channel as WsChannel });
        } catch (error) {
          // ignore error
        }
        return;
      }

      channelHandler(message.result!);
      return;
    }

    if (!message.requestId?.startsWith("r")) {
      return;
    }

    const handler = this.requestHandlers[message.requestId];
    if (!handler) {
      this.debugLog(`handler not found for request: ${message.requestId}`);
      return;
    }

    if (message.error) {
      handler.reject(message.error);
    } else {
      handler.resolve(message.result);
    }
    delete this.requestHandlers[message.requestId];
  }

  /**
   * An event listener that is called when an error occurs on the WebSocket connection
   * @param {Event} ev - the error event occurring on the WebSocket connection
   */
  private onError(ev: Event) {
    this.debugLog("WsConnector.onError", ev);

    const handlers: PromiseHandler[] = Object.values(this.requestHandlers);
    console.error(ev);
    const error = new Error("WebSocket error occurred");
    for (const handler of handlers) {
      handler.reject(error);
      if (handler.requestId) {
        delete this.requestHandlers[handler.requestId];
      }
    }
  }

  /**
   * An event handler that is triggered when the WebSocket connection is closed.
   * @param {Event} ev - the event called with this event handler.
   */
  private onClose(ev: Event) {
    this.debugLog("WsConnector.onClose", ev);

    this.disconnectWebsocket();
  }

  /**
   * An accessor to the WebSocket instance in this WsConnector instance
   */
  private getSocket() {
    if (!this.connected) {
      throw new Error("WebSocket not connected");
    }

    return this.websocket;
  }

  /**
   * Updates the connection status of the WebSocket instance
   */
  private updateConnectStatus() {
    try {
      this.statusChangeListener?.(this.connected);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Sends ping messages to the websocket to indicate to the server that the WebSocket connection with the server is still alive.
   */
  private sendHeartbeat() {
    this.websocket?.send("ping");
  }

  /**
   * Resets the heartbeat timeout. (timeout: after a specified amount of time, if there are no heartbeats detected from the server, the connection with the server is considered to be lost and the WebSocket connection will be closed)
   */
  private restartHeartbeatTimeout() {
    clearTimeout(this.heartbeatTimeout);

    if (!this.enableHeartbeat || this.timeoutHeartbeat <= 0) {
      // configured to disable heartbeat checks
      return;
    }

    this.heartbeatTimeout = setTimeout(this.onHeartbeatTimeout.bind(this), this.timeoutHeartbeat) as unknown as number;
  }

  /**
   * Disconnects the websocket connection when there is no heartbeat detected for more than the time specified in {@link WsConnector#timeoutHeartbeat}
   */
  private onHeartbeatTimeout() {
    this.debugLog("heartbeat timed out");
    console.warn("ws heartbeat missed, killing zombie connection");

    this.disconnect();
  }

  /**
   * Starts sending heartbeats to the server in regular intervals
   */
  private startHeartbeat() {
    // call receive heartbeat to start timeout
    this.restartHeartbeatTimeout();

    if (!this.enableHeartbeat || this.intervalHeartbeat <= 0) {
      // configured to disable heartbeat checks
      return;
    }

    this.heartbeatInterval = setInterval(this.sendHeartbeat.bind(this), this.intervalHeartbeat) as unknown as number;
  }

  /**
   * Parses messages sent from the server via the WebSocket connection
   * @param {MessageEvent} ev - the MessageEvent emitted from the server
   * @returns {WsMessage<T>} - the parsed message
   */
  private parseWsMessage<T>(ev: MessageEvent): WsMessage<T> {
    try {
      const {
        id, error, channel, result,
        block_height: blockHeight,
        update_type: updateType,
        ...rest
      } = JSON.parse(ev.data);

      return {
        requestId: id,
        channel,
        error: error as WsError,
        result: {
          ...rest,
          blockHeight,
          updateType,
          channel,
          timestamp: new Date(),
          data: result,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  /**
   * Rejects the WebSocket connection attempt when an error is encountered
   * @param {Error} error - the error causing the failure to connect with the websocket
   */
  private rejectConnect(error: Error) {
    clearTimeout(this.initFailureTimeout);

    this.connectPromiseHandler?.reject(error);
    this.connectPromiseHandler = null;
  }

  /**
   * Disconnects the connection with the websocket
   */
  private disconnectWebsocket() {
    try {
      this.websocket?.close();
    } catch (e) {
      // ignore error on disconnect
    } finally {
      clearInterval(this.heartbeatInterval);
      clearTimeout(this.heartbeatTimeout);

      this.sequenceNumberCache = {};
      this.websocket = null;
      if (this.connected) {
        this.connected = false;

        this.updateConnectStatus();
      }
    }
  }

  /**
   * Initialises a new WebSocket instance with the specified endpoint.
   */
  private connectWebSocket() {
    this.disconnect();

    try {
      if (typeof WebSocket !== "undefined") {
        // this works on browsers js vm
        const websocket = new WebSocket(this.endpoint);
        websocket.onopen = this.onOpen.bind(this);
        websocket.onclose = this.onClose.bind(this);
        websocket.onerror = this.onError.bind(this);
        websocket.onmessage = this.onMessage.bind(this);

        this.websocket = websocket;
      } else {
        // and this works on nodejs vm
        const websocket = new NodeWebSocket(this.endpoint);
        websocket.on("open", this.onOpen.bind(this));
        websocket.on("close", this.onClose.bind(this));
        websocket.on("error", this.onError.bind(this));
        websocket.on("message", (data: string) => this.onMessage({ data } as MessageEvent));

        this.websocket = websocket;
      }
      this.requestHandlers = {};

      // set timeout to kill websocket instantiation attempt
      // because error for constructor cannot be caught
      // i.e. new WebSocket(…)
      // https://stackoverflow.com/questions/22919638
      this.initFailureTimeout = setTimeout(() => {
        this.rejectConnect(new Error("websocket connect time out"));
      }, this.timeoutConnect) as unknown as number;
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        this.rejectConnect(error);
      }
    }
  }

  /**
   * A helper message to log methods when they are called
   * WsConnector#debugMode must be set to true to turn on logging.
   * @param {any[]} args - items to be logged
   */
  private debugLog(...args: any[]) {
    if (!this.debugMode) return;

    console.log(...args);
  }
}
