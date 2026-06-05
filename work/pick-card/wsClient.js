function createWsClient(options) {
  var config = Object.assign(
    {
      enabled: true,
      url: "",
      reconnectDelay: 10 * 1000,
      heartbeatInterval: 30 * 1000,
      connectTimeout: 15 * 1000,
      events: {
        pick: "pick_card",
        ping: "ping",
        pong: "pong",
        register: "register",
        status: "status",
      },
      logger: log,
      getBasePayload: function () {
        return {};
      },
      onPick: function () {},
    },
    options
  );

  var socket = null;
  var reconnectTimer = null;
  var heartbeatTimer = null;
  var connectTimer = null;
  var connecting = false;

  function logger(message) {
    config.logger(message);
  }

  function init() {
    if (!config.enabled) {
      logger("WebSocket 已关闭");
      return;
    }

    if (typeof WebSocket === "undefined") {
      logger("当前环境不支持 WebSocket，请接入真实接口时确认运行环境");
      return;
    }

    connect();
  }

  function connect() {
    if (connecting) {
      return;
    }

    if (socket && isOpen()) {
      return;
    }

    clearTimeout(reconnectTimer);
    connecting = true;
    logger("开始连接 WebSocket：" + config.url);

    try {
      socket = new WebSocket(config.url);
      bindEvents(socket);
      scheduleConnectTimeout();
    } catch (error) {
      connecting = false;
      logger("WebSocket 连接失败：" + error);
      scheduleReconnect();
    }
  }

  function bindEvents(ws) {
    ws.onopen = function () {
      connecting = false;
      clearTimeout(connectTimer);
      logger("WebSocket 连接成功");
      startHeartbeat();
      send({
        type: config.events.register,
        payload: config.getBasePayload(),
      });
      notifyStatus("idle");
    };

    ws.onmessage = function (event) {
      handleMessage(event && event.data);
    };

    ws.onerror = function (error) {
      connecting = false;
      logger("WebSocket 异常：" + error);
    };

    ws.onclose = function () {
      connecting = false;
      clearTimeout(connectTimer);
      stopHeartbeat();
      logger("WebSocket 连接关闭，准备重连");
      scheduleReconnect();
    };
  }

  function scheduleConnectTimeout() {
    clearTimeout(connectTimer);
    connectTimer = setTimeout(function () {
      if (!isOpen() && connecting) {
        logger("WebSocket 连接超时");
        close();
        connecting = false;
        scheduleReconnect();
      }
    }, config.connectTimeout);
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(function () {
      connect();
    }, config.reconnectDelay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(function () {
      send({
        type: config.events.ping,
        payload: config.getBasePayload(),
      });
    }, config.heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function handleMessage(messageText) {
    if (!messageText) {
      return;
    }

    logger("收到 WebSocket 消息：" + messageText);

    var message;
    try {
      message = JSON.parse(messageText);
    } catch (error) {
      logger("WebSocket 消息解析失败：" + error);
      return;
    }

    switch (message.type) {
      case config.events.ping:
        send({
          type: config.events.pong,
          payload: config.getBasePayload(),
        });
        return;
      case config.events.pick:
        config.onPick(message.payload || {});
        return;
      default:
        logger("未处理的 WebSocket 消息类型：" + message.type);
    }
  }

  function notifyStatus(status, extraPayload) {
    send({
      type: config.events.status,
      payload: Object.assign(config.getBasePayload(), { status: status }, extraPayload),
    });
  }

  function send(message) {
    if (!isOpen()) {
      return false;
    }

    try {
      socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      logger("WebSocket 发送失败：" + error);
      return false;
    }
  }

  function close() {
    try {
      if (socket) {
        socket.close();
      }
    } catch (error) {
      logger("关闭 WebSocket 失败：" + error);
    }
  }

  function isOpen() {
    return socket && typeof socket.readyState !== "undefined" && socket.readyState === 1;
  }

  return {
    init: init,
    send: send,
    notifyStatus: notifyStatus,
    isOpen: isOpen,
  };
}

function createPickCardWsClient(options) {
  var config = Object.assign(
    {
      enabled: true,
      url: "ws://127.0.0.1:3000/pick-card/ws",
      reconnectDelay: 10 * 1000,
      heartbeatInterval: 30 * 1000,
      connectTimeout: 15 * 1000,
      maxPickDelay: 10,
      deviceId: "",
      packageName: "",
      logger: log,
      getStatus: function () {
        return {
          picking: false,
          hasPendingPickTask: false,
        };
      },
      executePick: function () {},
    },
    options
  );

  var pendingPickTimer = null;
  var wsClient = createWsClient({
    enabled: config.enabled,
    url: config.url,
    reconnectDelay: config.reconnectDelay,
    heartbeatInterval: config.heartbeatInterval,
    connectTimeout: config.connectTimeout,
    logger: config.logger,
    getBasePayload: buildBasePayload,
    onPick: handlePick,
  });

  function buildBasePayload() {
    var status = config.getStatus() || {};
    return {
      deviceId: config.deviceId,
      packageName: config.packageName,
      now: new Date().toISOString(),
      picking: !!status.picking,
      hasPendingPickTask: !!pendingPickTimer,
    };
  }

  function handlePick(payload) {
    var status = config.getStatus() || {};
    if (status.picking) {
      wsClient.notifyStatus("busy", {
        reason: "pickCard is running",
      });
      return;
    }

    if (pendingPickTimer) {
      wsClient.notifyStatus("busy", {
        reason: "pickCard has been scheduled",
      });
      return;
    }

    var delayMinutes = normalizePickDelay(payload && payload.delayMinutes);
    config.logger("收到远程打卡指令，延迟分钟数：" + delayMinutes);

    wsClient.notifyStatus("scheduled", {
      delayMinutes: delayMinutes,
      source: "ws",
    });

    pendingPickTimer = setTimeout(function () {
      pendingPickTimer = null;
      config.executePick();
    }, delayMinutes * 60 * 1000);
  }

  function normalizePickDelay(delayMinutes) {
    if (typeof delayMinutes !== "number" || isNaN(delayMinutes)) {
      return 0;
    }

    if (delayMinutes < 0) {
      return 0;
    }

    if (delayMinutes > config.maxPickDelay) {
      return config.maxPickDelay;
    }

    return Math.floor(delayMinutes);
  }

  return {
    init: wsClient.init,
    send: wsClient.send,
    isOpen: wsClient.isOpen,
    notifyPicking: function () {
      wsClient.notifyStatus("picking");
    },
    notifyIdle: function (extraPayload) {
      wsClient.notifyStatus("idle", extraPayload);
    },
    notifyStatus: wsClient.notifyStatus,
  };
}

module.exports = createPickCardWsClient;
